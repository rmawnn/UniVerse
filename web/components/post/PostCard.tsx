import { Pin } from "lucide-react";
import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { UniBadge } from "@/components/ui/UniBadge";
import { PostActions } from "./PostActions";
import { PostMenu } from "./PostMenu";
import { PollWidget } from "./PollWidget";
import type { Post } from "@/lib/types";
import { cn } from "@/lib/utils";

interface PostCardProps {
  post: Post;
  expanded?: boolean;
}

/** The most-rendered component in the app. Compact + expanded variants. */
export function PostCard({ post, expanded }: PostCardProps) {
  return (
    <Card
      padded={false}
      className={cn(
        "mb-3.5 overflow-hidden",
        post.pinned &&
          "bg-[linear-gradient(180deg,rgba(139,92,246,0.06),var(--bg-2)_60%)]",
      )}
    >
      {post.pinned && (
        <div className="flex items-center gap-1.5 px-[18px] pt-2 text-[11px] font-semibold text-brand-purple">
          <Pin className="h-3 w-3" />
          Pinned by mods in{" "}
          <Link
            href={`/communities/${post.community.slug}`}
            className="text-fg-1 hover:underline"
          >
            #{post.community.slug}
          </Link>
        </div>
      )}
      <article className="flex gap-3.5 p-[18px]">
        <Link href={`/profile/${post.author.handle}`} className="shrink-0">
          <Avatar name={post.author.name} size={44} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <Link
              href={`/profile/${post.author.handle}`}
              className="text-[14.5px] font-semibold hover:underline"
            >
              {post.author.name}
            </Link>
            {post.author.verified && (
              <ShieldCheck className="h-3.5 w-3.5 text-verified" />
            )}
            <span className="text-[12.5px] text-fg-3">
              @{post.author.handle}
            </span>
            <span className="text-fg-4">·</span>
            <UniBadge university={post.author.university} compact />
            <span className="text-fg-4">·</span>
            <span className="text-[12.5px] text-fg-3">{post.relativeTime}</span>
            <PostMenu postId={post.id} />
          </div>
          <div className="mt-0.5 text-[12px] text-fg-3">
            Posted in{" "}
            <Link
              href={`/communities/${post.community.slug}`}
              className="font-semibold text-brand-blue hover:underline"
            >
              #{post.community.slug}
            </Link>
          </div>

          <Link href={`/posts/${post.id}`} className="block">
            <p
              className={cn(
                "mt-2.5 whitespace-pre-line leading-[1.5] tracking-tightish text-pretty",
                expanded ? "text-[17px]" : "text-[15px]",
              )}
            >
              {post.text}
            </p>
          </Link>

          {post.media && (
            <div className="mt-3">
              <PlaceholderImage
                label={post.media.label}
                height={expanded ? 320 : 220}
                accent={post.media.accent}
              />
            </div>
          )}

          {post.poll && <PollWidget poll={post.poll} />}

          <PostActions
            postId={post.id}
            likes={post.counts.likes}
            comments={post.counts.comments}
            reposts={post.counts.reposts}
            views={post.counts.views}
            initialLiked={post.liked}
          />
        </div>
      </article>
    </Card>
  );
}
