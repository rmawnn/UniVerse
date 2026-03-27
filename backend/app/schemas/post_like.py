from pydantic import BaseModel


class PostLikeToggleResponse(BaseModel):
    """Response after toggling a like on a post."""
    liked: bool
    like_count: int
