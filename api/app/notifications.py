from __future__ import annotations
from twilio.rest import Client
from typing import Optional
from .core.config import settings
import re
import logging

log = logging.getLogger(__name__)

_client: Optional[Client] = None
def get_client() -> Optional[Client]:
    global _client
    if _client is None and settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN:
        _client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
    return _client

def normalize_il(phone: str, whatsapp: bool = False) -> str:
    p = phone.strip()
    if p.startswith("+"):
        return f"whatsapp:{p}" if whatsapp and not p.startswith("whatsapp:") else p
    # Israeli mobile like 0501234567
    if re.fullmatch(r"0\d{9}", p):
        intl = "+972" + p[1:]
        return f"whatsapp:{intl}" if whatsapp else intl
    # fallback: return as-is (or raise)
    return f"whatsapp:{p}" if whatsapp else p

async def send_sms(to_phone: str, body: str) -> bool:
    """
    Sends SMS (or WhatsApp if TWILIO_FROM starts with 'whatsapp:').
    Returns True if queued successfully, False otherwise.
    """
    if not (settings.TWILIO_FROM and settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN):
        log.warning("Twilio not configured; skipping send. Body=%s", body)
        return False
    try:
        client = get_client()
        if client is None:
            return False
        whatsapp = str(settings.TWILIO_FROM).startswith("whatsapp:")
        to = normalize_il(to_phone, whatsapp=whatsapp)
        msg = client.messages.create(from_=settings.TWILIO_FROM, to=to, body=body)
        log.info("Twilio queued message %s to %s", msg.sid, to)
        return True
    except Exception as e:
        log.exception("Twilio send failed: %s", e)
        return False
