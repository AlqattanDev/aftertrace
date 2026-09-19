# Build AFTERTRACE — the district remembers

Build a complete, playable single-player crime simulation in one persistent district. First the player creates a case as the criminal; then they must investigate that same case as the detective. Deliver the game, not a pitch, mockup or framework.

You own the ordinary creative and technical decisions. Work autonomously through building, playing, testing and refining, without pausing for approval between steps. Choose the implementation that makes the idea convincing. In an existing repository, inspect and preserve working systems and unrelated changes; in an empty repository, this brief supplies the complete product direction.

## The promise

**One district. Two perspectives. Nothing conveniently resets.**

A payphone contract, a weapon acquired through a shop or theft, a non-graphic incident, and a few decisions about the objects left behind. Later, the same streets, people and objects become the detective's problem.

The emotional payoff is recognition: “I remember doing that. Now I have to prove it.” The detective's evidence must earn that recognition; the game must not simply label the person the player already knows is guilty.

## Build one complete case

The criminal accepts the contract, obtains a weapon, reaches the target, commits the fictional incident, makes the casing and disposal decisions, and leaves the district. Support the source concept's alternatives: bought or stolen weapon, casing left or taken, and dumpster, river or burial disposal. Make these actual world interactions with understandable consequences rather than a menu that secretly assigns an ending.

The detective then arrives at the reported scene. They walk, inspect, collect, speak to witnesses, check records, request laboratory work and compare suspects. They can make an arrest supported by the case file or explicitly close the case as unsolved. Both are complete endings, followed by an intelligible explanation and a way to start a new world.

Build a compact, authored district where each trip matters: payphone, shop, alley, river, disposal locations and laboratory. Give the player one clear immediate objective without putting an omniscient arrow on every undiscovered clue. Navigating the place should be satisfying rather than busywork between dialogue panels.

## The simulation is the distinguishing feature

Objects retain stable identity across being dropped, moved, found, carried and reused. An incident, a person, a weapon and an evidence item are related entities—not interchangeable labels in a quest checklist.

Keep physical state, world history and detective knowledge separate. The simulation can know who acted; the detective only learns facts through observation, testimony, records or completed tests. Every case-file fact should retain where it came from and which incident or object it concerns. A factual observation and a hypothesis should look different.

Use the source concept's prints, acquisition records and ballistic links as explicitly fictional game rules. They are simulation mechanics, not claims about real forensic reliability. Choose coherent discoverability and delay rules, document them, and apply them consistently. Taking an object away must change what is available at that location later; a laboratory request cannot produce a result before it completes.

Witnesses see events because they were present and had an appropriate sightline. Their reports may be limited; they should not narrate hidden world history. A discarded weapon may be found and reused by another character, producing a second incident with the same weapon identity. This is a possible consequence, not a mandatory twist manufactured in every playthrough.

**Possession is not guilt.** Linking a weapon to an incident is different from proving who used it at that time. Arrest evaluation must use the accumulated evidence and make missing links understandable. Do not replace this with a hidden completion percentage or silently reward the player's out-of-character knowledge.

## Make investigation enjoyable

A good detective turn offers a decision: inspect the scene again, pursue a witness, check a record, or spend the laboratory wait examining another lead. Make pending work visible so a delay creates a planning opportunity rather than a dead screen.

The case file is a readable working tool: people, incidents, recovered objects, known links, pending tests and unresolved questions. Use plain sentences. Let the player compare suspects without exposing unrecovered evidence or the criminal's private inventory. Reserve a fuller event-history explanation for the ending, and distinguish what really happened from what was actually proved.

Preserve the meaningful branches while making the first case easy to enter. A concise introduction and contextual interaction labels should be enough to begin. The game should support an honest unsolved outcome without requiring a restart to escape a missing clue.

## A place, not a diagram

Aim for a warm miniature brick district: navy shadows, amber windows, rooflines, river edges and restrained yellow interaction accents. Use a navigable spatial world, clear occlusion handling and a camera that keeps the walker visible. Atmospheric detail should reward looking without concealing interactive objects.

Landscape phone is the primary surface; keyboard and mouse also work. Movement and contextual action must work simultaneously on touch. Give nearby evidence generous, intentional selection, usable reading panels, safe-area spacing, sound/mute and calm motion options. Violence stays non-graphic; the drama is what remains afterward.

Save locally at meaningful transitions and during the case. Reloading must preserve identities, collected items, case knowledge and pending work without duplicating rewards or changing who did what. Make a new-world reset deliberate and clearly separate from continuing the current case.

## Demonstrate the contract

Exercise complete criminal-to-detective cases with contrasting choices. Show that leaving versus taking the casing changes the scene; that acquisition records differ appropriately; that object transfer does not create a new weapon; and that a second holder is not automatically guilty of the first incident.

Check witness visibility, pending versus completed tests, reload during a case, a justified arrest, an unsupported accusation and an unsolved ending. Use the actual interface as well as simulation tests. A test that directly injects a clue is a diagnostic, not proof that a player can discover it.

## Deliver

Leave a runnable build, concise run instructions, controls, the fictional simulation rules and a factual summary of what was verified. Document any missing service or device verification honestly. Broader crime systems are not a substitute for this complete case: finish the district, its persistence, its investigation and its endings first.

**The game is ready when two different criminal choices produce two genuinely different investigations in the same believable place.**

---

### Repository alignment

Based on `PRODUCT.md`, `DESIGN.md` and the supplied original one-shot, reviewed 2026-09-19. The current product is single-player, locally saved, landscape-phone-first and built around evidence provenance. The detailed verification scenarios above strengthen the delivery brief; they are not claims that those checks have been run in this prompt-editing task. No missing reference image is assumed to exist.
