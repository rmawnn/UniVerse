-- Idempotent: create saved_collections + saved_collection_items tables
-- Run via Supabase SQL editor or psql

CREATE TABLE IF NOT EXISTS saved_collections (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id),
    name        VARCHAR(100) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_saved_collections_user_id
    ON saved_collections (user_id);

CREATE TABLE IF NOT EXISTS saved_collection_items (
    collection_id UUID NOT NULL REFERENCES saved_collections(id) ON DELETE CASCADE,
    post_id       UUID NOT NULL REFERENCES posts(id),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (collection_id, post_id)
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_collection_item'
    ) THEN
        ALTER TABLE saved_collection_items
            ADD CONSTRAINT uq_collection_item UNIQUE (collection_id, post_id);
    END IF;
END
$$;
