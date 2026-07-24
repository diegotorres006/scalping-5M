from fastapi.testclient import TestClient

from app.main import app


def test_health_and_real_model_analysis():
    with TestClient(app) as client:
        health = client.get("/health")
        assert health.status_code == 200
        assert health.json()["modelLoaded"] is True

        response = client.post(
            "/api/v1/analyze",
            json={
                "symbol": "EURUSD",
                "timeframe": "M5",
                "close": 1.085,
                "zScore": -2.0,
                "distanceEma288": 0.5,
                "volumeSpike": 2.0,
                "lowerWickRatio": 0.1,
                "upperWickRatio": 0.1,
                "bodyRatio": 0.8,
                "atr": 0.0015,
                "isKillzone": True,
                "notifyTelegram": False,
            },
        )

    assert response.status_code == 200
    body = response.json()
    assert body["decision"] in {"BUY", "SELL", "NO_TRADE"}
    assert 0 <= body["probability"] <= 1
    assert body["symbol"] == "EURUSD"
    assert body["timeframe"] == "M5"
