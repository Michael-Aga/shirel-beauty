# api/app/scheduler.py
from __future__ import annotations

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy import select
from datetime import datetime, date as _date, time as dtime, timedelta
from zoneinfo import ZoneInfo
from typing import Optional, Dict
import re

from .db import AsyncSessionLocal
from .models import Appointment, Service
from .core.config import settings


# ---------------------------
# Twilio helpers
# ---------------------------
def _twilio_client():
    """Return Twilio Client if fully configured & installed, else None."""
    sid = getattr(settings, "TWILIO_ACCOUNT_SID", None)
    token = getattr(settings, "TWILIO_AUTH_TOKEN", None)
    from_ = getattr(settings, "TWILIO_FROM", None)
    if not (sid and token and from_):
        return None
    try:
        from twilio.rest import Client  # type: ignore
    except Exception:
        return None
    return Client(sid, token)


def _to_whatsapp(phone: str) -> str:
    """Normalize IL numbers to E.164 and prefix 'whatsapp:'."""
    p = re.sub(r"\D", "", phone)
    if p.startswith("0") and len(p) == 10:
        # 05XXXXXXXX -> +9725XXXXXXXX
        p = "+972" + p[1:]
    elif p.startswith("972"):
        p = "+" + p
    elif not p.startswith("+"):
        raise ValueError("Invalid IL phone format")
    return f"whatsapp:{p}"


# ---------------------------
# Reminder sending
# ---------------------------
async def send_evening_reminders(for_local_date: _date):
    """Send reminders for all confirmed appointments on `for_local_date` (local tz)."""
    tz = ZoneInfo(settings.TIMEZONE)
    utc = ZoneInfo("UTC")

    start_local = datetime.combine(for_local_date, dtime(0, 0), tzinfo=tz)
    end_local = datetime.combine(for_local_date, dtime(23, 59, 59), tzinfo=tz)
    start_utc = start_local.astimezone(utc)
    end_utc = end_local.astimezone(utc)

    async with AsyncSessionLocal() as db:
        res = await db.execute(
            select(Appointment).where(
                Appointment.status == "confirmed",
                Appointment.start_utc >= start_utc,
                Appointment.start_utc <= end_utc,
            )
        )
        appts = res.scalars().all()

        svc_ids = {a.service_id for a in appts}
        svc_by_id: Dict[int, Service] = {}
        if svc_ids:
            res2 = await db.execute(select(Service).where(Service.id.in_(svc_ids)))
            svc_by_id = {s.id: s for s in res2.scalars().all()}

    client = _twilio_client()
    sent = 0
    errors = 0

    for ap in appts:
        local_dt = ap.start_utc.astimezone(tz)
        svc = svc_by_id.get(ap.service_id)
        svc_name = svc.name if svc else "שירות / Service"
        when_he = local_dt.strftime("%d/%m/%Y בשעה %H:%M")
        when_en = local_dt.strftime("%d/%m/%Y at %H:%M")

        body = (
            f"‏תזכורת ✨ Shirel Beauty\n"
            f"{svc_name} — {when_he}\n"
            f"מדיניות ביטול: פחות מ־24 שעות → תשלום 50%.\n\n"
            f"Reminder ✨ Shirel Beauty\n"
            f"{svc_name} — {when_en}\n"
            f"Cancellation policy: <24h → 50% fee."
        )

        try:
            to = _to_whatsapp(ap.client_phone)
            if client:
                client.messages.create(
                    from_=settings.TWILIO_FROM,
                    to=to,
                    body=body,
                )
                print(f"[REMINDER] ✅ WhatsApp sent to {ap.client_phone} (appt #{ap.id})")
            else:
                print(f"[REMINDER][DRY-RUN] -> {ap.client_phone}: {body}")
            sent += 1
        except Exception as e:
            print(f"[REMINDER] ❌ Failed for appt #{ap.id} ({ap.client_phone}): {e}")
            errors += 1

    # Optional: summary to owner
    owner = getattr(settings, "OWNER_WHATSAPP", None)
    if owner and (client or True):
        summary = (
            f"Shirel Beauty — reminder summary for {for_local_date.isoformat()}:\n"
            f"Total appts: {len(appts)}, sent: {sent}, errors: {errors}."
        )
        try:
            if client:
                client.messages.create(from_=settings.TWILIO_FROM, to=owner, body=summary)
            print(f"[REMINDER] Summary sent to owner: {summary}")
        except Exception as e:
            print(f"[REMINDER] Owner summary failed: {e}")


async def _run_for_tomorrow():
    tz = ZoneInfo(settings.TIMEZONE)
    target = (datetime.now(tz) + timedelta(days=1)).date()
    await send_evening_reminders(target)


_scheduler: Optional[AsyncIOScheduler] = None


def start_scheduler():
    """Start APScheduler with a daily job at REMINDER_HOUR local time."""
    global _scheduler
    if _scheduler:
        return

    tz = ZoneInfo(settings.TIMEZONE)
    _scheduler = AsyncIOScheduler(timezone=tz)
    trig = CronTrigger(hour=settings.REMINDER_HOUR, minute=0, timezone=tz)
    _scheduler.add_job(_run_for_tomorrow, trigger=trig, id="evening_reminders", replace_existing=True)
    _scheduler.start()
    print(
        f"[SCHED] Evening reminders scheduled daily at {settings.REMINDER_HOUR:02d}:00 "
        f"{settings.TIMEZONE} (runs for tomorrow’s appointments)."
    )
