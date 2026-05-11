"use client";

import { useState, useEffect, useCallback } from "react";
import { formatRelativeTime } from "@/lib/format";
import type { UserStoriesResponse } from "@/types/api";

interface Props {
  userStory: UserStoriesResponse;
  onClose: () => void;
}

const STORY_DURATION = 5000; // 5 seconds per story

export default function StoryViewer({ userStory, onClose }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const stories = userStory.stories;
  const current = stories[currentIndex];

  // Auto-advance timer
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentIndex < stories.length - 1) {
        setCurrentIndex((i) => i + 1);
      } else {
        onClose();
      }
    }, STORY_DURATION);
    return () => clearTimeout(timer);
  }, [currentIndex, stories.length, onClose]);

  // Keyboard support
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        if (currentIndex < stories.length - 1) setCurrentIndex((i) => i + 1);
        else onClose();
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (currentIndex > 0) setCurrentIndex((i) => i - 1);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [currentIndex, stories.length, onClose]);

  // Prevent body scroll while viewer is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const handleTap = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const third = rect.width / 3;

      if (x < third) {
        // Left third → previous
        if (currentIndex > 0) setCurrentIndex((i) => i - 1);
      } else if (x > third * 2) {
        // Right third → next
        if (currentIndex < stories.length - 1) setCurrentIndex((i) => i + 1);
        else onClose();
      } else {
        // Middle third → close
        onClose();
      }
    },
    [currentIndex, stories.length, onClose]
  );

  if (!current) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.container} onClick={(e) => e.stopPropagation()}>
        {/* ── Progress bars ─────────────────────────────── */}
        <div style={styles.progressRow}>
          {stories.map((s, i) => (
            <div key={s.id} style={styles.progressTrack}>
              <div
                style={{
                  ...styles.progressFill,
                  width: i < currentIndex ? "100%" : i === currentIndex ? "0%" : "0%",
                  animation:
                    i === currentIndex
                      ? `storyProgress ${STORY_DURATION}ms linear forwards`
                      : undefined,
                }}
              />
            </div>
          ))}
        </div>

        {/* ── Header ───────────────────────────────────── */}
        <div style={styles.header}>
          <div style={styles.userInfo}>
            <div style={styles.headerAvatar}>
              <span style={styles.headerAvatarLetter}>
                {userStory.user.full_name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <span style={styles.headerName}>
                {userStory.user.full_name}
              </span>
              <span style={styles.headerTime}>
                {formatRelativeTime(current.created_at)}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={styles.closeBtn}
            aria-label="Close story"
          >
            ✕
          </button>
        </div>

        {/* ── Story image ──────────────────────────────── */}
        <div style={styles.imageWrap} onClick={handleTap}>
          <img
            src={current.image_url}
            alt={`Story by ${userStory.user.full_name}`}
            style={styles.image}
            draggable={false}
          />

          {/* Navigation hint areas */}
          {currentIndex > 0 && (
            <div style={styles.navHintLeft}>‹</div>
          )}
          {currentIndex < stories.length - 1 && (
            <div style={styles.navHintRight}>›</div>
          )}
        </div>
      </div>

      {/* ── Keyframe animation via style tag ───────── */}
      <style>{`
        @keyframes storyProgress {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.92)",
    zIndex: 9999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    position: "relative",
    width: "100%",
    maxWidth: 420,
    height: "90vh",
    maxHeight: 750,
    borderRadius: 12,
    overflow: "hidden",
    background: "#000",
    display: "flex",
    flexDirection: "column",
  },
  progressRow: {
    display: "flex",
    gap: 3,
    padding: "8px 8px 0",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    background: "rgba(255,255,255,0.3)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    background: "#fff",
    borderRadius: 2,
  },
  header: {
    position: "absolute",
    top: 16,
    left: 0,
    right: 0,
    padding: "0 12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 10,
  },
  userInfo: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    background: "#6C63FF",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatarLetter: {
    color: "#fff",
    fontSize: 14,
    fontWeight: 700,
  },
  headerName: {
    color: "#fff",
    fontSize: 13,
    fontWeight: 600,
    display: "block",
  },
  headerTime: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 11,
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "#fff",
    fontSize: 20,
    cursor: "pointer",
    padding: "4px 8px",
  },
  imageWrap: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    position: "relative",
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
  },
  navHintLeft: {
    position: "absolute",
    left: 8,
    top: "50%",
    transform: "translateY(-50%)",
    color: "rgba(255,255,255,0.4)",
    fontSize: 28,
    fontWeight: 300,
    pointerEvents: "none",
  },
  navHintRight: {
    position: "absolute",
    right: 8,
    top: "50%",
    transform: "translateY(-50%)",
    color: "rgba(255,255,255,0.4)",
    fontSize: 28,
    fontWeight: 300,
    pointerEvents: "none",
  },
};
