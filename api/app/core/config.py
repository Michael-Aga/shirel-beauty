# api/app/core/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import AliasChoices, Field

class Settings(BaseSettings):
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://postgres:postgres@db:5432/postgres",
        validation_alias=AliasChoices("DATABASE_URL", "DB_URL", "DATABASE_DSN"),
    )

    TIMEZONE: str = "Asia/Jerusalem"
    LEAD_MINUTES: int = 30
    BUFFER_MINUTES: int = 20
    REMINDER_HOUR: int = 19
    ENABLE_REMINDERS: bool = True

    TWILIO_ACCOUNT_SID: str | None = None
    TWILIO_AUTH_TOKEN: str | None = None
    TWILIO_FROM: str | None = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="",
        extra="ignore",
        case_sensitive=False,
    )

settings = Settings()

