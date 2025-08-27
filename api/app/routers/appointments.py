# api/app/routers/appointments.py
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, delete, func
from datetime import datetime, date as Date, time, timedelta
from zoneinfo import ZoneInfo

from ..db import AsyncSessionLocal
from ..models import Service, DailyOverride, Appointment
from ..schemas import AppointmentCreate, AppointmentOut, AppointmentUpdate, AppointmentActionResponse
from ..core.config import settings

router = APIRouter(prefix="/appointments", tags=["appointments"])

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

# ---------- LIST APPOINTMENTS ----------
@router.get("", response_model=list[AppointmentOut])
async def list_appointments(
    date: str | None = Query(
        None, description="Optional YYYY-MM-DD (local day to filter)"
    ),
    db: AsyncSession = Depends(get_db),
):
    tz = ZoneInfo(settings.TIMEZONE)
    utc = ZoneInfo("UTC")

    q = select(Appointment).order_by(Appointment.start_utc)
    if date:
        try:
            d = Date.fromisoformat(date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format (YYYY-MM-DD)")
        start_local = datetime.combine(d, time.min, tzinfo=tz)
        end_local   = datetime.combine(d, time.max, tzinfo=tz)
        q = q.where(
            and_(
                Appointment.start_utc >= start_local.astimezone(utc),
                Appointment.start_utc <  end_local.astimezone(utc),
            )
        )

    rows = (await db.execute(q)).scalars().all()
    return rows

# ---------- CREATE APPOINTMENT ----------
@router.post("", response_model=AppointmentOut, status_code=status.HTTP_201_CREATED)
async def create_appointment(payload: AppointmentCreate, db: AsyncSession = Depends(get_db)):
    tz = ZoneInfo(settings.TIMEZONE)
    utc = ZoneInfo("UTC")

    # service exists & active
    svc = (
        await db.execute(
            select(Service).where(Service.id == payload.service_id, Service.active == True)
        )
    ).scalar_one_or_none()
    if not svc:
        raise HTTPException(404, "Service not found")

    # parse start (assume local if naive)
    try:
        start = datetime.fromisoformat(payload.start_iso)
    except ValueError:
        raise HTTPException(400, "Invalid start_iso format")
    if start.tzinfo is None:
        start = start.replace(tzinfo=tz)

    start_local = start.astimezone(tz)
    end_local   = start_local + timedelta(minutes=svc.duration_min)

    # lead time
    if start_local < (datetime.now(tz) + timedelta(minutes=settings.LEAD_MINUTES)):
        raise HTTPException(400, f"Must book at least {settings.LEAD_MINUTES} minutes in advance")

    # working hours (override or default)
    ov = (
        await db.execute(select(DailyOverride).where(DailyOverride.date == start_local.date()))
    ).scalar_one_or_none()
    if ov and ov.is_closed:
        raise HTTPException(400, "Day is closed")
    start_t = ov.start_time if ov else time(8, 0)
    end_t   = ov.end_time   if ov else time(22, 0)
    window_start = datetime.combine(start_local.date(), start_t, tzinfo=tz)
    window_end   = datetime.combine(start_local.date(), end_t, tzinfo=tz)
    if not (window_start <= start_local and end_local <= window_end):
        raise HTTPException(400, "Outside working hours")

    # conflict check (+ buffer AFTER existing appts), filtered by service
    BUFFER = timedelta(minutes=settings.BUFFER_MINUTES)
    start_utc = start_local.astimezone(utc)
    end_utc   = end_local.astimezone(utc)

    conflict_q = (
        select(func.count(Appointment.id))
        .where(
            Appointment.service_id == svc.id,
            Appointment.status == "confirmed",
            Appointment.start_utc < end_utc + BUFFER,
            Appointment.end_utc   > start_utc,
        )
    )
    conflicts = (await db.execute(conflict_q)).scalar_one()
    if conflicts:
        raise HTTPException(409, "This time is already booked. Please pick another slot.")

    # create
    appt = Appointment(
        service_id=svc.id,
        client_name=payload.client_name.strip(),
        client_phone=payload.client_phone.strip(),
        start_utc=start_utc,
        end_utc=end_utc,
        status="confirmed",
    )
    db.add(appt)
    await db.commit()
    await db.refresh(appt)
    return appt

# ---------- DELETE (DEV HELPER) ----------
@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
async def delete_appointments(
    date: str | None = Query(
        None,
        description="Optional YYYY-MM-DD to delete only that local day; omit to delete ALL appointments (dev only)",
    ),
    db: AsyncSession = Depends(get_db),
):
    tz = ZoneInfo(settings.TIMEZONE)
    utc = ZoneInfo("UTC")

    if date:
        d = Date.fromisoformat(date)
        start_local = datetime.combine(d, time.min, tzinfo=tz)
        end_local   = datetime.combine(d, time.max, tzinfo=tz)
        await db.execute(
            delete(Appointment).where(
                and_(
                    Appointment.start_utc >= start_local.astimezone(utc),
                    Appointment.start_utc <  end_local.astimezone(utc),
                )
            )
        )
    else:
        await db.execute(delete(Appointment))
    await db.commit()

# ---------- CANCEL / RESCHEDULE ----------
@router.patch("/{appt_id}", response_model=AppointmentActionResponse)
async def update_appointment(
    appt_id: int,
    payload: AppointmentUpdate,
    db: AsyncSession = Depends(get_db),
):
    tz = ZoneInfo(settings.TIMEZONE)
    utc = ZoneInfo("UTC")

    appt = (await db.execute(select(Appointment).where(Appointment.id == appt_id))).scalar_one_or_none()
    if not appt:
        raise HTTPException(404, "Appointment not found")

    # ---- CANCEL ----
    if payload.action == "cancel":
        if appt.status != "confirmed":
            raise HTTPException(400, "Only confirmed appointments can be cancelled")

        # 24h policy
        start_local = appt.start_utc.astimezone(tz)
        hours_left = (start_local - datetime.now(tz)).total_seconds() / 3600
        # Find price for penalty
        svc = (await db.execute(select(Service).where(Service.id == appt.service_id))).scalar_one_or_none()
        price = svc.price if svc else 0
        penalty = int(price * 0.5) if hours_left < 24 else 0

        appt.status = "cancelled"
        await db.commit()
        await db.refresh(appt)
        return AppointmentActionResponse(appointment=appt, penalty_due=penalty)

    # ---- RESCHEDULE ----
    if payload.action == "reschedule":
        if not payload.new_start_iso:
            raise HTTPException(400, "new_start_iso is required to reschedule")
        svc = (await db.execute(select(Service).where(Service.id == appt.service_id))).scalar_one_or_none()
        if not svc or not svc.active:
            raise HTTPException(404, "Service not found")

        # parse new start (assume local if naive)
        try:
            new_start = datetime.fromisoformat(payload.new_start_iso)
        except ValueError:
            raise HTTPException(400, "Invalid new_start_iso format")
        if new_start.tzinfo is None:
            new_start = new_start.replace(tzinfo=tz)

        new_start_local = new_start.astimezone(tz)
        new_end_local   = new_start_local + timedelta(minutes=svc.duration_min)

        # lead time
        if new_start_local < (datetime.now(tz) + timedelta(minutes=settings.LEAD_MINUTES)):
            raise HTTPException(400, f"Must reschedule with at least {settings.LEAD_MINUTES} minutes in advance")

        # working hours (override or default)
        ov = (await db.execute(select(DailyOverride).where(DailyOverride.date == new_start_local.date()))).scalar_one_or_none()
        if ov and ov.is_closed:
            raise HTTPException(400, "Day is closed")
        start_t = ov.start_time if ov else time(8, 0)
        end_t   = ov.end_time   if ov else time(22, 0)
        window_start = datetime.combine(new_start_local.date(), start_t, tzinfo=tz)
        window_end   = datetime.combine(new_start_local.date(), end_t, tzinfo=tz)
        if not (window_start <= new_start_local and new_end_local <= window_end):
            raise HTTPException(400, "Outside working hours")

        # conflict (+ buffer after existing appts), excluding the current appointment, same service
        BUFFER = timedelta(minutes=settings.BUFFER_MINUTES)
        new_s_utc = new_start_local.astimezone(utc)
        new_e_utc = new_end_local.astimezone(utc)

        conflict_q = (
            select(func.count(Appointment.id))
            .where(
                Appointment.id != appt.id,
                Appointment.service_id == appt.service_id,
                Appointment.status == "confirmed",
                Appointment.start_utc < new_e_utc + BUFFER,
                Appointment.end_utc   > new_s_utc,
            )
        )
        conflicts = (await db.execute(conflict_q)).scalar_one()
        if conflicts:
            raise HTTPException(409, "This time is already booked. Please pick another slot.")

        # apply change
        appt.start_utc = new_s_utc
        appt.end_utc   = new_e_utc
        await db.commit()
        await db.refresh(appt)
        return AppointmentActionResponse(appointment=appt)

    raise HTTPException(400, "Unknown action")

