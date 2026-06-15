import logging
import time
from uuid import UUID

from sqlalchemy import case, cast, func, select, Float
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ai_usage_log import AIUsageLog

logger = logging.getLogger(__name__)


async def log_ai_usage(
    db: AsyncSession,
    *,
    user_id: UUID,
    feature: str,
    provider: str,
    latency_ms: int,
    success: bool = True,
) -> None:
    entry = AIUsageLog(
        user_id=user_id,
        feature=feature,
        provider=provider,
        latency_ms=latency_ms,
        success=success,
    )
    db.add(entry)
    await db.flush()


async def get_ai_usage_logs(
    db: AsyncSession,
    *,
    page: int = 1,
    page_size: int = 50,
    feature: str | None = None,
) -> dict:
    base = select(AIUsageLog)
    count_q = select(func.count(AIUsageLog.id))

    if feature:
        base = base.where(AIUsageLog.feature == feature)
        count_q = count_q.where(AIUsageLog.feature == feature)

    total = (await db.execute(count_q)).scalar() or 0

    rows = (
        await db.execute(
            base.order_by(AIUsageLog.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    ).scalars().all()

    items = [
        {
            "id": str(r.id),
            "user_id": str(r.user_id),
            "feature": r.feature,
            "provider": r.provider,
            "latency_ms": r.latency_ms,
            "success": r.success,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": max(1, (total + page_size - 1) // page_size),
    }


async def get_ai_usage_summary(db: AsyncSession) -> dict:
    total_q = select(func.count(AIUsageLog.id))
    total = (await db.execute(total_q)).scalar() or 0

    success_q = select(func.count(AIUsageLog.id)).where(AIUsageLog.success.is_(True))
    success_count = (await db.execute(success_q)).scalar() or 0

    avg_latency_q = select(func.avg(AIUsageLog.latency_ms))
    avg_latency = (await db.execute(avg_latency_q)).scalar()

    by_feature_q = (
        select(
            AIUsageLog.feature,
            func.count(AIUsageLog.id).label("count"),
            func.avg(AIUsageLog.latency_ms).label("avg_latency"),
            func.sum(case((AIUsageLog.success.is_(True), 1), else_=0)).label("success_count"),
        )
        .group_by(AIUsageLog.feature)
        .order_by(func.count(AIUsageLog.id).desc())
    )
    by_feature_rows = (await db.execute(by_feature_q)).all()

    by_feature = [
        {
            "feature": row.feature,
            "count": row.count,
            "avg_latency_ms": round(row.avg_latency) if row.avg_latency else 0,
            "success_rate": round(row.success_count / row.count * 100, 1) if row.count else 0,
        }
        for row in by_feature_rows
    ]

    return {
        "total_requests": total,
        "success_rate": round(success_count / total * 100, 1) if total else 0,
        "avg_latency_ms": round(avg_latency) if avg_latency else 0,
        "by_feature": by_feature,
    }
