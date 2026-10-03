---
version: 1
slug: "app-index-tsx"
primary_target: "app/index.tsx"
related_targets: []
---

# Surface brief: home (`app/index.tsx`, route `/`)

Scope: home route only. Mode: Operate.
Audience/job: the individual trust-tracker opening the app to find a jar or start one.
Action: search, sort, open, rename, remove. Proof: real people + live counts from `lib/store`.
Constraints: Sunlit Shelf world (DESIGN.md) unchanged; local-only; portrait single column; web + Android.

Chosen direction: the shelf of jars. Person cards keep their exact language (white, 18px, single card-rest shadow, 16px padding, name/count row + amber track). Header gains search-by-name and sort (recent activity / fullest / name; provisional default: recent activity). Rename inline on the card; remove-person behind a destructive confirm naming what dies with it. Calm at 2–6 jars, carries 20+.
Memorable moment: none — this surface is a shelf, not a story. Its craft is spacing and order.

Unresolved: default sort is provisional (recent activity); user may flip it at review.
FINISH: ends with finish review + detector pass on changed targets; no DESIGN.md change.
