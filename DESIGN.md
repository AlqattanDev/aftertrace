---
name: Aftertrace
description: A warm miniature brick district with compact navy casework controls.
colors:
  yellow: "#edc66d"
  ink: "#edf0e8"
  line: "#405361"
  button: "#2a4050"
  button-hover: "#3b5261"
  button-active: "#516775"
  primary-ink: "#233344"
  primary-hover: "#f7d992"
  danger-ink: "#edb49f"
  danger-bg: "#3a3637"
  hud-panel: "#1b2d3cf5"
  world-navy: "#1c3043"
  world-yellow: "#eec66c"
  world-trim: "#b8a78d"
  world-roof: "#364653"
  window-warm: "#d8b475"
typography:
  headline:
    fontFamily: "Barlow Condensed, sans-serif"
    fontWeight: 600
  title:
    fontFamily: "Barlow, sans-serif"
    fontSize: "15px"
    fontWeight: 600
  body:
    fontFamily: "Barlow, sans-serif"
    fontSize: "14px"
    lineHeight: 1.5
  control:
    fontFamily: "Barlow, sans-serif"
    fontSize: "15px"
    fontWeight: 600
rounded:
  compact: "4px"
  control: "5px"
  dialog: "6px"
spacing:
  compact: "5px"
  inline: "15px"
  control-x: "16px"
  row: "20px"
components:
  button:
    backgroundColor: "{colors.button}"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "12px 16px"
  button-primary:
    backgroundColor: "{colors.yellow}"
    textColor: "{colors.primary-ink}"
    rounded: "{rounded.control}"
    padding: "12px 16px"
  button-danger:
    backgroundColor: "{colors.danger-bg}"
    textColor: "{colors.danger-ink}"
    rounded: "{rounded.control}"
    padding: "12px 16px"
  objective:
    backgroundColor: "{colors.hud-panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "15px 18px"
---

# Design System: Aftertrace

## Overview

**Creative North Star: "The district remembers"**

A navigable miniature brick district carries the visual identity: warm windows, slate roofs, faceted trees and long navy shadows. Compact dark controls sit over the world; case sheets use quiet rules and readable sentences. The world remains spatially present while the player moves, chooses and reads.

This is a scan of the implemented world in `src/style.css`, `src/main.ts` and `src/scene.ts`, checked against the desktop, landscape phone, portrait, introduction and outcome captures under `.impeccable/review/`. The brief pinned the materials; no reference image or approved comp was available. All world forms are generated geometry; signs use runtime text canvases. There is no shipping raster artwork.

**Key Characteristics:**
- Orthographic geometry and warm architectural detail.
- Compact navy panels with restrained yellow actions.
- Condensed headings paired with plain sentence text.
- Evidence and provenance arranged in ruled rows.

## Colors

Warm mineral surfaces and pale window light contrast with cool navy structure; yellow supplies the actionable foreground.

### Primary
- **Interaction yellow** (`yellow`): primary buttons, objective headings, focus outlines and item icons.
- **World beacon yellow** (`world-yellow`): repeated rings, the payphone and door details. Preserve its separate scene value; lighting changes its appearance.

### Secondary
- **Warm window** (`window-warm`): repeated front-facing window panes, with emissive amber light.
- **Architectural trim** (`world-trim`): repeated sills, roof edges and river rail posts. Brick body colors vary by building; those individual colors are not global tokens.

### Neutral
- **Ink** (`ink`): pale primary interface text.
- **HUD panel** (`hud-panel`): nearly opaque navy for the objective and tool buttons.
- **Slate controls** (`button`, `button-hover`, `button-active`): interactive tonal steps.
- **Case rule** (`line`): shared dividers across sheets, evidence, requirements and history.
- **World navy and roof** (`world-navy`, `world-roof`): structural frames, clothing and repeated roof planes.
- **Reset treatment** (`danger-bg`, `danger-ink`): subdued warm warning color used for new-world actions.

**The Shared Beacon Rule.** Yellow connects the primary action, destination labels and world rings; secondary controls remain slate.

## Typography

**Display Font:** Barlow Condensed, sans-serif fallback.
**Body Font:** Barlow, sans-serif fallback.

Both families are self-hosted under `/fonts/`. Condensed headings give the compact case sheets and entry panel a strong identity without crowding the playfield. Plain Barlow carries instructions and facts; tabular numerals keep clocks stable.

### Hierarchy
- **Headline:** condensed semibold across entry and sheet headings. Entry is 46px/1.03 on desktop; sheet titles are 30px/1.05. Responsive overrides reduce them to 35px and 25px in short landscape layouts. These are component sizes, not a modular ratio.
- **Title:** semibold body-family headings and objective titles; larger sheet subsections use 18px.
- **Body:** 14px recurs across sheet introductions, facts, requirements, outcome explanations and confirmation copy. Reading line heights range from 1.4 to 1.55; the body token records the recurring 1.5 treatment, not a universal override.
- **Control:** the root 15px size with semibold weight; compact tools, tabs and test controls use 12px.
- **Supporting text:** 11–13px for distances, evidence detail and secondary instructions. Keep these subordinate to complete action labels.

**The Two Widths Rule.** Use Barlow Condensed for prominent headings and Barlow for instructions, controls and evidence.

## Layout

The world canvas fills the viewport without page scrolling. HUD elements anchor to safe areas rather than a content grid. Default left/right offsets are the greater of 22px and the device inset; top is 20px and bottom 16px. Movement and contextual actions occupy opposite lower corners. The objective stays below the title, while the minimap and tool cluster sit at the upper right.

At widths up to 1050px, HUD panels shrink and tool text hides. At landscape heights up to 540px, safe offsets shrink to 16px horizontally, 12px above and 8px below; controls and typography become denser. The case drawer changes from a maximum 470px desktop width to `min(420px,62%)` in short landscape. Portrait stacks the phase under the title, puts tools in a vertical rail and makes the drawer full width. The drawer body scrolls independently while its heading stays visible.

Repeated spacing is compact between adjacent controls, wider between icon/text columns and generous between ruled evidence rows. Use the recorded spacing where the component calls for it; there is no universal grid multiplier. The scene camera changes vertical span from 25 world units in landscape to 32 in portrait.

## Elevation & Depth

Real geometry, rough materials, warm directional light and soft cast shadows establish the district's depth. Roofs, sills, brick courses, awnings and faceted foliage provide detail without photographs. Nearly opaque navy panels preserve text contrast; their slight translucency and diffuse shadows separate them from the city. There is no backdrop blur. The district remains visible behind welcome and confirmation overlays.

### Shadow Vocabulary
- **HUD ambient** (`0 6px 24px #18263133`): shared by objective and minimap.
- **Drawer separation** (`-10px 0 50px #0c21374d`): the reading sheet's separation from the scene.
- **Entry lift** (`0 14px 55px #11263755`): the introduction panel.

**The Visible Walker Rule.** Buildings between the camera and player fade so movement stays legible within the district.

The camera follows with exponential interpolation; walking animates limbs and the destination ring pulses subtly. UI background changes take 150ms; toast opacity and position take 200ms. Reduced-motion CSS disables interface transitions. Scene animation currently continues under that preference; this is a limitation, not a rule for future surfaces.

## Shapes

Rectangular HUD surfaces use small softened corners. Compact phase labels and selects use the compact radius, regular buttons and panels use the control radius, and dialogs use the dialog radius. Ruled destination and evidence rows stay square and flat. Circles identify the joystick, player and destination; they are functional spatial markers rather than a universal container shape. Interface icons are thin rounded SVG strokes.

## Components

### Buttons

Compact, solid and direct. Base buttons use the recorded padding and radius with a 46px minimum height. Primary buttons use warm yellow with dark ink, often with a right arrow; secondary buttons use slate. Hover and active states change the background, and disabled controls reduce opacity to .58. Keyboard focus is a 3px yellow outline with a 3px offset. Reset buttons use the subdued warning variant. Their backgrounds remain fixed on hover in the current stylesheet.

### Inputs / Fields

The native suspect select spans the sheet, with 14px padding, a 48px minimum height, a compact radius, a slate fill and a visible border. It shares the yellow keyboard focus treatment. No text-field system is implemented.

### Navigation

The tool cluster uses inline SVG icons, optional labels and small counts. Labels disappear in compact viewports; portrait stacks the cluster. Case tabs share available width; the selected tab uses yellow text on a lighter slate fill. Destination rows use a sentence label, supporting note and yellow distance, separated by fine rules.

### Cards / Containers

The objective is a compact dark panel with a highlighted title, sentence instruction and supporting distance. Intro and confirmation containers use the dialog radius and larger padding. The case drawer uses a fixed header, scrolling body and ruled rows instead of nested cards.

### Evidence and Outcomes

Evidence rows pair a yellow SVG icon with a title, detail and optional full-width test buttons. Facts, requirements, outcome reasons and history reuse fine horizontal dividers. Outcome titles and explanations stay in the same reading sheet; the optional event history expands below a primary control. Met/missing requirements are labeled in text as well as colored. After closure, suspect comparison disables another arrest and offers a return to the district; the unsolved control is hidden.

### Movement and Contextual Actions

A translucent circular joystick has a warm solid thumb control. Nearby actions form a short vertical stack: the first action is yellow and later actions navy. Full action text remains visible, with an optional smaller detail line and right arrow. Desktop action buttons are at least 56px high, reducing to 48px in short landscape. The empty state explains how to reach an interaction. World labels project from the destination and use the same yellow beacon language.

## Do's and Don'ts

### Do:
- **Do** preserve the warm brick, window light and navy structural contrast.
- **Do** use sentence text and ruled rows for case evidence and outcomes.
- **Do** retain simultaneous movement and action areas, safe-area offsets and visible keyboard focus.
- **Do** use inline SVG line icons for interface controls.

### Don't:
- **Don't** replace the navigable geometry with a flat scene image.
- **Don't** use the warm primary action treatment for every control.
- **Don't** treat tiny decorative copy or the runtime generic sign font as reusable typography.

Not canonized: the decorative brand tagline/eyebrow, 6–9px microcopy, generic sans-serif canvas signage and scene motion under reduced-motion preference remain build limitations; they do not establish reusable typography or accessibility rules.
