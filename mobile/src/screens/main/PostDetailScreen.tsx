import React, { useState, useCallback } from "react";
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPost, listComments, createComment, toggleLike } from "../../api/posts";
import ErrorBanner from "../../components/common/ErrorBanner";
import type { StackScreenProps } from "@react-navigation/stack";
import type { FeedStackParamList } from "../../navigation/types";
import type { CommentResponse } from "../../types/api";

type Props = StackScreenProps<FeedStackParamList, "PostDetail">;

const FLATLIST_OPTS = {
  removeClippedSubviews: true,
  initialNumToRender: 15,
  maxToRenderPerBatch: 10,
  windowSize: 7,
} as const;

// ── Memoized comment row ─────────────────────────────────────

const CommentRow = React.memo(
  function CommentRow({ item }: { item: CommentResponse }) {
    return (
      <View style={styles.comment}>
        <View style={styles.commentAuthorRow}>
          <Text style={styles.commentAuthor}>{item.author.full_name}</Text>
          <Text style={styles.commentUsername}> @{item.author.username}</Text>
        </View>
        <Text style={styles.commentContent}>{item.content}</Text>
      </View>
    );
  },
  (prev, next) => prev.item.id === next.item.id
);

// ── Main Screen ──────────────────────────────────────────────

export default function PostDetailScreen({ route, navigation }: Props) {
  const { postId } = route.params;
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState("");

  const postQuery = useQuery({
    queryKey: ["post", postId],
    queryFn: () => getPost(postId),
    staleTime: 15_000,
  });

  const commentsQuery = useQuery({
    queryKey: ["comments", postId],
    queryFn: () => listComments(postId),
    staleTime: 10_000,
  });

  const likeMutation = useMutation({
    mutationFn: () => toggleLike(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["post", postId] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });

  const commentMutation = useMutation({
    mutationFn: () => createComment(postId, { content: commentText.trim() }),
    onSuccess: () => {
      setCommentText("");
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
    },
  });

  const handleLike = useCallback(() => {
    likeMutation.mutate();
  }, [likeMutation]);

  const handleSendComment = useCallback(() => {
    commentMutation.mutate();
  }, [commentMutation]);

  const renderComment = useCallback(
    ({ item }: { item: CommentResponse }) => <CommentRow item={item} />,
    []
  );

  const keyExtractor = useCallback((item: CommentResponse) => item.id, []);

  if (postQuery.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  if (postQuery.isError) {
    return <ErrorBanner message="Could not load post" onRetry={() => postQuery.refetch()} />;
  }

  const post = postQuery.data;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        style={styles.list}
        ListHeaderComponent={
          post ? (
            <View style={styles.postCard}>
              <TouchableOpacity
                onPress={() => navigation.navigate("UserProfile", { userId: post.author.id })}
              >
                <View style={styles.authorRow}>
                  <View style={styles.avatarSmall}>
                    <Text style={styles.avatarText}>
                      {post.author.full_name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.authorName}>{post.author.full_name}</Text>
                    <Text style={styles.authorUsername}>@{post.author.username}</Text>
                  </View>
                </View>
              </TouchableOpacity>

              <Text style={styles.content}>{post.content}</Text>

              <View style={styles.metaRow}>
                <TouchableOpacity onPress={handleLike} disabled={likeMutation.isPending}>
                  <Text style={post.liked_by_me ? styles.liked : styles.notLiked}>
                    {post.liked_by_me ? "\u2764" : "\u2661"} {post.like_count}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.time}>
                  {new Date(post.created_at).toLocaleDateString()}
                </Text>
              </View>

              <View style={styles.commentHeader}>
                <Text style={styles.commentHeaderText}>
                  Comments ({commentsQuery.data?.total ?? 0})
                </Text>
              </View>
            </View>
          ) : null
        }
        data={commentsQuery.data?.items ?? []}
        keyExtractor={keyExtractor}
        renderItem={renderComment}
        ListEmptyComponent={
          !commentsQuery.isLoading ? (
            <Text style={styles.emptyComments}>No comments yet</Text>
          ) : null
        }
        {...FLATLIST_OPTS}
      />

      <View style={styles.inputBar}>
        <TextInput
          style={styles.commentInput}
          placeholder="Write a comment..."
          placeholderTextColor="#aaa"
          value={commentText}
          onChangeText={setCommentText}
          multiline
          maxLength={2000}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!commentText.trim() || commentMutation.isPending) && styles.sendBtnDisabled]}
          onPress={handleSendComment}
          disabled={!commentText.trim() || commentMutation.isPending}
        >
          <Text style={styles.sendText}>
            {commentMutation.isPending ? "..." : "Send"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  list: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  postCard: { backgroundColor: "#fff", padding: 16, marginBottom: 8 },
  authorRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  avatarSmall: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: "#6C63FF",
    justifyContent: "center", alignItems: "center", marginRight: 10,
  },
  avatarText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  authorName: { fontWeight: "600", fontSize: 16 },
  authorUsername: { color: "#999", fontSize: 13 },
  content: { fontSize: 16, lineHeight: 24, marginBottom: 16 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  liked: { color: "#e74c3c", fontWeight: "600", fontSize: 16 },
  notLiked: { color: "#999", fontSize: 16 },
  time: { color: "#bbb", fontSize: 13 },
  commentHeader: { borderTopWidth: 1, borderTopColor: "#eee", paddingTop: 12 },
  commentHeaderText: { fontWeight: "600", fontSize: 14, color: "#666" },
  comment: { backgroundColor: "#fff", padding: 14, borderTopWidth: 1, borderTopColor: "#f0f0f0" },
  commentAuthorRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  commentAuthor: { fontWeight: "600", fontSize: 14 },
  commentUsername: { color: "#999", fontSize: 13 },
  commentContent: { fontSize: 14, lineHeight: 20, color: "#333" },
  emptyComments: { textAlign: "center", color: "#999", padding: 20, fontSize: 14 },
  inputBar: {
    flexDirection: "row", alignItems: "flex-end", backgroundColor: "#fff",
    padding: 10, borderTopWidth: 1, borderTopColor: "#eee",
  },
  commentInput: {
    flex: 1, backgroundColor: "#f5f5f5", borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: "#6C63FF", borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10, marginLeft: 8,
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendText: { color: "#fff", fontWeight: "600", fontSize: 14 },
});
