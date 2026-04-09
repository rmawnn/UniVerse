/**
 * Reusable skeleton loaders.
 * Pure CSS animation (keyframes defined in globals.css under .skeleton).
 */

const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #eee",
  borderRadius: 10,
  padding: 16,
};

const bar = (width: string | number, height = 12): React.CSSProperties => ({
  width,
  height,
  borderRadius: 6,
  marginBottom: 8,
});

export function PostSkeleton() {
  return (
    <div style={card}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
        <div
          className="skeleton"
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            marginRight: 12,
          }}
        />
        <div style={{ flex: 1 }}>
          <div className="skeleton" style={bar("40%")} />
          <div className="skeleton" style={bar("25%", 10)} />
        </div>
      </div>
      <div className="skeleton" style={bar("100%")} />
      <div className="skeleton" style={bar("92%")} />
      <div className="skeleton" style={bar("60%")} />
      <div
        className="skeleton"
        style={{ ...bar(60, 14), marginTop: 8, marginBottom: 0 }}
      />
    </div>
  );
}

export function CommentSkeleton() {
  return (
    <div style={{ padding: "12px 0", borderBottom: "1px solid #f0f0f0" }}>
      <div className="skeleton" style={bar("30%", 10)} />
      <div className="skeleton" style={bar("90%")} />
      <div className="skeleton" style={{ ...bar("70%"), marginBottom: 0 }} />
    </div>
  );
}

export function CommunitySkeleton() {
  return (
    <div style={card}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <div className="skeleton" style={{ ...bar("35%", 14), marginBottom: 0 }} />
        <div className="skeleton" style={{ ...bar(60, 10), marginBottom: 0 }} />
      </div>
      <div className="skeleton" style={bar("95%", 10)} />
      <div className="skeleton" style={{ ...bar("60%", 10), marginBottom: 0 }} />
    </div>
  );
}

export function ConversationSkeleton() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: 14,
        borderBottom: "1px solid #f0f0f0",
      }}
    >
      <div
        className="skeleton"
        style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          marginRight: 12,
        }}
      />
      <div style={{ flex: 1 }}>
        <div className="skeleton" style={bar("40%")} />
        <div className="skeleton" style={{ ...bar("75%", 10), marginBottom: 0 }} />
      </div>
    </div>
  );
}

export function NotificationSkeleton() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: 14,
        borderBottom: "1px solid #f0f0f0",
      }}
    >
      <div
        className="skeleton"
        style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          marginRight: 12,
        }}
      />
      <div style={{ flex: 1 }}>
        <div className="skeleton" style={bar("80%", 11)} />
        <div className="skeleton" style={{ ...bar(60, 9), marginBottom: 0 }} />
      </div>
    </div>
  );
}

export function SkeletonList({
  count,
  Component,
}: {
  count: number;
  Component: React.ComponentType;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <Component key={i} />
      ))}
    </div>
  );
}
