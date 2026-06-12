"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronDown,
  RefreshCw,
  Send,
  ShieldCheck,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FeedPostCard } from "@/components/post/FeedPostCard";
import { WidgetCard } from "@/components/widgets/WidgetCard";
import { getPost } from "@/lib/api/posts";
import { getComments, createComment, type CommentResponse } from "@/lib/api/posts";
import { useAuthStore } from "@/lib/stores/auth-store";

interface PageProps {
  params: { id: string };
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

export default function PostDetailPage({ params }: PageProps) {
  const postId = params.id;
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [replyText, setReplyText] = useState("");

  /* ── Post data ─────────────────────────────────────────── */
  const {
    data: post,
    isLoading: postLoading,
    isError: postError,
    refetch: refetchPost,
  } = useQuery({
    queryKey: ["post", postId],
    queryFn: () => getPost(postId),
  });

  /* ── Comments ──────────────────────────────────────────── */
  const {
    data: commentsData,
    isLoading: commentsLoading,
  } = useQuery({
    queryKey: ["post", postId, "comments"],
    queryFn: () => getComments(postId),
    enabled: !!post,
  });

  const comments: CommentResponse[] = commentsData?.items ?? [];

  /* ── Create comment mutation ───────────────────────────── */
  const commentMut = useMutation({
    mutationFn: (content: string) => createComment(postId, content),
    onSuccess: () => {
      setReplyText("");
      qc.invalidateQueries({ queryKey: ["post", postId, "comments"] });
      qc.invalidateQueries({ queryKey: ["post", postId] });
      qc.invalidateQueries({ queryKey: ["feed"] });
    },
  });

  function handleReply(e: FormEvent) {
    e.preventDefault();
    if (!replyText.trim()) return;
    commentMut.mutate(replyText.trim());
  }

  /* ── Loading ───────────────────────────────────────────── */
  if (postLoading) {
    return (
      <AppShell topBar={{ breadcrumb: "Post", title: "Loading..." }}>
        <div className="mx-auto max-w-[760px] px-4 py-6 sm:px-8">
          <div className="animate-pulse rounded-md border border-line-1 bg-bg-2 p-[18px]">
            <div className="flex gap-3.5">
              <div className="h-11 w-11 shrink-0 rounded-full bg-bg-3" />
              <div className="flex-1 space-y-3">
                <div className="h-4 w-1/3 rounded bg-bg-3" />
                <div className="h-3 w-1/4 rounded bg-bg-3" />
                <div className="h-20 w-full rounded bg-bg-3" />
                <div className="flex gap-4">
                  <div className="h-3 w-10 rounded bg-bg-3" />
                  <div className="h-3 w-10 rounded bg-bg-3" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  /* ── Error ─────────────────────────────────────────────── */
  if (postError || !post) {
    return (
      <AppShell topBar={{ breadcrumb: "Post", title: "Error" }}>
        <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-danger/10 text-danger">
            <span className="text-xl font-bold">!</span>
          </div>
          <p className="text-[15px] font-medium">Post not found</p>
          <p className="text-[13px] text-fg-3">
            It may have been deleted or you don&rsquo;t have access.
          </p>
          <Button
            variant="ghost"
            size="sm"
            icon={<RefreshCw className="h-3.5 w-3.5" />}
            onClick={() => refetchPost()}
          >
            Retry
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      topBar={{
        breadcrumb: "Post",
        title: `Post by ${post.author.full_name.split(" ")[0]}`,
      }}
      rightRail={
        <WidgetCard title="Replies are public">
          <div className="p-3.5 text-[12.5px] leading-[1.5] text-fg-2">
            Anyone can read replies on this post. Be thoughtful and respectful.
          </div>
        </WidgetCard>
      }
    >
      <div className="mx-auto max-w-[760px] px-4 py-5 sm:px-8 sm:py-6">
        <Link
          href="/"
          className="mb-3 inline-flex items-center gap-2 text-[13px] text-fg-2 hover:text-fg-1"
        >
          <ArrowLeft className="h-4 w-4" /> Back to feed
        </Link>

        <FeedPostCard post={post} expanded />

        {/* Inline reply composer */}
        <Card padded className="mt-3.5">
          <form className="flex gap-3" onSubmit={handleReply}>
            <Avatar
              name={user?.full_name ?? "You"}
              size={36}
            />
            <div className="flex-1">
              <textarea
                placeholder={`Reply to ${post.author.full_name.split(" ")[0]}…`}
                rows={2}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="w-full resize-none bg-transparent py-1.5 text-[14px] leading-[1.5] text-fg-1 placeholder:text-fg-3 focus:outline-none"
              />
              <div className="mt-1.5 flex items-center">
                <div className="flex-1" />
                <Button
                  size="sm"
                  type="submit"
                  disabled={!replyText.trim() || commentMut.isPending}
                >
                  {commentMut.isPending ? "Sending..." : "Reply"}
                </Button>
              </div>
            </div>
          </form>
        </Card>

        {/* Comments header */}
        <div className="flex items-center justify-between px-1 pb-3 pt-6">
          <h3 className="text-[14px] font-semibold">
            {post.comment_count} {post.comment_count === 1 ? "reply" : "replies"}
          </h3>
          <button className="inline-flex items-center gap-1.5 text-[12.5px] text-fg-2 hover:text-fg-1">
            Sort: Most relevant
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Comments loading */}
        {commentsLoading && (
          <Card padded={false}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse flex gap-3 px-4 py-3.5"
                style={{ borderTop: i ? "1px solid var(--line-1)" : "none" }}
              >
                <div className="h-9 w-9 shrink-0 rounded-full bg-bg-3" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/4 rounded bg-bg-3" />
                  <div className="h-10 w-full rounded bg-bg-3" />
                </div>
              </div>
            ))}
          </Card>
        )}

        {/* Comments empty */}
        {!commentsLoading && comments.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-md border border-line-2 bg-bg-2 px-6 py-8 text-center">
            <p className="text-[14px] font-medium">No replies yet</p>
            <p className="text-[13px] text-fg-3">
              Be the first to share your thoughts.
            </p>
          </div>
        )}

        {/* Comments list */}
        {!commentsLoading && comments.length > 0 && (
          <Card padded={false}>
            {comments.map((c, i) => (
              <CommentRow key={c.id} comment={c} index={i} postId={postId} />
            ))}
          </Card>
        )}
      </div>
    </AppShell>
  );
}

function CommentRow({
  comment,
  index,
  isReply,
  postId,
}: {
  comment: CommentResponse;
  index: number;
  isReply?: boolean;
  postId: string;
}) {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [showReplies, setShowReplies] = useState(false);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyContent, setReplyContent] = useState("");

  const replyMut = useMutation({
    mutationFn: (content: string) =>
      createComment(postId, content, comment.id),
    onSuccess: () => {
      setReplyContent("");
      setShowReplyInput(false);
      setShowReplies(true);
      qc.invalidateQueries({ queryKey: ["post", postId, "comments"] });
      qc.invalidateQueries({ queryKey: ["post", postId] });
      qc.invalidateQueries({ queryKey: ["feed"] });
    },
  });

  function handleReplySubmit(e: FormEvent) {
    e.preventDefault();
    if (!replyContent.trim()) return;
    replyMut.mutate(replyContent.trim());
  }

  const author = comment.author;
  const replies = comment.replies ?? [];

  return (
    <>
      <div
        className="relative flex gap-3 px-4 py-3.5"
        style={{
          borderTop: index ? "1px solid var(--line-1)" : "none",
          paddingLeft: isReply ? 56 : 18,
        }}
      >
        {isReply && (
          <div className="absolute bottom-2 left-9 top-0 w-px bg-line-2" />
        )}
        <Avatar name={author.full_name} size={isReply ? 32 : 36} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[13.5px] font-semibold">{author.full_name}</span>
            <ShieldCheck className="h-3 w-3 text-verified" />
            <span className="text-[12px] text-fg-3">
              @{author.username} · {relativeTime(comment.created_at)}
            </span>
          </div>
          <p className="mt-1 text-pretty text-[14px] leading-[1.5]">
            {comment.content}
          </p>
          {!isReply && (
            <div className="mt-1.5 flex items-center gap-3.5 text-[12px] text-fg-3">
              <button
                className="hover:text-fg-1"
                onClick={() => setShowReplyInput((v) => !v)}
              >
                Reply
              </button>
              {comment.reply_count > 0 && !showReplies && (
                <button
                  className="font-medium text-brand-blue hover:underline"
                  onClick={() => setShowReplies(true)}
                >
                  View {comment.reply_count}{" "}
                  {comment.reply_count === 1 ? "reply" : "replies"}
                </button>
              )}
              {comment.reply_count > 0 && showReplies && (
                <button
                  className="font-medium text-brand-blue hover:underline"
                  onClick={() => setShowReplies(false)}
                >
                  Hide replies
                </button>
              )}
            </div>
          )}
          {showReplyInput && (
            <form className="mt-2.5 flex gap-2.5" onSubmit={handleReplySubmit}>
              <Avatar name={user?.full_name ?? "You"} size={28} />
              <div className="flex-1">
                <textarea
                  autoFocus
                  placeholder={`Reply to ${author.full_name.split(" ")[0]}…`}
                  rows={2}
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  className="w-full resize-none rounded-md border border-line-1 bg-bg-2 px-3 py-2 text-[13px] leading-[1.5] text-fg-1 placeholder:text-fg-3 focus:border-brand-purple focus:outline-none"
                />
                <div className="mt-1.5 flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() => {
                      setShowReplyInput(false);
                      setReplyContent("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    type="submit"
                    disabled={!replyContent.trim() || replyMut.isPending}
                  >
                    {replyMut.isPending ? "Sending..." : "Reply"}
                  </Button>
                </div>
                {replyMut.isError && (
                  <p className="mt-1 text-[12px] text-danger">
                    Failed to post reply. Please try again.
                  </p>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
      {showReplies &&
        replies.map((r, ri) => (
          <CommentRow
            key={r.id}
            comment={r}
            index={ri + 1}
            isReply
            postId={postId}
          />
        ))}
    </>
  );
}
