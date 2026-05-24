import type { Metadata } from "next";
import Link from "next/link";
import { Check, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { OtpInput } from "@/components/ui/OtpInput";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Verify email · UniVerse",
};

const STEPS = ["Account", "Verify email", "Set up profile"] as const;

export default function VerifyPage() {
  return (
    <>
      {/* Stepper */}
      <div className="mb-7 flex items-center gap-2">
        {STEPS.map((s, i) => {
          const isDone = i < 1;
          const isCurrent = i === 1;
          return (
            <div key={s} className="flex flex-1 items-center gap-2">
              <div
                className={cn(
                  "flex items-center gap-2",
                  isCurrent ? "text-fg-1" : isDone ? "text-success" : "text-fg-3",
                )}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold",
                    isCurrent && "bg-acc-gradient text-white",
                    isDone && "bg-success/20 text-success",
                    !isCurrent && !isDone && "bg-bg-3 text-fg-3",
                  )}
                >
                  {isDone ? <Check className="h-3 w-3" strokeWidth={3} /> : i + 1}
                </span>
                <span
                  className={cn(
                    "whitespace-nowrap text-[12px]",
                    isCurrent ? "font-semibold" : "font-medium",
                  )}
                >
                  {s}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <span
                  className={cn(
                    "h-px flex-1",
                    isDone ? "bg-success" : "bg-line-2",
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Envelope visual */}
      <div className="flex h-[84px] w-[84px] items-center justify-center rounded-lg border border-brand-purple/40 bg-[linear-gradient(180deg,#2A1F4A,#1A1530)] shadow-[0_16px_40px_rgba(124,82,255,0.25)]">
        <Mail className="h-9 w-9 text-[#C7B0FF]" strokeWidth={1.5} />
      </div>

      <h2 className="mt-5 text-[32px] font-bold leading-[1.1] tracking-tightest">
        Check your inbox
      </h2>
      <p className="mt-2 text-[14.5px] text-fg-2">
        We sent a 6-digit code to{" "}
        <span className="font-semibold text-fg-1">maya.chen@stanford.edu</span>.
      </p>

      <div className="mt-7">
        <OtpInput defaultValue="928" />
      </div>

      <div className="mt-4 flex items-center justify-between text-[13px] text-fg-3">
        <span>
          Code expires in <b className="text-fg-1">9:42</b>
        </span>
        <button className="font-semibold text-brand-blue hover:underline">
          Resend code
        </button>
      </div>

      <div className="mt-6 flex gap-3 rounded-md border border-brand-blue/18 bg-brand-blue/[0.07] p-3.5">
        <ShieldCheck className="h-4.5 w-4.5 shrink-0 text-brand-blue" />
        <p className="text-[12.5px] leading-[1.5] text-fg-2">
          Only verified .edu students can post on UniVerse. Your email stays
          private and is never visible to other students.
        </p>
      </div>

      <Button
        size="lg"
        full
        icon={<Check className="h-4.5 w-4.5" strokeWidth={2.5} />}
        className="mt-6"
      >
        Verify & continue
      </Button>

      <p className="mt-6 text-center text-[13px] text-fg-3">
        Wrong email?{" "}
        <Link
          href="/register"
          className="font-semibold text-brand-blue hover:underline"
        >
          Start over
        </Link>
      </p>
    </>
  );
}
