# AFTERTRACE: current implementation brief

This replaces the original district-simulation brief. The current game is a short gallery heist followed by an investigation of the same events.

## Preserve the hook

The selected entrance, pedestal and hiding place create the clues the detective later finds. Keep world truth separate from discovered clues. The disguised culprit must be identified from the case evidence and suspect profiles.

## Keep the loop approachable

Start with one large action. Teach the three heist timing actions as they appear. Then guide the player through searching the gallery, recovering the treasure and identifying the culprit. Use one short contextual instruction at a time. Errors should permit recovery; clues, timing and speed contribute to a clear score and stars.

## Keep the gallery coherent

Use the Toymaker's Gallery direction in `DESIGN.md`: colorful miniature geometry, clear prop silhouettes, short tactile effects and large readable controls. Touch in portrait and keyboard access are first-class requirements. Geometry, SVG and synthesized audio remain local to the game.

## Keep delivery reproducible

Pure case and scoring rules belong in `src/rules.ts` with tests. Keep `npm test`, `npm run build` and `npm run build:showcase` working. The final command writes `.exidex/play/`, which is committed for deployment. Preserve the `aftertrace` slug, guarded arcade submission and local best records. Do not replace the site's separately maintained thumbnail, card metadata or screenshots.
