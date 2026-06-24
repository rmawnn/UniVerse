"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Camera,
  Check,
  Copy,
  Flag,
  Link as LinkIcon,
  Loader2,
  Mail,
  MapPin,
  MoreVertical,
  Pencil,
  Plus,
  RefreshCw,
  School,
  ShieldCheck,
  ShieldOff,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProfileStat } from "@/components/profile/ProfileStat";
import { FeedPostCard } from "@/components/post/FeedPostCard";
import { ReportModal } from "@/components/post/ReportModal";
import { WidgetCard } from "@/components/widgets/WidgetCard";
import {
  getProfileByUsername,
  getUserPosts,
  followUser,
  unfollowUser,
} from "@/lib/api/users";
import { updateProfile, uploadAvatar, uploadCover } from "@/lib/api/settings";
import { createConversation } from "@/lib/api/conversations";
import { useAuthStore } from "@/lib/stores/auth-store";
import { compactNumber } from "@/lib/utils";

interface PageProps {
  params: { username: string };
}

const TABS = [
  { key: "posts", label: "Posts" },
  { key: "communities", label: "Communities" },
] as const;

export default function ProfilePage({ params }: PageProps) {
  const username = params.username;
  const qc = useQueryClient();
  const me = useAuthStore((s) => s.user);
  const isOwnProfile = me?.username === username;
  const [activeTab, setActiveTab] = useState<string>("posts");

  /* ── User profile ─────────────────────────────────────── */
  const {
    data: profile,
    isLoading: profileLoading,
    isError: profileError,
    refetch: refetchProfile,
  } = useQuery({
    queryKey: ["profile", username],
    queryFn: () => getProfileByUsername(username),
    staleTime: 5 * 60_000,
  });

  /* ── User posts ───────────────────────────────────────── */
  const { data: postsData, isLoading: postsLoading } = useQuery({
    queryKey: ["profile", username, "posts"],
    queryFn: () => getUserPosts(profile!.id),
    enabled: !!profile,
    staleTime: 5 * 60_000,
  });

  const posts = postsData?.items ?? [];

  /* ── Follow / Unfollow ────────────────────────────────── */
  const followMut = useMutation({
    mutationFn: () => followUser(profile!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile", username] });
    },
  });

  const unfollowMut = useMutation({
    mutationFn: () => unfollowUser(profile!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile", username] });
    },
  });

  const followBusy = followMut.isPending || unfollowMut.isPending;

  /* ── Message ─────────────────────────────────────────── */
  const router = useRouter();
  const [messageBusy, setMessageBusy] = useState(false);
  const handleMessage = useCallback(async () => {
    if (!profile || messageBusy) return;
    setMessageBusy(true);
    try {
      const conv = await createConversation(profile.id);
      router.push(`/messages/${conv.id}`);
    } catch {
      router.push("/messages");
    } finally {
      setMessageBusy(false);
    }
  }, [profile, messageBusy, router]);

  /* ── More menu ───────────────────────────────────────── */
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
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

  /* ── Avatar upload ───────────────────────────────────── */
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const setUser = useAuthStore((s) => s.setUser);

  const handleAvatarChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setAvatarUploading(true);
      try {
        const url = await uploadAvatar(file);
        const updated = await updateProfile({ profile_image_url: url });
        setUser(updated);
        qc.invalidateQueries({ queryKey: ["profile", username] });
      } catch {
      } finally {
        setAvatarUploading(false);
        if (avatarInputRef.current) avatarInputRef.current.value = "";
      }
    },
    [qc, username, setUser],
  );

  /* ── Cover upload ────────────────────────────────────── */
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [coverUploading, setCoverUploading] = useState(false);

  const handleCoverChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setCoverUploading(true);
      try {
        const url = await uploadCover(file);
        await updateProfile({ cover_image_url: url });
        qc.invalidateQueries({ queryKey: ["profile", username] });
      } catch {
      } finally {
        setCoverUploading(false);
        if (coverInputRef.current) coverInputRef.current.value = "";
      }
    },
    [qc, username],
  );

  /* ── Skills editing ──────────────────────────────────── */
  const [editingSkills, setEditingSkills] = useState(false);
  const [skillInput, setSkillInput] = useState("");
  const [pendingSkills, setPendingSkills] = useState<string[]>([]);
  const [skillsSaving, setSkillsSaving] = useState(false);

  const startEditSkills = useCallback(() => {
    setPendingSkills(profile?.skills ?? []);
    setSkillInput("");
    setEditingSkills(true);
  }, [profile?.skills]);

  const addSkill = useCallback(() => {
    const val = skillInput.trim();
    if (!val || pendingSkills.length >= 20) return;
    if (pendingSkills.some((s) => s.toLowerCase() === val.toLowerCase())) {
      setSkillInput("");
      return;
    }
    setPendingSkills((prev) => [...prev, val]);
    setSkillInput("");
  }, [skillInput, pendingSkills]);

  const removeSkill = useCallback((idx: number) => {
    setPendingSkills((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const saveSkills = useCallback(async () => {
    setSkillsSaving(true);
    try {
      await updateProfile({ skills: pendingSkills });
      qc.invalidateQueries({ queryKey: ["profile", username] });
      setEditingSkills(false);
    } catch {
    } finally {
      setSkillsSaving(false);
    }
  }, [pendingSkills, qc, username]);

  const handleCopyProfileLink = useCallback(async () => {
    setMenuOpen(false);
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/profile/${username}`,
      );
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {}
  }, [username]);

  /* ── Loading ──────────────────────────────────────────── */
  if (profileLoading) {
    return (
      <AppShell topBar={{ breadcrumb: "Profile", title: `@${username}` }}>
        <div className="animate-pulse">
          <div className="h-[240px] bg-bg-3" />
          <div className="px-4 py-6 sm:px-8 space-y-4">
            <div className="flex items-end gap-5">
              <div className="h-[130px] w-[130px] rounded-full bg-bg-3" />
              <div className="flex-1 space-y-3 pb-3.5">
                <div className="h-7 w-1/3 rounded bg-bg-3" />
                <div className="h-4 w-1/4 rounded bg-bg-3" />
                <div className="h-3 w-1/2 rounded bg-bg-3" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-[76px] rounded-md bg-bg-3" />
              ))}
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  /* ── Error ────────────────────────────────────────────── */
  if (profileError || !profile) {
    return (
      <AppShell topBar={{ breadcrumb: "Profile", title: "Error" }}>
        <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-danger/10 text-danger">
            <span className="text-xl font-bold">!</span>
          </div>
          <p className="text-[15px] font-medium">User not found</p>
          <p className="text-[13px] text-fg-3">
            This user may not exist or has been removed.
          </p>
          <Button
            variant="ghost"
            size="sm"
            icon={<RefreshCw className="h-3.5 w-3.5" />}
            onClick={() => refetchProfile()}
          >
            Retry
          </Button>
        </div>
      </AppShell>
    );
  }

  const joined = new Date(profile.created_at).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <AppShell
      topBar={{ breadcrumb: "Profile", title: `@${profile.username}` }}
      rightRail={
        profile.communities.length > 0 ? (
          <WidgetCard title={`Communities · ${profile.communities_count}`}>
            {profile.communities.map((c, i) => (
              <Link
                key={c.id}
                href={`/communities/${c.id}`}
                className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-bg-2"
                style={{
                  borderTop: i ? "1px solid var(--line-1)" : "none",
                }}
              >
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-[9px] text-[13px] font-bold text-white"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--acc-purple), var(--acc-blue))",
                  }}
                >
                  {c.name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold">
                    {c.name}
                  </div>
                </div>
              </Link>
            ))}
          </WidgetCard>
        ) : undefined
      }
    >
      {/* Banner */}
      <div className="group relative h-[240px] overflow-hidden">
        {profile.cover_image_url ? (
          <img
            src={profile.cover_image_url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <>
            <div className="absolute inset-0 bg-[linear-gradient(135deg,#3D1B6A_0%,#1F2D70_60%,#0E1A38_100%)]" />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(circle at 75% 30%, rgba(155,108,255,0.5), transparent 50%), radial-gradient(circle at 15% 85%, rgba(255,141,161,0.3), transparent 55%)",
              }}
            />
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(-30deg, transparent 0 28px, rgba(255,255,255,0.018) 28px 29px)",
              }}
            />
          </>
        )}
        {isOwnProfile && (
          <>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleCoverChange}
            />
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              disabled={coverUploading}
              className="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-lg bg-black/40 px-3 py-2 text-[13px] font-medium text-white backdrop-blur-sm transition-colors hover:bg-black/70"
              aria-label="Change cover photo"
            >
              {coverUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
              {coverUploading ? "Uploading..." : "Edit cover"}
            </button>
          </>
        )}
      </div>

      {/* Profile head */}
      <div className="relative z-[2] -mt-[60px] px-4 sm:px-8">
        <div className="flex flex-wrap items-end gap-5">
          <div className="relative rounded-full bg-bg-1 p-[5px]">
            <Avatar name={profile.full_name} src={profile.profile_image_url} size={120} />
            {isOwnProfile && (
              <>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={avatarUploading}
                  className="absolute inset-[5px] flex items-center justify-center rounded-full bg-black/0 opacity-0 transition-all hover:bg-black/40 hover:opacity-100"
                  aria-label="Change profile photo"
                >
                  {avatarUploading ? (
                    <Loader2 className="h-7 w-7 animate-spin text-white" />
                  ) : (
                    <Camera className="h-7 w-7 text-white drop-shadow-lg" />
                  )}
                </button>
              </>
            )}
          </div>
          <div className="flex-1 min-w-0 pb-3.5">
            <div className="flex items-center gap-2">
              <h1 className="m-0 text-[30px] font-bold tracking-tighter">
                {profile.full_name}
              </h1>
              {profile.is_verified_student && (
                <ShieldCheck className="h-5 w-5 text-verified" />
              )}
            </div>
            <div className="mt-1 text-[14px] text-fg-3">
              @{profile.username}
            </div>
            <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5 text-[12.5px] text-fg-2">
              {profile.university_name && (
                <span className="inline-flex items-center gap-1.5">
                  <School className="h-3.5 w-3.5 text-fg-3" />{" "}
                  {profile.university_name}
                  {profile.department && ` · ${profile.department}`}
                  {profile.academic_year &&
                    ` ’${String(profile.academic_year).slice(-2)}`}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-fg-3" /> Joined{" "}
                {joined}
              </span>
            </div>
          </div>
          {!isOwnProfile && (
            <div className="flex gap-2.5 pb-3.5">
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  aria-label="More"
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-line-2 bg-bg-2 text-fg-2 hover:text-fg-1"
                >
                  <MoreVertical className="h-3.5 w-3.5" />
                </button>
                {menuOpen && (
                  <div className="absolute left-0 top-full z-20 mt-1 w-52 overflow-hidden rounded-lg border border-line-1 bg-bg-2 shadow-xl">
                    <button
                      onClick={handleCopyProfileLink}
                      className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-fg-2 hover:bg-bg-3 hover:text-fg-1"
                      type="button"
                    >
                      {linkCopied ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-success" /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" /> Copy profile link
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        setReportOpen(true);
                      }}
                      className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-danger hover:bg-bg-3"
                      type="button"
                    >
                      <Flag className="h-3.5 w-3.5" /> Report user
                    </button>
                    <button
                      disabled
                      className="flex w-full cursor-not-allowed items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-fg-4"
                      type="button"
                    >
                      <ShieldOff className="h-3.5 w-3.5" /> Block user — coming soon
                    </button>
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                icon={<Mail className="h-3.5 w-3.5" />}
                onClick={handleMessage}
                disabled={messageBusy}
              >
                {messageBusy ? "Opening…" : "Message"}
              </Button>
              {profile.is_following ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => unfollowMut.mutate()}
                  disabled={followBusy}
                >
                  {unfollowMut.isPending ? "Unfollowing..." : "Following"}
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => followMut.mutate()}
                  disabled={followBusy}
                >
                  {followMut.isPending ? "Following..." : "Follow"}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Bio */}
        {profile.bio && (
          <p className="mt-4 max-w-[680px] text-pretty text-[14.5px] leading-[1.55] text-fg-2">
            {profile.bio}
          </p>
        )}

        {/* Skills */}
        {(profile.skills.length > 0 || isOwnProfile) && (
          <div className="mt-4">
            {!editingSkills ? (
              <div className="flex flex-wrap items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-fg-3" />
                {profile.skills.length > 0 ? (
                  profile.skills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full border border-brand-purple/25 bg-brand-purple/10 px-2.5 py-1 text-[12px] font-medium text-brand-purple"
                    >
                      {skill}
                    </span>
                  ))
                ) : (
                  <span className="text-[12.5px] text-fg-4">
                    No skills added yet
                  </span>
                )}
                {isOwnProfile && (
                  <button
                    onClick={startEditSkills}
                    className="flex items-center gap-1 rounded-full border border-line-2 bg-bg-2 px-2.5 py-1 text-[12px] font-medium text-fg-3 hover:border-brand-purple/40 hover:text-brand-purple"
                  >
                    <Pencil className="h-3 w-3" />
                    {profile.skills.length > 0 ? "Edit" : "Add skills"}
                  </button>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-line-2 bg-bg-2 p-4">
                <div className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-fg-1">
                  <Sparkles className="h-4 w-4 text-brand-purple" />
                  Edit skills
                  <span className="ml-auto text-[11px] font-normal text-fg-4">
                    {pendingSkills.length}/20
                  </span>
                </div>
                <div className="mb-3 flex flex-wrap gap-2">
                  {pendingSkills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="flex items-center gap-1 rounded-full border border-brand-purple/25 bg-brand-purple/10 px-2.5 py-1 text-[12px] font-medium text-brand-purple"
                    >
                      {skill}
                      <button
                        onClick={() => removeSkill(idx)}
                        className="ml-0.5 rounded-full p-0.5 hover:bg-brand-purple/20"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addSkill();
                      }
                    }}
                    placeholder="Type a skill and press Enter"
                    maxLength={100}
                    className="flex-1 rounded-md border border-line-2 bg-bg-1 px-3 py-2 text-[13px] text-fg-1 placeholder:text-fg-4 focus:border-brand-purple/60 focus:outline-none"
                  />
                  <button
                    onClick={addSkill}
                    disabled={!skillInput.trim() || pendingSkills.length >= 20}
                    className="flex items-center gap-1 rounded-md border border-line-2 bg-bg-1 px-3 py-2 text-[13px] text-fg-2 hover:text-fg-1 disabled:opacity-40"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add
                  </button>
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingSkills(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={saveSkills}
                    disabled={skillsSaving}
                  >
                    {skillsSaving ? "Saving..." : "Save skills"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <ProfileStat label="Posts" value={profile.posts_count} />
          <ProfileStat
            label="Followers"
            value={profile.followers_count}
            accent
          />
          <ProfileStat label="Following" value={profile.following_count} />
          <ProfileStat
            label="Communities"
            value={profile.communities_count}
          />
        </div>

        {/* Tabs */}
        <div className="mt-6 flex items-center gap-1 border-b border-line-1 overflow-x-auto">
          {TABS.map((tab) => {
            const isActive = tab.key === activeTab;
            const badge =
              tab.key === "posts"
                ? String(profile.posts_count)
                : tab.key === "communities"
                  ? String(profile.communities_count)
                  : undefined;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`relative flex items-center gap-1.5 px-4 py-2.5 text-[13.5px] ${
                  isActive
                    ? "font-semibold text-fg-1"
                    : "font-medium text-fg-3 hover:text-fg-2"
                }`}
              >
                {tab.label}
                {badge && (
                  <span className="rounded-full bg-bg-3 px-1.5 py-px text-[10.5px] font-semibold text-fg-2">
                    {badge}
                  </span>
                )}
                {isActive && (
                  <span className="absolute inset-x-3.5 -bottom-px h-[2.5px] rounded bg-acc-gradient" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="px-4 py-5 sm:px-8">
        {activeTab === "posts" && (
          <>
            {/* Posts loading */}
            {postsLoading && (
              <div className="space-y-3.5">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="animate-pulse rounded-md border border-line-1 bg-bg-2 p-[18px]"
                  >
                    <div className="flex gap-3.5">
                      <div className="h-11 w-11 shrink-0 rounded-full bg-bg-3" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3.5 w-1/3 rounded bg-bg-3" />
                        <div className="h-12 w-full rounded bg-bg-3" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Posts empty */}
            {!postsLoading && posts.length === 0 && (
              <div className="flex flex-col items-center gap-2 rounded-md border border-line-2 bg-bg-2 px-6 py-10 text-center">
                <p className="text-[14px] font-medium">No posts yet</p>
                <p className="text-[13px] text-fg-3">
                  {isOwnProfile
                    ? "Your posts will appear here."
                    : `@${profile.username} hasn’t posted anything yet.`}
                </p>
              </div>
            )}

            {/* Posts list */}
            {posts.map((p) => (
              <FeedPostCard key={p.id} post={p} />
            ))}
          </>
        )}

        {activeTab === "communities" && (
          <>
            {profile.communities.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-md border border-line-2 bg-bg-2 px-6 py-10 text-center">
                <Users className="h-7 w-7 text-fg-3" />
                <p className="text-[14px] font-medium">No communities</p>
                <p className="text-[13px] text-fg-3">
                  {isOwnProfile
                    ? "Join a community to see it here."
                    : `@${profile.username} hasn’t joined any communities yet.`}
                </p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {profile.communities.map((c) => (
                  <Card key={c.id}>
                    <Link
                      href={`/communities/${c.id}`}
                      className="flex items-center gap-3"
                    >
                      <span
                        className="flex h-12 w-12 items-center justify-center rounded-[14px] text-[18px] font-bold text-white"
                        style={{
                          background:
                            "linear-gradient(135deg, var(--acc-purple), var(--acc-blue))",
                        }}
                      >
                        {c.name.charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[14.5px] font-semibold hover:underline">
                          {c.name}
                        </div>
                      </div>
                    </Link>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {profile && !isOwnProfile && (
        <ReportModal
          open={reportOpen}
          onClose={() => setReportOpen(false)}
          contentType="user"
          contentId={profile.id}
        />
      )}
    </AppShell>
  );
}
