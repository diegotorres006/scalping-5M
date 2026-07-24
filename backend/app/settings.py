from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


def _as_bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _as_float(name: str, default: float) -> float:
    value = os.getenv(name)
    return float(value) if value is not None else default


def _origins() -> list[str]:
    raw = os.getenv("CORS_ORIGINS", "http://localhost:5173")
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


@dataclass(frozen=True)
class Settings:
    app_name: str = os.getenv("APP_NAME", "AI Trading Signal API")
    environment: str = os.getenv("ENVIRONMENT", "development")
    model_path: Path = Path(
        os.getenv(
            "MODEL_PATH",
            str(BASE_DIR / "models" / "EURUSD_M5_scalper.ubj"),
        )
    )
    cors_origins: tuple[str, ...] = tuple(_origins())
    auth_required: bool = _as_bool("AUTH_REQUIRED", True)
    firestore_enabled: bool = _as_bool("FIRESTORE_ENABLED", True)
    signal_threshold: float = _as_float("SIGNAL_THRESHOLD", 0.68)
    minimum_atr: float = _as_float("MINIMUM_ATR", 0.0005)
    telegram_bot_token: str | None = os.getenv("TELEGRAM_BOT_TOKEN")
    telegram_chat_id: str | None = os.getenv("TELEGRAM_CHAT_ID")
    telegram_notify_rejected: bool = _as_bool(
        "TELEGRAM_NOTIFY_REJECTED", True
    )


settings = Settings()
