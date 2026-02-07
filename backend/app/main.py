from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.auth_routes import router as auth_router
from app.routes.listing_routes import router as listing_router
from app.routes.settings_routes import router as settings_router
from app.routes.notification_routes import router as notification_router
from app.routes.marketplace_routes import router as marketplace_router

app = FastAPI(title="ANNAM Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For dev only
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(listing_router)
app.include_router(settings_router)
app.include_router(notification_router)
app.include_router(marketplace_router)

@app.get("/")
def root():
    return {"status": "ANNAM backend running"}
