from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.auth_routes import router as auth_router
from app.routes.listing_routes import router as listing_router
from app.routes.settings_routes import router as settings_router
from app.routes.notification_routes import router as notification_router
from app.routes.marketplace_routes import router as marketplace_router
from app.routes.admin_routes import router as admin_router
from app.routes.rescue_routes import router as rescue_router
from app.routes.driver_routes import router as driver_router
from app.routes.mobility_routes import router as mobility_router
from app.routes.dispatch_routes import router as dispatch_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown events for FastAPI."""
    # ── Startup ──
    try:
        from app.services.scheduler import start_scheduler
        start_scheduler()
    except Exception as e:
        print(f"Scheduler failed to start: {e}")
    yield
    # ── Shutdown ──
    try:
        from app.services.scheduler import stop_scheduler
        stop_scheduler()
    except Exception:
        pass


app = FastAPI(title="ANNAM Backend", lifespan=lifespan)

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(listing_router)
app.include_router(settings_router)
app.include_router(notification_router)
app.include_router(marketplace_router)
app.include_router(admin_router)
app.include_router(rescue_router)
app.include_router(driver_router)
app.include_router(mobility_router)
app.include_router(dispatch_router)

@app.get("/")
def root():
    return {"status": "ANNAM backend running"}

