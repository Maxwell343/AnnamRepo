from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    MONGO_URI: str
    DB_NAME: str
    jwt_secret: str
    twilio_account_sid: str
    twilio_auth_token: str
    twilio_whatsapp_number: str

    class Config:
        env_file = ".env"
        extra = "forbid"   # keep strict (good practice)


settings = Settings()
