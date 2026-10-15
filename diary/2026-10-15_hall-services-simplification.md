# Hall services simplification

Removed the Hall’s spiral and rectangular ducts, drop diffusers, air handling unit, sprinkler pipework and sprinkler riser after the owner reported poor performance in dev4. Gas heaters, cable trays and exhaust fans remain. Updated the room guide and code research’s current-state note.

The five CI checks passed: typecheck, lint, format check, 196 tests and build. Runtime frame rate has not been measured.

A follow-up on slow loading removed the initial six-face environment capture in `hall-room.ts`. That capture rendered the whole scene six times before animation began; the floor still uses the node pipeline’s screen-space reflections. The five CI checks passed again. Browser startup time still needs direct measurement.

For slow frame rate on a Mac, capped only dev4’s renderer at device pixel ratio 1. The Hall’s screen-space passes previously ran at up to 2× Retina resolution, which can quadruple their pixel work. Typecheck, lint, format check, 197 tests and build passed. Frame rate still needs measurement on the owner’s Mac.

Window bands previously used one glass box plus separate instanced box mullions for every grid line. Replaced those bars with cached canvas grid textures applied to the glass boxes, retaining the adjustable sky tint. Also set dev4 to an economical node-pipeline preset: sixteen GI samples per pixel instead of thirty-two, and SSR at 0.35 scale instead of 0.5. The plinth room keeps its existing preset.
