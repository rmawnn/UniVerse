"""Unit tests for app.utils.constants — enum definitions."""

from app.utils.constants import (
    CommunityRole,
    NotificationType,
    PostType,
    UserRole,
    VerificationStatus,
)


class TestUserRole:
    def test_values(self):
        assert UserRole.STUDENT.value == "student"
        assert UserRole.MODERATOR.value == "moderator"
        assert UserRole.ADMIN.value == "admin"

    def test_is_str_enum(self):
        assert isinstance(UserRole.STUDENT, str)


class TestVerificationStatus:
    def test_values(self):
        assert VerificationStatus.PENDING.value == "pending"
        assert VerificationStatus.VERIFIED.value == "verified"
        assert VerificationStatus.REJECTED.value == "rejected"
        assert VerificationStatus.SUSPICIOUS.value == "suspicious"
        assert VerificationStatus.UNDER_REVIEW.value == "under_review"
        assert VerificationStatus.EXPIRED.value == "expired"
        assert VerificationStatus.CANCELLED.value == "cancelled"

    def test_all_seven_members(self):
        assert len(VerificationStatus) == 7


class TestCommunityRole:
    def test_values(self):
        assert CommunityRole.ADMIN.value == "admin"
        assert CommunityRole.MEMBER.value == "member"


class TestPostType:
    def test_values(self):
        assert PostType.TEXT.value == "text"
        assert PostType.IMAGE.value == "image"
        assert PostType.POLL.value == "poll"
        assert PostType.EVENT.value == "event"


class TestNotificationType:
    def test_values(self):
        assert NotificationType.LIKE.value == "like"
        assert NotificationType.COMMENT.value == "comment"
        assert NotificationType.FOLLOW.value == "follow"
        assert NotificationType.MENTION.value == "mention"
        assert NotificationType.COMMUNITY_INVITE.value == "community_invite"
        assert NotificationType.VERIFICATION.value == "verification"
