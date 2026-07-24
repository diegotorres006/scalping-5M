from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import Depends, FastAPI, Header, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware

from .engine import TradingEngine
from .integrations import FirebaseGateway, TelegramGateway
from .schemas import (
    AnalysisRequest,
    AnalysisResponse,
    DeliveryStatus,
    HealthResponse,
)
from .settings import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.engine = TradingEngine(
        settings.model_path,
        threshold=settings.signal_threshold,
        minimum_atr=settings.minimum_atr,
    )
    app.state.firebase = FirebaseGateway(settings)
    app.state.telegram = TelegramGateway(settings)
    yield


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_origins),
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


def current_user(
    request: Request,
    authorization: str | None = Header(default=None),
) -> dict[str, str]:
    if not settings.auth_required:
        return {"uid": "local-development"}
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Falta el token de Firebase.",
        )
    token = authorization.removeprefix("Bearer ").strip()
    try:
        decoded = request.app.state.firebase.verify_token(token)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="El token de Firebase no es válido.",
        ) from exc
    return {"uid": str(decoded["uid"])}


@app.get("/health", response_model=HealthResponse)
def health(request: Request) -> HealthResponse:
    return HealthResponse(
        status="ok",
        modelLoaded=request.app.state.engine is not None,
        firebaseEnabled=request.app.state.firebase.enabled,
    )


@app.post("/api/v1/analyze", response_model=AnalysisResponse)
async def analyze(
    payload: AnalysisRequest,
    request: Request,
    user: dict[str, str] = Depends(current_user),
) -> AnalysisResponse:
    result = request.app.state.engine.analyze(payload)
    now = datetime.now(timezone.utc)
    analysis = {
        "analysisId": str(uuid4()),
        "timestamp": now,
        "userId": user["uid"],
        "symbol": payload.symbol,
        "timeframe": payload.timeframe,
        **result,
    }

    persisted = False
    if settings.firestore_enabled:
        try:
            persisted = request.app.state.firebase.save_analysis(analysis)
        except Exception:
            persisted = False

    telegram = DeliveryStatus(
        detail="El envío a Telegram no fue solicitado."
    )
    should_notify = payload.notifyTelegram and (
        result["approved"] or settings.telegram_notify_rejected
    )
    if should_notify:
        chat_id = None
        try:
            chat_id = request.app.state.firebase.telegram_chat_for_user(
                user["uid"]
            )
        except Exception:
            chat_id = None
        telegram = await request.app.state.telegram.send_analysis(
            analysis,
            chat_id,
        )

    return AnalysisResponse(
        **analysis,
        telegram=telegram,
        persisted=persisted,
    )
