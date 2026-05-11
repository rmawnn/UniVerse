# Central model registry.
# Import every model here so that:
#   1. Alembic's env.py can discover all tables via `import app.models`
#   2. Base.metadata contains every table when autogenerate runs
#
# IMPORTANT: University must be imported before User because
# User.university_id has a FK to universities.id.
# Uncomment each line as you implement the corresponding model.

from app.models.university import University  # noqa: F401
from app.models.user import User  # noqa: F401
from app.models.verification_request import VerificationRequest  # noqa: F401
from app.models.community import Community, CommunityMember  # noqa: F401
from app.models.post import Post  # noqa: F401
from app.models.comment import Comment  # noqa: F401
from app.models.post_like import PostLike  # noqa: F401
from app.models.conversation import Conversation  # noqa: F401
from app.models.conversation_participant import ConversationParticipant  # noqa: F401
from app.models.message import Message  # noqa: F401
from app.models.notification import Notification  # noqa: F401
from app.models.user_follow import UserFollow  # noqa: F401
from app.models.story import Story  # noqa: F401
from app.models.saved_post import SavedPost  # noqa: F401
