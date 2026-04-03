import React from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { searchCommunities } from "../../api/communities";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { CommunitiesStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<CommunitiesStackParamList, "CommunitiesList">;

export default function CommunitiesListScreen({ navigation }: Props) {
  // Default: show all communities (search with empty-ish query)
  // In a real build, replace with listCommunities(universityId) or a browse endpoint
  const { data, isLoading } = useQuery({
    queryKey: ["communities", "browse"],
    queryFn: () => searchCommunities("a", { page_size: 50 }),
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      data={data?.items ?? []}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate("CommunityDetail", { communityId: item.id })}
        >
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
          <Text style={styles.meta}>{item.member_count} members</Text>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: "#f5f5f5" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  card: { backgroundColor: "#fff", padding: 16, marginBottom: 1 },
  name: { fontSize: 16, fontWeight: "600", marginBottom: 4 },
  desc: { color: "#666", fontSize: 14, marginBottom: 8 },
  meta: { color: "#999", fontSize: 13 },
});
