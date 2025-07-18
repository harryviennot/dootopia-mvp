import { useSignIn } from "@clerk/clerk-expo";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
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

export default function SignIn() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  const handleLogIn = async () => {
    setErrorMessage("");
    if (!identifier || !password) {
      setErrorMessage("Please enter all required fields");
      return;
    }
    if (!isLoaded) return;
    setIsLoading(true);
    try {
      const signInAttempt = await signIn.create({
        identifier,
        password,
      });
      if (signInAttempt.status === "complete") {
        await setActive({ session: signInAttempt.createdSessionId });
        router.replace("/");
      } else {
        setErrorMessage("An error occurred, please try again.");
      }
    } catch (err: any) {
      setErrorMessage("Invalid credentials");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardWillShow",
      () => setKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardWillHide",
      () => setKeyboardVisible(false)
    );
    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <View style={styles.container}>
            <View style={styles.textContainer}>
              <Text style={styles.title}>
                Ah, a Regular!{"\n"}Welcome Back.
              </Text>
              <Text style={styles.subtitle}>
                The bouncer remembers you. Let’s get you straight to the party.
              </Text>
            </View>
            <View style={styles.inputContainer}>
              <TextInput
                placeholder="Your registered email 🎟️"
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
                value={identifier}
                onChangeText={setIdentifier}
              />
              <TextInput
                value={password}
                onChangeText={setPassword}
                style={styles.input}
                placeholder="Your secret handshake 🤫"
                secureTextEntry={true}
              />
              <TouchableOpacity
                style={{ alignSelf: "center", marginBottom: 16 }}
                onPress={() => router.push("/(auth)/forgot-password")}
              >
                <Text style={styles.forgotText}>
                  <Text style={{ textDecorationLine: "underline" }}>
                    Forgot your password?
                  </Text>{" "}
                  We’ll help you find it!
                </Text>
              </TouchableOpacity>
              {errorMessage ? (
                <Text style={styles.errorText}>{errorMessage}</Text>
              ) : null}
              <TouchableOpacity
                style={styles.solidButton}
                onPress={handleLogIn}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.solidButtonText}>Log in</Text>
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
  forgotText: {
    fontSize: 14,
    color: "#838383",
    textAlign: "center",
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
