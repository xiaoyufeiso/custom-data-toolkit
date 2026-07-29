from fastapi import APIRouter, Depends

from custom_data_toolkit.deps import SessionDep
from custom_data_toolkit.repositories import SystemRepository
from custom_data_toolkit.services import get_health, get_readiness

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict[str, str]:
    return get_health()


@router.get("/ready")
def ready(session: SessionDep) -> dict[str, str]:
    return get_readiness(SystemRepository(session))
