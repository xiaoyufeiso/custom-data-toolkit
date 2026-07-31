import pytest

from custom_data_toolkit.middleware.error_handler import ConflictException
from custom_data_toolkit.models import Currency
from custom_data_toolkit.services.currency_service import CurrencyService


class FakeCurrencyRepository:
    def __init__(
        self,
        currencies: list[Currency],
        blocked_ids: list[int] | None = None,
    ) -> None:
        self.currencies = currencies
        self.blocked_ids = blocked_ids or []
        self.deleted: list[Currency] = []
        self.commits = 0

    def get_by_ids_for_update(self, currency_ids: list[int]) -> list[Currency]:
        return [row for row in self.currencies if row.id in currency_ids]

    def list_ids_with_rates(self, currency_ids: list[int]) -> list[int]:
        return [item for item in self.blocked_ids if item in currency_ids]

    def delete(self, currency: Currency) -> None:
        self.deleted.append(currency)

    def commit(self) -> None:
        self.commits += 1


def test_batch_delete_commits_all_rows_once() -> None:
    repository = FakeCurrencyRepository([
        Currency(id=1, name="A"),
        Currency(id=2, name="B"),
    ])
    service = CurrencyService(repository)  # type: ignore[arg-type]

    service.delete_batch([1, 2])

    assert [row.id for row in repository.deleted] == [1, 2]
    assert repository.commits == 1


def test_batch_delete_is_atomic_when_an_id_is_missing() -> None:
    repository = FakeCurrencyRepository([Currency(id=1, name="A")])
    service = CurrencyService(repository)  # type: ignore[arg-type]

    with pytest.raises(ConflictException) as exc_info:
        service.delete_batch([1, 2])

    assert exc_info.value.error_code == "BatchDelete.StaleSelection"
    assert exc_info.value.details == {"missingIds": [2]}
    assert repository.deleted == []
    assert repository.commits == 0


def test_batch_delete_is_atomic_when_a_currency_has_rates() -> None:
    repository = FakeCurrencyRepository(
        [Currency(id=1, name="A"), Currency(id=2, name="B")],
        blocked_ids=[2],
    )
    service = CurrencyService(repository)  # type: ignore[arg-type]

    with pytest.raises(ConflictException) as exc_info:
        service.delete_batch([1, 2])

    assert exc_info.value.error_code == "Currency.HasRates"
    assert exc_info.value.details == {"blockedIds": [2]}
    assert repository.deleted == []
    assert repository.commits == 0
