import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import type { StackScreenProps } from "@react-navigation/stack";
import type { AuthStackParamList } from "../../navigation/types";
import { useAuthStore } from "../../store/authStore";

type Props = StackScreenProps<AuthStackParamList, "Register">;

export default function RegisterScreen({ navigation }: Props) {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { register, isLoading } = useAuthStore();

  const handleRegister = async () => {
    setError("");
    if (!fullName.trim() || !username.trim() || !email.trim() || !password.trim()) {
      setError("Please fill in all fields");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
      setError("Username can only contain letters, numbers, and underscores");
      return;
    }
    try {
      await register({
        full_name: fullName.trim(),
        username: username.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        password,
      });
      // On success, authStore sets user → RootNavigator switches to MainTabs
    } catch (err: any) {
      setError(err.message ?? "Registration failed. Please try again.");
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join your university community</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TextInput
          style={styles.input}
          placeholder="Full Name"
          value={fullName}
          onChangeText={(t) => { setFullName(t); setError(""); }}
          textContentType="name"
          editable={!isLoading}
        />

        <TextInput
          style={styles.input}
          placeholder="Username"
          value={username}
          onChangeText={(t) => { setUsername(t); setError(""); }}
          autoCapitalize="none"
          textContentType="username"
          editable={!isLoading}
        />

        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={(t) => { setEmail(t); setError(""); }}
          autoCapitalize="none"
          keyboardType="email-address"
          textContentType="emailAddress"
          editable={!isLoading}
        />

        <TextInput
          style={styles.input}
          placeholder="Password (min 8 characters)"
          value={password}
          onChangeText={(t) => { setPassword(t); setError(""); }}
          secureTextEntry
          textContentType="newPassword"
          editable={!isLoading}
        />

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.buttonText}>Create Account</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("Login")} disabled={isLoading}>
          <Text style={styles.link}>Already have an account? Sign in</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  inner: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 24, paddingVertical: 40 },
  title: { fontSize: 28, fontWeight: "700", textAlign: "center", color: "#6C63FF" },
  subtitle: { fontSize: 16, textAlign: "center", color: "#666", marginBottom: 32, marginTop: 8 },
  error: {
    color: "#e74c3c", fontSize: 14, textAlign: "center",
    marginBottom: 16, backgroundColor: "#fdeaea", padding: 12, borderRadius: 8,
  },
  input: {
    borderWidth: 1, borderColor: "#ddd", borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, marginBottom: 14, backgroundColor: "#fafafa",
  },
  button: {
    backgroundColor: "#6C63FF", borderRadius: 10,
    paddingVertical: 16, alignItems: "center", marginTop: 8, marginBottom: 16,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  link: { textAlign: "center", color: "#6C63FF", fontSize: 14 },
});
