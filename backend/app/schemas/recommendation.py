import uuid

from pydantic import BaseModel, Field


class CommunityRecommendation(BaseModel):
    community_id: uuid.UUID
    name: str
    description: str | None = None
    member_count: int = 0
    score: float = Field(..., ge=0.0, le=1.0)
    reason: str
    reasons: list[str] = []

    model_config = {"from_attributes": True}


class CommunityRecommendationsResponse(BaseModel):
    recommendations: list[CommunityRecommendation]
    algorithm: str = "weighted_multi_signal_v1"


class JobMatchFactors(BaseModel):
    skill_overlap: float = 0.0
    keyword_overlap: float = 0.0
    community_relevance: float = 0.0
    university_match: float = 0.0


class JobMatchResponse(BaseModel):
    score: int = Field(..., ge=0, le=100)
    strengths: list[str] = []
    missing_skills: list[str] = []
    factors: JobMatchFactors = JobMatchFactors()
