"use client";

import { useState } from "react";
import { FolderOpen, Plus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import api from "@/lib/api/client";

const GRADIENT_HUES = [
  ["#9B6CFF", "#5C8FFF"],
  ["#5AE0B6", "#34A8FF"],
  ["#FFB547", "#FF6A6A"],
  ["#FF6ECB", "#9B6CFF"],
  ["#34A8FF", "#5AE0B6"],
  ["#FF8A65", "#FFB547"],
];

interface Collection {
  id: string;
  name: string;
  post_count: number;
  created_at: string;
}

export function SaveToCollectionModal({
  open,
  onClose,
  postId,
}: {
  open: boolean;
  onClose: () => void;
  postId: string;
}) {
  const [newName, setNewName] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const queryClient = useQueryClient();

  const { data: collections = [] } = useQuery({
    queryKey: ["saved-collections"],
    queryFn: async (): Promise<Collection[]> => {
      const res = await api.get<Collection[]>("/users/me/saved-collections");
      return res.data;
    },
    enabled: open,
  });

  const addToCollection = useMutation({
    mutationFn: async (collectionId: string) => {
      await api.post(
        `/users/me/saved-collections/${collectionId}/posts/${postId}`,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-collections"] });
      queryClient.invalidateQueries({ queryKey: ["collection-posts"] });
      onClose();
    },
  });

  const createAndAdd = useMutation({
    mutationFn: async (name: string) => {
      const res = await api.post<Collection>("/users/me/saved-collections", {
        name,
      });
      await api.post(
        `/users/me/saved-collections/${res.data.id}/posts/${postId}`,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-collections"] });
      queryClient.invalidateQueries({ queryKey: ["collection-posts"] });
      setNewName("");
      setShowCreate(false);
      onClose();
    },
  });

  return (
    <Modal open={open} onClose={onClose} title="Save to collection">
      {collections.length === 0 && !showCreate ? (
        <div className="py-4 text-center">
          <FolderOpen className="mx-auto h-10 w-10 text-fg-4" strokeWidth={1.5} />
          <p className="mt-3 text-[13.5px] text-fg-2">
            No collections yet. Create one to organize your saved posts.
          </p>
          <Button
            size="sm"
            className="mt-4"
            icon={<Plus className="h-3.5 w-3.5" />}
            onClick={() => setShowCreate(true)}
          >
            New collection
          </Button>
        </div>
      ) : (
        <>
          <div className="flex max-h-[240px] flex-col gap-1 overflow-y-auto">
            {collections.map((c, i) => (
              <button
                key={c.id}
                onClick={() => addToCollection.mutate(c.id)}
                disabled={addToCollection.isPending}
                className="flex items-center gap-2.5 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-bg-3"
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] text-white"
                  style={{
                    background: `linear-gradient(135deg, ${GRADIENT_HUES[i % GRADIENT_HUES.length][0]}, ${GRADIENT_HUES[i % GRADIENT_HUES.length][1]})`,
                  }}
                >
                  <FolderOpen className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold">
                    {c.name}
                  </div>
                  <div className="text-[11px] text-fg-3">
                    {c.post_count} saved
                  </div>
                </div>
              </button>
            ))}
          </div>

          {showCreate ? (
            <div className="mt-3 border-t border-line-1 pt-3">
              <Field
                label="Collection name"
                type="text"
                placeholder="e.g. Study resources"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                maxLength={100}
                icon={<FolderOpen className="h-4 w-4" />}
              />
              <div className="mt-3 flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowCreate(false);
                    setNewName("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => createAndAdd.mutate(newName.trim())}
                  disabled={!newName.trim() || createAndAdd.isPending}
                >
                  {createAndAdd.isPending ? "Creating..." : "Create & save"}
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowCreate(true)}
              className="mt-2 flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-[13px] font-medium text-brand-blue transition-colors hover:bg-bg-3"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-[9px] border border-dashed border-brand-blue/40 bg-brand-blue/10 text-brand-blue">
                <Plus className="h-4 w-4" />
              </span>
              New collection
            </button>
          )}
        </>
      )}
    </Modal>
  );
}
