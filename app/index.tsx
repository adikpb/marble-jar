// The shelf: every jar in the house, the week's fresh marbles, and a
// composer fast enough to catch a moment before it cools.
import { Link, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  useReducedMotion,
} from "react-native-reanimated";
import { MarbleDots, Slip, TagField } from "../components/lamplight";
import { BRAVING_GUIDE, TAG_GLOSSES, WHY_HINT } from "../constants/braving";
import { Font, Lamp } from "../constants/lamplight";
import {
  addMarble,
  addPerson,
  BRAVING_TAGS,
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

// Seen flags live in localStorage on web and fall back to show-again on
// native, where there is no shared web storage. Guarded so neither
// platform can crash on the other's storage. Only dismissal and the
// jar-opened trace live here — every checklist tick reads real data, so the
// list can never desync from the shelf.
function readSeen(key: string): boolean {
  try {
    if (typeof localStorage === "undefined") return false;
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function markSeen(key: string): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(key, "1");
  } catch {
    // private mode: dismissal simply doesn't persist
  }
}

// Last-used BRAVING tag as a soft default: same guarded localStorage
// pattern as the seen flags, no ledger keys. Empty on true first use so
// nothing is preselected; afterwards the last logged tag pre-fills.
function readLastTag(): string {
  try {
    if (typeof localStorage === "undefined") return "";
    const v = localStorage.getItem("seen:last-tag");
    if (!v || !BRAVING_TAGS.includes(v as never)) return "";
    return v;
  } catch {
    return "";
  }
}

function writeLastTag(tag: string): void {
  try {
    if (typeof localStorage === "undefined") return;
    if (!tag) return;
    localStorage.setItem("seen:last-tag", tag);
  } catch {
    // private mode: the soft default simply doesn't persist
  }
}

// One ease for every arrival: a quick rise that settles, never springs.
// Spatial entrances use it; exits are always shorter so leaving feels instant.
const settleEase = Easing.bezier(0.16, 1, 0.3, 1);

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
  // Queued removals: every confirmed jar waits its own 5s window off the
  // shelf before the store is touched, so Undo only ever cancels — nothing
  // is deleted-then-restored, and a second confirm queues alongside the
  // first instead of flushing it. Unmount abandons the wait, not the jar.
  const [pendingRemoves, setPendingRemoves] = useState<
    { id: string; name: string; secsLeft: number }[]
  >([]);
  const pendingTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const [cardError, setCardError] = useState<{ id: string; message: string } | null>(null);
  // Quick-log composer state
  const [logPersonId, setLogPersonId] = useState<string | null>(null);
  const [logReason, setLogReason] = useState("");
  const [logTag, setLogTag] = useState(() => readLastTag());
  // Whether the current composer tag arrived carried from seen:last-tag
  // rather than from a tap. True only until the first tap or log clears it,
  // so the gloss line can mark the carried default explicitly.
  const [logCarried, setLogCarried] = useState(() => readLastTag() !== "");
  const [logHint, setLogHint] = useState<string | null>(null);
  // Week ribbon expander: collapsed to three slips until asked. Session
  // state only — the ribbon opens collapsed on every visit.
  const [weekExpanded, setWeekExpanded] = useState(false);
  // A failed first load is the only shelf-level error: the boards below
  // are per-card, so this line owns "nothing loaded at all" + the retry.
  const [loadError, setLoadError] = useState(false);
  // Operable checklist, derived from real data: each row links into the
  // work it names and ticks from state. Dismissal persists; ticks never do.
  const [loaded, setLoaded] = useState(false);
  const [hasPerson, setHasPerson] = useState(false);
  const [hasMarble, setHasMarble] = useState(false);
  const [openedJar, setOpenedJar] = useState(false);
  const [listDismissed, setListDismissed] = useState(() => readSeen("seen:checklist"));
  // First-marble note is session-only on purpose: the settle is the reward,
  // and it never follows the user across launches.
  const [firstNote, setFirstNote] = useState<{ id: string; name: string } | null>(null);
  const firstNoteShown = useRef(false);
  const addInputRef = useRef<TextInput>(null);
  const reasonInputRef = useRef<TextInput>(null);
  // Reduced motion removes the slide but keeps fades and state changes.
  const reduceMotion = useReducedMotion();

  const refresh = useCallback(async () => {
    try {
      setLoadError(false);
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
      // Checklist ticks read the unfiltered shelf, so typing in search can
      // never untick real progress.
      if (!q) {
        setHasPerson(rows.length > 0);
        setHasMarble(rows.some((r) => r.count > 0));
      }
      setOpenedJar(readSeen("seen:checklist-opened"));
      // Single-jar fast path only: exactly one jar is unambiguous, so it
      // stays preselected. With zero or many jars there is no silent
      // default — the composer keeps no target until a jar is tapped, and
      // logging without one raises the "A marble needs its jar" hint.
      if (rows.length === 1) {
        const only = rows[0];
        if (only && logPersonId !== only.id) setLogPersonId(only.id);
      } else if (!logPersonId || !rows.some((r) => r.id === logPersonId)) {
        setLogPersonId(null);
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
      // A failed load reads as failed, never as an empty shelf: the
      // empty component below swaps to the error line, retry on focus.
      setLoadError(true);
    }
    setLoaded(true);
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

  // A pending removal never touches the store until its window closes —
  // gone is gone locally, so Undo only ever cancels, never restores.
  // Abandoning the shelf (unmount) abandons the deletion, not the jar.
  useEffect(
    () => () => {
      for (const t of pendingTimers.current.values()) clearTimeout(t);
      pendingTimers.current.clear();
    },
    [],
  );

  // One shared tick for every queued countdown: a plain state step once a
  // second, no looped animation, so the time cue stays legible and still
  // under reduced motion.
  const hasPending = pendingRemoves.length > 0;
  useEffect(() => {
    if (!hasPending) return;
    const iv = setInterval(() => {
      setPendingRemoves((prev) =>
        prev.map((p) => ({ ...p, secsLeft: Math.max(0, p.secsLeft - 1) })),
      );
    }, 1000);
    return () => clearInterval(iv);
  }, [hasPending]);

  function dismissChecklist() {
    markSeen("seen:checklist");
    setListDismissed(true);
  }

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
      setLogHint("A marble needs its jar — add someone first, then log the moment here.");
      return;
    }
    if (!logReason.trim() || !logTag) {
      setLogHint(WHY_HINT);
      return;
    }
    const who = people.find((p) => p.id === logPersonId)?.name ?? "their";
    const wasFirstDrop = (people.find((p) => p.id === logPersonId)?.count ?? 0) === 0;
    const usedTag = logTag;
    // Logging to a jar mid-removal keeps it: the moment would otherwise
    // land in the store seconds before the timer deletes jar and all.
    const queued = pendingRemoves.find((p) => p.id === logPersonId);
    if (queued) cancelPendingRemove(queued.id);
    await addMarble(logPersonId, delta, logReason, usedTag);
    setLogReason("");
    // Soft default: keep the just-used tag selected and persist it, so the
    // next moment starts where the last one left off. The kept tag is a
    // fresh choice, not a carried default, so the mark clears. Tapping the
    // active pill still clears to untagged, and empty submits still hit
    // WHY_HINT.
    setLogTag(usedTag);
    setLogCarried(false);
    writeLastTag(usedTag);
    setLogHint(null);
    // The one diegetic focal: the first drop settles, once per session.
    if (wasFirstDrop && !firstNoteShown.current) {
      firstNoteShown.current = true;
      setFirstNote({ id: logPersonId, name: who });
    }
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
  async function finalizeRemove(id: string) {
    pendingTimers.current.delete(id);
    setPendingRemoves((prev) => prev.filter((p) => p.id !== id));
    try {
      await removePerson(id);
    } catch {
      setCardError({
        id,
        message: "Couldn't remove that jar — it's still on the shelf. Please try again.",
      });
      await refresh();
      return;
    }
    setCardError(null);
    await refresh();
  }
  function confirmRemove(row: Row) {
    // Queued, never flushed: a confirm that arrives while another waits
    // simply waits its own turn — each jar keeps its own Undo.
    if (pendingRemoves.some((p) => p.id === row.id)) {
      setConfirmingRemoveId(null);
      return;
    }
    setConfirmingRemoveId(null);
    setCardError(null);
    setPendingRemoves((prev) => [...prev, { id: row.id, name: row.name, secsLeft: 5 }]);
    const t = setTimeout(() => {
      void finalizeRemove(row.id);
    }, 5000);
    pendingTimers.current.set(row.id, t);
  }
  function cancelPendingRemove(id: string) {
    const t = pendingTimers.current.get(id);
    if (t) clearTimeout(t);
    pendingTimers.current.delete(id);
    setPendingRemoves((prev) => prev.filter((p) => p.id !== id));
  }

  const logPerson = useMemo(
    () => people.find((p) => p.id === logPersonId) ?? null,
    [people, logPersonId],
  );
  const q = query.trim();
  // Queued removals hide their rows without touching the store, so Undo
  // restores instantly from state — no refresh, nothing lost. The shelf
  // never flips mid-window: hidden rows simply stay hidden until each
  // window closes or is undone.
  const pendingIds = useMemo(() => new Set(pendingRemoves.map((p) => p.id)), [pendingRemoves]);
  const visiblePeople = hasPending ? people.filter((p) => !pendingIds.has(p.id)) : people;
  // A 0-jar user walks the add-person path first; everyone else keeps the
  // composer-first order of use. Gated on load so returning shelves don't flip.
  const isFirstRun = loaded && people.length === 0 && !q;
  // Footer home exists whenever there is anything to put in it: the week
  // ribbon, or the shelf tools on any shelf that already has jars.
  const showFoot = fresh.length > 0 || !isFirstRun;
  const stepDone = [hasPerson, hasMarble, openedJar];
  const allStepsDone = stepDone.every(Boolean);
  const showChecklist = loaded && !listDismissed;
  // Single tip slot: the checklist above is onboarding, never a tip, so it
  // always stands. Below it only one voice speaks at a time — the
  // first-marble payoff first, the quiet-week nudge only when the payoff
  // is gone. (The BRAVING guide inside the composer is mutually exclusive
  // by construction: it needs no marble yet, the quiet line needs marbles.)
  // Second visit, quiet week: one ghost line, no overlay, no coachmark.
  const quietWeek = loaded && people.length > 0 && fresh.length === 0 && hasMarble && !firstNote;

  // `flush` drops the band gap for the footer home, where the foot wrapper
  // already carries the separation from the last board.
  function renderAddRow(flush = false) {
    return (
      <View style={[s.addRow, flush && s.addFlush]}>
        <TextInput
          ref={addInputRef}
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
          hitSlop={6}
          style={({ pressed }) => [s.solidBtn, s.addBtn, pressed && s.pressed]}
        >
          <Text style={s.solidBtnText}>Add</Text>
        </Pressable>
      </View>
    );
  }

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
                      ? `Their ${item.count} ${item.count === 1 ? "marble" : "marbles"} — every reason and tag — go with them. They'll wait just off the shelf for a few moments in case you change your mind.`
                      : "Their jar is empty. They'll wait just off the shelf for a few moments in case you change your mind."}
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
      data={visiblePeople}
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

          {/* Operable checklist: each row links into the real work it
              names and ticks from shelf state. Once all three land it
              collapses to a rail; dismissal persists in seen:checklist. */}
          {showChecklist &&
            (allStepsDone ? (
              <Animated.View
                entering={reduceMotion ? undefined : FadeInDown.duration(420).easing(settleEase)}
              >
                <View
                  style={s.rail}
                  accessible
                  accessibilityLabel="All three beginnings done. The shelf is yours."
                >
                  <View style={[s.mark, s.markDone]} />
                  <Text style={s.railText}>All three done — the shelf is yours.</Text>
                  <Pressable
                    testID="checklist-dismiss"
                    nativeID="checklist-dismiss"
                    accessibilityRole="button"
                    accessibilityLabel="Dismiss the beginnings list"
                    onPress={dismissChecklist}
                    hitSlop={8}
                    style={({ pressed }) => [s.quietBtn, pressed && s.pressed]}
                  >
                    <Text style={s.quietBtnText}>Dismiss</Text>
                  </Pressable>
                </View>
              </Animated.View>
            ) : (
              <Animated.View
                entering={reduceMotion ? undefined : FadeInDown.duration(420).easing(settleEase)}
              >
                <View
                  style={s.check}
                  accessible
                  accessibilityLabel={`Begin here, ${stepDone.filter(Boolean).length} of 3 done`}
                >
                  <Text style={s.checkTitle}>Begin here</Text>
                  <Pressable
                    testID="checklist-step-add"
                    nativeID="checklist-step-add"
                    accessibilityRole="button"
                    accessibilityLabel={
                      hasPerson ? "Add someone, done" : "Add someone. Focus the name field"
                    }
                    onPress={() => addInputRef.current?.focus()}
                    hitSlop={6}
                    style={({ pressed }) => [s.checkRow, pressed && s.pressed]}
                  >
                    <View style={[s.mark, hasPerson && s.markDone]} />
                    <Text style={[s.checkText, hasPerson && s.checkTextDone]}>
                      Add someone to the shelf
                    </Text>
                  </Pressable>
                  <Pressable
                    testID="checklist-step-log"
                    nativeID="checklist-step-log"
                    accessibilityRole="button"
                    accessibilityLabel={
                      hasMarble
                        ? "Log a moment with its why, done"
                        : "Log a moment with its why. Focus the composer"
                    }
                    onPress={() => reasonInputRef.current?.focus()}
                    hitSlop={6}
                    style={({ pressed }) => [s.checkRow, pressed && s.pressed]}
                  >
                    <View style={[s.mark, hasMarble && s.markDone]} />
                    <Text style={[s.checkText, hasMarble && s.checkTextDone]}>
                      Log a moment with its why
                    </Text>
                  </Pressable>
                  {people.length > 0 && people[0] ? (
                    <Link href={{ pathname: "/person/[id]", params: { id: people[0].id } }} asChild>
                      <Pressable
                        testID="checklist-step-open"
                        nativeID="checklist-step-open"
                        accessibilityRole="button"
                        accessibilityLabel={
                          openedJar
                            ? "Open the jar and sit with it, done"
                            : `Open the jar and sit with it. Open ${people[0].name}'s jar`
                        }
                        hitSlop={6}
                        style={({ pressed }) => [s.checkRow, pressed && s.pressed]}
                      >
                        <View style={[s.mark, openedJar && s.markDone]} />
                        <Text style={[s.checkText, openedJar && s.checkTextDone]}>
                          Open the jar and sit with it
                        </Text>
                      </Pressable>
                    </Link>
                  ) : (
                    <View style={s.checkRow} accessible accessibilityLabel="Open the jar, waiting">
                      <View style={s.mark} />
                      <Text style={s.checkText}>Open the jar and sit with it</Text>
                    </View>
                  )}
                  <Pressable
                    testID="checklist-dismiss"
                    nativeID="checklist-dismiss"
                    accessibilityRole="button"
                    accessibilityLabel="Dismiss the beginnings list"
                    onPress={dismissChecklist}
                    hitSlop={8}
                    style={({ pressed }) => [s.checkDismiss, pressed && s.pressed]}
                  >
                    <Text style={s.quietBtnText}>Dismiss</Text>
                  </Pressable>
                </View>
              </Animated.View>
            ))}

          {/* First run: the composer rests as a two-line preview — title
              plus one line. The add row keeps its single home above search;
              nothing here takes input, so the happy path can never fail
              with "add someone first". Once a jar lands it opens with the
              settle ease. */}
          {isFirstRun ? (
            <View
              style={s.composer}
              testID="composer-preview"
              nativeID="composer-preview"
              accessible
              accessibilityLabel="Log a moment. First, add someone below — then this composer logs the moment."
            >
              <Text style={s.composerTitle}>Log a moment</Text>
              <Text style={s.firstPath}>
                First, add someone below — then this composer logs the moment.
              </Text>
            </View>
          ) : (
            <Animated.View
              key="composer-live"
              entering={reduceMotion ? undefined : FadeInDown.duration(420).easing(settleEase)}
              style={s.composer}
            >
              <Text style={s.composerTitle}>Log a moment</Text>
              {people.length > 0 ? (
                <View style={s.pickerRow}>
                  {people.map((p) => {
                    const on = p.id === logPersonId;
                    return (
                      <Pressable
                        key={p.id}
                        testID={`quick-pick-${p.id}`}
                        nativeID={`quick-pick-${p.id}`}
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
                ref={reasonInputRef}
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
              <Text style={s.fieldLabel}>BRAVING tag</Text>
              {!logTag && !hasMarble && <Text style={s.guideLine}>{BRAVING_GUIDE}</Text>}
              <TagField
                value={logTag}
                onChange={(t) => {
                  setLogTag(t);
                  setLogCarried(false);
                  setLogHint(null);
                }}
                glosses={TAG_GLOSSES}
                idPrefix="quick-tag-"
                carried={!!logTag && logCarried}
              />
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
              {/* Validation arrives as a plain fade: opacity-only feedback,
                  so it stays even with reduced motion. */}
              {!!logHint && (
                <Animated.View entering={FadeIn.duration(150)}>
                  <Text
                    testID="quick-hint"
                    nativeID="quick-hint"
                    style={s.hint}
                    accessibilityRole="alert"
                  >
                    {logHint}
                  </Text>
                </Animated.View>
              )}
            </Animated.View>
          )}

          {/* Second visit, quiet week: one ghost line pointing at the
              composer — the single dominant flow stays silent otherwise. */}
          {quietWeek && (
            <Text style={s.quietLine} accessible accessibilityLabel="Quiet this week">
              Quiet this week — the composer above is the way back in.
            </Text>
          )}

          {/* First run only: the add row keeps its pre-jar home above the
              bare-shelf sentence, so the newcomer path never hunts. Every
              other shelf meets add → search → sort after the jars. */}
          {isFirstRun && renderAddRow()}

          {/* The payoff beat: a slower settle (the focal entrance) and a
              quick fade out, so opening the jar feels continuous. */}
          {firstNote && (
            <Animated.View
              entering={reduceMotion ? undefined : FadeInDown.duration(600).easing(settleEase)}
              exiting={reduceMotion ? undefined : FadeOut.duration(180)}
            >
              <View
                style={s.firstNote}
                accessible
                accessibilityLabel={`First marble in ${firstNote.name}'s jar`}
              >
                <Text style={s.firstNoteText}>
                  First marble in {firstNote.name}’s jar — open it to see the dots answer how you’re
                  doing.
                </Text>
                <View style={s.firstNoteRow}>
                  <Link href={{ pathname: "/person/[id]", params: { id: firstNote.id } }} asChild>
                    <Pressable
                      testID="first-note-open"
                      nativeID="first-note-open"
                      accessibilityRole="button"
                      accessibilityLabel={`Open ${firstNote.name}'s jar`}
                      onPress={() => setFirstNote(null)}
                      hitSlop={8}
                      style={({ pressed }) => [s.noteOpen, pressed && s.pressed]}
                    >
                      <Text style={s.noteOpenText}>Open the jar</Text>
                    </Pressable>
                  </Link>
                  <Pressable
                    testID="first-note-dismiss"
                    nativeID="first-note-dismiss"
                    accessibilityRole="button"
                    accessibilityLabel="Dismiss"
                    onPress={() => setFirstNote(null)}
                    hitSlop={8}
                    style={({ pressed }) => [s.quietBtn, pressed && s.pressed]}
                  >
                    <Text style={s.quietBtnText}>Dismiss</Text>
                  </Pressable>
                </View>
              </View>
            </Animated.View>
          )}

          {/* Shelf tools (search, sort) live in the footer home, after the
              jars — the header ends on the transient rows above. */}

          {/* Quiet undo, one row per waiting jar: each jar is only hidden,
              never deleted, until its own window closes — Undo cancels so
              no delete ever happens. The countdown is a plain state step
              (text + still bar), never a looped animation. */}
          {hasPending && (
            <Animated.View
              entering={reduceMotion ? undefined : FadeInDown.duration(420).easing(settleEase)}
            >
              <View style={s.undoList} testID="remove-undo" nativeID="remove-undo">
                {pendingRemoves.map((p) => {
                  const single = pendingRemoves.length === 1;
                  const secs = Math.max(0, p.secsLeft);
                  return (
                    <View
                      key={p.id}
                      style={s.undoRow}
                      testID={single ? undefined : `remove-undo-${p.id}`}
                      nativeID={single ? undefined : `remove-undo-${p.id}`}
                      accessible
                      accessibilityRole="alert"
                      accessibilityLabel={`${p.name} is leaving the shelf. Undo is available for ${secs} more seconds.`}
                    >
                      <View style={s.undoTop}>
                        <Text style={s.undoText} numberOfLines={1}>
                          Leaving the shelf — {p.name} ·{" "}
                          <Text
                            testID={
                              single ? "remove-undo-countdown" : `remove-undo-countdown-${p.id}`
                            }
                            nativeID={
                              single ? "remove-undo-countdown" : `remove-undo-countdown-${p.id}`
                            }
                            style={s.undoSecs}
                          >
                            Undo within {secs}s
                          </Text>
                        </Text>
                        <Pressable
                          testID={single ? "remove-undo-button" : `remove-undo-button-${p.id}`}
                          nativeID={single ? "remove-undo-button" : `remove-undo-button-${p.id}`}
                          accessibilityRole="button"
                          accessibilityLabel={`Undo removing ${p.name}`}
                          onPress={() => cancelPendingRemove(p.id)}
                          hitSlop={8}
                          style={({ pressed }) => [s.quietBtn, pressed && s.pressed]}
                        >
                          <Text style={s.undoAction}>Undo</Text>
                        </Pressable>
                      </View>
                      <View style={s.undoTrack}>
                        <View style={[s.undoFill, { width: `${(secs / 5) * 100}%` }]} />
                      </View>
                    </View>
                  );
                })}
              </View>
            </Animated.View>
          )}
        </View>
      }
      ListFooterComponent={
        !showFoot ? null : (
          <View style={s.foot}>
            {/* Reflection after the object: the week's ribbon opens at three
                slips, the rest behind "Show the week". */}
            {fresh.length > 0 && (
              <View style={[s.week, s.weekFoot]}>
                <Text style={s.weekTitle}>This week on the shelf</Text>
                {(weekExpanded ? fresh : fresh.slice(0, 3)).map(({ marble, name: who }) => (
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
                {fresh.length > 3 && (
                  <Pressable
                    testID="week-toggle"
                    nativeID="week-toggle"
                    accessibilityRole="button"
                    accessibilityLabel={weekExpanded ? "Show less" : "Show the week"}
                    accessibilityState={{ expanded: weekExpanded }}
                    onPress={() => setWeekExpanded((v) => !v)}
                    hitSlop={6}
                    style={({ pressed }) => [s.weekToggle, pressed && s.pressed]}
                  >
                    <Text style={s.quietBtnText}>
                      {weekExpanded ? "Show less" : "Show the week"}
                    </Text>
                  </Pressable>
                )}
              </View>
            )}

            {/* Shelf tools after the jars: add → search → sort. */}
            {!isFirstRun && renderAddRow(fresh.length === 0)}

            {/* Search stays hidden until the first jar lands. */}
            {!isFirstRun && (
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
            )}
            {people.length > 0 || q ? (
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
                      hitSlop={6}
                      style={({ pressed }) => [s.sort, on && s.sortOn, pressed && s.pressed]}
                    >
                      <Text style={[s.sortText, on && s.sortTextOn]}>{o.short}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </View>
        )
      }
      ListEmptyComponent={
        // Before the first load lands, one quiet line — never the
        // bare-shelf sentence, which must not flash over jars that are still
        // arriving. A failed load reads as failed, with the retry right
        // where empty would be.
        !loaded ? (
          <Text testID="loading-line" nativeID="loading-line" style={s.empty}>
            Loading…
          </Text>
        ) : loadError && visiblePeople.length === 0 ? (
          <View style={s.loadFail}>
            <Text
              testID="load-error"
              nativeID="load-error"
              accessibilityRole="alert"
              style={s.error}
            >
              The shelf wouldn&apos;t load. Nothing was lost.
            </Text>
            <Pressable
              testID="load-retry"
              nativeID="load-retry"
              accessibilityRole="button"
              accessibilityLabel="Try loading the shelf again"
              onPress={() => refresh()}
              hitSlop={8}
              style={({ pressed }) => [s.quietBtn, pressed && s.pressed]}
            >
              <Text style={s.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : q ? (
          <Text testID="empty-state" nativeID="empty-state" style={s.empty}>
            No jars match “{q}”. Try another name.
          </Text>
        ) : (
          // The bare shelf is the task: one sentence, with the add row above
          // as its only call to action.
          <Text testID="empty-state" nativeID="empty-state" style={s.empty}>
            The shelf is bare. Start a jar with a name — the first marble is a small kept promise
            away.
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
    boxShadow: "0px 6px 16px rgba(0, 0, 0, 0.4)",
    elevation: 4,
  },
  composerTitle: { fontFamily: Font.display, fontSize: 22, color: Lamp.ink },
  firstPath: {
    fontFamily: Font.body,
    fontSize: 13.5,
    lineHeight: 19,
    color: Lamp.inkSoft,
    marginTop: 8,
  },
  guideLine: {
    fontFamily: Font.body,
    fontSize: 13,
    lineHeight: 18,
    color: Lamp.inkSoft,
    marginBottom: 8,
  },
  fieldLabel: {
    fontFamily: Font.bodySemi,
    fontWeight: "600",
    fontSize: 13.5,
    color: Lamp.inkSoft,
    marginTop: 12,
    marginBottom: 8,
  },
  check: {
    backgroundColor: Lamp.board,
    borderWidth: 1,
    borderColor: Lamp.hairline,
    borderRadius: 20,
    padding: 16,
    marginTop: 12,
    boxShadow: "0px 6px 16px rgba(0, 0, 0, 0.4)",
    elevation: 4,
  },
  checkTitle: { fontFamily: Font.display, fontSize: 22, color: Lamp.ink },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 12 },
  checkText: { fontFamily: Font.body, fontSize: 14, lineHeight: 20, color: Lamp.inkSoft, flex: 1 },
  checkTextDone: { color: Lamp.inkFaint },
  checkDismiss: { alignSelf: "flex-start", marginTop: 12 },
  mark: {
    width: 15,
    height: 15,
    borderRadius: 7.5,
    borderWidth: 1.5,
    borderColor: Lamp.empty,
    backgroundColor: "transparent",
  },
  markDone: { backgroundColor: Lamp.ink, borderColor: Lamp.ink },
  rail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Lamp.board,
    borderWidth: 1,
    borderColor: Lamp.hairline,
    borderRadius: 99,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 12,
  },
  railText: {
    fontFamily: Font.body,
    fontSize: 13.5,
    color: Lamp.inkSoft,
    flex: 1,
  },
  quietLine: {
    fontFamily: Font.body,
    fontSize: 13.5,
    lineHeight: 19,
    color: Lamp.inkFaint,
    marginTop: 14,
    textAlign: "center",
  },
  undoList: { gap: 8, marginTop: 10 },
  undoRow: {
    backgroundColor: Lamp.board,
    borderWidth: 1,
    borderColor: Lamp.hairline,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  undoTop: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 },
  undoTrack: {
    height: 2,
    borderRadius: 99,
    backgroundColor: Lamp.empty,
    marginTop: 8,
    overflow: "hidden",
  },
  undoFill: { height: 2, borderRadius: 99, backgroundColor: Lamp.inkFaint },
  undoSecs: { fontFamily: Font.bodySemi, fontWeight: "600", color: Lamp.inkSoft },
  undoText: {
    fontFamily: Font.body,
    fontSize: 13.5,
    lineHeight: 19,
    color: Lamp.inkSoft,
    flexShrink: 1,
  },
  undoAction: {
    fontFamily: Font.bodySemi,
    fontWeight: "600",
    fontSize: 13.5,
    color: Lamp.ink,
  },
  noteOpen: {
    backgroundColor: Lamp.ink,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 22,
  },
  noteOpenText: { color: Lamp.ground, fontFamily: Font.bodyBold, fontWeight: "700", fontSize: 15 },
  firstNote: {
    backgroundColor: Lamp.board,
    borderWidth: 1,
    borderColor: Lamp.hairline,
    borderRadius: 20,
    padding: 16,
    marginTop: 14,
  },
  firstNoteText: {
    fontFamily: Font.body,
    fontSize: 14,
    lineHeight: 20,
    color: Lamp.inkSoft,
  },
  firstNoteRow: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 12 },
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
  weekToggle: { alignSelf: "flex-start", marginTop: 2, paddingVertical: 8, paddingHorizontal: 6 },
  // Footer home: one band gap below the last board, then flush first
  // children — the inner bands keep their own rhythm from there.
  foot: { marginTop: 8 },
  weekFoot: { marginTop: 0 },
  addRow: { flexDirection: "row", gap: 10, marginTop: 22, alignItems: "center" },
  addFlush: { marginTop: 0 },
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
    boxShadow: "0px 5px 14px rgba(0, 0, 0, 0.4)",
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
  loadFail: { alignItems: "center", marginTop: 26, gap: 4 },
  retryText: {
    fontFamily: Font.bodySemi,
    fontWeight: "600",
    fontSize: 14.5,
    color: Lamp.ink,
  },
  pressed: { opacity: 0.75 },
});
