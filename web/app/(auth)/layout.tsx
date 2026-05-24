import type { ReactNode } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { UVMark } from "@/components/ui/UVMark";

interface AuthLayoutProps {
  children: ReactNode;
}

/**
 * Split-screen auth shell: branded panel on the left, form on the right.
 * Collapses to single-column under the `md` breakpoint.
 */
export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg-1 text-fg-1">
      {/* ── Brand panel ─────────────────────────────────── */}
      <aside className="relative hidden h-full w-[44%] max-w-[640px] shrink-0 overflow-hidden bg-[linear-gradient(155deg,#1B0F3A_0%,#0F1A38_55%,#0A0A14_100%)] p-14 md:flex md:flex-col">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 20% 25%, rgba(155,108,255,0.35), transparent 50%), radial-gradient(circle at 85% 80%, rgba(79,143,247,0.28), transparent 55%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "repeating-linear-gradient(135deg, transparent 0 24px, rgba(255,255,255,0.018) 24px 25px)",
          }}
        />
        <Link href="/" className="relative z-[2] flex items-center gap-3">
          <UVMark size={40} />
          <div>
            <div className="text-[18px] font-bold tracking-tighter">UniVerse</div>
            <div className="font-mono text-[11px] uppercase tracking-[0.05em] text-fg-3">
              The student network
            </div>
          </div>
        </Link>

        <div className="relative z-[2] mt-auto">
          <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-brand-purple">
            For students only
          </div>
          <h1 className="mt-3.5 max-w-[480px] text-pretty text-[52px] font-bold leading-[1.02] tracking-tightest">
            Your campus,
            <br />
            in your pocket.
          </h1>
          <p className="mt-4 max-w-[460px] text-pretty text-[16px] leading-[1.55] text-fg-2">
            A verified network of students from your university. No bots. No
            noise. Just the people you actually share a campus with.
          </p>

          <blockquote className="mt-10 max-w-[460px] rounded-lg border border-line-2 bg-white/[0.04] p-5 backdrop-blur-sm">
            <p className="text-[14.5px] leading-[1.5] text-fg-1">
              &ldquo;It&rsquo;s the first app on campus that actually feels like
              it was built by people who go to my school.&rdquo;
            </p>
            <div className="mt-3 flex items-center gap-2.5">
              <Avatar name="Priya Patel" size={28} />
              <div className="text-[12px] text-fg-2">
                <b className="text-fg-1">Priya Patel</b> · MIT &rsquo;26
              </div>
            </div>
          </blockquote>
        </div>
      </aside>

      {/* ── Form panel ──────────────────────────────────── */}
      <main className="scroll-hidden flex flex-1 flex-col overflow-y-auto p-8 md:p-14">
        <div className="mb-6 flex justify-end gap-6 text-[13px] text-fg-2">
          <Link href="#" className="hover:text-fg-1">
            Need help?
          </Link>
          <span className="font-medium text-brand-blue">
            Status: all systems
          </span>
        </div>
        <div className="mx-auto flex w-full max-w-[460px] flex-1 flex-col justify-center py-6">
          {/* Mobile-only brand mark */}
          <Link href="/" className="mb-8 inline-flex items-center gap-2.5 md:hidden">
            <UVMark size={32} />
            <span className="text-[16px] font-bold tracking-tighter">
              UniVerse
            </span>
          </Link>
          {children}
        </div>
      </main>
    </div>
  );
}
