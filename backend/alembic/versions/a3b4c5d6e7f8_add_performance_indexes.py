"""add performance indexes for production queries

Revision ID: a3b4c5d6e7f8
Revises: f2a3b4c5d6e7
Create Date: 2026-06-23 12:00:00.000000
"""

from alembic import op

revision = "a3b4c5d6e7f8"
down_revision = "f2a3b4c5d6e7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_posts_is_deleted ON posts (is_deleted) WHERE is_deleted = false")
    op.execute("CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_messages_is_deleted ON messages (is_deleted) WHERE is_deleted = false")
    op.execute("CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_comments_is_deleted ON comments (is_deleted) WHERE is_deleted = false")
    op.execute("CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_job_posts_is_active ON job_posts (is_active) WHERE is_active = true")
    op.execute("CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_communities_is_public ON communities (is_public) WHERE is_public = true")

    op.execute("CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_posts_community_active_recent ON posts (community_id, created_at DESC) WHERE is_deleted = false")
    op.execute("CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_posts_author_active_recent ON posts (author_id, created_at DESC) WHERE is_deleted = false")
    op.execute("CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_messages_conv_active_recent ON messages (conversation_id, created_at DESC) WHERE is_deleted = false")
    op.execute("CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_notifications_user_unread ON notifications (user_id, created_at DESC) WHERE is_read = false")
    op.execute("CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_notifications_dedup ON notifications (user_id, actor_id, type, reference_id) WHERE is_read = false")

    op.execute("CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_communities_created_by ON communities (created_by)")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_communities_created_by")
    op.execute("DROP INDEX IF EXISTS ix_notifications_dedup")
    op.execute("DROP INDEX IF EXISTS ix_notifications_user_unread")
    op.execute("DROP INDEX IF EXISTS ix_messages_conv_active_recent")
    op.execute("DROP INDEX IF EXISTS ix_posts_author_active_recent")
    op.execute("DROP INDEX IF EXISTS ix_posts_community_active_recent")
    op.execute("DROP INDEX IF EXISTS ix_communities_is_public")
    op.execute("DROP INDEX IF EXISTS ix_job_posts_is_active")
    op.execute("DROP INDEX IF EXISTS ix_comments_is_deleted")
    op.execute("DROP INDEX IF EXISTS ix_messages_is_deleted")
    op.execute("DROP INDEX IF EXISTS ix_posts_is_deleted")
