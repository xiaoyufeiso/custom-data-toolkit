from datetime import datetime

import pytest
from sqlmodel import SQLModel

from custom_data_toolkit.models.customs_dict import (
    DICT_TEXT_MAX_LENGTH,
    SYNC_ERROR_MAX_LENGTH,
    CustomsDictMapping,
    CustomsDictSource,
    CustomsDictSyncStatus,
    CustomsDictType,
    assert_dict_type,
    normalize_dict_text,
)


def test_normalize_dict_text_trims_edges_only() -> None:
    assert normalize_dict_text("  中国大陆  ") == "中国大陆"
    assert normalize_dict_text("A  B") == "A  B"
    assert normalize_dict_text("cNy") == "cNy"


def test_assert_dict_type_accepts_preset_values() -> None:
    assert assert_dict_type("country") is CustomsDictType.COUNTRY
    assert assert_dict_type("continent") is CustomsDictType.CONTINENT


def test_assert_dict_type_rejects_unknown() -> None:
    with pytest.raises(ValueError, match="unsupported dict_type"):
        assert_dict_type("currency")


def test_customs_dict_mapping_table_metadata() -> None:
    table = SQLModel.metadata.tables["customs_dict_mapping"]
    assert table.c.raw_value.type.length == DICT_TEXT_MAX_LENGTH
    assert table.c.standard_value.type.length == DICT_TEXT_MAX_LENGTH
    assert table.c.sync_error.type.length == SYNC_ERROR_MAX_LENGTH

    unique_names = {constraint.name for constraint in table.constraints if constraint.name}
    assert "uq_customs_dict_type_raw" in unique_names

    now = datetime(2026, 7, 31, 12, 0, 0)
    row = CustomsDictMapping(
        dict_type=CustomsDictType.COUNTRY.value,
        raw_value="中国大陆",
        standard_value="CHN",
        enabled=True,
        source=CustomsDictSource.MANUAL.value,
        sync_status=CustomsDictSyncStatus.PENDING.value,
        created_at=now,
        updated_at=now,
    )
    assert row.enabled is True
    assert row.source == "manual"
    assert row.sync_status == "pending"
