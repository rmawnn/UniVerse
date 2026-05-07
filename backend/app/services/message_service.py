import math
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequest, Forbidden, NotFound
from app.models.message import Message
from app.models.user import User
from app.repositories.conversation_repository import ConversationRepository
from app.repositories.message_repository import MessageRepository
from app.repositories.user_repository import UserRepository
from app.schemas.common import PaginatedResponse
from app.schemas.conversation import ParticipantSummary
from app.schemas.message import MessageResponse
from app.core.ws_manager import ws_manager
from app.services import notification_service


async def send_message(
    db: AsyncSession,
    conversation_id: UUID,
    current_user: User,
    content: str,
) -> MessageResponse:
    """
    Send a message in a conversation.

    Rules:
      - Conversation must exist
      - User must be a participant
    """
    if not current_user.is_active:
        raise BadRequest("Account is deactivated")

    conv_repo = ConversationRepository(db)
    conversation = await conv_repo.get_by_id(conversation_id)
    if not conversation:
        raise NotFound("Conversation")

    if not await conv_repo.is_participant(conversation_id, current_user.id):
        raise Forbidden("You are not a participant in this conversation")

    message = Message(
        conversation_id=conversation_id,
        sender_id=current_user.id,
        content=content,
    )
    msg_repo = MessageRepository(db)
    message = await msg_repo.create(message)

    response = _build_response(message, current_user)

    # Notify other participants + push via WebSocket
    participants = await conv_repo.get_participants(conversation_id)
    for p in participants:
        if p.user_id != current_user.id:
            await notification_service.notify(
                db,
                user_id=p.user_id,
                actor_id=current_user.id,
                type="message",
                reference_id=conversation_id,
                content=f"{current_user.username} sent you a message",
            )
            # Real-time push
            await ws_manager.send_to_user(p.user_id, {
                "type": "new_message",
                "data": {
                    "conversation_id": str(conversation_id),
                    "message": response.model_dump(mode="json"),
                },
            })

    return response


async def list_messages(
    db: AsyncSession,
    conversation_id: UUID,
    current_user: User,
    *,
    page: int = 1,
    page_size: int = 50,
) -> PaginatedResponse[MessageResponse]:
    """
    List messages in a conversation (ascending order).

    Rules:
      - Conversation must exist
      - User must be a participant
    """
    conv_repo = ConversationRepository(db)
    conversation = await conv_repo.get_by_id(conversation_id)
    if not conversation:
        raise NotFound("Conversation")

    if not await conv_repo.is_participant(conversation_id, current_user.id):
        raise Forbidden("You are not a participant in this conversation")

    msg_repo = MessageRepository(db)
    skip = (page - 1) * page_size

    total = await msg_repo.count_by_conversation(conversation_id)
    messages = await msg_repo.list_by_conversation(conversation_id, skip=skip, limit=page_size)

    if not messages:
        return PaginatedResponse(
            items=[], total=total, page=page, page_size=page_size,
            total_pages=math.ceil(total / page_size) if total else 0,
        )

    # Batch load senders
    user_repo = UserRepository(db)
    sender_ids = {m.sender_id for m in messages}
    senders: dict[UUID, User] = {}
    for sid in sender_ids:
        user = await user_repo.get_by_id(sid)
        if user:
            senders[sid] = user

    items = [_build_response(m, senders.get(m.sender_id)) for m in messages]

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total else 0,
    )


def _build_response(message: Message, sender: User | None) -> MessageResponse:
    """Build a MessageResponse with embedded sender summary."""
    sender_summary = ParticipantSummary(
        id=sender.id,
        username=sender.username,
        full_name=sender.full_name,
        profile_image_url=sender.profile_image_url,
    ) if sender else ParticipantSummary(
        id=message.sender_id,
        username="[deleted]",
        full_name="Deleted User",
        profile_image_url=None,
    )

    return MessageResponse(
        id=message.id,
        conversation_id=message.conversation_id,
        sender=sender_summary,
        content=message.content,
        created_at=message.created_at,
    )
