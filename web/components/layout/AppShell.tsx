import type { ReactNode } from "react";
import { NavRail } from "./NavRail";
import { TopBar } from "./TopBar";
import { RightRail } from "./RightRail";

interface AppShellProps {
  /** Center column — feed, post detail, community body, etc. */
  children: ReactNode;
  /** Optional right rail content. Hidden under xl breakpoint. */
  rightRail?: ReactNode;
  /** Top bar configuration. */
  topBar?: {
    breadcrumb?: string;
    title?: string;
    action?: ReactNode;
  };
}

/**
 * Authenticated app chrome. Three columns at >= xl:
 *   ┌────────┬─────────────────────┬──────────┐
 *   │ NavRail│ TopBar / Main       │ RightRail│
 *   │        │                     │          │
 *   └────────┴─────────────────────┴──────────┘
 *
 * Right rail collapses under xl (1280). NavRail collapses to icon-only
 * under lg (1024). Mobile gets a separate bottom-nav shell — built
 * in a later milestone.
 */
export function AppShell({ children, rightRail, topBar }: AppShellProps) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg-1 text-fg-1">
      <NavRail />
      <main className="scroll-hidden flex h-full min-w-0 flex-1 flex-col overflow-y-auto">
        <TopBar {...topBar} />
        <div className="flex-1">{children}</div>
      </main>
      {rightRail ? <RightRail>{rightRail}</RightRail> : null}
    </div>
  );
}
