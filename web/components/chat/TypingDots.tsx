import { cn } from "@/lib/utils";

/** Three animated dots used inline in "typing" states. */
export function TypingDots({ className }: { className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center gap-[2px]", className)}
      aria-label="Typing"
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="block h-[4px] w-[4px] rounded-full bg-current"
          style={{
            animation: "uv-typing 1.2s ease-in-out infinite",
            animationDelay: `${i * 0.15}s`,
            opacity: 0.4,
          }}
        />
      ))}
      <style>{`
        @keyframes uv-typing {
          0%, 80%, 100% { opacity: 0.3; transform: translateY(0); }
          40% { opacity: 1; transform: translateY(-2px); }
        }
      `}</style>
    </span>
  );
}
