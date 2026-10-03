---
name: Marble Jar
description: Lamplight enamel — a trust ledger drawn as a kitchen shelf at dusk.
colors:
  ground: "#211410"
  board: "#2C1D14"
  board-raised: "#372417"
  hairline: "#503722"
  shelf-edge: "#170D08"
  ink: "#F5E9D2"
  ink-soft: "#D8BE98"
  ink-faint: "#A98F6E"
  cream: "#FBF3E2"
  paper: "#F4E8CF"
  paper-deep: "#EAD9B8"
  paper-ink: "#2B1E11"
  paper-soft: "#6B5638"
  cherry: "#C8452C"
  cherry-deep: "#A03420"
  honey: "#D9A441"
  empty-ring: "#453019"
  tag-boundaries: "#BE9A4E"
  tag-reliability: "#7C9DB4"
  tag-accountability: "#9A7FA8"
  tag-vault: "#BB7E5C"
  tag-integrity: "#5F9E97"
  tag-non-judgment: "#BE8B93"
  tag-generosity: "#9AA064"
  tag-untagged: "#B9B2A1"
typography:
  display:
    fontFamily: "Bricolage Grotesque"
    fontSize: "44px"
    fontWeight: 700
    lineHeight: "46px"
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Bricolage Grotesque"
    fontSize: "40px"
    fontWeight: 700
    lineHeight: "42px"
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Bricolage Grotesque"
    fontSize: "22px"
    fontWeight: 700
  body:
    fontFamily: "Karla"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "22px"
  label:
    fontFamily: "Karla"
    fontSize: "13.5px"
    fontWeight: 600
  hand:
    fontFamily: "Caveat"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: "24px"
rounded:
  slip: "6px"
  field: "14px"
  board: "20px"
  vessel: "26px"
  pill: "99px"
  bar: "10px"
spacing:
  xs: "6px"
  sm: "8px"
  md: "10px"
  lg: "12px"
  xl: "16px"
  section: "18px"
  band: "20px"
  major: "22px"
  outer: "56px"
components:
  button-cherry:
    backgroundColor: "{colors.cherry}"
    textColor: "{colors.cream}"
    typography: "{typography.label}"
    rounded: "{rounded.field}"
    padding: "15px 0"
  button-cherry-deep:
    backgroundColor: "{colors.cherry-deep}"
    textColor: "{colors.cream}"
    typography: "{typography.label}"
    rounded: "{rounded.field}"
    padding: "10px 20px"
  button-hairline:
    backgroundColor: "transparent"
    textColor: "{colors.ink-soft}"
    typography: "{typography.label}"
    rounded: "{rounded.field}"
    padding: "15px 0"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.ink-faint}"
    typography: "{typography.label}"
    padding: "8px 6px"
  field:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.field}"
    padding: "13px 14px"
  field-raised:
    backgroundColor: "{colors.board}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.field}"
    padding: "13px 14px"
  pill-toggle:
    backgroundColor: "transparent"
    textColor: "{colors.ink-soft}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "9px 15px"
  pill-toggle-on:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ground}"
    rounded: "{rounded.pill}"
    padding: "9px 15px"
  tag-field:
    # The fill is the row tag's own hue; the selected row inverts to board-raised
    # and keeps the hue as a 2px lit edge.
    backgroundColor: "{colors.tag-boundaries}"
    textColor: "{colors.paper-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.field}"
    padding: "10px 14px"
    height: "44px"
  jar-board:
    backgroundColor: "{colors.board}"
    textColor: "{colors.ink}"
    rounded: "{rounded.board}"
    padding: "18px"
  slip:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.paper-ink}"
    typography: "{typography.hand}"
    rounded: "{rounded.slip}"
    padding: "10px 12px"
  slip-removed:
    backgroundColor: "{colors.paper-deep}"
    textColor: "{colors.paper-ink}"
    typography: "{typography.hand}"
    rounded: "{rounded.slip}"
    padding: "10px 12px"
  marble-dot:
    size: "15px"
    rounded: "{rounded.pill}"
  trend-bar-up:
    backgroundColor: "{colors.honey}"
    width: "20px"
    rounded: "{rounded.bar}"
  trend-bar-down:
    backgroundColor: "{colors.cherry}"
    width: "20px"
    rounded: "{rounded.bar}"
  split-segment:
    backgroundColor: "{colors.tag-integrity}"
    height: "10px"
---

# Design System: Marble Jar

## Overview

**Creative North Star: "Lamplight Enamel"**

Every surface in this product is one material under one lamp: warm enamel in
deep espresso, catching light from above and behind. The shelf screen is a
wooden shelf in a kitchen after dark — boards of darker wood laid on a darker
ground, each jar a name set large, each marble a small glossy bead of colored
glass. The jar screen is the same room from closer in, and it adds the only
light-colored objects in the product: paper slips pinned to the board, carrying
a moment's words in handwriting. Nothing else in the interface is allowed to be
light-colored. The contrast between espresso chrome and paper slips is the whole
visual argument: chrome is the room, paper is the life in it.

The system is dark-only and deliberately single-tone. Hierarchy comes from
three steps of warm off-white ink (`ink` → `ink-soft` → `ink-faint`) over two
steps of wood (`board` over `ground`), plus hairline borders. No screen adds a
color beyond those, with exactly two exceptions that carry meaning rather than
decoration: cherry red is reserved for live actions, and the seven BRAVING hues
appear only as glass — marble dots, chart bars, split-track segments, tag
edges.

Density is domestic, not airy. The history feed on the jar screen keeps a
collector's density: real slips, one after another, grouped under a week staff,
with sequence numbers (`+1` / `−1`) printed on each. There are no placeholder
cards, no icon tiles, no skeletons. An empty state is a sentence of plain copy,
not a graphic.

What this system refuses is the habit-tracker grammar: no streaks, no scores, no
progress rings, no leaderboards, no congratulation. A jar at 15 of 20 reads as
a jar that is three-quarters full, and the copy says so; nothing pulses at the
user or congratulates them. Removals are treated as ordinary record-keeping and
drawn honestly — an open ring instead of a filled marble, a down-bar instead of
an up-bar, a darkened slip with the words struck through. Nothing is framed as a
failure, a warning, or a deficit.

**Key Characteristics:**

- Espresso-and-paper: dark warm chrome, light paper slips, nothing between.
- Three ink steps and two wood steps carry all hierarchy; hue never does.
- Cherry red means "this action is live" — buttons and selection only.
- The seven BRAVING hues are glass and tag edges, never chrome.
- Circles for data (marbles, marks, pins), rounded rectangles for surfaces,
  near-square corners for paper.
- Soft blurred black shadows as lamplight falloff; one hard wood edge per board.
- Motion is arrival, not celebration: things fade and settle in.

## Colors

A single warm family — espresso wood and lamplight ink — with one action red,
one lamplight amber, and seven equal-weight muted tag hues held apart from both.

### Primary

- **Cherry Magnet Red:** the one live color in the product. It fills the kept-one
  button, the selected jar picker chip, the selected sort chip's neighbor states,
  and the destructive confirm on "remove person". It is never a surface, never a
  border, never a label color. It appears on a screen only where a tap will
  change stored data.
- **Cherry Deep:** the pressed-by-confirmation variant of the same red, used
  exactly once — the second step of removing a person from the shelf.

### Secondary

- **Honey Lamplight:** amber under glass, used for anything that reports rather
  than acts. Positive trend bars, the vertical week staff in the history feed,
  validation hints and error copy. It is also the fallback fill for a marble
  whose tag hue is missing from the set.
- **Seven BRAVING Hues:** muted ochre (Boundaries), slate blue (Reliability),
  mauve (Accountability), terracotta (Vault), teal (Integrity), dusty rose
  (Non-judgment), olive (Generosity), plus a desaturated stone for untagged
  marbles. All seven are held at similar lightness so no tag reads as more
  important than another; the seven are keyed by tag name in `lib/store.ts` and
  are the single source shared by every screen.
- **Untagged Stone:** the neutral a marble takes when it has no recognized tag,
  so "no tag" never reads as a tag.

### Tertiary

Omitted: this system has one accent family (cherry), one reporting family
(honey), and one data family (tag hues). A third accent would compete with both
action and meaning.

### Neutral

- **Espresso Ground:** the page canvas, plus the field fill on the shelf screen.
  Every screen's `contentStyle` is this color.
- **Board:** the shelf boards, composer, trend board, and closed-chapter banner —
  one step up from the ground so wood sits on wood.
- **Board Raised:** the selected state of a tag field, one step further up.
- **Hairline:** 1px–3px borders, the feed's connector stems, and the divider
  between trend bars and tag split. Warm, low-contrast, never black.
- **Shelf Edge:** the 5px bottom lip on a shelf board. This is the thickness of
  the board itself, the only hard edge in the system.
- **Ink:** primary text on dark — names, counts, section headings, slip words.
- **Ink Soft:** secondary text on dark — ledes, labels, vessel hint, ghost
  button text.
- **Ink Faint:** tertiary text on dark — placeholders, quiet button text, empty
  states, sort labels.
- **Paper:** the slip surface. **Paper Deep:** the same slip darkened for a
  removal. **Paper Ink:** text and marks on paper. **Paper Soft:** the small
  meta line on a slip (who, tag, day).
- **Cream:** the brightest step, reserved for text sitting on cherry.
- **Empty Ring:** the stroke color of a marble slot with nothing in it.

### Named Rules

**The Cherry Rule.** Cherry red fills the surface of a live action or a selected
target — nothing else. It is never a border, a header, a heading, a divider, a
data mark, or a decorative accent. If a screen shows no live action, it shows no
cherry.

**The Glass Rule.** A BRAVING hue may appear as glass (marble dots, chart bars,
split-track segments, legend dots, pins) or as the fill or lit edge of its own
tag row. It may never color a board, a page, a header, a navigation element, a
button, or a run of body text. Seven hues at once must never form a background.

**The Espresso Rule.** Every surface is a warm dark: ground, board, board-raised.
There is no light theme and no neutral gray anywhere in the chrome. Light color
means paper, and paper means a single moment's words. Note that
`app.json` sets `userInterfaceStyle: automatic` but ships no light tokens — the
system is dark by construction, not by preference.

## Typography

**Display Font:** Bricolage Grotesque (700 Bold)
**Body Font:** Karla (400 Regular, 600 SemiBold, 700 Bold)
**Handwriting Font:** Caveat (600 SemiBold)

**Character:** Bricolage Grotesque is a slightly wonky, tightly-fitted
grotesque; set large, it behaves like a hand-lettered shop sign, which is what a
jar name on a shelf should feel like. Karla is an even, slightly narrow
workhorse that stays quiet at small sizes on a dark ground. Caveat appears in
exactly two places — a slip's words and the closing sign-off — and carries every
human sentence in the product. All three are bundled via
`@expo-google-fonts` and gated behind the splash screen, so there is no
first-paint fallback face.

### Hierarchy

- **Display** (Bricolage Grotesque 700, 44px / 46px, -0.01em): the person's
  name as page title on the jar screen. The largest type in the product, set
  above a 208px-wide glass vessel.
- **Headline** (Bricolage Grotesque 700, 40px / 42px, -0.01em): "Whose jar are
  you filling?" on the shelf, plus 30px for a shelf board's jar name and 20px on
  the not-found screen. Also the native stack header title at 19px.
- **Title** (Bricolage Grotesque 700, 22px): section headings and sub-headings —
  "Log a moment", "Moments, by week", "This week on the shelf", "Jar no. 3 ·
  collecting" — and 18px for week headers in the history feed.
- **Body** (Karla 400, 16px in fields / 15px ledes, 13–14px for meta, hints,
  empty states and confirm copy; 20–22px line height): all reading copy. Longest
  measure is the 300px vessel hint; normal body copy stays under ~70
  characters per line at phone widths.
- **Label** (Karla 600, 12.5–14.5px): counts ("15 of 20 · 75%"), field labels,
  chip text, tag glosses, legend names. Karla 700 at 15–16px is reserved for
  button labels, so weight distinguishes a tappable label from a static one.
- **Hand** (Caveat 600, 20px / 24px in slips; 24px for the closing sign-off):
  the moment's own words, and the sign-off. Nothing else.

### Named Rules

**The Slip Rule.** A moment's words are always set in Caveat on paper. If a
moment's reason is being read inside the chrome — never happens today — it would
be a violation of the world, not a variant of it.

**The Three Ink Steps Rule.** Text on dark picks from exactly three inks:
`ink` for what you read, `ink-soft` for what you scan, `ink-faint` for what is
only there. Never introduce a fourth step or brighten an existing one for
contrast.

## Layout

Single column, no grid, no sidebar, no tab bar. Both routes are scroll views
capped at `maxWidth: 880` and centered, so the shelf reads as a bounded board on
a wide screen and as a full-bleed column on a phone. Page padding is 20px
side/horizontal, 26px top on the shelf and 14px on the jar screen, and 56px
bottom so the last slip is never flush against the screen edge. Vertical rhythm
is one scale: 6, 8, 10, 12, 14, 16, 18, 20, 22, 26, with 18–22px reserved for
the gap that opens a new band of content.

Vertical order on the shelf is the order of use: question, composer, the last
seven days, then the shelf itself (add field, search, sort, boards). The primary
action — logging a moment — is above the fold and never behind navigation. On
the jar screen the order is: name and count, the vessel, chapters, the week
chart and tag split, the log composer, then the history feed, then the sign-off.

Rows wrap rather than scroll where they can: the jar picker, the seven tag dots,
the sort chips and the BRAVING legend all `flexWrap`. Only two things scroll
horizontally, both deliberately: the chapter strip on the jar screen
(`showsHorizontalScrollIndicator={false}`) and nothing else.

Density is high on the history feed — slips sit 12px apart under a 3px week
staff — and low everywhere else. The shelf shows at most 6 fresh marbles in the
week ribbon and at most 20 jars' worth of hue lookups per refresh.

## Elevation & Depth

This system uses shadows, and they are all the same shadow: pure black, low
opacity, generous blur, offset downward only. They read as lamplight falloff
onto a wooden board, not as cards floating in space. There is no ring, no
1px-bright edge used as a fake shadow, and no upward offset anywhere. Depth is
otherwise carried tonally — board over ground, board-raised over board — and by
one hard edge per board: the 5px `shelf-edge` lip on the bottom of a shelf board,
which is wood thickness, the one deliberately hard mark in the world.

Every shadow in the build is the same family, with blur scaling with the size of
the thing it lifts: a 13px magnet pin gets radius 3, a paper slip gets radius 10,
a composer gets radius 16, and the glass vessel gets radius 18.

### Shadow Vocabulary

- **Pin shadow** (`0 2px 3px rgba(0,0,0,0.4)`, elevation 2): magnet pins on a
  slip and on a tag field. Smallest object in the system, smallest falloff.
- **Slip shadow** (`0 4px 10px rgba(0,0,0,0.35)`, elevation 3): paper slips. The
  workhorse — every moment in the history feed carries it.
- **Board shadow** (`0 5px 14px rgba(0,0,0,0.4)`, elevation 3): shelf boards.
- **Composer shadow** (`0 6px 16px rgba(0,0,0,0.4)`, elevation 4): the shelf's
  quick-log composer and the jar screen's trend board region reads at this level.
- **Vessel shadow** (`0 8px 18px rgba(0,0,0,0.45)`, elevation 4): the glass jar,
  the one object that is allowed the deepest falloff because it is the tallest.
- **Gloss highlight** (`rgba(255,246,224,0.75)`, a 34% inset circle offset to the
  upper-left): not a shadow but the same lighting model. Every filled marble dot
  wears one. Unfilled slots get a 1.5px `empty-ring` stroke and no gloss.

## Shapes

Two silhouette families, and the difference is material.

**Circles** are glass and pins: marble dots (15px on the shelf, 21px inside the
vessel), magnet pins (13–14px), feed marks (15px, filled for a kept marble, a
2.5px ring for a removed one), legend dots (11px), trend bars (20px wide, 10px
radius). Any dot that represents a marble is a circle with a gloss; any dot that
represents capacity is a ring.

**Rounded rectangles** are wood and controls: 26px for the jar vessel, 20px for
boards and the composer, 14px for fields, buttons, tag fields and banners, 99px
(pill) for chips, sort controls, tag dots, chapter pills and the split track.

**Paper is the exception:** a slip is 6px — nearly square, like a torn-off note
tacked to a board. If paper and wood shared a radius, the slips would stop
reading as paper.

Borders are structural, not decorative: 1px hairline on boards, fields and
banners; 1.5px hairline on ghost buttons, chips and pills; 2px on tag fields
(2.5px on feed rings); 3px on the jar vessel's ink outline and neck. There are
no gradient fills anywhere in the product.

## Components

### Buttons

- **Shape:** 14px radius, always. Height comes from `paddingVertical` 15px for
  a full-width action, 10px for an inline one.
- **Primary (cherry):** the "+ Kept one" action in both composers, "Add" beside
  the add-person field, "Save" in the rename editor, and "Save" in the
  complete-a-moment editor. Cherry fill, cream label, Karla 700 at 15–16px,
  centered.
- **Pairing (the add/remove pair):** `+ Kept one` (cherry, filled) sits beside
  `− Broke one` (hairline outline, `ink-soft` label) at identical `flex: 1` and
  identical padding. The pair is one honest row; removal is never styled as
  failure — no red outline, no warning icon, no disabled state.
- **Destructive (cherry deep):** the second step of "Remove" on a shelf board,
  inside a confirm box that first states exactly what goes with the person.
- **Quiet:** "Rename", "Remove", "Cancel", "Keep", "Add the why", "Show more" —
  `ink-faint`, Karla 600, no fill, no border, `hitSlop` 6–12px.
- **Pressed:** opacity 0.75 everywhere (0.8 on tag fields). No scale, no color
  shift, no ripple.

### Chips (pills)

- **Jar picker / sort / chapter pills:** 99px, 1.5px hairline, transparent at
  rest with `ink-soft` label; selected fills with `ink` and switches its label
  to `ground`, so selection reads as lamplight rather than as color. The shelf's
  jar picker is the one exception: its selected state fills cherry, because
  choosing a jar is a live action.
- **Tag dots (shelf composer):** 99px, transparent with a 2px transparent
  border at rest, each carrying a 13px hue ball and a 12.5px `ink-faint` tag
  name; selected switches the border to the tag's own hue and the name to `ink`.
  No fill, ever — the composer reads as a row of beads, not as buttons.
- **Tag fields (jar screen):** the full-bleed alternative. Each BRAVING row
  floods with its own hue at rest, with `paper-ink` label and gloss and a
  `rgba(43,30,17,0.55)` pin; the chosen row goes to `board-raised` with `ink`
  label and the hue kept as a 2px lit edge and a solid pin. 44px tall,
  14px radius, 10/14 padding, 8px between rows.

### Cards / Containers

- **Shelf board:** `board`, 20px radius, 18px padding, 1px hairline, the 5px
  `shelf-edge` bottom lip, and the board shadow. Contains the jar name (30px
  display), the count line (13.5px semi), the twenty marble dots, and the quiet
  actions.
- **Composer:** `board`, 20px radius, 16px padding, 1px hairline, composer
  shadow. The only framed control group on the shelf.
- **Jar vessel:** 208px wide, 3px `ink` outline, 26px radius, a 120px neck bar
  with rounded bottom corners (10px), and an interior of `rgba(245,233,210,0.05)`
  — lamplight in glass, not a lighter theme. Dots fill bottom-up so the oldest
  marble settles at the bottom.
- **Confirm box / chapter banner:** recessed back to `ground` or `board`,
  14px radius, 12–14px padding, 1px hairline.

### Inputs / Fields

- **Style:** 14px radius, 1px hairline, `paddingVertical: 13px`,
  `paddingHorizontal: 14px`, 16px Karla, `ink` text with `ink-faint`
  placeholder. Fill is `ground` on the shelf and `board` on the jar screen — a
  field is always one step darker than the surface it sits on.
- **Focus:** no glow, no border shift. The caret and the `ink` text are the
  entire focus language.
- **Label:** "BRAVING tag" as a Karla 600 13.5px `ink-soft` label above the
  field group, 12px above and 8px below.
- **Error / disabled:** no disabled state exists. Validation is a single honey
  hint line below the control with `accessibilityRole="alert"`: "Give the moment
  a few words and a BRAVING tag — every marble has a why."

### Navigation

- **Native stack header** (`app/_layout.tsx`): ground background, `ink` tint,
  `headerShadowVisible: false` — the board edge is the only divider in this
  world. Titles are Bricolage Grotesque 19px; the screens themselves set their
  own larger display headings, so the header title is a small locator, not a
  headline.
- **Back:** a typographic `‹` at 34px in `ink`, `hitSlop: 12`. No icon library,
  no arrow glyph font — the product ships zero SVG or icon-font glyphs.
- **Deep link:** a shelf board is a `Link` wrapping the whole board, labelled
  "{name}, {count} of 20 marbles".

### Marble Dots (signature)

Twenty slots, always twenty, in a wrapping row with a 7px gap. Filled slots take
the hues of the newest marbles first and fall back to honey when the hue list
runs short; unfilled slots are a transparent 1.5px `empty-ring` ring. Every
filled dot wears a gloss circle at 34% of its diameter, inset to the upper-left.
On the shelf the row fills left to right; inside the vessel it fills bottom-up
with the order mirrored, so the pile settles oldest-first. The whole row carries
one accessibility label.

### Paper Slip (signature)

One moment, one piece of paper: 12px padding (10px top), 6px radius, a 13px
magnet pin in the tag hue with its own small shadow, the reason in Caveat 20px
`paper-ink`, and a 12px `paper-soft` meta line carrying the sequence and the day
(`+1 · Integrity · Mar 4`, or `−1 · untagged · Mar 4`). A removal prints on
`paper-deep` at 0.82 opacity with the words struck through in a warm brown.
The slip falls back to "Marble added" / "Marble removed" when no reason was
written, so the feed never shows an empty rectangle.

### Week Chart & Tag Split

The trend is a bar chart, not a ring: 20px bars on a 120px floor, honey for a
positive week, cherry for a negative one, and a 4px `ink-faint` bar at 30%
opacity for an empty week. It appears only after two or more active weeks;
before that the copy says so. Below a 1px hairline divider, the BRAVING split is
a single 10px pill track whose segments take each tag's hue in fixed BRAVING
order, with a legend of hue dot, tag name, and `+added · −removed`.

### Motion

Arrival only, via Reanimated. Shelf boards enter with `FadeInDown`, 420ms,
staggered 60ms and capped at the sixth board. A just-logged marble enters with
`ZoomIn`, 380ms. The closing sign-off fades down over 400ms. There is no
repeating animation, no shimmer, no bounce, and nothing that draws the eye back
to a control after a tap. Press feedback is a single opacity step.

## Do's and Don'ts

### Do:

- **Do** set a person's name in Bricolage Grotesque at 40–44px and let it carry
  the screen alone. Headings carry their own weight; there is no eyebrow,
  kicker, or overline anywhere in the product.
- **Do** build hierarchy from ink → ink-soft → ink-faint and from board over
  ground before reaching for any other device.
- **Do** give every `Pressable` an `accessibilityRole`, an `accessibilityLabel`
  that includes the count or state, and a `hitSlop` of at least 6px.
- **Do** draw a removal as an honest mark: an open ring, a cherry down-bar, a
  darkened slip with struck-through words, and a `−1` in the meta line.
- **Do** reserve cherry for the surface of a live action or a selected target,
  and pair add/remove as two equal halves of one row.
- **Do** fill a tag row with its own hue and keep the hue as the lit edge when
  the row is selected.
- **Do** write a real sentence for empty states — "The shelf is bare. Add
  someone above — the first marble is a small kept promise away."
- **Do** keep the twenty-dot row and the count line as plain text; the jar's
  state is legible without a single chart.

### Don't:

- **Don't** add a streak counter, score, achievement, progress ring, or
  leaderboard. The product's stated position is reflection over scoring; a count
  exists to be read, not graded.
- **Don't** put a BRAVING hue on a board, header, button, or run of body text, and
  don't flood a surface with more than one tag hue.
- **Don't** brighten the palette to fix a contrast problem. Fix it with the three
  ink steps, a hairline, or a shadow.
- **Don't** render a moment's words in Karla, or a heading in Caveat. Chrome and
  handwriting never swap roles.
- **Don't** use a hard offset shadow. The one hard edge in the system is a
  shelf board's 5px wood lip; everything else falls off with real blur.
- **Don't** introduce a light theme or a neutral gray. `userInterfaceStyle:
  automatic` ships no light tokens, and it must stay that way.
- **Don't** add icon-font or SVG glyphs. The product's only marks are circles,
  the typographic `‹`, and the `+` / `−` on the log pair.