import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { Font, Lamp } from "../constants/lamplight";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Not found" }} />
      <View style={styles.container}>
        <Text style={styles.title} accessibilityRole="header">
          No jar down this path.
        </Text>
        <Text style={styles.body}>
          This corner of the shelf was never filled — the jars are back home.
        </Text>

        <Link href="/" style={styles.link} accessibilityLabel="Back to the shelf">
          <Text style={styles.linkText}>‹ Back to the shelf</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: Lamp.ground,
  },
  title: {
    fontFamily: Font.display,
    fontSize: 20,
    color: Lamp.ink,
    textAlign: "center",
  },
  body: {
    fontFamily: Font.body,
    fontSize: 14,
    lineHeight: 20,
    color: Lamp.inkSoft,
    textAlign: "center",
    marginTop: 10,
  },
  link: {
    marginTop: 15,
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  linkText: {
    fontFamily: Font.bodySemi,
    fontWeight: "600",
    fontSize: 15,
    color: Lamp.ink,
  },
});
