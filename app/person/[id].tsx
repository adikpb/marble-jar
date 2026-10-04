// The jar room: one person's trust, sitting in lamplight. The vessel fills
// with real marble glass, the weeks read as a staff, every moment a slip.
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, {
  Easing,
  FadeInDown,
  FadeOut,
  useReducedMotion,
  ZoomIn,
} from "react-native-reanimated";
import { MarbleDots, Slip, TagField } from "../../components/lamplight";
import { BRAVING_GUIDE, TAG_GLOSSES, WHY_HINT } from "../../constants/braving";
import { Font, Lamp } from "../../constants/lamplight";
import {
  addMarble,
  BRAVING_TAGS,
  type Chapter,
  getChapters,
  getJarStats,
  getLiveChapter,
  getPerson,
  getTagBreakdown,
  getWeeklyTrend,
  JAR_CAPACITY,
  listMarbles,
  type Marble,
  type Person,
  removeMarble,
  startOfWeek,
  type TagBreakdownRow,
  tagHue,
  updateMarble,
  type WeeklyTrendPoint,
} from "../../lib/store";

const PAGE_SIZE = 20;
const TREND_WEEKS_SHOWN = 8;

// One ease for every arrival: a quick rise that settles, never springs.
// Spatial entrances use it; exits are always shorter so leaving feels instant.
const settleEase = Easing.bezier(0.16, 1, 0.3, 1);

// Seen flags live in localStorage on web and fall back to show-again on
// native, where there is no shared web storage. Guarded so neither
// platform can crash on the other's storage.
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
    // private mode: the tip simply shows again next cold start
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

// The web locator: the native stack header is hidden on web, so the
// back chevron + "Jar" it carried live here instead — ground, ink,
// 19px Bricolage, the same typographic ‹. Not a kicker: it is the
// header, and the display name below stays the headline.
function JarWebHeader({ onBack }: { onBack: () => void }) {
  return (
    <View style={s.webHeader} accessible accessibilityLabel="Jar">
      <Pressable
        testID="jar-back"
        nativeID="jar-back"
        accessibilityRole="button"
        accessibilityLabel="Back to jars"
        onPress={onBack}
        hitSlop={12}
        style={({ pressed }) => [s.backBtn, pressed && s.pressed]}
      >
        <Text style={s.backChev}>‹</Text>
      </Pressable>
      <Text style={s.webTitle} accessibilityRole="header">
        Jar
      </Text>
    </View>
  );
}

function weekLabel(weekStart: number): string {
  const d = new Date(weekStart);
  const thisYear = new Date().getFullYear();
  const base = d.toLocaleDateString(undefined, { month: "long", day: "numeric" });
  return d.getFullYear() === thisYear ? `Week of ${base}` : `Week of ${base}, ${d.getFullYear()}`;
}

function dayLabel(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function PersonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const personId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }

  const [person, setPerson] = useState<Person | null>(null);
  const [marbles, setMarbles] = useState<Marble[]>([]);
  const [count, setCount] = useState(0);
  const [pct, setPct] = useState(0);
  const [reason, setReason] = useState("");
  const [tag, setTag] = useState<string>(() => readLastTag());
  // Whether the jar composer tag arrived carried from seen:last-tag rather
  // than from a tap. Clears on the first tap or log so the gloss mark can't
  // linger on a fresh choice.
  const [tagCarried, setTagCarried] = useState(() => readLastTag() !== "");
  const [formHint, setFormHint] = useState<string | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [live, setLive] = useState<Chapter | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [trend, setTrend] = useState<WeeklyTrendPoint[]>([]);
  const [breakdown, setBreakdown] = useState<TagBreakdownRow[]>([]);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [hasMore, setHasMore] = useState(false);
  // Per-marble correction: one slip edits at a time — words, tag, and the
  // kept/broke mark (a flip arms first, then confirms with a second tap).
  // Blank-only "add the why" repair is gone: every slip is fully editable,
  // so a wrong tap never needs an offsetting marble to fix it.
  const [editingMarbleId, setEditingMarbleId] = useState<string | null>(null);
  const [editReason, setEditReason] = useState("");
  const [editTag, setEditTag] = useState("");
  const [editDelta, setEditDelta] = useState<1 | -1>(1);
  const [flipArmed, setFlipArmed] = useState(false);
  // The edit card speaks like the composers: an empty save raises the
  // shared why line instead of returning silently.
  const [editHint, setEditHint] = useState<string | null>(null);
  // Per-marble removal reuses the shelf's idiom: a confirmed slip waits its
  // own 5s window off the feed before the store is touched, so Undo only
  // ever cancels. Unmount abandons the wait, not the marble.
  const [pendingMarbles, setPendingMarbles] = useState<{ id: string; secsLeft: number }[]>([]);
  const marbleTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const [revision, setRevision] = useState(0);
  const [justLogged, setJustLogged] = useState<string | null>(null);
  // First fetch still in flight: empties stay quiet until the jar answers,
  // so "nothing logged yet" can never flash over arriving moments — and a
  // jar that answers "nobody here" gets the not-found screen, not "Loading…".
  const [hydrated, setHydrated] = useState(false);
  // Contextual tips: taught once, at the point of use, never twice. The
  // jar tip owns its own key — it used to share one with the shelf's
  // first-marble note, so dismissing either dismissed both.
  const [jarTipDismissed, setJarTipDismissed] = useState(() => readSeen("seen:jar-tip"));
  // Seven-meanings expander: the guide retires once a tagged marble exists,
  // so this quiet line keeps all seven glosses one tap away in the composer.
  // Collapsed by default; plain conditional render, no motion.
  const [meaningsOpen, setMeaningsOpen] = useState(false);
  // Reduced motion removes the slide but keeps fades and state changes.
  const reduceMotion = useReducedMotion();
  // The composer's stable entry at the top of the room: focusing the reason
  // field scrolls it into view on every platform (native scrolls to focused
  // inputs; web moves DOM focus into view), so a task visit never scrolls
  // past vessel + chapters + trend to act.
  const scrollRef = useRef<ScrollView>(null);
  const reasonRef = useRef<TextInput>(null);
  function jumpToComposer() {
    reasonRef.current?.focus();
  }

  const selected: Chapter | null = selectedId
    ? (chapters.find((c) => c.id === selectedId) ?? live)
    : live;
  const viewingPast = !!selected && !!live && selected.id !== live.id;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      void revision;
      if (!personId) return;
      const p = await getPerson(personId).catch(() => null);
      if (cancelled) return;
      setPerson(p);
      if (!p) return;
      const [chaps, liveChapter] = await Promise.all([
        getChapters(personId),
        getLiveChapter(personId),
      ]).catch(() => [null, null] as const);
      if (cancelled || !chaps || !liveChapter) return;
      setChapters(chaps);
      setLive(liveChapter);
      const sel = selectedId
        ? (chaps.find((c) => c.id === selectedId) ?? liveChapter)
        : liveChapter;
      if (!sel) return;
      const [stats, page, tr, bd] = await Promise.all([
        getJarStats(personId, sel.id),
        listMarbles(personId, { chapterId: sel.id, limit: limit + 1, offset: 0 }),
        getWeeklyTrend(personId),
        getTagBreakdown(personId, sel.id),
      ]).catch(() => [null, null, null, null] as const);
      if (cancelled || !stats || !page || !tr || !bd) return;
      setCount(stats.count);
      setPct(stats.pct);
      setMarbles(page.slice(0, limit));
      setHasMore(page.length > limit);
      setTrend(tr);
      setBreakdown(bd);
    })()
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, [personId, selectedId, limit, revision]);

  // Opening a jar is real work — the shelf checklist ticks from this
  // trace, set once per jar rather than on every refresh.
  useEffect(() => {
    if (personId) markSeen("seen:checklist-opened");
  }, [personId]);

  // A pending marble removal never touches the store until its window
  // closes. Unmount abandons the wait, not the marble.
  useEffect(
    () => () => {
      for (const t of marbleTimers.current.values()) clearTimeout(t);
      marbleTimers.current.clear();
    },
    [],
  );

  // One shared tick for every queued marble countdown: a plain state step
  // once a second, no looped animation.
  const hasPendingMarbles = pendingMarbles.length > 0;
  useEffect(() => {
    if (!hasPendingMarbles) return;
    const iv = setInterval(() => {
      setPendingMarbles((prev) =>
        prev.map((p) => ({ ...p, secsLeft: Math.max(0, p.secsLeft - 1) })),
      );
    }, 1000);
    return () => clearInterval(iv);
  }, [hasPendingMarbles]);

  async function handleDelta(delta: 1 | -1) {
    if (!personId) return;
    if (!reason.trim() || !tag) {
      setFormHint(WHY_HINT);
      return;
    }
    const usedTag = tag;
    const m = await addMarble(personId, delta, reason, usedTag);
    setReason("");
    // Soft default: keep the just-used tag selected and persist it, so the
    // next moment starts where the last one left off. The kept tag is a
    // fresh choice, not a carried default, so the mark clears. Tapping the
    // active pill still clears to untagged, and empty submits still hit
    // WHY_HINT.
    setTag(usedTag);
    setTagCarried(false);
    writeLastTag(usedTag);
    setFormHint(null);
    setJustLogged(m.id);
    // The first-marble tip has served its purpose once a marble exists.
    markSeen("seen:jar-tip");
    setJarTipDismissed(true);
    setLimit(PAGE_SIZE);
    setRevision((r) => r + 1);
  }

  function dismissJarTip() {
    markSeen("seen:jar-tip");
    setJarTipDismissed(true);
  }

  function selectChapter(chapterId: string) {
    setSelectedId(chapterId);
    setLimit(PAGE_SIZE);
    setEditingMarbleId(null);
    setJustLogged(null);
    setRevision((r) => r + 1);
  }

  function openEditor(m: Marble) {
    setEditingMarbleId(m.id);
    setEditReason(m.reason);
    setEditTag(m.bravingTag.trim());
    setEditDelta(m.delta);
    setFlipArmed(false);
    setEditHint(null);
  }

  function cancelEditor() {
    setEditingMarbleId(null);
    setEditHint(null);
    setFlipArmed(false);
  }

  // The kept/broke flip arms on the first tap and lands on the second, so a
  // slip's whole meaning can't change under one stray tap. Tapping the side
  // the marble already stands on disarms.
  function tapFlip(next: 1 | -1, current: 1 | -1) {
    if (next === current) {
      setEditDelta(current);
      setFlipArmed(false);
      return;
    }
    if (flipArmed && editDelta === next) {
      setFlipArmed(false);
      return;
    }
    setEditDelta(next);
    setFlipArmed(true);
  }

  async function saveEditor(m: Marble) {
    if (!editReason.trim() || !editTag) {
      setEditHint(WHY_HINT);
      return;
    }
    await updateMarble(m.id, { reason: editReason, bravingTag: editTag, delta: editDelta });
    setEditingMarbleId(null);
    setEditHint(null);
    setFlipArmed(false);
    setRevision((r) => r + 1);
  }

  async function finalizeMarbleRemove(id: string) {
    marbleTimers.current.delete(id);
    setPendingMarbles((prev) => prev.filter((p) => p.id !== id));
    await removeMarble(id).catch(() => undefined);
    setRevision((r) => r + 1);
  }

  function requestMarbleRemove(id: string) {
    if (pendingMarbles.some((p) => p.id === id)) return;
    if (editingMarbleId === id) setEditingMarbleId(null);
    setPendingMarbles((prev) => [...prev, { id, secsLeft: 5 }]);
    const t = setTimeout(() => {
      void finalizeMarbleRemove(id);
    }, 5000);
    marbleTimers.current.set(id, t);
  }

  function cancelMarbleRemove(id: string) {
    const t = marbleTimers.current.get(id);
    if (t) clearTimeout(t);
    marbleTimers.current.delete(id);
    setPendingMarbles((prev) => prev.filter((p) => p.id !== id));
  }

  const jarPct = Math.round(pct * 100);
  // Oldest-first glass for the vessel: the pile grows from the bottom up.
  const glassOldestFirst: string[] = [...marbles].reverse().map((m) => tagHue(m.bravingTag));
  while (glassOldestFirst.length < count) glassOldestFirst.unshift(Lamp.honey);

  const bars = trend.slice(-TREND_WEEKS_SHOWN);
  const activeWeeks = bars.filter((w) => w.count !== 0).length;
  const showBars = activeWeeks >= 2;
  const maxAbs = Math.max(1, ...bars.map((w) => Math.abs(w.count)));

  const splitRows = [...BRAVING_TAGS.map((t) => breakdown.find((r) => r.tag === t) ?? null)]
    .concat([breakdown.find((r) => !BRAVING_TAGS.includes(r.tag as never)) ?? null])
    .filter((r): r is TagBreakdownRow => !!r && r.added + r.removed > 0);

  // The explainer retires only once a tagged marble exists — not on jar
  // creation — so fast jar-adders still meet BRAVING. Covers the paged
  // feed via the breakdown fallback.
  const hasTaggedMarble =
    marbles.some((m) => m.bravingTag.trim().length > 0) ||
    breakdown.some((r) => r.added + r.removed > 0);
  // The first-marble payoff stands alone: it speaks right after the
  // marble lands, while there is still only one moment in the jar. (The old
  // answer reassurance is gone — both stores map empty tags to the
  // "Untagged" label, so the split always has rows once marbles exist and
  // its gate could never open. Stored dismissal values are left untouched.)
  const firstInActive = !!justLogged && marbles.length === 1;

  const groups: { weekStart: number; items: Marble[] }[] = [];
  for (const m of marbles) {
    const ws = startOfWeek(m.ts);
    const last = groups[groups.length - 1];
    if (last && last.weekStart === ws) last.items.push(m);
    else groups.push({ weekStart: ws, items: [m] });
  }

  // Loading owns one quiet line — none of the empty states below may show
  // until the jar has answered. A missing jar gets the not-found screen:
  // a 20px display line, one honest sentence, and the way back.
  if (!hydrated) {
    return (
      <ScrollView
        style={s.page}
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
      >
        {Platform.OS === "web" && <JarWebHeader onBack={goBack} />}
        <Text testID="loading-line" nativeID="loading-line" style={s.muted}>
          Loading…
        </Text>
      </ScrollView>
    );
  }
  if (!person) {
    return (
      <ScrollView
        style={s.page}
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
      >
        {Platform.OS === "web" && <JarWebHeader onBack={goBack} />}
        <Text style={s.missingTitle} accessibilityRole="header">
          No jar here
        </Text>
        <Text style={s.missingBody}>
          This jar isn&apos;t on the shelf. It may have been removed — the shelf still holds the
          rest.
        </Text>
        <Pressable
          testID="missing-back"
          nativeID="missing-back"
          accessibilityRole="button"
          accessibilityLabel="Back to jars"
          onPress={goBack}
          hitSlop={8}
          style={({ pressed }) => [s.missingBack, pressed && s.pressed]}
        >
          <Text style={s.missingBackText}>‹ Back to jars</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      ref={scrollRef}
      style={s.page}
      contentContainerStyle={s.content}
      keyboardShouldPersistTaps="handled"
    >
      <Stack.Screen
        options={{
          headerLeft: () => (
            <Pressable
              testID="jar-back"
              nativeID="jar-back"
              accessibilityRole="button"
              accessibilityLabel="Back to jars"
              onPress={goBack}
              hitSlop={12}
              style={({ pressed }) => [s.backBtn, pressed && s.pressed]}
            >
              <Text style={s.backChev}>‹</Text>
            </Pressable>
          ),
        }}
      />
      {Platform.OS === "web" && <JarWebHeader onBack={goBack} />}
      <Text style={s.name} accessibilityRole="header">
        {person.name}
      </Text>
      <Text
        testID="jar-count"
        nativeID="jar-count"
        style={s.count}
        accessibilityLabel={`${count} of ${JAR_CAPACITY} marbles`}
      >
        {count} of {JAR_CAPACITY} marbles · {jarPct}%
      </Text>
      {/* The composer's stable home at the top of the room: one entry that
          never moves with scroll depth, jumping straight to the log form
          below the trend. Hidden while revisiting a closed chapter, where
          nothing can be added. */}
      {!viewingPast && (
        <Pressable
          testID="jump-to-composer"
          nativeID="jump-to-composer"
          accessibilityRole="button"
          accessibilityLabel="Log a moment. Jump to the composer."
          accessibilityHint="Moves focus to the log form below"
          onPress={jumpToComposer}
          hitSlop={6}
          style={({ pressed }) => [s.jump, pressed && s.pressed]}
        >
          <Text style={s.jumpText}>Log a moment</Text>
        </Pressable>
      )}

      <View style={s.vesselWrap}>
        <View style={s.vessel} accessible accessibilityLabel={`Jar ${jarPct} percent full`}>
          <View style={s.vesselNeck} />
          <View style={s.vesselDots}>
            <MarbleDots count={count} hues={[...glassOldestFirst].reverse()} size={21} bottomUp />
          </View>
        </View>
        <Text style={s.vesselHint}>
          {count <= 0
            ? "Empty jar — every marble starts with a small kept promise. Log it below: a few words and one tag."
            : count >= JAR_CAPACITY
              ? "A full jar. That's deep trust — keep tending it."
              : `${JAR_CAPACITY - count} marbles to a full jar.`}
        </Text>
      </View>

      {selected && (
        <View style={s.chapters}>
          <Text style={s.chapterLine}>
            Jar no. {selected.index + 1}
            {viewingPast ? " · closed" : " · collecting"}
          </Text>
          {chapters.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.chapterStrip}
            >
              {[...chapters]
                .sort((a, b) => a.index - b.index)
                .map((c) => {
                  const active = selected.id === c.id;
                  const isLive = !!live && c.id === live.id;
                  return (
                    <Pressable
                      key={c.id}
                      testID={`chapter-${c.index + 1}`}
                      nativeID={`chapter-${c.index + 1}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={
                        isLive
                          ? `View live jar number ${c.index + 1}`
                          : `Revisit jar number ${c.index + 1}, closed with ${c.finalCount} marbles`
                      }
                      onPress={() => selectChapter(c.id)}
                      style={({ pressed }) => [
                        s.chapterPill,
                        active && s.chapterPillActive,
                        pressed && s.pressed,
                      ]}
                    >
                      <Text style={[s.chapterPillText, active && s.chapterPillTextActive]}>
                        {isLive
                          ? `No. ${c.index + 1} · live`
                          : `No. ${c.index + 1} · ${c.finalCount}`}
                      </Text>
                    </Pressable>
                  );
                })}
            </ScrollView>
          )}
          {viewingPast && (
            <View
              testID="chapter-banner"
              nativeID="chapter-banner"
              style={s.chapterBanner}
              accessible
              accessibilityLabel={`Jar number ${selected.index + 1} is closed. Revisiting for reflection only.`}
            >
              <Text style={s.chapterBannerText}>
                Jar no. {selected.index + 1} closed with {selected.finalCount}{" "}
                {selected.finalCount === 1 ? "marble" : "marbles"}
                {selected.finalCount >= JAR_CAPACITY
                  ? " — a full jar of trust. Worth sitting with."
                  : "."}{" "}
                Revisiting for reflection — nothing can be added here.
              </Text>
            </View>
          )}
        </View>
      )}

      <Text style={s.section}>How the weeks read</Text>
      <View
        testID="trends"
        nativeID="trends"
        style={s.trendBoard}
        accessible
        accessibilityLabel={
          showBars
            ? `Trust trend over recent weeks, ${activeWeeks} active weeks`
            : "Not enough trend data yet"
        }
      >
        {showBars ? (
          <View style={s.bars} testID="weekly-bars" nativeID="weekly-bars">
            {bars.map((w) => {
              const positive = w.count > 0;
              const h =
                w.count === 0 ? 4 : Math.max(10, Math.round((Math.abs(w.count) / maxAbs) * 96));
              const date = new Date(w.weekStart).toLocaleDateString(undefined, {
                month: "numeric",
                day: "numeric",
              });
              return (
                <View
                  key={w.weekStart}
                  style={s.barCol}
                  accessible
                  accessibilityLabel={`Week of ${date}: ${w.count} marbles`}
                >
                  <View
                    style={[
                      s.bar,
                      { height: h },
                      positive ? s.barUp : s.barDown,
                      w.count === 0 && s.barZero,
                    ]}
                  />
                  <Text style={s.barLabel}>{date}</Text>
                </View>
              );
            })}
          </View>
        ) : (
          <Text testID="trends-empty" nativeID="trends-empty" style={s.muted}>
            Not enough yet — the weeks appear after a couple of moments.
          </Text>
        )}
        <View style={s.trendDivider} />
        <Text style={s.subLabel}>BRAVING split · this jar</Text>
        {splitRows.length === 0 ? (
          <Text style={s.muted}>No tagged moments yet — tags gather here once you log them.</Text>
        ) : (
          <View testID="tag-breakdown" nativeID="tag-breakdown">
            <View style={s.splitTrack}>
              {splitRows.map((r) => (
                <View
                  key={r.tag}
                  style={[
                    s.stackSeg,
                    { flex: r.added + r.removed, backgroundColor: tagHue(r.tag) },
                  ]}
                  accessible
                  accessibilityLabel={`${r.tag}: ${r.added} added, ${r.removed} removed`}
                />
              ))}
            </View>
            <View style={s.legend}>
              {splitRows.map((r) => (
                <View
                  key={r.tag}
                  style={s.legendItem}
                  accessible
                  accessibilityLabel={`${r.tag}: ${r.added} added, ${r.removed} removed`}
                >
                  <View style={[s.legendDot, { backgroundColor: tagHue(r.tag) }]} />
                  <Text style={s.legendName}>{r.tag}</Text>
                  <Text style={s.legendCounts}>
                    +{r.added} · −{r.removed}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      {!viewingPast && (
        <View>
          {marbles.length === 0 && !jarTipDismissed && person && (
            <Animated.View
              entering={reduceMotion ? undefined : FadeInDown.duration(400).easing(settleEase)}
              exiting={reduceMotion ? undefined : FadeOut.duration(180)}
            >
              <View style={s.tipCard} accessible accessibilityLabel="The first marble: what to log">
                <Text style={s.tipTitle}>The first marble</Text>
                <Text style={s.tipText}>
                  Give the moment a few words and pick one tag below — that pair is the why every
                  marble carries. Start small; a remembered detail counts.
                </Text>
                <Pressable
                  testID="jar-tip-dismiss"
                  nativeID="jar-tip-dismiss"
                  accessibilityRole="button"
                  accessibilityLabel="Dismiss"
                  onPress={dismissJarTip}
                  hitSlop={8}
                  style={({ pressed }) => [s.tipDismiss, pressed && s.pressed]}
                >
                  <Text style={s.quietBtnText}>Got it</Text>
                </Pressable>
              </View>
            </Animated.View>
          )}
          <Text style={s.section}>Log a moment</Text>
          <TextInput
            ref={reasonRef}
            testID="marble-reason"
            nativeID="marble-reason"
            accessibilityLabel="Reason"
            accessibilityHint="What happened? e.g. remembered the small thing I mentioned"
            value={reason}
            onChangeText={(t) => {
              setReason(t);
              setFormHint(null);
            }}
            placeholder="What happened?"
            placeholderTextColor={Lamp.inkFaint}
            style={s.field}
          />
          <Text style={s.fieldLabel}>BRAVING tag</Text>
          {!tag && !hasTaggedMarble && <Text style={s.guideLine}>{BRAVING_GUIDE}</Text>}
          <TagField
            value={tag}
            onChange={(t) => {
              setTag(t);
              setTagCarried(false);
              setFormHint(null);
            }}
            glosses={TAG_GLOSSES}
            idPrefix="braving-"
            carried={!!tag && tagCarried}
          />
          {/* The guide above retires once a tagged marble lands; this quiet
              line keeps all seven meanings one tap away, collapsed until
              asked. It teaches at the point of use — never selects, never
              validates. */}
          <Pressable
            testID="jar-meanings-toggle"
            nativeID="jar-meanings-toggle"
            accessibilityRole="button"
            accessibilityLabel={
              meaningsOpen ? "Hide what the seven mean" : "What do the seven mean?"
            }
            accessibilityState={{ expanded: meaningsOpen }}
            aria-expanded={meaningsOpen}
            onPress={() => setMeaningsOpen((v) => !v)}
            hitSlop={6}
            style={({ pressed }) => [s.meaningsToggle, pressed && s.pressed]}
          >
            <Text style={s.meaningsToggleText}>
              {meaningsOpen ? "Hide the seven meanings" : "What do the seven mean?"}
            </Text>
          </Pressable>
          {meaningsOpen && (
            <View
              testID="jar-meanings"
              nativeID="jar-meanings"
              accessible
              accessibilityLabel="The seven BRAVING meanings"
            >
              {Object.entries(TAG_GLOSSES).map(([t, gloss]) => (
                <Text key={t} style={s.meaningsLine}>
                  <Text style={s.meaningsName}>{t}</Text>
                  <Text style={s.meaningsGloss}> — {gloss}</Text>
                </Text>
              ))}
            </View>
          )}
          <View style={s.btnRow}>
            <Pressable
              testID="remove-marble"
              nativeID="remove-marble"
              accessibilityRole="button"
              accessibilityLabel="Remove a marble"
              onPress={() => handleDelta(-1)}
              style={({ pressed }) => [s.btnGhost, pressed && s.pressed]}
            >
              <Text style={s.btnGhostText}>− Broke one</Text>
            </Pressable>
            <Pressable
              testID="add-marble"
              nativeID="add-marble"
              accessibilityRole="button"
              accessibilityLabel="Add a marble"
              onPress={() => handleDelta(1)}
              style={({ pressed }) => [s.btnSolid, pressed && s.pressed]}
            >
              <Text style={s.btnSolidText}>+ Kept one</Text>
            </Pressable>
          </View>
          {/* Confirm chip: the jar + tag say their names before Kept/Broke
              arms, so a carried last-tag default can never file silently. */}
          <Text
            testID="jar-log-confirm"
            nativeID="jar-log-confirm"
            style={s.confirmChip}
            accessible
            accessibilityLabel={`Logging for ${person.name} with tag ${tag || "none"}${
              tagCarried && tag ? ", carried from last time" : ""
            }`}
          >
            For {person.name} · {tag ? `${tag}${tagCarried ? " · last time" : ""}` : "no tag yet"}
          </Text>
          {!!formHint && (
            <Text style={s.hint} accessibilityRole="alert">
              {formHint}
            </Text>
          )}
        </View>
      )}

      <Text style={s.section}>Moments, by week</Text>
      {/* The settle after the marble lands: slower than the tip, still
          arrival-only, with a quick fade when dismissed. */}
      {firstInActive && (
        <Animated.View
          entering={reduceMotion ? undefined : FadeInDown.duration(600).easing(settleEase)}
          exiting={reduceMotion ? undefined : FadeOut.duration(180)}
        >
          <View style={s.firstIn} accessible accessibilityLabel="First marble logged">
            <Text style={s.firstInText}>
              First marble in this jar — the weeks and tag split grow from here as moments gather.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Dismiss"
              onPress={() => setJustLogged(null)}
              hitSlop={8}
              style={({ pressed }) => [s.quietBtn, pressed && s.pressed]}
            >
              <Text style={s.quietBtnText}>Dismiss</Text>
            </Pressable>
          </View>
        </Animated.View>
      )}
      {marbles.length === 0 ? (
        <Text style={s.empty}>
          Nothing logged yet — the first marble is a few words and one tag away.
        </Text>
      ) : (
        <View testID="history-list" nativeID="history-list">
          {groups.map((g) => (
            <View key={g.weekStart}>
              <View style={s.weekRule}>
                <View
                  style={s.weekStaff}
                  accessible
                  accessibilityLabel={`${weekLabel(g.weekStart)}, ${g.items.length} moments`}
                />
                <Text style={s.weekHeader} accessibilityRole="header">
                  {weekLabel(g.weekStart)} · {g.items.length}{" "}
                  {g.items.length === 1 ? "moment" : "moments"}
                </Text>
              </View>
              {g.items.map((item) => {
                // A slip waiting out its removal window leaves an Undo row in
                // its place — the marble is only hidden, never deleted, until
                // its window closes. Undo cancels so no delete ever happens.
                const pending = pendingMarbles.find((p) => p.id === item.id);
                if (pending) {
                  const single = pendingMarbles.length === 1;
                  const secs = Math.max(0, pending.secsLeft);
                  return (
                    <View key={item.id} style={s.feedRow}>
                      <View style={s.markCol}>
                        <View style={s.markStem} />
                      </View>
                      <View
                        style={s.mUndo}
                        testID={single ? "marble-undo" : `marble-undo-${item.id}`}
                        nativeID={single ? "marble-undo" : `marble-undo-${item.id}`}
                        accessible
                        accessibilityRole="alert"
                        accessibilityLabel={`Marble leaving the jar. Undo is available for ${secs} more seconds.`}
                      >
                        <Text style={s.mUndoText} numberOfLines={1}>
                          Lifting off the slip ·{" "}
                          <Text
                            testID={
                              single ? "marble-undo-countdown" : `marble-undo-countdown-${item.id}`
                            }
                            nativeID={
                              single ? "marble-undo-countdown" : `marble-undo-countdown-${item.id}`
                            }
                            style={s.mUndoSecs}
                          >
                            Undo within {secs}s
                          </Text>
                        </Text>
                        <Pressable
                          testID={single ? "marble-undo-button" : `marble-undo-button-${item.id}`}
                          nativeID={single ? "marble-undo-button" : `marble-undo-button-${item.id}`}
                          accessibilityRole="button"
                          accessibilityLabel="Undo removing this marble"
                          onPress={() => cancelMarbleRemove(item.id)}
                          hitSlop={8}
                          style={({ pressed }) => [s.quietBtn, pressed && s.pressed]}
                        >
                          <Text style={s.mUndoAction}>Undo</Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                }
                const editing = !viewingPast && editingMarbleId === item.id;
                const inner = (
                  <View key={item.id} style={s.feedRow}>
                    <View style={s.markCol}>
                      <View
                        style={
                          item.delta > 0
                            ? [s.mark, { backgroundColor: tagHue(item.bravingTag) }]
                            : [s.markRing, { borderColor: tagHue(item.bravingTag) }]
                        }
                      />
                      <View style={s.markStem} />
                    </View>
                    <View style={s.feedBody}>
                      <Slip
                        reason={item.reason}
                        fallback={item.delta > 0 ? "Marble added" : "Marble removed"}
                        hue={tagHue(item.bravingTag)}
                        removed={item.delta < 0}
                        meta={`${item.delta > 0 ? "+1" : "−1"}${item.bravingTag ? ` · ${item.bravingTag}` : " · untagged"} · ${dayLabel(item.ts)}`}
                      />
                      {!viewingPast &&
                        (editing ? (
                          <View style={s.editCard}>
                            <TextInput
                              testID="marble-edit-reason"
                              nativeID="marble-edit-reason"
                              accessibilityLabel="Edit what happened"
                              accessibilityHint="A few words about the moment"
                              value={editReason}
                              onChangeText={(t) => {
                                setEditReason(t);
                                setEditHint(null);
                              }}
                              placeholder="What happened?"
                              placeholderTextColor={Lamp.inkFaint}
                              style={s.field}
                            />
                            <Text style={s.fieldLabel}>BRAVING tag</Text>
                            <TagField
                              value={editTag}
                              onChange={(t) => {
                                setEditTag(t);
                                setEditHint(null);
                              }}
                              glosses={TAG_GLOSSES}
                              idPrefix="edit-tag-"
                            />
                            <View style={s.flipRow}>
                              <Pressable
                                testID="marble-edit-kept"
                                nativeID="marble-edit-kept"
                                accessibilityRole="button"
                                accessibilityLabel="Mark this marble kept"
                                accessibilityState={{ selected: editDelta > 0 }}
                                onPress={() => tapFlip(1, item.delta)}
                                hitSlop={6}
                                style={({ pressed }) => [
                                  s.flipBtn,
                                  editDelta > 0 && s.flipOn,
                                  pressed && s.pressed,
                                ]}
                              >
                                <Text style={[s.flipText, editDelta > 0 && s.flipTextOn]}>
                                  + Kept
                                </Text>
                              </Pressable>
                              <Pressable
                                testID="marble-edit-broke"
                                nativeID="marble-edit-broke"
                                accessibilityRole="button"
                                accessibilityLabel="Mark this marble broke"
                                accessibilityState={{ selected: editDelta < 0 }}
                                onPress={() => tapFlip(-1, item.delta)}
                                hitSlop={6}
                                style={({ pressed }) => [
                                  s.flipBtn,
                                  editDelta < 0 && s.flipOn,
                                  pressed && s.pressed,
                                ]}
                              >
                                <Text style={[s.flipText, editDelta < 0 && s.flipTextOn]}>
                                  − Broke
                                </Text>
                              </Pressable>
                            </View>
                            {flipArmed && (
                              <Text
                                testID="marble-edit-flip-confirm"
                                nativeID="marble-edit-flip-confirm"
                                style={s.hint}
                              >
                                Tap {editDelta > 0 ? "Kept" : "Broke"} again to confirm — the count
                                shifts with it.
                              </Text>
                            )}
                            <View style={s.btnRow}>
                              <Pressable
                                testID="marble-edit-cancel"
                                nativeID="marble-edit-cancel"
                                accessibilityRole="button"
                                accessibilityLabel="Cancel editing this marble"
                                onPress={cancelEditor}
                                style={({ pressed }) => [
                                  s.btnGhost,
                                  s.btnSmall,
                                  pressed && s.pressed,
                                ]}
                              >
                                <Text style={s.btnGhostTextSmall}>Cancel</Text>
                              </Pressable>
                              <Pressable
                                testID="marble-edit-save"
                                nativeID="marble-edit-save"
                                accessibilityRole="button"
                                accessibilityLabel="Save changes to this marble"
                                onPress={() => saveEditor(item)}
                                style={({ pressed }) => [
                                  s.btnSolid,
                                  s.btnSmall,
                                  pressed && s.pressed,
                                ]}
                              >
                                <Text style={s.btnSolidTextSmall}>Save changes</Text>
                              </Pressable>
                            </View>
                            {!!editHint && (
                              <Text
                                testID="marble-edit-hint"
                                nativeID="marble-edit-hint"
                                style={s.hint}
                                accessibilityRole="alert"
                              >
                                {editHint}
                              </Text>
                            )}
                          </View>
                        ) : (
                          <View style={s.slipActions}>
                            <Pressable
                              testID={`marble-edit-${item.id}`}
                              nativeID={`marble-edit-${item.id}`}
                              accessibilityRole="button"
                              accessibilityLabel="Edit this marble's words, tag, or mark"
                              onPress={() => openEditor(item)}
                              hitSlop={8}
                              style={({ pressed }) => [s.quietBtn, pressed && s.pressed]}
                            >
                              <Text style={s.quietBtnText}>Edit</Text>
                            </Pressable>
                            <Pressable
                              testID={`marble-remove-${item.id}`}
                              nativeID={`marble-remove-${item.id}`}
                              accessibilityRole="button"
                              accessibilityLabel="Remove this marble from the jar"
                              onPress={() => requestMarbleRemove(item.id)}
                              hitSlop={8}
                              style={({ pressed }) => [s.quietBtn, pressed && s.pressed]}
                            >
                              <Text style={s.quietBtnText}>Remove</Text>
                            </Pressable>
                          </View>
                        ))}
                    </View>
                  </View>
                );
                return justLogged === item.id ? (
                  <Animated.View
                    key={item.id}
                    entering={reduceMotion ? undefined : ZoomIn.duration(380)}
                  >
                    {inner}
                  </Animated.View>
                ) : (
                  <View key={item.id}>{inner}</View>
                );
              })}
            </View>
          ))}
        </View>
      )}
      {hasMore && marbles.length > 0 && (
        <Pressable
          testID="history-more"
          nativeID="history-more"
          accessibilityRole="button"
          accessibilityLabel="Show more history"
          onPress={() => setLimit((l) => l + PAGE_SIZE)}
          style={({ pressed }) => [s.moreBtn, pressed && s.pressed]}
        >
          <Text style={s.moreBtnText}>Show more</Text>
        </Pressable>
      )}
      <Animated.View entering={reduceMotion ? undefined : FadeInDown.duration(400)}>
        <Text style={s.signoff}>Small moments, collected.</Text>
      </Animated.View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: Lamp.ground },
  content: {
    padding: 20,
    paddingTop: 14,
    paddingBottom: 56,
    maxWidth: 880,
    width: "100%",
    alignSelf: "center",
  },
  backBtn: { paddingVertical: 4, paddingRight: 14 },
  backChev: { fontSize: 34, lineHeight: 34, color: Lamp.ink, fontFamily: Font.body },
  webHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Lamp.ground,
    paddingVertical: 6,
  },
  webTitle: { fontFamily: Font.display, fontSize: 19, lineHeight: 22, color: Lamp.ink },
  name: { fontFamily: Font.display, fontSize: 44, lineHeight: 46, color: Lamp.ink },
  count: {
    fontFamily: Font.bodySemi,
    fontWeight: "600",
    fontSize: 14.5,
    color: Lamp.inkSoft,
    marginTop: 4,
  },
  // Stable log entry at the top of the room: the same rail language as the
  // shelf's compact row, so both surfaces promise the action in one place.
  jump: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Lamp.board,
    borderWidth: 1,
    borderColor: Lamp.hairline,
    borderRadius: 99,
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginTop: 12,
  },
  jumpText: { fontFamily: Font.bodySemi, fontWeight: "600", fontSize: 15, color: Lamp.ink },
  vesselWrap: { alignItems: "center", marginVertical: 20 },
  vessel: {
    width: 208,
    borderWidth: 3,
    borderColor: Lamp.ink,
    borderRadius: 26,
    backgroundColor: "rgba(245,233,210,0.05)",
    padding: 16,
    paddingTop: 0,
    overflow: "hidden",
    boxShadow: "0px 8px 18px rgba(0, 0, 0, 0.45)",
    elevation: 4,
  },
  vesselNeck: {
    alignSelf: "center",
    width: 120,
    height: 12,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderColor: Lamp.ink,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    marginBottom: 14,
  },
  vesselDots: { minHeight: 120, justifyContent: "flex-end" },
  vesselHint: {
    marginTop: 12,
    fontFamily: Font.body,
    fontSize: 13.5,
    color: Lamp.inkSoft,
    textAlign: "center",
    maxWidth: 300,
  },
  chapters: { marginBottom: 6 },
  chapterLine: { fontFamily: Font.display, fontSize: 22, color: Lamp.ink },
  chapterStrip: { gap: 8, paddingVertical: 10, paddingRight: 20 },
  chapterPill: {
    borderWidth: 1.5,
    borderColor: Lamp.hairline,
    borderRadius: 99,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  chapterPillActive: { backgroundColor: Lamp.ink, borderColor: Lamp.ink },
  chapterPillText: {
    fontFamily: Font.bodySemi,
    fontWeight: "600",
    fontSize: 13.5,
    color: Lamp.inkSoft,
  },
  chapterPillTextActive: { color: Lamp.ground },
  chapterBanner: {
    backgroundColor: Lamp.board,
    borderWidth: 1,
    borderColor: Lamp.hairline,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 4,
  },
  chapterBannerText: { fontFamily: Font.body, fontSize: 14, lineHeight: 20, color: Lamp.inkSoft },
  section: {
    fontFamily: Font.display,
    fontSize: 22,
    color: Lamp.ink,
    marginTop: 18,
    marginBottom: 10,
  },
  trendBoard: {
    backgroundColor: Lamp.board,
    borderWidth: 1,
    borderColor: Lamp.hairline,
    borderRadius: 20,
    padding: 16,
  },
  muted: { fontFamily: Font.body, fontSize: 14, lineHeight: 20, color: Lamp.inkFaint },
  subLabel: {
    fontFamily: Font.bodySemi,
    fontWeight: "600",
    fontSize: 13.5,
    color: Lamp.inkSoft,
    marginBottom: 10,
  },
  trendDivider: { height: 1, backgroundColor: Lamp.hairline, marginVertical: 14 },
  bars: { flexDirection: "row", alignItems: "flex-end" },
  barCol: { flex: 1, alignItems: "center", justifyContent: "flex-end", minHeight: 120 },
  bar: { width: 20, borderRadius: 10 },
  barUp: { backgroundColor: Lamp.honey },
  barDown: { backgroundColor: Lamp.cherry },
  barZero: { opacity: 0.3, backgroundColor: Lamp.inkFaint },
  barLabel: { fontFamily: Font.body, fontSize: 12, color: Lamp.inkFaint, marginTop: 6, height: 16 },
  splitTrack: {
    flexDirection: "row",
    height: 10,
    borderRadius: 99,
    overflow: "hidden",
    backgroundColor: Lamp.ground,
  },
  stackSeg: { minWidth: 10 },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginRight: 10,
    marginBottom: 4,
  },
  legendDot: { width: 11, height: 11, borderRadius: 5.5 },
  legendName: { fontFamily: Font.bodySemi, fontWeight: "600", fontSize: 13, color: Lamp.inkSoft },
  legendCounts: { fontFamily: Font.body, fontSize: 12.5, color: Lamp.inkFaint },
  field: {
    backgroundColor: Lamp.board,
    borderWidth: 1,
    borderColor: Lamp.hairline,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    fontFamily: Font.body,
    color: Lamp.ink,
  },
  fieldLabel: {
    fontFamily: Font.bodySemi,
    fontWeight: "600",
    fontSize: 13.5,
    color: Lamp.inkSoft,
    marginTop: 12,
    marginBottom: 8,
  },
  btnRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  // Confirm chip: jar + tag named outright before the pair arms, so a
  // carried default can never file silently.
  confirmChip: {
    fontFamily: Font.bodySemi,
    fontWeight: "600",
    fontSize: 13,
    lineHeight: 18,
    color: Lamp.inkSoft,
    marginTop: 10,
  },
  btnSolid: {
    flex: 1,
    backgroundColor: Lamp.cherry,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
  },
  btnSolidText: { color: Lamp.cream, fontFamily: Font.bodyBold, fontWeight: "700", fontSize: 16 },
  btnGhost: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: Lamp.hairline,
  },
  btnGhostText: { color: Lamp.inkSoft, fontFamily: Font.bodyBold, fontWeight: "700", fontSize: 16 },
  btnSmall: { paddingVertical: 12 },
  btnSolidTextSmall: {
    color: Lamp.cream,
    fontFamily: Font.bodyBold,
    fontWeight: "700",
    fontSize: 15,
  },
  btnGhostTextSmall: {
    color: Lamp.inkSoft,
    fontFamily: Font.bodyBold,
    fontWeight: "700",
    fontSize: 15,
  },
  hint: { fontFamily: Font.body, fontSize: 13, lineHeight: 18, color: Lamp.honey, marginTop: 10 },
  // Seven-meanings expander: one quiet line under the tag pills, all seven
  // glosses revealed at once when asked. Quieter than the guide it outlives.
  meaningsToggle: { alignSelf: "flex-start", paddingVertical: 8, paddingHorizontal: 6 },
  meaningsToggleText: {
    fontFamily: Font.bodySemi,
    fontWeight: "600",
    fontSize: 14,
    color: Lamp.inkSoft,
  },
  meaningsLine: {
    fontFamily: Font.body,
    fontSize: 13,
    lineHeight: 19,
    color: Lamp.inkSoft,
    marginTop: 4,
  },
  meaningsName: { fontFamily: Font.bodySemi, fontWeight: "600", color: Lamp.inkSoft },
  meaningsGloss: { fontFamily: Font.body, color: Lamp.inkSoft },
  guideLine: {
    fontFamily: Font.body,
    fontSize: 13,
    lineHeight: 18,
    color: Lamp.inkSoft,
    marginBottom: 8,
  },
  quietBtn: { paddingVertical: 8, paddingHorizontal: 6 },
  quietBtnText: {
    fontFamily: Font.bodySemi,
    fontWeight: "600",
    fontSize: 14,
    color: Lamp.inkSoft,
  },
  tipCard: {
    backgroundColor: Lamp.board,
    borderWidth: 1,
    borderColor: Lamp.hairline,
    borderRadius: 20,
    padding: 16,
    marginTop: 18,
  },
  tipTitle: { fontFamily: Font.display, fontSize: 22, color: Lamp.ink },
  tipText: {
    fontFamily: Font.body,
    fontSize: 14,
    lineHeight: 20,
    color: Lamp.inkSoft,
    marginTop: 8,
  },
  tipDismiss: { alignSelf: "flex-start", marginTop: 8 },
  firstIn: {
    backgroundColor: Lamp.board,
    borderWidth: 1,
    borderColor: Lamp.hairline,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 10,
    marginBottom: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  firstInText: {
    fontFamily: Font.body,
    fontSize: 13.5,
    lineHeight: 19,
    color: Lamp.inkSoft,
    flex: 1,
  },
  weekRule: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14, marginBottom: 8 },
  weekStaff: { width: 3, alignSelf: "stretch", backgroundColor: Lamp.honey, borderRadius: 2 },
  weekHeader: { fontFamily: Font.display, fontSize: 18, color: Lamp.ink },
  empty: { color: Lamp.inkFaint, fontFamily: Font.body, fontSize: 14, marginTop: 8 },
  feedRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  markCol: { alignItems: "center", width: 18 },
  mark: { width: 15, height: 15, borderRadius: 7.5, marginTop: 14 },
  markRing: { width: 15, height: 15, borderRadius: 7.5, borderWidth: 2.5, marginTop: 14 },
  markStem: { flex: 1, width: 2, backgroundColor: Lamp.hairline, marginTop: 4, minHeight: 8 },
  feedBody: { flex: 1 },
  // Quiet correction row under every live slip: editing is as caring as
  // logging, so it sits in the open — never behind a missing-why gate.
  slipActions: { flexDirection: "row", gap: 14, marginTop: 4, alignItems: "center" },
  editCard: { marginTop: 10, gap: 2 },
  // Kept/broke flip inside the editor: two quiet halves, the standing side
  // lit. A flip arms first and confirms on the second tap.
  flipRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  flipBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: Lamp.hairline,
    borderRadius: 99,
    paddingHorizontal: 14,
    paddingVertical: 9,
    alignItems: "center",
  },
  flipOn: { backgroundColor: Lamp.ink, borderColor: Lamp.ink },
  flipText: { fontFamily: Font.bodySemi, fontWeight: "600", fontSize: 13.5, color: Lamp.inkSoft },
  flipTextOn: { color: Lamp.ground },
  // Marble-level Undo: the same voice as the shelf's jar queue, one size
  // down so it sits inside the feed row it replaces.
  mUndo: {
    flex: 1,
    backgroundColor: Lamp.board,
    borderWidth: 1,
    borderColor: Lamp.hairline,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  mUndoText: {
    fontFamily: Font.body,
    fontSize: 13.5,
    lineHeight: 19,
    color: Lamp.inkSoft,
    flex: 1,
  },
  mUndoSecs: { fontFamily: Font.bodySemi, fontWeight: "600", color: Lamp.inkSoft },
  mUndoAction: {
    fontFamily: Font.bodySemi,
    fontWeight: "600",
    fontSize: 13.5,
    color: Lamp.ink,
  },
  moreBtn: {
    marginTop: 12,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: Lamp.hairline,
  },
  moreBtnText: { color: Lamp.ink, fontFamily: Font.bodyBold, fontWeight: "700", fontSize: 15 },
  signoff: {
    fontFamily: Font.hand,
    fontSize: 24,
    color: Lamp.inkSoft,
    textAlign: "center",
    marginTop: 30,
  },
  missingTitle: { fontFamily: Font.display, fontSize: 20, color: Lamp.ink, marginTop: 8 },
  missingBody: {
    fontFamily: Font.body,
    fontSize: 14,
    lineHeight: 20,
    color: Lamp.inkSoft,
    marginTop: 10,
  },
  missingBack: { alignSelf: "flex-start", marginTop: 14, paddingVertical: 8, paddingRight: 6 },
  missingBackText: {
    fontFamily: Font.bodySemi,
    fontWeight: "600",
    fontSize: 15,
    color: Lamp.ink,
  },
  pressed: { opacity: 0.75 },
});
