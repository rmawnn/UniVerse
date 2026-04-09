import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { MessageResponse } from "../../types/api";

interface Props {
  message: MessageResponse;
  isMe: boolean;
}

function MessageBubble({ message, isMe }: Props) {
  return (
    <View style={[styles.row, isMe ? styles.rowRight : styles.rowLeft]}>
      {!isMe && (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {message.sender.full_name.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <View style={[styles.bubble, isMe ? styles.myBubble : styles.theirBubble]}>
        {!isMe && (
          <Text style={styles.senderName}>{message.sender.full_name}</Text>
        )}
        <Text style={isMe ? styles.myText : styles.theirText}>
          {message.content}
        </Text>
        <Text style={[styles.time, isMe ? styles.myTime : styles.theirTime]}>
          {formatTime(message.created_at)}
        </Text>
      </View>
    </View>
  );
}

// React.memo — messages are immutable, skip re-render if same id
export default React.memo(MessageBubble, (prev, next) => {
  return prev.message.id === next.message.id && prev.isMe === next.isMe;
});

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffHr = diffMs / (1000 * 60 * 60);

  if (diffHr < 24 && d.getDate() === now.getDate()) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (diffHr < 48) {
    return "Yesterday " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return (
    d.toLocaleDateString([], { month: "short", day: "numeric" }) +
    " " +
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", marginBottom: 6, paddingHorizontal: 12 },
  rowLeft: { justifyContent: "flex-start" },
  rowRight: { justifyContent: "flex-end" },
  avatar: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: "#6C63FF",
    justifyContent: "center", alignItems: "center", marginRight: 8, marginTop: 4,
  },
  avatarText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  bubble: { maxWidth: "75%", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  myBubble: { backgroundColor: "#6C63FF", borderBottomRightRadius: 4 },
  theirBubble: { backgroundColor: "#fff", borderBottomLeftRadius: 4, borderWidth: 1, borderColor: "#eee" },
  senderName: { fontSize: 12, fontWeight: "600", color: "#6C63FF", marginBottom: 2 },
  myText: { color: "#fff", fontSize: 15, lineHeight: 20 },
  theirText: { color: "#333", fontSize: 15, lineHeight: 20 },
  time: { fontSize: 11, marginTop: 4 },
  myTime: { color: "rgba(255,255,255,0.65)", textAlign: "right" },
  theirTime: { color: "#aaa" },
});
