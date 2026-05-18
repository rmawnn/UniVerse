"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { searchUsers } from "@/api/users";
import { searchCommunities } from "@/api/communities";

type Tab = "users" | "communities";

function SearchSkeleton() {
  return (
    <div style={styles.list}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} style={styles.card}>
          <div className="skeleton" style={{ width: "40%", height: 14, borderRadius: 6, marginBottom: 6 }} />
          <div className="skeleton" style={{ width: "25%", height: 11, borderRadius: 6 }} />
        </div>
      ))}
    </div>
  );
}

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
        <div style={styles.hintCard}>
          <span style={styles.hintIcon}>🔍</span>
          <p style={styles.hintText}>Type at least 2 characters to search</p>
        </div>
      )}

      {enabled && activeQuery.isLoading && <SearchSkeleton />}

      {enabled && activeQuery.isError && (
        <div style={styles.errorBox}>
          <span>Search failed. Please try again.</span>
          <button onClick={() => activeQuery.refetch()} style={styles.retry}>
            Retry
          </button>
        </div>
      )}

      {enabled && !activeQuery.isLoading && !activeQuery.isError && tab === "users" && usersQuery.data && (
        <div style={styles.list}>
          {usersQuery.data.items.length === 0 ? (
            <div style={styles.emptyResult}>
              <p style={styles.emptyText}>No users found for &quot;{trimmed}&quot;</p>
            </div>
          ) : (
            usersQuery.data.items.map((u) => (
              <Link
                key={u.id}
                href={`/profile/${u.id}`}
                style={styles.card}
                className="card-hover"
              >
                <div style={styles.cardRow}>
                  <div style={styles.userAvatar}>
                    {u.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <strong style={styles.cardName}>{u.full_name}</strong>
                    <span style={styles.username}> @{u.username}</span>
                    {u.is_verified_student && <span style={styles.badge}> ✓</span>}
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      )}

      {enabled && !activeQuery.isLoading && !activeQuery.isError && tab === "communities" && commQuery.data && (
        <div style={styles.list}>
          {commQuery.data.items.length === 0 ? (
            <div style={styles.emptyResult}>
              <p style={styles.emptyText}>No communities found for &quot;{trimmed}&quot;</p>
            </div>
          ) : (
            commQuery.data.items.map((c) => (
              <Link
                key={c.id}
                href={`/communities/${c.id}`}
                style={styles.card}
                className="card-hover"
              >
                <div style={styles.cardRow}>
                  <div style={styles.communityAvatar}>🏘️</div>
                  <div>
                    <strong style={styles.cardName}>{c.name}</strong>
                    <span style={styles.meta}> · {c.member_count} members</span>
                  </div>
                </div>
              </Link>
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
    width: "100%",
    padding: "12px 16px",
    borderRadius: 8,
    border: "1px solid #ddd",
    fontSize: 15,
    marginBottom: 12,
    boxSizing: "border-box",
    outline: "none",
  },
  tabs: { display: "flex", gap: 8, marginBottom: 16 },
  tab: {
    padding: "8px 20px",
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "solid" as const,
    borderColor: "#ddd",
    background: "#fff",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 500,
  },
  activeTab: { background: "#6C63FF", color: "#fff", borderColor: "#6C63FF" },
  hintCard: {
    textAlign: "center",
    padding: "40px 24px",
    background: "#fafafa",
    borderRadius: 12,
    border: "1px dashed #ddd",
  },
  hintIcon: { fontSize: 32, display: "block", marginBottom: 8 },
  hintText: { color: "#888", fontSize: 14, margin: 0 },
  list: { display: "flex", flexDirection: "column", gap: 8 },
  card: {
    display: "block",
    background: "#fff",
    border: "1px solid #eee",
    borderRadius: 10,
    padding: "12px 16px",
    fontSize: 15,
    textDecoration: "none",
    color: "inherit",
  },
  cardRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  cardName: { fontSize: 15 },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    background: "#6C63FF",
    color: "#fff",
    fontSize: 15,
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  communityAvatar: {
    width: 36,
    height: 36,
    borderRadius: 8,
    background: "#f0efff",
    fontSize: 18,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  username: { color: "#999", fontSize: 13 },
  badge: { color: "#6C63FF", fontWeight: 700 },
  meta: { color: "#999", fontSize: 13 },
  errorBox: {
    background: "#fff5f5",
    border: "1px solid #fed7d7",
    color: "#c53030",
    padding: 12,
    borderRadius: 8,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  retry: {
    background: "#fff",
    border: "1px solid #fed7d7",
    color: "#c53030",
    borderRadius: 6,
    padding: "4px 12px",
    fontSize: 13,
    cursor: "pointer",
  },
  emptyResult: {
    textAlign: "center",
    padding: "32px 24px",
    background: "#fafafa",
    borderRadius: 12,
    border: "1px dashed #ddd",
  },
  emptyText: { color: "#888", fontSize: 14, margin: 0 },
};
