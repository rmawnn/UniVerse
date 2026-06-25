import json
import logging
from uuid import UUID

from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.push_subscription import PushSubscription

logger = logging.getLogger(__name__)


async def subscribe(
    db: AsyncSession, user_id: UUID, endpoint: str, p256dh: str, auth: str,
) -> dict:
    existing = (await db.execute(
        select(PushSubscription).where(PushSubscription.endpoint == endpoint)
    )).scalar_one_or_none()

    if existing:
        existing.user_id = user_id
        existing.p256dh = p256dh
        existing.auth = auth
    else:
        db.add(PushSubscription(
            user_id=user_id, endpoint=endpoint, p256dh=p256dh, auth=auth,
        ))
    await db.commit()
    return {"subscribed": True}


async def unsubscribe(db: AsyncSession, user_id: UUID, endpoint: str) -> dict:
    await db.execute(
        delete(PushSubscription).where(
            PushSubscription.user_id == user_id,
            PushSubscription.endpoint == endpoint,
        )
    )
    await db.commit()
    return {"subscribed": False}


async def send_push(db: AsyncSession, user_id: UUID, title: str, body: str, url: str = "/") -> None:
    if not settings.VAPID_PRIVATE_KEY:
        return

    try:
        from pywebpush import webpush, WebPushException
    except ImportError:
        logger.warning("pywebpush not installed, skipping push notification")
        return

    subs = (await db.execute(
        select(PushSubscription).where(PushSubscription.user_id == user_id)
    )).scalars().all()

    payload = json.dumps({"title": title, "body": body, "url": url})

    for sub in subs:
        try:
            webpush(
                subscription_info={
                    "endpoint": sub.endpoint,
                    "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
                },
                data=payload,
                vapid_private_key=settings.VAPID_PRIVATE_KEY,
                vapid_claims={"sub": f"mailto:{settings.VAPID_CLAIMS_EMAIL}"},
            )
        except Exception as e:
            if "410" in str(e) or "404" in str(e):
                await db.delete(sub)
                await db.commit()
            else:
                logger.warning("Push failed for %s: %s", sub.endpoint[:50], e)
