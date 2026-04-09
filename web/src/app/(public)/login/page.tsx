"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/auth-store";

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields");
      return;
    }
    try {
      await login({ email: email.trim(), password });
      router.replace("/feed");
    } catch (err) {
      const msg = (err as { message?: string })?.message ?? "Login failed";
      setError(msg);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <h1 style={styles.title}>UniVerse</h1>
      <p style={styles.subtitle}>Welcome back</p>

      {error && <div style={styles.error}>{error}</div>}

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => { setEmail(e.target.value); setError(""); }}
        style={styles.input}
        disabled={isLoading}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => { setPassword(e.target.value); setError(""); }}
        style={styles.input}
        disabled={isLoading}
      />

      <button type="submit" style={styles.button} disabled={isLoading}>
        {isLoading ? "Signing in..." : "Sign In"}
      </button>

      <p style={styles.linkText}>
        Don&apos;t have an account?{" "}
        <Link href="/register" style={styles.link}>Register</Link>
      </p>
    </form>
  );
}

const styles: Record<string, React.CSSProperties> = {
  form: { display: "flex", flexDirection: "column", gap: 14 },
  title: { textAlign: "center", fontSize: 28, fontWeight: 700, color: "#6C63FF", margin: 0 },
  subtitle: { textAlign: "center", color: "#666", marginBottom: 16, marginTop: 4 },
  error: {
    background: "#fdeaea", color: "#c0392b", padding: 12,
    borderRadius: 8, fontSize: 14, textAlign: "center",
  },
  input: {
    padding: "12px 16px", borderRadius: 8, border: "1px solid #ddd",
    fontSize: 15, outline: "none",
  },
  button: {
    padding: "14px 0", borderRadius: 8, border: "none",
    background: "#6C63FF", color: "#fff", fontSize: 16,
    fontWeight: 600, cursor: "pointer",
  },
  linkText: { textAlign: "center", fontSize: 14, color: "#666" },
  link: { color: "#6C63FF", textDecoration: "none" },
};
