from pydantic_settings import BaseSettings, SettingsConfigDict


class AppSettings(BaseSettings):
    app_name: str = "custom-data-toolkit"
    app_env: str = "development"
    app_timezone: str = "Asia/Shanghai"
    debug: bool = False
    host: str = "127.0.0.1"
    port: int = 8000
    database_url: str = (
        "mysql+pymysql://customs_app:change-me@172.28.112.1:3306/customs_data_toolkit"
    )
    test_database_url: str = (
        "mysql+pymysql://customs_app:change-me@172.28.112.1:3306/customs_data_toolkit_test"
    )
    session_cookie_name: str = "cdt_session"
    session_ttl_seconds: int = 604800
    cors_allowed_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    redis_url: str = "redis://127.0.0.1:16379/0"
    admin_bootstrap_username: str = "admin"
    admin_bootstrap_password: str = "change-me"
    # 对外 globiz API：true=必须 X-API-Key；false=匿名可读（仅运维改环境变量）
    public_api_auth_enabled: bool = True

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_allowed_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_allowed_origins.split(",") if origin.strip()]


settings = AppSettings()
