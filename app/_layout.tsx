import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#FAF7F0" },
          headerTintColor: "#1E1B16",
          headerTitleStyle: { fontWeight: "700" },
          contentStyle: { backgroundColor: "#FAF7F0" },
        }}
      >
        <Stack.Screen name="index" options={{ title: "Marble Jar" }} />
        <Stack.Screen name="person/[id]" options={{ title: "Jar" }} />
      </Stack>
    </>
  );
}
