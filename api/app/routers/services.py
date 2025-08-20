from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..db import AsyncSessionLocal
from ..models import Service
from ..schemas import ServiceOut

router = APIRouter(prefix="/services", tags=["services"])

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

@router.get("", response_model=list[ServiceOut])
async def list_services(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Service).where(Service.active == True))
    return res.scalars().all()
