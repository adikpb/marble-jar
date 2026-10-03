---
name: Marble Jar
description: Warm paper, ink type, and amber marbles — a calm keepsake for tracking trust.
colors:
  marble-amber: "#E8A33D"
  pine: "#2E7D6F"
  ink: "#1E1B16"
  paper: "#FAF7F0"
  jar-cream: "#FFFDF7"
  card-white: "#FFFFFF"
  cocoa: "#5C564A"
  stone: "#8A8478"
  pebble: "#A39E93"
  marble-faded: "#B9B2A1"
  tag-boundaries: "#BE9A4E"
  tag-reliability: "#7C9DB4"
  tag-accountability: "#9A7FA8"
  tag-vault: "#BB7E5C"
  tag-integrity: "#5F9E97"
  tag-nonjudgment: "#BE8B93"
  tag-generosity: "#9AA064"
  sand-deep: "#E0D8C2"
  sand: "#E4DECF"
  sand-soft: "#E9E2D2"
  sand-faint: "#EDE6D3"
  sand-track: "#F0EAD9"
typography:
  display:
    fontSize: "30px"
    fontWeight: 800
  headline:
    fontSize: "28px"
    fontWeight: 800
  title:
    fontSize: "19px"
    fontWeight: 700
  body:
    fontSize: "15px"
    fontWeight: 400
  label:
    fontSize: "13px"
    fontWeight: 600
rounded:
  xs: "6px"
  md: "14px"
  lg: "18px"
  xl: "26px"
  pill: "99px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "20px"
components:
  button-home-add:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.md}"
    padding: "12px 20px"
  button-add-marble:
    backgroundColor: "{colors.pine}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: "14px 16px"
  button-remove-marble:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "14px 16px"
  input-field:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "12px 14px"
  chip:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.cocoa}"
    rounded: "{rounded.pill}"
    padding: "8px 13px"
  chip-active:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
    padding: "8px 13px"
  card-person:
    backgroundColor: "{colors.card-white}"
    rounded: "{rounded.lg}"
    padding: "16px"
  progress-track:
    backgroundColor: "{colors.sand-track}"
    rounded: "{rounded.pill}"
    height: "10px"
  progress-fill:
    backgroundColor: "{colors.marble-amber}"
    rounded: "{rounded.pill}"
    height: "10px"
---

# Design System: Marble Jar

## Overview

**Creative North Star: "The Sunlit Shelf"**

This is a keepsake, not a dashboard. The system renders trust as a physical thing — a glass jar on warm paper, filling with amber marbles — and every visual decision serves that metaphor: sunlit neutrals, ink type, one glowing accent, surfaces that layer like paper rather than float like panels. Density stays low and unhurried; a screen holds one jar, one form, one feed, with room to breathe between them.

Amber leads emotionally but never decorates chrome: it fills the jar, the progress bar, and every added marble, while ink and pine carry the actions. Type is the system stack set with weight contrast only — no custom faces, no color tricks for hierarchy. The result should feel like opening a well-kept notebook: private, honest, and calm.

**Key Characteristics:**
- Keepsake over dashboard: one jar per screen, generous whitespace, no dense data grids.
- Amber belongs to the marbles: the accent marks trust itself, never buttons or borders.
- Soft and tactile: generous radii (14–18px, pill chips), one soft card shadow, pressed-state dimming.
- Layered paper: depth from tonal neutrals and hairlines, not elevation.
- Honest record: removals and empty states are designed first-class, never hidden.

## Colors

Warm paper neutrals carry the surfaces, ink carries type and weight, and amber leads as the emotional accent on the marbles themselves.

### Primary
- **Marble Amber** (#E8A33D): jar fill, progress-bar fill, added-marble dots. The color of trust accumulating — it appears wherever marble count is visualized.

### Secondary
- **Deep Pine** (#2E7D6F): the solid "+ Marble" action on the jar screen. The one green in the system, reserved for the act of adding trust.

### Tags (shared identity)
- **Muted categorical hues** (Boundaries #BE9A4E · Reliability #7C9DB4 · Accountability #9A7FA8 · Vault #BB7E5C · Integrity #5F9E97 · Non-judgment #BE8B93 · Generosity #9AA064): one stable hue per tag, applied everywhere a tag is referenced — split segments and legend dots, selector chips (10px dot), completion rows (marker), feed meta tag names — from the single `TAG_HUES` mapping in `lib/store.ts`. Equal visual weight by construction (mid-tone, mid-saturation, colorblind-spread); Untagged stays Faded Marble. Hues never touch buttons, type emphasis, or chrome, and hue never carries meaning alone — names are always announced in words.

### Neutral
- **Warm Ink** (#1E1B16): primary type, dark button, jar outline, active chips. Near-black with warmth; the system's weight.
- **Sunlit Paper** (#FAF7F0): page and header background on both screens. The shelf everything sits on.
- **Jar Cream** (#FFFDF7): inside of the jar vessel. A half-step lighter than paper so the glass reads as glass.
- **Card White** (#FFFFFF): cards, inputs, chips, ghost button. Resting surface for interactive objects.
- **Cocoa** (#5C564A): secondary type — descriptions, hints, chip labels.
- **Warm Stone** (#8A8478): muted type — eyebrows, section headers, counts, meta, empty states.
- **Pebble** (#A39E93): input placeholders only.
- **Faded Marble** (#B9B2A1): removed-marble dots. Amber's ghost — a marble taken back.
- **Sand family** (borders and tracks): Deep Sand (#E0D8C2) for chips and the ghost button; Sand (#E4DECF) for inputs; Soft Sand (#E9E2D2) for cards; Faint Sand (#EDE6D3) for feed dividers; Track Sand (#F0EAD9) for the progress track.

### Named Rules
**The Amber Belongs to the Marbles Rule.** Amber (#E8A33D) marks marbles and their progress — jar fill, progress fill, added dots — and nothing else. It never backgrounds a button, borders a field, or decorates chrome; actions stay ink and pine. Its glow works because it is spent only on trust itself.
**The Tags Share No Rank Rule.** The seven tag hues are categorical: similar weight, stable per tag, shared everywhere a tag is referenced. They never encode importance — lightness never ranks — and they never replace words: every tinted tag is still named in text.

## Typography

**Display Font:** system stack (no custom faces ship with the app)
**Body Font:** system stack (same)

**Character:** Plain-spoken and weight-driven. Hierarchy comes from size and weight steps on the system font, never from decoration — secondary matter steps down to cocoa and stone rather than competing.

### Hierarchy
- **Display** (800, 30px): the home title ("Whose jar are you filling?"). One per app, never repeated.
- **Headline** (800, 28px): the person's name atop the jar screen.
- **Title** (700, 19px): person names on home cards.
- **Body** (400–500, 14–16px): descriptions (14px, 20px line-height), feed reasons (15px, 500), inputs (16px). 500 weight marks content with voice; 400 carries explanation.
- **Label** (600–700, 12–13px): eyebrows and section headers set uppercase with 1–2px tracking (eyebrow 12px/600/2px; section 13px/700/1px); counts, chip text, hints, and feed meta set sentence-case (12–14px).

### Named Rules
**The Weight-Carries-Hierarchy Rule.** No custom fonts, no colored type for emphasis, no size below 12px. If two texts compete, the more important one gets more weight or size — never a new color, never a new face. (Note: `constants/Colors.ts` template blues are dead code — only `Themed`/`EditScreenInfo` leftovers reference them. Neither real screen uses them; do not revive them.)

## Layout

A single portrait column with page padding (20px; 16px top on the jar screen) and a tight spacing rhythm (8–16px gaps). Home stacks eyebrow, title, description, add-row, then person cards with 12px gaps. The jar screen centers the vessel as its hero, then form, chip row, a two-up button row with 10px gap, then the history feed. Cards pad 16px; inputs pad 12–14px; feed rows divide with 1px hairlines and 10px vertical padding. The same column serves native and the static web export — no breakpoints, no multi-column behavior anywhere in the system.

## Elevation & Depth

Depth is tonal layering, not elevation: cream vessel on paper, white cards and inputs on paper, sand hairlines between. Exactly one shadow exists in the whole system — the resting person card (`#1E1B16` at 6% opacity, 12px blur, 0/4 offset, Android elevation 2). Everything else is flat.

### Shadow Vocabulary
- **Card rest** (`box-shadow: 0 4px 12px rgba(30,27,22,0.06)`): person cards on the home screen, and only them.

### Named Rules
**The Paper-Stack Rule.** Surfaces layer like paper — cream, white, sand — and shadows stay rare and ambient. Nothing besides the person card lifts; if a new surface needs emphasis, reach for a tonal step or a hairline before any shadow.

## Shapes

Controls are softly rounded (14px on buttons and inputs), containers a touch rounder (18px on cards and the jar body), and anything selectable in a row goes full pill (chips, progress track, the jar's shine stripe). The jar vessel is the deliberate exception to softness: a 3px ink outline with a heavier 5px rim and 26px top shoulders so it reads as glass holding something precious. Feedback is a pressed-state dim (opacity 0.75) — no scale, no spring.

### Named Rules
**The Soft Geometry Rule.** Everything a finger touches is round — 14px controls, 18px containers, pill selections. Corners never go sharp; the jar's ink outline is the one deliberate exception, and it earns it by being the product.
**The Vessel Has Weight Rule.** The jar is drawn, not decorated: 3px ink walls, 5px rim, cream glass, amber fill and a white shine stripe living inside it. Fill and shine never escape the vessel.

## Components

### Buttons
Three actions exist, each with one job. **Shape:** rounded (14px). **Home Add** (ink background, paper text, 12px/20px padding) sits beside the name input. **Detail Add** (pine background, white text, 700/16px, full-width half of the button row) adds a marble; **Detail Remove** (white background, 1px Deep Sand border, ink text) removes one. **Hover / Focus:** native pressed-state dim (opacity 0.75); web should answer hover the same way.

### Chips
BRAVING tag selectors in a horizontal scroll row with 8px gaps. **Style:** white background, 1px Deep Sand border, full pill, cocoa 13px/600 text, 8px/13px padding. **State:** selected inverts completely — ink background and border, paper text. No partial states.

### Cards / Containers
Person cards are the system's only lifted surface. **Corner Style:** rounded (18px). **Background:** white on paper. **Shadow Strategy:** the single card-rest shadow (see Elevation). **Border:** 1px Soft Sand. **Internal Padding:** 16px, with name/count on one baseline row and the 10px progress track 12px below.

### Inputs / Fields
One text field per screen (name, reason). **Style:** white background, 1px Sand stroke, rounded (14px), 12px/14px padding, 16px ink text, Pebble placeholder. **Focus:** border answers (ink on web); no glow, no icon, no label above — the placeholder and context carry it. **Error / Disabled:** none exist; validation is silent (empty submissions are ignored).

### Navigation
Expo Router Stack. Paper header background (#FAF7F0), ink back/title in bold, content on paper. Titles are plain nouns ("Marble Jar", "Jar") — the screens, not the chrome, do the talking. No tabs, no drawer.

### Jar Vessel (signature)
150×190 glass drawn in code: 3px ink walls, 5px rim, 26px top shoulders, cream interior, amber fill rising from the bottom by percent, white shine stripe at 65% opacity down the left. Below it, a centered 13px cocoa hint that changes with state (empty / remaining / full). This vessel is the product's face — reproduce it exactly before inventing any new visualization.

### Marble Feed (signature)
History rows: a 16px dot (amber ● added, Faded Marble ○ removed), reason in 15px/500 ink, meta line (+1/−1 · tag · date) in 12px stone, divided by 1px Faint Sand hairlines. Empty state is a centered stone line inviting the first marble — never a blank screen.

## Do's and Don'ts

### Do:
- **Do** keep amber on marbles and progress — count, fill, dots — and ink/pine on actions.
- **Do** use the Sand steps in order: Deep for selections, Sand for fields, Soft for cards, Faint for dividers, Track for progress beds.
- **Do** set secondary text in cocoa/stone rather than shrinking it below 12px or coloring it for emphasis.
- **Do** give every touchable the pressed dim (opacity 0.75) as its feedback.
- **Do** write empty states as invitations ("No jars yet. Add someone above…"), never blank space.
- **Do** keep removals visible in the feed with the ○ marker — the jar must be allowed to empty.

### Don't:
- **Don't** put amber on buttons, borders, or decoration — it belongs to the marbles.
- **Don't** add shadows beyond the person card or lift flat surfaces on hover.
- **Don't** introduce a custom font, accent colors beyond the seven shared tag hues, or template blue (#2f95dc) anywhere.
- **Don't** invent testimonials, counts, or claims in new surfaces — PRODUCT.md's evidence rule binds design too.
- **Don't** sharpen corners below 14px on touchables or replace the jar vessel with a chart.
