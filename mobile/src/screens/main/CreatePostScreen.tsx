import React, { useState } from "react";
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Alert } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createPost } from "../../api/posts";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { CommunitiesStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<CommunitiesStackParamList, "CreatePost">;

export default function CreatePostScreen({ route, navigation }: Props) {
  const { communityId } = route.params;
  const [content, setContent] = useState("");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => createPost(communityId, { content: content.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communityPosts", communityId] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      navigation.goBack();
    },
    onError: (err: any) => Alert.alert("Error", err.message),
  });

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="What's on your mind?"
        value={content}
        onChangeText={setContent}
        multiline
        textAlignVertical="top"
        autoFocus
      />
      <TouchableOpacity
        style={[styles.button, (!content.trim() || mutation.isPending) && styles.disabled]}
        onPress={() => mutation.mutate()}
        disabled={!content.trim() || mutation.isPending}
      >
        <Text style={styles.buttonText}>
          {mutation.isPending ? "Posting..." : "Post"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16 },
  input: { flex: 1, fontSize: 16, lineHeight: 24, marginBottom: 16 },
  button: {
    backgroundColor: "#6C63FF", borderRadius: 10,
    paddingVertical: 14, alignItems: "center",
  },
  disabled: { opacity: 0.5 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
