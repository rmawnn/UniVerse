"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ComposeModal } from "./ComposeModal";

interface ComposeContextValue {
  isOpen: boolean;
  /** Open the modal. Optionally pre-select a community slug. */
  open: (defaultCommunitySlug?: string) => void;
  close: () => void;
}

const ComposeContext = createContext<ComposeContextValue | null>(null);

/**
 * Mounts the global Create Post modal and provides a hook to open it from
 * anywhere in the (app) tree. Wraps `(app)/layout.tsx`.
 */
export function ComposeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ open: boolean; community?: string }>({
    open: false,
  });

  const open = useCallback((defaultCommunitySlug?: string) => {
    setState({ open: true, community: defaultCommunitySlug });
  }, []);

  const close = useCallback(() => {
    setState({ open: false });
  }, []);

  const value = useMemo<ComposeContextValue>(
    () => ({ isOpen: state.open, open, close }),
    [state.open, open, close],
  );

  return (
    <ComposeContext.Provider value={value}>
      {children}
      <ComposeModal
        open={state.open}
        onClose={close}
        defaultCommunitySlug={state.community}
      />
    </ComposeContext.Provider>
  );
}

/** Read the compose actions from anywhere in the app tree. */
export function useCompose() {
  const ctx = useContext(ComposeContext);
  if (!ctx) {
    throw new Error("useCompose() must be used inside a <ComposeProvider>.");
  }
  return ctx;
}
