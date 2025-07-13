import { useSignIn } from "@clerk/clerk-expo";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { height } = Dimensions.get("window");
const isSmallDevice = height < 812;

export default function ForgotPassword() {
  const { signIn, isLoaded } = useSignIn();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleResetPassword = async () => {
    setError("");
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    if (!isLoaded) return;
    setIsLoading(true);
    try {
      // Clerk password reset logic (simulate)
      // You may need to use Clerk's API for actual password reset
      await signIn.create({
        identifier: email,
        strategy: "reset_password_email_code",
      });
      Alert.alert("Check your email!", "We've sent you a reset link.");
      router.replace("/(auth)/sign-in");
    } catch (err: any) {
      setError("Failed to send reset email. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <View style={styles.container}>
            <View style={styles.textContainer}>
              <Text style={styles.title}>Lost Your Pass? No Problem.</Text>
              <Text style={styles.subtitle}>
                Give us your email, and we’ll send a new one. No one gets left
                outside.
              </Text>
            </View>
            <View style={styles.inputContainer}>
              <TextInput
                placeholder="Your email, please 🎟️"
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
                value={email}
                onChangeText={setEmail}
              />
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              <TouchableOpacity
                style={styles.solidButton}
                onPress={handleResetPassword}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.solidButtonText}>Reset My Pass</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
  },
  textContainer: {
    marginTop: 60,
    marginBottom: 40,
    alignItems: "center",
  },
  title: {
    fontSize: isSmallDevice ? 32 : 40,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 24,
    color: "#000",
  },
  subtitle: {
    fontSize: 18,
    textAlign: "center",
    color: "#222",
    marginBottom: 16,
    fontWeight: "500",
  },
  inputContainer: {
    width: "100%",
    marginTop: 16,
    gap: 16,
  },
  input: {
    width: "100%",
    height: isSmallDevice ? 40 : 52,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#000",
    borderRadius: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  errorText: {
    color: "red",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 8,
  },
  solidButton: {
    backgroundColor: "#000",
    borderRadius: 12,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  solidButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
