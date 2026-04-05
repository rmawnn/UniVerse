import "react-native-gesture-handler"; // Must be first import
import React from "react";
import { StatusBar } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RootNavigator from "./src/navigation/RootNavigator";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,       // Data considered fresh for 30s
      retry: 1,                // Retry failed requests once
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <StatusBar barStyle="dark-content" />
        <RootNavigator />
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
