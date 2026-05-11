"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listStories, createStory } from "@/api/stories";
import { uploadImage } from "@/api/uploads";
import { useAuthStore } from "@/store/auth-store";
import StoryViewer from "./StoryViewer";
import type { UserStoriesResponse } from "@/types/api";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1$/, "") ??
  "http://localhost:8000";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024;

export default function StoriesRow() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [viewingUser, setViewingUser] = useState<UserStoriesResponse | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const { data: storiesData } = useQuery({
    queryKey: ["stories"],
    queryFn: listStories,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const stories = storiesData ?? [];

  const createMutation = useMutation({
    mutationFn: async (file: File) => {
      const uploadResult = await uploadImage(file);
      const imageUrl = `${BACKEND_URL}${uploadResult.url}`;
      return createStory({ image_url: imageUrl });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stories"] });
      setUploadError(null);
    },
    onError: (err: { message?: string }) => {
      setUploadError(err?.message ?? "Failed to create story");
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setUploadError("Only JPG, PNG, and WebP images are allowed");
      return;
    }
    if (file.size > MAX_SIZE) {
      setUploadError("Image must be under 5 MB");
      return;
    }

    setUploadError(null);
    createMutation.mutate(file);

    // Reset so the same file can be selected again
    if (fileRef.current) fileRef.current.value = "";
  };

  // Check if current user already has an active story
  const myStories = stories.find((s) => s.user.id === user?.id);

  if (stories.length === 0 && !user) return null;

  return (
    <>
      <div style={styles.container}>
        <div style={styles.scrollRow}>
          {/* ── Add story button ─────────────────────────────── */}
          {user && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={createMutation.isPending}
              style={styles.storyItem}
            >
              <div
                style={{
                  ...styles.avatar,
                  ...(myStories ? styles.avatarHasStory : {}),
                  opacity: createMutation.isPending ? 0.5 : 1,
                }}
              >
                <span style={styles.avatarLetter}>
                  {user.full_name.charAt(0).toUpperCase()}
                </span>
                <span style={styles.addBadge}>+</span>
              </div>
              <span style={styles.name}>
                {createMutation.isPending ? "Uploading..." : "Your story"}
              </span>
            </button>
          )}

          {/* ── Story circles ────────────────────────────────── */}
          {stories.map((userStory) => (
            <button
              key={userStory.user.id}
              type="button"
              onClick={() => setViewingUser(userStory)}
              style={styles.storyItem}
            >
              <div style={{ ...styles.avatar, ...styles.avatarHasStory }}>
                <span style={styles.avatarLetter}>
                  {userStory.user.full_name.charAt(0).toUpperCase()}
                </span>
              </div>
              <span style={styles.name}>
                {userStory.user.id === user?.id
                  ? "You"
                  : userStory.user.full_name.split(" ")[0]}
              </span>
            </button>
          ))}
        </div>

        {uploadError && (
          <p style={styles.error}>{uploadError}</p>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileSelect}
          style={{ display: "none" }}
        />
      </div>

      {/* ── Story viewer overlay ────────────────────────────── */}
      {viewingUser && (
        <StoryViewer
          userStory={viewingUser}
          onClose={() => setViewingUser(null)}
        />
      )}
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    marginBottom: 16,
  },
  scrollRow: {
    display: "flex",
    gap: 14,
    overflowX: "auto",
    padding: "4px 0 8px",
    scrollbarWidth: "none",
  },
  storyItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 0,
    flexShrink: 0,
    width: 68,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: "50%",
    background: "#6C63FF",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    border: "3px solid #e0e0e0",
  },
  avatarHasStory: {
    border: "3px solid #6C63FF",
  },
  avatarLetter: {
    color: "#fff",
    fontSize: 22,
    fontWeight: 700,
  },
  addBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: "50%",
    background: "#6C63FF",
    color: "#fff",
    fontSize: 14,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "2px solid #fff",
  },
  name: {
    fontSize: 11,
    color: "#555",
    maxWidth: 68,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  error: {
    color: "#c53030",
    fontSize: 12,
    margin: "4px 0 0",
    padding: "0 4px",
  },
};
