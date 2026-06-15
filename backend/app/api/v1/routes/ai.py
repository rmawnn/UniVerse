import json
import logging
import time
from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.recommendation import (
    CommunityRecommendationsResponse,
    JobMatchResponse,
)
from app.services.recommendation_service import get_community_recommendations
from app.services.job_matching_service import compute_job_match
from app.services.ai_usage_service import log_ai_usage
from app.services.llm import get_llm_provider
from app.services.llm.provider import RuleBasedProvider

logger = logging.getLogger(__name__)
router = APIRouter()


class DemoCategorizationRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=2000)


class DemoCategorizationResponse(BaseModel):
    category: str
    provider: str


@router.post("/ai/demo/categorize", response_model=DemoCategorizationResponse)
async def demo_categorize(
    body: DemoCategorizationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Classify arbitrary text into a post category for demo purposes."""
    provider = get_llm_provider()
    provider_name = type(provider).__name__.replace("Provider", "")
    t0 = time.perf_counter()
    success = True
    try:
        category = await provider.classify(body.text)
    except Exception:
        logger.warning("LLM provider failed for demo categorize, falling back to rule-based")
        fallback = RuleBasedProvider()
        category = await fallback.classify(body.text)
        provider_name = "RuleBased (fallback)"
        success = False
    latency_ms = int((time.perf_counter() - t0) * 1000)
    await log_ai_usage(
        db, user_id=current_user.id, feature="categorization",
        provider=provider_name, latency_ms=latency_ms, success=success,
    )
    await db.commit()
    return DemoCategorizationResponse(
        category=category,
        provider=provider_name,
    )


@router.get(
    "/ai/recommendations/communities",
    response_model=CommunityRecommendationsResponse,
)
async def recommend_communities(
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """AI-powered community recommendations based on user profile and activity."""
    t0 = time.perf_counter()
    success = True
    try:
        results = await get_community_recommendations(db, current_user, limit=limit)
    except Exception:
        success = False
        raise
    finally:
        latency_ms = int((time.perf_counter() - t0) * 1000)
        await log_ai_usage(
            db, user_id=current_user.id, feature="recommendation",
            provider="weighted_multi_signal", latency_ms=latency_ms, success=success,
        )
        await db.commit()
    return CommunityRecommendationsResponse(recommendations=results)


@router.get(
    "/jobs/{job_id}/match",
    response_model=JobMatchResponse,
)
async def get_job_match(
    job_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """AI-powered job match score based on student profile and activity."""
    t0 = time.perf_counter()
    success = True
    try:
        result = await compute_job_match(db, current_user, job_id)
    except Exception:
        success = False
        raise
    finally:
        latency_ms = int((time.perf_counter() - t0) * 1000)
        await log_ai_usage(
            db, user_id=current_user.id, feature="job_matching",
            provider="skill_factor_scoring", latency_ms=latency_ms, success=success,
        )
        await db.commit()
    return result


@router.get("/ai/evaluation")
async def get_ai_evaluation(
    current_user: User = Depends(get_current_user),
):
    """Return AI evaluation metrics from pre-computed evaluation files."""
    base_dir = Path(__file__).resolve().parent.parent.parent.parent.parent.parent

    metrics_path = base_dir / "evaluation" / "metrics.json"
    train_path = base_dir / "lora-demo" / "data" / "train.jsonl"
    eval_path = base_dir / "lora-demo" / "data" / "eval.jsonl"
    output_dir = base_dir / "lora-demo" / "output"

    # Categorization
    cat_data: dict = {"status": "pending"}
    if metrics_path.exists():
        try:
            metrics = json.loads(metrics_path.read_text())
            cat_raw = metrics.get("categorization", {})
            per_cat = cat_raw.get("per_category", {})
            f1_values = [v.get("f1", 0) for v in per_cat.values()]
            macro_f1 = round(sum(f1_values) / len(f1_values), 4) if f1_values else None
            cat_data = {
                "status": "completed",
                "accuracy": cat_raw.get("accuracy"),
                "macro_f1": macro_f1,
                "dataset_size": cat_raw.get("dataset_size"),
                "per_category": per_cat,
                "confusion_matrix": cat_raw.get("confusion_matrix"),
            }
        except Exception:
            logger.exception("Failed to read categorization metrics")

    # Community recommendation
    rec_data: dict = {"status": "pending"}
    if metrics_path.exists():
        try:
            metrics = json.loads(metrics_path.read_text())
            cr = metrics.get("community_recommendation", {})
            k3 = cr.get("metrics_by_k", {}).get("k=3", {})
            rec_data = {
                "status": "completed",
                "dataset_size": cr.get("dataset_size"),
                "precision_at_3": k3.get("avg_precision"),
                "ndcg_at_3": k3.get("avg_ndcg"),
                "mrr": k3.get("avg_mrr"),
                "num_scenarios": k3.get("num_scenarios"),
            }
        except Exception:
            logger.exception("Failed to read recommendation metrics")

    # Job matching
    job_data: dict = {"status": "pending"}
    if metrics_path.exists():
        try:
            metrics = json.loads(metrics_path.read_text())
            jm = metrics.get("job_matching", {})
            job_data = {
                "status": "completed",
                "dataset_size": jm.get("dataset_size"),
                "skill_extraction_accuracy": jm.get("skill_extraction", {}).get("accuracy"),
                "tier_accuracy": jm.get("match_quality", {}).get("tier_accuracy"),
                "ranking_accuracy": jm.get("ranking_correlation", {}).get("pairwise_accuracy"),
                "tier_stats": jm.get("match_quality", {}).get("tier_stats"),
            }
        except Exception:
            logger.exception("Failed to read job matching metrics")

    # LoRA
    train_count = 0
    eval_count = 0
    if train_path.exists():
        train_count = sum(1 for _ in train_path.open())
    if eval_path.exists():
        eval_count = sum(1 for _ in eval_path.open())

    has_model = output_dir.exists() and any(output_dir.iterdir()) if output_dir.exists() else False

    lora_data = {
        "model_name": "Qwen2.5-1.5B-Instruct",
        "adapter": "LoRA (rank=16, alpha=32)",
        "train_examples": train_count,
        "eval_examples": eval_count,
        "dataset_ready": train_count > 0 and eval_count > 0,
        "training_status": "completed" if has_model else "pending",
        "evaluation_status": "ready" if has_model else "pending",
    }

    return {
        "categorization": cat_data,
        "community_recommendation": rec_data,
        "job_matching": job_data,
        "lora": lora_data,
    }
