"use client";

import { useState, type FormEvent } from "react";
import {
  Calendar,
  ChevronDown,
  Globe,
  Hash,
  ImageIcon,
  Info,
  MapPin,
  Smile,
  Sticker,
  X,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { COMMUNITIES, CURRENT_USER } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const MAX_LEN = 300;

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
  /** Pre-select a community (e.g. when opened from a community page). */
  defaultCommunitySlug?: string;
}

/**
 * Full-screen-on-mobile, centered-on-desktop compose dialog. Pure UI —
 * the submit handler is a mock that resolves after a beat.
 */
export function ComposeModal({
  open,
  onClose,
  defaultCommunitySlug,
}: ComposeModalProps) {
  const [text, setText] = useState("");
  const [communitySlug, setCommunitySlug] = useState(
    defaultCommunitySlug ?? COMMUNITIES[0]?.slug ?? "cs-229",
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [hasAttachment, setHasAttachment] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const remaining = MAX_LEN - text.length;
  const overBudget = remaining < 0;
  const community = COMMUNITIES.find((c) => c.slug === communitySlug);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim() || overBudget) return;
    setSubmitting(true);
    // Mock latency; replace with React Query mutation in M3
    await new Promise((r) => setTimeout(r, 600));
    setSubmitting(false);
    setText("");
    setHasAttachment(false);
    onClose();
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
            className="text-[13px] text-fg-2 hover:text-fg-1"
            disabled={submitting}
          >
            Save draft
          </button>
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
          <Avatar name={CURRENT_USER.name} size={42} />
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-semibold">
              {CURRENT_USER.name}
            </div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {/* Community chip — opens dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setPickerOpen((v) => !v)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-brand-purple/28 bg-brand-purple/15 px-2.5 py-1 text-[11.5px] font-semibold text-[#C7B0FF]"
                >
                  <Hash className="h-3 w-3" />
                  {community?.slug ?? communitySlug}
                  <ChevronDown className="h-3 w-3" />
                </button>
                {pickerOpen && (
                  <div className="absolute left-0 top-full z-10 mt-1 w-[240px] rounded-md border border-line-2 bg-bg-elev p-1 shadow-elev-2">
                    {COMMUNITIES.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setCommunitySlug(c.slug);
                          setPickerOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-sm px-2.5 py-1.5 text-left text-[13px]",
                          c.slug === communitySlug
                            ? "bg-bg-4 text-fg-1"
                            : "text-fg-2 hover:bg-bg-3 hover:text-fg-1",
                        )}
                      >
                        <span
                          className="flex h-6 w-6 items-center justify-center rounded-[7px] text-[14px] leading-none"
                          style={{
                            background: `linear-gradient(135deg, ${c.hue[0]}, ${c.hue[1]})`,
                          }}
                        >
                          {c.emoji}
                        </span>
                        <span className="flex-1 truncate font-medium">
                          #{c.slug}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-line-1 bg-bg-3 px-2.5 py-1 text-[11.5px] text-fg-2">
                <Globe className="h-3 w-3" />
                Anyone at {CURRENT_USER.university}
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
            placeholder={`Share something with #${community?.slug ?? communitySlug}…`}
            rows={5}
            className="min-h-[120px] w-full resize-none bg-transparent text-[17px] leading-[1.5] text-fg-1 placeholder:text-fg-3 focus:outline-none"
          />

          {hasAttachment && (
            <div className="relative mt-3.5">
              <PlaceholderImage
                label="attached photo"
                height={180}
                accent="linear-gradient(135deg,#2A1F4A,#1A1530)"
              />
              <button
                type="button"
                onClick={() => setHasAttachment(false)}
                aria-label="Remove attachment"
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border border-line-2 bg-black/60 text-white hover:bg-black/80"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Mention/hashtag helper */}
          <div className="mt-4 flex gap-2.5 rounded-md border border-line-1 bg-bg-3 p-3">
            <Info className="h-3.5 w-3.5 shrink-0 text-brand-blue" />
            <div className="text-[12px] leading-[1.5] text-fg-2">
              Tip: type <b className="text-fg-1">@</b> to mention classmates,{" "}
              <b className="text-fg-1">#</b> to link a community.
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <footer className="flex items-center gap-1 border-t border-line-1 px-5 py-3">
          {TOOLBAR.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  if (t.key === "photo") setHasAttachment(true);
                }}
                className="flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[12.5px] font-medium text-brand-purple hover:bg-bg-3"
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
            disabled={!text.trim() || overBudget || submitting}
          >
            {submitting ? "Posting…" : "Post"}
          </Button>
        </footer>
      </form>
    </div>
  );
}
