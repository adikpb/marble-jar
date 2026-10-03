import { Link, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import {
  addPerson,
  getPeopleWithCounts,
  JAR_CAPACITY,
  type Person,
  removePerson,
  renamePerson,
  type SortKey,
  searchPeople,
} from "../lib/store";

type Row = Person & { count: number; pct: number };

const SORTS: { key: SortKey; short: string; label: string }[] = [
  { key: "recent", short: "Recent", label: "Sort by recent activity" },
  { key: "fullest", short: "Fullest", label: "Sort by fullest jar" },
  { key: "name", short: "Name", label: "Sort by name" },
];

// searchPeople arrives name-sorted; re-order client-side when the shelf is
// set to fullest. ("recent" search goes through getPeopleWithCounts instead,
// so true last-activity order holds there too.)
function orderSearchRows(rows: Row[], sort: SortKey): Row[] {
  if (sort === "fullest") {
    return [...rows].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }
  return rows;
}

export default function Home() {
  const [people, setPeople] = useState<Row[]>([]);
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [confirmingRemoveId, setConfirmingRemoveId] = useState<string | null>(null);
  const [cardError, setCardError] = useState<{ id: string; message: string } | null>(null);

  const refresh = useCallback(async () => {
    try {
      const q = query.trim();
      if (q && sort !== "recent") {
        setPeople(orderSearchRows(await searchPeople(q), sort));
        return;
      }
      const rows = await getPeopleWithCounts(sort);
      setPeople(q ? rows.filter((p) => p.name.toLowerCase().includes(q.toLowerCase())) : rows);
    } catch {
      // first-run DB errors surface as empty list; retry on focus
    }
  }, [query, sort]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  // Live search with a light debounce so every keystroke isn't a store round-trip.
  // (Deferred through setTimeout so the effect body never sets state synchronously.)
  useEffect(() => {
    const t = setTimeout(
      () => {
        refresh();
      },
      query.trim() ? 250 : 0,
    );
    return () => clearTimeout(t);
  }, [query, refresh]);

  async function handleAdd() {
    if (!name.trim()) return;
    await addPerson(name);
    setName("");
    // Clear any search so the new jar is visible on the shelf right away.
    setQuery("");
    setCardError(null);
    await refresh();
  }

  function startRename(row: Row) {
    setEditingId(row.id);
    setDraft(row.name);
    setCardError(null);
  }

  function cancelRename() {
    setEditingId(null);
    setDraft("");
  }

  async function saveRename(row: Row) {
    const next = draft.trim();
    if (!next || next === row.name) {
      cancelRename();
      return;
    }
    try {
      await renamePerson(row.id, next);
    } catch {
      // Inline error — the draft is preserved so nothing typed is lost.
      setCardError({ id: row.id, message: "Couldn't save that name. Please try again." });
      return;
    }
    cancelRename();
    setCardError(null);
    await refresh();
  }

  function removeDetail(row: Row): string {
    const noun = row.count === 1 ? "marble" : "marbles";
    return row.count > 0
      ? `Their jar holds ${row.count} ${noun} — every reason and tag goes with it. This can't be undone.`
      : "Their jar is empty, so no marbles go with it — but they leave the shelf for good.";
  }

  function showRemoveConfirm(row: Row) {
    setConfirmingRemoveId(row.id);
    setCardError(null);
  }

  function cancelRemove() {
    setConfirmingRemoveId(null);
  }

  async function confirmRemove(row: Row) {
    try {
      await removePerson(row.id);
    } catch {
      // Back to the plain footer with an inline error; the user can retry.
      setConfirmingRemoveId(null);
      setCardError({ id: row.id, message: "Couldn't remove that jar. Please try again." });
      return;
    }
    setConfirmingRemoveId(null);
    setCardError(null);
    await refresh();
  }

  function renderRow(item: Row) {
    const editing = editingId === item.id;
    const pct = Math.round(item.pct * 100);
    return (
      <View style={s.card}>
        {editing ? (
          <View>
            <TextInput
              testID="rename-person-input"
              // Keep testID + nativeID in sync (see note on add-person-input).
              nativeID="rename-person-input"
              accessibilityLabel={`Rename ${item.name}`}
              accessibilityHint="Edit the name, then press Save"
              value={draft}
              onChangeText={setDraft}
              placeholder={item.name}
              placeholderTextColor="#A39E93"
              style={s.input}
              returnKeyType="done"
              onSubmitEditing={() => saveRename(item)}
              autoFocus
            />
            <View style={s.track} accessible accessibilityLabel={`Jar ${pct} percent full`}>
              <View style={[s.fill, { width: `${pct}%` }]} />
            </View>
            <View style={s.cardActions}>
              <Pressable
                testID="rename-save-button"
                nativeID="rename-save-button"
                accessibilityRole="button"
                accessibilityLabel={`Save new name for ${item.name}`}
                onPress={() => saveRename(item)}
                hitSlop={8}
                style={({ pressed }) => [s.saveBtn, pressed && s.pressed]}
              >
                <Text style={s.saveBtnText}>Save</Text>
              </Pressable>
              <Pressable
                testID="rename-cancel-button"
                nativeID="rename-cancel-button"
                accessibilityRole="button"
                accessibilityLabel={`Cancel renaming ${item.name}`}
                onPress={cancelRename}
                hitSlop={8}
                style={({ pressed }) => [s.ghostBtn, pressed && s.pressed]}
              >
                <Text style={s.actionText}>Cancel</Text>
              </Pressable>
            </View>
            {cardError?.id === item.id && (
              <Text
                testID="card-error"
                nativeID="card-error"
                accessibilityRole="alert"
                style={s.cardError}
              >
                {cardError.message}
              </Text>
            )}
          </View>
        ) : (
          <View>
            <Link href={{ pathname: "/person/[id]", params: { id: item.id } }} asChild>
              <Pressable
                testID="person-row"
                nativeID="person-row"
                accessibilityRole="button"
                accessibilityLabel={`${item.name}, ${item.count} of ${JAR_CAPACITY} marbles`}
                style={({ pressed }) => [pressed && s.pressed]}
              >
                <View style={s.cardTop}>
                  <Text style={s.cardName}>{item.name}</Text>
                  <Text testID="jar-count" nativeID="jar-count" style={s.cardCount}>
                    {item.count}/{JAR_CAPACITY} · {pct}%
                  </Text>
                </View>
                <View style={s.track} accessible accessibilityLabel={`Jar ${pct} percent full`}>
                  <View style={[s.fill, { width: `${pct}%` }]} />
                </View>
              </Pressable>
            </Link>
            {confirmingRemoveId === item.id ? (
              <View style={s.confirmBox}>
                <Text style={s.confirmText}>
                  Remove {item.name}? {removeDetail(item)}
                </Text>
                <View style={s.confirmActions}>
                  <Pressable
                    testID="remove-cancel"
                    nativeID="remove-cancel"
                    accessibilityRole="button"
                    accessibilityLabel={`Cancel removing ${item.name}`}
                    onPress={cancelRemove}
                    hitSlop={8}
                    style={({ pressed }) => [s.ghostBtn, pressed && s.pressed]}
                  >
                    <Text style={s.actionText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    testID="remove-confirm"
                    nativeID="remove-confirm"
                    accessibilityRole="button"
                    accessibilityLabel={`Confirm removing ${item.name}`}
                    accessibilityHint={`Deletes their jar and all ${item.count} marbles`}
                    onPress={() => confirmRemove(item)}
                    hitSlop={8}
                    style={({ pressed }) => [s.saveBtn, pressed && s.pressed]}
                  >
                    <Text style={s.saveBtnText}>Remove</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={s.cardActions}>
                <Pressable
                  testID="rename-person-button"
                  nativeID="rename-person-button"
                  accessibilityRole="button"
                  accessibilityLabel={`Rename ${item.name}`}
                  onPress={() => startRename(item)}
                  hitSlop={8}
                  style={({ pressed }) => [s.ghostBtn, pressed && s.pressed]}
                >
                  <Text style={s.actionText}>Rename</Text>
                </Pressable>
                <Pressable
                  testID="remove-person-button"
                  nativeID="remove-person-button"
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${item.name}`}
                  accessibilityHint={`Deletes their jar and all ${item.count} marbles`}
                  onPress={() => showRemoveConfirm(item)}
                  hitSlop={8}
                  style={({ pressed }) => [s.ghostBtn, pressed && s.pressed]}
                >
                  <Text style={s.removeText}>Remove</Text>
                </Pressable>
              </View>
            )}
            {cardError?.id === item.id && (
              <Text
                testID="card-error"
                nativeID="card-error"
                accessibilityRole="alert"
                style={s.cardError}
              >
                {cardError.message}
              </Text>
            )}
          </View>
        )}
      </View>
    );
  }

  const q = query.trim();

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
          // Maestro's web driver derives `resource-id` from the first of
          // id / aria-label / name / title / for / data-testid that exists.
          // `aria-label` (accessibilityLabel) wins over `data-testid`, so
          // `nativeID` — which react-native-web renders as the DOM `id` — is
          // required for `id: add-person-input` to resolve. Keep it in sync
          // with testID.
          nativeID="add-person-input"
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
          nativeID="add-person-button"
          accessibilityRole="button"
          accessibilityLabel="Add person"
          onPress={handleAdd}
          style={({ pressed }) => [s.addBtn, pressed && s.pressed]}
        >
          <Text style={s.addBtnText}>Add</Text>
        </Pressable>
      </View>

      <TextInput
        testID="search-person-input"
        nativeID="search-person-input"
        accessibilityLabel="Search people by name"
        accessibilityHint="Type a name to filter the shelf"
        value={query}
        onChangeText={setQuery}
        placeholder="Search jars…"
        placeholderTextColor="#A39E93"
        style={[s.input, s.searchInput]}
        returnKeyType="search"
        clearButtonMode="while-editing"
      />

      <View style={s.sortRow}>
        {SORTS.map((o) => {
          const on = sort === o.key;
          return (
            <Pressable
              key={o.key}
              testID={`sort-${o.key}`}
              nativeID={`sort-${o.key}`}
              accessibilityRole="button"
              accessibilityLabel={o.label}
              accessibilityState={{ selected: on }}
              onPress={() => setSort(o.key)}
              style={({ pressed }) => [s.chip, on && s.chipOn, pressed && s.pressed]}
            >
              <Text style={[s.chipText, on && s.chipTextOn]}>{o.short}</Text>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        data={people}
        keyExtractor={(p) => p.id}
        contentContainerStyle={s.list}
        ListEmptyComponent={
          q ? (
            <Text testID="empty-state" nativeID="empty-state" style={s.empty}>
              No jars match “{q}”. Try another name.
            </Text>
          ) : (
            <Text testID="empty-state" nativeID="empty-state" style={s.empty}>
              No jars yet. Add someone above to drop in the first marble.
            </Text>
          )
        }
        renderItem={({ item }) => renderRow(item)}
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
  searchInput: { flex: 0, marginBottom: 10 },
  sortRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  chip: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E0D8C2",
    borderRadius: 99,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  chipOn: { backgroundColor: "#1E1B16", borderColor: "#1E1B16" },
  chipText: { color: "#5C564A", fontWeight: "600", fontSize: 13 },
  chipTextOn: { color: "#FAF7F0" },
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
  cardActions: { flexDirection: "row", gap: 8, marginTop: 12 },
  ghostBtn: { paddingVertical: 6, paddingHorizontal: 4 },
  actionText: { fontSize: 13, fontWeight: "600", color: "#8A8478" },
  removeText: { fontSize: 13, fontWeight: "600", color: "#5C564A" },
  saveBtn: {
    backgroundColor: "#1E1B16",
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 18,
    justifyContent: "center",
  },
  saveBtnText: { color: "#FAF7F0", fontWeight: "700", fontSize: 13 },
  confirmBox: {
    marginTop: 12,
    backgroundColor: "#FAF7F0",
    borderWidth: 1,
    borderColor: "#EDE6D3",
    borderRadius: 14,
    padding: 12,
  },
  confirmText: { fontSize: 13, lineHeight: 18, color: "#5C564A" },
  confirmActions: { flexDirection: "row", gap: 8, marginTop: 10 },
  cardError: { fontSize: 13, lineHeight: 18, color: "#5C564A", marginTop: 8 },
});
