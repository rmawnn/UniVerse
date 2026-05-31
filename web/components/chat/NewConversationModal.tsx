"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, ShieldCheck } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { createConversation } from "@/lib/api/conversations";
import type { SearchUserItem } from "@/lib/api/users";

interface NewConversationModalProps {
  open: boolean;
  onClose: () => void;
}

export function NewConversationModal({ open, onClose }: NewConversationModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchUserItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = useCallback(async (q: string) => {
    setQuery(q);
    setError(null);
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const { default: api } = await import("@/lib/api/client");
      const res = await api.get("/users/search", { params: { q: q.trim(), page_size: 10 } });
      setResults(res.data.items ?? []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleSelect = async (userId: string) => {
    setCreating(true);
    setError(null);
    try {
      const conv = await createConversation(userId);
      handleClose();
      router.push(`/messages/${conv.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to start conversation";
      setError(msg);
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setQuery("");
      setResults([]);
      setError(null);
    }, 200);
  };

  return (
    <Modal open={open} onClose={handleClose} title="New message">
      {error && (
        <div className="mb-3 rounded-md border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-[13px] text-danger">
          {error}
        </div>
      )}
      <div className="flex h-10 items-center gap-2.5 rounded-md border border-line-2 bg-bg-3 px-3.5 text-[13.5px]">
        <Search className="h-4 w-4 text-fg-3" />
        <input
          type="text"
          placeholder="Search by name or username..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          className="h-full flex-1 bg-transparent text-fg-1 placeholder:text-fg-4 focus:outline-none"
          autoFocus
        />
      </div>

      <div className="mt-3 max-h-[300px] overflow-y-auto">
        {searching && (
          <p className="py-4 text-center text-[13px] text-fg-3">Searching...</p>
        )}
        {!searching && query.trim().length >= 2 && results.length === 0 && (
          <p className="py-4 text-center text-[13px] text-fg-3">No users found</p>
        )}
        {results.map((u) => (
          <button
            key={u.id}
            type="button"
            onClick={() => handleSelect(u.id)}
            disabled={creating}
            className="flex w-full items-center gap-3 rounded-md px-2 py-2.5 text-left hover:bg-bg-3 disabled:opacity-50"
          >
            <Avatar name={u.full_name} size={38} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <span className="truncate text-[13.5px] font-semibold">{u.full_name}</span>
                {u.is_verified_student && (
                  <ShieldCheck className="h-3 w-3 text-verified" />
                )}
              </div>
              <div className="text-[12px] text-fg-3">@{u.username}</div>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-4 flex justify-end">
        <Button variant="ghost" size="sm" onClick={handleClose}>
          Cancel
        </Button>
      </div>
    </Modal>
  );
}
