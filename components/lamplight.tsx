// Lamplight shared pieces: marble dots, tag fields, pinned slips.
// One world owns the page, so every screen draws from these.
import { Pressable, StyleSheet, Text, View } from "react-native";
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
    <View accessible accessibilityLabel={label} style={md.row}>
      {dots}
    </View>
  );
}

// Full-bleed hue fields for choosing a BRAVING tag: each tag floods its own
// row with its color at rest, and the chosen one goes dark with the hue kept
// as a lit edge. No timid chips.
export function TagField({
  value,
  onChange,
  glosses,
  idPrefix,
}: {
  value: string;
  onChange: (t: string) => void;
  glosses: Record<string, string>;
  idPrefix: string;
}) {
  const tags = Object.keys(glosses);
  return (
    <View style={tf.list}>
      {tags.map((t) => {
        const active = value === t;
        const hue = tagHue(t);
        const gloss = glosses[t] ?? "";
        return (
          <Pressable
            key={t}
            testID={`${idPrefix}${t}`}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={gloss ? `${t}. ${gloss}` : t}
            onPress={() => onChange(active ? "" : t)}
            style={({ pressed }) => [
              tf.field,
              { backgroundColor: active ? Lamp.boardRaised : hue },
              active && { borderColor: hue },
              pressed && tf.pressed,
            ]}
          >
            <Text
              style={[tf.name, active ? { color: Lamp.ink } : { color: Lamp.paperInk }]}
              numberOfLines={1}
            >
              {t}
            </Text>
            {!!gloss && (
              <Text
                style={[tf.gloss, active ? { color: Lamp.inkSoft } : { color: Lamp.paperInk }]}
                numberOfLines={1}
              >
                {gloss}
              </Text>
            )}
            <View style={[tf.pin, { backgroundColor: active ? hue : "rgba(43,30,17,0.55)" }]} />
          </Pressable>
        );
      })}
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
  list: { gap: 8 },
  field: {
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "transparent",
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  name: { fontFamily: Font.bodyBold, fontSize: 15, fontWeight: "700" },
  gloss: { flex: 1, fontFamily: Font.body, fontSize: 12.5 },
  pin: { width: 14, height: 14, borderRadius: 7 },
  pressed: { opacity: 0.8 },
});

const sl = StyleSheet.create({
  slip: {
    backgroundColor: Lamp.paper,
    borderRadius: 6,
    padding: 12,
    paddingTop: 10,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  slipRemoved: { backgroundColor: Lamp.paperDeep, opacity: 0.82 },
  pin: {
    width: 13,
    height: 13,
    borderRadius: 6.5,
    marginBottom: 6,
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  words: { fontFamily: Font.hand, fontSize: 20, lineHeight: 24, color: Lamp.paperInk },
  wordsRemoved: { textDecorationLine: "line-through", textDecorationColor: "#8A6F45" },
  meta: { fontFamily: Font.body, fontSize: 12, color: Lamp.paperSoft, marginTop: 4 },
});
