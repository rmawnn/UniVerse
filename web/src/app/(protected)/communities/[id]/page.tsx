"use client";

import { useState, use, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  useQuery,
  useMutation,
  useInfiniteQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  getCommunity,
  joinCommunity,
  updateCommunity,
  deleteCommunity,
} from "@/api/communities";
import { listCommunityPosts, createPost } from "@/api/posts";
import PostCard from "@/components/post/PostCard";
import { PostSkeleton, SkeletonList } from "@/components/skeletons/Skeletons";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import type { PaginatedResponse, PostResponse } from "@/types/api";

const PAGE_SIZE = 15;

export default function CommunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const qc = useQueryClient();
  const communityKey = ["community", id] as const;
  const postsKey = ["community-posts", id] as const;

  const communityQuery = useQuery({
    queryKey: communityKey,
    queryFn: () => getCommunity(id),
  });

  const postsQuery = useInfiniteQuery<PaginatedResponse<PostResponse>>({
    queryKey: [...postsKey],
    queryFn: ({ pageParam = 1 }) =>
      listCommunityPosts(id, {
        page: pageParam as number,
        page_size: PAGE_SIZE,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.total_pages ? lastPage.page + 1 : undefined,
  });

  const posts = useMemo(
    () => postsQuery.data?.pages.flatMap((p) => p.items) ?? [],
    [postsQuery.data]
  );

  const sentinelRef = useInfiniteScroll(
    () => {
      if (postsQuery.hasNextPage && !postsQuery.isFetchingNextPage) {
        postsQuery.fetchNextPage();
      }
    },
    !!postsQuery.hasNextPage && !postsQuery.isFetchingNextPage
  );

  const joinMutation = useMutation({
    mutationFn: () => joinCommunity(id),
    onSuccess: (data) => {
      qc.setQueryData(communityKey, data);
      qc.invalidateQueries({ queryKey: ["communities"] });
    },
  });

  // ── Post composer state ───────────────────────────────────
  const [showComposer, setShowComposer] = useState(false);
  const [draft, setDraft] = useState("");
  const [composeError, setComposeError] = useState<string | null>(null);

  const createPostMutation = useMutation({
    mutationFn: () => createPost(id, { content: draft.trim() }),
    onSuccess: () => {
      setDraft("");
      setShowComposer(false);
      setComposeError(null);
      qc.invalidateQueries({ queryKey: [...postsKey] });
      qc.invalidateQueries({ queryKey: ["feed"] });
    },
    onError: (err: { message?: string }) => {
      setComposeError(err?.message ?? "Failed to create post");
    },
  });

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || createPostMutation.isPending) return;
    createPostMutation.mutate();
  };

  // ── Edit state ────────────────────────────────────────────
  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editPublic, setEditPublic] = useState(true);
  const [editError, setEditError] = useState<string | null>(null);

  const openEdit = () => {
    if (!communityQuery.data) return;
    setEditName(communityQuery.data.name);
    setEditDesc(communityQuery.data.description ?? "");
    setEditPublic(communityQuery.data.is_public);
    setEditError(null);
    setShowEdit(true);
  };

  const editNameError =
    editName.length > 0 && editName.trim().length < 2
      ? "Name must be at least 2 characters"
      : null;

  const editMutation = useMutation({
    mutationFn: () =>
      updateCommunity(id, {
        name: editName.trim(),
        description: editDesc.trim() || undefined,
        is_public: editPublic,
      }),
    onSuccess: (data) => {
      qc.setQueryData(communityKey, data);
      qc.invalidateQueries({ queryKey: ["communities"] });
      setShowEdit(false);
    },
    onError: (err: { message?: string }) => {
      setEditError(err?.message ?? "Failed to update community");
    },
  });

  const canSaveEdit =
    editName.trim().length >= 2 && !editNameError && !editMutation.isPending;

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSaveEdit) return;
    setEditError(null);
    editMutation.mutate();
  };

  // ── Delete state ──────────────────────────────────────────
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: () => deleteCommunity(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["communities"] });
      router.push("/communities");
    },
    onError: (err: { message?: string }) => {
      setDeleteError(err?.message ?? "Failed to delete community");
    },
  });

  // ── Loading / error ───────────────────────────────────────
  if (communityQuery.isLoading) {
    return <p style={styles.muted}>Loading community...</p>;
  }
  if (communityQuery.isError || !communityQuery.data) {
    return <p style={styles.error}>Could not load community.</p>;
  }

  const community = communityQuery.data;
  const isAdmin = community.my_role === "admin";

  return (
    <div>
      {/* ── Header ─────────────────────────────────────────── */}
      <section style={styles.header}>
        <div style={styles.headerTop}>
          <div>
            <h2 style={styles.name}>{community.name}</h2>
            <p style={styles.meta}>
              {community.member_count} members
              {!community.is_public && " · Private"}
            </p>
          </div>
          <div style={styles.headerActions}>
            {isAdmin && (
              <>
                <button
                  type="button"
                  onClick={openEdit}
                  style={styles.editBtn}
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteError(null);
                    setShowDeleteConfirm(true);
                  }}
                  style={styles.deleteBtn}
                >
                  Delete
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => joinMutation.mutate()}
              disabled={community.is_member || joinMutation.isPending}
              style={{
                ...styles.joinBtn,
                background: community.is_member ? "#e5e7eb" : "#6C63FF",
                color: community.is_member ? "#666" : "#fff",
                cursor: community.is_member ? "default" : "pointer",
              }}
            >
              {community.is_member
                ? "Joined"
                : joinMutation.isPending
                  ? "Joining..."
                  : "Join"}
            </button>
          </div>
        </div>
        {community.description && (
          <p style={styles.description}>{community.description}</p>
        )}
      </section>

      {/* ── Edit modal ─────────────────────────────────────── */}
      {showEdit && (
        <div style={styles.overlay} onClick={() => setShowEdit(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Edit Community</h3>
            <form onSubmit={handleEditSubmit}>
              <div style={styles.field}>
                <label style={styles.label}>Name *</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => {
                    setEditName(e.target.value);
                    setEditError(null);
                  }}
                  style={styles.input}
                  disabled={editMutation.isPending}
                  maxLength={100}
                  autoFocus
                />
                {editNameError && (
                  <p style={styles.fieldError}>{editNameError}</p>
                )}
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Description</label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={3}
                  style={styles.textarea}
                  disabled={editMutation.isPending}
                  maxLength={1000}
                />
                <span style={styles.charCount}>{editDesc.length}/1000</span>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Visibility</label>
                <div style={styles.toggleRow}>
                  <button
                    type="button"
                    onClick={() => setEditPublic(true)}
                    style={{
                      ...styles.toggleBtn,
                      ...(editPublic ? styles.toggleActive : {}),
                    }}
                    disabled={editMutation.isPending}
                  >
                    Public
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditPublic(false)}
                    style={{
                      ...styles.toggleBtn,
                      ...(!editPublic ? styles.toggleActive : {}),
                    }}
                    disabled={editMutation.isPending}
                  >
                    Private
                  </button>
                </div>
              </div>

              {editError && <p style={styles.formError}>{editError}</p>}

              <div style={styles.modalFooter}>
                <button
                  type="button"
                  onClick={() => setShowEdit(false)}
                  style={styles.cancelBtn}
                  disabled={editMutation.isPending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!canSaveEdit}
                  style={{
                    ...styles.submitBtn,
                    opacity: canSaveEdit ? 1 : 0.5,
                  }}
                >
                  {editMutation.isPending ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete confirmation ────────────────────────────── */}
      {showDeleteConfirm && (
        <div
          style={styles.overlay}
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Delete Community</h3>
            <p style={styles.confirmText}>
              Are you sure you want to delete <strong>{community.name}</strong>?
              This action cannot be undone. All posts and members will be
              removed.
            </p>

            {deleteError && <p style={styles.formError}>{deleteError}</p>}

            <div style={styles.modalFooter}>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                style={styles.cancelBtn}
                disabled={deleteMutation.isPending}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                style={styles.dangerBtn}
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Post composer ──────────────────────────────────── */}
      {community.is_member && (
        <section style={styles.composerSection}>
          {!showComposer ? (
            <button
              type="button"
              onClick={() => setShowComposer(true)}
              style={styles.composerTrigger}
            >
              + Create Post
            </button>
          ) : (
            <form onSubmit={handleCreatePost} style={styles.composerForm}>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="What's on your mind?"
                rows={4}
                style={styles.textarea}
                disabled={createPostMutation.isPending}
                autoFocus
              />
              {composeError && <p style={styles.formError}>{composeError}</p>}
              <div style={styles.composerFooter}>
                <button
                  type="button"
                  onClick={() => {
                    setShowComposer(false);
                    setDraft("");
                    setComposeError(null);
                  }}
                  style={styles.cancelBtn}
                  disabled={createPostMutation.isPending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!draft.trim() || createPostMutation.isPending}
                  style={{
                    ...styles.submitBtn,
                    opacity:
                      !draft.trim() || createPostMutation.isPending ? 0.5 : 1,
                  }}
                >
                  {createPostMutation.isPending ? "Posting..." : "Post"}
                </button>
              </div>
            </form>
          )}
        </section>
      )}

      {/* ── Posts list ─────────────────────────────────────── */}
      <h3 style={styles.subheading}>Posts</h3>

      {postsQuery.isLoading && (
        <SkeletonList count={3} Component={PostSkeleton} />
      )}
      {postsQuery.isError && <p style={styles.error}>Could not load posts.</p>}
      {!postsQuery.isLoading && posts.length === 0 && (
        <p style={styles.muted}>No posts yet.</p>
      )}

      <div style={styles.list}>
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            invalidateKeys={[[...postsKey], ["feed"]]}
          />
        ))}
      </div>

      {postsQuery.hasNextPage && (
        <div ref={sentinelRef} style={{ marginTop: 12 }}>
          {postsQuery.isFetchingNextPage && <PostSkeleton />}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    background: "#fff",
    border: "1px solid #eee",
    borderRadius: 10,
    padding: 20,
    marginBottom: 16,
  },
  headerTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  headerActions: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  name: { fontSize: 22, fontWeight: 700, margin: 0 },
  meta: { fontSize: 13, color: "#999", margin: "4px 0 0" },
  description: {
    fontSize: 14,
    color: "#555",
    lineHeight: 1.5,
    margin: "12px 0 0",
  },
  joinBtn: {
    border: "none",
    borderRadius: 6,
    padding: "8px 18px",
    fontSize: 14,
    fontWeight: 500,
  },
  editBtn: {
    background: "none",
    border: "1px solid #ddd",
    borderRadius: 6,
    padding: "8px 14px",
    fontSize: 13,
    cursor: "pointer",
    color: "#555",
  },
  deleteBtn: {
    background: "none",
    border: "1px solid #fed7d7",
    borderRadius: 6,
    padding: "8px 14px",
    fontSize: 13,
    cursor: "pointer",
    color: "#c53030",
  },
  // ── Modal / overlay ────────────────────────────────────────
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    background: "#fff",
    borderRadius: 12,
    padding: 24,
    width: "100%",
    maxWidth: 480,
    margin: "0 16px",
    maxHeight: "90vh",
    overflowY: "auto",
  },
  modalTitle: { fontSize: 18, fontWeight: 700, margin: "0 0 16px" },
  modalFooter: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 16,
  },
  confirmText: {
    fontSize: 14,
    color: "#444",
    lineHeight: 1.6,
    margin: "0 0 8px",
  },
  // ── Form fields ────────────────────────────────────────────
  field: { marginBottom: 16 },
  label: {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    color: "#555",
    marginBottom: 6,
  },
  input: {
    width: "100%",
    padding: "10px 14px",
    border: "1px solid #ddd",
    borderRadius: 8,
    fontSize: 14,
    outline: "none",
  },
  textarea: {
    width: "100%",
    padding: "10px 14px",
    border: "1px solid #ddd",
    borderRadius: 8,
    fontSize: 14,
    resize: "vertical",
    outline: "none",
  },
  charCount: {
    display: "block",
    textAlign: "right",
    fontSize: 11,
    color: "#bbb",
    marginTop: 4,
  },
  fieldError: { color: "#c53030", fontSize: 12, marginTop: 4 },
  toggleRow: { display: "flex", gap: 8 },
  toggleBtn: {
    flex: 1,
    padding: "10px 0",
    border: "1px solid #ddd",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    background: "#fff",
    color: "#666",
    cursor: "pointer",
  },
  toggleActive: {
    background: "#6C63FF",
    color: "#fff",
    borderColor: "#6C63FF",
  },
  // ── Buttons ────────────────────────────────────────────────
  cancelBtn: {
    background: "none",
    border: "1px solid #ddd",
    borderRadius: 6,
    padding: "8px 14px",
    fontSize: 14,
    cursor: "pointer",
    color: "#666",
  },
  submitBtn: {
    background: "#6C63FF",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    padding: "8px 16px",
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
  },
  dangerBtn: {
    background: "#c53030",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    padding: "8px 16px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  formError: { color: "#c53030", fontSize: 13, margin: "8px 0 0" },
  // ── Composer ───────────────────────────────────────────────
  composerSection: { marginBottom: 16 },
  composerTrigger: {
    width: "100%",
    background: "#fff",
    border: "1px dashed #ccc",
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: "#666",
    cursor: "pointer",
  },
  composerForm: {
    background: "#fff",
    border: "1px solid #eee",
    borderRadius: 10,
    padding: 12,
  },
  composerFooter: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 8,
  },
  // ── Posts ───────────────────────────────────────────────────
  subheading: { fontSize: 17, fontWeight: 600, margin: "8px 0 12px" },
  muted: { color: "#999", fontSize: 14 },
  error: { color: "#c53030", fontSize: 14 },
  list: { display: "flex", flexDirection: "column", gap: 12 },
};
