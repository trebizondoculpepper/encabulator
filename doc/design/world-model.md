# The world model, parts and presentation

How the game's state is meant to be divided, written down before the machine is built on it. It follows a discussion with the owner on 2026-10-16.

## One world, not two

There is one world model: the world graph (`src/game/world/graph.ts`), a directed graph of values. There is no separate "simulation model" for the machine and "world model" for the room. Whether a value affects the machine is not a property of the value but of what depends on it.

A cupboard door being open is world state. Today nothing depends on it, so opening it only changes how the door looks. Tomorrow an interlock may depend on it (a real motor control unit will not let its breaker close while its door is open), and nothing about the door has to move to make that so: an edge is added.

The rule of thumb: if anything other than the thing's own picture could ever care about a value, the value belongs in the world graph.

## Three layers

1. **World state**: what is true and persists. Switch positions, handles, doors open or shut, a fuse blown, a capacitor vented, a drawer pulled out if a drawer ever matters. Saved with a game; read by narration; changed only by operations.
2. **Derived physics**: what follows from the state, and from time. Current drawn, supply voltage, a motor's speed, an overload's heat, a lamp's brightness. These are derived values and processes in the graph.
3. **Presentation**: how it looks and sounds while it changes. A door's swing angle, a needle's easing, a lamp's flicker drawn on screen, a CRT's picture, a click. Presentation follows the model and never feeds back into it.

## The lights

The lights are part of the model because they depend on it: a lamp's brightness is derived from its switch and from the supply voltage, and the supply voltage sags with the total load. Start a large motor and every lamp on that supply dips, with no special wiring between the motor and the lights. A flicker is presentation of a brightness that the model says is unsteady.

## Parts bind to the world

Parts (`src/rendering/parts.ts`) are the controls and devices as whole things, like React components: made from their props, bringing their own look, behaviour, clicks and sounds. Their state can be:

- **bound** (`bound`, `power`, `latch`): the part shows and writes a world value, like a controlled input. Operating it writes the world; the world moving moves it silently.
- **unbound**: the part keeps its own state, like an uncontrolled input. An LED pushbutton wired to nothing still toggles its LED.

A part's sounds are always its own and are presentation: the world never chooses a sound, and a part never needs the world to make one.

Things that are only presentation and that nothing will ever depend on (a drawer that is never part of the story, a door's swing) may stay unbound. Binding them later is a matter of passing a `bound` prop; the part does not change.
