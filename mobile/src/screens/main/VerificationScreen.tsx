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
import { useMutation } from "@tanstack/react-query";
import { sendVerificationCode, confirmVerificationCode } from "../../api/verification";
import { useAuthStore } from "../../store/authStore";
import type { StackScreenProps } from "@react-navigation/stack";
import type { ProfileStackParamList } from "../../navigation/types";

type Props = StackScreenProps<ProfileStackParamList, "Verification">;

type Step = "email" | "code" | "success";

export default function VerificationScreen({ navigation }: Props) {
  const { user, refreshUser } = useAuthStore();
  const [step, setStep] = useState<Step>(
    user?.is_verified_student ? "success" : "email"
  );
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [debugCode, setDebugCode] = useState<string | null>(null);
  const [universityName, setUniversityName] = useState("");

  // ── Send code mutation ──────────────────────────────

  const sendMutation = useMutation({
    mutationFn: () =>
      sendVerificationCode({ university_email: email.trim().toLowerCase() }),
    onSuccess: (data) => {
      setError("");
      // In dev mode, backend may return the code for testing
      if (data.debug_code) {
        setDebugCode(data.debug_code);
      }
      setStep("code");
    },
    onError: (err: any) => {
      setError(err.message ?? "Could not send verification code");
    },
  });

  // ── Confirm code mutation ───────────────────────────

  const confirmMutation = useMutation({
    mutationFn: () =>
      confirmVerificationCode({
        university_email: email.trim().toLowerCase(),
        verification_code: code.trim(),
      }),
    onSuccess: async (data) => {
      setError("");
      setUniversityName(data.university_name ?? "");
      setStep("success");
      // Refresh user so is_verified_student updates globally
      await refreshUser();
    },
    onError: (err: any) => {
      setError(err.message ?? "Verification failed");
    },
  });

  // ── Handlers ────────────────────────────────────────

  const handleSendCode = () => {
    setError("");
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Please enter your university email");
      return;
    }
    if (!trimmed.includes("@") || !trimmed.includes(".")) {
      setError("Please enter a valid email address");
      return;
    }
    sendMutation.mutate();
  };

  const handleConfirmCode = () => {
    setError("");
    const trimmed = code.trim();
    if (!trimmed) {
      setError("Please enter the verification code");
      return;
    }
    if (trimmed.length !== 6) {
      setError("Verification code must be exactly 6 characters");
      return;
    }
    confirmMutation.mutate();
  };

  // ── Step 1: Email entry ─────────────────────────────

  const renderEmailStep = () => (
    <>
      <Text style={styles.title}>Verify your student status</Text>
      <Text style={styles.description}>
        Enter your university email address. We'll send a 6-digit code to
        verify you're a student. Verification unlocks posting, community
        creation, and full messaging access.
      </Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TextInput
        style={styles.input}
        placeholder="you@university.edu"
        placeholderTextColor="#aaa"
        value={email}
        onChangeText={(t) => {
          setEmail(t);
          if (error) setError("");
        }}
        autoCapitalize="none"
        keyboardType="email-address"
        textContentType="emailAddress"
        editable={!sendMutation.isPending}
        returnKeyType="send"
        onSubmitEditing={handleSendCode}
      />

      <TouchableOpacity
        style={[styles.primaryBtn, sendMutation.isPending && styles.btnDisabled]}
        onPress={handleSendCode}
        disabled={sendMutation.isPending}
        activeOpacity={0.7}
      >
        {sendMutation.isPending ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.primaryBtnText}>Send Verification Code</Text>
        )}
      </TouchableOpacity>
    </>
  );

  // ── Step 2: Code entry ──────────────────────────────

  const renderCodeStep = () => (
    <>
      <Text style={styles.title}>Enter verification code</Text>
      <Text style={styles.description}>
        We sent a 6-digit code to{"\n"}
        <Text style={styles.emailHighlight}>{email.trim().toLowerCase()}</Text>
        {"\n"}Check your inbox (and spam folder).
      </Text>

      {debugCode ? (
        <View style={styles.debugBanner}>
          <Text style={styles.debugText}>
            Dev mode — your code is: <Text style={styles.debugCode}>{debugCode}</Text>
          </Text>
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TextInput
        style={[styles.input, styles.codeInput]}
        placeholder="000000"
        placeholderTextColor="#ccc"
        value={code}
        onChangeText={(t) => {
          // Only allow alphanumeric, max 6
          const cleaned = t.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6);
          setCode(cleaned);
          if (error) setError("");
        }}
        autoCapitalize="characters"
        keyboardType="number-pad"
        maxLength={6}
        editable={!confirmMutation.isPending}
        returnKeyType="done"
        onSubmitEditing={handleConfirmCode}
      />

      <TouchableOpacity
        style={[styles.primaryBtn, confirmMutation.isPending && styles.btnDisabled]}
        onPress={handleConfirmCode}
        disabled={confirmMutation.isPending}
        activeOpacity={0.7}
      >
        {confirmMutation.isPending ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.primaryBtnText}>Confirm Code</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryBtn}
        onPress={() => {
          setStep("email");
          setCode("");
          setError("");
          setDebugCode(null);
        }}
        disabled={confirmMutation.isPending}
      >
        <Text style={styles.secondaryBtnText}>Use a different email</Text>
      </TouchableOpacity>
    </>
  );

  // ── Step 3: Success ─────────────────────────────────

  const renderSuccess = () => (
    <>
      <Text style={styles.successEmoji}>✅</Text>
      <Text style={styles.title}>You're verified!</Text>
      <Text style={styles.description}>
        {universityName
          ? `Your student status at ${universityName} has been confirmed.`
          : "Your student status has been confirmed."}
        {"\n\n"}You now have full access to all UniVerse features.
      </Text>

      <TouchableOpacity
        style={styles.primaryBtn}
        onPress={() => navigation.goBack()}
        activeOpacity={0.7}
      >
        <Text style={styles.primaryBtnText}>Back to Profile</Text>
      </TouchableOpacity>
    </>
  );

  // ── Layout ──────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Step indicator */}
        {step !== "success" && (
          <View style={styles.stepBar}>
            <View style={[styles.stepDot, styles.stepActive]} />
            <View style={[styles.stepLine, step === "code" && styles.stepLineActive]} />
            <View style={[styles.stepDot, step === "code" && styles.stepActive]} />
          </View>
        )}

        {step === "email" && renderEmailStep()}
        {step === "code" && renderCodeStep()}
        {step === "success" && renderSuccess()}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 40,
    alignItems: "center",
  },

  // Step indicator
  stepBar: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 32,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#ddd",
  },
  stepActive: { backgroundColor: "#6C63FF" },
  stepLine: {
    width: 60,
    height: 3,
    backgroundColor: "#ddd",
    marginHorizontal: 8,
  },
  stepLineActive: { backgroundColor: "#6C63FF" },

  // Text
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1a1a1a",
    textAlign: "center",
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },
  emailHighlight: {
    fontWeight: "600",
    color: "#6C63FF",
  },

  // Inputs
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: "#fafafa",
    marginBottom: 16,
  },
  codeInput: {
    textAlign: "center",
    fontSize: 24,
    letterSpacing: 8,
    fontWeight: "600",
  },

  // Buttons
  primaryBtn: {
    width: "100%",
    backgroundColor: "#6C63FF",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  secondaryBtn: {
    paddingVertical: 12,
  },
  secondaryBtnText: { color: "#6C63FF", fontSize: 14, fontWeight: "500" },

  // Error
  error: {
    color: "#e74c3c",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
    backgroundColor: "#fdeaea",
    padding: 12,
    borderRadius: 8,
    width: "100%",
  },

  // Debug banner (dev mode)
  debugBanner: {
    backgroundColor: "#fff3cd",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    width: "100%",
  },
  debugText: { fontSize: 13, color: "#856404", textAlign: "center" },
  debugCode: { fontWeight: "700", fontSize: 15 },

  // Success
  successEmoji: { fontSize: 56, marginBottom: 16 },
});
