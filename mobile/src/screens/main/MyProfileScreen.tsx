import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { useAuthStore } from "../../store/authStore";
import type { StackScreenProps } from "@react-navigation/stack";
import type { ProfileStackParamList } from "../../navigation/types";

type Props = StackScreenProps<ProfileStackParamList, "MyProfile">;

export default function MyProfileScreen(_props: Props) {
  const { user, logout } = useAuthStore();

  if (!user) return null;

  const joined = new Date(user.created_at).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {user.full_name.charAt(0).toUpperCase()}
        </Text>
      </View>

      <Text style={styles.name}>{user.full_name}</Text>
      <Text style={styles.username}>@{user.username}</Text>
      <Text style={styles.email}>{user.email}</Text>

      {user.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}

      <View style={styles.info}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Verified Student</Text>
          <Text style={[styles.infoValue, user.is_verified_student ? styles.verified : styles.unverified]}>
            {user.is_verified_student ? "Yes" : "Not yet"}
          </Text>
        </View>
        {user.department ? (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Department</Text>
            <Text style={styles.infoValue}>{user.department}</Text>
          </View>
        ) : null}
        {user.academic_year ? (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Academic Year</Text>
            <Text style={styles.infoValue}>{user.academic_year}</Text>
          </View>
        ) : null}
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Joined</Text>
          <Text style={styles.infoValue}>{joined}</Text>
        </View>
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
  username: { color: "#666", fontSize: 15, marginTop: 4 },
  email: { color: "#999", fontSize: 14, marginTop: 2, marginBottom: 12 },
  bio: { color: "#444", fontSize: 15, textAlign: "center", marginBottom: 16, lineHeight: 22 },
  info: {
    width: "100%", backgroundColor: "#f9f9f9", borderRadius: 12,
    padding: 16, marginBottom: 24,
  },
  infoRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: "#eee",
  },
  infoLabel: { fontSize: 14, color: "#666" },
  infoValue: { fontSize: 14, color: "#333", fontWeight: "500" },
  verified: { color: "#4CAF50" },
  unverified: { color: "#f39c12" },
  logoutBtn: {
    borderWidth: 1, borderColor: "#e74c3c", borderRadius: 10,
    paddingVertical: 14, paddingHorizontal: 40,
  },
  logoutText: { color: "#e74c3c", fontWeight: "600", fontSize: 15 },
});
