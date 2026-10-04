import {
  BricolageGrotesque_700Bold,
  useFonts as useDisplay,
} from "@expo-google-fonts/bricolage-grotesque";
import { Caveat_600SemiBold, useFonts as useHand } from "@expo-google-fonts/caveat";
import {
  Karla_400Regular,
  Karla_600SemiBold,
  Karla_700Bold,
  useFonts as useBody,
} from "@expo-google-fonts/karla";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { Platform } from "react-native";
import { Font, Lamp } from "../constants/lamplight";

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const [displayLoaded] = useDisplay({ BricolageGrotesque_700Bold });
  const [bodyLoaded] = useBody({ Karla_400Regular, Karla_600SemiBold, Karla_700Bold });
  const [handLoaded] = useHand({ Caveat_600SemiBold });
  const ready = displayLoaded && bodyLoaded && handLoaded;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  if (!ready) return null;

  return (
    <Stack
      screenOptions={{
        // Web never earns the native stack chrome: expo-router's web
        // header drops headerStyle and paints its own hardcoded #F2F2F2,
        // an Espresso-rule break. The jar screen carries its own in-flow
        // header on web instead (the shelf's display heading is already
        // its locator); native keeps the stack header untouched.
        headerShown: Platform.select({ web: false, default: true }),
        headerStyle: { backgroundColor: Lamp.ground },
        headerTintColor: Lamp.ink,
        headerTitleStyle: { fontFamily: Font.display, fontSize: 19 },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: Lamp.ground },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Marble Jar" }} />
      <Stack.Screen name="person/[id]" options={{ title: "Jar" }} />
    </Stack>
  );
}
