import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file from the backend directory
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(env_path)


def _fix_db_url(url: str) -> str:
    """Convert postgres:// to postgresql:// (required by psycopg3/SQLAlchemy 2.x)."""
    if url and url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql://", 1)
    return url


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "change-this-in-production")

    _db_url = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:1111@localhost:5432/retail_inventory_db"
    )
    SQLALCHEMY_DATABASE_URI = _fix_db_url(_db_url)
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    JWT_SECRET_KEY = os.getenv(
        "JWT_SECRET_KEY",
        "fallback-secret-key-for-development"
    )
    # Increase token lifetime to 24 hours
    from datetime import timedelta
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)

    # CORS — Vercel frontend URL (set in production env)
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

    # Email Settings
    MAIL_SERVER = os.getenv("MAIL_SERVER", "smtp.gmail.com")
    MAIL_PORT = int(os.getenv("MAIL_PORT", 587))
    MAIL_USE_TLS = os.getenv("MAIL_USE_TLS", "True").lower() == "true"
    MAIL_USERNAME = os.getenv("MAIL_USERNAME")
    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD")
    MAIL_DEFAULT_SENDER = os.getenv("MAIL_DEFAULT_SENDER")
