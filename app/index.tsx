// The shelf: every jar in the house, the week's fresh marbles, and a
// composer fast enough to catch a moment before it cools.
import { Link, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { MarbleDots, Slip } from "../components/lamplight";
import { TAG_GLOSSES, TAG_ORDER } from "../constants/braving";
import { Font, Lamp } from "../constants/lamplight";
import {
  addMarble,
  addPerson,
  getPeopleWithCounts,
  JAR_CAPACITY,
  listMarbles,
  type Marble,
  type Person,
  removePerson,
  renamePerson,
  type SortKey,
  searchPeople,
  tagHue,
} from "../lib/store";

type Row = Person & { count: number; pct: number };
type Fresh = { marble: Marble; name: string };

const SORTS: { key: SortKey; short: string; label: string }[] = [
  { key: "recent", short: "Recent", label: "Sort by recent activity" },
  { key: "fullest", short: "Fullest", label: "Sort by fullest jar" },
  { key: "name", short: "Name", label: "Sort by name" },
];

function dayLabel(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (sameDay(d, today)) return "today";
  if (sameDay(d, yesterday)) return "yesterday";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function Home() {
  const [people, setPeople] = useState<Row[]>([]);
  const [fresh, setFresh] = useState<Fresh[]>([]);
  const [huesByPerson, setHuesByPerson] = useState<Map<string, string[]>>(new Map());
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [confirmingRemoveId, setConfirmingRemoveId] = useState<string | null>(null);
  const [cardError, setCardError] = useState<{ id: string; message: string } | null>(null);
  // Quick-log composer state
  const [logPersonId, setLogPersonId] = useState<string | null>(null);
  const [logReason, setLogReason] = useState("");
  const [logTag, setLogTag] = useState("");
  const [logHint, setLogHint] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const q = query.trim();
      let rows: Row[];
      if (q && sort !== "recent") {
        const found = await searchPeople(q);
        rows =
          sort === "fullest"
            ? [...found].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
            : found;
      } else {
        const all = await getPeopleWithCounts(sort);
        rows = q ? all.filter((p) => p.name.toLowerCase().includes(q.toLowerCase())) : all;
      }
      setPeople(rows);
      if (!logPersonId || !rows.some((r) => r.id === logPersonId)) {
        setLogPersonId(rows[0]?.id ?? null);
      }
      // The week's ribbon + the hue of every shelf: newest marbles per jar.
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const per = await Promise.all(
        rows.slice(0, 20).map(async (r) => {
          const marbles = await listMarbles(r.id, { limit: 20 }).catch(() => []);
          return { row: r, marbles };
        }),
      );
      const hues = new Map<string, string[]>();
      const allFresh: Fresh[] = [];
      for (const { row, marbles } of per) {
        hues.set(
          row.id,
          marbles.slice(0, row.count).map((m) => tagHue(m.bravingTag)),
        );
        for (const m of marbles) {
          if (m.ts >= weekAgo) allFresh.push({ marble: m, name: row.name });
        }
      }
      allFresh.sort((a, b) => b.marble.ts - a.marble.ts);
      setHuesByPerson(hues);
      setFresh(allFresh.slice(0, 6));
    } catch {
      // first-run DB errors surface as empty list; retry on focus
    }
  }, [query, sort, logPersonId]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  useEffect(() => {
    const t = setTimeout(() => refresh(), query.trim() ? 250 : 0);
    return () => clearTimeout(t);
  }, [query, refresh]);

  async function handleAdd() {
    if (!name.trim()) return;
    const person = await addPerson(name);
    setName("");
    setQuery("");
    setCardError(null);
    setLogPersonId(person.id);
    await refresh();
  }

  async function handleQuickLog(delta: 1 | -1) {
    if (!logPersonId) {
      setLogHint("Add someone below first — a marble needs its jar.");
      return;
    }
    if (!logReason.trim() || !logTag) {
      setLogHint("Give the moment a few words and a BRAVING tag — every marble has a why.");
      return;
    }
    await addMarble(logPersonId, delta, logReason, logTag);
    setLogReason("");
    setLogTag("");
    setLogHint(null);
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
      setCardError({ id: row.id, message: "Couldn't save that name. Please try again." });
      return;
    }
    cancelRename();
    setCardError(null);
    await refresh();
  }
  async function confirmRemove(row: Row) {
    try {
      await removePerson(row.id);
    } catch {
      setConfirmingRemoveId(null);
      setCardError({ id: row.id, message: "Couldn't remove that jar. Please try again." });
      return;
    }
    setConfirmingRemoveId(null);
    setCardError(null);
    await refresh();
  }

  const logPerson = useMemo(
    () => people.find((p) => p.id === logPersonId) ?? null,
    [people, logPersonId],
  );
  const logGloss = logTag ? (TAG_GLOSSES[logTag] ?? "") : "";
  const q = query.trim();

  function renderRow(item: Row, index: number) {
    const editing = editingId === item.id;
    const pct = Math.round(item.pct * 100);
    const hues = huesByPerson.get(item.id) ?? [];
    return (
      <Animated.View entering={FadeInDown.delay(Math.min(index, 6) * 60).duration(420)}>
        <View style={s.board}>
          {editing ? (
            <View>
              <TextInput
                testID="rename-person-input"
                nativeID="rename-person-input"
                accessibilityLabel={`Rename ${item.name}`}
                accessibilityHint="Edit the name, then press Save"
                value={draft}
                onChangeText={setDraft}
                placeholder={item.name}
                placeholderTextColor={Lamp.inkFaint}
                style={s.field}
                returnKeyType="done"
                onSubmitEditing={() => saveRename(item)}
              />
              <View style={s.boardActions}>
                <Pressable
                  testID="rename-save-button"
                  nativeID="rename-save-button"
                  accessibilityRole="button"
                  accessibilityLabel={`Save new name for ${item.name}`}
                  onPress={() => saveRename(item)}
                  hitSlop={8}
                  style={({ pressed }) => [s.solidBtn, pressed && s.pressed]}
                >
                  <Text style={s.solidBtnText}>Save</Text>
                </Pressable>
                <Pressable
                  testID="rename-cancel-button"
                  nativeID="rename-cancel-button"
                  accessibilityRole="button"
                  accessibilityLabel={`Cancel renaming ${item.name}`}
                  onPress={cancelRename}
                  hitSlop={8}
                  style={({ pressed }) => [s.quietBtn, pressed && s.pressed]}
                >
                  <Text style={s.quietBtnText}>Cancel</Text>
                </Pressable>
              </View>
              {cardError?.id === item.id && (
                <Text
                  testID="card-error"
                  nativeID="card-error"
                  accessibilityRole="alert"
                  style={s.error}
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
                  <Text style={s.jarName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text testID="jar-count" nativeID="jar-count" style={s.jarCount}>
                    {item.count} of {JAR_CAPACITY} · {pct}%
                  </Text>
                  <View style={s.dots}>
                    <MarbleDots count={item.count} hues={hues} />
                  </View>
                </Pressable>
              </Link>
              {confirmingRemoveId === item.id ? (
                <View style={s.confirmBox}>
                  <Text style={s.confirmText}>
                    Lift {item.name} off the shelf?{" "}
                    {item.count > 0
                      ? `Their ${item.count} ${item.count === 1 ? "marble" : "marbles"} — every reason and tag — go with them. This can't be undone.`
                      : "Their jar is empty, but they leave the shelf for good."}
                  </Text>
                  <View style={s.boardActions}>
                    <Pressable
                      testID="remove-confirm"
                      nativeID="remove-confirm"
                      accessibilityRole="button"
                      accessibilityLabel={`Confirm removing ${item.name}`}
                      onPress={() => confirmRemove(item)}
                      hitSlop={8}
                      style={({ pressed }) => [s.dangerBtn, pressed && s.pressed]}
                    >
                      <Text style={s.solidBtnText}>Remove</Text>
                    </Pressable>
                    <Pressable
                      testID="remove-cancel"
                      nativeID="remove-cancel"
                      accessibilityRole="button"
                      accessibilityLabel={`Cancel removing ${item.name}`}
                      onPress={() => setConfirmingRemoveId(null)}
                      hitSlop={8}
                      style={({ pressed }) => [s.quietBtn, pressed && s.pressed]}
                    >
                      <Text style={s.quietBtnText}>Keep</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <View style={s.boardActions}>
                  <Pressable
                    testID="rename-person-button"
                    nativeID="rename-person-button"
                    accessibilityRole="button"
                    accessibilityLabel={`Rename ${item.name}`}
                    onPress={() => startRename(item)}
                    hitSlop={8}
                    style={({ pressed }) => [s.quietBtn, pressed && s.pressed]}
                  >
                    <Text style={s.quietBtnText}>Rename</Text>
                  </Pressable>
                  <Pressable
                    testID="remove-person-button"
                    nativeID="remove-person-button"
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${item.name}`}
                    onPress={() => {
                      setConfirmingRemoveId(item.id);
                      setCardError(null);
                    }}
                    hitSlop={8}
                    style={({ pressed }) => [s.quietBtn, pressed && s.pressed]}
                  >
                    <Text style={s.quietBtnText}>Remove</Text>
                  </Pressable>
                </View>
              )}
              {cardError?.id === item.id && (
                <Text
                  testID="card-error"
                  nativeID="card-error"
                  accessibilityRole="alert"
                  style={s.error}
                >
                  {cardError.message}
                </Text>
              )}
            </View>
          )}
        </View>
      </Animated.View>
    );
  }

  return (
    <FlatList
      data={people}
      keyboardShouldPersistTaps="handled"
      keyExtractor={(p) => p.id}
      contentContainerStyle={s.page}
      ListHeaderComponent={
        <View>
          <Text style={s.title} accessibilityRole="header">
            Whose jar are you filling?
          </Text>
          <Text style={s.lede}>
            Small moments, collected. Trust is a marble jar — every kept promise adds a marble,
            every broken one takes one away.
          </Text>

          <View style={s.composer}>
            <Text style={s.composerTitle}>Log a moment</Text>
            {people.length > 0 ? (
              <View style={s.pickerRow}>
                {people.map((p) => {
                  const on = p.id === logPersonId;
                  return (
                    <Pressable
                      key={p.id}
                      testID={`quick-pick-${p.id}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      accessibilityLabel={`Log for ${p.name}`}
                      onPress={() => {
                        setLogPersonId(p.id);
                        setLogHint(null);
                      }}
                      style={({ pressed }) => [s.pick, on && s.pickOn, pressed && s.pressed]}
                    >
                      <Text style={[s.pickText, on && s.pickTextOn]} numberOfLines={1}>
                        {p.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
            <TextInput
              testID="quick-reason"
              nativeID="quick-reason"
              accessibilityLabel="What happened?"
              accessibilityHint="A few words about the moment"
              value={logReason}
              onChangeText={(t) => {
                setLogReason(t);
                setLogHint(null);
              }}
              placeholder={logPerson ? `What happened with ${logPerson.name}?` : "What happened?"}
              placeholderTextColor={Lamp.inkFaint}
              style={s.field}
              returnKeyType="done"
            />
            <View style={s.dotRow}>
              {TAG_ORDER.map((t) => {
                const on = logTag === t;
                return (
                  <Pressable
                    key={t}
                    testID={`quick-tag-${t}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={TAG_GLOSSES[t] ? `${t}. ${TAG_GLOSSES[t]}` : t}
                    onPress={() => {
                      setLogTag(on ? "" : t);
                      setLogHint(null);
                    }}
                    hitSlop={6}
                    style={({ pressed }) => [
                      s.dotPick,
                      on && { borderColor: tagHue(t) },
                      pressed && s.pressed,
                    ]}
                  >
                    <View style={[s.dotBall, { backgroundColor: tagHue(t) }]} />
                    <Text style={[s.dotName, on && s.dotNameOn]}>{t}</Text>
                  </Pressable>
                );
              })}
            </View>
            {!!logGloss && <Text style={s.glossLine}>{logGloss}</Text>}
            <View style={s.logRow}>
              <Pressable
                testID="quick-remove"
                nativeID="quick-remove"
                accessibilityRole="button"
                accessibilityLabel="Log a broken promise"
                onPress={() => handleQuickLog(-1)}
                style={({ pressed }) => [s.removeBtn, pressed && s.pressed]}
              >
                <Text style={s.removeBtnText}>− Broke one</Text>
              </Pressable>
              <Pressable
                testID="quick-add"
                nativeID="quick-add"
                accessibilityRole="button"
                accessibilityLabel="Log a kept promise"
                onPress={() => handleQuickLog(1)}
                style={({ pressed }) => [s.keptBtn, pressed && s.pressed]}
              >
                <Text style={s.keptBtnText}>+ Kept one</Text>
              </Pressable>
            </View>
            {!!logHint && (
              <Text testID="quick-hint" style={s.hint} accessibilityRole="alert">
                {logHint}
              </Text>
            )}
          </View>

          {fresh.length > 0 && (
            <View style={s.week}>
              <Text style={s.weekTitle}>This week on the shelf</Text>
              {fresh.map(({ marble, name: who }) => (
                <View key={marble.id} style={s.weekSlip}>
                  <Slip
                    reason={marble.reason}
                    fallback={marble.delta > 0 ? "Marble added" : "Marble removed"}
                    hue={tagHue(marble.bravingTag)}
                    removed={marble.delta < 0}
                    meta={`${who} · ${marble.bravingTag || "untagged"} · ${dayLabel(marble.ts)}`}
                  />
                </View>
              ))}
            </View>
          )}

          <View style={s.addRow}>
            <TextInput
              testID="add-person-input"
              nativeID="add-person-input"
              accessibilityLabel="Person name"
              accessibilityHint="Type a name, then press Add"
              value={name}
              onChangeText={setName}
              placeholder="Add someone… e.g. Maya"
              placeholderTextColor={Lamp.inkFaint}
              style={[s.field, s.addField]}
              returnKeyType="done"
              onSubmitEditing={handleAdd}
            />
            <Pressable
              testID="add-person-button"
              nativeID="add-person-button"
              accessibilityRole="button"
              accessibilityLabel="Add person"
              onPress={handleAdd}
              style={({ pressed }) => [s.solidBtn, s.addBtn, pressed && s.pressed]}
            >
              <Text style={s.solidBtnText}>Add</Text>
            </Pressable>
          </View>

          <TextInput
            testID="search-person-input"
            nativeID="search-person-input"
            accessibilityLabel="Search people by name"
            value={query}
            onChangeText={setQuery}
            placeholder="Search jars…"
            placeholderTextColor={Lamp.inkFaint}
            style={[s.field, s.searchField]}
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
                  style={({ pressed }) => [s.sort, on && s.sortOn, pressed && s.pressed]}
                >
                  <Text style={[s.sortText, on && s.sortTextOn]}>{o.short}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      }
      ListEmptyComponent={
        q ? (
          <Text testID="empty-state" nativeID="empty-state" style={s.empty}>
            No jars match “{q}”. Try another name.
          </Text>
        ) : (
          <Text testID="empty-state" nativeID="empty-state" style={s.empty}>
            The shelf is bare. Add someone above — the first marble is a small kept promise away.
          </Text>
        )
      }
      renderItem={({ item, index }) => renderRow(item, index)}
    />
  );
}

const s = StyleSheet.create({
  page: {
    padding: 20,
    paddingTop: 26,
    paddingBottom: 56,
    backgroundColor: Lamp.ground,
    maxWidth: 880,
    width: "100%",
    alignSelf: "center",
  },
  title: {
    fontFamily: Font.display,
    fontSize: 40,
    lineHeight: 42,
    color: Lamp.ink,
    letterSpacing: -0.01,
  },
  lede: { fontFamily: Font.body, fontSize: 15, lineHeight: 22, color: Lamp.inkSoft, marginTop: 10 },
  composer: {
    backgroundColor: Lamp.board,
    borderWidth: 1,
    borderColor: Lamp.hairline,
    borderRadius: 20,
    padding: 16,
    marginTop: 18,
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  composerTitle: { fontFamily: Font.display, fontSize: 22, color: Lamp.ink },
  pickerRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  pick: {
    borderWidth: 1.5,
    borderColor: Lamp.hairline,
    borderRadius: 99,
    paddingHorizontal: 14,
    paddingVertical: 9,
    maxWidth: 150,
  },
  pickOn: { backgroundColor: Lamp.cherry, borderColor: Lamp.cherry },
  pickText: { fontFamily: Font.bodySemi, fontWeight: "600", fontSize: 14, color: Lamp.inkSoft },
  pickTextOn: { color: Lamp.cream },
  field: {
    backgroundColor: Lamp.ground,
    borderWidth: 1,
    borderColor: Lamp.hairline,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    fontFamily: Font.body,
    color: Lamp.ink,
    marginTop: 12,
  },
  dotRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 },
  dotPick: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 2,
    borderColor: "transparent",
    borderRadius: 99,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  dotBall: { width: 13, height: 13, borderRadius: 6.5 },
  dotName: { fontFamily: Font.bodySemi, fontWeight: "600", fontSize: 12.5, color: Lamp.inkFaint },
  dotNameOn: { color: Lamp.ink },
  glossLine: {
    fontFamily: Font.body,
    fontSize: 13,
    lineHeight: 18,
    color: Lamp.inkSoft,
    marginTop: 8,
  },
  logRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  keptBtn: {
    flex: 1,
    backgroundColor: Lamp.cherry,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
  },
  keptBtnText: { color: Lamp.cream, fontFamily: Font.bodyBold, fontWeight: "700", fontSize: 16 },
  removeBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: Lamp.hairline,
  },
  removeBtnText: {
    color: Lamp.inkSoft,
    fontFamily: Font.bodyBold,
    fontWeight: "700",
    fontSize: 16,
  },
  hint: { fontFamily: Font.body, fontSize: 13, lineHeight: 18, color: Lamp.honey, marginTop: 10 },
  week: { marginTop: 22 },
  weekTitle: { fontFamily: Font.display, fontSize: 22, color: Lamp.ink, marginBottom: 10 },
  weekSlip: { marginBottom: 10 },
  addRow: { flexDirection: "row", gap: 10, marginTop: 22, alignItems: "center" },
  addField: { flex: 1, marginTop: 0 },
  addBtn: { paddingHorizontal: 22, paddingVertical: 14 },
  solidBtn: {
    backgroundColor: Lamp.cherry,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 20,
    justifyContent: "center",
  },
  solidBtnText: { color: Lamp.cream, fontFamily: Font.bodyBold, fontWeight: "700", fontSize: 15 },
  quietBtn: { paddingVertical: 8, paddingHorizontal: 6 },
  quietBtnText: {
    fontFamily: Font.bodySemi,
    fontWeight: "600",
    fontSize: 14,
    color: Lamp.inkFaint,
  },
  dangerBtn: {
    backgroundColor: Lamp.cherryDeep,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  searchField: { marginTop: 10 },
  sortRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10, marginBottom: 14 },
  sort: {
    borderWidth: 1.5,
    borderColor: Lamp.hairline,
    borderRadius: 99,
    paddingHorizontal: 15,
    paddingVertical: 9,
  },
  sortOn: { backgroundColor: Lamp.ink, borderColor: Lamp.ink },
  sortText: { color: Lamp.inkSoft, fontFamily: Font.bodySemi, fontWeight: "600", fontSize: 13.5 },
  sortTextOn: { color: Lamp.ground },
  empty: {
    color: Lamp.inkFaint,
    fontFamily: Font.body,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 26,
    textAlign: "center",
  },
  board: {
    backgroundColor: Lamp.board,
    borderWidth: 1,
    borderColor: Lamp.hairline,
    borderRadius: 20,
    borderBottomWidth: 5,
    borderBottomColor: Lamp.shelfEdge,
    padding: 18,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  jarName: { fontFamily: Font.display, fontSize: 30, color: Lamp.ink },
  jarCount: {
    fontFamily: Font.bodySemi,
    fontWeight: "600",
    fontSize: 13.5,
    color: Lamp.inkSoft,
    marginTop: 2,
  },
  dots: { marginTop: 12 },
  boardActions: { flexDirection: "row", gap: 14, marginTop: 12, alignItems: "center" },
  confirmBox: {
    marginTop: 12,
    backgroundColor: Lamp.ground,
    borderWidth: 1,
    borderColor: Lamp.hairline,
    borderRadius: 14,
    padding: 12,
  },
  confirmText: { fontFamily: Font.body, fontSize: 13.5, lineHeight: 19, color: Lamp.inkSoft },
  error: { fontFamily: Font.body, fontSize: 13, lineHeight: 18, color: Lamp.honey, marginTop: 8 },
  pressed: { opacity: 0.75 },
});
