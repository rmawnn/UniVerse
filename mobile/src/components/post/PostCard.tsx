import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toggleLike } from "../../api/posts";
import type { PostResponse } from "../../types/api";

interface Props {
  post: PostResponse;
  onPress: () => void;
  onAuthorPress: () => void;
}

export default function PostCard({ post, onPress, onAuthorPress }: Props) {
  const queryClient = useQueryClient();

  const likeMutation = useMutation({
    mutationFn: () => toggleLike(post.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["communityPosts"] });
      queryClient.invalidateQueries({ queryKey: ["post", post.id] });
    },
  });

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <TouchableOpacity onPress={onAuthorPress}>
        <Text style={styles.author}>{post.author.full_name}</Text>
        <Text style={styles.username}>@{post.author.username}</Text>
      </TouchableOpacity>

      <Text style={styles.content} numberOfLines={6}>{post.content}</Text>

      <View style={styles.actions}>
        <TouchableOpacity onPress={() => likeMutation.mutate()} style={styles.likeBtn}>
          <Text style={post.liked_by_me ? styles.liked : styles.notLiked}>
            {post.liked_by_me ? "Liked" : "Like"} ({post.like_count})
          </Text>
        </TouchableOpacity>

        <Text style={styles.time}>
          {new Date(post.created_at).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#fff", padding: 16, marginBottom: 8 },
  author: { fontWeight: "600", fontSize: 15 },
  username: { color: "#999", fontSize: 13, marginBottom: 10 },
  content: { fontSize: 15, lineHeight: 22, marginBottom: 12 },
  actions: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  likeBtn: { paddingVertical: 4 },
  liked: { color: "#6C63FF", fontWeight: "600" },
  notLiked: { color: "#999" },
  time: { color: "#bbb", fontSize: 12 },
});
