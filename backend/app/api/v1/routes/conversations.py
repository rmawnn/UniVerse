from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import require_verified_user
from app.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.conversation import ConversationCreateRequest, ConversationResponse
from app.schemas.message import MessageCreateRequest, MessageResponse
from app.services import conversation_service, message_service

router = APIRouter()


@router.post("/conversations", response_model=ConversationResponse, status_code=201)
async def create_conversation(
    data: ConversationCreateRequest,
    current_user: User = Depends(require_verified_user),
    db: AsyncSession = Depends(get_db),
):
    """Start a 1-to-1 DM conversation. Returns existing conversation if one already exists."""
    return await conversation_service.create_conversation(db, current_user, data.participant_id)


@router.get("/conversations", response_model=PaginatedResponse[ConversationResponse])
async def list_conversations(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_verified_user),
    db: AsyncSession = Depends(get_db),
):
    """List my conversations, sorted by latest activity."""
    return await conversation_service.list_conversations(
        db, current_user, page=page, page_size=page_size,
    )


@router.post(
    "/conversations/{conversation_id}/messages",
    response_model=MessageResponse,
    status_code=201,
)
async def send_message(
    conversation_id: UUID,
    data: MessageCreateRequest,
    current_user: User = Depends(require_verified_user),
    db: AsyncSession = Depends(get_db),
):
    """Send a message in a conversation. Must be a participant."""
    return await message_service.send_message(db, conversation_id, current_user, data.content)


@router.post("/conversations/{conversation_id}/read", status_code=204)
async def mark_conversation_read(
    conversation_id: UUID,
    current_user: User = Depends(require_verified_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark all messages in a conversation as read. Must be a participant."""
    await conversation_service.mark_conversation_read(db, conversation_id, current_user)


@router.get(
    "/conversations/{conversation_id}/messages",
    response_model=PaginatedResponse[MessageResponse],
)
async def list_messages(
    conversation_id: UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    current_user: User = Depends(require_verified_user),
    db: AsyncSession = Depends(get_db),
):
    """List messages in a conversation (ascending). Must be a participant."""
    return await message_service.list_messages(
        db, conversation_id, current_user, page=page, page_size=page_size,
    )
