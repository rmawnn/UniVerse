import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { useAuthStore } from "../../store/authStore";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ProfileStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<ProfileStackParamList, "MyProfile">;

export default function MyProfileScreen({ navigation }: Props) {
  const { user, logout } = useAuthStore();

  if (!user) return null;

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

      <View style={styles.info}>
        {user.department && (
          <Text style={styles.infoRow}>Department: {user.department}</Text>
        )}
        {user.academic_year && (
          <Text style={styles.infoRow}>Year: {user.academic_year}</Text>
        )}
        <Text style={styles.infoRow}>
          Verified: {user.is_verified_student ? "Yes" : "No"}
        </Text>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { alignItems: "center", paddingVertical: 40, paddingHorizontal: 24 },
  avatar: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: "#6C63FF",
    justifyContent: "center", alignItems: "center", marginBottom: 16,
  },
  avatarText: { color: "#fff", fontSize: 32, fontWeight: "700" },
  name: { fontSize: 22, fontWeight: "700" },
  username: { color: "#666", fontSize: 15, marginTop: 4, marginBottom: 12 },
  bio: { color: "#444", fontSize: 15, textAlign: "center", marginBottom: 16 },
  info: { width: "100%", backgroundColor: "#f9f9f9", borderRadius: 12, padding: 16, marginBottom: 24 },
  infoRow: { fontSize: 14, color: "#555", marginBottom: 8 },
  logoutBtn: {
    borderWidth: 1, borderColor: "#e74c3c", borderRadius: 10,
    paddingVertical: 14, paddingHorizontal: 40,
  },
  logoutText: { color: "#e74c3c", fontWeight: "600", fontSize: 15 },
});
