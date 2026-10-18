# Level 0: the fire system

The owner's outline: a fire starts in the machine; smoke rises and sets off a detector; the fire alarm starts ("Fire has been detected in this building, please evacuate"); if the player does not deal with it, sprinklers open and throw water on the machine; electrical discharge and smoke follow, and the machine is ruined.

## What exists

- dev8's building services model (`src/toolkit/components/architectural/logic/building-services.ts`, tested) already runs the whole sequence of a UK two-stage alarm with a voice alarm (BS 5839-1 and -8): smoke at a detector, the alert stage (90 s investigation, door holders released, the alert message), evacuation (the evacuation signal and message, the brigade called), heat at each sprinkler head from the fire's size, a bulb bursting at 68 °C, water flowing, the bell, the fire put out; the panel's silence, resound and reset with its key; call points; the valve set.
- The warehouse shell already has the fittings (`architectural-fittings.ts`: call points, the alarm panel, sounders, 100 pendant sprinkler heads and their pipework, extinguishers), modelled but not wired to anything.
- The voice alarm recordings (`src/toolkit/components/fire/audio/assets/voice-alarm/`) and the evacuation signal.
- The line-up's unit smoke and soot (`createUnitSmoke`), and the FIRE symptom on the simulator.

## The owner's sequence (2026-10-19)

Fires start in three cabinets, lower ones (so the smoke and soot rise up the faces above them). Their smoke rises and sets off the detector, and the alarm. The hot smoke at the ceiling opens the sprinklers over the machine. The water causes an electrical fault: brief sparks, then total shutdown.

## The plan

1. **The fire, in the plant model** (`src/game/level0-plant.ts`): a fire inside three lower units at once, a size that grows while the unit is energised and feeds it, and dies down when the power to it is cut. Its causes come from faults (an overheating drive with its cooling failed, a seized motor's windings, a shorted capacitor board), so FIRE becomes a consequence and a SYMPTOM, not a fault. Smoke from the unit's seams and soot above it follow its size.
2. **Wiring the warehouse's fire system** to a Level 0 instance of the building services model: the smoke detector over the machine sees the machine's smoke; the panel, sounders, call points and voice alarm work as in dev8; the sprinkler heads over the line-up heat from the machine fire.
3. **Water on a live machine**: when a head over the machine opens, water reaches the live units: a brief burst of sparks and bangs, then total shutdown (the main breaker and the isolator's supply lost, every screen and lamp dark), and the machine **ruined** (a plant state: nothing will run again until the simulator's RESET; the ruined components inside are modelled later).
4. **The simulator**: FIRE under FAULTS becomes the causes as they are modelled; FIRE under SYMPTOMS stays as smoke and soot alone.
5. **Tests**: the plant's fire (growth, dying when isolated); detection and the alarm stages from the machine's smoke; heads opening from the machine fire's heat; water ruining a live machine and not a dead one.

## Open question for the owner

What the player must do to stop the sprinklers (asked one question at a time; recorded here when answered).
