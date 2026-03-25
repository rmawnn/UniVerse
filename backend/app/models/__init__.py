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

# from app.models.verification import VerificationToken
# from app.models.community import Community, CommunityMember
# from app.models.post import Post, Reaction
# from app.models.comment import Comment
# from app.models.message import Conversation, Message
# from app.models.notification import Notification
