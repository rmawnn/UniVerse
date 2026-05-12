"use client";

import { useMemo, useState } from "react";
import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listSavedPosts,
  listCollections,
  createCollection,
  getCollectionPosts,
  addPostToCollection,
  removePostFromCollection,
} from "@/api/posts";
import PostCard from "@/components/post/PostCard";
import { PostSkeleton, SkeletonList } from "@/components/skeletons/Skeletons";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import type { PaginatedResponse, PostResponse, SavedCollectionResponse } from "@/types/api";

const SAVED_KEY = ["saved-posts"] as const;
const COLLECTIONS_KEY = ["saved-collections"] as const;
const PAGE_SIZE = 15;

type View =
  | { kind: "all" }
  | { kind: "collection"; id: string; name: string };

export default function SavedPostsPage() {
  const qc = useQueryClient();
  const [view, setView] = useState<View>({ kind: "all" });
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");

  // ── Collections list ────────────────────────────────────
  const {
    data: collections,
    isLoading: collectionsLoading,
  } = useQuery<SavedCollectionResponse[]>({
    queryKey: [...COLLECTIONS_KEY],
    queryFn: listCollections,
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => createCollection({ name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...COLLECTIONS_KEY] });
      setNewName("");
      setShowCreate(false);
    },
  });

  const handleCreate = () => {
    const trimmed = newName.trim();
    if (!trimmed || createMutation.isPending) return;
    createMutation.mutate(trimmed);
  };

  return (
    <div>
      <h2 style={styles.heading}>Saved</h2>

      {/* ── Tab-like navigation ── */}
      <div style={styles.tabs}>
        <button
          style={{
            ...styles.tab,
            ...(view.kind === "all" ? styles.tabActive : {}),
          }}
          onClick={() => setView({ kind: "all" })}
        >
          All Saved
        </button>

        {collectionsLoading && (
          <span style={styles.tabLoading}>...</span>
        )}

        {collections?.map((c) => (
          <button
            key={c.id}
            style={{
              ...styles.tab,
              ...(view.kind === "collection" && view.id === c.id
                ? styles.tabActive
                : {}),
            }}
            onClick={() =>
              setView({ kind: "collection", id: c.id, name: c.name })
            }
          >
            {c.name}
            <span style={styles.tabCount}>{c.post_count}</span>
          </button>
        ))}

        <button
          style={styles.addTab}
          onClick={() => setShowCreate((v) => !v)}
          title="New collection"
        >
          +
        </button>
      </div>

      {/* ── Create collection inline form ── */}
      {showCreate && (
        <div style={styles.createRow}>
          <input
            type="text"
            placeholder="Collection name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            style={styles.createInput}
            maxLength={100}
            autoFocus
          />
          <button
            onClick={handleCreate}
            disabled={!newName.trim() || createMutation.isPending}
            style={styles.createBtn}
          >
            {createMutation.isPending ? "..." : "Create"}
          </button>
          <button
            onClick={() => { setShowCreate(false); setNewName(""); }}
            style={styles.cancelBtn}
          >
            Cancel
          </button>
        </div>
      )}

      {/* ── Content ── */}
      {view.kind === "all" ? (
        <AllSavedPosts collections={collections ?? []} />
      ) : (
        <CollectionPosts
          key={view.id}
          collectionId={view.id}
          collectionName={view.name}
        />
      )}
    </div>
  );
}

/* ── All saved posts ───────────────────────────────────────── */

function AllSavedPosts({
  collections,
}: {
  collections: SavedCollectionResponse[];
}) {
  const qc = useQueryClient();
  const [openPicker, setOpenPicker] = useState<string | null>(null);

  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery<PaginatedResponse<PostResponse>>({
    queryKey: [...SAVED_KEY],
    queryFn: ({ pageParam = 1 }) =>
      listSavedPosts({ page: pageParam as number, page_size: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.total_pages ? lastPage.page + 1 : undefined,
  });

  const posts = useMemo(
    () => data?.pages.flatMap((p) => p.items) ?? [],
    [data]
  );

  const sentinelRef = useInfiniteScroll(
    () => {
      if (hasNextPage && !isFetchingNextPage) fetchNextPage();
    },
    !!hasNextPage && !isFetchingNextPage
  );

  const addMutation = useMutation({
    mutationFn: ({ collectionId, postId }: { collectionId: string; postId: string }) =>
      addPostToCollection(collectionId, postId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...COLLECTIONS_KEY] });
      setOpenPicker(null);
    },
  });

  return (
    <>
      {isLoading && <SkeletonList count={4} Component={PostSkeleton} />}

      {isError && (
        <div style={styles.error}>
          <span>Could not load saved posts.</span>
          <button onClick={() => refetch()} style={styles.retry}>
            Retry
          </button>
        </div>
      )}

      {!isLoading && !isError && posts.length === 0 && (
        <div style={styles.empty}>
          <span style={styles.emptyIcon}>{"🔖"}</span>
          <p style={styles.emptyTitle}>No saved posts yet</p>
          <p style={styles.emptyHint}>
            Tap the bookmark icon on any post to save it for later.
          </p>
        </div>
      )}

      <div style={styles.list}>
        {posts.map((post) => (
          <div key={post.id} style={{ position: "relative" }}>
            <PostCard
              post={post}
              invalidateKeys={[[...SAVED_KEY], ["feed"]]}
            />

            {/* Add-to-collection button */}
            {collections.length > 0 && (
              <div style={styles.addToCollWrap}>
                <button
                  style={styles.addToCollBtn}
                  title="Add to collection"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenPicker(openPicker === post.id ? null : post.id);
                  }}
                >
                  +
                </button>

                {openPicker === post.id && (
                  <div style={styles.collPicker}>
                    {collections.map((c) => (
                      <button
                        key={c.id}
                        style={styles.collPickerItem}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!addMutation.isPending) {
                            addMutation.mutate({
                              collectionId: c.id,
                              postId: post.id,
                            });
                          }
                        }}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {hasNextPage && (
        <div ref={sentinelRef} style={styles.sentinel}>
          {isFetchingNextPage && <PostSkeleton />}
        </div>
      )}

      {!hasNextPage && posts.length > 0 && (
        <p style={styles.end}>No more saved posts</p>
      )}
    </>
  );
}

/* ── Collection posts view ─────────────────────────────────── */

function CollectionPosts({
  collectionId,
  collectionName,
}: {
  collectionId: string;
  collectionName: string;
}) {
  const qc = useQueryClient();
  const collectionKey = ["collection-posts", collectionId] as const;

  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery<PaginatedResponse<PostResponse>>({
    queryKey: [...collectionKey],
    queryFn: ({ pageParam = 1 }) =>
      getCollectionPosts(collectionId, {
        page: pageParam as number,
        page_size: PAGE_SIZE,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.total_pages ? lastPage.page + 1 : undefined,
  });

  const posts = useMemo(
    () => data?.pages.flatMap((p) => p.items) ?? [],
    [data]
  );

  const sentinelRef = useInfiniteScroll(
    () => {
      if (hasNextPage && !isFetchingNextPage) fetchNextPage();
    },
    !!hasNextPage && !isFetchingNextPage
  );

  const removeMutation = useMutation({
    mutationFn: (postId: string) =>
      removePostFromCollection(collectionId, postId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...collectionKey] });
      qc.invalidateQueries({ queryKey: [...COLLECTIONS_KEY] });
    },
  });

  return (
    <>
      <div style={styles.collHeader}>
        <h3 style={styles.collTitle}>{collectionName}</h3>
      </div>

      {isLoading && <SkeletonList count={3} Component={PostSkeleton} />}

      {isError && (
        <div style={styles.error}>
          <span>Could not load collection.</span>
          <button onClick={() => refetch()} style={styles.retry}>
            Retry
          </button>
        </div>
      )}

      {!isLoading && !isError && posts.length === 0 && (
        <div style={styles.empty}>
          <span style={styles.emptyIcon}>{"📂"}</span>
          <p style={styles.emptyTitle}>Collection is empty</p>
          <p style={styles.emptyHint}>
            Add posts from the &ldquo;All Saved&rdquo; view.
          </p>
        </div>
      )}

      <div style={styles.list}>
        {posts.map((post) => (
          <div key={post.id} style={{ position: "relative" }}>
            <PostCard
              post={post}
              invalidateKeys={[[...collectionKey], [...SAVED_KEY], ["feed"]]}
            />
            <button
              style={styles.removeBtn}
              title="Remove from collection"
              onClick={(e) => {
                e.stopPropagation();
                if (!removeMutation.isPending) removeMutation.mutate(post.id);
              }}
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      {hasNextPage && (
        <div ref={sentinelRef} style={styles.sentinel}>
          {isFetchingNextPage && <PostSkeleton />}
        </div>
      )}

      {!hasNextPage && posts.length > 0 && (
        <p style={styles.end}>End of collection</p>
      )}
    </>
  );
}

/* ── Styles ───────────────────────────────────────────────── */

const styles: Record<string, React.CSSProperties> = {
  heading: { fontSize: 22, fontWeight: 700, marginBottom: 16 },
  list: { display: "flex", flexDirection: "column", gap: 12 },

  /* Tabs */
  tabs: {
    display: "flex",
    gap: 6,
    marginBottom: 16,
    flexWrap: "wrap",
    alignItems: "center",
  },
  tab: {
    padding: "6px 14px",
    borderRadius: 20,
    border: "1px solid #ddd",
    background: "#fff",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    color: "#555",
    display: "flex",
    alignItems: "center",
    gap: 6,
    transition: "all 0.15s",
  },
  tabActive: {
    background: "#6C63FF",
    color: "#fff",
    borderColor: "#6C63FF",
  },
  tabCount: {
    fontSize: 11,
    opacity: 0.7,
  },
  tabLoading: {
    fontSize: 13,
    color: "#aaa",
    padding: "6px 8px",
  },
  addTab: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    border: "1px dashed #ccc",
    background: "#fafafa",
    fontSize: 18,
    cursor: "pointer",
    color: "#999",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
  },

  /* Create form */
  createRow: {
    display: "flex",
    gap: 8,
    marginBottom: 16,
    alignItems: "center",
  },
  createInput: {
    flex: 1,
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #ddd",
    fontSize: 14,
    outline: "none",
  },
  createBtn: {
    padding: "8px 16px",
    borderRadius: 8,
    border: "none",
    background: "#6C63FF",
    color: "#fff",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  cancelBtn: {
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #ddd",
    background: "#fff",
    fontSize: 13,
    cursor: "pointer",
    color: "#666",
  },

  /* Collection header */
  collHeader: {
    marginBottom: 12,
  },
  collTitle: {
    fontSize: 17,
    fontWeight: 600,
    color: "#333",
    margin: 0,
  },

  /* Add to collection (All Saved view) */
  addToCollWrap: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 2,
  },
  addToCollBtn: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    border: "1px solid #ddd",
    background: "#fff",
    fontSize: 16,
    cursor: "pointer",
    color: "#6C63FF",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
  },
  collPicker: {
    position: "absolute",
    top: 32,
    right: 0,
    background: "#fff",
    border: "1px solid #eee",
    borderRadius: 8,
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    minWidth: 160,
    padding: 4,
    zIndex: 10,
  },
  collPickerItem: {
    display: "block",
    width: "100%",
    padding: "8px 12px",
    border: "none",
    background: "none",
    textAlign: "left" as const,
    fontSize: 13,
    cursor: "pointer",
    borderRadius: 6,
    color: "#333",
  },

  /* Remove button */
  removeBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    padding: "4px 10px",
    borderRadius: 6,
    border: "1px solid #fed7d7",
    background: "#fff5f5",
    color: "#c53030",
    fontSize: 11,
    fontWeight: 500,
    cursor: "pointer",
    zIndex: 2,
  },

  /* States */
  empty: {
    textAlign: "center",
    padding: "48px 24px",
    background: "#fafafa",
    borderRadius: 12,
    border: "1px dashed #ddd",
  },
  emptyIcon: { fontSize: 40, display: "block", marginBottom: 8 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: "#333",
    margin: "0 0 4px",
  },
  emptyHint: { color: "#888", fontSize: 14, margin: "0 0 16px" },
  sentinel: { marginTop: 12, minHeight: 40 },
  end: {
    textAlign: "center",
    color: "#bbb",
    fontSize: 13,
    padding: "16px 0",
  },
  error: {
    background: "#fff5f5",
    border: "1px solid #fed7d7",
    color: "#c53030",
    padding: 12,
    borderRadius: 8,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  retry: {
    background: "#fff",
    border: "1px solid #fed7d7",
    color: "#c53030",
    borderRadius: 6,
    padding: "4px 12px",
    fontSize: 13,
    cursor: "pointer",
  },
};
