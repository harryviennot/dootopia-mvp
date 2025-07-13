import { useSignUp } from "@clerk/clerk-expo";
import { router } from "expo-router";
import { useEffect, useState } from "react";
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

type SignUpStep = "details" | "credentials" | "verification";

export default function SignUp() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const [currentStep, setCurrentStep] = useState<SignUpStep>("details");
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Form data
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");

  // Validation
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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

  const validateDetailsStep = (): boolean => {
    const errors: Record<string, string> = {};

    if (!firstName.trim()) errors.firstName = "First name is required";
    if (!lastName.trim()) errors.lastName = "Last name is required";
    if (!username.trim()) {
      errors.username = "Username is required";
    } else if (username.length < 3) {
      errors.username = "Username must be at least 3 characters";
    } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      errors.username =
        "Username can only contain letters, numbers, and underscores";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateCredentialsStep = (): boolean => {
    const errors: Record<string, string> = {};

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      errors.email = "Email is required";
    } else if (!emailRegex.test(email)) {
      errors.email = "Please enter a valid email address";
    }

    // Password validation
    if (!password) {
      errors.password = "Password is required";
    } else if (password.length < 8) {
      errors.password = "Password must be at least 8 characters";
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      errors.password =
        "Password must contain uppercase, lowercase, and number";
    }

    if (!confirmPassword) {
      errors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleDetailsSubmit = async () => {
    if (!validateDetailsStep() || !signUp) return;

    try {
      setIsLoading(true);

      // Create signup with basic info
      await signUp.create({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        username: username.trim(),
      });

      // Move to credentials step
      setCurrentStep("credentials");
    } catch (err: any) {
      console.error("Details step error:", JSON.stringify(err, null, 2));

      if (err?.clerkError && err?.errors?.length > 0) {
        const clerkError = err.errors[0];
        if (clerkError.code === "form_identifier_exists") {
          setFieldErrors((prev) => ({
            ...prev,
            username: "This username is already taken. Please try another.",
          }));
        } else {
          setErrorMessage(clerkError.message || "An error occurred");
        }
      } else {
        setErrorMessage("An error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCredentialsSubmit = async () => {
    if (!validateCredentialsStep() || !signUp) return;

    try {
      setIsLoading(true);

      // Update signup with email and password
      await signUp.update({
        emailAddress: email.trim(),
        password: password,
      });

      // Prepare email verification
      await signUp.prepareEmailAddressVerification();

      // Move to verification step
      setCurrentStep("verification");
    } catch (err: any) {
      console.error("Credentials step error:", JSON.stringify(err, null, 2));

      if (err?.clerkError && err?.errors?.length > 0) {
        const clerkError = err.errors[0];
        setErrorMessage(clerkError.message || "An error occurred");
      } else {
        setErrorMessage("An error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerificationSubmit = async () => {
    if (!otpCode.trim() || !signUp) {
      setErrorMessage("Please enter the verification code");
      return;
    }

    try {
      setIsLoading(true);

      // Attempt email verification
      const attemptVerification = await signUp.attemptEmailAddressVerification({
        code: otpCode.trim(),
      });

      if (attemptVerification.status === "complete") {
        if (setActive && attemptVerification.createdSessionId) {
          await setActive({ session: attemptVerification.createdSessionId });
          router.replace("/");
        }
      } else {
        setErrorMessage("Verification failed. Please try again.");
      }
    } catch (err: any) {
      console.error("Verification error:", JSON.stringify(err, null, 2));

      if (err?.clerkError && err?.errors?.length > 0) {
        const clerkError = err.errors[0];
        setErrorMessage(clerkError.message || "Verification failed");
      } else {
        setErrorMessage("Verification failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const renderDetailsStep = () => (
    <View style={styles.inputContainer}>
      <Text style={styles.stepTitle}>Tell us about yourself</Text>
      <Text style={styles.stepSubtitle}>
        Let's start with your basic information
      </Text>

      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>First Name *</Text>
        <TextInput
          placeholder="Your first name"
          style={[styles.input, fieldErrors.firstName && styles.inputError]}
          value={firstName}
          onChangeText={setFirstName}
          autoCapitalize="words"
        />
        {fieldErrors.firstName && (
          <Text style={styles.errorText}>{fieldErrors.firstName}</Text>
        )}
      </View>

      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>Last Name *</Text>
        <TextInput
          placeholder="Your last name"
          style={[styles.input, fieldErrors.lastName && styles.inputError]}
          value={lastName}
          onChangeText={setLastName}
          autoCapitalize="words"
        />
        {fieldErrors.lastName && (
          <Text style={styles.errorText}>{fieldErrors.lastName}</Text>
        )}
      </View>

      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>Username *</Text>
        <TextInput
          placeholder="Choose a username"
          style={[styles.input, fieldErrors.username && styles.inputError]}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {fieldErrors.username && (
          <Text style={styles.errorText}>{fieldErrors.username}</Text>
        )}
      </View>

      <TouchableOpacity
        style={[styles.solidButton, isLoading && styles.disabledButton]}
        onPress={handleDetailsSubmit}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.solidButtonText}>Continue</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderCredentialsStep = () => (
    <View style={styles.inputContainer}>
      <Text style={styles.stepTitle}>Create your account</Text>
      <Text style={styles.stepSubtitle}>Set up your email and password</Text>

      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>Email Address *</Text>
        <TextInput
          placeholder="your.email@example.com"
          style={[styles.input, fieldErrors.email && styles.inputError]}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />
        {fieldErrors.email && (
          <Text style={styles.errorText}>{fieldErrors.email}</Text>
        )}
      </View>

      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>Password *</Text>
        <TextInput
          placeholder="Create a secure password"
          style={[styles.input, fieldErrors.password && styles.inputError]}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
        />
        {fieldErrors.password && (
          <Text style={styles.errorText}>{fieldErrors.password}</Text>
        )}
      </View>

      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>Confirm Password *</Text>
        <TextInput
          placeholder="Confirm your password"
          style={[
            styles.input,
            fieldErrors.confirmPassword && styles.inputError,
          ]}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          autoComplete="new-password"
        />
        {fieldErrors.confirmPassword && (
          <Text style={styles.errorText}>{fieldErrors.confirmPassword}</Text>
        )}
      </View>

      <TouchableOpacity
        style={[styles.solidButton, isLoading && styles.disabledButton]}
        onPress={handleCredentialsSubmit}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.solidButtonText}>Send Verification Code</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderVerificationStep = () => (
    <View style={styles.inputContainer}>
      <Text style={styles.stepTitle}>Verify your email</Text>
      <Text style={styles.stepSubtitle}>
        We've sent a verification code to {email}
      </Text>

      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>Verification Code *</Text>
        <TextInput
          placeholder="Enter the 6-digit code"
          style={[styles.input, fieldErrors.otp && styles.inputError]}
          value={otpCode}
          onChangeText={setOtpCode}
          keyboardType="number-pad"
          maxLength={6}
        />
        {fieldErrors.otp && (
          <Text style={styles.errorText}>{fieldErrors.otp}</Text>
        )}
      </View>

      <TouchableOpacity
        style={[styles.solidButton, isLoading && styles.disabledButton]}
        onPress={handleVerificationSubmit}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.solidButtonText}>Verify & Complete</Text>
        )}
      </TouchableOpacity>
    </View>
  );

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
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => {
                  if (currentStep === "credentials") {
                    setCurrentStep("details");
                  } else if (currentStep === "verification") {
                    setCurrentStep("credentials");
                  } else {
                    router.back();
                  }
                }}
              >
                <Text style={styles.backButtonText}>← Back</Text>
              </TouchableOpacity>

              <View style={styles.progressContainer}>
                <View
                  style={[
                    styles.progressDot,
                    currentStep === "details" && styles.progressDotActive,
                  ]}
                />
                <View
                  style={[
                    styles.progressDot,
                    currentStep === "credentials" && styles.progressDotActive,
                  ]}
                />
                <View
                  style={[
                    styles.progressDot,
                    currentStep === "verification" && styles.progressDotActive,
                  ]}
                />
              </View>
            </View>

            {errorMessage && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            {currentStep === "details" && renderDetailsStep()}
            {currentStep === "credentials" && renderCredentialsStep()}
            {currentStep === "verification" && renderVerificationStep()}
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
  header: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: "#000",
  },
  progressContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 10,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ccc",
  },
  progressDotActive: {
    backgroundColor: "#000",
  },
  errorContainer: {
    backgroundColor: "#ffebee",
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    alignItems: "center",
  },
  errorText: {
    color: "#d32f2f",
    fontSize: 14,
    textAlign: "center",
  },
  inputContainer: {
    width: "100%",
    paddingHorizontal: 16,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  stepSubtitle: {
    fontSize: 16,
    color: "#838383",
    marginBottom: 32,
    textAlign: "center",
  },
  fieldContainer: {
    width: "100%",
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "medium",
    marginBottom: 8,
    color: "#333",
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
  inputError: {
    borderColor: "red",
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
