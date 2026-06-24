from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.exceptions import BadRequest, NotFound, Forbidden
from app.models.poll import PollOption, PollVote
from app.models.post import Post
from app.models.user import User

router = APIRouter()


class VoteRequest(BaseModel):
    option_id: UUID


class VoteResponse(BaseModel):
    voted_option_id: UUID
    total_votes: int


@router.post("/posts/{post_id}/vote", response_model=VoteResponse)
async def vote_on_poll(
    post_id: UUID,
    data: VoteRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    post = (await db.execute(select(Post).where(Post.id == post_id))).scalar_one_or_none()
    if not post or post.post_type != "poll":
        raise NotFound("Poll post")

    option = (await db.execute(
        select(PollOption).where(PollOption.id == data.option_id, PollOption.post_id == post_id)
    )).scalar_one_or_none()
    if not option:
        raise BadRequest("Invalid poll option")

    existing = (await db.execute(
        select(PollVote).where(PollVote.post_id == post_id, PollVote.user_id == current_user.id)
    )).scalar_one_or_none()

    if existing:
        if existing.option_id == data.option_id:
            raise BadRequest("You already voted for this option")
        existing.option_id = data.option_id
    else:
        vote = PollVote(post_id=post_id, option_id=data.option_id, user_id=current_user.id)
        db.add(vote)

    await db.commit()

    total = (await db.execute(
        select(func.count()).select_from(PollVote).where(PollVote.post_id == post_id)
    )).scalar() or 0

    return VoteResponse(voted_option_id=data.option_id, total_votes=total)


@router.delete("/posts/{post_id}/vote", status_code=204)
async def unvote_poll(
    post_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        delete(PollVote).where(PollVote.post_id == post_id, PollVote.user_id == current_user.id)
    )
    if result.rowcount == 0:
        raise BadRequest("No vote to remove")
    await db.commit()
