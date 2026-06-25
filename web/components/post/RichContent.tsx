"use client";

import Link from "next/link";
import { Fragment } from "react";

const MENTION_RE = /@(\w{2,30})/g;
const HASHTAG_RE = /#(\w{2,50})/g;
const COMBINED_RE = /(@\w{2,30})|(#\w{2,50})/g;

interface RichContentProps {
  text: string;
  className?: string;
}

export function RichContent({ text, className }: RichContentProps) {
  const parts: { type: "text" | "mention" | "hashtag"; value: string }[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(COMBINED_RE)) {
    const start = match.index!;
    if (start > lastIndex) {
      parts.push({ type: "text", value: text.slice(lastIndex, start) });
    }
    if (match[1]) {
      parts.push({ type: "mention", value: match[1].slice(1) });
    } else if (match[2]) {
      parts.push({ type: "hashtag", value: match[2].slice(1) });
    }
    lastIndex = start + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: "text", value: text.slice(lastIndex) });
  }

  if (parts.length === 0) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (part.type === "mention") {
          return (
            <Link
              key={i}
              href={`/profile/${part.value}`}
              className="font-semibold text-brand-purple hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              @{part.value}
            </Link>
          );
        }
        if (part.type === "hashtag") {
          return (
            <Link
              key={i}
              href={`/search?q=${encodeURIComponent("#" + part.value)}`}
              className="font-semibold text-brand-purple hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              #{part.value}
            </Link>
          );
        }
        return <Fragment key={i}>{part.value}</Fragment>;
      })}
    </span>
  );
}
