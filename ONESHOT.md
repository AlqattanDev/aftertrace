# AFTERTRACE: GPT-6 one-shot build

You are GPT-6, the game director, world artist and implementation owner. Build a complete single-player crime-and-investigation game in a persistent miniature district. The player first creates a case as the criminal, then investigates the consequences as the detective. Deliver the actual playable game, with an exceptional visual identity, not a report or a static diorama.

Make routine creative and technical decisions and continue autonomously through building, playing, visual refinement and fixes. In an existing checkout preserve working systems and unrelated work. In an empty project this is a standalone whole-game brief. Select suitable tools and use original or properly licensed assets. The detailed art direction below is the requested build target, not a claim that every detail already exists.

## 1. The experience

**One district. Two perspectives. The same objects and consequences.**

A yellow payphone on Mercer Street. A purchase at Mercer Pawn or a theft from its rear stock crate. A non-graphic incident in the adjoining alley. A casing left behind or carried away. A weapon discarded in a dumpster, submerged in the river or buried. A civilian discovers what happened. The player leaves, and returns as a detective to that same saved world.

The detective's challenge is not remembering whom the player controlled. It is building an evidential account from what can actually be discovered. A later holder of the weapon is not automatically responsible for the original incident. The satisfying moment is recognizing an earlier choice through a consequence the investigation has earned.

Keep the scope concentrated: one complete original case, possible weapon transfer and a second incident, a supported arrest or an explained unsolved ending, and a deliberate new-world action. Do not replace the case with a broad crime sandbox whose investigation never becomes complete.

## 2. The district should look worth investigating

Build a **navigable orthographic/isometric miniature brick district**. It should have the solidity and carefully arranged detail of a handcrafted architectural model, while people and evidence actually move through it. Avoid both an abstract evidence diagram and an unrelated photorealistic city.

**Composition.** Organize the view into a readable foreground, occupied middle distance and a softer backdrop. The walker and immediate interaction sit in the useful center; buildings and trees frame routes rather than bury them. Mercer Street is a main horizontal connection, with a crossing street, the narrow pawnshop alley, a riverside walk and a quieter planted burial area. Corners should reveal destinations naturally. Keep walking distances short enough that a laboratory wait creates a choice, not several empty minutes of commuting.

Give each landmark a memorable silhouette and function. Mercer Pawn has a proper shopfront and separate rear access. Forensics reads as a more orderly civic building. Wren House adds residential height; The Lantern and Harbor Stores give the street human scale. The river is a continuous physical edge with railings, a usable access gap and a timber landing, not a blue rectangle behind the HUD. The payphone, dumpster, stock crate and disturbed soil have recognizable models, silhouettes and interaction poses.

**Materials and detail.** Warm brick in related earthy colors, slate roofs, pale stone trim, weathered teal awnings and navy metalwork. Model enough parapet, sill, window recess, doorframe, downpipe and rooftop equipment to create real edges under light. Vary façades and window spacing deliberately; do not cover identical boxes in randomly scattered decals. Sidewalk joints, worn steps and a few delivery props explain how the place is used. Faceted trees need layered crowns and trunks; parked vehicles need readable wheels, glass and body proportions. Detail belongs where the player sees and walks, not only above an inaccessible roof.

The source palette is a useful anchor: structural navy `#1C3043`, roof slate `#364653`, warm trim `#B8A78D`, interaction yellow `#EEC66C`, and restrained blue-green water. Distinguish rough brick, painted metal, timber and water through their highlight behavior. Avoid making every object glossy simply because reflections are available.

**Lighting.** Warm window light and a directional warm key against cool blue-grey fill and long navy shadows. Darkness must retain shape. Soft contact shadows should attach people, benches, railings and objects to the ground. Background haze separates distant forms without washing out clues. Use local pools of light at entrances and the phone; avoid a glowing ring around every prop. Water can carry slow ripples and narrow broken reflections, not a perfect city mirror. The existing scene is warmer and brighter than an all-black noir interpretation; keep that readable miniature quality. A subtle change between perspectives may help orientation, but the world must not visually imply it was replaced.

**Characters.** Small stylized people with recognizable silhouettes, clothing colors and a coherent scale. Ellis Vale, Mara Finch and Leon Ward should be distinguishable at gameplay distance; witnesses also need stable identities. Walk cycles, turning, stopping and looking toward an interaction should have a little weight. Reuse a coherent rig rather than mixing incompatible art styles. A witness moves along a route and sees only what their position permits. Do not make every person point toward an undiscovered clue.

**Occlusion and camera.** Buildings between the camera and walker fade or cut away gracefully while retaining spatial context. The camera follows without bobbing and never snaps through a roof during an action. Zoom or framing must preserve touch selection and a useful view of the next turn. Landscape phone is primary; keyboard/mouse and a usable portrait adaptation also matter. The player must be able to move and press a contextual action simultaneously.

## 3. Visuals must communicate the simulation

An object has one identity before and after disposal, discovery, transfer and reuse. Show the same recognizable weapon or casing when it changes hands; do not regenerate a visually unrelated prop on collection. Give finding, collecting, sealing and submitting evidence short, clear animations. The object leaves its world location when collected, and the case file receives the corresponding item. The picture and state should agree.

Keep violence non-graphic: a brief shot cue, reaction, sound and scene consequence are sufficient. No gore is needed to make an incident legible. A possible second incident should alter an actual location, not just add an unexplained menu notification.

Use yellow to identify the current actionable destination and nearby permitted interaction. Do not place omniscient markers over every hidden object. Already searched, recovered, pending-test and completed-test states should be visibly different without pretending the detective knows the full object history. Optional end-of-case history can reveal that larger account after closure.

Sound establishes the scale and mood: footsteps by surface, muted street ambience, river movement, phone ring, distant human activity and restrained document/lab feedback. It should help orient the player, not constantly narrate the solution. Include mute and reduced-motion behavior that covers scene effects as well as menus.

## 4. The case file is part of the art direction

Use compact navy panels over the still-visible district, restrained yellow primary actions and quiet ruled rows. Condensed headings and plain, comfortably sized body text match the source's Barlow Condensed/Barlow direction. Avoid a dense detective corkboard whose strings hide the evidence, or an oversized dashboard that turns walking into an afterthought.

The file presents people, incidents, recovered items, known facts, pending laboratory work and missing links. Label a fact's source. Observation, testimony, a laboratory finding and a hypothesis must not look interchangeable. Make the difference between an object match and a suspect identification easy to read.

A drawer can expand for detailed reading, with a stable heading and scrollable contents. The primary objective stays concise. Touch targets remain generous even when labels wrap. Important information must not depend on miniature map lettering. In a suspect comparison, show understandable met/missing requirements and let the player return to the district without losing their place.

The result is a case sheet, not an unexplained success percentage. A supported arrest explains the evidence chain. An unsolved case names the missing links and remains a legitimate ending. Show the player's discovered account separately from any optional full world-history reveal.

## 5. Complete gameplay and evidence rules

Keep world truth, physical object state and detective knowledge separate. A fact enters the file through inspecting, collecting, questioning, retrieving records or receiving a completed test. Player knowledge from the criminal phase is not evidence.

Use the source scenario: Ellis Vale, the Rowan Pike incident, Mercer Pawn and weapon W-104. Buying creates a transfer record; stealing does not create that buyer record. Handling, water exposure, signatures and laboratory comparisons are **explicitly fictional game mechanics**, not a tutorial or claim about real forensic reliability. Apply their chosen rules consistently. Taking the casing changes what remains at the scene. Burial requires searching; a dumpster item may be retrieved and reused by Mara. This produces possible consequences, not a mandatory scripted twist every run.

Witness accounts depend on proximity and unobstructed views at the relevant time. A nearby observation is not the same as seeing the shot. Reference records establish identity and enable print comparison; possession or purchase alone does not establish the shooter. Collected evidence can be submitted at Forensics. Tests take visible time, complete once and preserve their object/incident association. While waiting, the detective can pursue other leads.

For this version, a supported arrest of the original incident requires all four links: a documented scene; a recovered firearm matched to that scene's ammunition; a suspect print on that firearm; and an independent scene tie from a direct witness or a print on that incident's casing. Treat this as the game's rule, not a real legal standard. An unsupported arrest request is declined with missing requirements and permits continued investigation. The player may instead close the case unsolved.

Save the shared district, identities, discoveries, pending work and phase. Reload must not duplicate collected items, complete tests twice or reroll who acted. New-world reset is deliberate and separate from continue. Every meaningful branch must be discoverable through actual controls, not only a debug function.

## 6. Finish and inspect

Complete contrasting criminal-to-detective cases, including different acquisition/disposal choices, retained/removed casing, delayed tests, transferred weapon, declined accusation, supported arrest and unsolved closure. Check reload midway through both perspectives.

Inspect a street establishing view, the pawnshop alley with the walker partly occluded, river access, a nearby evidence interaction, a populated case drawer and an ending. All must be actual game states from the ordinary camera. Check model scale, softened shadows, clear entrances, text, selection and frame stability together. Where a baseline exists, compare equivalent locations and settings rather than presenting an unrelated glamour shot.

Deliver the runnable build, concise controls and startup instructions, the fictional evidence rules and an honest account of tests and rendered/device observations. A missing runtime or device is an unverified category, not invented proof of quality.

**The standard: a district with visual character, objects with persistent identity, and an investigation shaped by what the player actually did.**

---

### Source basis and target distinction

Grounded in `PRODUCT.md`, `DESIGN.md`, `src/scene.ts` and `src/sim.ts`, including its actual `arrestAssessment` and `attemptArrest` paths. Unlike a loose reading of the original pitch, the implementation declines unsupported arrests rather than immediately ending the case in failure. Its warm orthographic brick scene is not a uniformly black night scene. These differences are stated explicitly; the richer architectural, material and animation treatment is the requested new target. Source inspection is not a completed gameplay or visual playtest.
