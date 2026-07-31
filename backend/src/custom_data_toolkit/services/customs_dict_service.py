from datetime import UTC, datetime

from custom_data_toolkit.middleware.error_handler import (
    AppException,
    ConflictException,
    NotFoundException,
)
from custom_data_toolkit.models.customs_dict import (
    DICT_TEXT_MAX_LENGTH,
    CustomsDictMapping,
    CustomsDictSource,
    CustomsDictSyncStatus,
    CustomsDictType,
    normalize_dict_text,
)
from custom_data_toolkit.repositories.customs_dict_repository import CustomsDictRepository
from custom_data_toolkit.services.customs_dict_redis import (
    CustomsDictRedisStore,
    sanitize_redis_error,
)


def _parse_dict_type(dict_type: str) -> str:
    try:
        return CustomsDictType(dict_type).value
    except ValueError as exc:
        raise AppException(
            "字典类型仅支持 country 或 continent。",
            error_code="CustomsDict.InvalidType",
        ) from exc


class CustomsDictService:
    def __init__(
        self,
        repository: CustomsDictRepository,
        redis_store: CustomsDictRedisStore,
    ) -> None:
        self.repository = repository
        self.redis_store = redis_store

    def list_page(
        self,
        *,
        dict_type: str | None,
        raw_value: str | None,
        standard_value: str | None,
        enabled: bool | None,
        page: int,
        page_size: int,
    ) -> tuple[list[CustomsDictMapping], int]:
        cleaned_type = None
        if dict_type is not None and dict_type.strip():
            cleaned_type = _parse_dict_type(dict_type.strip())
        cleaned_raw = normalize_dict_text(raw_value) if raw_value else None
        cleaned_standard = normalize_dict_text(standard_value) if standard_value else None
        if cleaned_raw == "":
            cleaned_raw = None
        if cleaned_standard == "":
            cleaned_standard = None
        return self.repository.list_page(
            dict_type=cleaned_type,
            raw_value=cleaned_raw,
            standard_value=cleaned_standard,
            enabled=enabled,
            page=page,
            page_size=page_size,
        )

    def get(self, mapping_id: int) -> CustomsDictMapping:
        mapping = self.repository.get_by_id(mapping_id)
        if mapping is None:
            raise NotFoundException("未找到该字典映射。", error_code="CustomsDict.NotFound")
        return mapping

    def create(
        self,
        *,
        dict_type: str,
        raw_value: str,
        standard_value: str,
        actor_id: int | None,
    ) -> CustomsDictMapping:
        cleaned_type = _parse_dict_type(dict_type.strip())
        cleaned_raw = self._require_text(raw_value, field="原始值")
        cleaned_standard = self._require_text(standard_value, field="标准值")
        existing = self.repository.get_by_type_raw(cleaned_type, cleaned_raw)
        if existing is not None:
            raise ConflictException(
                "该字典类型下原始值已存在。",
                error_code="CustomsDict.DuplicateRawValue",
            )
        now = datetime.now(UTC).replace(tzinfo=None)
        mapping = CustomsDictMapping(
            dict_type=cleaned_type,
            raw_value=cleaned_raw,
            standard_value=cleaned_standard,
            enabled=True,
            source=CustomsDictSource.MANUAL.value,
            sync_status=CustomsDictSyncStatus.PENDING.value,
            created_by=actor_id,
            updated_by=actor_id,
            created_at=now,
            updated_at=now,
        )
        self.repository.add(mapping)
        self.repository.commit()
        self.repository.refresh(mapping)
        self._sync_mapping(mapping)
        return mapping

    def update_standard_value(
        self,
        mapping_id: int,
        *,
        standard_value: str,
        raw_value: str | None,
        actor_id: int | None,
    ) -> CustomsDictMapping:
        mapping = self.get(mapping_id)
        if raw_value is not None and normalize_dict_text(raw_value) != mapping.raw_value:
            raise AppException(
                "原始值创建后不可修改。",
                error_code="CustomsDict.RawValueImmutable",
            )
        mapping.standard_value = self._require_text(standard_value, field="标准值")
        mapping.updated_by = actor_id
        mapping.updated_at = datetime.now(UTC).replace(tzinfo=None)
        mapping.sync_status = CustomsDictSyncStatus.PENDING.value
        mapping.sync_error = None
        self.repository.commit()
        self.repository.refresh(mapping)
        self._sync_mapping(mapping)
        return mapping

    def set_enabled(
        self,
        mapping_id: int,
        *,
        enabled: bool,
        actor_id: int | None,
    ) -> CustomsDictMapping:
        mapping = self.get(mapping_id)
        mapping.enabled = enabled
        mapping.updated_by = actor_id
        mapping.updated_at = datetime.now(UTC).replace(tzinfo=None)
        mapping.sync_status = CustomsDictSyncStatus.PENDING.value
        mapping.sync_error = None
        self.repository.commit()
        self.repository.refresh(mapping)
        self._sync_mapping(mapping)
        return mapping

    def resync(self, mapping_id: int) -> CustomsDictMapping:
        mapping = self.get(mapping_id)
        self._sync_mapping(mapping)
        return mapping

    def replay_sync(self, *, dict_type: str) -> dict[str, int]:
        cleaned_type = _parse_dict_type(dict_type.strip())
        mappings = self.repository.list_by_dict_type(cleaned_type)
        synced = 0
        failed = 0
        for mapping in mappings:
            self._sync_mapping(mapping)
            self.repository.refresh(mapping)
            if mapping.sync_status == CustomsDictSyncStatus.SYNCED.value:
                synced += 1
            else:
                failed += 1
        return {"synced": synced, "failed": failed, "total": len(mappings)}

    def _sync_mapping(self, mapping: CustomsDictMapping) -> None:
        try:
            if mapping.enabled:
                self.redis_store.put(
                    dict_type=mapping.dict_type,
                    raw_value=mapping.raw_value,
                    standard_value=mapping.standard_value,
                )
            else:
                self.redis_store.remove(
                    dict_type=mapping.dict_type,
                    raw_value=mapping.raw_value,
                )
        except Exception as exc:  # noqa: BLE001 — Redis 故障不回滚 MySQL
            mapping.sync_status = CustomsDictSyncStatus.FAILED.value
            mapping.sync_error = sanitize_redis_error(exc)
            self.repository.commit()
            self.repository.refresh(mapping)
            return
        mapping.sync_status = CustomsDictSyncStatus.SYNCED.value
        mapping.sync_error = None
        mapping.last_synced_at = datetime.now(UTC).replace(tzinfo=None)
        self.repository.commit()
        self.repository.refresh(mapping)

    @staticmethod
    def _require_text(value: str, *, field: str) -> str:
        cleaned = normalize_dict_text(value)
        if not cleaned:
            raise AppException(f"请填写{field}。", error_code="CustomsDict.EmptyValue")
        if len(cleaned) > DICT_TEXT_MAX_LENGTH:
            raise AppException(
                f"{field}长度不能超过 {DICT_TEXT_MAX_LENGTH}。",
                error_code="CustomsDict.ValueTooLong",
            )
        return cleaned
