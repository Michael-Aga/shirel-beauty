# app/scheduler.py
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy import select
from datetime import datetime, date as _date, time as dtime, timedelta
from zoneinfo import ZoneInfo

from .db import AsyncSessionLocal
from .models import Appointment
from .core.config import settings

async def send_evening_reminders(for_local_date: _date):
    """Send a reminder for all confirmed appointments on `for_local_date` (local tz)."""
    tz = ZoneInfo(settings.TIMEZONE)
    utc = ZoneInfo("UTC")

    start_local = datetime.combine(for_local_date, dtime(0, 0), tzinfo=tz)
    end_local   = datetime.combine(for_local_date, dtime(23, 59, 59), tzinfo=tz)
    start_utc   = start_local.astimezone(utc)
    end_utc     = end_local.astimezone(utc)

    async with AsyncSessionLocal() as db:
        res = await db.execute(
            select(Appointment).where(
                Appointment.status == "confirmed",
                Appointment.start_utc >= start_utc,
                Appointment.start_utc <= end_utc,
            )
        )
        appts = res.scalars().all()

    for ap in appts:
        local_str = ap.start_utc.astimezone(tz).strftime("%d/%m/%Y %H:%M")
        # Mock “send” – later we’ll integrate WhatsApp/SMS/Email
        print(f"[REMINDER] To {ap.client_name} ({ap.client_phone}) — {local_str} — appt #{ap.id}")

async def _run_for_tomorrow():
    tz = ZoneInfo(settings.TIMEZONE)
    target = (datetime.now(tz) + timedelta(days=1)).date()
    await send_evening_reminders(target)

_scheduler: AsyncIOScheduler | None = None

def start_scheduler():
    """Start APScheduler with a daily job at REMINDER_HOUR local time."""
    global _scheduler
    if _scheduler:
        return

    tz = ZoneInfo(settings.TIMEZONE)
    _scheduler = AsyncIOScheduler(timezone=tz)
    trig = CronTrigger(hour=settings.REMINDER_HOUR, minute=0, timezone=tz)
    # AsyncIOScheduler supports coroutine jobs directly
    _scheduler.add_job(_run_for_tomorrow, trigger=trig, id="evening_reminders", replace_existing=True)
    _scheduler.start()
