import type { Metadata } from "next";
import {
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  Check,
  Flag,
  LayoutDashboard,
  ShieldAlert,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { UniBadge } from "@/components/ui/UniBadge";
import { WidgetCard } from "@/components/widgets/WidgetCard";
import {
  ADMIN_ACTIVITY,
  ADMIN_STATS,
  FLAGGED_POSTS,
  VERIFICATION_QUEUE,
  type AdminStat,
} from "@/lib/mock-data-admin";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Admin · UniVerse",
};

const ADMIN_NAV = [
  ["Overview", LayoutDashboard, true],
  ["Reports", Flag, false],
  ["Verification", BadgeCheck, false],
  ["Users", Users, false],
  ["Moderation log", ShieldAlert, false],
] as const;

export default function AdminPage() {
  return (
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
          {ADMIN_NAV.map(([label, Icon, active]) => (
            <button
              key={label}
              className={cn(
                "relative flex items-center gap-2 whitespace-nowrap px-3.5 py-2.5 text-[13.5px]",
                active
                  ? "font-semibold text-fg-1"
                  : "font-medium text-fg-3 hover:text-fg-2",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
              {active && (
                <span className="absolute inset-x-3 -bottom-px h-[2.5px] rounded bg-acc-gradient" />
              )}
            </button>
          ))}
        </nav>

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
              <button className="text-[12.5px] font-medium text-brand-blue hover:underline">
                View all reports →
              </button>
            </header>
            <div className="flex flex-col gap-3">
              {FLAGGED_POSTS.map((f) => (
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
                    >
                      Remove
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<X className="h-3.5 w-3.5" />}
                    >
                      Dismiss
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<ShieldAlert className="h-3.5 w-3.5" />}
                    >
                      Warn author
                    </Button>
                    <button className="ml-auto inline-flex items-center text-[12.5px] font-medium text-fg-3 hover:text-fg-1">
                      Open post
                      <ArrowUpRight className="ml-0.5 h-3.5 w-3.5" />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          </section>

          {/* Verification queue */}
          <section>
            <header className="mb-3 flex items-baseline justify-between px-1">
              <h2 className="text-[16px] font-bold tracking-tighter">
                Verification queue
              </h2>
              <button className="text-[12.5px] font-medium text-brand-blue hover:underline">
                See all
              </button>
            </header>
            <Card padded={false} className="overflow-hidden">
              {VERIFICATION_QUEUE.map((v, i) => (
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
                      className="flex h-8 w-8 items-center justify-center rounded-md border border-success/28 bg-success/12 text-success hover:bg-success/20"
                    >
                      <Check className="h-4 w-4" strokeWidth={2.5} />
                    </button>
                    <button
                      aria-label="Reject"
                      className="flex h-8 w-8 items-center justify-center rounded-md border border-line-2 bg-bg-3 text-fg-3 hover:text-danger"
                    >
                      <X className="h-4 w-4" strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              ))}
            </Card>
          </section>
        </div>
      </div>
    </AppShell>
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
