import { useSignUp } from "@clerk/clerk-expo";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
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

interface FieldConfig {
  key: string;
  label: string;
  placeholder: string;
  required: boolean;
  validation?: (value: string) => string | null;
}

export default function CompleteProfile() {
  const router = useRouter();
  const { signUpId } = useLocalSearchParams() as { signUpId: string };
  const { isLoaded, setActive, signUp } = useSignUp();

  console.log("signUp", signUp);

  const [formData, setFormData] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Get missing fields from Clerk signup
  const missingFields = signUp?.missingFields || [];
  const requiredFields = signUp?.requiredFields || [];

  // Define field configurations
  const fieldConfigs: Record<string, FieldConfig> = {
    username: {
      key: "username",
      label: "Username",
      placeholder: "Choose a cool handle 😎",
      required: true,
      validation: (value) => {
        if (value.length < 3) return "Username must be at least 3 characters";
        if (!/^[a-zA-Z0-9_]+$/.test(value))
          return "Username can only contain letters, numbers, and underscores";
        return null;
      },
    },
    first_name: {
      key: "first_name",
      label: "First Name",
      placeholder: "Your first name 🎤",
      required: true,
      validation: (value) => {
        if (value.length < 2) return "First name must be at least 2 characters";
        return null;
      },
    },
    last_name: {
      key: "last_name",
      label: "Last Name",
      placeholder: "Your last name 🎤",
      required: true,
      validation: (value) => {
        if (value.length < 2) return "Last name must be at least 2 characters";
        return null;
      },
    },
    password: {
      key: "password",
      label: "Password",
      placeholder: "Create a secure password 🔒",
      required: true,
      validation: (value) => {
        if (value.length < 8) return "Password must be at least 8 characters";
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
          return "Password must contain uppercase, lowercase, and number";
        }
        return null;
      },
    },
  };

  // Get fields that need to be shown based on missing fields only
  const fieldsToShow = missingFields
    .filter((field) => fieldConfigs[field])
    .map((field) => fieldConfigs[field]);

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

  const validateField = (fieldKey: string, value: string): string | null => {
    const config = fieldConfigs[fieldKey];
    if (!config) return null;

    if (config.required && !value.trim()) {
      return `${config.label} is required`;
    }

    return config.validation ? config.validation(value) : null;
  };

  const updateField = (fieldKey: string, value: string) => {
    setFormData((prev) => ({ ...prev, [fieldKey]: value }));

    // Clear error when user starts typing
    const error = validateField(fieldKey, value);
    setFieldErrors((prev) => ({
      ...prev,
      [fieldKey]: error || "",
    }));
  };

  const validateAllFields = (): boolean => {
    const errors: Record<string, string> = {};
    let hasErrors = false;

    fieldsToShow.forEach((field) => {
      const value = formData[field.key] || "";
      const error = validateField(field.key, value);

      if (error) {
        errors[field.key] = error;
        hasErrors = true;
      }
    });

    setFieldErrors(errors);
    return !hasErrors;
  };

  const handleCompleteProfile = async () => {
    if (!isLoaded || !validateAllFields()) {
      Alert.alert("Error", "Please fill in all required fields correctly.");
      return;
    }

    try {
      setIsLoading(true);

      // Prepare update data based on what fields are present
      const updateData: Record<string, string> = {};

      fieldsToShow.forEach((field) => {
        const value = formData[field.key]?.trim();
        if (value) {
          updateData[field.key] = value;
        }
      });

      console.log("Updating signup with:", updateData);

      const updatedSignUp = await signUp.update(updateData);

      console.log("Updated signup status:", updatedSignUp.status);

      if (updatedSignUp.status === "complete") {
        if (setActive && updatedSignUp.createdSessionId) {
          await setActive({ session: updatedSignUp.createdSessionId });
          router.replace("/");
        }
      } else if (updatedSignUp.status === "missing_requirements") {
        console.log("Still missing requirements:", updatedSignUp.missingFields);
        Alert.alert(
          "Additional Information Needed",
          "Please provide all required information."
        );
      }
    } catch (err: any) {
      console.error("Profile completion error:", JSON.stringify(err, null, 2));

      // Handle specific Clerk errors
      if (err?.clerkError && err?.errors?.length > 0) {
        const clerkError = err.errors[0];

        switch (clerkError.code) {
          case "form_identifier_exists":
            // Username is taken
            setFieldErrors((prev) => ({
              ...prev,
              username: "This username is already taken. Please try another.",
            }));
            break;
          case "form_identifier_invalid":
            setFieldErrors((prev) => ({
              ...prev,
              username: "Username contains invalid characters.",
            }));
            break;
          case "form_password_pwned":
            setFieldErrors((prev) => ({
              ...prev,
              password:
                "This password is too common. Please choose a stronger password.",
            }));
            break;
          case "form_password_incorrect":
            setFieldErrors((prev) => ({
              ...prev,
              password: "Password doesn't meet requirements.",
            }));
            break;
          default:
            // Show generic error for unknown Clerk errors
            Alert.alert(
              "Error",
              clerkError.message ||
                "Failed to complete profile. Please try again."
            );
        }
      } else {
        // Handle other types of errors
        Alert.alert("Error", "Failed to complete profile. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isLoaded) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <View style={styles.container}>
            <View style={styles.textContainer}>
              <Text style={styles.title}>Complete Your Profile</Text>
              <Text style={styles.subtitle}>
                {fieldsToShow.length === 1
                  ? "Just one more thing to get you started!"
                  : `Almost there! Just ${fieldsToShow.length} more things to get you started!`}
              </Text>
            </View>

            <View style={styles.inputContainer}>
              {fieldsToShow.map((field) => (
                <View key={field.key} style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>
                    {field.label}{" "}
                    {field.required && <Text style={styles.required}>*</Text>}
                  </Text>
                  <TextInput
                    placeholder={field.placeholder}
                    style={[
                      styles.input,
                      fieldErrors[field.key] && styles.inputError,
                    ]}
                    value={formData[field.key] || ""}
                    onChangeText={(value) => updateField(field.key, value)}
                    secureTextEntry={field.key === "password"}
                    autoCapitalize={field.key === "username" ? "none" : "words"}
                    autoCorrect={false}
                  />

                  {fieldErrors[field.key] && (
                    <Text style={styles.errorText}>
                      {fieldErrors[field.key]}
                    </Text>
                  )}
                </View>
              ))}

              <TouchableOpacity
                style={[styles.solidButton, isLoading && styles.disabledButton]}
                onPress={handleCompleteProfile}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.solidButtonText}>Complete Profile</Text>
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
  fieldContainer: {
    width: "100%",
    gap: 8,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#000",
  },
  required: {
    color: "red",
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
  inputError: {
    borderColor: "red",
    borderWidth: 1,
  },

  errorText: {
    color: "red",
    fontSize: 13,
  },
  helpText: {
    fontSize: 13,
    color: "#838383",
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
  disabledButton: {
    opacity: 0.7,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#000",
  },
});
