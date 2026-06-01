from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Inventory & Order Management API"
    app_version: str = "0.1.0"
    api_v1_prefix: str = "/api/v1"

    database_url: str = Field(
        default="postgresql+psycopg2://inventory_user:change_me@localhost:5432/inventory_db",
        alias="DATABASE_URL",
    )
    cors_allow_origins_raw: str = Field(
        default="http://localhost:3000,http://localhost:5173",
        alias="CORS_ALLOW_ORIGINS",
    )
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")
    low_stock_threshold: int = Field(default=5, alias="LOW_STOCK_THRESHOLD")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        populate_by_name=True,
    )

    @property
    def cors_allow_origins(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.cors_allow_origins_raw.split(",")
            if origin.strip()
        ]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

