import React, { useState } from "react";
import { View, TextInput, TouchableOpacity, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createPost } from "../../api/posts";
import type { StackScreenProps } from "@react-navigation/stack";
import type { CommunitiesStackParamList } from "../../navigation/types";

type Props = StackScreenProps<CommunitiesStackParamList, "CreatePost">;

export default function CreatePostScreen({ route, navigation }: Props) {
  const { communityId } = route.params;
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => createPost(communityId, { content: content.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communityPosts", communityId] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      navigation.goBack();
    },
    onError: (err: any) => setError(err.message ?? "Could not create post"),
  });

  return (
    <View style={styles.container}>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TextInput
        style={styles.input}
        placeholder="What's on your mind?"
        value={content}
        onChangeText={(t) => { setContent(t); setError(""); }}
        multiline
        textAlignVertical="top"
        autoFocus
        maxLength={5000}
        editable={!mutation.isPending}
      />

      <View style={styles.footer}>
        <Text style={styles.charCount}>{content.length} / 5000</Text>
        <TouchableOpacity
          style={[styles.button, (!content.trim() || mutation.isPending) && styles.disabled]}
          onPress={() => mutation.mutate()}
          disabled={!content.trim() || mutation.isPending}
        >
          {mutation.isPending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.buttonText}>Post</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16 },
  error: {
    color: "#e74c3c", fontSize: 14, backgroundColor: "#fdeaea",
    padding: 10, borderRadius: 8, marginBottom: 12, textAlign: "center",
  },
  input: { flex: 1, fontSize: 16, lineHeight: 24 },
  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 12 },
  charCount: { color: "#bbb", fontSize: 13 },
  button: {
    backgroundColor: "#6C63FF", borderRadius: 10,
    paddingVertical: 12, paddingHorizontal: 32, alignItems: "center",
  },
  disabled: { opacity: 0.5 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
