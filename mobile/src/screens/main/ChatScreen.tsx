import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listMessages, sendMessage } from "../../api/messaging";
import { useAuthStore } from "../../store/authStore";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { MessagesStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<MessagesStackParamList, "Chat">;

export default function ChatScreen({ route }: Props) {
  const { conversationId, participantName } = route.params;
  const me = useAuthStore((s) => s.user);
  const [text, setText] = useState("");
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: () => listMessages(conversationId, { page_size: 50 }),
    refetchInterval: 5000, // Poll every 5s (replace with WebSocket later)
  });

  const sendMutation = useMutation({
    mutationFn: () => sendMessage(conversationId, { content: text.trim() }),
    onSuccess: () => {
      setText("");
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  // Reverse so newest is at bottom
  const messages = [...(data?.items ?? [])].reverse();

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const isMe = item.sender.id === me?.id;
          return (
            <View style={[styles.bubble, isMe ? styles.myBubble : styles.theirBubble]}>
              <Text style={isMe ? styles.myText : styles.theirText}>{item.content}</Text>
            </View>
          );
        }}
        contentContainerStyle={styles.messageList}
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          value={text}
          onChangeText={setText}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !text.trim() && styles.disabled]}
          onPress={() => sendMutation.mutate()}
          disabled={!text.trim() || sendMutation.isPending}
        >
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  messageList: { padding: 12 },
  bubble: { maxWidth: "80%", padding: 12, borderRadius: 16, marginBottom: 8 },
  myBubble: { backgroundColor: "#6C63FF", alignSelf: "flex-end" },
  theirBubble: { backgroundColor: "#fff", alignSelf: "flex-start" },
  myText: { color: "#fff", fontSize: 15 },
  theirText: { color: "#333", fontSize: 15 },
  inputRow: {
    flexDirection: "row", padding: 10, backgroundColor: "#fff",
    borderTopWidth: 1, borderTopColor: "#eee",
  },
  input: { flex: 1, backgroundColor: "#f0f0f0", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15 },
  sendBtn: { marginLeft: 10, backgroundColor: "#6C63FF", borderRadius: 20, paddingHorizontal: 18, justifyContent: "center" },
  disabled: { opacity: 0.4 },
  sendText: { color: "#fff", fontWeight: "600" },
});
