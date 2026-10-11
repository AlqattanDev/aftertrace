# AFTERTRACE

Steal a curious treasure, then solve the case you just created. AFTERTRACE is a small, single-player gallery mystery: choose an entrance, time three heist actions, hide the treasure, and return as the detective. The clues come from your actual choices in the same room.

Search the gallery for a boot tread, a scarf fiber and a dropped charm. Recover the treasure and match the clues against three suspects. Clean timing, a quick investigation and a correct accusation earn a higher score and up to three stars. Each solved case unlocks the next of six treasures; solving on the first guess keeps your streak going.

Tap or click the large actions and gallery spots. Keyboard users can focus the controls with Tab and activate them with Enter or Space. The layout is designed for portrait phones and desktop browsers. Sound starts after an interaction; its mute setting and your best results stay on this device.

## Develop

```sh
npm ci
npm run dev
npm test
npm run build
```

TypeScript strict, Three.js and Vite. `src/rules.ts` owns the pure case and scoring rules; `src/main.ts` connects the interface and local records; `src/scene.ts` builds the gallery; `src/audio.ts` synthesizes the sound effects. Geometry, interface art and sound are authored in code. The bundled Barlow fonts include their OFL license under `public/fonts/`.

For the optional browser regression suite, install Chromium with `npx playwright install chromium`, then run `npm run test:browser`. An existing browser can be selected with `BROWSER_PATH=/path/to/chromium`. After the showcase build, `QA_SHOWCASE=1 npm run test:browser` checks the actual deployment base.

## Showcase deployment

```sh
npm run build:showcase
```

This builds `.exidex/play/` with the base URL `/aftertrace/play/`. Commit that generated folder: it is the deployed game. `.exidex/index.html` links to `./play/` and uses the site's shared showcase stylesheet. The separate arcade thumbnail and screenshots are maintained by the site owner.

Completed cases call the optional `window.arcade?.submit({ score, meta })` integration. Higher scores are better. The game also works without that script and stores local records under keys beginning with `aftertrace`.
