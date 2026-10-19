# Report: the dev rooms joined by physical doors

Prompt: `doc/prompts/009-dev-rooms-joined-by-doors.md`.

## 2026-10-19: stage A, every room wired through the corridor's doors

Built: every room's way out (`devPortals`) now leads to dev_corridor, the hub, instead of to its neighbours in the chain: one portal a room (the training room's door, the Rhombus's EXIT, dev17's and dev18's by the warehouse's escape, the rest on their west wall), arriving in the corridor in front of the door that room's name is over (`arrivalAt`). The corridor's doors travel: walking through an open spring door (`walkedThrough`, tested) goes to its room; an inner door goes to the courtyard, through the matching one of its four doors (`courtyardLink`, `src/game/courtyard-link.ts`), and the courtyard's doors go back to the matching side of the corridor. Tests: the doorways (`dev-corridor-plan.test.ts`), the ways out (`portal-network.test.ts`, rewritten), the room links and portals tests updated. Checked in the browser: through the training room's door and back, and from the corridor's south side into the courtyard.

Limitations and next steps (stage B): a room is still opened on its own when its door is walked through, so nothing is seen through an open door but a dark lobby; the next step makes rooms modules sharing one renderer and scene, drawing the room behind a door while it is open, proven on the corridor and courtyard first. The ways out of the dev rooms are still portal patches, not doors. The Hall and the levels have doors on the loop but no way back except the room list.
