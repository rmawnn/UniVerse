"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { searchUsers } from "@/api/users";
import { searchCommunities } from "@/api/communities";

type Tab = "users" | "communities";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("users");
  const trimmed = query.trim();
  const enabled = trimmed.length >= 2;

  const usersQuery = useQuery({
    queryKey: ["searchUsers", trimmed],
    queryFn: () => searchUsers(trimmed, { page_size: 20 }),
    enabled: enabled && tab === "users",
  });

  const commQuery = useQuery({
    queryKey: ["searchCommunities", trimmed],
    queryFn: () => searchCommunities(trimmed, { page_size: 20 }),
    enabled: enabled && tab === "communities",
  });

  const activeQuery = tab === "users" ? usersQuery : commQuery;

  return (
    <div>
      <h2 style={styles.heading}>Search</h2>

      <input
        type="text"
        placeholder="Search users or communities..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={styles.input}
      />

      <div style={styles.tabs}>
        <button
          onClick={() => setTab("users")}
          style={{ ...styles.tab, ...(tab === "users" ? styles.activeTab : {}) }}
        >
          Users
        </button>
        <button
          onClick={() => setTab("communities")}
          style={{ ...styles.tab, ...(tab === "communities" ? styles.activeTab : {}) }}
        >
          Communities
        </button>
      </div>

      {!enabled && (
        <p style={styles.hint}>Type at least 2 characters to search</p>
      )}

      {enabled && activeQuery.isLoading && (
        <p style={{ color: "#999" }}>Searching...</p>
      )}

      {enabled && tab === "users" && usersQuery.data && (
        <div style={styles.list}>
          {usersQuery.data.items.length === 0 ? (
            <p style={styles.hint}>No users found</p>
          ) : (
            usersQuery.data.items.map((u) => (
              <div key={u.id} style={styles.card}>
                <strong>{u.full_name}</strong>
                <span style={styles.username}> @{u.username}</span>
                {u.is_verified_student && <span style={styles.badge}> ✓</span>}
              </div>
            ))
          )}
        </div>
      )}

      {enabled && tab === "communities" && commQuery.data && (
        <div style={styles.list}>
          {commQuery.data.items.length === 0 ? (
            <p style={styles.hint}>No communities found</p>
          ) : (
            commQuery.data.items.map((c) => (
              <div key={c.id} style={styles.card}>
                <strong>{c.name}</strong>
                <span style={styles.meta}> · {c.member_count} members</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  heading: { fontSize: 22, fontWeight: 700, marginBottom: 16 },
  input: {
    width: "100%", padding: "12px 16px", borderRadius: 8,
    border: "1px solid #ddd", fontSize: 15, marginBottom: 12,
    boxSizing: "border-box",
  },
  tabs: { display: "flex", gap: 8, marginBottom: 16 },
  tab: {
    padding: "8px 20px", borderRadius: 8, border: "1px solid #ddd",
    background: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 500,
  },
  activeTab: { background: "#6C63FF", color: "#fff", borderColor: "#6C63FF" },
  hint: { color: "#999", fontSize: 14 },
  list: { display: "flex", flexDirection: "column", gap: 8 },
  card: {
    background: "#fff", border: "1px solid #eee", borderRadius: 10,
    padding: "12px 16px", fontSize: 15,
  },
  username: { color: "#999", fontSize: 13 },
  badge: { color: "#6C63FF", fontWeight: 700 },
  meta: { color: "#999", fontSize: 13 },
};
