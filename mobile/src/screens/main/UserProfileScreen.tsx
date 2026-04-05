import React from "react";
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { getUserProfile } from "../../api/users";
import type { StackScreenProps } from "@react-navigation/stack";
import type { FeedStackParamList } from "../../navigation/types";

type Props = StackScreenProps<FeedStackParamList, "UserProfile">;

export default function UserProfileScreen({ route }: Props) {
  const { userId } = route.params;

  const { data: user, isLoading } = useQuery({
    queryKey: ["userProfile", userId],
    queryFn: () => getUserProfile(userId),
  });

  if (isLoading || !user) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {user.full_name.charAt(0).toUpperCase()}
        </Text>
      </View>

      <Text style={styles.name}>{user.full_name}</Text>
      <Text style={styles.username}>@{user.username}</Text>

      {user.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}

      {user.university_name && (
        <Text style={styles.university}>{user.university_name}</Text>
      )}

      {user.communities.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Communities</Text>
          {user.communities.map((c) => (
            <Text key={c.id} style={styles.communityName}>{c.name}</Text>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { alignItems: "center", paddingVertical: 40, paddingHorizontal: 24 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  avatar: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: "#6C63FF",
    justifyContent: "center", alignItems: "center", marginBottom: 16,
  },
  avatarText: { color: "#fff", fontSize: 32, fontWeight: "700" },
  name: { fontSize: 22, fontWeight: "700" },
  username: { color: "#666", fontSize: 15, marginTop: 4, marginBottom: 12 },
  bio: { color: "#444", fontSize: 15, textAlign: "center", marginBottom: 16 },
  university: { color: "#6C63FF", fontWeight: "500", fontSize: 14, marginBottom: 16 },
  section: { width: "100%", marginTop: 8 },
  sectionTitle: { fontWeight: "700", fontSize: 16, marginBottom: 8 },
  communityName: { color: "#555", fontSize: 14, marginBottom: 4 },
});
