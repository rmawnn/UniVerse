"use client";

import { useState, useRef, useEffect } from "react";
import { Flag, MoreHorizontal, Share2 } from "lucide-react";
import { ReportModal } from "./ReportModal";

interface PostMenuProps {
  postId: string;
}

/** Three-dot menu on posts — opens report modal, copy link, etc. */
export function PostMenu({ postId }: PostMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const handleCopyLink = async () => {
    setMenuOpen(false);
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/posts/${postId}`);
    } catch {}
  };

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          className="ml-auto rounded p-1 text-fg-3 hover:bg-bg-3 hover:text-fg-1"
          aria-label="Post menu"
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-lg border border-line-1 bg-bg-2 shadow-xl">
            <button
              onClick={handleCopyLink}
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-fg-2 hover:bg-bg-3 hover:text-fg-1"
            >
              <Share2 className="h-3.5 w-3.5" /> Copy link
            </button>
            <button
              onClick={() => { setMenuOpen(false); setReportOpen(true); }}
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-danger hover:bg-bg-3"
            >
              <Flag className="h-3.5 w-3.5" /> Report post
            </button>
          </div>
        )}
      </div>
      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        contentId={postId}
      />
    </>
  );
}
