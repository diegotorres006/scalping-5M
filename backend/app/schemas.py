from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class AnalysisRequest(BaseModel):
    symbol: Literal["EURUSD"] = "EURUSD"
    timeframe: Literal["M5"] = "M5"
    close: float = Field(gt=0)
    zScore: float = Field(ge=-20, le=20)
    distanceEma288: float = Field(ge=-100, le=100)
    volumeSpike: float = Field(ge=0, le=100)
    lowerWickRatio: float = Field(ge=0, le=1)
    upperWickRatio: float = Field(ge=0, le=1)
    bodyRatio: float = Field(ge=0, le=1)
    atr: float = Field(gt=0, le=1)
    isKillzone: bool
    notifyTelegram: bool = True


class DeliveryStatus(BaseModel):
    attempted: bool = False
    sent: bool = False
    detail: str


class AnalysisResponse(BaseModel):
    analysisId: str
    timestamp: datetime
    userId: str
    symbol: str
    timeframe: str
    decision: Literal["BUY", "SELL", "NO_TRADE"]
    label: Literal["COMPRA", "VENTA", "NO OPERAR"]
    approved: bool
    probability: float
    threshold: float
    entry: float
    stopLoss: float | None = None
    takeProfitPartial: float | None = None
    takeProfitRunner: float | None = None
    reasons: list[str]
    telegram: DeliveryStatus
    persisted: bool


class HealthResponse(BaseModel):
    status: Literal["ok"]
    modelLoaded: bool
    firebaseEnabled: bool
