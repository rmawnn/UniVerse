"use client";

import Link from "next/link";
import type { CommunityResponse } from "@/types/api";

export default function CommunityCard({
  community,
}: {
  community: CommunityResponse;
}) {
  return (
    <Link href={`/communities/${community.id}`} style={styles.card}>
      <div style={styles.header}>
        <strong style={styles.name}>{community.name}</strong>
        <span style={styles.members}>{community.member_count} members</span>
      </div>
      {community.description && (
        <p style={styles.description}>{community.description}</p>
      )}
    </Link>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    display: "block",
    background: "#fff",
    border: "1px solid #eee",
    borderRadius: 10,
    padding: 16,
    textDecoration: "none",
    color: "inherit",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 6,
  },
  name: { fontSize: 16 },
  members: { fontSize: 12, color: "#999" },
  description: {
    fontSize: 13,
    color: "#666",
    margin: 0,
    lineHeight: 1.5,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
};
