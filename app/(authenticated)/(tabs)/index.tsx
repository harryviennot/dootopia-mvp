import { SignOutButton } from "@/components/SignoutButton";
import { SignedIn, SignedOut, useUser } from "@clerk/clerk-expo";
import { Link } from "expo-router";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";

export default function Page() {
  const { user } = useUser();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
          <View style={styles.welcomeContainer}>
            <View style={styles.header}>
              <Text style={styles.welcomeTitle}>Welcome to Dootopia!</Text>
              <Text style={styles.welcomeSubtitle}>
                Hello, {user?.emailAddresses[0].emailAddress}
              </Text>
            </View>

            <View style={styles.content}>
              <Text style={styles.contentText}>
                You're successfully signed in and ready to explore Dootopia.
              </Text>
            </View>

            <View style={styles.signOutContainer}>
              <SignOutButton />
            </View>
          </View>
      </View>
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
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  welcomeContainer: {
    alignItems: "center",
  },
  authContainer: {
    alignItems: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 16,
    textAlign: "center",
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
  },
  welcomeSubtitle: {
    fontSize: 18,
    color: "#3B82F6",
    textAlign: "center",
    fontWeight: "500",
  },
  content: {
    marginBottom: 48,
    paddingHorizontal: 20,
  },
  contentText: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
  },
  authButtons: {
    width: "100%",
    gap: 16,
  },
  primaryButton: {
    backgroundColor: "#3B82F6",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  secondaryButtonText: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "600",
  },
  signOutContainer: {
    marginTop: 32,
  },
});
