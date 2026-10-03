// BRAVING voice: one gloss per tag, shared by the shelf composer and the
// jar room so the language never drifts between screens.
import { BRAVING_TAGS } from "../lib/store";

export const TAG_GLOSSES: Record<string, string> = {
  Boundaries: "What's okay and what's not — stated clearly.",
  Reliability: "Do what you say, again and again.",
  Accountability: "Own mistakes, make amends.",
  Vault: "Keep confidences; don't share what isn't yours.",
  Integrity: "Choose right over easy, even unseen.",
  "Non-judgment": "Listen without ranking or shaming.",
  Generosity: "Assume the best possible motive first.",
};

export const TAG_ORDER: string[] = [...BRAVING_TAGS];
