"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import MobileTopBar from "./MobileTopBar";
import CreatePostModal from "@/components/post/CreatePostModal";
import NetworkStatusBanner from "@/components/NetworkStatusBanner";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);

  return (
    <div className="app-shell">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <NetworkStatusBanner />
        <MobileTopBar onMenu={() => setSidebarOpen(true)} />
        <main className="content-area">{children}</main>
      </div>

      <button
        type="button"
        className="fab"
        onClick={() => setComposerOpen(true)}
        aria-label="Create post"
      >
        +
      </button>

      <CreatePostModal
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
      />
    </div>
  );
}
