from __future__ import annotations

from typing import Any

import httpx
from firebase_admin import auth, credentials, firestore, get_app, initialize_app

from .schemas import DeliveryStatus
from .settings import Settings


class FirebaseGateway:
    def __init__(self, settings: Settings) -> None:
        self.enabled = settings.auth_required or settings.firestore_enabled
        self.firestore_enabled = settings.firestore_enabled
        self._db = None
        if not self.enabled:
            return

        try:
            get_app()
        except ValueError:
            initialize_app(credentials.ApplicationDefault())

        if self.firestore_enabled:
            self._db = firestore.client()

    def verify_token(self, token: str) -> dict[str, Any]:
        return auth.verify_id_token(token, check_revoked=True)

    def save_analysis(self, data: dict[str, Any]) -> bool:
        if self._db is None:
            return False
        self._db.collection("signals").document(data["analysisId"]).set(data)
        return True

    def telegram_chat_for_user(self, user_id: str) -> str | None:
        if self._db is None:
            return None
        snapshot = self._db.collection("users").document(user_id).get()
        if not snapshot.exists:
            return None
        value = snapshot.to_dict().get("telegramChatId")
        return str(value) if value else None


class TelegramGateway:
    def __init__(self, settings: Settings) -> None:
        self.token = settings.telegram_bot_token
        self.default_chat_id = settings.telegram_chat_id

    async def send_analysis(
        self,
        analysis: dict[str, Any],
        chat_id: str | None,
    ) -> DeliveryStatus:
        target = chat_id or self.default_chat_id
        if not self.token:
            return DeliveryStatus(
                detail="Telegram no configurado: falta TELEGRAM_BOT_TOKEN."
            )
        if not target:
            return DeliveryStatus(
                detail=(
                    "Telegram no configurado: falta TELEGRAM_CHAT_ID o "
                    "users/{uid}.telegramChatId."
                )
            )

        text = self._message(analysis)
        url = f"https://api.telegram.org/bot{self.token}/sendMessage"
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    url,
                    json={"chat_id": target, "text": text},
                )
                response.raise_for_status()
        except httpx.HTTPError as exc:
            return DeliveryStatus(
                attempted=True,
                detail=f"Telegram rechazó el envío: {exc.__class__.__name__}.",
            )
        return DeliveryStatus(
            attempted=True,
            sent=True,
            detail="Resultado enviado a Telegram.",
        )

    @staticmethod
    def _message(analysis: dict[str, Any]) -> str:
        lines = [
            "🤖 Análisis EURUSD M5",
            f"Decisión: {analysis['label']}",
            f"Probabilidad IA: {analysis['probability']:.1%}",
            f"Entrada: {analysis['entry']:.5f}",
        ]
        if analysis["approved"]:
            lines.extend(
                [
                    f"Stop Loss: {analysis['stopLoss']:.5f}",
                    f"TP parcial: {analysis['takeProfitPartial']:.5f}",
                    f"TP runner: {analysis['takeProfitRunner']:.5f}",
                ]
            )
        else:
            lines.append("La operación no fue autorizada.")
        return "\n".join(lines)
