# api/app/schemas.py
from __future__ import annotations

from typing import Optional, Literal, List
from datetime import datetime
from pydantic import BaseModel, Field, field_validator

# --- Regex rules ---
# Phone: +9725XXXXXXXX or whatsapp:+9725XXXXXXXX (9 digits after +972)
PHONE_REGEX = r"^(?:\+9725\d{8}|whatsapp:\+9725\d{8})$"

# Name: two or more words, each ≥2 letters (Hebrew or English), allow - and ' inside words
NAME_REGEX = r"^(?:\p{L}{2,}(?:[-'’]\p{L}{2,})*)(?:\s+\p{L}{2,}(?:[-'’]\p{L}{2,})*)+$"

# -------- Services --------
class ServiceOut(BaseModel):
    id: int
    name: str
    duration_min: int
    price: int  # shekels
    active: bool

    class Config:
        from_attributes = True  # pydantic v2 compatibility

# -------- Availability --------
class AvailabilitySlot(BaseModel):
    start_iso: str  # local ISO with tz (e.g., 2025-08-20T08:00:00+03:00)
    end_iso: str
    label: str      # e.g., "08:00"

class AvailabilityResponse(BaseModel):
    slots: List[AvailabilitySlot]

# -------- Appointments (create/list) --------
class AppointmentCreate(BaseModel):
    service_id: int
    start_iso: str
    client_name: str = Field(pattern=NAME_REGEX, min_length=4, max_length=100)
    client_phone: str = Field(pattern=PHONE_REGEX)

    # trim whitespace before validation
    @field_validator("client_name", "client_phone", mode="before")
    @classmethod
    def _strip_ws(cls, v):
        return v.strip() if isinstance(v, str) else v

class AppointmentOut(BaseModel):
    id: int
    service_id: int
    client_name: str
    client_phone: str
    start_utc: datetime
    end_utc: datetime
    status: Literal["confirmed", "cancelled"]

    class Config:
        from_attributes = True

# -------- Admin actions (cancel/reschedule) --------
class AppointmentActionResponse(BaseModel):
    appointment: AppointmentOut
    penalty_due: Optional[int] = None  # shekels, on cancel if <24h

class AppointmentUpdate(BaseModel):
    action: Literal["cancel", "reschedule"]
    new_start_iso: Optional[str] = None  # required when action="reschedule"

# -------- Override Button --------
class OverrideOut(BaseModel):
    date: str          # YYYY-MM-DD
    start_time: Optional[str] = None  # "HH:MM"
    end_time:   Optional[str] = None
    is_closed: bool

class OverrideUpsert(BaseModel):
    start_time: Optional[str] = None  # when not closed; omit to keep default 08:00
    end_time:   Optional[str] = None  # when not closed; omit to keep default 22:00
    is_closed: bool = False

