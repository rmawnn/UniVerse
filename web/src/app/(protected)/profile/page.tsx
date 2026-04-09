"use client";

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

        <div style={styles.info}>
          <div style={styles.row}>
            <span style={styles.label}>Verified</span>
            <span style={{
              color: user.is_verified_student ? "#4CAF50" : "#f39c12",
              fontWeight: 500,
            }}>
              {user.is_verified_student ? "Yes" : "Not yet"}
            </span>
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
  info: {
    background: "#f9f9f9", borderRadius: 10, padding: 16, textAlign: "left",
  },
  row: {
    display: "flex", justifyContent: "space-between", padding: "8px 0",
    borderBottom: "1px solid #eee", fontSize: 14,
  },
  label: { color: "#666" },
};
