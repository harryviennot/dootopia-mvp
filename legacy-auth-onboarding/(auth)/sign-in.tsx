import { useState, useEffect, useCallback } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Dimensions,
  Keyboard,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useSession } from "@/contexts/authContext";
import PasswordInput from "@/components/PasswordInput";

const { height } = Dimensions.get("window");
const isSmallDevice = height < 812;

export default function SignIn() {
  const { signIn } = useSession();
  const { t } = useTranslation();
  const { email } = useLocalSearchParams() as {
    email: string;
  };
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [identifier, setIdentifier] = useState(email || "");
  const [password, setPassword] = useState("");

  const handleLogIn = async () => {
    setErrorMessage("");
    if (!identifier || !password) {
      setErrorMessage(t("auth.validation.enter_fields"));
      return;
    }

    setIsLoading(true);
    try {
      await signIn(identifier, password);
    } catch (error: any) {
      setErrorMessage(
        t(`auth.error.${error?.type}`) || t("auth.error.error_occured")
      );
    } finally {
      setIsLoading(false);
    }
  };

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
                {t("auth.signin.title")}
              </ThemedText>
              <ThemedText style={styles.text} weight="bold">
                {t("auth.signin.subtitle")}
              </ThemedText>
            </ThemedView>
            <View style={styles.buttonContainer}>
              <View
                style={
                  !isKeyboardVisible
                    ? { marginBottom: 32 }
                    : { marginBottom: 12 }
                }
              >
                <ThemedText
                  style={[
                    styles.helpText,
                    { color: "red", alignSelf: "center" },
                  ]}
                >
                  {errorMessage || " "}
                </ThemedText>

                <TextInput
                  placeholder={t("auth.signin.identifier")}
                  keyboardType="email-address"
                  autoComplete="email"
                  autoCapitalize="none"
                  style={styles.input}
                  value={identifier}
                  onChangeText={setIdentifier}
                />
                <PasswordInput
                  value={password}
                  onChangeText={setPassword}
                  style={styles.input}
                  placeholder={t("auth.signin.password")}
                />
                <TouchableOpacity
                  style={{ alignSelf: "center" }}
                  onPress={() => router.push("/forgot-password")}
                >
                  <ThemedText style={styles.helpText}>
                    <ThemedText
                      style={[
                        styles.helpText,
                        { textDecorationLine: "underline" },
                      ]}
                      weight="bold"
                    >
                      {t("auth.signin.forgot")}
                    </ThemedText>{" "}
                    {t("auth.signin.forgotHelp")}
                  </ThemedText>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={styles.solidButton}
                onPress={handleLogIn}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <ThemedText style={styles.solidButtonText}>
                    {t("auth.signin.enter")}
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
    textAlign: "center",
    marginBottom: 48,
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
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#000",
    borderRadius: 8,
    fontFamily: "SatoshiMedium",
    fontSize: 16,
  },
  buttonContainer: {
    width: "100%",
    justifyContent: "flex-end",
  },
  solidButton: {
    backgroundColor: "#000",
    borderRadius: 8,
    height: 48,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  solidButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
});
