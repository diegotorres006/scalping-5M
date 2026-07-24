from pathlib import Path

import numpy as np

from app.engine import TradingEngine
from app.schemas import AnalysisRequest


class FakeModel:
    def __init__(self, probability: float) -> None:
        self.probability = probability

    def predict_proba(self, values):
        return np.array([[1 - self.probability, self.probability]])


def request(**overrides) -> AnalysisRequest:
    values = {
        "close": 1.085,
        "zScore": -2.0,
        "distanceEma288": 0.5,
        "volumeSpike": 2.0,
        "lowerWickRatio": 0.1,
        "upperWickRatio": 0.1,
        "bodyRatio": 0.8,
        "atr": 0.0015,
        "isKillzone": True,
    }
    values.update(overrides)
    return AnalysisRequest(**values)


def engine(probability: float) -> TradingEngine:
    return TradingEngine(
        Path("unused"),
        model=FakeModel(probability),
    )


def test_approves_buy_and_calculates_risk_levels():
    result = engine(0.8).analyze(request())

    assert result["decision"] == "BUY"
    assert result["approved"] is True
    assert result["stopLoss"] == 1.0838
    assert result["takeProfitPartial"] == 1.0856
    assert result["takeProfitRunner"] == 1.091


def test_approves_sell():
    result = engine(0.75).analyze(request(zScore=2.0))

    assert result["decision"] == "SELL"
    assert result["approved"] is True


def test_rejects_signal_below_probability_threshold():
    result = engine(0.67).analyze(request())

    assert result["decision"] == "NO_TRADE"
    assert result["approved"] is False


def test_rejects_signal_outside_killzone():
    result = engine(0.9).analyze(request(isKillzone=False))

    assert result["decision"] == "NO_TRADE"
    assert result["approved"] is False
