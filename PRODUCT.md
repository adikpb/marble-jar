# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Individuals tracking trust in their personal relationships — friends, partner, family. They open the app in everyday moments to log a small kept or broken promise, and return periodically to reflect on how a relationship is trending.

## Product Purpose

Marble Jar makes small trust moments visible and discussable. Every kept promise adds a marble to someone's jar; every broken one removes one. Each marble carries a reason and a BRAVING tag, turning vague feelings about trust into a concrete, reviewable record. Success means a user can look at a jar and honestly answer "how are we doing?" — and have the moments to back it up.

## Positioning

A trust ledger built on the marble-jar metaphor and the BRAVING taxonomy (Boundaries, Reliability, Accountability, Vault, Integrity, Non-judgment, Generosity). A notes app can hold reflections and a habit tracker can count streaks, but neither ties individual moments to a named trust framework and a per-person jar with a fixed capacity — that combination is what a neighboring product could not truthfully copy.

## Operating Context

Personal, private use: logging moments soon after they happen and reviewing jars as a reflection ritual. Runs as a web/PWA build (iOS users use the web build) with a native Android APK as packaging of the same product. No teams, roles, or shared workflows — one person, their relationships, their device.

## Capabilities and Constraints

- Per-person jars: add a person, view their jar as count of 20 plus percentage with a progress fill.
- Marbles carry a reason plus a BRAVING tag (`Boundaries`, `Reliability`, `Accountability`, `Vault`, `Integrity`, `Non-judgment`, `Generosity`); removals are first-class, not just additions.
- Fixed jar capacity: `JAR_CAPACITY` is 20 (see `lib/store.ts`).
- Local-only data today: expo-sqlite on native, localStorage on web; no accounts, no backend, no sync.
- Routes: `/` (jar list) and `/person/[id]` (single jar), via Expo Router.
- Shipping: Android APK built by GitHub Actions (`.github/workflows/android.yml`), web/PWA published to GitHub Pages (`.github/workflows/pages.yml`).
- Explicitly undecided: whether sync, sharing, reminders, or any multi-device story ever exists; whether the 20-marble capacity is tunable.

## Brand Commitments

Name "Marble Jar" (slug `marble-jar`, scheme `marblejar`). Established in-app voice, preserved verbatim: "Small moments, collected" / "Whose jar are you filling?" / "Trust is a marble jar — every kept promise adds a marble." No logo, palette, type, or other identity commitment recorded beyond this copy.

## Evidence on Hand

Real product content: the seven BRAVING tags and the 20-marble capacity, both in `lib/store.ts`. No testimonials, case studies, press, benchmarks, pricing, or licensing claims exist — future work must not fabricate any.

## Product Principles

- Small moments over grand gestures: trust is built in everyday kept promises, and the product treats them as the unit of record.
- Every marble has a why: a count without a reason and a tag is not a memory and cannot be reflected on.
- Honesty includes removals: broken promises are logged, not hidden — the jar must be allowed to empty.
- Private by default: trust records live on the user's device; nothing leaves it unless the user explicitly decides otherwise.
- Reflection over scoring: the count serves the review conversation, never gamification or judgment of the other person.
