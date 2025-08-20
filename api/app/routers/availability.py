# api/app/routers/availability.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, date as _date, time as dtime, timedelta
from zoneinfo import ZoneInfo

from ..db import AsyncSessionLocal
from ..models import Appointment, Service, DayOverride
from ..schemas import AvailabilityResponse, AvailabilitySlot
from ..core.config import settings

router = APIRouter(prefix="/availability", tags=["availability"])

# 30-minute slot steps
SLOT_STEP_MIN = 30


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session


@router.get("", response_model=AvailabilityResponse)
async def availability(
    service_id: int = Query(..., ge=1),
    date: str = Query(..., description="YYYY-MM-DD"),
    db: AsyncSession = Depends(get_db),
):
    tz = ZoneInfo(settings.TIMEZONE)
    utc = ZoneInfo("UTC")

    # 1) Validate service
    svc = (
        await db.execute(
            select(Service).where(Service.id == service_id, Service.active == True)
        )
    ).scalar_one_or_none()
    if not svc:
        raise HTTPException(404, "Service not found")

    # 2) Parse date
    try:
        d = _date.fromisoformat(date)
    except ValueError:
        raise HTTPException(400, "Invalid date format (expected YYYY-MM-DD)")

    # 3) Working hours (default 08:00–22:00, overridden by DayOverride)
    open_start = dtime(8, 0)
    open_end = dtime(22, 0)

    res = await db.execute(select(DayOverride).where(DayOverride.date == d))
    ov = res.scalar_one_or_none()
    if ov:
        if ov.is_closed:
            return AvailabilityResponse(slots=[])  # whole day closed
        if ov.start_time:
            open_start = ov.start_time
        if ov.end_time:
            open_end = ov.end_time

    # If override produced an invalid window, return empty
    if open_end <= open_start:
        return AvailabilityResponse(slots=[])

    day_start = datetime.combine(d, open_start, tzinfo=tz)
    day_end = datetime.combine(d, open_end, tzinfo=tz)

    # 4) Lead time (e.g., 30 min) in local tz
    lead_cutoff = datetime.now(tz) + timedelta(minutes=settings.LEAD_MINUTES)

    # 5) Fetch existing appointments intersecting this local day
    day_start_utc = day_start.astimezone(utc)
    day_end_utc = day_end.astimezone(utc)
    existing = (
        await db.execute(
            select(Appointment)
            .where(
                Appointment.status == "confirmed",
                Appointment.start_utc < day_end_utc,
                Appointment.end_utc > day_start_utc,
            )
            .order_by(Appointment.start_utc)
        )
    ).scalars().all()

    BUFFER = timedelta(minutes=settings.BUFFER_MINUTES)
    step = timedelta(minutes=SLOT_STEP_MIN)
    duration = timedelta(minutes=svc.duration_min)

    # 6) Build candidate slots
    slots: list[AvailabilitySlot] = []
    cursor = day_start
    while cursor + duration <= day_end:
        start_local = cursor
        end_local = cursor + duration

        # Honor lead time
        if start_local >= lead_cutoff:
            s_u = start_local.astimezone(utc)
            e_u = end_local.astimezone(utc)

            # Overlap rule with buffer AFTER existing appt
            conflict = False
            for ap in existing:
                blocked_start = ap.start_utc
                blocked_end = ap.end_utc + BUFFER  # buffer AFTER existing appt
                # conflict if windows overlap
                if not (e_u <= blocked_start or s_u >= blocked_end):
                    conflict = True
                    break

            if not conflict:
                slots.append(
                    AvailabilitySlot(
                        start_iso=start_local.isoformat(),
                        end_iso=end_local.isoformat(),
                        label=start_local.strftime("%H:%M"),
                    )
                )

        cursor += step

    return AvailabilityResponse(slots=slots)
