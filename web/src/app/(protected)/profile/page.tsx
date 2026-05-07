"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { updateProfile } from "@/api/users";
import type { UpdateProfileRequest } from "@/api/users";
import { useAuthStore } from "@/store/auth-store";
import { formatRelativeTime } from "@/lib/format";

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const [showEdit, setShowEdit] = useState(false);

  if (!user) return null;

  return (
    <div>
      {/* ── Profile header ──────────────────────────────────── */}
      <section style={styles.header}>
        <div style={styles.avatar}>
          {user.full_name.charAt(0).toUpperCase()}
        </div>
        <h2 style={styles.name}>
          {user.full_name}
          {user.is_verified_student && (
            <span style={styles.verified} title="Verified student">
              ✓
            </span>
          )}
        </h2>
        <p style={styles.username}>@{user.username}</p>

        {/* ── Stats row ─────────────────────────────────────── */}
        <div style={styles.statsRow}>
          <div style={styles.stat}>
            <span style={styles.statCount}>{user.posts_count}</span>
            <span style={styles.statLabel}>Posts</span>
          </div>
          <div style={styles.statDivider} />
          <Link href={`/profile/${user.id}/followers`} style={styles.statLink}>
            <span style={styles.statCount}>{user.followers_count}</span>
            <span style={styles.statLabel}>Followers</span>
          </Link>
          <div style={styles.statDivider} />
          <Link href={`/profile/${user.id}/following`} style={styles.statLink}>
            <span style={styles.statCount}>{user.following_count}</span>
            <span style={styles.statLabel}>Following</span>
          </Link>
          <div style={styles.statDivider} />
          <div style={styles.stat}>
            <span style={styles.statCount}>{user.communities_count}</span>
            <span style={styles.statLabel}>Communities</span>
          </div>
        </div>

        {/* ── Edit Profile button ───────────────────────────── */}
        <button
          type="button"
          onClick={() => setShowEdit(true)}
          style={styles.editBtn}
        >
          Edit Profile
        </button>

        {user.bio && <p style={styles.bio}>{user.bio}</p>}

        {!user.is_verified_student && (
          <Link href="/verification" style={styles.verifyBanner}>
            <span style={styles.verifyIcon}>!</span>
            <div style={styles.verifyText}>
              <strong>Verify your student status</strong>
              <span style={styles.verifyHint}>
                Unlock communities and posting
              </span>
            </div>
            <span style={styles.verifyArrow}>&rarr;</span>
          </Link>
        )}

        <div style={styles.info}>
          <div style={styles.row}>
            <span style={styles.label}>Verified</span>
            {user.is_verified_student ? (
              <span style={{ color: "#22c55e", fontWeight: 500 }}>
                &#10003; Verified
              </span>
            ) : (
              <Link
                href="/verification"
                style={{
                  color: "#6C63FF",
                  fontWeight: 500,
                  textDecoration: "none",
                }}
              >
                Verify now
              </Link>
            )}
          </div>
          {user.university_name && (
            <div style={styles.row}>
              <span style={styles.label}>University</span>
              <span>{user.university_name}</span>
            </div>
          )}
          {user.department && (
            <div style={styles.row}>
              <span style={styles.label}>Department</span>
              <span>{user.department}</span>
            </div>
          )}
          {user.academic_year && (
            <div style={styles.row}>
              <span style={styles.label}>Year</span>
              <span>{user.academic_year}</span>
            </div>
          )}
          <div style={styles.row}>
            <span style={styles.label}>Email</span>
            <span style={{ color: "#555" }}>{user.email}</span>
          </div>
          <div style={{ ...styles.row, borderBottom: "none" }}>
            <span style={styles.label}>Joined</span>
            <span>{formatRelativeTime(user.created_at)}</span>
          </div>
        </div>
      </section>

      {/* ── Edit profile modal ──────────────────────────────── */}
      {showEdit && (
        <EditProfileModal
          user={user}
          onClose={() => setShowEdit(false)}
          onSaved={() => {
            setShowEdit(false);
            refreshUser();
          }}
        />
      )}
    </div>
  );
}

/* ── Edit Profile Modal ──────────────────────────────────────── */

function EditProfileModal({
  user,
  onClose,
  onSaved,
}: {
  user: {
    full_name: string;
    bio: string | null;
    profile_image_url: string | null;
    department: string | null;
    academic_year: number | null;
  };
  onClose: () => void;
  onSaved: () => void;
}) {
  const [fullName, setFullName] = useState(user.full_name);
  const [bio, setBio] = useState(user.bio ?? "");
  const [profileImageUrl, setProfileImageUrl] = useState(
    user.profile_image_url ?? ""
  );
  const [department, setDepartment] = useState(user.department ?? "");
  const [academicYear, setAcademicYear] = useState(
    user.academic_year?.toString() ?? ""
  );
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const mutation = useMutation({
    mutationFn: (data: UpdateProfileRequest) => updateProfile(data),
    onSuccess: () => onSaved(),
    onError: (err: { message?: string }) => {
      setError(err?.message ?? "Failed to update profile");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = fullName.trim();
    if (!trimmedName) {
      setError("Full name is required");
      return;
    }

    const payload: UpdateProfileRequest = {};

    if (trimmedName !== user.full_name) {
      payload.full_name = trimmedName;
    }

    const newBio = bio.trim() || null;
    if (newBio !== user.bio) {
      payload.bio = newBio;
    }

    const newImg = profileImageUrl.trim() || null;
    if (newImg !== user.profile_image_url) {
      payload.profile_image_url = newImg;
    }

    const newDept = department.trim() || null;
    if (newDept !== user.department) {
      payload.department = newDept;
    }

    const newYear = academicYear.trim() ? parseInt(academicYear.trim(), 10) : null;
    if (newYear !== user.academic_year) {
      payload.academic_year = newYear;
    }

    if (Object.keys(payload).length === 0) {
      onClose();
      return;
    }

    mutation.mutate(payload);
  };

  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={modalStyles.header}>
          <h3 style={modalStyles.title}>Edit Profile</h3>
          <button type="button" onClick={onClose} style={modalStyles.closeBtn}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={modalStyles.form}>
          {error && <p style={modalStyles.error}>{error}</p>}

          <div style={modalStyles.field}>
            <label style={modalStyles.label}>Full Name</label>
            <input
              ref={nameRef}
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              style={modalStyles.input}
              maxLength={100}
              disabled={mutation.isPending}
            />
          </div>

          <div style={modalStyles.field}>
            <label style={modalStyles.label}>Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              style={{ ...modalStyles.input, minHeight: 72, resize: "vertical" }}
              maxLength={500}
              placeholder="Tell us about yourself..."
              disabled={mutation.isPending}
            />
            <span style={modalStyles.charCount}>{bio.length}/500</span>
          </div>

          <div style={modalStyles.field}>
            <label style={modalStyles.label}>Profile Image URL</label>
            <input
              type="text"
              value={profileImageUrl}
              onChange={(e) => setProfileImageUrl(e.target.value)}
              style={modalStyles.input}
              placeholder="https://example.com/photo.jpg"
              maxLength={500}
              disabled={mutation.isPending}
            />
          </div>

          <div style={modalStyles.fieldRow}>
            <div style={{ ...modalStyles.field, flex: 1 }}>
              <label style={modalStyles.label}>Department</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                style={modalStyles.input}
                placeholder="e.g. Computer Science"
                maxLength={150}
                disabled={mutation.isPending}
              />
            </div>
            <div style={{ ...modalStyles.field, width: 100 }}>
              <label style={modalStyles.label}>Year</label>
              <input
                type="number"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                style={modalStyles.input}
                placeholder="1-8"
                min={1}
                max={8}
                disabled={mutation.isPending}
              />
            </div>
          </div>

          <div style={modalStyles.actions}>
            <button
              type="button"
              onClick={onClose}
              style={modalStyles.cancelBtn}
              disabled={mutation.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                ...modalStyles.saveBtn,
                opacity: mutation.isPending ? 0.6 : 1,
              }}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Styles ──────────────────────────────────────────────────── */

const styles: Record<string, React.CSSProperties> = {
  header: {
    background: "#fff",
    border: "1px solid #eee",
    borderRadius: 12,
    padding: 24,
    textAlign: "center",
    marginBottom: 16,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: "50%",
    background: "#6C63FF",
    color: "#fff",
    fontSize: 34,
    fontWeight: 700,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  name: {
    fontSize: 22,
    fontWeight: 700,
    margin: "0 0 4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  verified: {
    background: "#6C63FF",
    color: "#fff",
    borderRadius: "50%",
    width: 20,
    height: 20,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
  },
  username: { color: "#666", fontSize: 15, margin: "0 0 14px" },
  statsRow: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
    marginBottom: 16,
  },
  stat: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
  },
  statLink: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
    textDecoration: "none",
    color: "inherit",
  },
  statCount: { fontSize: 18, fontWeight: 700, color: "#222" },
  statLabel: { fontSize: 12, color: "#888" },
  statDivider: {
    width: 1,
    height: 28,
    background: "#e0e0e0",
  },
  editBtn: {
    background: "#fff",
    color: "#6C63FF",
    border: "1px solid #6C63FF",
    borderRadius: 8,
    padding: "8px 28px",
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
    marginBottom: 14,
  },
  bio: {
    color: "#444",
    fontSize: 14,
    lineHeight: 1.6,
    margin: "0 auto 16px",
    maxWidth: 480,
  },
  verifyBanner: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: "#fffbeb",
    border: "1px solid #fde68a",
    borderRadius: 10,
    padding: "12px 16px",
    marginBottom: 16,
    textDecoration: "none",
    color: "inherit",
    textAlign: "left",
    maxWidth: 480,
    marginLeft: "auto",
    marginRight: "auto",
  },
  verifyIcon: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    background: "#f59e0b",
    color: "#fff",
    fontSize: 18,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  verifyText: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    fontSize: 14,
  },
  verifyHint: {
    fontSize: 12,
    color: "#92400e",
    marginTop: 2,
  },
  verifyArrow: {
    fontSize: 18,
    color: "#92400e",
    flexShrink: 0,
  },
  info: {
    background: "#f9f9f9",
    borderRadius: 10,
    padding: 16,
    textAlign: "left",
    maxWidth: 480,
    margin: "0 auto",
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    padding: "8px 0",
    borderBottom: "1px solid #eee",
    fontSize: 14,
  },
  label: { color: "#666" },
};

const modalStyles: Record<string, React.CSSProperties> = {
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
    width: "100%",
    maxWidth: 480,
    margin: "0 16px",
    maxHeight: "90vh",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 20px 12px",
    borderBottom: "1px solid #f0f0f0",
  },
  title: { fontSize: 17, fontWeight: 700, margin: 0 },
  closeBtn: {
    background: "none",
    border: "none",
    fontSize: 18,
    color: "#999",
    cursor: "pointer",
    padding: 4,
  },
  form: {
    padding: "16px 20px 20px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  error: {
    color: "#c53030",
    fontSize: 13,
    background: "#fff5f5",
    border: "1px solid #fed7d7",
    borderRadius: 8,
    padding: "8px 12px",
    margin: 0,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  fieldRow: {
    display: "flex",
    gap: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: 500,
    color: "#555",
  },
  input: {
    padding: "10px 12px",
    border: "1px solid #ddd",
    borderRadius: 8,
    fontSize: 14,
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  },
  charCount: {
    fontSize: 11,
    color: "#aaa",
    textAlign: "right",
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 4,
  },
  cancelBtn: {
    background: "#f5f5f5",
    color: "#666",
    border: "1px solid #ddd",
    borderRadius: 8,
    padding: "8px 20px",
    fontSize: 14,
    cursor: "pointer",
  },
  saveBtn: {
    background: "#6C63FF",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "8px 20px",
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
  },
};
