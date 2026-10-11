---
name: AFTERTRACE
description: A colorful cutaway toy gallery with clear clues and tactile controls.
colors:
  ink: "#342743"
  muted: "#695779"
  canvas: "#e9dff4"
  paper: "#fffaf0"
  panel: "#f7f0fc"
  violet: "#7254a0"
  deep: "#49345f"
  gold: "#f3bb4c"
  mint: "#407867"
  coral: "#d86865"
  line: "#cdbfda"
typography:
  headline:
    fontFamily: "Barlow Condensed, system-ui, sans-serif"
    fontWeight: 700
  body:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontWeight: 400
  control:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontWeight: 700
rounded:
  control: "14px"
  sheet: "22px"
  compactSheet: "20px"
  badge: "12px"
  notice: "10px"
  track: "8px"
  timingBand: "7px"
  label: "6px"
  needle: "4px"
---

# Design system: AFTERTRACE

## Toymaker's Gallery

A bright miniature gallery makes a tiny theft feel playful and readable. The cutaway room remains the same when the player switches roles. The entrance, treasure pedestal and hiding place visibly connect the heist to its evidence. Each prop has a distinct silhouette and an obvious tap target.

Lilac architecture and pale peach stone carry the room. Deep plum defines outlines and primary controls. Brass and gold emphasize the treasure and heist timing; mint distinguishes detective discoveries. Coral supplies a restrained secondary accent. Interface colors use the tokens above; lighting may change the apparent color of geometry.

## Composition

Portrait is the primary layout. Keep the current objective at the top, the gallery visible in the middle, and the next action within easy thumb reach. Show one short instruction for the current step. Evidence progress is persistent and explicit; it does not depend on remembering a color. A suspect comparison shows three understandable profiles with labeled clue traits.

The opening screen has one dominant start action. The heist introduces its three timing actions in sequence. The detective phase replaces that rhythm with observation and comparison. A clear reveal, score and stars close the case, followed by an obvious next case action and collectible progress.

## Type and controls

Use the existing self-hosted Barlow regular, semibold and bold for body text and controls, and Barlow Condensed bold for the title. System fonts are the fallback; the bundled fonts retain their OFL license. Numerals should remain stable while timers and scores change.

Primary controls are 60 pixels high on desktop, at least 58 in portrait and 52 in short landscape, with 14-pixel corners and generous spacing. Utility controls are at least 48 pixels, or 44 pixels in a short landscape viewport. The main sheet uses 22-pixel corners (20 on compact screens), while small clue labels and timing geometry use the smaller radii above. Both touch and keyboard can complete the case. Focus is visible, selected and disabled states use more than color, and important clue traits have readable words alongside their icons. Secondary copy must remain readable at phone size.

Secondary surfaces stay within the lilac family: hover `#dfd0ef`, selection `#e0d1ee`, disabled `#d5c8df` with ink `#665175`, and searched places `#ded4e7`. Evidence uses pale green `#e0ecdf` with dark green `#285a4b`; mistakes use `#f9e3de` with `#913638`. Gold labels use `#765016` for legibility. These are purposeful state colors, not extra categories.

## Feedback

Use brief eased travel, a small pop on a discovery, and a restrained burst for a solved case. The interface easing is `cubic-bezier(.16,1,.3,1)`. Reduced-motion preferences remove decorative travel and shaking while preserving the timing task's essential position indicator. Hidden tabs should pause active presentation and audio.

Sounds are small synthesized woodblocks, rising clue chimes and a gentle win arpeggio. There is no continuous music. Audio is initialized only after a user gesture; mute silences current and scheduled notes and is remembered by the interface.

## Assets and finish

The gallery uses authored Three.js geometry, and the interface uses local SVG. No shipping raster is needed for the new game. The separate showcase thumbnail and screenshots are preserved for the owner's later capture; the landing page no longer displays the outdated scene.

The delivery PR is the source for actual browser, build, bundle-size and performance evidence. This document defines the visual system and its intended behavior; it does not establish a physical-phone frame-rate measurement or the owner's approval of taste.
