# Baked PCB solder-mask textures

Run `npm run bake:pcb` to regenerate these ten PNGs. `scripts/bake-pcb-textures.ts` uses the existing ArtBIT-derived `circuitTraces` generator and a build-time Canvas renderer. The dimensions, trace-grid sizes and deterministic seeds are in `manifest.json`; the generator's MIT notice is retained in `src/scene/vendor/circuitboard-painter.LICENSE` and credited in CREDITS.md.

The backplane, cabinet, drive and power-board textures share green solder mask, subdued copper traces, plated vias and pale silkscreen. Each of the six daughtercard kinds has its own layout. Both broad faces of every PCB use a baked texture; the thin edges show cut FR4. Textures are cached per panel kit and disposed with it. No circuit-trace generation runs while the game is rendering.
