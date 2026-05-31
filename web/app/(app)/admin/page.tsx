"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  Check,
  Flag,
  LayoutDashboard,
  Lock,
  ShieldAlert,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { UniBadge } from "@/components/ui/UniBadge";
import { WidgetCard } from "@/components/widgets/WidgetCard";
import { useAuthStore } from "@/lib/stores/auth-store";
import {
  ADMIN_ACTIVITY,
  ADMIN_STATS,
  FLAGGED_POSTS,
  VERIFICATION_QUEUE,
  type AdminStat,
  type FlaggedPost,
  type VerificationRequest,
} from "@/lib/mock-data-admin";
import { cn } from "@/lib/utils";

type AdminTab = "Overview" | "Reports" | "Verification" | "Users" | "Moderation log";

const ADMIN_NAV: { label: AdminTab; icon: typeof LayoutDashboard }[] = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Reports", icon: Flag },
  { label: "Verification", icon: BadgeCheck },
  { label: "Users", icon: Users },
  { label: "Moderation log", icon: ShieldAlert },
];

type ConfirmAction = { kind: "remove" | "dismiss" | "warn"; post: FlaggedPost };

export default function AdminPage() {
  const user = useAuthStore((s) => s.user);
  const isStaff = user?.role === "admin" || user?.role === "moderator";

  const [activeTab, setActiveTab] = useState<AdminTab>("Overview");
  const [flagged, setFlagged] = useState<FlaggedPost[]>(FLAGGED_POSTS);
  const [verifications, setVerifications] = useState<VerificationRequest[]>(VERIFICATION_QUEUE);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Access control: show denied state for non-staff users
  if (!isStaff) {
    return (
      <AppShell topBar={{ breadcrumb: "Admin", title: "Access denied" }}>
        <div className="flex flex-col items-center justify-center px-8 py-24 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-danger/30 bg-danger/10 text-danger">
            <Lock className="h-7 w-7" strokeWidth={1.5} />
          </div>
          <h2 className="mt-5 text-[22px] font-bold tracking-tighter">
            Access denied
          </h2>
          <p className="mt-2 max-w-[360px] text-[14px] text-fg-2">
            The admin dashboard is only available to staff and moderators.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex h-9 items-center rounded-md bg-acc-gradient px-4 text-[13px] font-semibold text-white shadow-acc"
          >
            Go to feed
          </Link>
        </div>
      </AppShell>
    );
  }

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    const { kind, post } = confirmAction;
    // Optimistic removal from local state
    setFlagged((prev) => prev.filter((f) => f.id !== post.id));
    setConfirmAction(null);
    try {
      // TODO: Wire to real admin endpoints when backend is ready
      const { default: api } = await import("@/lib/api/client");
      if (kind === "remove") {
        await api.delete(`/admin/posts/${post.id}`);
      } else if (kind === "dismiss") {
        await api.post(`/admin/reports/${post.id}/dismiss`);
      } else {
        await api.post(`/admin/users/${post.author}/warn`);
      }
    } catch {
      // Backend not connected — show demo feedback instead of reverting
      const actionLabel = kind === "remove" ? "Post removed" : kind === "dismiss" ? "Report dismissed" : "Warning sent";
      showToast(`${actionLabel} (demo). Backend integration pending.`);
    }
  };

  const handleApproveVerification = async (v: VerificationRequest) => {
    setVerifications((prev) => prev.filter((r) => r.id !== v.id));
    try {
      // TODO: Wire to real admin verification endpoint
      const { default: api } = await import("@/lib/api/client");
      await api.post(`/admin/verifications/${v.id}/approve`);
    } catch {
      showToast(`${v.name} approved (demo). Backend integration pending.`);
    }
  };

  const handleRejectVerification = async (v: VerificationRequest) => {
    setVerifications((prev) => prev.filter((r) => r.id !== v.id));
    try {
      // TODO: Wire to real admin verification endpoint
      const { default: api } = await import("@/lib/api/client");
      await api.post(`/admin/verifications/${v.id}/reject`);
    } catch {
      showToast(`${v.name} rejected (demo). Backend integration pending.`);
    }
  };

  const confirmLabels = {
    remove: { title: "Remove post", desc: "This will permanently remove the flagged post and notify the author.", btn: "Remove post", variant: "danger" as const },
    dismiss: { title: "Dismiss report", desc: "This will dismiss the report and keep the post visible. No action will be taken.", btn: "Dismiss", variant: "ghost" as const },
    warn: { title: "Warn author", desc: "This will send a warning notification to the author about their post violating community guidelines.", btn: "Send warning", variant: "danger" as const },
  };

  return (
    <>
    <AppShell
      topBar={{
        breadcrumb: "Admin · Stanford",
        title: "Moderation dashboard",
        action: (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-warn/30 bg-warn/12 px-2.5 py-1 text-[11.5px] font-semibold text-warn">
            <ShieldAlert className="h-3.5 w-3.5" />
            Staff access
          </span>
        ),
      }}
      rightRail={
        <>
          <WidgetCard title="Recent moderation activity">
            {ADMIN_ACTIVITY.map((a, i) => (
              <div
                key={a.id}
                className="px-3 py-2.5"
                style={{ borderTop: i ? "1px solid var(--line-1)" : "none" }}
              >
                <div className="text-[12.5px] leading-[1.4] text-fg-2">
                  <b className="font-semibold text-fg-1">{a.actor}</b> {a.action}
                </div>
                <div className="mt-1 text-[11px] text-fg-4">{a.time} ago</div>
              </div>
            ))}
          </WidgetCard>
          <Card className="bg-[linear-gradient(135deg,rgba(255,90,106,0.10),rgba(255,181,71,0.06))] border-danger/18">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-danger">
              <AlertTriangle className="h-4 w-4" /> Escalations
            </div>
            <p className="mt-1.5 text-[12px] leading-[1.5] text-fg-2">
              2 reports flagged by auto-mod need a senior admin&rsquo;s review
              within the hour.
            </p>
            <Button variant="danger" size="sm" className="mt-3">
              Review escalations
            </Button>
          </Card>
        </>
      }
    >
      <div className="px-4 py-6 sm:px-8">
        {/* Admin nav */}
        <nav className="mb-6 flex gap-1.5 overflow-x-auto border-b border-line-1 pb-px">
          {ADMIN_NAV.map(({ label, icon: Icon }) => (
            <button
              key={label}
              onClick={() => setActiveTab(label)}
              className={cn(
                "relative flex items-center gap-2 whitespace-nowrap px-3.5 py-2.5 text-[13.5px]",
                activeTab === label
                  ? "font-semibold text-fg-1"
                  : "font-medium text-fg-3 hover:text-fg-2",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
              {activeTab === label && (
                <span className="absolute inset-x-3 -bottom-px h-[2.5px] rounded bg-acc-gradient" />
              )}
            </button>
          ))}
        </nav>

        {activeTab === "Overview" && (
          <>
            {/* Overview stat cards */}
            <div className="mb-7 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
              {ADMIN_STATS.map((s) => (
                <StatCard key={s.key} stat={s} />
              ))}
            </div>

            {/* Two-column work area */}
            <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
              {/* Flagged posts */}
              <section>
                <header className="mb-3 flex items-baseline justify-between px-1">
                  <h2 className="text-[16px] font-bold tracking-tighter">
                    Recent flagged posts
                  </h2>
                  <button
                    onClick={() => setActiveTab("Reports")}
                    className="text-[12.5px] font-medium text-brand-blue hover:underline"
                  >
                    View all reports →
                  </button>
                </header>
                <div className="flex flex-col gap-3">
                  {flagged.length === 0 ? (
                    <Card className="py-8 text-center text-[13px] text-fg-3">
                      No flagged posts — all clear!
                    </Card>
                  ) : (
                    flagged.map((f) => (
                      <Card key={f.id} className="p-4">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={f.author} size={32} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 text-[13px]">
                              <span className="font-semibold">@{f.author}</span>
                              <span className="text-fg-4">in</span>
                              <span className="font-medium text-brand-blue">
                                #{f.community}
                              </span>
                            </div>
                            <div className="text-[11px] text-fg-4">
                              {f.university} · {f.time} ago
                            </div>
                          </div>
                          <ReasonBadge reason={f.reason} count={f.reports} />
                        </div>

                        <p className="mt-3 line-clamp-2 rounded-md border-l-2 border-danger/40 bg-danger/[0.05] px-3 py-2 text-[13px] leading-[1.5] text-fg-2">
                          {f.excerpt}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button
                            variant="danger"
                            size="sm"
                            icon={<Trash2 className="h-3.5 w-3.5" />}
                            onClick={() => setConfirmAction({ kind: "remove", post: f })}
                          >
                            Remove
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<X className="h-3.5 w-3.5" />}
                            onClick={() => setConfirmAction({ kind: "dismiss", post: f })}
                          >
                            Dismiss
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<ShieldAlert className="h-3.5 w-3.5" />}
                            onClick={() => setConfirmAction({ kind: "warn", post: f })}
                          >
                            Warn author
                          </Button>
                          <Link
                            href={`/posts/${f.id}`}
                            className="ml-auto inline-flex items-center text-[12.5px] font-medium text-fg-3 hover:text-fg-1"
                          >
                            Open post
                            <ArrowUpRight className="ml-0.5 h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </section>

              {/* Verification queue */}
              <section>
                <header className="mb-3 flex items-baseline justify-between px-1">
                  <h2 className="text-[16px] font-bold tracking-tighter">
                    Verification queue
                  </h2>
                  <button
                    onClick={() => setActiveTab("Verification")}
                    className="text-[12.5px] font-medium text-brand-blue hover:underline"
                  >
                    See all
                  </button>
                </header>
                <Card padded={false} className="overflow-hidden">
                  {verifications.length === 0 ? (
                    <div className="py-8 text-center text-[13px] text-fg-3">
                      No pending verifications
                    </div>
                  ) : (
                    verifications.map((v, i) => (
                      <div
                        key={v.id}
                        className={cn(
                          "flex items-center gap-3 p-3.5",
                          i && "border-t border-line-1",
                        )}
                      >
                        <Avatar name={v.name} size={38} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-[13px] font-semibold">
                              {v.name}
                            </span>
                          </div>
                          <div className="truncate text-[11.5px] text-fg-3">
                            {v.email}
                          </div>
                          <div className="mt-1.5 flex items-center gap-2">
                            <UniBadge university={v.university} compact />
                            <span className="text-[10.5px] text-fg-4">
                              {v.method} · {v.submitted}
                            </span>
                          </div>
                        </div>
                        <div className="flex shrink-0 gap-1.5">
                          <button
                            aria-label="Approve"
                            onClick={() => handleApproveVerification(v)}
                            className="flex h-8 w-8 items-center justify-center rounded-md border border-success/28 bg-success/12 text-success hover:bg-success/20"
                          >
                            <Check className="h-4 w-4" strokeWidth={2.5} />
                          </button>
                          <button
                            aria-label="Reject"
                            onClick={() => handleRejectVerification(v)}
                            className="flex h-8 w-8 items-center justify-center rounded-md border border-line-2 bg-bg-3 text-fg-3 hover:text-danger"
                          >
                            <X className="h-4 w-4" strokeWidth={2.5} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </Card>
              </section>
            </div>
          </>
        )}

        {activeTab === "Reports" && (
          <section>
            <h2 className="mb-4 text-[16px] font-bold tracking-tighter">
              All flagged posts
            </h2>
            <div className="flex flex-col gap-3">
              {flagged.length === 0 ? (
                <Card className="py-8 text-center text-[13px] text-fg-3">
                  No flagged posts — all clear!
                </Card>
              ) : (
                flagged.map((f) => (
                  <Card key={f.id} className="p-4">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={f.author} size={32} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 text-[13px]">
                          <span className="font-semibold">@{f.author}</span>
                          <span className="text-fg-4">in</span>
                          <span className="font-medium text-brand-blue">#{f.community}</span>
                        </div>
                        <div className="text-[11px] text-fg-4">{f.university} · {f.time} ago</div>
                      </div>
                      <ReasonBadge reason={f.reason} count={f.reports} />
                    </div>
                    <p className="mt-3 line-clamp-2 rounded-md border-l-2 border-danger/40 bg-danger/[0.05] px-3 py-2 text-[13px] leading-[1.5] text-fg-2">
                      {f.excerpt}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button variant="danger" size="sm" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => setConfirmAction({ kind: "remove", post: f })}>
                        Remove
                      </Button>
                      <Button variant="ghost" size="sm" icon={<X className="h-3.5 w-3.5" />} onClick={() => setConfirmAction({ kind: "dismiss", post: f })}>
                        Dismiss
                      </Button>
                      <Button variant="ghost" size="sm" icon={<ShieldAlert className="h-3.5 w-3.5" />} onClick={() => setConfirmAction({ kind: "warn", post: f })}>
                        Warn author
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </section>
        )}

        {activeTab === "Verification" && (
          <section>
            <h2 className="mb-4 text-[16px] font-bold tracking-tighter">
              Verification queue
            </h2>
            <Card padded={false} className="overflow-hidden">
              {verifications.length === 0 ? (
                <div className="py-8 text-center text-[13px] text-fg-3">
                  No pending verifications
                </div>
              ) : (
                verifications.map((v, i) => (
                  <div
                    key={v.id}
                    className={cn("flex items-center gap-3 p-3.5", i && "border-t border-line-1")}
                  >
                    <Avatar name={v.name} size={38} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-[13px] font-semibold">{v.name}</span>
                      </div>
                      <div className="truncate text-[11.5px] text-fg-3">{v.email}</div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <UniBadge university={v.university} compact />
                        <span className="text-[10.5px] text-fg-4">{v.method} · {v.submitted}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <button
                        aria-label="Approve"
                        onClick={() => handleApproveVerification(v)}
                        className="flex h-8 w-8 items-center justify-center rounded-md border border-success/28 bg-success/12 text-success hover:bg-success/20"
                      >
                        <Check className="h-4 w-4" strokeWidth={2.5} />
                      </button>
                      <button
                        aria-label="Reject"
                        onClick={() => handleRejectVerification(v)}
                        className="flex h-8 w-8 items-center justify-center rounded-md border border-line-2 bg-bg-3 text-fg-3 hover:text-danger"
                      >
                        <X className="h-4 w-4" strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </Card>
          </section>
        )}

        {activeTab === "Users" && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-line-2 bg-bg-2/50 px-8 py-16 text-center">
            <Users className="h-10 w-10 text-fg-4" />
            <h3 className="mt-4 text-[16px] font-bold tracking-tighter">User management</h3>
            <p className="mt-2 text-[13px] text-fg-3">User search, bans, and role management coming soon.</p>
          </div>
        )}

        {activeTab === "Moderation log" && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-line-2 bg-bg-2/50 px-8 py-16 text-center">
            <ShieldAlert className="h-10 w-10 text-fg-4" />
            <h3 className="mt-4 text-[16px] font-bold tracking-tighter">Moderation log</h3>
            <p className="mt-2 text-[13px] text-fg-3">Full audit log of all moderation actions coming soon.</p>
          </div>
        )}
      </div>
    </AppShell>

    {/* Confirmation modal for flagged post actions */}
    {confirmAction && (
      <Modal
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        title={confirmLabels[confirmAction.kind].title}
      >
        <p className="text-[13.5px] leading-[1.5] text-fg-2">
          {confirmLabels[confirmAction.kind].desc}
        </p>
        <div className="mt-2 rounded-md border border-line-1 bg-bg-3 p-3">
          <div className="text-[12.5px] text-fg-3">
            <b className="font-semibold text-fg-1">@{confirmAction.post.author}</b> in #{confirmAction.post.community}
          </div>
          <p className="mt-1 line-clamp-2 text-[12.5px] text-fg-2">{confirmAction.post.excerpt}</p>
        </div>
        <div className="mt-5 flex justify-end gap-2.5">
          <Button variant="ghost" size="sm" onClick={() => setConfirmAction(null)}>
            Cancel
          </Button>
          <Button
            variant={confirmLabels[confirmAction.kind].variant}
            size="sm"
            onClick={handleConfirmAction}
          >
            {confirmLabels[confirmAction.kind].btn}
          </Button>
        </div>
      </Modal>
    )}

    {/* Demo action toast */}
    {toast && (
      <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-[fadeIn_0.2s_ease-out]">
        <div className="flex items-center gap-2.5 rounded-lg border border-warn/30 bg-[#1A1812] px-4 py-3 shadow-2xl">
          <AlertTriangle className="h-4 w-4 shrink-0 text-warn" />
          <span className="text-[13px] text-fg-2">{toast}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 text-fg-4 hover:text-fg-1"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    )}
    </>
  );
}

function StatCard({ stat }: { stat: AdminStat }) {
  const toneStyles = {
    up: "text-success",
    flat: "text-fg-3",
    warn: "text-warn",
  } as const;
  const icons = {
    users: Users,
    reports: Flag,
    verifications: BadgeCheck,
    communities: LayoutDashboard,
  } as const;
  const Icon = icons[stat.key as keyof typeof icons] ?? Users;

  return (
    <Card className="relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-[10px]",
            stat.tone === "warn"
              ? "bg-warn/12 text-warn"
              : "bg-brand-purple/15 text-[#C7B0FF]",
          )}
        >
          <Icon className="h-4.5 w-4.5" />
        </div>
        {stat.tone === "warn" && (
          <span className="flex h-2 w-2 rounded-full bg-warn shadow-[0_0_0_4px_rgba(255,181,71,0.15)]" />
        )}
      </div>
      <div className="mt-3 text-[26px] font-bold leading-none tracking-tighter tabular-nums">
        {stat.value}
      </div>
      <div className="mt-1.5 text-[12.5px] font-medium text-fg-2">
        {stat.label}
      </div>
      <div className={cn("mt-0.5 text-[11.5px]", toneStyles[stat.tone])}>
        {stat.delta}
      </div>
    </Card>
  );
}

function ReasonBadge({ reason, count }: { reason: string; count: number }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-danger/28 bg-danger/12 px-2.5 py-1 text-[11px] font-semibold text-danger">
      <Flag className="h-3 w-3" />
      {reason} · {count}
    </span>
  );
}
