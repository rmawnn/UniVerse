"use client";

import { useState } from "react";
import { Calendar, Flame, MapPin, Search, ShieldCheck, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { UniBadge } from "@/components/ui/UniBadge";
import { PostCard } from "@/components/post/PostCard";
import { CommunityCard } from "@/components/community/CommunityCard";
import { WidgetCard } from "@/components/widgets/WidgetCard";
import { COMMUNITIES, SAMPLE_POSTS, TRENDING, CAMPUS_EVENTS } from "@/lib/mock-data";
import { SEARCH_PEOPLE } from "@/lib/mock-data-extra";
import { compactNumber } from "@/lib/utils";

const TABS = ["Trending", "Communities", "People", "Events"] as const;
type Tab = (typeof TABS)[number];

export default function ExplorePage() {
  const [tab, setTab] = useState<Tab>("Trending");

  return (
    <AppShell
      topBar={{ breadcrumb: "Discover", title: "Explore" }}
      rightRail={
        <>
          <WidgetCard title="Trending tags">
            {TRENDING.map((t, i) => (
              <div
                key={t.tag}
                className="flex items-center gap-2.5 px-3 py-2.5"
                style={{ borderTop: i ? "1px solid var(--line-1)" : "none" }}
              >
                <span className="w-5 font-mono text-[12px] text-fg-3">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-semibold">
                    {t.tag}
                  </div>
                  <div className="text-[11px] text-fg-3">
                    {compactNumber(t.posts)} posts
                  </div>
                </div>
                {t.hot && <Flame className="h-3.5 w-3.5 text-warn" />}
              </div>
            ))}
          </WidgetCard>
        </>
      }
    >
      <div className="mx-auto max-w-[760px] px-4 py-5 sm:px-8 sm:py-6">
        {/* Explore header / search */}
        <div className="mb-5 overflow-hidden rounded-lg border border-brand-purple/22 bg-[linear-gradient(135deg,rgba(155,108,255,0.16),rgba(79,143,247,0.08))] p-5">
          <div className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-[#C7B0FF]">
            <TrendingUp className="h-3.5 w-3.5" /> What&rsquo;s moving on campus
          </div>
          <h2 className="mt-2 text-[22px] font-bold tracking-tighter">
            Explore UniVerse
          </h2>
          <div className="mt-3 flex h-11 items-center gap-2.5 rounded-md border border-line-2 bg-bg-1/60 px-3.5 text-[14px] text-fg-3 backdrop-blur">
            <Search className="h-4 w-4" />
            <span>Search posts, people, communities, events…</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-5 flex gap-6 border-b border-line-1">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative -mb-px py-2.5 pb-3.5 text-[14px] transition-colors ${
                tab === t
                  ? "font-semibold text-fg-1"
                  : "font-medium text-fg-3 hover:text-fg-2"
              }`}
            >
              {t}
              {tab === t && (
                <span className="absolute inset-x-0 -bottom-px h-[2.5px] rounded bg-acc-gradient" />
              )}
            </button>
          ))}
        </div>

        {/* Trending posts */}
        {tab === "Trending" &&
          SAMPLE_POSTS.map((p) => <PostCard key={p.id} post={p} />)}

        {/* Communities */}
        {tab === "Communities" && (
          <div className="grid gap-3.5 sm:grid-cols-2">
            {COMMUNITIES.map((c) => (
              <CommunityCard key={c.id} community={c} />
            ))}
          </div>
        )}

        {/* People */}
        {tab === "People" && (
          <div className="grid gap-3 sm:grid-cols-2">
            {SEARCH_PEOPLE.concat(SEARCH_PEOPLE).slice(0, 6).map(({ user, sub }, i) => (
              <Card key={user.id + i}>
                <div className="flex items-center gap-3">
                  <Avatar name={user.name} size={48} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <span className="truncate text-[14px] font-semibold">
                        {user.name}
                      </span>
                      {user.verified && (
                        <ShieldCheck className="h-3 w-3 text-verified" />
                      )}
                    </div>
                    <div className="mt-0.5 truncate text-[12px] text-fg-3">
                      {sub}
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <UniBadge university={user.university} compact />
                  <Button variant="soft" size="sm">
                    Follow
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Events */}
        {tab === "Events" && (
          <div className="flex flex-col gap-3">
            {CAMPUS_EVENTS.map((e) => (
              <Card key={e.id} className="flex items-center gap-4">
                <div className="flex w-14 shrink-0 flex-col items-center rounded-md bg-bg-3 py-2">
                  <span className="text-[10px] font-bold tracking-[0.06em] text-brand-purple">
                    {e.day}
                  </span>
                  <span className="text-[20px] font-bold leading-tight">
                    {e.date}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-semibold tracking-tightish">
                    {e.title}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-fg-3">
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" /> {e.when}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" /> {e.where}
                    </span>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  RSVP
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
