import { useSignUp, useSSO } from "@clerk/clerk-expo";
import * as AuthSession from "expo-auth-session";
import { Link, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { AuthStrategy, OAuthStrategy } from "../../types/auth";

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

export default function SignUpScreen() {
  useWarmUpBrowser();

  const { isLoaded, signUp, setActive } = useSignUp();
  const { startSSOFlow } = useSSO();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [pendingVerification, setPendingVerification] = React.useState(false);
  const [code, setCode] = React.useState("");

  // OAuth completion state - properly typed
  const [oauthSignUp, setOauthSignUp] = useState<any>(null);
  const [oauthFirstName, setOauthFirstName] = useState("");
  const [oauthLastName, setOauthLastName] = useState("");
  const [oauthUsername, setOauthUsername] = useState("");

  // Handle submission of sign-up form
  const onSignUpPress = async () => {
    if (!isLoaded) return;

    try {
      await signUp.create({
        emailAddress,
        password,
        firstName,
        lastName,
        username,
      });

      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
    } catch (err) {
      console.error(JSON.stringify(err, null, 2));
      Alert.alert("Error", "Failed to create account. Please try again.");
    }
  };

  // Handle submission of verification form
  const onVerifyPress = async () => {
    if (!isLoaded) return;

    try {
      const signUpAttempt = await signUp.attemptEmailAddressVerification({
        code,
      });

      if (signUpAttempt.status === "complete") {
        await setActive({ session: signUpAttempt.createdSessionId });
        router.replace("/");
      } else {
        console.error(JSON.stringify(signUpAttempt, null, 2));
      }
    } catch (err) {
      console.error(JSON.stringify(err, null, 2));
      Alert.alert("Error", "Failed to verify email. Please check your code.");
    }
  };

  const handleOAuthFlow = useCallback(async (strategy: OAuthStrategy) => {
    try {
      const { createdSessionId, setActive, signIn, signUp } =
        await startSSOFlow({
          strategy,
          redirectUrl: AuthSession.makeRedirectUri(),
        });

      if (createdSessionId) {
        // User successfully signed in or completed sign-up
        setActive!({ session: createdSessionId });
        router.replace("/");
      } else if (signUp) {
        // New user needs to complete additional fields
        console.log("SignUp object:", signUp);

        // Check if we have missing fields
        if (signUp.status === "missing_requirements") {
          // Pre-populate fields from OAuth provider if available
          setOauthFirstName(signUp.firstName || "");
          setOauthLastName(signUp.lastName || "");
          setOauthUsername(signUp.username || "");
          setOauthSignUp(signUp);
        }
      } else if (signIn) {
        // Handle sign-in requirements (like MFA)
        console.log("Additional sign-in steps required:", signIn);
      }
    } catch (err) {
      console.error("OAuth error:", JSON.stringify(err, null, 2));
      Alert.alert("Error", "Failed to authenticate. Please try again.");
    }
  }, []);

  const onGoogleSignUp = useCallback(
    () => handleOAuthFlow(AuthStrategy.GOOGLE as OAuthStrategy),
    [handleOAuthFlow]
  );
  const onAppleSignUp = useCallback(
    () => handleOAuthFlow(AuthStrategy.APPLE as OAuthStrategy),
    [handleOAuthFlow]
  );
  const onMicrosoftSignUp = useCallback(
    () => handleOAuthFlow(AuthStrategy.MICROSOFT as OAuthStrategy),
    [handleOAuthFlow]
  );

  // Complete OAuth sign-up with additional fields
  const completeOAuthSignUp = async () => {
    if (!oauthSignUp) return;

    // Validate required fields
    if (
      !oauthFirstName.trim() ||
      !oauthLastName.trim() ||
      !oauthUsername.trim()
    ) {
      Alert.alert(
        "Error",
        "Please fill in all required fields (First Name, Last Name, and Username)."
      );
      return;
    }

    try {
      // Update the sign-up with missing fields
      const updatedSignUp = await oauthSignUp.update({
        firstName: oauthFirstName.trim(),
        lastName: oauthLastName.trim(),
        username: oauthUsername.trim(),
      });

      if (updatedSignUp.status === "complete") {
        if (setActive && updatedSignUp.createdSessionId) {
          await setActive({ session: updatedSignUp.createdSessionId });
          router.replace("/");
        } else {
          console.error("setActive or createdSessionId is not available");
          Alert.alert("Error", "Failed to complete sign-up. Please try again.");
        }
      } else {
        console.error("Sign-up still incomplete:", updatedSignUp);
        Alert.alert("Error", "Failed to complete sign-up. Please try again.");
      }
    } catch (err) {
      console.error(
        "Error completing OAuth sign-up:",
        JSON.stringify(err, null, 2)
      );
      Alert.alert("Error", "Failed to complete sign-up. Please try again.");
    }
  };

  // If we're in OAuth completion mode, show the completion form
  if (oauthSignUp) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.content}>
              <View style={styles.header}>
                <Text style={styles.title}>Complete Your Profile</Text>
                <Text style={styles.subtitle}>
                  Just a few more details to get started
                </Text>
              </View>

              <View style={styles.form}>
                <View style={styles.nameRow}>
                  <View style={[styles.inputContainer, styles.nameInput]}>
                    <Text style={styles.label}>First Name *</Text>
                    <TextInput
                      style={styles.input}
                      value={oauthFirstName}
                      placeholder="Enter first name"
                      placeholderTextColor="#9CA3AF"
                      onChangeText={setOauthFirstName}
                    />
                  </View>

                  <View style={[styles.inputContainer, styles.nameInput]}>
                    <Text style={styles.label}>Last Name *</Text>
                    <TextInput
                      style={styles.input}
                      value={oauthLastName}
                      placeholder="Enter last name"
                      placeholderTextColor="#9CA3AF"
                      onChangeText={setOauthLastName}
                    />
                  </View>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Username *</Text>
                  <TextInput
                    style={styles.input}
                    autoCapitalize="none"
                    value={oauthUsername}
                    placeholder="Enter username"
                    placeholderTextColor="#9CA3AF"
                    onChangeText={setOauthUsername}
                  />
                </View>

                <TouchableOpacity
                  style={styles.button}
                  onPress={completeOAuthSignUp}
                >
                  <Text style={styles.buttonText}>Complete Sign Up</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setOauthSignUp(null)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  if (pendingVerification) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={styles.title}>Check Your Email</Text>
              <Text style={styles.subtitle}>
                We've sent a verification code to {emailAddress}
              </Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Verification Code</Text>
                <TextInput
                  style={styles.input}
                  value={code}
                  placeholder="Enter verification code"
                  placeholderTextColor="#9CA3AF"
                  onChangeText={(code) => setCode(code)}
                />
              </View>

              <TouchableOpacity style={styles.button} onPress={onVerifyPress}>
                <Text style={styles.buttonText}>Verify Email</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>Sign up to get started</Text>
            </View>

            <View style={styles.form}>
              <View style={styles.nameRow}>
                <View style={[styles.inputContainer, styles.nameInput]}>
                  <Text style={styles.label}>First Name</Text>
                  <TextInput
                    style={styles.input}
                    value={firstName}
                    placeholder="Enter first name"
                    placeholderTextColor="#9CA3AF"
                    onChangeText={(firstName) => setFirstName(firstName)}
                  />
                </View>

                <View style={[styles.inputContainer, styles.nameInput]}>
                  <Text style={styles.label}>Last Name</Text>
                  <TextInput
                    style={styles.input}
                    value={lastName}
                    placeholder="Enter last name"
                    placeholderTextColor="#9CA3AF"
                    onChangeText={(lastName) => setLastName(lastName)}
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Username</Text>
                <TextInput
                  style={styles.input}
                  autoCapitalize="none"
                  value={username}
                  placeholder="Enter username"
                  placeholderTextColor="#9CA3AF"
                  onChangeText={(username) => setUsername(username)}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  autoCapitalize="none"
                  value={emailAddress}
                  placeholder="Enter your email"
                  placeholderTextColor="#9CA3AF"
                  onChangeText={(email) => setEmailAddress(email)}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={styles.input}
                  value={password}
                  placeholder="Enter your password"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={true}
                  onChangeText={(password) => setPassword(password)}
                />
              </View>

              <TouchableOpacity style={styles.button} onPress={onSignUpPress}>
                <Text style={styles.buttonText}>Create Account</Text>
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or continue with</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.ssoButtons}>
                <TouchableOpacity
                  style={styles.ssoButton}
                  onPress={onGoogleSignUp}
                >
                  <Text style={styles.ssoButtonText}>Google</Text>
                </TouchableOpacity>

                {Platform.OS === "ios" && (
                  <TouchableOpacity
                    style={styles.ssoButton}
                    onPress={onAppleSignUp}
                  >
                    <Text style={styles.ssoButtonText}>Apple</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.ssoButton}
                  onPress={onMicrosoftSignUp}
                >
                  <Text style={styles.ssoButtonText}>Microsoft</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account?</Text>
              <Link href="/sign-in" style={styles.link}>
                <Text style={styles.linkText}>Sign in</Text>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
  },
  form: {
    marginBottom: 32,
  },
  nameRow: {
    flexDirection: "row",
    gap: 12,
  },
  nameInput: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "#F9FAFB",
  },
  button: {
    backgroundColor: "#3B82F6",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  cancelButton: {
    backgroundColor: "transparent",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  cancelButtonText: {
    color: "#6B7280",
    fontSize: 16,
    fontWeight: "600",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E7EB",
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: "#6B7280",
  },
  ssoButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  ssoButton: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  ssoButtonText: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  footerText: {
    fontSize: 16,
    color: "#6B7280",
  },
  link: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  linkText: {
    fontSize: 16,
    color: "#3B82F6",
    fontWeight: "600",
  },
});
