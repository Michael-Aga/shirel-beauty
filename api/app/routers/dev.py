# app/routers/dev.py
from fastapi import APIRouter, HTTPException, Query
from datetime import date as _date
from ..scheduler import send_evening_reminders

router = APIRouter(prefix="/dev", tags=["dev"])

@router.post("/send-reminders")
async def send_reminders(for_date: str = Query(..., description="YYYY-MM-DD")):
    try:
        d = _date.fromisoformat(for_date)
    except ValueError:
        raise HTTPException(400, "Bad date format")
    await send_evening_reminders(d)
    return {"status": "ok", "for_date": d.isoformat()}
