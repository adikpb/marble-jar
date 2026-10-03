import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import {
  addMarble,
  BRAVING_TAGS,
  getJarStats,
  getPerson,
  JAR_CAPACITY,
  listMarbles,
  type Marble,
  type Person,
} from "../../lib/store";

export default function PersonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const personId = Array.isArray(id) ? id[0] : id;

  const [person, setPerson] = useState<Person | null>(null);
  const [marbles, setMarbles] = useState<Marble[]>([]);
  const [count, setCount] = useState(0);
  const [pct, setPct] = useState(0);
  const [reason, setReason] = useState("");
  const [tag, setTag] = useState<string>("");

  const refresh = useCallback(async () => {
    if (!personId) return;
    const [p, m, stats] = await Promise.all([
      getPerson(personId),
      listMarbles(personId),
      getJarStats(personId),
    ]);
    setPerson(p);
    setMarbles(m);
    setCount(stats.count);
    setPct(stats.pct);
  }, [personId]);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  async function handleDelta(delta: 1 | -1) {
    if (!personId) return;
    await addMarble(personId, delta, reason, tag);
    setReason("");
    await refresh();
  }

  const jarPct = Math.round(pct * 100);

  return (
    <View style={s.page}>
      <Text style={s.name} accessibilityRole="header">
        {person?.name ?? "Loading…"}
      </Text>
      <Text
        testID="jar-count"
        // nativeID -> DOM `id` on web; Maestro's web `id:` selector prefers the
        // DOM id over aria-label, so it must be kept in sync with testID.
        nativeID="jar-count"
        style={s.count}
        accessibilityLabel={`${count} of ${JAR_CAPACITY} marbles`}
      >
        {count} / {JAR_CAPACITY} marbles · {jarPct}%
      </Text>

      {/* Jar visual */}
      <View style={s.jarWrap}>
        <View style={s.jar} accessible accessibilityLabel={`Jar ${jarPct} percent full`}>
          <View style={[s.jarFill, { height: `${jarPct}%` }]} />
          <View style={s.jarShine} />
        </View>
        <Text style={s.jarHint}>
          {count <= 0
            ? "Empty jar — every marble starts with a small kept promise."
            : count >= JAR_CAPACITY
              ? "Full jar. That's deep trust — keep tending it."
              : `${JAR_CAPACITY - count} marbles to a full jar.`}
        </Text>
      </View>

      {/* Add / remove marble */}
      <Text style={s.section}>Log a moment</Text>
      <TextInput
        testID="marble-reason"
        nativeID="marble-reason"
        accessibilityLabel="Reason"
        accessibilityHint="What happened? e.g. remembered the small thing I mentioned"
        value={reason}
        onChangeText={setReason}
        placeholder="What happened?"
        placeholderTextColor="#A39E93"
        style={s.input}
      />

      <Text style={s.label}>BRAVING tag</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
        {BRAVING_TAGS.map((t) => {
          const active = tag === t;
          return (
            <Pressable
              key={t}
              testID={`braving-${t}`}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`Tag ${t}`}
              onPress={() => setTag(active ? "" : t)}
              style={[s.chip, active && s.chipActive]}
            >
              <Text style={[s.chipText, active && s.chipTextActive]}>{t}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={s.btnRow}>
        <Pressable
          testID="remove-marble"
          accessibilityRole="button"
          accessibilityLabel="Remove a marble"
          onPress={() => handleDelta(-1)}
          style={({ pressed }) => [s.btn, s.btnGhost, pressed && s.pressed]}
        >
          <Text style={s.btnGhostText}>− Remove</Text>
        </Pressable>
        <Pressable
          testID="add-marble"
          nativeID="add-marble"
          accessibilityRole="button"
          accessibilityLabel="Add a marble"
          onPress={() => handleDelta(1)}
          style={({ pressed }) => [s.btn, s.btnSolid, pressed && s.pressed]}
        >
          <Text style={s.btnSolidText}>+ Marble</Text>
        </Pressable>
      </View>

      <Text style={s.section}>History</Text>
      <FlatList
        data={marbles}
        keyExtractor={(m) => m.id}
        contentContainerStyle={s.feed}
        ListEmptyComponent={<Text style={s.empty}>Nothing logged yet — add the first marble.</Text>}
        renderItem={({ item }) => (
          <View style={s.feedItem}>
            <Text style={[s.dot, item.delta > 0 ? s.dotUp : s.dotDown]}>
              {item.delta > 0 ? "●" : "○"}
            </Text>
            <View style={s.feedBody}>
              <Text style={s.feedReason}>
                {item.reason || (item.delta > 0 ? "Marble added" : "Marble removed")}
              </Text>
              <Text style={s.feedMeta}>
                {item.delta > 0 ? "+1" : "−1"}
                {item.bravingTag ? ` · ${item.bravingTag}` : ""} ·{" "}
                {new Date(item.ts).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, padding: 20, paddingTop: 16, backgroundColor: "#FAF7F0" },
  name: { fontSize: 28, fontWeight: "800", color: "#1E1B16" },
  count: { fontSize: 14, fontWeight: "600", color: "#8A8478", marginTop: 4 },
  jarWrap: { alignItems: "center", marginVertical: 18 },
  jar: {
    width: 150,
    height: 190,
    borderWidth: 3,
    borderColor: "#1E1B16",
    borderTopWidth: 5,
    borderRadius: 18,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    backgroundColor: "#FFFDF7",
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  jarFill: { backgroundColor: "#E8A33D", borderRadius: 6 },
  jarShine: {
    position: "absolute",
    left: 12,
    top: 14,
    bottom: 14,
    width: 14,
    borderRadius: 99,
    backgroundColor: "rgba(255,255,255,0.65)",
  },
  jarHint: { marginTop: 10, fontSize: 13, color: "#5C564A", textAlign: "center", maxWidth: 280 },
  section: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: "#8A8478",
    marginTop: 8,
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E4DECF",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1E1B16",
  },
  label: { fontSize: 13, fontWeight: "600", color: "#5C564A", marginTop: 12, marginBottom: 6 },
  chips: { gap: 8, paddingRight: 20 },
  chip: {
    borderWidth: 1,
    borderColor: "#E0D8C2",
    backgroundColor: "#fff",
    borderRadius: 99,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  chipActive: { backgroundColor: "#1E1B16", borderColor: "#1E1B16" },
  chipText: { fontSize: 13, fontWeight: "600", color: "#5C564A" },
  chipTextActive: { color: "#FAF7F0" },
  btnRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  btn: { flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  btnSolid: { backgroundColor: "#2E7D6F" },
  btnSolidText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  btnGhost: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#E0D8C2" },
  btnGhostText: { color: "#1E1B16", fontWeight: "700", fontSize: 16 },
  pressed: { opacity: 0.75 },
  feed: { paddingBottom: 40, gap: 4 },
  empty: { color: "#8A8478", fontSize: 14, marginTop: 8 },
  feedItem: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EDE6D3",
  },
  dot: { fontSize: 16, marginTop: 1 },
  dotUp: { color: "#E8A33D" },
  dotDown: { color: "#B9B2A1" },
  feedBody: { flex: 1 },
  feedReason: { fontSize: 15, color: "#1E1B16", fontWeight: "500" },
  feedMeta: { fontSize: 12, color: "#8A8478", marginTop: 2 },
});
