import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet } from "react-native";

interface SkeletonLineProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: object;
}

function SkeletonLine({
  width = "100%",
  height = 14,
  borderRadius = 6,
  style,
}: SkeletonLineProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { width: width as any, height, borderRadius, backgroundColor: "#e0e0e0", opacity },
        style,
      ]}
    />
  );
}

/** Skeleton that mimics a PostCard layout */
export function FeedSkeleton() {
  return (
    <View style={skeletonStyles.container}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={skeletonStyles.card}>
          <View style={skeletonStyles.authorRow}>
            <SkeletonLine width={36} height={36} borderRadius={18} />
            <View style={skeletonStyles.authorInfo}>
              <SkeletonLine width={120} height={14} />
              <SkeletonLine width={80} height={12} style={{ marginTop: 6 }} />
            </View>
          </View>
          <SkeletonLine width="100%" height={14} style={{ marginTop: 12 }} />
          <SkeletonLine width="90%" height={14} style={{ marginTop: 8 }} />
          <SkeletonLine width="60%" height={14} style={{ marginTop: 8 }} />
          <View style={skeletonStyles.actionsRow}>
            <SkeletonLine width={50} height={14} />
            <SkeletonLine width={40} height={12} />
          </View>
        </View>
      ))}
    </View>
  );
}

/** Skeleton that mimics a community list card */
export function CommunitySkeleton() {
  return (
    <View style={skeletonStyles.container}>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={skeletonStyles.communityCard}>
          <SkeletonLine width="60%" height={16} />
          <SkeletonLine width="90%" height={13} style={{ marginTop: 8 }} />
          <SkeletonLine width={80} height={12} style={{ marginTop: 8 }} />
        </View>
      ))}
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  card: {
    backgroundColor: "#fff",
    padding: 16,
    marginBottom: 8,
  },
  authorRow: { flexDirection: "row", alignItems: "center" },
  authorInfo: { marginLeft: 10 },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
  },
  communityCard: {
    backgroundColor: "#fff",
    padding: 16,
    marginBottom: 1,
  },
});
