import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { useQuery } from "@tanstack/react-query";
import { listNotifications } from "../api/notifications";
import { useAuthStore } from "../store/authStore";
import type {
  MainTabParamList,
  FeedStackParamList,
  CommunitiesStackParamList,
  SearchStackParamList,
  NotificationsStackParamList,
  MessagesStackParamList,
  ProfileStackParamList,
} from "./types";

// Screen imports
import FeedScreen from "../screens/main/FeedScreen";
import PostDetailScreen from "../screens/main/PostDetailScreen";
import CommunitiesListScreen from "../screens/main/CommunitiesListScreen";
import CommunityDetailScreen from "../screens/main/CommunityDetailScreen";
import CreatePostScreen from "../screens/main/CreatePostScreen";
import SearchScreen from "../screens/main/SearchScreen";
import NotificationsScreen from "../screens/main/NotificationsScreen";
import ConversationsScreen from "../screens/main/ConversationsScreen";
import ChatScreen from "../screens/main/ChatScreen";
import MyProfileScreen from "../screens/main/MyProfileScreen";
import VerificationScreen from "../screens/main/VerificationScreen";
import UserProfileScreen from "../screens/main/UserProfileScreen";

// ── Feed Stack ──────────────────────────────────────────────

const FeedNav = createStackNavigator<FeedStackParamList>();
function FeedStack() {
  return (
    <FeedNav.Navigator>
      <FeedNav.Screen name="Feed" component={FeedScreen} />
      <FeedNav.Screen name="PostDetail" component={PostDetailScreen} />
      <FeedNav.Screen name="UserProfile" component={UserProfileScreen} />
      <FeedNav.Screen name="CommunityDetail" component={CommunityDetailScreen} />
    </FeedNav.Navigator>
  );
}

// ── Communities Stack ───────────────────────────────────────

const CommNav = createStackNavigator<CommunitiesStackParamList>();
function CommunitiesStack() {
  return (
    <CommNav.Navigator>
      <CommNav.Screen name="CommunitiesList" component={CommunitiesListScreen} />
      <CommNav.Screen name="CommunityDetail" component={CommunityDetailScreen} />
      <CommNav.Screen name="CreatePost" component={CreatePostScreen} />
      <CommNav.Screen name="PostDetail" component={PostDetailScreen} />
      <CommNav.Screen name="UserProfile" component={UserProfileScreen} />
    </CommNav.Navigator>
  );
}

// ── Search Stack ────────────────────────────────────────────

const SearchNav = createStackNavigator<SearchStackParamList>();
function SearchStack() {
  return (
    <SearchNav.Navigator>
      <SearchNav.Screen name="Search" component={SearchScreen} />
      <SearchNav.Screen name="UserProfile" component={UserProfileScreen} />
      <SearchNav.Screen name="CommunityDetail" component={CommunityDetailScreen} />
    </SearchNav.Navigator>
  );
}

// ── Notifications Stack ─────────────────────────────────────

const NotifNav = createStackNavigator<NotificationsStackParamList>();
function NotificationsStack() {
  return (
    <NotifNav.Navigator>
      <NotifNav.Screen name="NotificationsList" component={NotificationsScreen} />
      <NotifNav.Screen name="PostDetail" component={PostDetailScreen} />
      <NotifNav.Screen name="UserProfile" component={UserProfileScreen} />
    </NotifNav.Navigator>
  );
}

// ── Messages Stack ──────────────────────────────────────────

const MsgNav = createStackNavigator<MessagesStackParamList>();
function MessagesStack() {
  return (
    <MsgNav.Navigator>
      <MsgNav.Screen name="ConversationsList" component={ConversationsScreen} />
      <MsgNav.Screen name="Chat" component={ChatScreen} />
    </MsgNav.Navigator>
  );
}

// ── Profile Stack ───────────────────────────────────────────

const ProfNav = createStackNavigator<ProfileStackParamList>();
function ProfileStack() {
  return (
    <ProfNav.Navigator>
      <ProfNav.Screen name="MyProfile" component={MyProfileScreen} />
      <ProfNav.Screen name="Verification" component={VerificationScreen} />
      <ProfNav.Screen name="UserProfile" component={UserProfileScreen} />
    </ProfNav.Navigator>
  );
}

// ── Badge Component ─────────────────────────────────────────

function TabBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  const label = count > 99 ? "99+" : String(count);
  return (
    <View style={badgeStyles.badge}>
      <Text style={badgeStyles.text}>{label}</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  badge: {
    position: "absolute",
    top: -4,
    right: -12,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#e74c3c",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  text: { color: "#fff", fontSize: 10, fontWeight: "700" },
});

// ── Hook: unread notification count ─────────────────────────

function useUnreadCount(): number {
  const token = useAuthStore((s) => s.token);

  const { data } = useQuery({
    queryKey: ["notifications", "badge"],
    queryFn: () => listNotifications({ page_size: 50 }),
    refetchInterval: 15000, // Poll every 15s for badge
    enabled: !!token,
  });

  if (!data?.items) return 0;
  return data.items.filter((n) => !n.is_read).length;
}

// ── Tab Navigator ───────────────────────────────────────────

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabs() {
  const unreadCount = useUnreadCount();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#6C63FF",
        tabBarInactiveTintColor: "#999",
      }}
    >
      <Tab.Screen
        name="FeedTab"
        component={FeedStack}
        options={{ tabBarLabel: "Feed" }}
      />
      <Tab.Screen
        name="CommunitiesTab"
        component={CommunitiesStack}
        options={{ tabBarLabel: "Communities" }}
      />
      <Tab.Screen
        name="SearchTab"
        component={SearchStack}
        options={{ tabBarLabel: "Search" }}
      />
      <Tab.Screen
        name="NotificationsTab"
        component={NotificationsStack}
        options={{
          tabBarLabel: "Alerts",
          tabBarBadge: unreadCount > 0 ? (unreadCount > 99 ? "99+" : unreadCount) : undefined,
          tabBarBadgeStyle: {
            backgroundColor: "#e74c3c",
            fontSize: 10,
            fontWeight: "700",
            minWidth: 18,
            height: 18,
            lineHeight: 18,
            borderRadius: 9,
          },
        }}
      />
      <Tab.Screen
        name="MessagesTab"
        component={MessagesStack}
        options={{ tabBarLabel: "Messages" }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStack}
        options={{ tabBarLabel: "Profile" }}
      />
    </Tab.Navigator>
  );
}
