def get_health() -> dict[str, str]:
    return {"status": "ok", "service": "custom-data-toolkit"}


def get_readiness(repository) -> dict[str, str]:
    database_ok = repository.is_database_reachable()
    return {
        "status": "ok" if database_ok else "unavailable",
        "service": "custom-data-toolkit",
        "database": "up" if database_ok else "down",
    }
