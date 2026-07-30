from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime

from custom_data_toolkit.middleware.error_handler import (
    AppException,
    InvalidApiKeyException,
    NotFoundException,
)
from custom_data_toolkit.models import ApiKey
from custom_data_toolkit.repositories.api_key_repository import ApiKeyRepository
from custom_data_toolkit.security import new_token, sha256_hex


@dataclass
class ApiKeyIssue:
    row: ApiKey
    plaintext_key: str


class ApiKeyService:
    def __init__(self, repository: ApiKeyRepository) -> None:
        self.repository = repository

    def list_all(self) -> list[ApiKey]:
        return self.repository.list_all()

    def create(self, *, name: str, created_by: int | None) -> ApiKeyIssue:
        cleaned_name = name.strip()
        if not cleaned_name:
            raise AppException("请填写 API Key 名称。")
        if len(cleaned_name) > 100:
            raise AppException("API Key 名称最多 100 个字符。")

        now = datetime.now(UTC).replace(tzinfo=None)
        plaintext = f"cdt_{new_token(24)}"
        key_hash = sha256_hex(plaintext)
        key_prefix = plaintext[:12]
        row = ApiKey(
            name=cleaned_name,
            key_prefix=key_prefix,
            key_hash=key_hash,
            enabled=True,
            created_by=created_by,
            created_at=now,
            updated_at=now,
        )
        self.repository.add(row)
        self.repository.commit()
        self.repository.refresh(row)
        return ApiKeyIssue(row=row, plaintext_key=plaintext)

    def update(self, key_id: int, *, name: str | None, enabled: bool | None) -> ApiKey:
        row = self.repository.get_by_id(key_id)
        if row is None:
            raise NotFoundException("未找到该 API Key。")
        if name is None and enabled is None:
            raise AppException("请至少修改名称或启用状态其中一项。")
        if name is not None:
            cleaned_name = name.strip()
            if not cleaned_name:
                raise AppException("请填写 API Key 名称。")
            if len(cleaned_name) > 100:
                raise AppException("API Key 名称最多 100 个字符。")
            row.name = cleaned_name
        if enabled is not None:
            row.enabled = enabled
        row.updated_at = datetime.now(UTC).replace(tzinfo=None)
        self.repository.commit()
        self.repository.refresh(row)
        return row

    def delete(self, key_id: int) -> None:
        row = self.repository.get_by_id(key_id)
        if row is None:
            raise NotFoundException("未找到该 API Key。")
        self.repository.delete(row)
        self.repository.commit()

    def resolve_active_key(self, plaintext_key: str | None) -> ApiKey:
        if not plaintext_key:
            raise InvalidApiKeyException("缺少 API Key。")
        key_hash = sha256_hex(plaintext_key.strip())
        row = self.repository.get_by_hash(key_hash)
        if row is None or not row.enabled:
            raise InvalidApiKeyException()
        return row
