from pydantic import BaseModel


class RepostToggleResponse(BaseModel):
    """Response after toggling a repost on a post."""
    reposted: bool
    repost_count: int
