"use client";

import { useState, useRef, useEffect } from "react";
import { Flag, MoreHorizontal, Pencil, Share2, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ReportModal } from "./ReportModal";
import { EditPostModal } from "./EditPostModal";
import { deletePost } from "@/lib/api/posts";
import { useAuthStore } from "@/lib/stores/auth-store";

interface PostMenuProps {
  postId: string;
  authorId: string;
  content: string;
}

export function PostMenu({ postId, authorId, content }: PostMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((s) => s.user?.id);

  const isOwner = currentUserId === authorId;

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setConfirmDelete(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const deleteMutation = useMutation({
    mutationFn: () => deletePost(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
      setMenuOpen(false);
      setConfirmDelete(false);
    },
  });

  const handleCopyLink = async () => {
    setMenuOpen(false);
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/posts/${postId}`);
    } catch {}
  };

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          className="ml-auto rounded p-1 text-fg-3 hover:bg-bg-3 hover:text-fg-1"
          aria-label="Post menu"
          type="button"
          onClick={() => { setMenuOpen((v) => !v); setConfirmDelete(false); }}
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-full z-20 mt-1 w-48 overflow-hidden rounded-lg border border-line-1 bg-bg-2 shadow-xl">
            <button
              onClick={handleCopyLink}
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-fg-2 hover:bg-bg-3 hover:text-fg-1"
            >
              <Share2 className="h-3.5 w-3.5" /> Copy link
            </button>
            {isOwner && (
              <>
                <button
                  onClick={() => { setMenuOpen(false); setEditOpen(true); }}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-fg-2 hover:bg-bg-3 hover:text-fg-1"
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit post
                </button>
                {!confirmDelete ? (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-danger hover:bg-bg-3"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete post
                  </button>
                ) : (
                  <button
                    onClick={() => deleteMutation.mutate()}
                    disabled={deleteMutation.isPending}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-[13px] font-semibold text-danger hover:bg-danger/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {deleteMutation.isPending ? "Deleting..." : "Confirm delete"}
                  </button>
                )}
              </>
            )}
            {!isOwner && (
              <button
                onClick={() => { setMenuOpen(false); setReportOpen(true); }}
                className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-danger hover:bg-bg-3"
              >
                <Flag className="h-3.5 w-3.5" /> Report post
              </button>
            )}
          </div>
        )}
      </div>
      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        contentId={postId}
      />
      <EditPostModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        postId={postId}
        initialContent={content}
      />
    </>
  );
}
