# Development Diary Entry - 2026-10-15

## Context
- **Date**: 2026-10-15 UTC
- **Branch**: main
- **Commits**: 1987ce9, 5174838, 9d1b8ea
- **Contributors**: Claude Code + User

## Problem Statement
The owner asked for the libraries to be brought up to date with an eye on better WebGL lighting, then decided the game should aim for realism: drop the PS1 shader and move to Three's newest renderer for a faithful, modern look. They then asked for a new dev room of three spotlit plinths (a rhombus, a helix, a sphere) as the testbed for context-sensitive audio, with the tracker keeping the previously visited plinth.

## Our Approach
Every runtime library was already current; only TypeScript moved (6.0.3 to 7.0.2, type checks 1.1 s to 0.3 s). N8AO was a quick ambient occlusion win under WebGL, then replaced when the Hall moved to WebGPURenderer with Three's node post-processing: SSGI, SSR, bloom and TRAA in `src/rendering/node-pipeline.ts`. The plinth room reuses that pipeline.

## Implementation
The building finishes became `MeshStandardNodeMaterial` with `triplanarTexture`. The pipeline writes colour, diffuse with metalness, normal with roughness and velocity into four targets. The PS1 render style, its P key and nearest-filtered lettering were removed. Dev5 (`src/rendering/plinth-room.ts`, `src/scene/plinth-exhibits.ts`, `src/game/plinths.ts`) has three exhibits in physical node materials (dispersive iridescent glass, gold, procedural obsidian with emissive veins), spotlights that follow the nearest plinth within 4 m, and a tracker that reports each arrival with `previous`, `before` and `visit`, dispatched as a `plinth-arrival` event.

## Outcomes
- WebGPU allows 32 bytes a pixel across a pass's targets and counts 8 for every target, even RGBA8, so five targets fail; material data is packed into the spare alpha channels.
- SSR's output alpha is the reflection's length, not its opacity: blending with `blendColor` turned the frame white. Its colour is already weighted, so it is added. In mirror mode it weights by metalness alone, so glossy dielectrics get a smoothness-based weight.
- `onBeforeCompile` is ignored by WebGPURenderer; materials in the Hall and dev5 must be node materials.
- Headless SwiftShader cannot render the WebGPU pipeline in reasonable time; headless Chrome with `--use-angle=metal --enable-gpu --enable-unsafe-webgpu` uses the real GPU (the nave at about 75 fps, rooms at 120).
- An exhibit can be given its own `envMap` so gold and glass have something to reflect while the room stays dark.

## Next Steps
- The audio story for dev5: choose lines from the `plinth-arrival` detail.
- Move dev0 to dev3 to WebGPURenderer; `ps1-material.ts` should then go, or be renamed.
- The sphere's underside picks up a pale screen-space reflection of the lit plinth top; worth tuning.
