import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { Font, Lamp } from "../constants/lamplight";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />
      <View style={styles.container}>
        <Text style={styles.title}>{"This screen doesn't exist."}</Text>

        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Go to home screen!</Text>
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
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {
    fontFamily: Font.body,
    fontSize: 14,
    color: Lamp.inkSoft,
    textDecorationLine: "underline",
  },
});
