from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import numpy as np
import xgboost as xgb

from .schemas import AnalysisRequest


FEATURE_ORDER = (
    "zScore",
    "distanceEma288",
    "volumeSpike",
    "lowerWickRatio",
    "upperWickRatio",
    "bodyRatio",
)


class TradingEngine:
    """Runs the trained model and the strategy rules from notebook 3."""

    def __init__(
        self,
        model_path: Path,
        threshold: float = 0.68,
        minimum_atr: float = 0.0005,
        model: Any | None = None,
    ) -> None:
        self.threshold = threshold
        self.minimum_atr = minimum_atr
        if model is not None:
            self.model = model
            self.scaler_mean = None
            self.scaler_scale = None
        else:
            if not model_path.is_file():
                raise FileNotFoundError(f"Model not found: {model_path}")
            scaler_path = model_path.with_suffix(".scaler.json")
            if not scaler_path.is_file():
                raise FileNotFoundError(
                    f"Model scaler not found: {scaler_path}"
                )
            scaler = json.loads(scaler_path.read_text(encoding="utf-8"))
            if tuple(scaler["featureOrder"]) != FEATURE_ORDER:
                raise ValueError("Model feature order does not match the API.")
            self.scaler_mean = np.asarray(scaler["mean"], dtype=float)
            self.scaler_scale = np.asarray(scaler["scale"], dtype=float)
            self.model = xgb.Booster()
            self.model.load_model(model_path)

    def analyze(self, payload: AnalysisRequest) -> dict[str, Any]:
        values = np.array(
            [[float(getattr(payload, field)) for field in FEATURE_ORDER]],
            dtype=float,
        )
        if self.scaler_mean is None:
            probability = float(self.model.predict_proba(values)[0][1])
        else:
            scaled = (values - self.scaler_mean) / self.scaler_scale
            probability = float(self.model.inplace_predict(scaled)[0])

        has_time = payload.isKillzone
        has_probability = probability >= self.threshold
        has_atr = payload.atr > self.minimum_atr
        has_volume = payload.volumeSpike > 1.1

        decision = "NO_TRADE"
        if has_time and has_probability and has_atr and has_volume:
            if payload.zScore < -0.6:
                decision = "BUY"
            elif payload.zScore > 0.6:
                decision = "SELL"

        approved = decision != "NO_TRADE"
        label = {
            "BUY": "COMPRA",
            "SELL": "VENTA",
            "NO_TRADE": "NO OPERAR",
        }[decision]

        stop_loss = None
        take_profit_partial = None
        take_profit_runner = None
        risk = payload.atr * 0.8
        if decision == "BUY":
            stop_loss = payload.close - risk
            take_profit_partial = payload.close + risk * 0.5
            take_profit_runner = payload.close + risk * 5.0
        elif decision == "SELL":
            stop_loss = payload.close + risk
            take_profit_partial = payload.close - risk * 0.5
            take_profit_runner = payload.close - risk * 5.0

        reasons = [
            (
                f"Probabilidad IA {probability:.1%}, "
                f"umbral requerido {self.threshold:.0%}."
            ),
            (
                "Dentro de la Killzone operativa."
                if has_time
                else "Fuera de la Killzone operativa."
            ),
            (
                f"ATR válido ({payload.atr:.5f})."
                if has_atr
                else f"ATR insuficiente; debe superar {self.minimum_atr:.5f}."
            ),
            (
                f"Volumen suficiente ({payload.volumeSpike:.2f}x)."
                if has_volume
                else "El pico de volumen debe superar 1.10x."
            ),
        ]
        if abs(payload.zScore) <= 0.6:
            reasons.append("El Z-Score debe salir del rango -0.60 a 0.60.")
        reasons.append(
            "Señal autorizada por todas las reglas."
            if approved
            else "Señal rechazada: no se cumplen todas las reglas."
        )

        return {
            "decision": decision,
            "label": label,
            "approved": approved,
            "probability": round(probability, 6),
            "threshold": self.threshold,
            "entry": payload.close,
            "stopLoss": self._rounded(stop_loss),
            "takeProfitPartial": self._rounded(take_profit_partial),
            "takeProfitRunner": self._rounded(take_profit_runner),
            "reasons": reasons,
        }

    @staticmethod
    def _rounded(value: float | None) -> float | None:
        return round(value, 5) if value is not None else None
