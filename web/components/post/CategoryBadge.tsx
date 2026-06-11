import {
  BookOpen,
  Briefcase,
  FlaskConical,
  GraduationCap,
  Home,
  PartyPopper,
  ShoppingBag,
  MessageCircle,
} from "lucide-react";
import type { ReactNode } from "react";

const CATEGORY_CONFIG: Record<
  string,
  { label: string; icon: ReactNode; color: string; bg: string }
> = {
  academic: {
    label: "Academic",
    icon: <GraduationCap className="h-3 w-3" />,
    color: "text-[#7CB3FF]",
    bg: "bg-[#7CB3FF]/12 border-[#7CB3FF]/25",
  },
  research: {
    label: "Research",
    icon: <FlaskConical className="h-3 w-3" />,
    color: "text-[#A78BFA]",
    bg: "bg-[#A78BFA]/12 border-[#A78BFA]/25",
  },
  internship: {
    label: "Internship",
    icon: <BookOpen className="h-3 w-3" />,
    color: "text-[#34D399]",
    bg: "bg-[#34D399]/12 border-[#34D399]/25",
  },
  job: {
    label: "Job",
    icon: <Briefcase className="h-3 w-3" />,
    color: "text-[#FBBF24]",
    bg: "bg-[#FBBF24]/12 border-[#FBBF24]/25",
  },
  housing: {
    label: "Housing",
    icon: <Home className="h-3 w-3" />,
    color: "text-[#F97316]",
    bg: "bg-[#F97316]/12 border-[#F97316]/25",
  },
  event: {
    label: "Event",
    icon: <PartyPopper className="h-3 w-3" />,
    color: "text-[#F472B6]",
    bg: "bg-[#F472B6]/12 border-[#F472B6]/25",
  },
  marketplace: {
    label: "Marketplace",
    icon: <ShoppingBag className="h-3 w-3" />,
    color: "text-[#2DD4BF]",
    bg: "bg-[#2DD4BF]/12 border-[#2DD4BF]/25",
  },
  general: {
    label: "General",
    icon: <MessageCircle className="h-3 w-3" />,
    color: "text-fg-3",
    bg: "bg-bg-3 border-line-2",
  },
};

export function CategoryBadge({ category }: { category: string | null }) {
  if (!category || category === "general") return null;

  const config = CATEGORY_CONFIG[category];
  if (!config) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold ${config.color} ${config.bg}`}
    >
      {config.icon}
      {config.label}
    </span>
  );
}
