# Development Diary Entry - 2026-10-15

## Context

- **Date**: 2026-10-15 14:00 UTC
- **Branch**: main
- **Commit**: the first commit
- **Contributors**: Claude Code + owner

## Problem Statement

The owner finished the VX3 Simulator and started its successor: a game about a mysterious, opaque and profoundly unsafe machine, after the Rockwell Retro Encabulator meme, set in a late-1990s American plant and written in English. From the VX3 they wanted the controls and widgets, the effects, the graph library and some sounds. The first task was to identify the machine in the film and build a development room, Controls and Displays, holding the kinds of controls, displays and indicators it has, including internal parts, all as reusable components so that failures (a blown capacitor) can be simulated later. While the work was under way they set its layout: a board of controls, a board of displays, and each interactive part on a pedestal of its own with a control to test it.

## Our Approach

Stills from the film show an Allen-Bradley CENTERLINE motor control centre, so the room's parts are a 1990s motor control unit's: 30 mm pilot devices, an operating handle interlocked with the unit door, message display, operator terminal, drive keypad, and inside, a breaker, contactor, overload relay, fuse and the drive's capacitors. The component model gained operator parts (operating handle, mushroom stop, push-to-test pilot light) and self-acting parts that sound as they act (contactor, overload relay, fuse, capacitor, hour meter). Each display on the board reads a test control, so nothing shows a made-up value.

## Implementation

The VX3's reusable modules were copied by import closure, its game-specific modules dropped, and the effects rooms renumbered dev1 and dev2 behind dev0. New: `src/scene/industrial-controls.ts`, `industrial-displays.ts` and `industrial-devices.ts` (views), `src/rendering/test-boards.ts`, `device-pedestals.ts` and `controls-room.ts`, the drive keypad and operator terminal models, and device sounds (contactor clunk, trip snap, fuse pop, capacitor bang, 60 Hz hums). A wired starter circuit on the world graph was drafted and then removed when the owner asked for each part to be tested on its own.

## Outcomes

All five checks pass. Screenshots show the boards and pedestals working: the contactor pulls in, the overload relay trips and will not reset until cool, the fuse blows above 2 A, and over-volted capacitors bulge and then vent, scorched and smoking. The dev server moved to port 5174 so it can run beside the VX3's.

## Next Steps

The owner's view of the parts; whether to keep the 1980s German parts from the VX3 on a board here; then the machine itself on the world graph, and the plant around it.
