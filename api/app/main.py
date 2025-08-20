from fastapi import FastAPI
from sqlalchemy import select
from .db import init_models, AsyncSessionLocal
from .models import Service
from .routers import services as services_router
from .routers import availability as availability_router
from .routers import appointments as appointments_router
from .routers import overrides as overrides_router
from fastapi.middleware.cors import CORSMiddleware
from .scheduler import start_scheduler
from .routers import dev as dev_router
from .core.config import settings

app = FastAPI(title="Shirel Beauty API", version="0.1.0")

# ✅ Add CORS immediately after app creation
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # tighten later (e.g., your app/web domains)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    await init_models()
    # seed services if empty
    async with AsyncSessionLocal() as db:
        has = await db.execute(select(Service))
        if not has.scalars().first():
            db.add_all([
                Service(name="Eyelashes", duration_min=120, price=200, active=True),
                Service(name="Eyebrows",  duration_min=90,  price=150, active=True),
                Service(name="Combo",     duration_min=210, price=300, active=True),
            ])
            await db.commit()
    if settings.ENABLE_REMINDERS:
    	start_scheduler()

@app.get("/health")
def health():
    return {"status": "ok"}

app.include_router(services_router.router)
app.include_router(availability_router.router)
app.include_router(appointments_router.router)
app.include_router(overrides_router.router)
app.include_router(dev_router.router)
