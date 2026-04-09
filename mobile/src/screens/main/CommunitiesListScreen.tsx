import React, { useState, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, RefreshControl,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { searchCommunities, listCommunities } from "../../api/communities";
import { useAuthStore } from "../../store/authStore";
import ErrorBanner from "../../components/common/ErrorBanner";
import { CommunitySkeleton } from "../../components/common/SkeletonLoader";
import type { StackScreenProps } from "@react-navigation/stack";
import type { CommunitiesStackParamList } from "../../navigation/types";
import type { CommunityResponse, CommunitySearchResult } from "../../types/api";

type Props = StackScreenProps<CommunitiesStackParamList, "CommunitiesList">;

const FLATLIST_OPTS = {
  removeClippedSubviews: true,
  initialNumToRender: 10,
  maxToRenderPerBatch: 8,
  windowSize: 7,
} as const;

export default function CommunitiesListScreen({ navigation }: Props) {
  const [search, setSearch] = useState("");
  const user = useAuthStore((s) => s.user);
  const trimmed = search.trim();
  const isSearching = trimmed.length >= 2;

  const searchQuery = useQuery({
    queryKey: ["communities", "search", trimmed],
    queryFn: () => searchCommunities(trimmed, { page_size: 50 }),
    enabled: isSearching,
  });

  const browseQuery = useQuery({
    queryKey: ["communities", "browse", user?.university_id],
    queryFn: () => listCommunities(user!.university_id!, { page_size: 50 }),
    enabled: !isSearching && !!user?.university_id,
    staleTime: 60_000, // Community list is stable — fresh for 60s
  });

  const activeQuery = isSearching ? searchQuery : browseQuery;
  const items = activeQuery.data?.items ?? [];

  const renderItem = useCallback(
    ({ item }: { item: CommunityResponse | CommunitySearchResult }) => (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate("CommunityDetail", { communityId: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
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
    ),
    [navigation]
  );

  const keyExtractor = useCallback((item: CommunityResponse | CommunitySearchResult) => item.id, []);

  if (activeQuery.isLoading) return <CommunitySkeleton />;

  if (activeQuery.isError) {
    return (
      <ErrorBanner
        message="Could not load communities"
        onRetry={() => activeQuery.refetch()}
      />
    );
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchBar}
        placeholder="Search communities..."
        placeholderTextColor="#aaa"
        value={search}
        onChangeText={setSearch}
        autoCapitalize="none"
      />

      <FlatList
        data={items}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={activeQuery.isRefetching}
            onRefresh={() => activeQuery.refetch()}
            tintColor="#6C63FF"
          />
        }
        ListEmptyComponent={emptyComponent}
        keyboardShouldPersistTaps="handled"
        {...FLATLIST_OPTS}
      />
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

const emptyComponent = (
  <View style={styles.center}>
    <Text style={styles.empty}>No communities found</Text>
  </View>
);
