import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class CommunityCreateRequest(BaseModel):
    """Payload for creating a new community."""
    name: str = Field(..., min_length=2, max_length=100)
    description: str | None = Field(None, max_length=1000)
    is_public: bool = True


class CommunityUpdateRequest(BaseModel):
    """Payload for updating a community. All fields optional."""
    name: str | None = Field(None, min_length=2, max_length=100)
    description: str | None = Field(None, max_length=1000)
    is_public: bool | None = None


class CommunityResponse(BaseModel):
    """Public-facing community representation."""
    id: uuid.UUID
    name: str
    description: str | None = None
    university_id: uuid.UUID
    created_by: uuid.UUID
    is_public: bool
    member_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CommunitySearchResponse(CommunityResponse):
    """Community card for search/discovery results.
    Includes is_member when the caller is authenticated."""
    is_member: bool | None = None


class CommunityDetailResponse(CommunityResponse):
    """Extended response that includes the caller's membership status."""
    is_member: bool = False
    my_role: str | None = None


class CommunityMemberResponse(BaseModel):
    """A single member row with user profile info."""
    user_id: uuid.UUID
    username: str
    full_name: str
    profile_image_url: str | None = None
    role: str
    joined_at: datetime
