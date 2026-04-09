import React, { useState, useRef, useCallback, useMemo } from "react";
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, SafeAreaView,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listMessages, sendMessage } from "../../api/messaging";
import { useAuthStore } from "../../store/authStore";
import MessageBubble from "../../components/messaging/MessageBubble";
import type { StackScreenProps } from "@react-navigation/stack";
import type { MessagesStackParamList } from "../../navigation/types";
import type { MessageResponse } from "../../types/api";

type Props = StackScreenProps<MessagesStackParamList, "Chat">;

const FLATLIST_OPTS = {
  removeClippedSubviews: true,
  initialNumToRender: 20,
  maxToRenderPerBatch: 12,
  windowSize: 11,
} as const;

export default function ChatScreen({ route, navigation }: Props) {
  const { conversationId, participantName } = route.params;
  const me = useAuthStore((s) => s.user);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const queryClient = useQueryClient();
  const flatListRef = useRef<FlatList>(null);
  const myId = me?.id;

  React.useLayoutEffect(() => {
    navigation.setOptions({ title: participantName });
  }, [navigation, participantName]);

  const { data, isLoading } = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: () => listMessages(conversationId, { page_size: 100 }),
    refetchInterval: 3000,
  });

  const sendMutation = useMutation({
    mutationFn: (content: string) => sendMessage(conversationId, { content }),
    onSuccess: () => {
      setText("");
      setError("");
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (err: any) => setError(err.message ?? "Could not send message"),
  });

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || sendMutation.isPending) return;
    setError("");
    sendMutation.mutate(trimmed);
  }, [text, sendMutation]);

  const handleTextChange = useCallback((t: string) => {
    setText(t);
    if (error) setError("");
  }, [error]);

  // Memoize reversed messages to avoid re-reversing on every render
  const messages = useMemo(
    () => [...(data?.items ?? [])].reverse(),
    [data?.items]
  );

  const renderItem = useCallback(
    ({ item }: { item: MessageResponse }) => (
      <MessageBubble message={item} isMe={item.sender.id === myId} />
    ),
    [myId]
  );

  const keyExtractor = useCallback((item: MessageResponse) => item.id, []);

  const scrollToEnd = useCallback(() => {
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: false });
    }
  }, [messages.length]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.messageList,
            messages.length === 0 && styles.emptyList,
          ]}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>💬</Text>
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptyHint}>Say hello to {participantName}!</Text>
            </View>
          }
          onContentSizeChange={scrollToEnd}
          onLayout={scrollToEnd}
          {...FLATLIST_OPTS}
        />

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor="#aaa"
            value={text}
            onChangeText={handleTextChange}
            multiline
            maxLength={2000}
            returnKeyType="default"
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              (!text.trim() || sendMutation.isPending) && styles.sendBtnDisabled,
            ]}
            onPress={handleSend}
            disabled={!text.trim() || sendMutation.isPending}
            activeOpacity={0.7}
          >
            {sendMutation.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.sendIcon}>➤</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  messageList: { paddingVertical: 12 },
  emptyList: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyContainer: { alignItems: "center", padding: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: "#666", marginBottom: 6 },
  emptyHint: { fontSize: 14, color: "#999" },
  errorBanner: { backgroundColor: "#fdecea", paddingHorizontal: 16, paddingVertical: 8 },
  errorText: { color: "#c0392b", fontSize: 13 },
  inputRow: {
    flexDirection: "row", alignItems: "flex-end", padding: 10,
    backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#eee",
  },
  input: {
    flex: 1, backgroundColor: "#f0f0f0", borderRadius: 22,
    paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, maxHeight: 100, lineHeight: 20,
  },
  sendBtn: {
    marginLeft: 10, width: 44, height: 44, borderRadius: 22,
    backgroundColor: "#6C63FF", justifyContent: "center", alignItems: "center",
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendIcon: { color: "#fff", fontSize: 20 },
});
