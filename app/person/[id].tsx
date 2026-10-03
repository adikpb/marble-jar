import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import {
  addMarble,
  BRAVING_TAGS,
  type Chapter,
  completeMarble,
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
  startOfWeek,
  type TagBreakdownRow,
  tagHue,
  type WeeklyTrendPoint,
} from "../../lib/store";

// Provisional gloss copy (orchestrator-drafted, user approves at review).
// The main form shows the selected tag's gloss as one line under the strip;
// the completion editor shows every gloss inline in its tag list.
const TAG_GLOSSES: Record<string, string> = {
  Boundaries: "What's okay and what's not — stated clearly.",
  Reliability: "Do what you say, again and again.",
  Accountability: "Own mistakes, make amends.",
  Vault: "Keep confidences; don't share what isn't yours.",
  Integrity: "Choose right over easy, even unseen.",
  "Non-judgment": "Listen without ranking or shaming.",
  Generosity: "Assume the best possible motive first.",
};

const PAGE_SIZE = 20;
const TREND_WEEKS_SHOWN = 8;

function chapterNo(c: Chapter): number {
  return c.index + 1;
}

function weekLabel(weekStart: number): string {
  const d = new Date(weekStart);
  const thisYear = new Date().getFullYear();
  const base = d.toLocaleDateString(undefined, { month: "long", day: "numeric" });
  return d.getFullYear() === thisYear ? `Week of ${base}` : `Week of ${base}, ${d.getFullYear()}`;
}

function TagList({
  value,
  onChange,
  idPrefix,
}: {
  value: string;
  onChange: (t: string) => void;
  idPrefix: string;
}) {
  return (
    <View style={s.tagCard}>
      {BRAVING_TAGS.map((t) => {
        const gloss = TAG_GLOSSES[t] ?? "";
        const active = value === t;
        return (
          <Pressable
            key={t}
            testID={`${idPrefix}${t}`}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={gloss ? `${t}. ${gloss}` : t}
            onPress={() => onChange(active ? "" : t)}
            style={({ pressed }) => [s.tagRow, active && s.tagRowActive, pressed && s.pressed]}
          >
            <View style={s.tagText}>
              <Text style={[s.tagName, active && s.tagNameActive]}>{t}</Text>
              {!!gloss && <Text style={[s.tagGloss, active && s.tagGlossActive]}>{gloss}</Text>}
            </View>
            <Text style={[s.tagMark, active && s.tagMarkActive, { color: tagHue(t) }]}>
              {active ? "●" : "○"}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// Slim single-line strip for the main log form: compact chips in a
// horizontal scroll row; tapping selects (tap again deselects) and reveals
// that tag's gloss as one cocoa line beneath the strip. Nothing selected
// means no gloss line at all.
function TagStrip({ value, onChange }: { value: string; onChange: (t: string) => void }) {
  const gloss = value ? (TAG_GLOSSES[value] ?? "") : "";
  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.strip}>
        {BRAVING_TAGS.map((t) => {
          const g = TAG_GLOSSES[t] ?? "";
          const active = value === t;
          return (
            <Pressable
              key={t}
              testID={`braving-${t}`}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={g ? `${t}. ${g}` : t}
              onPress={() => onChange(active ? "" : t)}
              style={({ pressed }) => [
                s.stripChip,
                active && s.stripChipActive,
                pressed && s.pressed,
              ]}
            >
              <View style={[s.hueDot, { backgroundColor: tagHue(t) }]} />
              <Text style={[s.stripChipText, active && s.stripChipTextActive]}>{t}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {!!gloss && (
        <Text style={s.stripGloss} numberOfLines={1}>
          {gloss}
        </Text>
      )}
    </View>
  );
}

export default function PersonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const personId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();

  function goBack() {
    // Deep links and reloads have no navigation history, so the default
    // header back button never appears — always offer a way home.
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }

  const [person, setPerson] = useState<Person | null>(null);
  const [marbles, setMarbles] = useState<Marble[]>([]);
  const [count, setCount] = useState(0);
  const [pct, setPct] = useState(0);
  const [reason, setReason] = useState("");
  const [tag, setTag] = useState<string>("");
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [live, setLive] = useState<Chapter | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [trend, setTrend] = useState<WeeklyTrendPoint[]>([]);
  const [breakdown, setBreakdown] = useState<TagBreakdownRow[]>([]);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [hasMore, setHasMore] = useState(false);
  const [expandedWhy, setExpandedWhy] = useState<string | null>(null);
  const [whyReason, setWhyReason] = useState("");
  const [whyTag, setWhyTag] = useState("");
  const [revision, setRevision] = useState(0);

  const selected: Chapter | null = selectedId
    ? (chapters.find((c) => c.id === selectedId) ?? live)
    : live;
  const viewingPast = !!selected && !!live && selected.id !== live.id;

  // All reads flow through this effect; writes just bump `revision`
  // (and reset paging) so the next run refetches. The cancelled flag
  // guards against applying a stale fetch after unmount/remount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      void revision; // refresh token: refetch after writes even when paging is unchanged
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
    })().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [personId, selectedId, limit, revision]);

  async function handleDelta(delta: 1 | -1) {
    if (!personId) return;
    await addMarble(personId, delta, reason, tag);
    setReason("");
    setTag("");
    setLimit(PAGE_SIZE);
    setRevision((r) => r + 1);
  }

  function selectChapter(chapterId: string) {
    setSelectedId(chapterId);
    setLimit(PAGE_SIZE);
    setExpandedWhy(null);
    setRevision((r) => r + 1);
  }

  function openWhy(m: Marble) {
    setExpandedWhy(m.id);
    setWhyReason("");
    setWhyTag(m.bravingTag.trim());
  }

  async function saveWhy(m: Marble) {
    if (!m.reason.trim() && !whyReason.trim()) return;
    if (!m.bravingTag.trim() && !whyTag) return;
    await completeMarble(m.id, whyReason, whyTag);
    setExpandedWhy(null);
    setWhyReason("");
    setWhyTag("");
    setRevision((r) => r + 1);
  }

  const jarPct = Math.round(pct * 100);

  // Weekly trajectory: net marbles per week, person-wide. Fewer than two
  // active weeks in the *visible window* shows the "not enough yet"
  // state — never a flat line.
  const bars = trend.slice(-TREND_WEEKS_SHOWN);
  const activeWeeks = bars.filter((w) => w.count !== 0).length;
  const showBars = activeWeeks >= 2;
  const maxAbs = Math.max(1, ...bars.map((w) => Math.abs(w.count)));

  // Per-tag split for the selected chapter, BRAVING order, untagged last.
  // Only tags actually present are shown — absent tags appear nowhere.
  const splitRows = [...BRAVING_TAGS.map((t) => breakdown.find((r) => r.tag === t) ?? null)]
    .concat([breakdown.find((r) => !BRAVING_TAGS.includes(r.tag as never)) ?? null])
    .filter((r): r is TagBreakdownRow => !!r && r.added + r.removed > 0);

  // Hue per present row from the shared store mapping (stable by tag
  // name; untagged falls back to the neutral). Legend dots use the same.
  const splitTones: string[] = splitRows.map((r) => tagHue(r.tag));

  // History grouped by week (newest first, matching the newest-first feed).
  const groups: { weekStart: number; items: Marble[] }[] = [];
  for (const m of marbles) {
    const ws = startOfWeek(m.ts);
    const last = groups[groups.length - 1];
    if (last && last.weekStart === ws) last.items.push(m);
    else groups.push({ weekStart: ws, items: [m] });
  }

  return (
    <ScrollView style={s.page} contentContainerStyle={s.content}>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <Pressable
              testID="jar-back"
              nativeID="jar-back"
              accessibilityRole="button"
              accessibilityLabel="Back to jars"
              onPress={goBack}
              style={({ pressed }) => [s.backBtn, pressed && s.pressed]}
            >
              <View style={s.chevron} accessible={false}>
                <View style={[s.chevronBar, s.chevronBarUp]} />
                <View style={[s.chevronBar, s.chevronBarDown]} />
              </View>
            </Pressable>
          ),
        }}
      />
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

      {/* Chapters: one fill cycle per era. Past chapters revisit read-only. */}
      {selected && (
        <View style={s.chapters}>
          <Text style={s.chapterEyebrow}>
            Chapter {chapterNo(selected)}
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
                  const label = isLive
                    ? `Chapter ${chapterNo(c)} · live`
                    : `Chapter ${chapterNo(c)} · ${c.finalCount}`;
                  return (
                    <Pressable
                      key={c.id}
                      testID={`chapter-${chapterNo(c)}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={
                        isLive
                          ? `View live chapter ${chapterNo(c)}`
                          : `Revisit chapter ${chapterNo(c)}, closed with ${c.finalCount} marbles`
                      }
                      onPress={() => selectChapter(c.id)}
                      style={({ pressed }) => [
                        s.chapterPill,
                        active && s.chapterPillActive,
                        pressed && s.pressed,
                      ]}
                    >
                      <Text style={[s.chapterPillText, active && s.chapterPillTextActive]}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
            </ScrollView>
          )}
          {viewingPast && (
            <View
              testID="chapter-banner"
              style={s.chapterBanner}
              accessible
              accessibilityLabel={`Chapter ${chapterNo(selected)} is closed. Revisiting for reflection only.`}
            >
              <Text style={s.chapterBannerText}>
                Chapter {chapterNo(selected)} closed with {selected.finalCount} marble
                {selected.finalCount === 1 ? "" : "s"}
                {selected.finalCount >= JAR_CAPACITY
                  ? " — a full jar of trust. Milestone worth sitting with."
                  : "."}{" "}
                Revisiting for reflection — nothing can be added here.
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Trends: read-only trajectory + per-tag split */}
      <Text style={s.section}>Trends</Text>
      <View
        testID="trends"
        style={s.card}
        accessible
        accessibilityLabel={
          showBars
            ? `Trust trend over recent weeks, ${activeWeeks} active weeks`
            : "Not enough trend data yet"
        }
      >
        {showBars ? (
          <View style={s.bars} testID="weekly-bars">
            {bars.map((w) => {
              const positive = w.count > 0;
              const h =
                w.count === 0 ? 4 : Math.max(8, Math.round((Math.abs(w.count) / maxAbs) * 88));
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
          <Text testID="trends-empty" style={s.muted}>
            Not enough yet — trends appear after a couple of weeks of moments.
          </Text>
        )}
        <View style={s.cardDivider} />
        <Text style={s.subLabel}>BRAVING split · this chapter</Text>
        {splitRows.length === 0 ? (
          <Text style={s.muted}>No tagged moments yet — tags appear here once you log them.</Text>
        ) : (
          <View testID="tag-breakdown" style={s.stackWrap}>
            <View style={s.splitTrack}>
              {splitRows.map((r, i) => (
                <View
                  key={r.tag}
                  style={[
                    s.stackSeg,
                    {
                      flex: r.added + r.removed,
                      backgroundColor: splitTones[i],
                    },
                  ]}
                  accessible
                  accessibilityLabel={`${r.tag}: ${r.added} added, ${r.removed} removed`}
                />
              ))}
            </View>
            <View style={s.legend}>
              {splitRows.map((r, i) => (
                <View
                  key={r.tag}
                  style={s.legendItem}
                  accessible
                  accessibilityLabel={`${r.tag}: ${r.added} added, ${r.removed} removed`}
                >
                  <View style={[s.legendDot, { backgroundColor: splitTones[i] }]} />
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

      {/* Log form (live chapter only — past chapters are read-only) */}
      {!viewingPast ? (
        <View>
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
          <TagStrip value={tag} onChange={setTag} />

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
        </View>
      ) : null}

      <Text style={s.section}>History</Text>
      {marbles.length === 0 ? (
        <Text style={s.empty}>Nothing logged yet — add the first marble.</Text>
      ) : (
        <View testID="history-list">
          {groups.map((g) => (
            <View key={g.weekStart}>
              <Text style={s.weekHeader} accessibilityRole="header">
                {weekLabel(g.weekStart)}
              </Text>
              {g.items.map((item) => {
                const needsWhy = !viewingPast && (!item.reason.trim() || !item.bravingTag.trim());
                const expanded = expandedWhy === item.id;
                return (
                  <View key={item.id} style={s.feedItem}>
                    <Text style={[s.dot, item.delta > 0 ? s.dotUp : s.dotDown]}>
                      {item.delta > 0 ? "●" : "○"}
                    </Text>
                    <View style={s.feedBody}>
                      <Text style={s.feedReason}>
                        {item.reason || (item.delta > 0 ? "Marble added" : "Marble removed")}
                      </Text>
                      <Text style={s.feedMeta}>
                        {item.delta > 0 ? "+1" : "−1"}
                        {item.bravingTag ? (
                          <>
                            {" · "}
                            <Text style={[s.feedTag, { color: tagHue(item.bravingTag) }]}>
                              {item.bravingTag}
                            </Text>
                          </>
                        ) : null}{" "}
                        ·{" "}
                        {new Date(item.ts).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </Text>
                      {needsWhy &&
                        (expanded ? (
                          <View style={s.whyCard}>
                            {!item.reason.trim() && (
                              <TextInput
                                testID="why-reason"
                                nativeID="why-reason"
                                accessibilityLabel="Missing reason"
                                accessibilityHint="What happened in this moment?"
                                value={whyReason}
                                onChangeText={setWhyReason}
                                placeholder="What happened?"
                                placeholderTextColor="#A39E93"
                                style={s.input}
                              />
                            )}
                            {!item.bravingTag.trim() && (
                              <View>
                                <Text style={s.label}>BRAVING tag</Text>
                                <TagList value={whyTag} onChange={setWhyTag} idPrefix="why-tag-" />
                              </View>
                            )}
                            <View style={s.btnRow}>
                              <Pressable
                                testID="why-cancel"
                                accessibilityRole="button"
                                accessibilityLabel="Cancel adding the why"
                                onPress={() => setExpandedWhy(null)}
                                style={({ pressed }) => [
                                  s.btn,
                                  s.btnGhost,
                                  s.btnSmall,
                                  pressed && s.pressed,
                                ]}
                              >
                                <Text style={s.btnGhostTextSmall}>Cancel</Text>
                              </Pressable>
                              <Pressable
                                testID="why-save"
                                accessibilityRole="button"
                                accessibilityLabel="Save the why"
                                onPress={() => saveWhy(item)}
                                style={({ pressed }) => [
                                  s.btn,
                                  s.btnSolid,
                                  s.btnSmall,
                                  pressed && s.pressed,
                                ]}
                              >
                                <Text style={s.btnSolidTextSmall}>Save</Text>
                              </Pressable>
                            </View>
                          </View>
                        ) : (
                          <Pressable
                            testID={`why-${item.id}`}
                            accessibilityRole="button"
                            accessibilityLabel="Add the missing why for this marble"
                            onPress={() => openWhy(item)}
                            style={({ pressed }) => [s.whyPill, pressed && s.pressed]}
                          >
                            <Text style={s.whyPillText}>Add the why</Text>
                          </Pressable>
                        ))}
                    </View>
                  </View>
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
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#FAF7F0" },
  content: { padding: 20, paddingTop: 16, paddingBottom: 48 },
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
  chapters: { marginBottom: 4 },
  chapterEyebrow: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 2,
    textTransform: "uppercase",
    color: "#8A8478",
  },
  chapterStrip: { gap: 8, paddingVertical: 10, paddingRight: 20 },
  chapterPill: {
    borderWidth: 1,
    borderColor: "#E0D8C2",
    backgroundColor: "#fff",
    borderRadius: 99,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  chapterPillActive: { backgroundColor: "#1E1B16", borderColor: "#1E1B16" },
  chapterPillText: { fontSize: 13, fontWeight: "600", color: "#5C564A" },
  chapterPillTextActive: { color: "#FAF7F0" },
  chapterBanner: {
    backgroundColor: "#EDE6D3",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 4,
  },
  chapterBannerText: { fontSize: 14, lineHeight: 20, color: "#1E1B16" },
  section: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: "#8A8478",
    marginTop: 8,
    marginBottom: 8,
  },
  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E9E2D2",
    borderRadius: 18,
    padding: 16,
  },
  muted: { fontSize: 14, lineHeight: 20, color: "#8A8478" },
  subLabel: { fontSize: 13, fontWeight: "600", color: "#5C564A", marginBottom: 10 },
  cardDivider: { height: 1, backgroundColor: "#EDE6D3", marginVertical: 14 },
  bars: { flexDirection: "row", alignItems: "flex-end" },
  barCol: { flex: 1, alignItems: "center", justifyContent: "flex-end", minHeight: 112 },
  bar: { width: 18, borderRadius: 9 },
  barUp: { backgroundColor: "#E8A33D" },
  barDown: { backgroundColor: "#8A8478" },
  barZero: { opacity: 0.35, backgroundColor: "#8A8478" },
  barLabel: { fontSize: 12, color: "#8A8478", marginTop: 6, height: 16 },
  stackWrap: { gap: 10 },
  splitTrack: {
    flexDirection: "row",
    height: 8,
    borderRadius: 99,
    backgroundColor: "#F0EAD9",
    overflow: "hidden",
  },
  stackSeg: { minWidth: 8 },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5, marginRight: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendName: { fontSize: 13, fontWeight: "600", color: "#5C564A" },
  legendCounts: { fontSize: 12, color: "#8A8478" },
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
  tagCard: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E9E2D2",
    borderRadius: 18,
    padding: 6,
    gap: 2,
  },
  tagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 56,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  tagRowActive: { backgroundColor: "#1E1B16" },
  tagText: { flex: 1, gap: 2 },
  tagName: { fontSize: 15, fontWeight: "700", color: "#1E1B16" },
  tagNameActive: { color: "#FAF7F0" },
  tagGloss: { fontSize: 13, lineHeight: 18, color: "#8A8478" },
  tagGlossActive: { color: "#FAF7F0", opacity: 0.75 },
  tagMark: { fontSize: 16, color: "#8A8478" },
  tagMarkActive: { color: "#FAF7F0" },
  strip: { gap: 8, paddingRight: 20 },
  stripChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#E0D8C2",
    backgroundColor: "#fff",
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  stripChipActive: { backgroundColor: "#1E1B16", borderColor: "#1E1B16" },
  stripChipText: { fontSize: 13, fontWeight: "600", color: "#5C564A" },
  stripChipTextActive: { color: "#FAF7F0" },
  stripGloss: { fontSize: 13, lineHeight: 18, color: "#5C564A", marginTop: 8 },
  hueDot: { width: 10, height: 10, borderRadius: 5 },
  btnRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  btn: { flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  btnSmall: { paddingVertical: 12 },
  btnSolid: { backgroundColor: "#2E7D6F" },
  btnSolidText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  btnSolidTextSmall: { color: "#fff", fontWeight: "700", fontSize: 15 },
  btnGhost: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#E0D8C2" },
  btnGhostText: { color: "#1E1B16", fontWeight: "700", fontSize: 16 },
  btnGhostTextSmall: { color: "#1E1B16", fontWeight: "700", fontSize: 15 },
  backBtn: { paddingVertical: 6, paddingRight: 12 },
  chevron: { width: 12, height: 20, flexShrink: 0 },
  chevronBar: {
    position: "absolute",
    width: 12,
    height: 2.5,
    borderRadius: 1.5,
    backgroundColor: "#1E1B16",
  },
  chevronBarUp: { top: 4.5, transform: [{ rotate: "-45deg" }] },
  chevronBarDown: { top: 11.5, transform: [{ rotate: "45deg" }] },
  pressed: { opacity: 0.75 },
  weekHeader: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: "#8A8478",
    marginTop: 12,
    marginBottom: 2,
  },
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
  feedTag: { fontSize: 12, fontWeight: "600" },
  whyPill: {
    alignSelf: "flex-start",
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#E0D8C2",
    backgroundColor: "#fff",
    borderRadius: 99,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  whyPillText: { fontSize: 13, fontWeight: "600", color: "#5C564A" },
  whyCard: { marginTop: 10, gap: 2 },
  moreBtn: {
    marginTop: 12,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E0D8C2",
  },
  moreBtnText: { color: "#1E1B16", fontWeight: "700", fontSize: 15 },
});
