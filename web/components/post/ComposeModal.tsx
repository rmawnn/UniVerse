"use client";

import { useRef, useState, type FormEvent } from "react";
import {
  BarChart3,
  Calendar,
  ChevronDown,
  Globe,
  Hash,
  ImageIcon,
  Info,
  Loader2,
  MapPin,
  Minus,
  Plus,
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
const MIN_POLL_OPTIONS = 2;
const MAX_POLL_OPTIONS = 5;

const TOOLBAR = [
  { key: "photo", icon: ImageIcon, label: "Photo" },
  { key: "gif", icon: Sticker, label: "GIF" },
  { key: "poll", icon: BarChart3, label: "Poll" },
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

  // Poll state
  const [pollActive, setPollActive] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);

  // GIF state
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [gifInputOpen, setGifInputOpen] = useState(false);
  const [gifInputValue, setGifInputValue] = useState("");

  function buildPostContent(): string {
    if (!pollActive) return text.trim();
    const q = pollQuestion.trim() || text.trim();
    const opts = pollOptions
      .map((o) => o.trim())
      .filter(Boolean);
    if (opts.length < 2) return text.trim();
    const pollBlock = opts.map((o, i) => `${i + 1}. ${o}`).join("\n");
    const header = q ? `📊 ${q}\n\n` : "";
    return `${header}${pollBlock}\n\nVote by commenting your choice!`;
  }

  const postMutation = useMutation({
    mutationFn: async () => {
      if (!resolvedCommunityId) throw new Error("Select a community first");
      const content = buildPostContent();
      if (!content) throw new Error("Write something first");
      const finalImageUrl = imageUrl || gifUrl;
      return createPost(resolvedCommunityId, {
        content,
        image_url: finalImageUrl,
        post_type: finalImageUrl ? "image" : "text",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["explore"] });
      queryClient.invalidateQueries({ queryKey: ["trending"] });
      resetForm();
      onClose();
    },
    onError: (err: Error) => {
      setError(err.message || "Failed to create post");
    },
  });

  function resetForm() {
    setText("");
    setImageUrl(null);
    setImagePreview(null);
    setCommunityId(null);
    setError(null);
    setPollActive(false);
    setPollQuestion("");
    setPollOptions(["", ""]);
    setGifUrl(null);
    setGifInputOpen(false);
    setGifInputValue("");
  }

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

  const canSubmit = pollActive
    ? (pollQuestion.trim() || text.trim()) &&
      pollOptions.filter((o) => o.trim()).length >= 2 &&
      !overBudget &&
      !submitting &&
      !uploading &&
      !!resolvedCommunityId
    : text.trim() &&
      !overBudget &&
      !submitting &&
      !uploading &&
      !!resolvedCommunityId;

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
    setGifUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleToolbarClick(key: string) {
    switch (key) {
      case "photo":
        fileInputRef.current?.click();
        break;
      case "poll":
        if (pollActive) {
          setPollActive(false);
          setPollQuestion("");
          setPollOptions(["", ""]);
        } else {
          setPollActive(true);
          setGifInputOpen(false);
        }
        break;
      case "gif":
        if (gifInputOpen) {
          setGifInputOpen(false);
        } else {
          setGifInputOpen(true);
          setPollActive(false);
        }
        break;
      case "event":
      case "place":
        setError(`${key === "event" ? "Schedule" : "Place"} — coming soon!`);
        setTimeout(() => setError(null), 2000);
        break;
    }
  }

  function addPollOption() {
    if (pollOptions.length >= MAX_POLL_OPTIONS) return;
    setPollOptions([...pollOptions, ""]);
  }

  function removePollOption(idx: number) {
    if (pollOptions.length <= MIN_POLL_OPTIONS) return;
    setPollOptions(pollOptions.filter((_, i) => i !== idx));
  }

  function updatePollOption(idx: number, val: string) {
    setPollOptions(pollOptions.map((o, i) => (i === idx ? val : o)));
  }

  function handleGifAdd() {
    const url = gifInputValue.trim();
    if (!url) return;
    setGifUrl(url);
    setImagePreview(null);
    setImageUrl(null);
    setGifInputOpen(false);
    setGifInputValue("");
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
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
            {pollActive ? "Create poll" : "New post"}
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
          <Avatar name={displayName} src={user?.profile_image_url} size={42} />
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
              pollActive
                ? "Ask a question..."
                : selectedCommunity
                  ? `Share something with ${selectedCommunity.name}...`
                  : "Share something with your campus..."
            }
            rows={pollActive ? 2 : 5}
            className="min-h-[60px] w-full resize-none bg-transparent text-[17px] leading-[1.5] text-fg-1 placeholder:text-fg-3 focus:outline-none"
          />

          {/* Poll builder */}
          {pollActive && (
            <div className="mt-3 space-y-2.5 rounded-lg border border-line-2 bg-bg-3 p-4">
              <div className="flex items-center gap-2 text-[13px] font-semibold text-fg-1">
                <BarChart3 className="h-4 w-4 text-brand-purple" />
                Poll options
                <span className="ml-auto text-[11px] font-normal text-fg-4">
                  {pollOptions.length}/{MAX_POLL_OPTIONS}
                </span>
              </div>
              {pollOptions.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-bg-4 text-[11px] font-bold text-fg-3">
                    {idx + 1}
                  </span>
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => updatePollOption(idx, e.target.value)}
                    placeholder={`Option ${idx + 1}`}
                    maxLength={100}
                    className="flex-1 rounded-md border border-line-2 bg-bg-1 px-3 py-2 text-[14px] text-fg-1 placeholder:text-fg-4 focus:border-brand-purple/60 focus:outline-none"
                  />
                  {pollOptions.length > MIN_POLL_OPTIONS && (
                    <button
                      type="button"
                      onClick={() => removePollOption(idx)}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-fg-4 hover:bg-bg-4 hover:text-danger"
                      aria-label={`Remove option ${idx + 1}`}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
              {pollOptions.length < MAX_POLL_OPTIONS && (
                <button
                  type="button"
                  onClick={addPollOption}
                  className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-line-2 bg-bg-1 py-2 text-[13px] font-medium text-fg-3 hover:border-brand-purple/40 hover:text-brand-purple"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add option
                </button>
              )}
            </div>
          )}

          {/* GIF URL input */}
          {gifInputOpen && (
            <div className="mt-3 rounded-lg border border-line-2 bg-bg-3 p-4">
              <div className="flex items-center gap-2 text-[13px] font-semibold text-fg-1">
                <Sticker className="h-4 w-4 text-brand-purple" />
                Add GIF
              </div>
              <div className="mt-2.5 flex gap-2">
                <input
                  type="url"
                  value={gifInputValue}
                  onChange={(e) => setGifInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleGifAdd();
                    }
                  }}
                  placeholder="Paste a GIF URL (e.g. from giphy.com)"
                  className="flex-1 rounded-md border border-line-2 bg-bg-1 px-3 py-2 text-[14px] text-fg-1 placeholder:text-fg-4 focus:border-brand-purple/60 focus:outline-none"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleGifAdd}
                  disabled={!gifInputValue.trim()}
                >
                  Add
                </Button>
              </div>
              <p className="mt-2 text-[11px] text-fg-4">
                Paste a direct image/GIF URL. The GIF will appear in your post.
              </p>
            </div>
          )}

          {/* Image / GIF preview */}
          {(imagePreview || gifUrl) && (
            <div className="relative mt-3.5">
              <img
                src={imagePreview || gifUrl || ""}
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
          {!pollActive && !gifInputOpen && (
            <div className="mt-4 flex gap-2.5 rounded-md border border-line-1 bg-bg-3 p-3">
              <Info className="h-3.5 w-3.5 shrink-0 text-brand-blue" />
              <div className="text-[12px] leading-[1.5] text-fg-2">
                Tip: type <b className="text-fg-1">@</b> to mention classmates,{" "}
                <b className="text-fg-1">#</b> to link a community.
              </div>
            </div>
          )}
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
            const isActive =
              (t.key === "poll" && pollActive) ||
              (t.key === "gif" && gifInputOpen);
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => handleToolbarClick(t.key)}
                disabled={t.key === "photo" && uploading}
                className={cn(
                  "flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[12.5px] font-medium transition-colors disabled:opacity-50",
                  isActive
                    ? "bg-brand-purple/15 text-brand-purple"
                    : "text-brand-purple hover:bg-bg-3",
                )}
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
            disabled={!canSubmit}
          >
            {submitting ? "Posting..." : "Post"}
          </Button>
        </footer>
      </form>
    </div>
  );
}
