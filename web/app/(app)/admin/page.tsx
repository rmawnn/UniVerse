"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  Check,
  CheckCircle,
  Clock,
  Eye,
  Flag,
  LayoutDashboard,
  Loader2,
  Lock,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
  UserX,
  Users,
  WifiOff,
  X,
  XCircle,
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
  useAdminStats,
  useRecentActivity,
  useModerationQueue,
  useVerifications,
  useApproveVerification,
  useRejectVerification,
  useReports,
  useUpdateReportStatus,
  useAdminUsers,
  useDeactivateUser,
  useActivateUser,
  useChangeUserRole,
  useHidePost,
} from "@/lib/hooks/useAdmin";
import type {
  AdminVerification,
  AdminReport,
  AdminUser,
} from "@/lib/api/admin";
import { cn, formatRelativeTime, compactNumber } from "@/lib/utils";

type AdminTab =
  | "Overview"
  | "Reports"
  | "Verification"
  | "Users"
  | "Moderation log";

const ADMIN_NAV: { label: AdminTab; icon: typeof LayoutDashboard }[] = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Reports", icon: Flag },
  { label: "Verification", icon: BadgeCheck },
  { label: "Users", icon: Users },
  { label: "Moderation log", icon: ShieldAlert },
];

type ToastKind = "success" | "error" | "pending";

interface ToastState {
  message: string;
  kind: ToastKind;
}

export default function AdminPage() {
  const user = useAuthStore((s) => s.user);
  const isStaff = user?.role === "admin" || user?.role === "moderator";

  const [activeTab, setActiveTab] = useState<AdminTab>("Overview");
  const [toast, setToast] = useState<ToastState | null>(null);

  // Access control
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

  const showToast = (message: string, kind: ToastKind = "success") => {
    setToast({ message, kind });
    setTimeout(() => setToast(null), 4000);
  };

  return (
    <>
      <AppShell
        topBar={{
          breadcrumb: `Admin · ${user?.university_name ?? "Campus"}`,
          title: "Moderation dashboard",
          action: (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-warn/30 bg-warn/12 px-2.5 py-1 text-[11.5px] font-semibold text-warn">
              <ShieldAlert className="h-3.5 w-3.5" />
              Staff access
            </span>
          ),
        }}
        rightRail={<AdminRightRail />}
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
            <OverviewTab showToast={showToast} onSwitchTab={setActiveTab} />
          )}
          {activeTab === "Reports" && <ReportsTab showToast={showToast} />}
          {activeTab === "Verification" && (
            <VerificationTab showToast={showToast} />
          )}
          {activeTab === "Users" && <UsersTab showToast={showToast} />}
          {activeTab === "Moderation log" && <ModerationLogTab />}
        </div>
      </AppShell>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-[fadeIn_0.2s_ease-out]">
          <div
            className={cn(
              "flex items-center gap-2.5 rounded-lg border px-4 py-3 shadow-2xl",
              toast.kind === "success" &&
                "border-success/30 bg-[#121A14] text-success",
              toast.kind === "error" &&
                "border-danger/30 bg-[#1A1214] text-danger",
              toast.kind === "pending" &&
                "border-warn/30 bg-[#1A1812] text-warn",
            )}
          >
            {toast.kind === "success" && (
              <CheckCircle className="h-4 w-4 shrink-0" />
            )}
            {toast.kind === "error" && (
              <XCircle className="h-4 w-4 shrink-0" />
            )}
            {toast.kind === "pending" && (
              <Clock className="h-4 w-4 shrink-0" />
            )}
            <span className="text-[13px] text-fg-2">{toast.message}</span>
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

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  Right Rail
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function AdminRightRail() {
  const { data, isLoading } = useRecentActivity();

  return (
    <>
      <WidgetCard title="Recent moderation activity">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-fg-3" />
          </div>
        ) : (
          <>
            {(data?.latest_reports ?? []).slice(0, 4).map((a, i) => {
              const report = a as {
                id?: string;
                reporter_username?: string;
                reason?: string;
                target_type?: string;
                created_at?: string;
              };
              return (
                <div
                  key={report.id ?? i}
                  className="px-3 py-2.5"
                  style={{
                    borderTop: i ? "1px solid var(--line-1)" : "none",
                  }}
                >
                  <div className="text-[12.5px] leading-[1.4] text-fg-2">
                    <b className="font-semibold text-fg-1">
                      @{report.reporter_username ?? "user"}
                    </b>{" "}
                    reported a {report.target_type ?? "post"} for{" "}
                    {report.reason ?? "violation"}
                  </div>
                  <div className="mt-1 text-[11px] text-fg-4">
                    {report.created_at
                      ? formatRelativeTime(report.created_at)
                      : "recently"}
                  </div>
                </div>
              );
            })}
            {(!data?.latest_reports || data.latest_reports.length === 0) && (
              <div className="px-3 py-4 text-[12.5px] text-fg-3">
                No recent activity
              </div>
            )}
          </>
        )}
      </WidgetCard>
      <Card className="bg-[linear-gradient(135deg,rgba(255,90,106,0.10),rgba(255,181,71,0.06))] border-danger/18">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-danger">
          <AlertTriangle className="h-4 w-4" /> Escalations
        </div>
        <p className="mt-1.5 text-[12px] leading-[1.5] text-fg-2">
          Reports flagged by auto-mod need a staff review within the hour.
        </p>
        <Button variant="danger" size="sm" className="mt-3">
          Review escalations
        </Button>
      </Card>
    </>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  Overview Tab
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function OverviewTab({
  showToast,
  onSwitchTab,
}: {
  showToast: (msg: string, kind?: ToastKind) => void;
  onSwitchTab: (tab: AdminTab) => void;
}) {
  const {
    data: stats,
    isLoading: statsLoading,
    isError: statsError,
    refetch: refetchStats,
  } = useAdminStats();
  const { data: queue, isLoading: queueLoading } = useModerationQueue();

  const approveMutation = useApproveVerification();
  const rejectMutation = useRejectVerification();

  const handleApprove = async (v: AdminVerification) => {
    try {
      await approveMutation.mutateAsync(v.id);
      showToast(`${v.full_name} verification approved`, "success");
    } catch {
      showToast("Failed to approve verification", "error");
    }
  };

  const handleReject = async (v: AdminVerification) => {
    try {
      await rejectMutation.mutateAsync({ verificationId: v.id });
      showToast(`${v.full_name} verification rejected`, "success");
    } catch {
      showToast("Failed to reject verification", "error");
    }
  };

  return (
    <>
      {/* Stat cards */}
      {statsLoading ? (
        <div className="mb-7 flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-brand-purple" />
        </div>
      ) : statsError ? (
        <div className="mb-7 flex flex-col items-center justify-center gap-2 py-8">
          <WifiOff className="h-6 w-6 text-fg-3" />
          <p className="text-[13px] text-fg-2">Failed to load statistics</p>
          <Button
            variant="ghost"
            size="sm"
            icon={<RefreshCw className="h-3.5 w-3.5" />}
            onClick={() => refetchStats()}
          >
            Retry
          </Button>
        </div>
      ) : stats ? (
        <div className="mb-7 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={Users}
            label="Verified students"
            value={compactNumber(stats.verified_students)}
            delta={`+${stats.users_this_week} this week`}
            tone="up"
          />
          <StatCard
            icon={Flag}
            label="Open reports"
            value={String(stats.pending_reports)}
            delta={`${stats.reports_this_week} new this week`}
            tone={stats.pending_reports > 0 ? "warn" : "flat"}
            warn={stats.pending_reports > 0}
          />
          <StatCard
            icon={BadgeCheck}
            label="Pending verifications"
            value={String(stats.pending_verifications)}
            delta={`${stats.verifications_this_week} this week`}
            tone={stats.pending_verifications > 10 ? "warn" : "flat"}
            warn={stats.pending_verifications > 10}
          />
          <StatCard
            icon={LayoutDashboard}
            label="Active communities"
            value={compactNumber(stats.active_communities)}
            delta={`+${stats.communities_this_week} this week`}
            tone="up"
          />
        </div>
      ) : null}

      {/* Two-column work area */}
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Recent reports */}
        <section>
          <header className="mb-3 flex items-baseline justify-between px-1">
            <h2 className="text-[16px] font-bold tracking-tighter">
              Recent reports
            </h2>
            <button
              onClick={() => onSwitchTab("Reports")}
              className="text-[12.5px] font-medium text-brand-blue hover:underline"
            >
              View all reports →
            </button>
          </header>
          <OverviewReports showToast={showToast} />
        </section>

        {/* Verification queue */}
        <section>
          <header className="mb-3 flex items-baseline justify-between px-1">
            <h2 className="text-[16px] font-bold tracking-tighter">
              Verification queue
            </h2>
            <button
              onClick={() => onSwitchTab("Verification")}
              className="text-[12.5px] font-medium text-brand-blue hover:underline"
            >
              See all
            </button>
          </header>
          <Card padded={false} className="overflow-hidden">
            {queueLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-brand-purple" />
              </div>
            ) : !queue?.pending_verifications?.length ? (
              <div className="py-8 text-center text-[13px] text-fg-3">
                No pending verifications
              </div>
            ) : (
              queue.pending_verifications.slice(0, 5).map((v, i) => (
                <div
                  key={v.id}
                  className={cn(
                    "flex items-center gap-3 p-3.5",
                    i && "border-t border-line-1",
                  )}
                >
                  <Avatar name={v.full_name} size={38} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold">
                      {v.full_name}
                    </div>
                    <div className="truncate text-[11.5px] text-fg-3">
                      {v.university_email ?? v.username}
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      {v.university_name && (
                        <UniBadge university={v.university_name} compact />
                      )}
                      <span className="text-[10.5px] text-fg-4">
                        {v.verification_method} ·{" "}
                        {formatRelativeTime(v.created_at)}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <button
                      aria-label="Approve"
                      onClick={() => handleApprove(v)}
                      disabled={approveMutation.isPending}
                      className="flex h-8 w-8 items-center justify-center rounded-md border border-success/28 bg-success/12 text-success hover:bg-success/20 disabled:opacity-50"
                    >
                      <Check className="h-4 w-4" strokeWidth={2.5} />
                    </button>
                    <button
                      aria-label="Reject"
                      onClick={() => handleReject(v)}
                      disabled={rejectMutation.isPending}
                      className="flex h-8 w-8 items-center justify-center rounded-md border border-line-2 bg-bg-3 text-fg-3 hover:text-danger disabled:opacity-50"
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
  );
}

function OverviewReports({
  showToast,
}: {
  showToast: (msg: string, kind?: ToastKind) => void;
}) {
  const { data, isLoading } = useReports(1, 5, "pending");
  const updateStatus = useUpdateReportStatus();

  const handleDismiss = async (report: AdminReport) => {
    try {
      await updateStatus.mutateAsync({
        reportId: report.id,
        status: "dismissed",
      });
      showToast("Report dismissed", "success");
    } catch {
      showToast("Failed to dismiss report", "error");
    }
  };

  const handleAction = async (report: AdminReport) => {
    try {
      await updateStatus.mutateAsync({
        reportId: report.id,
        status: "action_taken",
      });
      showToast("Action taken on report", "success");
    } catch {
      showToast("Failed to take action", "error");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-brand-purple" />
      </div>
    );
  }

  const reports = data?.items ?? [];

  if (reports.length === 0) {
    return (
      <Card className="py-8 text-center text-[13px] text-fg-3">
        No open reports — all clear!
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {reports.map((r) => (
        <Card key={r.id} className="p-4">
          <div className="flex items-center gap-2.5">
            <Avatar name={r.reporter_username} size={32} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-[13px]">
                <span className="font-semibold">@{r.reporter_username}</span>
                <span className="text-fg-4">reported</span>
                <span className="font-medium text-brand-blue">
                  {r.target_type}
                </span>
              </div>
              <div className="text-[11px] text-fg-4">
                {formatRelativeTime(r.created_at)}
              </div>
            </div>
            <ReasonBadge reason={r.reason} />
          </div>
          <p className="mt-3 line-clamp-2 rounded-md border-l-2 border-danger/40 bg-danger/[0.05] px-3 py-2 text-[13px] leading-[1.5] text-fg-2">
            {r.target_label}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="danger"
              size="sm"
              icon={<Trash2 className="h-3.5 w-3.5" />}
              onClick={() => handleAction(r)}
              disabled={updateStatus.isPending}
            >
              Take action
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={<X className="h-3.5 w-3.5" />}
              onClick={() => handleDismiss(r)}
              disabled={updateStatus.isPending}
            >
              Dismiss
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  Reports Tab
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function ReportsTab({
  showToast,
}: {
  showToast: (msg: string, kind?: ToastKind) => void;
}) {
  const [statusFilter, setStatusFilter] = useState<string | undefined>(
    undefined,
  );
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, refetch } = useReports(
    page,
    20,
    statusFilter,
  );
  const updateStatus = useUpdateReportStatus();

  const handleAction = async (
    reportId: string,
    status: "reviewed" | "dismissed" | "action_taken",
    label: string,
  ) => {
    try {
      await updateStatus.mutateAsync({ reportId, status });
      showToast(label, "success");
    } catch {
      showToast(`Failed: ${label}`, "error");
    }
  };

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[16px] font-bold tracking-tighter">All reports</h2>
        <div className="flex gap-1.5">
          {(
            [
              ["All", undefined],
              ["Pending", "pending"],
              ["Dismissed", "dismissed"],
              ["Actioned", "action_taken"],
            ] as [string, string | undefined][]
          ).map(([label, value]) => (
            <button
              key={label}
              onClick={() => {
                setStatusFilter(value);
                setPage(1);
              }}
              className={cn(
                "rounded-full px-3 py-1 text-[12px] font-medium transition-colors",
                statusFilter === value
                  ? "bg-acc-gradient text-white"
                  : "bg-bg-3 text-fg-3 hover:text-fg-1",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-brand-purple" />
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : !data?.items.length ? (
        <Card className="py-8 text-center text-[13px] text-fg-3">
          No reports found
        </Card>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {data.items.map((r) => (
              <Card key={r.id} className="p-4">
                <div className="flex items-center gap-2.5">
                  <Avatar name={r.reporter_username} size={32} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-[13px]">
                      <span className="font-semibold">
                        @{r.reporter_username}
                      </span>
                      <span className="text-fg-4">reported</span>
                      <span className="font-medium text-brand-blue">
                        {r.target_type}
                      </span>
                    </div>
                    <div className="text-[11px] text-fg-4">
                      {formatRelativeTime(r.created_at)}
                      {r.reviewed_at && (
                        <span>
                          {" "}
                          · Reviewed {formatRelativeTime(r.reviewed_at)}
                        </span>
                      )}
                    </div>
                  </div>
                  <ReasonBadge reason={r.reason} />
                  <StatusBadge status={r.status} />
                </div>
                <p className="mt-3 line-clamp-2 rounded-md border-l-2 border-danger/40 bg-danger/[0.05] px-3 py-2 text-[13px] leading-[1.5] text-fg-2">
                  {r.target_label}
                </p>
                {r.status === "pending" && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      variant="danger"
                      size="sm"
                      icon={<Trash2 className="h-3.5 w-3.5" />}
                      onClick={() =>
                        handleAction(r.id, "action_taken", "Action taken")
                      }
                      disabled={updateStatus.isPending}
                    >
                      Take action
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Eye className="h-3.5 w-3.5" />}
                      onClick={() =>
                        handleAction(r.id, "reviewed", "Report reviewed")
                      }
                      disabled={updateStatus.isPending}
                    >
                      Mark reviewed
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<X className="h-3.5 w-3.5" />}
                      onClick={() =>
                        handleAction(r.id, "dismissed", "Report dismissed")
                      }
                      disabled={updateStatus.isPending}
                    >
                      Dismiss
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
          {data.total_pages > 1 && (
            <Pagination
              page={page}
              totalPages={data.total_pages}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </section>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  Verification Tab
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function VerificationTab({
  showToast,
}: {
  showToast: (msg: string, kind?: ToastKind) => void;
}) {
  const [statusFilter, setStatusFilter] = useState<string | undefined>(
    "pending",
  );
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rejectModal, setRejectModal] = useState<AdminVerification | null>(
    null,
  );
  const [rejectReason, setRejectReason] = useState("");

  const { data, isLoading, isError, refetch } = useVerifications(
    page,
    20,
    statusFilter,
    undefined,
    search || undefined,
  );
  const approveMutation = useApproveVerification();
  const rejectMutation = useRejectVerification();

  const handleApprove = async (v: AdminVerification) => {
    try {
      await approveMutation.mutateAsync(v.id);
      showToast(`${v.full_name} approved`, "success");
    } catch {
      showToast("Failed to approve", "error");
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectModal) return;
    try {
      await rejectMutation.mutateAsync({
        verificationId: rejectModal.id,
        reason: rejectReason || undefined,
      });
      showToast(`${rejectModal.full_name} rejected`, "success");
    } catch {
      showToast("Failed to reject", "error");
    } finally {
      setRejectModal(null);
      setRejectReason("");
    }
  };

  return (
    <>
      <section>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-[16px] font-bold tracking-tighter">
            Verification queue
          </h2>
          <div className="flex items-center gap-3">
            <div className="flex h-8 items-center gap-2 rounded-md border border-line-2 bg-bg-2 px-2.5 text-[12.5px]">
              <Search className="h-3.5 w-3.5 text-fg-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by name or email…"
                className="h-full w-[180px] bg-transparent text-fg-1 placeholder:text-fg-3 focus:outline-none"
              />
            </div>
            <div className="flex gap-1.5">
              {(
                [
                  ["Pending", "pending"],
                  ["Approved", "approved"],
                  ["Rejected", "rejected"],
                  ["All", undefined],
                ] as [string, string | undefined][]
              ).map(([label, value]) => (
                <button
                  key={label}
                  onClick={() => {
                    setStatusFilter(value);
                    setPage(1);
                  }}
                  className={cn(
                    "rounded-full px-3 py-1 text-[12px] font-medium transition-colors",
                    statusFilter === value
                      ? "bg-acc-gradient text-white"
                      : "bg-bg-3 text-fg-3 hover:text-fg-1",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-brand-purple" />
          </div>
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : !data?.items.length ? (
          <Card className="py-8 text-center text-[13px] text-fg-3">
            {search
              ? "No verifications match your search"
              : "No verifications found"}
          </Card>
        ) : (
          <>
            <Card padded={false} className="overflow-hidden">
              {data.items.map((v, i) => (
                <div
                  key={v.id}
                  className={cn(
                    "flex items-center gap-3 p-3.5",
                    i && "border-t border-line-1",
                  )}
                >
                  <Avatar name={v.full_name} size={38} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-[13px] font-semibold">
                        {v.full_name}
                      </span>
                      <StatusBadge status={v.status} />
                    </div>
                    <div className="truncate text-[11.5px] text-fg-3">
                      {v.university_email ?? `@${v.username}`}
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      {v.university_name && (
                        <UniBadge university={v.university_name} compact />
                      )}
                      <span className="text-[10.5px] text-fg-4">
                        {v.verification_method} ·{" "}
                        {formatRelativeTime(v.created_at)}
                      </span>
                    </div>
                    {v.rejection_reason && (
                      <div className="mt-1.5 text-[11.5px] text-danger">
                        Reason: {v.rejection_reason}
                      </div>
                    )}
                  </div>
                  {v.status === "pending" && (
                    <div className="flex shrink-0 gap-1.5">
                      <button
                        aria-label="Approve"
                        onClick={() => handleApprove(v)}
                        disabled={approveMutation.isPending}
                        className="flex h-8 w-8 items-center justify-center rounded-md border border-success/28 bg-success/12 text-success hover:bg-success/20 disabled:opacity-50"
                      >
                        <Check className="h-4 w-4" strokeWidth={2.5} />
                      </button>
                      <button
                        aria-label="Reject"
                        onClick={() => setRejectModal(v)}
                        disabled={rejectMutation.isPending}
                        className="flex h-8 w-8 items-center justify-center rounded-md border border-line-2 bg-bg-3 text-fg-3 hover:text-danger disabled:opacity-50"
                      >
                        <X className="h-4 w-4" strokeWidth={2.5} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </Card>
            {data.total_pages > 1 && (
              <Pagination
                page={page}
                totalPages={data.total_pages}
                onPageChange={setPage}
              />
            )}
          </>
        )}
      </section>

      {/* Reject with reason modal */}
      {rejectModal && (
        <Modal
          open={!!rejectModal}
          onClose={() => {
            setRejectModal(null);
            setRejectReason("");
          }}
          title="Reject verification"
        >
          <p className="text-[13.5px] leading-[1.5] text-fg-2">
            Reject {rejectModal.full_name}&rsquo;s verification request? You
            can optionally provide a reason.
          </p>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Optional rejection reason…"
            rows={3}
            className="mt-3 w-full resize-none rounded-md border border-line-2 bg-bg-3 px-3 py-2.5 text-[13px] text-fg-1 placeholder:text-fg-3 focus:border-brand-purple focus:outline-none"
          />
          <div className="mt-5 flex justify-end gap-2.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setRejectModal(null);
                setRejectReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleRejectConfirm}
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending ? "Rejecting…" : "Reject"}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  Users Tab
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function UsersTab({
  showToast,
}: {
  showToast: (msg: string, kind?: ToastKind) => void;
}) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [actionUser, setActionUser] = useState<AdminUser | null>(null);

  const { data, isLoading, isError, refetch } = useAdminUsers(
    page,
    20,
    search || undefined,
    undefined,
    undefined,
    roleFilter,
  );

  const deactivate = useDeactivateUser();
  const activate = useActivateUser();
  const changeRole = useChangeUserRole();

  const handleDeactivate = async (u: AdminUser) => {
    try {
      await deactivate.mutateAsync(u.id);
      showToast(`@${u.username} deactivated`, "success");
      setActionUser(null);
    } catch {
      showToast("Failed to deactivate user", "error");
    }
  };

  const handleActivate = async (u: AdminUser) => {
    try {
      await activate.mutateAsync(u.id);
      showToast(`@${u.username} activated`, "success");
      setActionUser(null);
    } catch {
      showToast("Failed to activate user", "error");
    }
  };

  return (
    <>
      <section>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-[16px] font-bold tracking-tighter">
            User management
          </h2>
          <div className="flex items-center gap-3">
            <div className="flex h-8 items-center gap-2 rounded-md border border-line-2 bg-bg-2 px-2.5 text-[12.5px]">
              <Search className="h-3.5 w-3.5 text-fg-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search users…"
                className="h-full w-[160px] bg-transparent text-fg-1 placeholder:text-fg-3 focus:outline-none"
              />
            </div>
            <div className="flex gap-1.5">
              {(
                [
                  ["All", undefined],
                  ["Admin", "admin"],
                  ["Moderator", "moderator"],
                  ["User", "student"],
                ] as [string, string | undefined][]
              ).map(([label, value]) => (
                <button
                  key={label}
                  onClick={() => {
                    setRoleFilter(value);
                    setPage(1);
                  }}
                  className={cn(
                    "rounded-full px-3 py-1 text-[12px] font-medium transition-colors",
                    roleFilter === value
                      ? "bg-acc-gradient text-white"
                      : "bg-bg-3 text-fg-3 hover:text-fg-1",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-brand-purple" />
          </div>
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : !data?.items.length ? (
          <Card className="py-8 text-center text-[13px] text-fg-3">
            {search ? "No users match your search" : "No users found"}
          </Card>
        ) : (
          <>
            <Card padded={false} className="overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-[1fr_120px_100px_80px_80px] gap-4 border-b border-line-1 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-fg-4">
                <span>User</span>
                <span>Role</span>
                <span>Verified</span>
                <span>Status</span>
                <span>Actions</span>
              </div>
              {data.items.map((u, i) => (
                <div
                  key={u.id}
                  className={cn(
                    "grid grid-cols-[1fr_120px_100px_80px_80px] items-center gap-4 px-4 py-3",
                    i && "border-t border-line-1",
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Avatar name={u.full_name} size={32} />
                    <div className="min-w-0">
                      <div className="truncate text-[13px] font-semibold">
                        {u.full_name}
                      </div>
                      <div className="truncate text-[11px] text-fg-3">
                        @{u.username} · {u.email}
                      </div>
                    </div>
                  </div>
                  <div>
                    <RoleBadge role={u.role} />
                  </div>
                  <div>
                    {u.is_verified_student ? (
                      <span className="inline-flex items-center gap-1 text-[11.5px] text-success">
                        <BadgeCheck className="h-3.5 w-3.5" /> Verified
                      </span>
                    ) : (
                      <span className="text-[11.5px] text-fg-4">No</span>
                    )}
                  </div>
                  <div>
                    {u.is_active ? (
                      <span className="text-[11.5px] text-success">Active</span>
                    ) : (
                      <span className="text-[11.5px] text-danger">
                        Suspended
                      </span>
                    )}
                  </div>
                  <div>
                    <button
                      onClick={() => setActionUser(u)}
                      className="rounded-md border border-line-2 bg-bg-3 px-2 py-1 text-[11px] font-medium text-fg-2 hover:text-fg-1"
                    >
                      Manage
                    </button>
                  </div>
                </div>
              ))}
            </Card>
            {data.total_pages > 1 && (
              <Pagination
                page={page}
                totalPages={data.total_pages}
                onPageChange={setPage}
              />
            )}
          </>
        )}
      </section>

      {/* User action modal */}
      {actionUser && (
        <Modal
          open={!!actionUser}
          onClose={() => setActionUser(null)}
          title={`Manage @${actionUser.username}`}
        >
          <div className="flex items-center gap-3 rounded-md border border-line-1 bg-bg-3 p-3">
            <Avatar name={actionUser.full_name} size={40} />
            <div>
              <div className="text-[14px] font-semibold">
                {actionUser.full_name}
              </div>
              <div className="text-[12px] text-fg-3">
                @{actionUser.username} · {actionUser.email}
              </div>
              <div className="mt-1 flex items-center gap-2">
                <RoleBadge role={actionUser.role} />
                {actionUser.is_verified_student && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-success">
                    <BadgeCheck className="h-3 w-3" /> Verified
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2">
            {actionUser.is_active ? (
              <Button
                variant="danger"
                size="sm"
                icon={<UserX className="h-3.5 w-3.5" />}
                onClick={() => handleDeactivate(actionUser)}
                disabled={deactivate.isPending}
              >
                {deactivate.isPending ? "Suspending…" : "Suspend user"}
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                icon={<Check className="h-3.5 w-3.5" />}
                onClick={() => handleActivate(actionUser)}
                disabled={activate.isPending}
              >
                {activate.isPending ? "Activating…" : "Reactivate user"}
              </Button>
            )}

            {actionUser.role !== "admin" && (
              <Button
                variant="ghost"
                size="sm"
                icon={<ShieldAlert className="h-3.5 w-3.5" />}
                onClick={async () => {
                  const newRole =
                    actionUser.role === "moderator" ? "student" : "moderator";
                  try {
                    await changeRole.mutateAsync({
                      userId: actionUser.id,
                      role: newRole,
                    });
                    showToast(
                      `@${actionUser.username} role changed to ${newRole}`,
                      "success",
                    );
                    setActionUser(null);
                  } catch {
                    showToast("Failed to change role", "error");
                  }
                }}
                disabled={changeRole.isPending}
              >
                {actionUser.role === "moderator"
                  ? "Remove moderator"
                  : "Make moderator"}
              </Button>
            )}
          </div>

          <div className="mt-4 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActionUser(null)}
            >
              Close
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  Moderation Log Tab
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function ModerationLogTab() {
  const { data: activity, isLoading } = useRecentActivity();

  const allActivity = [
    ...(activity?.latest_reports ?? []).map((r) => {
      const report = r as {
        id?: string;
        reporter_username?: string;
        reason?: string;
        target_type?: string;
        status?: string;
        created_at?: string;
        reviewed_at?: string;
      };
      return {
        id: report.id ?? crypto.randomUUID(),
        actor: report.reporter_username ?? "System",
        action: `reported a ${report.target_type ?? "post"} for ${report.reason ?? "violation"} — ${report.status ?? "pending"}`,
        time: report.reviewed_at ?? report.created_at ?? new Date().toISOString(),
        type: "report" as const,
      };
    }),
    ...(activity?.latest_verifications ?? []).map((v) => {
      const verif = v as {
        id?: string;
        full_name?: string;
        status?: string;
        created_at?: string;
        verified_at?: string;
      };
      return {
        id: verif.id ?? crypto.randomUUID(),
        actor: "System",
        action: `${verif.full_name ?? "User"} verification ${verif.status ?? "submitted"}`,
        time: verif.verified_at ?? verif.created_at ?? new Date().toISOString(),
        type: "verification" as const,
      };
    }),
  ].sort(
    (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime(),
  );

  return (
    <section>
      <h2 className="mb-4 text-[16px] font-bold tracking-tighter">
        Moderation log
      </h2>
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-brand-purple" />
        </div>
      ) : allActivity.length === 0 ? (
        <Card className="py-8 text-center text-[13px] text-fg-3">
          No moderation activity yet
        </Card>
      ) : (
        <Card padded={false} className="overflow-hidden">
          {allActivity.map((a, i) => (
            <div
              key={a.id}
              className={cn("flex items-start gap-3 px-4 py-3", i && "border-t border-line-1")}
            >
              <div
                className={cn(
                  "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                  a.type === "report"
                    ? "bg-danger/12 text-danger"
                    : "bg-brand-purple/15 text-brand-purple",
                )}
              >
                {a.type === "report" ? (
                  <Flag className="h-3.5 w-3.5" />
                ) : (
                  <BadgeCheck className="h-3.5 w-3.5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] leading-[1.4] text-fg-2">
                  <b className="font-semibold text-fg-1">{a.actor}</b>{" "}
                  {a.action}
                </div>
                <div className="mt-0.5 text-[11px] text-fg-4">
                  {formatRelativeTime(a.time)}
                </div>
              </div>
            </div>
          ))}
        </Card>
      )}
    </section>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  Shared components
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function StatCard({
  icon: Icon,
  label,
  value,
  delta,
  tone,
  warn,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  delta: string;
  tone: "up" | "flat" | "warn";
  warn?: boolean;
}) {
  const toneStyles = {
    up: "text-success",
    flat: "text-fg-3",
    warn: "text-warn",
  } as const;

  return (
    <Card className="relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-[10px]",
            warn
              ? "bg-warn/12 text-warn"
              : "bg-brand-purple/15 text-[#C7B0FF]",
          )}
        >
          <Icon className="h-4.5 w-4.5" />
        </div>
        {warn && (
          <span className="flex h-2 w-2 rounded-full bg-warn shadow-[0_0_0_4px_rgba(255,181,71,0.15)]" />
        )}
      </div>
      <div className="mt-3 text-[26px] font-bold leading-none tracking-tighter tabular-nums">
        {value}
      </div>
      <div className="mt-1.5 text-[12.5px] font-medium text-fg-2">{label}</div>
      <div className={cn("mt-0.5 text-[11.5px]", toneStyles[tone])}>
        {delta}
      </div>
    </Card>
  );
}

function ReasonBadge({ reason }: { reason: string }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-danger/28 bg-danger/12 px-2.5 py-1 text-[11px] font-semibold text-danger">
      <Flag className="h-3 w-3" />
      {reason}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "border-warn/28 bg-warn/12 text-warn",
    approved: "border-success/28 bg-success/12 text-success",
    rejected: "border-danger/28 bg-danger/12 text-danger",
    reviewed: "border-brand-blue/28 bg-brand-blue/12 text-brand-blue",
    dismissed: "border-fg-4/28 bg-bg-3 text-fg-3",
    action_taken: "border-danger/28 bg-danger/12 text-danger",
  };
  return (
    <span
      className={cn(
        "inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold capitalize",
        styles[status] ?? "border-line-2 bg-bg-3 text-fg-3",
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    admin: "border-brand-purple/28 bg-brand-purple/12 text-brand-purple",
    moderator: "border-brand-blue/28 bg-brand-blue/12 text-brand-blue",
  };
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2 py-0.5 text-[10.5px] font-semibold capitalize",
        styles[role] ?? "border-line-2 bg-bg-3 text-fg-3",
      )}
    >
      {role}
    </span>
  );
}

function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  return (
    <div className="mt-4 flex items-center justify-center gap-2">
      <button
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page <= 1}
        className="rounded-md border border-line-2 bg-bg-3 px-3 py-1.5 text-[12px] font-medium text-fg-2 disabled:opacity-40"
      >
        Previous
      </button>
      <span className="text-[12px] text-fg-3">
        Page {page} of {totalPages}
      </span>
      <button
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages}
        className="rounded-md border border-line-2 bg-bg-3 px-3 py-1.5 text-[12px] font-medium text-fg-2 disabled:opacity-40"
      >
        Next
      </button>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line-2 bg-bg-2/50 py-12">
      <WifiOff className="h-8 w-8 text-fg-4" />
      <p className="text-[14px] text-fg-2">Failed to load data</p>
      <Button
        variant="ghost"
        size="sm"
        icon={<RefreshCw className="h-3.5 w-3.5" />}
        onClick={onRetry}
      >
        Retry
      </Button>
    </div>
  );
}
