// Lamplight shared pieces: marble dots, tag fields, pinned slips.
// One world owns the page, so every screen draws from these.
import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Font, Lamp } from "../constants/lamplight";
import { JAR_CAPACITY, tagHue } from "../lib/store";

// Twenty dots: the jar at a glance. Filled dots take the hues of the newest
// marbles first (real glass, real moments); older fills fall back to honey.
export function MarbleDots({
  count,
  hues,
  size = 15,
  label,
  bottomUp = false,
}: {
  count: number;
  hues: string[];
  size?: number;
  label?: string;
  bottomUp?: boolean;
}) {
  const dots = [];
  for (let i = 0; i < JAR_CAPACITY; i += 1) {
    const filled = bottomUp ? i >= JAR_CAPACITY - count : i < count;
    // Newest marble sits at the top of the pile: map hues from the end.
    // Bottom-up piles mirror the order so the oldest glass settles first.
    const slot = bottomUp ? JAR_CAPACITY - 1 - i : i;
    const hue = filled ? (hues[count - 1 - slot] ?? Lamp.honey) : null;
    dots.push(
      <View
        key={i}
        style={[
          md.dot,
          { width: size, height: size, borderRadius: size / 2 },
          filled
            ? { backgroundColor: hue ?? Lamp.honey }
            : { backgroundColor: "transparent", borderColor: Lamp.empty, borderWidth: 1.5 },
        ]}
      >
        {filled && (
          <View
            style={[
              md.gloss,
              {
                width: size * 0.34,
                height: size * 0.34,
                borderRadius: size * 0.17,
                left: size * 0.16,
                top: size * 0.12,
              },
            ]}
          />
        )}
      </View>,
    );
  }
  return (
    <View accessible={!!label} accessibilityLabel={label} style={md.row}>
      {dots}
    </View>
  );
}

// Compact hue pills for choosing a BRAVING tag: neutral at rest (board
// fill, ink-soft label, hairline edge) with the hue carried ONLY by the
// pin, and flooded with the tag hue when chosen (paper-ink label, solid
// dark pin, hue edge). Same glass language as the full-bleed rows, wrapped
// tight so the composer stays a composer. Tapping the chosen pill clears
// back to untagged. The chosen tag's gloss reads once below the row; a
// carried last-tag default is marked there ("Reliability · last time") so a
// stale default never logs silently. The teaching never retires: long-press
// a pill — or hover / focus it on web — to peek its one-line gloss below
// the row without selecting it. Fill + edge + label + pin all change
// with state, so meaning is never color-only.
export function TagField({
  value,
  onChange,
  glosses,
  idPrefix,
  carried = false,
}: {
  value: string;
  onChange: (t: string) => void;
  glosses: Record<string, string>;
  idPrefix: string;
  carried?: boolean;
}) {
  const tags = Object.keys(glosses);
  // Peeked gloss: the tag last long-pressed, hovered, or keyboard-focused.
  // Never a selection — it only borrows the gloss line until a tap chooses.
  const [peek, setPeek] = useState<string | null>(null);
  const activeGloss = value ? (glosses[value] ?? "") : "";
  const peekGloss = !value && peek ? (glosses[peek] ?? "") : "";
  const showCarried = carried && !!value && !!activeGloss;
  const glossLine = showCarried
    ? `${value} · last time — ${activeGloss}`
    : activeGloss || (peek && peekGloss ? `${peek} — ${peekGloss}` : "");
  return (
    <View>
      <View style={tf.list}>
        {tags.map((t) => {
          const active = value === t;
          const hue = tagHue(t);
          const gloss = glosses[t] ?? "";
          const isCarried = active && carried;
          return (
            <Pressable
              key={t}
              testID={`${idPrefix}${t}`}
              nativeID={`${idPrefix}${t}`}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={
                gloss
                  ? `${t}. ${gloss}${isCarried ? ", carried from last time" : ""}${active ? ", selected" : ""}`
                  : `${t}${isCarried ? ", carried from last time" : ""}${active ? ", selected" : ""}`
              }
              accessibilityHint={active ? undefined : `Long-press to hear what ${t} means`}
              onPress={() => {
                setPeek(null);
                onChange(active ? "" : t);
              }}
              onLongPress={() => setPeek(t)}
              onHoverIn={() => setPeek(t)}
              onHoverOut={() => setPeek((cur) => (cur === t ? null : cur))}
              onFocus={() => setPeek(t)}
              onBlur={() => setPeek((cur) => (cur === t ? null : cur))}
              {...(Platform.OS === "web" ? ({ title: gloss } as object) : null)}
              hitSlop={6}
              style={({ pressed }) => [
                tf.field,
                active
                  ? { backgroundColor: hue, borderColor: hue }
                  : { backgroundColor: Lamp.board, borderColor: Lamp.hairline },
                pressed && tf.pressed,
              ]}
            >
              <Text
                style={[tf.name, active ? { color: Lamp.paperInk } : { color: Lamp.inkSoft }]}
                numberOfLines={1}
              >
                {t}
              </Text>
              <View
                style={[
                  tf.pin,
                  active ? { backgroundColor: Lamp.paperInk } : { backgroundColor: hue },
                ]}
              />
            </Pressable>
          );
        })}
      </View>
      {!!glossLine && (
        <Text
          testID={`${idPrefix}gloss`}
          nativeID={`${idPrefix}gloss`}
          style={tf.glossLine}
          accessible
          accessibilityLabel={glossLine}
        >
          {glossLine}
        </Text>
      )}
    </View>
  );
}

// A pinned paper slip: one moment's words in handwriting, held by a magnet
// dot in its tag hue. Removals print on darkened paper — honest, not failed.
export function Slip({
  reason,
  fallback,
  hue,
  removed,
  meta,
}: {
  reason: string;
  fallback: string;
  hue: string;
  removed: boolean;
  meta: string;
}) {
  return (
    <View
      style={[sl.slip, removed && sl.slipRemoved]}
      accessible
      accessibilityLabel={`${reason || fallback}, ${meta}`}
    >
      <View style={[sl.pin, { backgroundColor: hue }]} />
      <Text style={[sl.words, removed && sl.wordsRemoved]}>{reason || fallback}</Text>
      <Text style={sl.meta}>{meta}</Text>
    </View>
  );
}

const md = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  dot: { overflow: "hidden" },
  gloss: { position: "absolute", backgroundColor: "rgba(255,246,224,0.75)" },
});

const tf = StyleSheet.create({
  list: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  field: {
    borderRadius: 99,
    borderWidth: 2,
    borderColor: "transparent",
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  name: { fontFamily: Font.bodyBold, fontSize: 13.5, fontWeight: "700" },
  pin: { width: 12, height: 12, borderRadius: 6 },
  glossLine: {
    fontFamily: Font.body,
    fontSize: 13,
    lineHeight: 18,
    color: Lamp.inkSoft,
    marginTop: 8,
  },
  pressed: { opacity: 0.8 },
});

const sl = StyleSheet.create({
  slip: {
    backgroundColor: Lamp.paper,
    borderRadius: 6,
    padding: 12,
    paddingTop: 10,
    boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.35)",
    elevation: 3,
  },
  slipRemoved: { backgroundColor: Lamp.paperDeep, opacity: 0.82 },
  pin: {
    width: 13,
    height: 13,
    borderRadius: 6.5,
    marginBottom: 6,
    boxShadow: "0px 2px 3px rgba(0, 0, 0, 0.4)",
    elevation: 2,
  },
  words: { fontFamily: Font.hand, fontSize: 20, lineHeight: 24, color: Lamp.paperInk },
  wordsRemoved: { textDecorationLine: "line-through", textDecorationColor: "#8A6F45" },
  meta: { fontFamily: Font.body, fontSize: 12, color: Lamp.paperSoft, marginTop: 4 },
});
