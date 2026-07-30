"""货币 code 规范化单元测试（不依赖 MySQL）。"""

import pytest

from custom_data_toolkit.middleware.error_handler import AppException
from custom_data_toolkit.services.currency_service import CurrencyService


def test_normalize_code_optional_blank() -> None:
    assert CurrencyService._normalize_code(None) is None
    assert CurrencyService._normalize_code("") is None
    assert CurrencyService._normalize_code("   ") is None


def test_normalize_code_accepts_valid_codes() -> None:
    assert CurrencyService._normalize_code("CNY") == "CNY"
    assert CurrencyService._normalize_code(" cny ") == "CNY"
    assert CurrencyService._normalize_code("MYR_IM") == "MYR_IM"
    assert CurrencyService._normalize_code("myr_ex") == "MYR_EX"
    assert CurrencyService._normalize_code("A") == "A"
    assert CurrencyService._normalize_code("ABCDEFGHIJ") == "ABCDEFGHIJ"  # 10 chars


@pytest.mark.parametrize("bad", [
    "123",          # digits not allowed
    "CN1",          # digit not allowed
    "ABCDEFGHIJK",  # 11 chars, too long
    "CNY USD",      # space in middle
    "CN-Y",        # hyphen not allowed
    "CN.Y",        # dot not allowed
])
def test_normalize_code_rejects_invalid(bad: str) -> None:
    with pytest.raises(AppException) as exc:
        CurrencyService._normalize_code(bad)
    assert exc.value.error_code == "Currency.InvalidCode"
