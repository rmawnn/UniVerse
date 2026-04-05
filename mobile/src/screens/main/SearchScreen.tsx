import React, { useState } from "react";
import {
  View,
  TextInput,
  FlatList,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { searchUsers } from "../../api/users";
import { searchCommunities } from "../../api/communities";
import type { StackScreenProps } from "@react-navigation/stack";
import type { SearchStackParamList } from "../../navigation/types";

type Props = StackScreenProps<SearchStackParamList, "Search">;
type Tab = "users" | "communities";

export default function SearchScreen({ navigation }: Props) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("users");
  const trimmed = query.trim();
  const enabled = trimmed.length >= 2;

  const usersQuery = useQuery({
    queryKey: ["searchUsers", trimmed],
    queryFn: () => searchUsers(trimmed),
    enabled: enabled && tab === "users",
  });

  const commQuery = useQuery({
    queryKey: ["searchCommunities", trimmed],
    queryFn: () => searchCommunities(trimmed),
    enabled: enabled && tab === "communities",
  });

  const activeQuery = tab === "users" ? usersQuery : commQuery;

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchBar}
        placeholder="Search users or communities..."
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
      />

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === "users" && styles.activeTab]}
          onPress={() => setTab("users")}
        >
          <Text style={tab === "users" ? styles.activeTabText : styles.tabText}>Users</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === "communities" && styles.activeTab]}
          onPress={() => setTab("communities")}
        >
          <Text style={tab === "communities" ? styles.activeTabText : styles.tabText}>Communities</Text>
        </TouchableOpacity>
      </View>

      {activeQuery.isLoading && (
        <View style={styles.center}>
          <ActivityIndicator color="#6C63FF" />
        </View>
      )}

      {tab === "users" && usersQuery.data && (
        <FlatList
          data={usersQuery.data.items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() => navigation.navigate("UserProfile", { userId: item.id })}
            >
              <Text style={styles.name}>{item.full_name}</Text>
              <Text style={styles.username}>@{item.username}</Text>
            </TouchableOpacity>
          )}
        />
      )}

      {tab === "communities" && commQuery.data && (
        <FlatList
          data={commQuery.data.items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() => navigation.navigate("CommunityDetail", { communityId: item.id })}
            >
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.username}>{item.member_count} members</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  searchBar: {
    backgroundColor: "#fff", margin: 12, borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 12, fontSize: 16,
  },
  tabs: { flexDirection: "row", paddingHorizontal: 12, marginBottom: 4 },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 8 },
  activeTab: { backgroundColor: "#6C63FF" },
  tabText: { color: "#666", fontWeight: "500" },
  activeTabText: { color: "#fff", fontWeight: "600" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  row: { backgroundColor: "#fff", padding: 14, borderBottomWidth: 1, borderBottomColor: "#eee" },
  name: { fontWeight: "600", fontSize: 15 },
  username: { color: "#999", fontSize: 13, marginTop: 2 },
});
