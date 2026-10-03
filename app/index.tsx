import { Link, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { addPerson, getPeopleWithCounts, JAR_CAPACITY, type Person } from "../lib/store";

type Row = Person & { count: number; pct: number };

export default function Home() {
  const [people, setPeople] = useState<Row[]>([]);
  const [name, setName] = useState("");

  const refresh = useCallback(async () => {
    try {
      setPeople(await getPeopleWithCounts());
    } catch {
      // first-run DB errors surface as empty list; retry on focus
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  async function handleAdd() {
    if (!name.trim()) return;
    await addPerson(name);
    setName("");
    await refresh();
  }

  return (
    <View style={s.page}>
      <Text style={s.eyebrow} accessibilityRole="header">
        Small moments, collected
      </Text>
      <Text style={s.title}>Whose jar are you filling?</Text>
      <Text style={s.sub}>
        Trust is a marble jar — every kept promise adds a marble. A full jar is {JAR_CAPACITY}{" "}
        marbles.
      </Text>

      <View style={s.addRow}>
        <TextInput
          testID="add-person-input"
          accessibilityLabel="Person name"
          accessibilityHint="Type a name, then press Add"
          value={name}
          onChangeText={setName}
          placeholder="Add someone… e.g. Maya"
          placeholderTextColor="#A39E93"
          style={s.input}
          returnKeyType="done"
          onSubmitEditing={handleAdd}
        />
        <Pressable
          testID="add-person-button"
          accessibilityRole="button"
          accessibilityLabel="Add person"
          onPress={handleAdd}
          style={({ pressed }) => [s.addBtn, pressed && s.pressed]}
        >
          <Text style={s.addBtnText}>Add</Text>
        </Pressable>
      </View>

      <FlatList
        data={people}
        keyExtractor={(p) => p.id}
        contentContainerStyle={s.list}
        ListEmptyComponent={
          <Text style={s.empty}>No jars yet. Add someone above to drop in the first marble.</Text>
        }
        renderItem={({ item }) => (
          <Link href={{ pathname: "/person/[id]", params: { id: item.id } }} asChild>
            <Pressable
              testID="person-row"
              accessibilityRole="button"
              accessibilityLabel={`${item.name}, ${item.count} of ${JAR_CAPACITY} marbles`}
              style={({ pressed }) => [s.card, pressed && s.pressed]}
            >
              <View style={s.cardTop}>
                <Text style={s.cardName}>{item.name}</Text>
                <Text testID="jar-count" style={s.cardCount}>
                  {item.count}/{JAR_CAPACITY} · {Math.round(item.pct * 100)}%
                </Text>
              </View>
              <View
                style={s.track}
                accessible
                accessibilityLabel={`Jar ${Math.round(item.pct * 100)} percent full`}
              >
                <View style={[s.fill, { width: `${Math.round(item.pct * 100)}%` }]} />
              </View>
            </Pressable>
          </Link>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, padding: 20, paddingTop: 28, backgroundColor: "#FAF7F0" },
  eyebrow: {
    fontSize: 12,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: "#8A8478",
    fontWeight: "600",
  },
  title: { fontSize: 30, fontWeight: "800", color: "#1E1B16", marginTop: 6 },
  sub: { fontSize: 14, lineHeight: 20, color: "#5C564A", marginTop: 8, marginBottom: 16 },
  addRow: { flexDirection: "row", gap: 10, marginBottom: 8 },
  input: {
    flex: 1,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E4DECF",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1E1B16",
  },
  addBtn: {
    backgroundColor: "#1E1B16",
    borderRadius: 14,
    paddingHorizontal: 20,
    justifyContent: "center",
  },
  addBtnText: { color: "#FAF7F0", fontWeight: "700", fontSize: 15 },
  pressed: { opacity: 0.75 },
  list: { paddingTop: 12, paddingBottom: 40, gap: 12 },
  empty: { color: "#8A8478", fontSize: 14, lineHeight: 20, marginTop: 24, textAlign: "center" },
  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E9E2D2",
    borderRadius: 18,
    padding: 16,
    shadowColor: "#1E1B16",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  cardName: { fontSize: 19, fontWeight: "700", color: "#1E1B16" },
  cardCount: { fontSize: 13, fontWeight: "600", color: "#8A8478" },
  track: {
    height: 10,
    borderRadius: 99,
    backgroundColor: "#F0EAD9",
    marginTop: 12,
    overflow: "hidden",
  },
  fill: { height: "100%", backgroundColor: "#E8A33D", borderRadius: 99 },
});
