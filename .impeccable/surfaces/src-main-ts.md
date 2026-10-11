---
version: 1
slug: "src-main-ts"
primary_target: "src/main.ts"
related_targets: ["src/style.css", "src/scene.ts", "src/audio.ts"]
---

# Game surface

Mode: Experience. Scope: short gallery heist, detective search, suspect comparison and result. The user delegated a full redesign and routine decisions, so this session uses a code-led implementation without a confirmation gate. That is a decision for this task, not a saved default for future work.

## Direction contract

THESIS: A tiny heist becomes a satisfying mystery when you follow the trail you created.

OWN-WORLD: The Toymaker's Gallery. Saturated lilac and lavender cutaway architecture, pale peach stone, deep plum outlines, brass treasure details, mint plants and restrained coral accents. Authored geometry and SVG share clear, rounded silhouettes.

STORY: Choose an entrance, time the lift, hide a treasure, switch roles, recover it and identify the culprit from the same three clues.

FIRST VIEWPORT: One dominant start action, a clear title and an inviting gallery. Play keeps the room visible, gives one short contextual instruction and places large actions within thumb reach. Portrait is primary; mouse and keyboard are equally supported.

FORM: Fourth grounded direction, seed `306215a6`. This replaces the previous brick-district direction. The seed material lacks challenger comparisons and rendered boards; that limitation is recorded here and does not constitute visual approval. The representative implementation and browser evidence decide whether the result is ready.

FINISH: Keep the final rule tests, browser observations, bundle report and limitations in the delivery PR. Confirm coherent prop silhouettes, clue readability, complete interaction paths, sound/mute behavior and reduced-motion treatment. Keep the owner's existing arcade thumbnail, card metadata and screenshots untouched.

## Recorded interface tokens

Ink `#342743`; muted text `#695779`; canvas `#e9dff4`; paper `#fffaf0`; panel `#f7f0fc`; violet `#7254a0`; deep plum `#49345f`; gold `#f3bb4c`; mint `#407867`; coral `#d86865`; line `#cdbfda`. Barlow 400/600/700 body and controls; Barlow Condensed 700 title. Primary minimum height 60 pixels on desktop, 58 in portrait and 52 in short landscape; utility controls 48 pixels (44 in short landscape); control radius 14 pixels, easing `cubic-bezier(.16,1,.3,1)`.
