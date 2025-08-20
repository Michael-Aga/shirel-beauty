from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from .core.config import settings

engine = create_async_engine(settings.DB_URL, future=True, echo=False)
AsyncSessionLocal = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
Base = declarative_base()

async def init_models():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
