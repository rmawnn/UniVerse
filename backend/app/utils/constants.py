from enum import Enum


class UserRole(str, Enum):
    STUDENT = "student"
    MODERATOR = "moderator"
    ADMIN = "admin"


class VerificationStatus(str, Enum):
    PENDING = "pending"
    UNDER_REVIEW = "under_review"
    VERIFIED = "verified"
    EXPIRED = "expired"
    CANCELLED = "cancelled"
    REJECTED = "rejected"
    SUSPICIOUS = "suspicious"


class CommunityRole(str, Enum):
    ADMIN = "admin"
    MODERATOR = "moderator"
    MEMBER = "member"


class ModerationAction(str, Enum):
    BAN = "ban"
    MUTE = "mute"
    KICK = "kick"


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
