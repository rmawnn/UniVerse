"use client";

import Link from "next/link";

export default function MobileTopBar({ onMenu }: { onMenu: () => void }) {
  return (
    <div className="mobile-topbar">
      <button
        type="button"
        onClick={onMenu}
        aria-label="Open menu"
        style={{
          background: "none",
          border: "none",
          fontSize: 22,
          cursor: "pointer",
          color: "#555",
          padding: 6,
        }}
      >
        ☰
      </button>
      <Link
        href="/feed"
        style={{
          fontWeight: 700,
          fontSize: 18,
          color: "#6C63FF",
          textDecoration: "none",
        }}
      >
        UniVerse
      </Link>
      <div style={{ width: 34 }} />
    </div>
  );
}
