"use client";

import { useState, useEffect, useRef, useCallback, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowUp,
  BadgeCheck,
  Bell,
  Camera,
  Check,
  Eye,
  Flag,
  Globe,
  Hash,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Moon,
  Newspaper,
  ShieldCheck,
  Sparkles,
  User as UserIcon,
  Users,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Switch } from "@/components/ui/Switch";
import { WidgetCard } from "@/components/widgets/WidgetCard";
import { Avatar } from "@/components/ui/Avatar";
import {
  updateProfile,
  uploadAvatar,
  changePassword,
  getNotificationSettings,
  updateNotificationSettings,
  type UpdateProfileRequest,
} from "@/lib/api/settings";
import { useAuthStore } from "@/lib/stores/auth-store";
import { usePushNotifications } from "@/lib/hooks/usePushNotifications";
import { cn } from "@/lib/utils";

/* ── Sidebar nav config ─────────────────────────────────────── */

type SectionKey =
  | "profile"
  | "password"
  | "verification"
  | "notifications"
  | "appearance";

interface NavItem {
  key: SectionKey | null;
  label: string;
  Icon: typeof UserIcon;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Account",
    items: [
      { key: "profile", label: "Edit profile", Icon: UserIcon },
      { key: null, label: "Username", Icon: Hash },
      { key: null, label: "Email & phone", Icon: Mail },
    ],
  },
  {
    label: "Privacy & safety",
    items: [
      { key: null, label: "Privacy & visibility", Icon: ShieldCheck },
      { key: "password", label: "Security", Icon: KeyRound },
      { key: "verification", label: "Verification", Icon: BadgeCheck },
      { key: null, label: "Blocked", Icon: Flag },
    ],
  },
  {
    label: "App",
    items: [
      { key: "notifications", label: "Notifications", Icon: Bell },
      { key: "appearance", label: "Appearance", Icon: Moon },
      { key: null, label: "Language", Icon: Globe },
      { key: null, label: "Accessibility", Icon: Eye },
      { key: null, label: "Feed preferences", Icon: Newspaper },
    ],
  },
  {
    label: "Communities",
    items: [{ key: null, label: "Your communities", Icon: Users }],
  },
  {
    label: "Advanced",
    items: [
      { key: null, label: "Sessions", Icon: Lock },
      { key: null, label: "Data export", Icon: ArrowUp },
      { key: null, label: "Developer", Icon: Sparkles },
    ],
  },
];

/* ── Page ───────────────────────────────────────────────────── */

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SectionKey>("profile");

  return (
    <AppShell
      topBar={{ breadcrumb: "Account", title: "Settings" }}
      rightRail={
        <>
          <WidgetCard title="Need to update something else?">
            <div className="p-3.5">
              <div className="text-[13px] leading-[1.5] text-fg-2">
                Mobile-specific permissions (camera, push) live in your
                phone&rsquo;s settings app, not here.
              </div>
              <button className="mt-3 flex h-9 w-full items-center justify-center gap-1.5 rounded-md border border-line-2 bg-bg-3 text-[13px] font-medium text-fg-1">
                Help center
              </button>
            </div>
          </WidgetCard>
          <Card padded className="border-danger/18 bg-danger/[0.06]">
            <div className="text-[13px] font-semibold text-danger">
              Danger zone
            </div>
            <p className="mt-1.5 text-[12px] leading-[1.5] text-fg-2">
              Deactivating hides your account. Deleting removes it
              permanently after 30 days.
            </p>
            <div className="mt-3 flex gap-2">
              <button className="h-[34px] flex-1 rounded-md border border-danger/28 text-[12.5px] font-semibold text-danger hover:bg-danger/8">
                Deactivate
              </button>
              <button className="h-[34px] flex-1 rounded-md border border-danger/28 bg-danger/12 text-[12.5px] font-semibold text-danger hover:bg-danger/20">
                Delete
              </button>
            </div>
          </Card>
        </>
      }
    >
      <div className="mx-auto grid max-w-[1080px] gap-8 px-4 py-6 sm:px-8 md:grid-cols-[240px_1fr]">
        {/* Sidebar nav */}
        <aside>
          {NAV_GROUPS.map((g) => (
            <div key={g.label} className="mb-5">
              <div className="px-2.5 pb-1.5 font-mono text-[10.5px] uppercase tracking-[0.08em] text-fg-3">
                {g.label}
              </div>
              {g.items.map((item) => {
                const isActive =
                  item.key !== null && item.key === activeSection;
                const isClickable = item.key !== null;
                return (
                  <button
                    key={item.label}
                    onClick={() => {
                      if (item.key) setActiveSection(item.key);
                    }}
                    disabled={!isClickable}
                    className={cn(
                      "relative flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-[13px]",
                      isActive
                        ? "bg-bg-3 font-semibold text-fg-1"
                        : isClickable
                          ? "font-medium text-fg-2 hover:bg-bg-2 hover:text-fg-1"
                          : "font-medium text-fg-4 cursor-default",
                    )}
                  >
                    <item.Icon className="h-3.5 w-3.5" />
                    <span className="flex-1 text-left">{item.label}</span>
                    {isActive && (
                      <span className="absolute -left-2.5 top-2 bottom-2 w-[2.5px] rounded-r bg-acc-gradient" />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </aside>

        {/* Main panel */}
        <div>
          {activeSection === "profile" && <ProfileSection />}
          {activeSection === "password" && <PasswordSection />}
          {activeSection === "verification" && <VerificationSection />}
          {activeSection === "notifications" && <NotificationsSection />}
          {activeSection === "appearance" && <AppearanceSection />}
        </div>
      </div>
    </AppShell>
  );
}

/* ── Profile section ────────────────────────────────────────── */

function ProfileSection() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [department, setDepartment] = useState(user?.department ?? "");
  const [academicYear, setAcademicYear] = useState(
    user?.academic_year?.toString() ?? "",
  );
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const handleAvatarChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setAvatarUploading(true);
      setFeedback(null);
      try {
        const url = await uploadAvatar(file);
        const updated = await updateProfile({ profile_image_url: url });
        setUser(updated);
        qc.invalidateQueries({ queryKey: ["profile"] });
        setFeedback({ type: "success", message: "Profile photo updated." });
      } catch (err: unknown) {
        setFeedback({
          type: "error",
          message: err instanceof Error ? err.message : "Upload failed.",
        });
      } finally {
        setAvatarUploading(false);
        if (avatarInputRef.current) avatarInputRef.current.value = "";
      }
    },
    [qc, setUser],
  );

  // Sync form when user data loads/changes
  useEffect(() => {
    if (user) {
      setFullName(user.full_name);
      setBio(user.bio ?? "");
      setDepartment(user.department ?? "");
      setAcademicYear(user.academic_year?.toString() ?? "");
    }
  }, [user]);

  const mutation = useMutation({
    mutationFn: (data: UpdateProfileRequest) => updateProfile(data),
    onSuccess: (updated) => {
      setUser(updated);
      setFeedback({ type: "success", message: "Profile updated successfully." });
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (err: Error) => {
      setFeedback({ type: "error", message: err.message });
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFeedback(null);
    const data: UpdateProfileRequest = {};
    if (fullName.trim() && fullName !== user?.full_name)
      data.full_name = fullName.trim();
    if (bio !== (user?.bio ?? "")) data.bio = bio;
    if (department !== (user?.department ?? ""))
      data.department = department || undefined;
    if (academicYear !== (user?.academic_year?.toString() ?? "")) {
      const yr = parseInt(academicYear, 10);
      if (!isNaN(yr) && yr >= 1 && yr <= 8) data.academic_year = yr;
    }
    if (Object.keys(data).length === 0) {
      setFeedback({ type: "success", message: "No changes to save." });
      return;
    }
    mutation.mutate(data);
  }

  return (
    <>
      <h2 className="m-0 text-[24px] font-bold tracking-tighter">
        Edit profile
      </h2>
      <p className="mt-1.5 text-[13.5px] text-fg-3">
        Update your public-facing profile information.
      </p>

      <Card padded className="mt-5">
        <div className="mb-5 flex items-center gap-5">
          <div className="relative">
            <Avatar
              name={user?.full_name ?? "User"}
              src={user?.profile_image_url}
              size={72}
            />
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
              className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 opacity-0 transition-all hover:bg-black/40 hover:opacity-100"
              aria-label="Change profile photo"
            >
              {avatarUploading ? (
                <Loader2 className="h-5 w-5 animate-spin text-white" />
              ) : (
                <Camera className="h-5 w-5 text-white drop-shadow-lg" />
              )}
            </button>
          </div>
          <div>
            <div className="text-[14px] font-semibold">{user?.full_name ?? "User"}</div>
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={avatarUploading}
              className="mt-1 text-[13px] font-medium text-brand-purple hover:underline"
            >
              {avatarUploading ? "Uploading..." : "Change photo"}
            </button>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field
            label="Full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your full name"
          />
          <label className="block">
            <div className="mb-1.5 text-[12px] font-medium text-fg-2">
              Bio
            </div>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell people a bit about yourself"
              rows={3}
              maxLength={500}
              className="w-full resize-none rounded-md border border-line-2 bg-bg-2 px-3.5 py-3 text-[14.5px] text-fg-1 placeholder:text-fg-4 focus:border-brand-purple/60 focus:outline-none"
            />
            <div className="mt-1 text-right text-[11px] text-fg-4">
              {bio.length}/500
            </div>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="e.g. Computer Science"
            />
            <Field
              label="Academic year"
              type="number"
              min={1}
              max={8}
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              placeholder="1–8"
            />
          </div>

          {/* Feedback */}
          {feedback && (
            <div
              className={cn(
                "rounded-md px-3.5 py-2.5 text-[13px]",
                feedback.type === "success"
                  ? "bg-success/10 text-success"
                  : "bg-danger/10 text-danger",
              )}
            >
              {feedback.type === "success" && (
                <Check className="mr-1.5 inline h-3.5 w-3.5" />
              )}
              {feedback.message}
            </div>
          )}

          <div className="flex justify-end pt-1">
            <Button type="submit" size="sm" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </form>
      </Card>

      {/* Read-only info */}
      {user && (
        <Card padded className="mt-4">
          <div className="text-[12px] font-medium text-fg-3 mb-3">
            Account info (read-only)
          </div>
          <div className="space-y-2.5 text-[13px]">
            <InfoRow label="Username" value={`@${user.username}`} />
            <InfoRow label="Email" value={user.email} />
            <InfoRow
              label="University"
              value={user.university_name ?? "Not set"}
            />
            <InfoRow
              label="Verified student"
              value={user.is_verified_student ? "Yes" : "No"}
            />
          </div>
        </Card>
      )}
    </>
  );
}

/* ── Password section ───────────────────────────────────────── */

function PasswordSection() {
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      changePassword({
        current_password: currentPw,
        new_password: newPw,
      }),
    onSuccess: () => {
      setCurrentPw("");
      setNewPw("");
      setFeedback({
        type: "success",
        message: "Password changed successfully.",
      });
    },
    onError: (err: Error) => {
      setFeedback({ type: "error", message: err.message });
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFeedback(null);
    if (!currentPw || !newPw) {
      setFeedback({
        type: "error",
        message: "Both fields are required.",
      });
      return;
    }
    if (newPw.length < 8) {
      setFeedback({
        type: "error",
        message: "New password must be at least 8 characters.",
      });
      return;
    }
    if (currentPw === newPw) {
      setFeedback({
        type: "error",
        message: "New password must be different from current password.",
      });
      return;
    }
    mutation.mutate();
  }

  return (
    <>
      <h2 className="m-0 text-[24px] font-bold tracking-tighter">Security</h2>
      <p className="mt-1.5 text-[13.5px] text-fg-3">
        Change your password to keep your account secure.
      </p>

      <Card padded className="mt-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field
            label="Current password"
            type="password"
            value={currentPw}
            onChange={(e) => setCurrentPw(e.target.value)}
            placeholder="Enter current password"
            autoComplete="current-password"
          />
          <Field
            label="New password"
            type="password"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            placeholder="At least 8 characters"
            hint="Must be at least 8 characters and different from your current password."
            autoComplete="new-password"
          />

          {/* Feedback */}
          {feedback && (
            <div
              className={cn(
                "rounded-md px-3.5 py-2.5 text-[13px]",
                feedback.type === "success"
                  ? "bg-success/10 text-success"
                  : "bg-danger/10 text-danger",
              )}
            >
              {feedback.type === "success" && (
                <Check className="mr-1.5 inline h-3.5 w-3.5" />
              )}
              {feedback.message}
            </div>
          )}

          <div className="flex justify-end pt-1">
            <Button type="submit" size="sm" disabled={mutation.isPending}>
              {mutation.isPending ? "Changing..." : "Change password"}
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
}

/* ── Verification section ──────────────────────────────────── */

interface VerificationStatus {
  is_verified_student: boolean;
  university_id: string | null;
  university_name: string | null;
  verification_method: string | null;
  verification_status: string | null;
  university_email: string | null;
  rejection_reason: string | null;
  verified_at: string | null;
}

function VerificationSection() {
  const user = useAuthStore((s) => s.user);

  const { data: verifData, isLoading: verifLoading } = useQuery({
    queryKey: ["verification-status"],
    queryFn: async (): Promise<VerificationStatus> => {
      const { default: apiClient } = await import("@/lib/api/client");
      const res = await apiClient.get<VerificationStatus>("/verification/status");
      return res.data;
    },
  });

  // Derive display status from API response
  type DisplayStatus = "verified" | "pending" | "rejected" | "not_submitted";
  let status: DisplayStatus = "not_submitted";
  if (verifData) {
    if (verifData.is_verified_student) {
      status = "verified";
    } else if (verifData.verification_status === "pending") {
      status = "pending";
    } else if (verifData.verification_status === "rejected") {
      status = "rejected";
    }
  } else if (user?.is_verified_student) {
    status = "verified";
  }

  const statusConfig = {
    verified: {
      label: "Verified student",
      desc: `Verified at ${verifData?.university_name ?? user?.university_name ?? "your university"}`,
      badge: "Verified",
      iconClass: "bg-success/15 text-success",
      badgeClass: "border border-success/28 bg-success/12 text-success",
    },
    pending: {
      label: "Verification pending",
      desc: "Your verification is being reviewed by an admin.",
      badge: "Pending",
      iconClass: "bg-warn/15 text-warn",
      badgeClass: "border border-warn/28 bg-warn/12 text-warn",
    },
    rejected: {
      label: "Verification rejected",
      desc: verifData?.rejection_reason
        ? `Reason: ${verifData.rejection_reason}`
        : "Your verification was not approved. You can try again.",
      badge: "Rejected",
      iconClass: "bg-danger/15 text-danger",
      badgeClass: "border border-danger/28 bg-danger/12 text-danger",
    },
    not_submitted: {
      label: "Not verified",
      desc: "Verify your student status to unlock all features.",
      badge: "Unverified",
      iconClass: "bg-fg-4/15 text-fg-3",
      badgeClass: "border border-line-2 bg-bg-3 text-fg-3",
    },
  };

  const cfg = statusConfig[status];

  return (
    <>
      <h2 className="m-0 text-[24px] font-bold tracking-tighter">
        Verification
      </h2>
      <p className="mt-1.5 text-[13.5px] text-fg-3">
        Your student verification status and options.
      </p>

      <Card padded className="mt-5">
        {verifLoading ? (
          <div className="flex items-center justify-center py-6">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-purple border-t-transparent" />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-[12px]",
                  cfg.iconClass,
                )}
              >
                <BadgeCheck className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <div className="text-[15px] font-semibold">{cfg.label}</div>
                <div className="mt-0.5 text-[12.5px] text-fg-3">{cfg.desc}</div>
              </div>
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11.5px] font-semibold",
                  cfg.badgeClass,
                )}
              >
                {cfg.badge}
              </span>
            </div>

            <div className="mt-5 border-t border-line-1 pt-4">
              {status === "verified" ? (
                <div className="flex items-center gap-2 text-[13px] text-success">
                  <Check className="h-3.5 w-3.5" />
                  Your verified badge is visible across UniVerse.
                </div>
              ) : (
                <Link href="/verify">
                  <Button size="sm">
                    {status === "pending"
                      ? "Check verification status"
                      : status === "rejected"
                        ? "Try again"
                        : "Start verification"}
                  </Button>
                </Link>
              )}
            </div>
          </>
        )}
      </Card>

      {status === "verified" && (
        <Card padded className="mt-4">
          <div className="text-[12px] font-medium text-fg-3 mb-3">
            Verification details
          </div>
          <div className="space-y-2.5 text-[13px]">
            <InfoRow
              label="University"
              value={verifData?.university_name ?? user?.university_name ?? "Not set"}
            />
            <InfoRow
              label="Method"
              value={verifData?.verification_method ?? "—"}
            />
            <InfoRow label="Status" value="Verified" />
          </div>
        </Card>
      )}
    </>
  );
}

/* ── Notifications section ──────────────────────────────────── */

function NotificationsSection() {
  const {
    data: settings,
    isLoading,
  } = useQuery({
    queryKey: ["notification-settings"],
    queryFn: getNotificationSettings,
  });

  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: updateNotificationSettings,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notification-settings"] });
    },
  });

  return (
    <>
      <h2 className="m-0 text-[24px] font-bold tracking-tighter">
        Notifications
      </h2>
      <p className="mt-1.5 text-[13.5px] text-fg-3">
        Choose what reaches you on web and in email.
      </p>

      <Card padded={false} className="mt-5">
        {isLoading ? (
          <div className="animate-pulse space-y-3 p-5">
            <div className="h-4 w-1/3 rounded bg-bg-3" />
            <div className="h-10 w-full rounded bg-bg-3" />
            <div className="h-4 w-1/3 rounded bg-bg-3" />
            <div className="h-10 w-full rounded bg-bg-3" />
          </div>
        ) : (
          <>
            <SettingToggleRow
              label="Job application updates"
              sub="Get notified when there are updates on your job applications"
              on={settings?.notify_job_applications ?? false}
              onChange={(on) =>
                mutation.mutate({ notify_job_applications: on })
              }
              disabled={mutation.isPending}
            />
            <SettingToggleRow
              label="New job postings"
              sub="Get notified when new jobs are posted in your communities"
              on={settings?.notify_new_jobs ?? false}
              onChange={(on) => mutation.mutate({ notify_new_jobs: on })}
              disabled={mutation.isPending}
            />
          </>
        )}
      </Card>

      <PushNotificationToggle />

      <p className="mt-3.5 text-[12px] text-fg-4">
        More notification preferences will be available soon.
      </p>
    </>
  );
}

function PushNotificationToggle() {
  const { isSupported, isSubscribed, subscribe, unsubscribe } = usePushNotifications();
  if (!isSupported) return null;
  return (
    <Card padded={false} className="mt-4">
      <SettingToggleRow
        label="Push notifications"
        sub="Receive browser notifications when you get likes, comments, and messages"
        on={isSubscribed}
        onChange={(on) => (on ? subscribe() : unsubscribe())}
        disabled={false}
      />
    </Card>
  );
}

/* ── Appearance section (placeholder) ───────────────────────── */

function AppearanceSection() {
  return (
    <>
      <h2 className="m-0 text-[24px] font-bold tracking-tighter">
        Appearance
      </h2>
      <p className="mt-1.5 text-[13.5px] text-fg-3">
        Customize how UniVerse looks for you.
      </p>

      <Card padded className="mt-5">
        <SettingToggleRow
          label="Dark mode"
          sub="UniVerse uses dark mode by default"
          on={true}
          onChange={() => {}}
          disabled
        />
      </Card>

      <p className="mt-3.5 text-[12px] text-fg-4">
        Theme customization coming soon.
      </p>
    </>
  );
}

/* ── Shared helpers ─────────────────────────────────────────── */

function SettingToggleRow({
  label,
  sub,
  on,
  onChange,
  disabled,
}: {
  label: string;
  sub: string;
  on: boolean;
  onChange: (on: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-4 border-t border-line-1 px-5 py-4 first:border-t-0">
      <div className="flex-1">
        <div className="text-[14px] font-medium">{label}</div>
        <div className="mt-0.5 text-[12px] text-fg-3">{sub}</div>
      </div>
      <Switch
        defaultOn={on}
        key={String(on)}
        onChange={onChange}
        ariaLabel={label}
      />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-fg-3">{label}</span>
      <span className="font-medium text-fg-2">{value}</span>
    </div>
  );
}
