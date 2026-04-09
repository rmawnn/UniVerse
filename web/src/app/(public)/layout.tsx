export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f9fafb" }}>
      <div style={{ width: "100%", maxWidth: 420, padding: 24 }}>
        {children}
      </div>
    </div>
  );
}
