from enum import Enum


class UserRole(str, Enum):
    STUDENT = "student"
    MODERATOR = "moderator"
    ADMIN = "admin"


class VerificationStatus(str, Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"


class PostType(str, Enum):
    TEXT = "text"
    IMAGE = "image"
    POLL = "poll"
    EVENT = "event"


class NotificationType(str, Enum):
    LIKE = "like"
    COMMENT = "comment"
    FOLLOW = "follow"
    MENTION = "mention"
    COMMUNITY_INVITE = "community_invite"
    VERIFICATION = "verification"
