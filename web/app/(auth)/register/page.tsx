"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { registerApi } from "@/lib/api/auth";
import { useAuthStore } from "@/lib/stores/auth-store";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

const STEPS = ["Account", "Verify email", "Set up profile"] as const;

/** Blocked generic email providers */
const BLOCKED_DOMAINS = new Set([
  "gmail.com", "yahoo.com", "hotmail.com", "outlook.com",
  "live.com", "icloud.com", "aol.com", "protonmail.com",
  "zoho.com", "mail.com", "gmx.com", "yandex.com",
  "tutanota.com", "fastmail.com", "hey.com",
  "me.com", "msn.com", "qq.com", "163.com",
]);

function isUniversityEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return false;
  if (BLOCKED_DOMAINS.has(domain)) return false;
  // Accept common university patterns
  if (/\.edu(\.\w{2,3})?$/.test(domain)) return true;
  if (/\.ac\.\w{2,3}$/.test(domain)) return true;
  if (/^(stu|student|students|ogr|ogrenci)\./.test(domain)) return true;
  if (/\.uni[\w-]*\.\w{2,4}$/.test(domain)) return true;
  // Accept any non-blocked domain (backend has final say)
  return true;
}

function getEmailError(email: string): string | null {
  if (!email) return null;
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return null;
  if (BLOCKED_DOMAINS.has(domain)) {
    return `${domain} is not accepted. Please use your university email address.`;
  }
  return null;
}

export default function RegisterPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const emailWarning = getEmailError(email);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!agreed) {
      setError("You must agree to the Terms and Privacy Policy.");
      return;
    }
    if (!isUniversityEmail(email)) {
      setError("Please use your university email address. Generic providers (Gmail, Hotmail, etc.) are not accepted.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const fullName = `${firstName} ${lastName}`.trim();
      const autoUsername =
        username || firstName.toLowerCase().replace(/[^a-z0-9_]/gi, "");
      await registerApi({
        email,
        password,
        full_name: fullName,
        username: autoUsername,
      });
      // Auto-login after successful registration, then redirect to verify
      await login({ identifier: email, password });
      router.replace("/verify");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="font-mono text-[11px] uppercase tracking-[0.1em] text-brand-purple">
        Step 1 of 3
      </div>
      <h2 className="mt-2.5 text-[34px] font-bold leading-[1.1] tracking-tightest">
        Create your account
      </h2>
      <p className="mt-2 text-[14.5px] text-fg-2">
        We&rsquo;ll verify you&rsquo;re a real student via your university
        email. It stays private.
      </p>

      {/* Stepper */}
      <div className="mt-6 flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex flex-1 items-center gap-2">
            <div
              className={cn(
                "flex items-center gap-2",
                i === 0 ? "text-fg-1" : "text-fg-3",
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold",
                  i === 0
                    ? "bg-acc-gradient text-white"
                    : "bg-bg-3 text-fg-3",
                )}
              >
                {i + 1}
              </span>
              <span
                className={cn(
                  "whitespace-nowrap text-[12px]",
                  i === 0 ? "font-semibold" : "font-medium",
                )}
              >
                {s}
              </span>
            </div>
            {i < STEPS.length - 1 && <span className="h-px flex-1 bg-line-2" />}
          </div>
        ))}
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-[13px] text-danger">
          {error}
        </div>
      )}

      <form className="mt-7 flex flex-col gap-3.5" onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="First name"
            name="firstName"
            placeholder="Maya"
            icon={<User className="h-4 w-4" />}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
          <Field
            label="Last name"
            name="lastName"
            placeholder="Chen"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
        </div>
        <Field
          label="Username"
          name="username"
          placeholder="mayac"
          icon={<User className="h-4 w-4" />}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          hint="Letters, numbers, and underscores only"
        />
        <div>
          <Field
            label="University email"
            type="email"
            name="email"
            placeholder="you@university.edu.tr"
            icon={<Mail className="h-4 w-4" />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            hint="Must be your official university email (e.g. .edu, .edu.tr, stu.*, ogr.*)"
            required
          />
          {emailWarning && (
            <p className="mt-1 text-[12px] text-danger">{emailWarning}</p>
          )}
        </div>
        <Field
          label="Password"
          type={showPassword ? "text" : "password"}
          name="password"
          placeholder="At least 8 characters"
          icon={<Lock className="h-4 w-4" />}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          trailing={
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="text-fg-3 hover:text-fg-1"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          }
        />

        <label className="mt-1 flex cursor-pointer items-start gap-2.5 text-[12.5px] leading-[1.6] text-fg-2">
          <input
            type="checkbox"
            className="peer sr-only"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
          />
          <span className="mt-[2px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border-[1.5px] border-line-3 peer-checked:border-brand-purple peer-checked:bg-acc-gradient peer-checked:text-white" />
          <span>
            I&rsquo;m 18 or older, agree to the{" "}
            <span className="text-brand-blue">
              Terms
            </span>{" "}
            and acknowledge the{" "}
            <span className="text-brand-blue">
              Privacy Policy
            </span>
            .
          </span>
        </label>

        <Button
          size="lg"
          full
          type="submit"
          iconRight={<ArrowRight className="h-4 w-4" />}
          className="mt-3"
          disabled={loading || !firstName || !email || !password}
        >
          {loading ? "Creating account..." : "Continue"}
        </Button>
      </form>

      <p className="mt-6 text-center text-[13.5px] text-fg-2">
        Already on UniVerse?{" "}
        <Link
          href="/login"
          className="font-semibold text-brand-blue hover:underline"
        >
          Sign in
        </Link>
      </p>
    </>
  );
}
