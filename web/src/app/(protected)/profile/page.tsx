"use client";

import Link from "next/link";
import { useAuthStore } from "@/store/auth-store";

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);

  if (!user) return null;

  return (
    <div>
      <h2 style={styles.heading}>My Profile</h2>

      <div style={styles.card}>
        <div style={styles.avatar}>
          {user.full_name.charAt(0).toUpperCase()}
        </div>

        <h3 style={styles.name}>{user.full_name}</h3>
        <p style={styles.username}>@{user.username}</p>
        <p style={styles.email}>{user.email}</p>

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
              <Link href="/verification" style={{ color: "#6C63FF", fontWeight: 500, textDecoration: "none" }}>
                Verify now
              </Link>
            )}
          </div>
          {user.department && (
            <div style={styles.row}>
              <span style={styles.label}>Department</span>
              <span>{user.department}</span>
            </div>
          )}
          <div style={styles.row}>
            <span style={styles.label}>Joined</span>
            <span>{new Date(user.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  heading: { fontSize: 22, fontWeight: 700, marginBottom: 16 },
  card: {
    background: "#fff", border: "1px solid #eee", borderRadius: 12,
    padding: 32, textAlign: "center", maxWidth: 480,
  },
  avatar: {
    width: 72, height: 72, borderRadius: "50%", background: "#6C63FF",
    color: "#fff", fontSize: 28, fontWeight: 700,
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    marginBottom: 12,
  },
  name: { fontSize: 20, fontWeight: 700, margin: "0 0 4px" },
  username: { color: "#666", fontSize: 15, margin: "0 0 2px" },
  email: { color: "#999", fontSize: 14, margin: "0 0 16px" },
  bio: { color: "#444", fontSize: 15, lineHeight: 1.6, margin: "0 0 16px" },
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
    background: "#f9f9f9", borderRadius: 10, padding: 16, textAlign: "left",
  },
  row: {
    display: "flex", justifyContent: "space-between", padding: "8px 0",
    borderBottom: "1px solid #eee", fontSize: 14,
  },
  label: { color: "#666" },
};
