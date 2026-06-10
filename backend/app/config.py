from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration, sourced entirely from environment variables.

    Defaults exist only so the test/dev environment can boot; production must
    supply DATABASE_URL and CORS_ORIGINS explicitly.
    """

    # enable_decoding=False stops pydantic-settings from JSON-decoding env values,
    # so CORS_ORIGINS can be a plain comma-separated string handled by the
    # validator below instead of requiring JSON array syntax.
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", enable_decoding=False)

    database_url: str = "postgresql+psycopg://inventory:inventory@localhost:5432/inventory"
    cors_origins: list[str] = ["http://localhost:5173"]
    low_stock_threshold: int = 10

    @field_validator("database_url", mode="before")
    @classmethod
    def normalize_db_scheme(cls, value: object) -> object:
        # Managed Postgres providers (Render, Heroku, ...) expose a bare
        # postgres:// or postgresql:// URL, which SQLAlchemy maps to the
        # uninstalled psycopg2 driver. Pin it to psycopg v3 unless the caller
        # already specified a driver (e.g. postgresql+psycopg://).
        if isinstance(value, str):
            if value.startswith("postgres://"):
                value = "postgresql://" + value[len("postgres://") :]
            if value.startswith("postgresql://"):
                value = "postgresql+psycopg://" + value[len("postgresql://") :]
        return value

    @field_validator("cors_origins", mode="before")
    @classmethod
    def split_origins(cls, value: object) -> object:
        # Allow a comma-separated string in the env var; pydantic would otherwise
        # try to JSON-decode a plain string for a list field and fail.
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()
