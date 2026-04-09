// ── Navigation param lists ──────────────────────────────────
// Every screen's route params are defined here so navigation
// is fully type-safe across the app.

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type FeedStackParamList = {
  Feed: undefined;
  PostDetail: { postId: string };
  UserProfile: { userId: string };
  CommunityDetail: { communityId: string };
};

export type CommunitiesStackParamList = {
  CommunitiesList: undefined;
  CommunityDetail: { communityId: string };
  CreateCommunity: undefined;
  CreatePost: { communityId: string };
  PostDetail: { postId: string };
  UserProfile: { userId: string };
};

export type SearchStackParamList = {
  Search: undefined;
  UserProfile: { userId: string };
  CommunityDetail: { communityId: string };
};

export type NotificationsStackParamList = {
  NotificationsList: undefined;
  PostDetail: { postId: string };
  UserProfile: { userId: string };
};

export type MessagesStackParamList = {
  ConversationsList: undefined;
  Chat: { conversationId: string; participantName: string };
};

export type ProfileStackParamList = {
  MyProfile: undefined;
  EditProfile: undefined;
  Verification: undefined;
  UserProfile: { userId: string };
};

export type MainTabParamList = {
  FeedTab: undefined;
  CommunitiesTab: undefined;
  SearchTab: undefined;
  NotificationsTab: undefined;
  MessagesTab: undefined;
  ProfileTab: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};
