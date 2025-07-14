import { Tabs, useRouter } from "expo-router";
import React from "react";
import { Platform } from "react-native";

import { HapticTab } from "@/components/HapticTab";
import { House, Plus, User2 } from "lucide-react-native";

export default function TabLayout() {
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "purple",
        tabBarShowLabel: false,
        tabBarButton: HapticTab,
        // tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: {
            // Use a transparent background on iOS to show the blur effect
            position: "absolute",
          },
          default: {},
        }),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color }) => <House size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="create-link"
        options={{
          tabBarIcon: ({ color }) => <Plus size={28} color={color} />,
          headerShown: false,
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault(); // Prevent default behavior
            router.push("/create-event"); // Navigate to Create screen in the stack
          },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ color }) => <User2 size={28} color={color} />,
        }}
      />
    </Tabs>
  );
}
