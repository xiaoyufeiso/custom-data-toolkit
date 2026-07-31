from datetime import date, datetime

import pytest

from custom_data_toolkit.middleware.error_handler import ConflictException
from custom_data_toolkit.models import Rate
from custom_data_toolkit.services.rate_service import RateService


def _rate(rate_id: int) -> Rate:
    now = datetime.now()
    return Rate(
        id=rate_id,
        currency_id=1,
        date=date.today(),
        data="1.0",
        checked=False,
        create_time=now,
        update_time=now,
    )


class FakeRateRepository:
    def __init__(self, rates: list[Rate]) -> None:
        self.rates = rates
        self.deleted: list[Rate] = []
        self.commits = 0

    def get_by_ids_for_update(self, rate_ids: list[int]) -> list[Rate]:
        return [rate for rate in self.rates if rate.id in rate_ids]

    def delete(self, rate: Rate) -> None:
        self.deleted.append(rate)

    def commit(self) -> None:
        self.commits += 1


def test_batch_delete_commits_all_rates_once() -> None:
    repository = FakeRateRepository([_rate(1), _rate(2)])
    service = RateService(repository)  # type: ignore[arg-type]

    service.delete_batch([1, 2])

    assert [rate.id for rate in repository.deleted] == [1, 2]
    assert repository.commits == 1


def test_batch_delete_is_atomic_when_a_rate_is_missing() -> None:
    repository = FakeRateRepository([_rate(1)])
    service = RateService(repository)  # type: ignore[arg-type]

    with pytest.raises(ConflictException) as exc_info:
        service.delete_batch([1, 2])

    assert exc_info.value.error_code == "BatchDelete.StaleSelection"
    assert exc_info.value.details == {"missingIds": [2]}
    assert repository.deleted == []
    assert repository.commits == 0


def test_batch_check_updates_only_unchecked_rates() -> None:
    unchecked = _rate(1)
    checked = _rate(2)
    checked.checked = True
    checked_update_time = checked.update_time
    repository = FakeRateRepository([unchecked, checked])
    service = RateService(repository)  # type: ignore[arg-type]

    service.check_batch([1, 2])

    assert unchecked.checked is True
    assert checked.checked is True
    assert checked.update_time == checked_update_time
    assert repository.commits == 1


def test_batch_check_is_atomic_when_a_rate_is_missing() -> None:
    rate = _rate(1)
    repository = FakeRateRepository([rate])
    service = RateService(repository)  # type: ignore[arg-type]

    with pytest.raises(ConflictException) as exc_info:
        service.check_batch([1, 2])

    assert exc_info.value.error_code == "BatchCheck.StaleSelection"
    assert rate.checked is False
    assert repository.commits == 0
