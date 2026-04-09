"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/auth-store";

export default function RegisterPage() {
  const router = useRouter();
  const register = useAuthStore((s) => s.register);
  const isLoading = useAuthStore((s) => s.isLoading);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!fullName.trim() || !username.trim() || !email.trim() || !password.trim()) {
      setError("Please fill in all fields");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    try {
      await register({
        full_name: fullName.trim(),
        username: username.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        password,
      });
      router.replace("/feed");
    } catch (err: any) {
      setError(err.message ?? "Registration failed");
    }
  };

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <h1 style={styles.title}>Create Account</h1>
      <p style={styles.subtitle}>Join your university community</p>

      {error && <div style={styles.error}>{error}</div>}

      <input
        placeholder="Full Name"
        value={fullName}
        onChange={(e) => { setFullName(e.target.value); setError(""); }}
        style={styles.input}
        disabled={isLoading}
      />
      <input
        placeholder="Username"
        value={username}
        onChange={(e) => { setUsername(e.target.value); setError(""); }}
        style={styles.input}
        disabled={isLoading}
        autoCapitalize="none"
      />
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
        placeholder="Password (min 8 characters)"
        value={password}
        onChange={(e) => { setPassword(e.target.value); setError(""); }}
        style={styles.input}
        disabled={isLoading}
      />

      <button type="submit" style={styles.button} disabled={isLoading}>
        {isLoading ? "Creating account..." : "Create Account"}
      </button>

      <p style={styles.linkText}>
        Already have an account?{" "}
        <Link href="/login" style={styles.link}>Sign in</Link>
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
