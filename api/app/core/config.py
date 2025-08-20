from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DB_URL: str = "postgresql+asyncpg://sb:sb@db:5432/shirel"
    TIMEZONE: str = "Asia/Jerusalem"
    LEAD_MINUTES: int = 30
    BUFFER_MINUTES: int = 20
    SLOT_STEP_MIN: int = 15
    REMINDER_HOUR: int = 19
    ENABLE_REMINDERS: bool = True

    class Config:
        env_file = ".env"

settings = Settings()
