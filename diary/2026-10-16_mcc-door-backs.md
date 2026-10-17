# MCC rear ventilation, closing and interior culling

Added a reusable ventilated rear-cover view and part to dev6's MCC bucket doors. Each cover follows the existing stepped face/pan geometry, with upper and lower louvres; the PLC door keeps its viewing aperture clear and vents above it. The rear skin and its ventilation share a close-only action on the same door component as the front wing latches, retaining the existing close sound and guarding against opening a shut door through its back. Front controls and latches retain their existing actions.

Each bucket's pan, backplate, wiring, devices and rack units now live under one initially hidden interior group. It becomes visible when the door starts opening, stays visible through closing, and is hidden when the leaf has actually shut. A raycast traversal guard also prunes hidden interiors, since Three.js raycasting does not itself honour visible=false. Closed bucket contents therefore contribute no render calls and cannot expose hidden rack interactions. Static enclosure structure and front controls remain present.

Added regression tests constructing the real MCC geometry: per-door visibility, closing animation, all-open state, hidden-interior raycast pruning, ventilation on every rear cover, close-only behaviour and closing through an actual rear mesh hit without affecting a neighbouring door. Added ?room=dev6&view=backs as an inspection camera position. All inspection views start with doors closed; `devEncabulator.openAll(true)` explicitly opens them for development. Inspected this view in Chrome.

Typecheck, lint, formatting, all 278 tests and the production build passed. Left the unrelated untracked pyproject.toml untouched.
