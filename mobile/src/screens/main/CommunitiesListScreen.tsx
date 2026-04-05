import React, { useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, RefreshControl,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { searchCommunities, listCommunities } from "../../api/communities";
import { useAuthStore } from "../../store/authStore";
import type { StackScreenProps } from "@react-navigation/stack";
import type { CommunitiesStackParamList } from "../../navigation/types";

type Props = StackScreenProps<CommunitiesStackParamList, "CommunitiesList">;

export default function CommunitiesListScreen({ navigation }: Props) {
  const [search, setSearch] = useState("");
  const user = useAuthStore((s) => s.user);
  const trimmed = search.trim();
  const isSearching = trimmed.length >= 2;

  // When searching: use search endpoint
  // When browsing: list by user's university
  const searchQuery = useQuery({
    queryKey: ["communities", "search", trimmed],
    queryFn: () => searchCommunities(trimmed, { page_size: 50 }),
    enabled: isSearching,
  });

  const browseQuery = useQuery({
    queryKey: ["communities", "browse", user?.university_id],
    queryFn: () => listCommunities(user!.university_id!, { page_size: 50 }),
    enabled: !isSearching && !!user?.university_id,
  });

  const activeQuery = isSearching ? searchQuery : browseQuery;
  const items = activeQuery.data?.items ?? [];

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchBar}
        placeholder="Search communities..."
        value={search}
        onChangeText={setSearch}
        autoCapitalize="none"
      />

      {activeQuery.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#6C63FF" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate("CommunityDetail", { communityId: item.id })}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.name}>{item.name}</Text>
                {"is_member" in item && item.is_member && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>Joined</Text>
                  </View>
                )}
              </View>
              {item.description ? (
                <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
              ) : null}
              <Text style={styles.meta}>{item.member_count} members</Text>
            </TouchableOpacity>
          )}
          refreshControl={
            <RefreshControl
              refreshing={activeQuery.isRefetching}
              onRefresh={() => activeQuery.refetch()}
              tintColor="#6C63FF"
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.empty}>
                {isSearching ? "No communities found" : "No communities yet"}
              </Text>
            </View>
          }
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
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  card: { backgroundColor: "#fff", padding: 16, marginBottom: 1 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  name: { fontSize: 16, fontWeight: "600", marginBottom: 4, flex: 1 },
  badge: {
    backgroundColor: "#E8F5E9", paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 12, marginLeft: 8,
  },
  badgeText: { color: "#4CAF50", fontSize: 12, fontWeight: "600" },
  desc: { color: "#666", fontSize: 14, marginBottom: 8 },
  meta: { color: "#999", fontSize: 13 },
  empty: { color: "#999", fontSize: 16, textAlign: "center" },
});
