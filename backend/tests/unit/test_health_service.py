from custom_data_toolkit.services import get_health


def test_get_health_returns_service_status() -> None:
    assert get_health() == {"status": "ok", "service": "custom-data-toolkit"}
