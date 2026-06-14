from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


# ── Users ────────────────────────────────────────────────────


class AdminUserResponse(BaseModel):
    id: UUID
    username: str
    email: str
    full_name: str
    is_active: bool
    is_verified_student: bool
    role: str
    university_id: UUID | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class RoleUpdateRequest(BaseModel):
    role: str


class AdminUserActivityCounts(BaseModel):
    posts_count: int = 0
    comments_count: int = 0
    likes_given: int = 0
    followers_count: int = 0
    following_count: int = 0
    jobs_posted: int = 0
    applications_submitted: int = 0


class AdminUserDetailResponse(AdminUserResponse):
    bio: str | None = None
    department: str | None = None
    academic_year: int | None = None
    profile_image_url: str | None = None
    university_name: str | None = None
    communities: list[dict] = []
    recent_posts: list[dict] = []

    # Activity counts
    activity_counts: AdminUserActivityCounts = AdminUserActivityCounts()

    # Recent activity items
    recent_comments: list[dict] = []
    recent_jobs: list[dict] = []
    recent_applications: list[dict] = []
    verification_history: list[dict] = []


# ── Verifications ────────────────────────────────────────────


class AdminVerificationResponse(BaseModel):
    id: UUID
    user_id: UUID
    username: str
    full_name: str
    verification_method: str
    university_email: str | None = None
    document_url: str | None = None
    university_id: UUID
    university_name: str | None = None
    status: str
    rejection_reason: str | None = None
    created_at: datetime
    expires_at: datetime | None = None
    verified_at: datetime | None = None


class RejectRequest(BaseModel):
    reason: str | None = None


# ── Communities ──────────────────────────────────────────────


class AdminCommunityResponse(BaseModel):
    id: UUID
    name: str
    description: str | None = None
    university_id: UUID
    member_count: int
    is_deleted: bool
    created_at: datetime


class AdminCommunityDetailResponse(AdminCommunityResponse):
    created_by_username: str | None = None
    members: list[dict] = []
    recent_posts: list[dict] = []


# ── Posts ────────────────────────────────────────────────────


class AdminPostResponse(BaseModel):
    id: UUID
    author_username: str
    author_full_name: str
    community_id: UUID
    community_name: str
    content_preview: str
    image_url: str | None = None
    is_deleted: bool
    created_at: datetime


class AdminPostDetailResponse(AdminPostResponse):
    content: str
    like_count: int = 0
    comment_count: int = 0
    comments: list[dict] = []


# ── Stats & Activity ────────────────────────────────────────


class AdminStatsResponse(BaseModel):
    total_users: int
    active_users: int
    verified_students: int
    pending_verifications: int
    total_communities: int
    active_communities: int
    total_posts: int
    hidden_posts: int
    total_messages: int
    total_jobs: int
    active_jobs: int
    total_applications: int
    total_reports: int
    pending_reports: int

    # Weekly trend counts (created in the last 7 days)
    users_this_week: int
    posts_this_week: int
    jobs_this_week: int
    applications_this_week: int
    verifications_this_week: int
    communities_this_week: int
    reports_this_week: int


class RecentActivityResponse(BaseModel):
    latest_users: list[dict]
    latest_verifications: list[dict]
    latest_posts: list[dict]
    latest_communities: list[dict]
    latest_reports: list[dict]


# ── Moderation Queue ────────────────────────────────────────


class ModerationJobItem(BaseModel):
    id: UUID
    title: str
    company_name: str | None = None
    job_type: str
    author_username: str
    is_active: bool
    created_at: datetime


class ModerationQueueResponse(BaseModel):
    pending_verifications: list[AdminVerificationResponse]
    hidden_posts: list[AdminPostResponse]
    recent_communities: list[AdminCommunityResponse]
    recent_jobs: list[ModerationJobItem]


# ── AI Analytics ───────────────────────────────────────────


class CategoryDistributionItem(BaseModel):
    category: str
    count: int
    percentage: float


class LatestCategorizedPost(BaseModel):
    id: UUID
    content_preview: str
    category: str
    created_at: datetime


class CategorizationAnalytics(BaseModel):
    total_categorized: int
    total_uncategorized: int
    distribution: list[CategoryDistributionItem]
    latest_posts: list[LatestCategorizedPost]
    provider: str
    eval_accuracy: float | None = None


class CommunityRecAnalytics(BaseModel):
    total_communities: int
    algorithm_signals: list[dict]
    eval_precision_at_3: float | None = None
    eval_ndcg_at_3: float | None = None
    eval_scenarios: int | None = None


class JobMatchAnalytics(BaseModel):
    total_jobs: int
    total_applications: int
    eval_skill_accuracy: float | None = None
    eval_tier_accuracy: float | None = None
    eval_ranking_accuracy: float | None = None


class LoRAAnalytics(BaseModel):
    train_examples: int
    eval_examples: int
    model_name: str
    dataset_ready: bool
    training_status: str
    evaluation_status: str


class AIAnalyticsResponse(BaseModel):
    categorization: CategorizationAnalytics
    community_recommendation: CommunityRecAnalytics
    job_matching: JobMatchAnalytics
    lora: LoRAAnalytics
