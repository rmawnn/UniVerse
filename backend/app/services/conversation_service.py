import math
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequest, Forbidden, NotFound
from app.models.conversation import Conversation
from app.models.conversation_participant import ConversationParticipant
from app.models.user import User
from app.repositories.conversation_repository import ConversationRepository
from app.repositories.message_repository import MessageRepository
from app.repositories.user_repository import UserRepository
from app.schemas.common import PaginatedResponse
from app.schemas.conversation import (
    ConversationResponse,
    MessageSummary,
    ParticipantSummary,
)


async def create_conversation(
    db: AsyncSession,
    current_user: User,
    participant_id: UUID,
) -> ConversationResponse:
    """
    Create a 1-to-1 DM conversation, or return existing one.

    Rules:
      - Cannot start a conversation with yourself
      - Target user must exist
      - Reuse existing conversation if one already exists between the two users
    """
    if current_user.id == participant_id:
        raise BadRequest("Cannot start a conversation with yourself")

    user_repo = UserRepository(db)
    other_user = await user_repo.get_by_id(participant_id)
    if not other_user:
        raise NotFound("User")

    conv_repo = ConversationRepository(db)

    # Check for existing conversation
    existing = await conv_repo.get_between_users(current_user.id, participant_id)
    if existing:
        participants = await conv_repo.get_participants(existing.id)
        user_ids = [p.user_id for p in participants]
        users = {current_user.id: current_user, other_user.id: other_user}
        return _build_response(existing, user_ids, users, last_message=None)

    # Create new conversation
    conversation = Conversation()
    conversation = await conv_repo.create(conversation)

    # Add both participants
    await conv_repo.add_participant(
        ConversationParticipant(user_id=current_user.id, conversation_id=conversation.id)
    )
    await conv_repo.add_participant(
        ConversationParticipant(user_id=participant_id, conversation_id=conversation.id)
    )

    users = {current_user.id: current_user, other_user.id: other_user}
    return _build_response(
        conversation,
        [current_user.id, participant_id],
        users,
        last_message=None,
    )


async def list_conversations(
    db: AsyncSession,
    current_user: User,
    *,
    page: int = 1,
    page_size: int = 20,
) -> PaginatedResponse[ConversationResponse]:
    """List the current user's conversations, sorted by latest activity."""
    conv_repo = ConversationRepository(db)
    skip = (page - 1) * page_size

    total = await conv_repo.count_by_user(current_user.id)
    conversations = await conv_repo.list_by_user(current_user.id, skip=skip, limit=page_size)

    if not conversations:
        return PaginatedResponse(
            items=[], total=total, page=page, page_size=page_size,
            total_pages=math.ceil(total / page_size) if total else 0,
        )

    conv_ids = [c.id for c in conversations]

    # Batch load participants
    participants_map = await conv_repo.get_participants_batch(conv_ids)

    # Collect all user IDs and batch load
    all_user_ids: set[UUID] = set()
    for user_ids in participants_map.values():
        all_user_ids.update(user_ids)

    user_repo = UserRepository(db)
    users: dict[UUID, User] = {}
    for uid in all_user_ids:
        user = await user_repo.get_by_id(uid)
        if user:
            users[uid] = user

    # Batch load latest messages
    msg_repo = MessageRepository(db)
    latest_messages = await msg_repo.get_latest_by_conversations(conv_ids)

    # Batch load last_read_at and unread counts
    last_read_map = await conv_repo.get_last_read_batch(current_user.id, conv_ids)
    unread_counts = await msg_repo.count_unread_batch(current_user.id, last_read_map)

    items = []
    for conv in conversations:
        user_ids = participants_map.get(conv.id, [])
        msg = latest_messages.get(conv.id)
        last_msg = MessageSummary(
            id=msg.id,
            sender_id=msg.sender_id,
            content=msg.content,
            created_at=msg.created_at,
        ) if msg else None

        items.append(_build_response(
            conv, user_ids, users,
            last_message=last_msg,
            unread_count=unread_counts.get(conv.id, 0),
        ))

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total else 0,
    )


async def mark_conversation_read(
    db: AsyncSession,
    conversation_id: UUID,
    current_user: User,
) -> None:
    """Mark all messages in a conversation as read for the current user."""
    conv_repo = ConversationRepository(db)
    conversation = await conv_repo.get_by_id(conversation_id)
    if not conversation:
        raise NotFound("Conversation")

    if not await conv_repo.is_participant(conversation_id, current_user.id):
        raise Forbidden("You are not a participant in this conversation")

    await conv_repo.mark_read(conversation_id, current_user.id)


def _build_response(
    conversation: Conversation,
    participant_user_ids: list[UUID],
    users: dict[UUID, User],
    *,
    last_message: MessageSummary | None,
    unread_count: int = 0,
) -> ConversationResponse:
    """Build a ConversationResponse with participant summaries."""
    participants = []
    for uid in participant_user_ids:
        user = users.get(uid)
        if user:
            participants.append(ParticipantSummary(
                id=user.id,
                username=user.username,
                full_name=user.full_name,
                profile_image_url=user.profile_image_url,
            ))
        else:
            participants.append(ParticipantSummary(
                id=uid,
                username="[deleted]",
                full_name="Deleted User",
                profile_image_url=None,
            ))

    return ConversationResponse(
        id=conversation.id,
        participants=participants,
        last_message=last_message,
        unread_count=unread_count,
        created_at=conversation.created_at,
    )
