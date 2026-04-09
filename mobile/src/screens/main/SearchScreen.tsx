import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { searchUsers } from "../../api/users";
import { searchCommunities } from "../../api/communities";
import type { StackScreenProps } from "@react-navigation/stack";
import type { SearchStackParamList } from "../../navigation/types";
import type { UserSearchResult, CommunitySearchResult } from "../../types/api";

type Props = StackScreenProps<SearchStackParamList, "Search">;
type Tab = "users" | "communities";

// ── Debounce hook ───────────────────────────────────────────

function useDebouncedValue(value: string, delayMs: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

// ── Main Screen ─────────────────────────────────────────────

export default function SearchScreen({ navigation }: Props) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("users");
  const inputRef = useRef<TextInput>(null);

  const debouncedQuery = useDebouncedValue(query.trim(), 350);
  const enabled = debouncedQuery.length >= 2;

  // ── Queries ─────────────────────────────────────────

  const usersQuery = useQuery({
    queryKey: ["searchUsers", debouncedQuery],
    queryFn: () => searchUsers(debouncedQuery, { page_size: 30 }),
    enabled: enabled && tab === "users",
  });

  const commQuery = useQuery({
    queryKey: ["searchCommunities", debouncedQuery],
    queryFn: () => searchCommunities(debouncedQuery, { page_size: 30 }),
    enabled: enabled && tab === "communities",
  });

  const activeQuery = tab === "users" ? usersQuery : commQuery;

  // ── Render helpers ──────────────────────────────────

  const renderUserItem = useCallback(
    ({ item }: { item: UserSearchResult }) => (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => navigation.navigate("UserProfile", { userId: item.id })}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.full_name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.cardContent}>
          <View style={styles.nameRow}>
            <Text style={styles.fullName} numberOfLines={1}>
              {item.full_name}
            </Text>
            {item.is_verified_student && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedIcon}>✓</Text>
              </View>
            )}
          </View>
          <Text style={styles.username}>@{item.username}</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
    ),
    [navigation]
  );

  const renderCommunityItem = useCallback(
    ({ item }: { item: CommunitySearchResult }) => (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() =>
          navigation.navigate("CommunityDetail", { communityId: item.id })
        }
      >
        <View style={[styles.avatar, styles.communityAvatar]}>
          <Text style={styles.avatarText}>
            {item.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.fullName} numberOfLines={1}>
            {item.name}
          </Text>
          {item.description ? (
            <Text style={styles.description} numberOfLines={1}>
              {item.description}
            </Text>
          ) : null}
          <Text style={styles.memberCount}>
            {item.member_count} {item.member_count === 1 ? "member" : "members"}
            {item.is_member ? "  ·  Joined" : ""}
          </Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
    ),
    [navigation]
  );

  // ── Prompt / empty states ───────────────────────────

  const renderPrompt = () => {
    if (!enabled && query.trim().length === 0) {
      return (
        <View style={styles.stateContainer}>
          <Text style={styles.stateEmoji}>🔍</Text>
          <Text style={styles.stateTitle}>Discover UniVerse</Text>
          <Text style={styles.stateHint}>
            Search for students and communities by name
          </Text>
        </View>
      );
    }
    if (!enabled && query.trim().length > 0) {
      return (
        <View style={styles.stateContainer}>
          <Text style={styles.stateHint}>Type at least 2 characters to search</Text>
        </View>
      );
    }
    return null;
  };

  const renderEmpty = () => (
    <View style={styles.stateContainer}>
      <Text style={styles.stateTitle}>No results found</Text>
      <Text style={styles.stateHint}>
        Try a different search term
      </Text>
    </View>
  );

  // ── Main render ─────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchBarContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          ref={inputRef}
          style={styles.searchInput}
          placeholder="Search users or communities..."
          placeholderTextColor="#aaa"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity
            onPress={() => setQuery("")}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.clearBtn}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, tab === "users" && styles.activeTab]}
          onPress={() => setTab("users")}
          activeOpacity={0.7}
        >
          <Text style={tab === "users" ? styles.activeTabText : styles.tabText}>
            Users
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === "communities" && styles.activeTab]}
          onPress={() => setTab("communities")}
          activeOpacity={0.7}
        >
          <Text
            style={
              tab === "communities" ? styles.activeTabText : styles.tabText
            }
          >
            Communities
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content area */}
      {!enabled ? (
        renderPrompt()
      ) : activeQuery.isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6C63FF" />
        </View>
      ) : activeQuery.isError ? (
        <View style={styles.stateContainer}>
          <Text style={styles.errorText}>Search failed — check your connection</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => activeQuery.refetch()}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : tab === "users" ? (
        <FlatList
          data={usersQuery.data?.items ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderUserItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmpty}
          keyboardShouldPersistTaps="handled"
        />
      ) : (
        <FlatList
          data={commQuery.data?.items ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderCommunityItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmpty}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },

  // Search bar
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    margin: 12,
    marginBottom: 8,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#eee",
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 10,
    color: "#333",
  },
  clearBtn: { color: "#aaa", fontSize: 16, padding: 4 },

  // Tabs
  tabBar: {
    flexDirection: "row",
    marginHorizontal: 12,
    marginBottom: 8,
    backgroundColor: "#eee",
    borderRadius: 10,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 9,
    alignItems: "center",
    borderRadius: 8,
  },
  activeTab: { backgroundColor: "#6C63FF" },
  tabText: { color: "#666", fontWeight: "500", fontSize: 14 },
  activeTabText: { color: "#fff", fontWeight: "600", fontSize: 14 },

  // Cards
  listContent: { paddingBottom: 20 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#6C63FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  communityAvatar: {
    backgroundColor: "#4ECDC4",
    borderRadius: 12,
  },
  avatarText: { color: "#fff", fontSize: 18, fontWeight: "700" },
  cardContent: { flex: 1 },
  nameRow: { flexDirection: "row", alignItems: "center" },
  fullName: { fontWeight: "600", fontSize: 15, color: "#1a1a1a", flexShrink: 1 },
  verifiedBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#6C63FF",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 6,
  },
  verifiedIcon: { color: "#fff", fontSize: 10, fontWeight: "800" },
  username: { color: "#888", fontSize: 13, marginTop: 2 },
  description: { color: "#777", fontSize: 13, marginTop: 2 },
  memberCount: { color: "#aaa", fontSize: 12, marginTop: 3 },
  chevron: { color: "#ccc", fontSize: 22, fontWeight: "300", marginLeft: 8 },

  // States
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  stateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  stateEmoji: { fontSize: 48, marginBottom: 12 },
  stateTitle: { fontSize: 18, fontWeight: "600", color: "#666", marginBottom: 8 },
  stateHint: { fontSize: 14, color: "#999", textAlign: "center", lineHeight: 20 },
  errorText: { fontSize: 15, color: "#e74c3c", marginBottom: 12, textAlign: "center" },
  retryBtn: {
    backgroundColor: "#6C63FF",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: { color: "#fff", fontWeight: "600" },
});
