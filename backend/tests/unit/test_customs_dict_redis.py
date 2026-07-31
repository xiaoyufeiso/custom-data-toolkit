from custom_data_toolkit.config.settings import settings
from custom_data_toolkit.services.customs_dict_redis import (
    formal_dict_key,
    sanitize_redis_error,
)


def test_formal_dict_key_split_by_type() -> None:
    assert formal_dict_key("country") == "customs:country:dict"
    assert formal_dict_key("continent") == "customs:continent:dict"


def test_sanitize_redis_error_masks_password_and_url() -> None:
    settings.redis_url = "redis://user:secret-pass@127.0.0.1:6379/0"
    message = sanitize_redis_error(
        RuntimeError("fail redis://user:secret-pass@127.0.0.1:6379/0 boom")
    )
    assert "secret-pass" not in message
    assert "[redis]" in message or "***" in message
