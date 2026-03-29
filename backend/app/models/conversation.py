from app.models.base import BaseModel


class Conversation(BaseModel):
    """
    A 1-to-1 direct message conversation.

    Participants are tracked via ConversationParticipant (junction table).
    The Conversation row itself is lightweight — just an id + timestamps.
    """

    __tablename__ = "conversations"
