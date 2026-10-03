// The jar room: one person's trust, sitting in lamplight. The vessel fills
// with real marble glass, the weeks read as a staff, every moment a slip.
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import { MarbleDots, Slip, TagField } from "../../components/lamplight";
import { TAG_GLOSSES } from "../../constants/braving";
import { Font, Lamp } from "../../constants/lamplight";
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

const PAGE_SIZE = 20;
const TREND_WEEKS_SHOWN = 8;

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
  const [tag, setTag] = useState<string>("");
  const [formHint, setFormHint] = useState<string | null>(null);
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
  const [justLogged, setJustLogged] = useState<string | null>(null);

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
    })().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [personId, selectedId, limit, revision]);

  async function handleDelta(delta: 1 | -1) {
    if (!personId) return;
    if (!reason.trim() || !tag) {
      setFormHint("Give the moment a few words and a BRAVING tag — every marble has a why.");
      return;
    }
    const m = await addMarble(personId, delta, reason, tag);
    setReason("");
    setTag("");
    setFormHint(null);
    setJustLogged(m.id);
    setLimit(PAGE_SIZE);
    setRevision((r) => r + 1);
  }

  function selectChapter(chapterId: string) {
    setSelectedId(chapterId);
    setLimit(PAGE_SIZE);
    setExpandedWhy(null);
    setJustLogged(null);
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

  const groups: { weekStart: number; items: Marble[] }[] = [];
  for (const m of marbles) {
    const ws = startOfWeek(m.ts);
    const last = groups[groups.length - 1];
    if (last && last.weekStart === ws) last.items.push(m);
    else groups.push({ weekStart: ws, items: [m] });
  }

  return (
    <ScrollView
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
      <Text style={s.name} accessibilityRole="header">
        {person?.name ?? "Loading…"}
      </Text>
      <Text
        testID="jar-count"
        nativeID="jar-count"
        style={s.count}
        accessibilityLabel={`${count} of ${JAR_CAPACITY} marbles`}
      >
        {count} of {JAR_CAPACITY} marbles · {jarPct}%
      </Text>

      <View style={s.vesselWrap}>
        <View style={s.vessel} accessible accessibilityLabel={`Jar ${jarPct} percent full`}>
          <View style={s.vesselNeck} />
          <View style={s.vesselDots}>
            <MarbleDots count={count} hues={[...glassOldestFirst].reverse()} size={21} bottomUp />
          </View>
        </View>
        <Text style={s.vesselHint}>
          {count <= 0
            ? "Empty jar — every marble starts with a small kept promise."
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
        style={s.trendBoard}
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
          <Text testID="trends-empty" style={s.muted}>
            Not enough yet — the weeks appear after a couple of moments.
          </Text>
        )}
        <View style={s.trendDivider} />
        <Text style={s.subLabel}>BRAVING split · this jar</Text>
        {splitRows.length === 0 ? (
          <Text style={s.muted}>No tagged moments yet — tags gather here once you log them.</Text>
        ) : (
          <View testID="tag-breakdown">
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
          <Text style={s.section}>Log a moment</Text>
          <TextInput
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
          <TagField
            value={tag}
            onChange={(t) => {
              setTag(t);
              setFormHint(null);
            }}
            glosses={TAG_GLOSSES}
            idPrefix="braving-"
          />
          <View style={s.btnRow}>
            <Pressable
              testID="remove-marble"
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
          {!!formHint && (
            <Text style={s.hint} accessibilityRole="alert">
              {formHint}
            </Text>
          )}
        </View>
      )}

      <Text style={s.section}>Moments, by week</Text>
      {marbles.length === 0 ? (
        <Text style={s.empty}>Nothing logged yet — add the first marble.</Text>
      ) : (
        <View testID="history-list">
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
                const needsWhy = !viewingPast && (!item.reason.trim() || !item.bravingTag.trim());
                const expanded = expandedWhy === item.id;
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
                                placeholderTextColor={Lamp.inkFaint}
                                style={s.field}
                              />
                            )}
                            {!item.bravingTag.trim() && (
                              <View>
                                <Text style={s.fieldLabel}>BRAVING tag</Text>
                                <TagField
                                  value={whyTag}
                                  onChange={setWhyTag}
                                  glosses={TAG_GLOSSES}
                                  idPrefix="why-tag-"
                                />
                              </View>
                            )}
                            <View style={s.btnRow}>
                              <Pressable
                                testID="why-cancel"
                                accessibilityRole="button"
                                accessibilityLabel="Cancel adding the why"
                                onPress={() => setExpandedWhy(null)}
                                style={({ pressed }) => [
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
                return justLogged === item.id ? (
                  <Animated.View key={item.id} entering={ZoomIn.duration(380)}>
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
      <Animated.View entering={FadeInDown.duration(400)}>
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
  name: { fontFamily: Font.display, fontSize: 44, lineHeight: 46, color: Lamp.ink },
  count: {
    fontFamily: Font.bodySemi,
    fontWeight: "600",
    fontSize: 14.5,
    color: Lamp.inkSoft,
    marginTop: 4,
  },
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
    shadowColor: "#000",
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
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
  whyPill: {
    alignSelf: "flex-start",
    marginTop: 8,
    borderWidth: 1.5,
    borderColor: Lamp.hairline,
    borderRadius: 99,
    paddingHorizontal: 15,
    paddingVertical: 9,
  },
  whyPillText: {
    fontFamily: Font.bodySemi,
    fontWeight: "600",
    fontSize: 13.5,
    color: Lamp.inkSoft,
  },
  whyCard: { marginTop: 10, gap: 2 },
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
  pressed: { opacity: 0.75 },
});
