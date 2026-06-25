from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.rate_limit import RateLimiter
from app.models.user import User
from app.services import push_service

router = APIRouter()


class PushSubscribeRequest(BaseModel):
    endpoint: str
    p256dh: str
    auth: str


class PushUnsubscribeRequest(BaseModel):
    endpoint: str


@router.get("/push/vapid-key")
async def get_vapid_key():
    """Return the VAPID public key for client-side subscription."""
    return {"vapid_public_key": settings.VAPID_PUBLIC_KEY}


@router.post("/push/subscribe")
async def subscribe(
    data: PushSubscribeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _rl=Depends(RateLimiter(max_calls=10, window_seconds=60, prefix="push:sub")),
):
    """Register a push subscription for the current user."""
    return await push_service.subscribe(
        db, current_user.id, data.endpoint, data.p256dh, data.auth,
    )


@router.post("/push/unsubscribe")
async def unsubscribe(
    data: PushUnsubscribeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove a push subscription."""
    return await push_service.unsubscribe(db, current_user.id, data.endpoint)
