from pydantic import BaseModel

from app.schemas.community import ExploreCommunityResponse
from app.schemas.post import PostResponse
from app.schemas.user import UserSearchResponse


class ExploreResponse(BaseModel):
    """Combined explore page data."""
    trending_posts: list[PostResponse]
    suggested_communities: list[ExploreCommunityResponse]
    suggested_users: list[UserSearchResponse]
