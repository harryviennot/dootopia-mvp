import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";

export default function WelcomeScreen() {
  const { t } = useTranslation();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={styles.container}>
        <ThemedView style={styles.textContainer}>
          <ThemedText style={styles.title} weight="black">
            {t("welcome.title")}
          </ThemedText>
          <ThemedText style={styles.text} weight="bold">
            {t("welcome.subtitle")}
          </ThemedText>
        </ThemedView>
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.outlinedButton}
            onPress={() => router.push("/sign-up")}
          >
            <ThemedText style={styles.outlinedButtonText} weight="bold">
              {t("welcome.signup")}
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.solidButton}
            onPress={() => router.push("/sign-in")}
          >
            <ThemedText style={styles.solidButtonText} weight="bold">
              {t("welcome.signin")}
            </ThemedText>
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
    flex: 1,
    justifyContent: "center",
  },
  title: {
    fontSize: 34,
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
  buttonContainer: {
    width: "100%",

    justifyContent: "flex-end",
  },
  outlinedButton: {
    borderWidth: 1,
    borderColor: "#000",
    borderRadius: 8,
    height: 48,
    paddingHorizontal: 16,
    marginBottom: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  outlinedButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000",
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
