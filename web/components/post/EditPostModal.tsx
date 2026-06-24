"use client";

import { useState, type FormEvent } from "react";
import { Loader2, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { updatePost } from "@/lib/api/posts";

interface EditPostModalProps {
  open: boolean;
  onClose: () => void;
  postId: string;
  initialContent: string;
}

export function EditPostModal({ open, onClose, postId, initialContent }: EditPostModalProps) {
  const [content, setContent] = useState(initialContent);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => updatePost(postId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
      onClose();
    },
  });

  if (!open) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    mutation.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-line-1 bg-bg-1 p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Edit post</h3>
          <button onClick={onClose} className="rounded p-1 text-fg-3 hover:bg-bg-3 hover:text-fg-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4">
          <textarea
            className="min-h-[120px] w-full resize-none rounded-lg border border-line-2 bg-bg-2 p-3.5 text-[15px] text-fg-1 placeholder:text-fg-4 focus:border-brand-purple focus:outline-none"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={5000}
            autoFocus
          />
          <div className="mt-1 text-right text-[12px] text-fg-4">
            {content.length}/5000
          </div>

          {mutation.isError && (
            <p className="mt-2 text-[13px] text-danger">
              Failed to update post. Please try again.
            </p>
          )}

          <div className="mt-4 flex justify-end gap-2.5">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!content.trim() || content === initialContent || mutation.isPending}
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
