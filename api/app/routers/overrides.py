# api/app/routers/overrides.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from datetime import date, timedelta, time as dtime

from ..db import AsyncSessionLocal
from ..models import DayOverride
from ..schemas import OverrideOut, OverrideUpsert

router = APIRouter(prefix="/overrides", tags=["overrides"])

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

def parse_month(month: str):
    # 'YYYY-MM' -> (first_day, last_day)
    try:
        y, m = map(int, month.split("-"))
        start = date(y, m, 1)
    except Exception:
        raise HTTPException(400, "month must be 'YYYY-MM'")
    if m == 12:
        end = date(y, 12, 31)
    else:
        end = date(y, m + 1, 1) - timedelta(days=1)
    return start, end

def parse_hhmm(s: str) -> dtime:
    try:
        hh, mm = map(int, s.split(":"))
        return dtime(hh, mm)
    except Exception:
        raise HTTPException(400, "time must be 'HH:MM'")

@router.get("", response_model=list[OverrideOut])
async def list_overrides(
    month: str = Query(..., description="YYYY-MM"),
    db: AsyncSession = Depends(get_db)
):
    start, end = parse_month(month)
    res = await db.execute(
        select(DayOverride).where(and_(DayOverride.date >= start, DayOverride.date <= end))
    )
    rows = res.scalars().all()
    return [
        OverrideOut(
            date=r.date.isoformat(),
            is_closed=r.is_closed,
            start_time=r.start_time.strftime("%H:%M") if r.start_time else None,
            end_time=r.end_time.strftime("%H:%M") if r.end_time else None,
        )
        for r in rows
    ]

@router.put("/{date_str}", response_model=OverrideOut)
async def upsert_override(
    date_str: str,
    body: OverrideUpsert,
    db: AsyncSession = Depends(get_db)
):
    try:
        d = date.fromisoformat(date_str)
    except Exception:
        raise HTTPException(400, "date must be 'YYYY-MM-DD'")

    st = et = None
    if not body.is_closed:
        if not body.start_time or not body.end_time:
            raise HTTPException(400, "start_time and end_time required when not closed")
        st = parse_hhmm(body.start_time)
        et = parse_hhmm(body.end_time)
        if et <= st:
            raise HTTPException(400, "end_time must be after start_time")

    res = await db.execute(select(DayOverride).where(DayOverride.date == d))
    row = res.scalar_one_or_none()
    if row:
        row.is_closed = body.is_closed
        row.start_time = st
        row.end_time = et
    else:
        row = DayOverride(date=d, is_closed=body.is_closed, start_time=st, end_time=et)
        db.add(row)

    await db.commit()
    await db.refresh(row)
    return OverrideOut(
        date=row.date.isoformat(),
        is_closed=row.is_closed,
        start_time=row.start_time.strftime("%H:%M") if row.start_time else None,
        end_time=row.end_time.strftime("%H:%M") if row.end_time else None,
    )

@router.delete("/{date_str}", status_code=204)
async def delete_override(date_str: str, db: AsyncSession = Depends(get_db)):
    try:
        d = date.fromisoformat(date_str)
    except Exception:
        raise HTTPException(400, "date must be 'YYYY-MM-DD'")
    res = await db.execute(select(DayOverride).where(DayOverride.date == d))
    row = res.scalar_one_or_none()
    if row:
        await db.delete(row)
        await db.commit()
