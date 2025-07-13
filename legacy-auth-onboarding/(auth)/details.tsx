import { useState, useCallback, useEffect } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  KeyboardAvoidingView,
  Dimensions,
  Keyboard,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useSession } from "@/contexts/authContext";
import PasswordInput from "@/components/PasswordInput";

const { height } = Dimensions.get("window");
const isSmallDevice = height < 812;

export default function Details() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { signUp } = useSession();
  const { name, username } = useLocalSearchParams() as {
    name: string;
    username: string;
  };

  const validatePassword = useCallback(() => {
    if (password.length < 8) {
      return t("auth.validation.password.length");
    }
    if (!/[a-z]/.test(password)) {
      return t("auth.validation.password.lowercase");
    }
    if (!/[A-Z]/.test(password)) {
      return t("auth.validation.password.uppercase");
    }
    if (!/[0-9]/.test(password)) {
      return t("auth.validation.password.number");
    }
    if (!/[\W]/.test(password)) {
      return t("auth.validation.password.special");
    }
    if (/\s/.test(password)) {
      return t("auth.validation.password.whitespace");
    }
    if (password !== confirmPassword) {
      return t("auth.validation.password.match");
    }
    return "";
  }, [password, confirmPassword]);

  const handleSignUp = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    try {
      if (!emailRegex.test(email)) {
        console.error("Invalid email");
        return;
      }
      setIsLoading(true);
      const response = await signUp(name, username, email, password);
    } catch (error: any) {
      if (error?.type?.includes("VALIDATION_ERROR")) {
        setErrorMessage(error?.message);
      } else if (error?.type === "USER_EXISTS") {
        Alert.alert(
          t("auth.error.user_exists"),
          t("auth.error.user_exists_message"),
          [
            {
              text: t("auth.welcome.signin"),
              style: "cancel",
              onPress: () => {
                router.replace(`/sign-in?email=${email}`);
              },
            },
            { text: t("welcome.cancel"), style: "destructive" },
          ]
        );
      } else {
        setErrorMessage(t("auth.error.error_occured"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!name || !username) {
    return <Redirect href="/welcome" />;
  }

  useEffect(() => {
    // Validate password when password or confirmPassword changes
    setErrorMessage(validatePassword());
  }, [password, confirmPassword, validatePassword]);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardWillShow",
      () => {
        setKeyboardVisible(true); // Keyboard is open
      }
    );

    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardWillHide",
      () => {
        setKeyboardVisible(false); // Keyboard is closed
      }
    );

    // Cleanup listeners on component unmount
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
            <ThemedView style={styles.textContainer}>
              <ThemedText
                style={[
                  styles.title,
                  (isKeyboardVisible || isSmallDevice) && { marginBottom: 12 },
                ]}
                weight="black"
              >
                {t("auth.details.title")}
              </ThemedText>
              <ThemedText style={styles.text} weight="bold">
                {t("auth.details.subtitle")}
              </ThemedText>
            </ThemedView>
            <View style={styles.inputContainer}>
              <View style={{ marginBottom: 16 }}>
                <TextInput
                  placeholder={t("auth.details.email")}
                  keyboardType="email-address"
                  autoComplete="email"
                  autoCapitalize="none"
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                />
                <ThemedText style={styles.helpText}>
                  {t("auth.details.help_email")}
                </ThemedText>
              </View>
              <View style={{ marginBottom: isKeyboardVisible ? 0 : 16 }}>
                <PasswordInput
                  placeholder={t("auth.details.password")}
                  style={[styles.input, { marginBottom: 8 }]}
                  value={password}
                  onChangeText={setPassword}
                />
                <PasswordInput
                  placeholder={t("auth.details.confirm_password")}
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
                <ThemedText
                  style={[
                    styles.helpText,
                    errorMessage ? { color: "red" } : { color: "green" },
                  ]}
                >
                  {errorMessage || t("auth.details.password_match")}
                </ThemedText>
              </View>
              <TouchableOpacity
                style={styles.solidButton}
                onPress={handleSignUp}
                disabled={!!errorMessage}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <ThemedText
                    style={[
                      styles.solidButtonText,
                      errorMessage && { opacity: 0.5 },
                    ]}
                  >
                    {t("auth.details.next")}
                  </ThemedText>
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
    flex: 1,
    justifyContent: "center",
  },
  title: {
    fontSize: isSmallDevice ? 24 : 34,
    lineHeight: 40,
    marginBottom: 48,
    textAlign: "center",
  },
  text: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 32,
    paddingHorizontal: 16,
    fontWeight: "regular",
  },
  helpText: {
    fontSize: 12,
    color: "#838383",
  },
  input: {
    width: "100%",
    height: isSmallDevice ? 40 : 48,
    paddingHorizontal: 16,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "#000",
    borderRadius: 8,
    fontFamily: "SatoshiMedium",
    fontSize: 16,
  },
  inputContainer: {
    width: "100%",
    justifyContent: "flex-end",
  },
  solidButton: {
    backgroundColor: "#000",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  solidButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
});
