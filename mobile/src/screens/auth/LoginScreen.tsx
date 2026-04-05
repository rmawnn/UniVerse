import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import type { StackScreenProps } from "@react-navigation/stack";
import type { AuthStackParamList } from "../../navigation/types";
import { useAuthStore } from "../../store/authStore";

type Props = StackScreenProps<AuthStackParamList, "Login">;

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login, isLoading } = useAuthStore();

  const handleLogin = async () => {
    setError("");
    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields");
      return;
    }
    try {
      await login({ email: email.trim().toLowerCase(), password });
    } catch (err: any) {
      setError(err.message ?? "Invalid email or password");
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.inner}>
        <Text style={styles.title}>UniVerse</Text>
        <Text style={styles.subtitle}>Welcome back</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

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
          placeholder="Password"
          value={password}
          onChangeText={(t) => { setPassword(t); setError(""); }}
          secureTextEntry
          textContentType="password"
          editable={!isLoading}
          onSubmitEditing={handleLogin}
        />

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("Register")} disabled={isLoading}>
          <Text style={styles.link}>Don't have an account? Register</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  inner: { flex: 1, justifyContent: "center", paddingHorizontal: 24 },
  title: { fontSize: 32, fontWeight: "700", textAlign: "center", color: "#6C63FF" },
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
