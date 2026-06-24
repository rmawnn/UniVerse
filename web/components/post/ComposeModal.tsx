"use client";

import { useRef, useState, type FormEvent } from "react";
import {
  Calendar,
  ChevronDown,
  Globe,
  Hash,
  ImageIcon,
  Info,
  Loader2,
  MapPin,
  Smile,
  Sticker,
  X,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { CommunityIcon } from "@/components/community/CommunityIcon";
import { getJoinedCommunities } from "@/lib/api/communities";
import { createPost, uploadPostImage } from "@/lib/api/posts";
import { useAuthStore } from "@/lib/stores/auth-store";
import { cn } from "@/lib/utils";

const MAX_LEN = 5000;

const TOOLBAR = [
  { key: "photo", icon: ImageIcon, label: "Photo" },
  { key: "gif", icon: Sticker, label: "GIF" },
  { key: "poll", icon: Smile, label: "Poll" },
  { key: "event", icon: Calendar, label: "Schedule" },
  { key: "place", icon: MapPin, label: "Place" },
] as const;

interface ComposeModalProps {
  open: boolean;
  onClose: () => void;
  defaultCommunitySlug?: string;
}

export function ComposeModal({
  open,
  onClose,
  defaultCommunitySlug,
}: ComposeModalProps) {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: communities, isLoading: communitiesLoading } = useQuery({
    queryKey: ["communities", "joined"],
    queryFn: getJoinedCommunities,
    enabled: open && !!user,
    staleTime: 5 * 60 * 1000,
  });

  const [text, setText] = useState("");
  const [communityId, setCommunityId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const postMutation = useMutation({
    mutationFn: async () => {
      if (!resolvedCommunityId) throw new Error("Select a community first");
      return createPost(resolvedCommunityId, {
        content: text.trim(),
        image_url: imageUrl,
        post_type: imageUrl ? "image" : "text",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["explore"] });
      queryClient.invalidateQueries({ queryKey: ["trending"] });
      setText("");
      setImageUrl(null);
      setImagePreview(null);
      setCommunityId(null);
      setError(null);
      onClose();
    },
    onError: (err: Error) => {
      setError(err.message || "Failed to create post");
    },
  });

  if (!open) return null;

  const resolvedCommunityId =
    communityId ??
    (defaultCommunitySlug
      ? communities?.find(
          (c) => c.name.toLowerCase().replace(/\s+/g, "-") === defaultCommunitySlug,
        )?.id
      : undefined) ??
    communities?.[0]?.id ??
    null;

  const selectedCommunity = communities?.find((c) => c.id === resolvedCommunityId);

  const remaining = MAX_LEN - text.length;
  const overBudget = remaining < 0;
  const displayName = user?.full_name ?? "User";
  const universityName = user?.university_name ?? "your university";
  const submitting = postMutation.isPending;

  async function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
    setUploading(true);
    setError(null);

    try {
      const url = await uploadPostImage(file);
      setImageUrl(url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to upload image");
      setImagePreview(null);
      setImageUrl(null);
    } finally {
      setUploading(false);
    }
  }

  function removeAttachment() {
    setImageUrl(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim() || overBudget || submitting) return;
    setError(null);
    postMutation.mutate();
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="compose-title"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-[620px] flex-col overflow-hidden rounded-t-lg border border-line-2 bg-bg-2 shadow-[0_40px_80px_rgba(0,0,0,0.5)] sm:rounded-lg"
      >
        {/* Header */}
        <header className="flex items-center gap-3 border-b border-line-1 px-5 py-4">
          <h2
            id="compose-title"
            className="flex-1 text-[16px] font-semibold tracking-tightish"
          >
            New post
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-md bg-bg-3 text-fg-2 hover:bg-bg-4 hover:text-fg-1"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* Audience picker */}
        <div className="flex items-start gap-3 px-5 pt-3.5">
          <Avatar name={displayName} size={42} />
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-semibold">{displayName}</div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setPickerOpen((v) => !v)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-brand-purple/28 bg-brand-purple/15 px-2.5 py-1 text-[11.5px] font-semibold text-[#C7B0FF]"
                >
                  <Hash className="h-3 w-3" />
                  {communitiesLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : selectedCommunity ? (
                    selectedCommunity.name
                  ) : (
                    "Select community"
                  )}
                  <ChevronDown className="h-3 w-3" />
                </button>
                {pickerOpen && (
                  <div className="absolute left-0 top-full z-10 mt-1 w-[260px] rounded-md border border-line-2 bg-bg-elev p-1 shadow-elev-2">
                    {communitiesLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin text-fg-3" />
                      </div>
                    ) : !communities || communities.length === 0 ? (
                      <p className="px-3 py-3 text-center text-[12px] text-fg-3">
                        Join a community first to post
                      </p>
                    ) : (
                      communities.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setCommunityId(c.id);
                            setPickerOpen(false);
                          }}
                          className={cn(
                            "flex w-full items-center gap-2.5 rounded-sm px-2.5 py-1.5 text-left text-[13px]",
                            c.id === resolvedCommunityId
                              ? "bg-bg-4 text-fg-1"
                              : "text-fg-2 hover:bg-bg-3 hover:text-fg-1",
                          )}
                        >
                          <CommunityIcon
                            community={{ name: c.name }}
                            size={24}
                          />
                          <span className="flex-1 truncate font-medium">
                            {c.name}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-line-1 bg-bg-3 px-2.5 py-1 text-[11.5px] text-fg-2">
                <Globe className="h-3 w-3" />
                Anyone at {universityName}
                <ChevronDown className="h-3 w-3" />
              </span>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="scroll-hidden flex-1 overflow-y-auto px-5 py-3">
          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              selectedCommunity
                ? `Share something with ${selectedCommunity.name}...`
                : "Share something with your campus..."
            }
            rows={5}
            className="min-h-[120px] w-full resize-none bg-transparent text-[17px] leading-[1.5] text-fg-1 placeholder:text-fg-3 focus:outline-none"
          />

          {/* Image preview */}
          {imagePreview && (
            <div className="relative mt-3.5">
              <img
                src={imagePreview}
                alt="Attachment preview"
                className="max-h-[240px] w-full rounded-lg border border-line-1 object-cover"
              />
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50">
                  <Loader2 className="h-6 w-6 animate-spin text-white" />
                </div>
              )}
              <button
                type="button"
                onClick={removeAttachment}
                aria-label="Remove attachment"
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border border-line-2 bg-black/60 text-white hover:bg-black/80"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mt-3 rounded-md border border-danger/20 bg-danger/[0.06] px-3 py-2 text-[13px] text-danger">
              {error}
            </div>
          )}

          {/* Tip */}
          <div className="mt-4 flex gap-2.5 rounded-md border border-line-1 bg-bg-3 p-3">
            <Info className="h-3.5 w-3.5 shrink-0 text-brand-blue" />
            <div className="text-[12px] leading-[1.5] text-fg-2">
              Tip: type <b className="text-fg-1">@</b> to mention classmates,{" "}
              <b className="text-fg-1">#</b> to link a community.
            </div>
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handlePhotoSelect}
        />

        {/* Toolbar */}
        <footer className="flex items-center gap-1 border-t border-line-1 px-5 py-3">
          {TOOLBAR.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  if (t.key === "photo") fileInputRef.current?.click();
                }}
                disabled={t.key === "photo" && uploading}
                className="flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[12.5px] font-medium text-brand-purple hover:bg-bg-3 disabled:opacity-50"
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            );
          })}
          <div className="flex-1" />
          <span
            className={cn(
              "mr-3 font-mono text-[11px] tabular-nums",
              overBudget ? "text-danger" : "text-fg-3",
            )}
            aria-live="polite"
          >
            {text.length}/{MAX_LEN}
          </span>
          <Button
            size="sm"
            type="submit"
            disabled={!text.trim() || overBudget || submitting || uploading || !resolvedCommunityId}
          >
            {submitting ? "Posting..." : "Post"}
          </Button>
        </footer>
      </form>
    </div>
  );
}
