import { useEffect, useState } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Check, X } from "lucide-react-native";
import { useTranslation } from "react-i18next";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useSession } from "@/contexts/authContext";
import { useDebouncedCallback } from "@/hooks/useDebounce";

interface UsernameAvailabilityResponse {
  available: boolean;
}

const { height } = Dimensions.get("window");
const isSmallDevice = height < 812;

export default function SignUp() {
  const { apiRequest } = useSession();
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [isUsernameAvailable, setUsernameAvailable] = useState(false);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const usernameRegEx = "^[A-Za-z][A-Za-z0-9_]{3,19}$";

  const checkUsernameAvailability = async (username: string) => {
    try {
      const response = await apiRequest<UsernameAvailabilityResponse>(
        "GET",
        `/auth/username-available?username=${encodeURIComponent(username)}`,
        null,
        false
      );
      setUsernameAvailable(response.data?.available || false);
    } catch (error) {
      console.error("Error checking username:", error);
      setUsernameAvailable(false);
    } finally {
      setIsChecking(false);
    }
  };

  // check username availability with once user has finished typing
  const debouncedCheckUsername = useDebouncedCallback(
    (value: string) => checkUsernameAvailability(value),
    500
  );

  const handleUsernameChange = (value: string) => {
    setUsername(value);
    if (value.length < 4 || !value.match(usernameRegEx)) {
      setUsernameAvailable(false);
      setIsChecking(false);
      return;
    }
    setIsChecking(true);
    debouncedCheckUsername(value);
  };

  const handleNextStep = () => {
    router.push(`/details?name=${name}&username=${username}`);
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
                {t("auth.signup.title")}
              </ThemedText>
              <ThemedText style={styles.text} weight="bold">
                {t("auth.signup.subtitle")}
              </ThemedText>
            </ThemedView>
            <View style={styles.inputContainer}>
              <View style={{ marginBottom: 16 }}>
                <TextInput
                  placeholder={t("auth.signup.name")}
                  autoComplete="name"
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                />
                <ThemedText style={styles.helpText}>
                  {t("auth.signup.help_name")}
                </ThemedText>
              </View>
              <View style={{ marginBottom: 16 }}>
                <TextInput
                  placeholder={t("auth.signup.username")}
                  style={styles.input}
                  value={username}
                  autoCapitalize="none"
                  autoCorrect={false}
                  onChangeText={handleUsernameChange}
                />
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "flex-start",
                    alignItems: "center",
                  }}
                >
                  {isChecking ? (
                    <ActivityIndicator
                      size="small"
                      color="#000"
                      style={{
                        marginRight: 8,
                      }}
                    />
                  ) : isUsernameAvailable ? (
                    <View
                      style={[
                        styles.statusIndicator,
                        { backgroundColor: "green" },
                      ]}
                    >
                      <Check size={12} color="#fff" />
                    </View>
                  ) : (
                    <View
                      style={[
                        styles.statusIndicator,
                        { backgroundColor: "red" },
                      ]}
                    >
                      <X size={12} color="#fff" />
                    </View>
                  )}
                  <ThemedText style={styles.helpText}>
                    {isChecking
                      ? t("auth.signup.checking")
                      : isUsernameAvailable
                      ? t("auth.signup.available")
                      : username.length >= 4
                      ? t("auth.signup.unavailable")
                      : t("auth.validation.username_length")}
                  </ThemedText>
                </View>
              </View>
              <TouchableOpacity
                style={styles.solidButton}
                onPress={handleNextStep}
                disabled={
                  !name || !username || !isUsernameAvailable || isChecking
                }
              >
                <ThemedText
                  style={[
                    styles.solidButtonText,
                    (!name ||
                      !username ||
                      !isUsernameAvailable ||
                      isChecking) && {
                      opacity: 0.5,
                    },
                  ]}
                >
                  {t("auth.signup.next")}
                </ThemedText>
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
  statusIndicator: {
    width: 16,
    height: 16,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
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
