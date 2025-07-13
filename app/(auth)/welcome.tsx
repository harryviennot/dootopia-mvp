import { useSSO } from "@clerk/clerk-expo";
import * as AuthSession from "expo-auth-session";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthStrategy, OAuthStrategy } from "../../types/auth";
const { height } = Dimensions.get("window");
const isSmallDevice = height < 812;

export const useWarmUpBrowser = () => {
  useEffect(() => {
    // Preloads the browser for Android devices to reduce authentication load time
    // See: https://docs.expo.dev/guides/authentication/#improving-user-experience
    void WebBrowser.warmUpAsync();
    return () => {
      // Cleanup: closes browser when component unmounts
      void WebBrowser.coolDownAsync();
    };
  }, []);
};

// Handle any pending authentication sessions
WebBrowser.maybeCompleteAuthSession();

export default function WelcomeScreen() {
  useWarmUpBrowser();
  const { startSSOFlow } = useSSO();
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleOAuthFlow = useCallback(
    async (strategy: OAuthStrategy) => {
      if (isLoading) return; // Prevent multiple simultaneous requests

      setIsLoading(strategy);

      try {
        console.log(`Starting OAuth flow for ${strategy}...`);

        const { createdSessionId, setActive, signIn, signUp } =
          await startSSOFlow({
            strategy,
            redirectUrl: AuthSession.makeRedirectUri(),
          });

        console.log(`OAuth flow completed for ${strategy}:`, {
          createdSessionId: !!createdSessionId,
          signIn: !!signIn,
          signUp: !!signUp,
        });

        if (createdSessionId) {
          console.log("Setting active session...");
          await setActive!({ session: createdSessionId });
          console.log("Redirecting to home...");
          router.replace("/");
        } else if (signUp) {
          console.log("Sign up flow:", signUp.status);
          if (signUp.status === "missing_requirements") {
            router.push({
              pathname: "/(auth)/complete-profile",
              params: { signUpId: signUp.id },
            });
          } else {
            console.log("Unexpected sign up status:", signUp.status);
          }
        } else if (signIn) {
          console.log("Sign in flow:", signIn.status);
          // Handle sign-in requirements (like MFA)
          if (signIn.status === "needs_first_factor") {
            Alert.alert(
              "Additional Steps Required",
              "Please complete the additional authentication steps in the browser."
            );
          } else {
            console.log("Unexpected sign in status:", signIn.status);
          }
        } else {
          console.log("No session created, sign in, or sign up returned");
          Alert.alert(
            "Authentication Failed",
            "The authentication process didn't complete. Please try again."
          );
        }
      } catch (err) {
        console.error(
          `OAuth error for ${strategy}:`,
          JSON.stringify(err, null, 2)
        );

        let errorMessage = "Authentication failed. Please try again.";

        if (err instanceof Error) {
          if (err.message.includes("network")) {
            errorMessage =
              "Network error. Please check your connection and try again.";
          } else if (err.message.includes("cancelled")) {
            errorMessage = "Authentication was cancelled.";
          } else if (err.message.includes("timeout")) {
            errorMessage = "Authentication timed out. Please try again.";
          }
        }

        Alert.alert("Authentication Error", errorMessage);
      } finally {
        setIsLoading(null);
      }
    },
    [isLoading]
  );

  const onGoogleAuth = useCallback(
    () => handleOAuthFlow(AuthStrategy.GOOGLE as OAuthStrategy),
    [handleOAuthFlow]
  );
  const onAppleAuth = useCallback(
    () => handleOAuthFlow(AuthStrategy.APPLE as OAuthStrategy),
    [handleOAuthFlow]
  );
  const onMicrosoftAuth = useCallback(
    () => handleOAuthFlow(AuthStrategy.MICROSOFT as OAuthStrategy),
    [handleOAuthFlow]
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={styles.container}>
        <View style={styles.textContainer}>
          <Text style={styles.title}>Welcome to Dootopia!</Text>
          <Text style={styles.subtitle}>
            Ready to get in? Log in if you're a regular, or sign up to join the
            VIP list.
          </Text>
        </View>
        <View style={styles.buttonStack}>
          <TouchableOpacity
            style={[
              styles.oauthButton,
              isLoading === AuthStrategy.GOOGLE && styles.disabledButton,
            ]}
            onPress={onGoogleAuth}
            disabled={isLoading !== null}
          >
            <Text style={styles.oauthButtonText}>
              {isLoading === AuthStrategy.GOOGLE
                ? "Connecting..."
                : "Continue with Google"}
            </Text>
          </TouchableOpacity>
          {Platform.OS === "ios" && (
            <TouchableOpacity
              style={[
                styles.oauthButton,
                isLoading === AuthStrategy.APPLE && styles.disabledButton,
              ]}
              onPress={onAppleAuth}
              disabled={isLoading !== null}
            >
              <Text style={styles.oauthButtonText}>
                {isLoading === AuthStrategy.APPLE
                  ? "Connecting..."
                  : "Continue with Apple"}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[
              styles.oauthButton,
              isLoading === AuthStrategy.MICROSOFT && styles.disabledButton,
            ]}
            onPress={onMicrosoftAuth}
            disabled={isLoading !== null}
          >
            <Text style={styles.oauthButtonText}>
              {isLoading === AuthStrategy.MICROSOFT
                ? "Connecting..."
                : "Continue with Microsoft"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.outlinedButton, isLoading && styles.disabledButton]}
            onPress={() => router.push("/(auth)/sign-up")}
            disabled={isLoading !== null}
          >
            <Text style={styles.outlinedButtonText}>Sign up</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.solidButton, isLoading && styles.disabledButton]}
            onPress={() => router.push("/(auth)/sign-in")}
            disabled={isLoading !== null}
          >
            <Text style={styles.solidButtonText}>Log in</Text>
          </TouchableOpacity>
        </View>
      </View>
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
  buttonStack: {
    width: "100%",
    marginTop: 16,
    gap: 16,
  },
  oauthButton: {
    borderWidth: 1,
    borderColor: "#000",
    borderRadius: 12,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    backgroundColor: "#fff",
  },
  oauthButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
  outlinedButton: {
    borderWidth: 1,
    borderColor: "#000",
    borderRadius: 12,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    backgroundColor: "#fff",
  },
  outlinedButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
  solidButton: {
    backgroundColor: "#000",
    borderRadius: 12,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  solidButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  disabledButton: {
    opacity: 0.7,
    backgroundColor: "#eee",
    borderColor: "#ccc",
  },
});
