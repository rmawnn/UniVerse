import React, { useRef, useState, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toggleLike } from "../../api/posts";
import type { PostResponse } from "../../types/api";

interface Props {
  post: PostResponse;
  onPress: () => void;
  onAuthorPress: () => void;
}

function PostCard({ post, onPress, onAuthorPress }: Props) {
  const queryClient = useQueryClient();
  const isMutating = useRef(false);

  const [optimisticLiked, setOptimisticLiked] = useState(post.liked_by_me);
  const [optimisticCount, setOptimisticCount] = useState(post.like_count);

  useEffect(() => {
    if (!isMutating.current) {
      setOptimisticLiked(post.liked_by_me);
      setOptimisticCount(post.like_count);
    }
  }, [post.liked_by_me, post.like_count]);

  const likeMutation = useMutation({
    mutationFn: () => toggleLike(post.id),
    onMutate: () => {
      isMutating.current = true;
      setOptimisticLiked((prev) => !prev);
      setOptimisticCount((prev) => (optimisticLiked ? prev - 1 : prev + 1));
    },
    onSuccess: (data) => {
      setOptimisticLiked(data.liked);
      setOptimisticCount(data.like_count);
      isMutating.current = false;
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["communityPosts"] });
      queryClient.invalidateQueries({ queryKey: ["post", post.id] });
    },
    onError: () => {
      setOptimisticLiked(post.liked_by_me);
      setOptimisticCount(post.like_count);
      isMutating.current = false;
    },
  });

  const handleLike = useCallback(() => {
    likeMutation.mutate();
  }, [likeMutation]);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <TouchableOpacity onPress={onAuthorPress}>
        <View style={styles.authorRow}>
          <View style={styles.avatarSmall}>
            <Text style={styles.avatarText}>
              {post.author.full_name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={styles.author}>{post.author.full_name}</Text>
            <Text style={styles.username}>@{post.author.username}</Text>
          </View>
        </View>
      </TouchableOpacity>

      <Text style={styles.content} numberOfLines={6}>{post.content}</Text>

      <View style={styles.actions}>
        <TouchableOpacity
          onPress={handleLike}
          style={styles.likeBtn}
          disabled={likeMutation.isPending}
        >
          <Text style={optimisticLiked ? styles.liked : styles.notLiked}>
            {optimisticLiked ? "\u2764" : "\u2661"} {optimisticCount}
          </Text>
        </TouchableOpacity>

        <Text style={styles.time}>{formatTimeAgo(post.created_at)}</Text>
      </View>
    </TouchableOpacity>
  );
}

// React.memo with custom comparator — skip re-render if post data unchanged
export default React.memo(PostCard, (prev, next) => {
  return (
    prev.post.id === next.post.id &&
    prev.post.liked_by_me === next.post.liked_by_me &&
    prev.post.like_count === next.post.like_count &&
    prev.post.content === next.post.content &&
    prev.post.updated_at === next.post.updated_at
  );
});

function formatTimeAgo(dateStr: string): string {
  const diffSec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#fff", padding: 16, marginBottom: 8 },
  authorRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  avatarSmall: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: "#6C63FF",
    justifyContent: "center", alignItems: "center", marginRight: 10,
  },
  avatarText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  author: { fontWeight: "600", fontSize: 15 },
  username: { color: "#999", fontSize: 13 },
  content: { fontSize: 15, lineHeight: 22, marginBottom: 12 },
  actions: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  likeBtn: { paddingVertical: 4, paddingRight: 12 },
  liked: { color: "#e74c3c", fontWeight: "600", fontSize: 15 },
  notLiked: { color: "#999", fontSize: 15 },
  time: { color: "#bbb", fontSize: 12 },
});
