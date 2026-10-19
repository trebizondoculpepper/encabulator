# Repair room: aimed receptacles

## Interaction

While carrying a part, the aim ray tests visible receptacle targets. A compatible, isolated, empty target draws a green circle at the crosshair; an incompatible, live, or occupied target draws a red X. Everywhere else retains the normal crosshair. The carried part's position does not determine the target or its eligibility. Use on a green target hands the part to an insertion animation, which aligns its orientation, moves it to the socket, and only then connects it. Use on a red target keeps the part in hand and shows the local refusal. Use elsewhere keeps the existing drop and skip behavior.

## Implementation and risks

Each socket gets a dedicated hit area placed just in front of the actual connector, including when a card is installed. The hit test ignores the carried part and limits target range, so the held model cannot occlude the receptacle or select one across the room. One decision function checks power, occupancy, part kind and board identity for both crosshair and Use, preventing a green hint from disagreeing with the action. The short insertion animation takes over the part and leaves the electrical model disconnected until seating completes. Bench and skip remain separate; the skip gets priority only when it is aimed at or when no socket is targeted, avoiding accidental disposal during repair. Tests cover the decision function and target classification; browser verification checks the visible aim cues and a successful repair.
