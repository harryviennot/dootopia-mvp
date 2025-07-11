import { ClerkProvider } from "@clerk/clerk-expo";
import * as SecureStore from "expo-secure-store";

import { Slot } from "expo-router";

const CLERK_PUBLISHABLE_KEY = process.env
  .EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY as string;

// cache the token

const tokenCache = {
  async getToken(key: string) {
    try {
      return await SecureStore.getItem(key);
    } catch (err) {
      return null;
    }
  },
  async saveToken(key: string, token: string) {
    try {
      await SecureStore.setItem(key, token);
    } catch (err) {
      return;
    }
  },
};

export default function RootLayout() {
  return (
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      tokenCache={tokenCache}
    >
      <Slot />
    </ClerkProvider>
  );
}
