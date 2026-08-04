from datetime import UTC, datetime

from custom_data_toolkit.middleware.error_handler import (
    AppException,
    ConflictException,
    NotFoundException,
)
from custom_data_toolkit.models.customs_dict import (
    DICT_TEXT_MAX_LENGTH,
    CustomsDictType,
    normalize_dict_text,
    normalize_dict_type_code,
    validate_dict_type_code_format,
)
from custom_data_toolkit.repositories.customs_dict_type_repository import (
    CustomsDictTypeRepository,
)


class CustomsDictTypeService:
    def __init__(self, repository: CustomsDictTypeRepository) -> None:
        self.repository = repository

    def list_page(
        self,
        *,
        enabled: bool | None,
        q: str | None,
        page: int,
        page_size: int,
    ) -> tuple[list[tuple[CustomsDictType, int]], int]:
        cleaned_q = normalize_dict_text(q) if q else None
        if cleaned_q == "":
            cleaned_q = None
        rows, total = self.repository.list_page(
            enabled=enabled,
            q=cleaned_q,
            page=page,
            page_size=page_size,
        )
        counts = self.repository.mapping_counts([row.code for row in rows if row.code])
        return [(row, counts.get(row.code, 0)) for row in rows], total

    def list_options(self) -> list[CustomsDictType]:
        return self.repository.list_enabled_options()

    def list_suggestions(
        self,
        *,
        prefix: str,
        limit: int,
    ) -> list[tuple[CustomsDictType, str]]:
        cleaned_prefix = prefix.strip()
        if not cleaned_prefix:
            raise AppException("推荐前缀不能为空。")
        rows = self.repository.list_suggestions(prefix=cleaned_prefix, limit=limit)
        normalized_prefix = cleaned_prefix.casefold()
        suggestions: list[tuple[CustomsDictType, str]] = []
        for row in rows:
            normalized_code = row.code.strip().casefold()
            normalized_name = row.name.strip().casefold()
            if normalized_code == normalized_prefix or normalized_code.startswith(
                normalized_prefix,
            ):
                match_field = "code"
            else:
                match_field = "name"
            suggestions.append((row, match_field))
        return suggestions

    def get(self, type_id: int) -> tuple[CustomsDictType, int]:
        row = self.repository.get_by_id(type_id)
        if row is None:
            raise NotFoundException("未找到该字典类型。", error_code="CustomsDictType.NotFound")
        return row, self.repository.count_mappings(row.code)

    def create(
        self,
        *,
        code: str,
        name: str,
        actor_id: int | None,
    ) -> CustomsDictType:
        try:
            cleaned_code = validate_dict_type_code_format(code)
        except ValueError as exc:
            raise AppException(
                "类型编码须为 1～32 位：小写字母开头，仅含小写字母、数字、下划线。",
                error_code="CustomsDictType.InvalidCode",
            ) from exc
        cleaned_name = self._require_name(name)
        if self.repository.get_by_code(cleaned_code) is not None:
            raise ConflictException(
                "该类型编码已存在。",
                error_code="CustomsDictType.DuplicateCode",
            )
        now = datetime.now(UTC).replace(tzinfo=None)
        row = CustomsDictType(
            code=cleaned_code,
            name=cleaned_name,
            enabled=True,
            created_by=actor_id,
            updated_by=actor_id,
            created_at=now,
            updated_at=now,
        )
        self.repository.add(row)
        self.repository.commit()
        self.repository.refresh(row)
        return row

    def update_name(
        self,
        type_id: int,
        *,
        name: str,
        code: str | None,
        actor_id: int | None,
    ) -> CustomsDictType:
        row = self.repository.get_by_id(type_id)
        if row is None:
            raise NotFoundException("未找到该字典类型。", error_code="CustomsDictType.NotFound")
        if code is not None and normalize_dict_type_code(code) and normalize_dict_type_code(code) != row.code:
            raise AppException(
                "类型编码创建后不可修改。",
                error_code="CustomsDictType.CodeImmutable",
            )
        row.name = self._require_name(name)
        row.updated_by = actor_id
        row.updated_at = datetime.now(UTC).replace(tzinfo=None)
        self.repository.commit()
        self.repository.refresh(row)
        return row

    def enable(self, type_id: int, *, actor_id: int | None) -> CustomsDictType:
        row = self.repository.get_by_id(type_id)
        if row is None:
            raise NotFoundException("未找到该字典类型。", error_code="CustomsDictType.NotFound")
        row.enabled = True
        row.updated_by = actor_id
        row.updated_at = datetime.now(UTC).replace(tzinfo=None)
        self.repository.commit()
        self.repository.refresh(row)
        return row

    def disable(self, type_id: int, *, actor_id: int | None) -> CustomsDictType:
        row = self.repository.get_by_id(type_id)
        if row is None:
            raise NotFoundException("未找到该字典类型。", error_code="CustomsDictType.NotFound")
        if self.repository.count_mappings(row.code) > 0:
            raise ConflictException(
                "该类型下仍有映射记录，无法停用。",
                error_code="CustomsDictType.HasMappings",
            )
        row.enabled = False
        row.updated_by = actor_id
        row.updated_at = datetime.now(UTC).replace(tzinfo=None)
        self.repository.commit()
        self.repository.refresh(row)
        return row

    @staticmethod
    def _require_name(value: str) -> str:
        cleaned = normalize_dict_text(value)
        if not cleaned:
            raise AppException("请填写类型名称。", error_code="CustomsDictType.EmptyName")
        if len(cleaned) > DICT_TEXT_MAX_LENGTH:
            raise AppException(
                f"类型名称长度不能超过 {DICT_TEXT_MAX_LENGTH}。",
                error_code="CustomsDictType.NameTooLong",
            )
        return cleaned
