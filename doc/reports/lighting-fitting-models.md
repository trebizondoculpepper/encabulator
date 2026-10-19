# Lighting fitting models

## 2026-10-19: view model pass

Return path for prompt 006. The owner should read this report next, alongside the lighting implementation report at `doc/reports/level0-lighting.md`; preserve this entry and append a dated entry on any later pass.

- Emergency downlight: retained the Thorn Voyager Star recessed model already in the shared checkout, with its confirmed 85 mm flange, estimated lens size, and green/red status window. The current `set(lit, charged)` contract remains intact.
- Emergency bulkhead: refined the LEDVANCE 355 × 115 × 63 mm body with a distinct opal face and rim. The charge LED and test button positions remain estimated.
- Exit box sign: retained the 390 × 192 × 60 mm EXIT3MLISO inspired box already in the checkout, its ISO style running-man face, bottom diffuser, charge LED and test button. Exact icon geometry and LED placement remain estimated.
- MK emergency test key: retained the 86 mm Grid Plus inspired module and marked its rotating key assembly live for static merging.
- MK Metalclad Plus switch bank: added a recessed grid yoke, screw slots and live rocker/key pivots to the existing 86 × 146 mm plate. Module spacing, rim and travel remain estimates.
- CP Electronics EBDHS-PRM: made the Fresnel dome more faceted while keeping its confirmed 88 mm flange and researched projection. Its surface-box outline and red walk-test LED remain estimated.
- Hager distribution board: set outgoing breaker spacing to the confirmed 17.5 mm module width, added a contact flag that changes colour with the existing `set` method, and placed a representative RCBO test button on the first breaker. The visible face details and exact RCBO placement remain estimated. The main breaker, returned meshes and `setOpen` API are unchanged.
- Fluorescent batten: deferred because prompt 002 is being implemented concurrently. I did not change any luminaire or fluorescent code. The prompt references `doc/research/fluorescent-battens.md`, which was absent in this checkout during this pass.

Research additions, each marked confirmed or estimated, are in `doc/research/emergency-lighting-parts.md` and `doc/research/warehouse-lighting-control.md`. The new source checks were [LEDVANCE bulkhead](https://www.ledvance.com/en-int/professional-lighting/products/luminaires/professional-luminaires/emergency-lighting/wall-and-ceiling-luminaire-with-up-to-ip66-protection--convertible-into-an-emergency-exit-sign/rectangular-emergency-bulkhead-with-ip65-and-3-h-standby-time-c365513?productId=283840), [CP Electronics detector datasheet](https://assets.legrand.com/pim/NP-FT-GT/EBDHS-PRM%20Datasheet%20Issue%202.pdf), and [Hager MTN106 product data](https://hager.com/uk/products/h/mtn106-mcb-1p-6ka-b-6a-1m).

Validation in the shared checkout: `npm run typecheck` passed; `npm run lint` passed; `npm run format:check` failed only on `src/toolkit/components/architectural/logic/fluorescent-gear.test.ts`, outside my permitted files and part of concurrent batten work; `npm test` passed (108 files, 779 tests, including merge and draw-budget tests); `npm run build` passed. I left that formatting issue for the batten agent. I did not capture screenshots or perform a manual close-up review in dev8, dev18 or Level 0; visual fidelity and the estimated small details remain open for the owner to inspect in-browser. No commit was made.
