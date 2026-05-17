"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getNotificationSettings,
  updateNotificationSettings,
} from "@/api/users";
import type { NotificationSettingsResponse } from "@/types/api";

const SETTINGS_KEY = ["notification-settings"] as const;

export default function SettingsPage() {
  const qc = useQueryClient();

  const {
    data: settings,
    isLoading,
    isError,
    refetch,
  } = useQuery<NotificationSettingsResponse>({
    queryKey: [...SETTINGS_KEY],
    queryFn: getNotificationSettings,
  });

  const mutation = useMutation({
    mutationFn: updateNotificationSettings,
    onMutate: async (newSettings) => {
      await qc.cancelQueries({ queryKey: [...SETTINGS_KEY] });
      const prev = qc.getQueryData<NotificationSettingsResponse>([...SETTINGS_KEY]);
      if (prev) {
        qc.setQueryData([...SETTINGS_KEY], { ...prev, ...newSettings });
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData([...SETTINGS_KEY], ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: [...SETTINGS_KEY] });
    },
  });

  if (isLoading) {
    return (
      <div>
        <h2 style={styles.heading}>Settings</h2>
        <div style={styles.card}>
          <div style={styles.skeletonRow} />
          <div style={styles.skeletonRow} />
        </div>
      </div>
    );
  }

  if (isError || !settings) {
    return (
      <div>
        <h2 style={styles.heading}>Settings</h2>
        <div style={styles.error}>
          <span>Could not load settings.</span>
          <button onClick={() => refetch()} style={styles.retry}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 style={styles.heading}>Settings</h2>

      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>Notification Preferences</h3>
        <p style={styles.sectionHint}>
          Choose which notifications you want to receive.
        </p>

        <div style={styles.settingsList}>
          {/* Job Applications */}
          <div style={styles.settingRow}>
            <div style={styles.settingInfo}>
              <div style={styles.settingLabel}>Job Applications</div>
              <div style={styles.settingDesc}>
                Get notified when someone applies to your job posts
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.notify_job_applications}
              onClick={() =>
                mutation.mutate({
                  notify_job_applications: !settings.notify_job_applications,
                })
              }
              style={{
                ...styles.toggle,
                background: settings.notify_job_applications
                  ? "#6C63FF"
                  : "#ccc",
              }}
            >
              <span
                style={{
                  ...styles.toggleKnob,
                  transform: settings.notify_job_applications
                    ? "translateX(20px)"
                    : "translateX(0)",
                }}
              />
            </button>
          </div>

          {/* New Jobs */}
          <div style={styles.settingRow}>
            <div style={styles.settingInfo}>
              <div style={styles.settingLabel}>New Job Posts</div>
              <div style={styles.settingDesc}>
                Get notified when someone you follow posts a new job
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.notify_new_jobs}
              onClick={() =>
                mutation.mutate({
                  notify_new_jobs: !settings.notify_new_jobs,
                })
              }
              style={{
                ...styles.toggle,
                background: settings.notify_new_jobs ? "#6C63FF" : "#ccc",
              }}
            >
              <span
                style={{
                  ...styles.toggleKnob,
                  transform: settings.notify_new_jobs
                    ? "translateX(20px)"
                    : "translateX(0)",
                }}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Styles ────────────────────────────────────────────────── */

const styles: Record<string, React.CSSProperties> = {
  heading: { fontSize: 22, fontWeight: 700, margin: "0 0 20px" },

  card: {
    background: "#fff",
    border: "1px solid #eee",
    borderRadius: 12,
    padding: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 600,
    margin: "0 0 4px",
    color: "#111",
  },
  sectionHint: {
    fontSize: 13,
    color: "#888",
    margin: "0 0 20px",
  },

  settingsList: {
    display: "flex",
    flexDirection: "column",
    gap: 0,
  },
  settingRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 0",
    borderBottom: "1px solid #f0f0f0",
  },
  settingInfo: { flex: 1, marginRight: 16 },
  settingLabel: {
    fontSize: 14,
    fontWeight: 600,
    color: "#222",
    marginBottom: 2,
  },
  settingDesc: {
    fontSize: 13,
    color: "#888",
    lineHeight: 1.4,
  },

  toggle: {
    position: "relative",
    width: 44,
    height: 24,
    borderRadius: 12,
    border: "none",
    cursor: "pointer",
    padding: 0,
    flexShrink: 0,
    transition: "background 0.2s",
  },
  toggleKnob: {
    display: "block",
    width: 20,
    height: 20,
    borderRadius: "50%",
    background: "#fff",
    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
    position: "absolute",
    top: 2,
    left: 2,
    transition: "transform 0.2s",
  },

  skeletonRow: {
    height: 56,
    borderRadius: 8,
    background: "#f0f0f0",
    marginBottom: 12,
  },
  error: {
    background: "#fff5f5",
    border: "1px solid #fed7d7",
    color: "#c53030",
    padding: 12,
    borderRadius: 8,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  retry: {
    background: "#fff",
    border: "1px solid #fed7d7",
    color: "#c53030",
    borderRadius: 6,
    padding: "4px 12px",
    fontSize: 13,
    cursor: "pointer",
  },
};
