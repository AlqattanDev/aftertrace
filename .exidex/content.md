## One world, two perspectives

Aftertrace is a single-player crime simulation in one persistent brick district. You play it twice from the same save. First as Ellis Vale, a criminal who takes a contract from a payphone on Mercer Street, chooses a weapon, chooses whether to wear gloves, and chooses where the gun ends up: a dumpster, the river, a shallow grave. Then as the detective who walks the same streets and has to find what Ellis left behind.

## Evidence survives ownership

Every object in the district keeps a stable identity. A pistol bought legally carries a record; a stolen one carries the theft. Prints go on it when a bare hand touches it and come off when it is washed. Ballistics match the casing at the scene. Drop it in the river and a witness may see it go in; bury it and a dog walker may dig it up and hand it to the pawn shop. The detective never gets a fact for free: every entry in the case file comes from observation, a record, or a lab test with a real delay.

## The arrest is an argument

There is no interrogation and no courtroom. The detective names a suspect and the game checks the case file against what actually happened. Possession alone never proves an incident. A washed firearm cannot satisfy a fingerprint-based arrest even if a witness saw the shot. If the chain does not hold, the case is marked unsolved and the sheet explains exactly which requirement was missing.

## How it is built

TypeScript and Three.js with no engine. The district is generated geometry under an orthographic camera: modular brick, warm windows, slate roofs, faceted trees, long navy shadows, buildings that fade when they stand between the camera and the player. The simulation is a separate pure module with its own test suite (23 tests cover the evidence chain, disposal, retrieval, delayed labs, saves and the arrest logic). Saves live on the device. Built for a landscape phone with a joystick and simultaneous action touches; keyboard and mouse on desktop.
