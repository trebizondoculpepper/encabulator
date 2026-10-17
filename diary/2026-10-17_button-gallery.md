# Development Diary Entry - 2026-10-17

## Context

- **Date**: 2026-10-17 02:30 UTC
- **Branch**: main
- **Commit**: (this commit)
- **Contributors**: Claude Code + User

## Problem Statement

The owner asked for the next development room, the pedestal button gallery: static versions of dev9's button on wheels in progressive states of repair. First gleaming new, in brushed chrome, everything shiny, with an aura round it; then the familiar industrial one; then worse in steps: a cracked case, a bent post, a cracked and chipped lens, fire and smoke stains, graffiti, scratches, and at last the post severed or bent so it hangs at an angle. While it was being built the owner added that a lens with stages of cracking would be useful in its own right, since machines will later be blown up and their buttons' damage changed from perfect to damaged; that the last stage should have glass chipped out, showing the white light beneath; and that the light shows only when the button is lit, grey internal plastic otherwise.

## Our Approach

Lens damage became a property of every illuminated push button rather than a decoration of the gallery: a pure scale (`src/game/lens-damage.ts`: intact, scuffed, cracked, crazed, chipped, shattered, with `worsenLens`) and an overlay on the lens (`src/scene/lens-damage.ts`) laid out once per lens from a seed, so each stage keeps the last stage's cracks and adds to them, as repeated blasts would. Where glass is gone, the overlay shows the grey lamp module, and a white glow mask on the same overlay makes it shine white when the lamp is lit. `pushButton` takes a `damage` readable and a `damageSeed`. The gallery's stands are pure data (`src/game/stand-conditions.ts`, tested so every stage is at least as bad as the one before in every respect and worse in one) drawn by `src/scene/stand-condition.ts`, which paints grime, rust, scratches, graffiti tags (our own harmless words), scorch and soot onto canvases for the post, mounting plate and base, tints and slumps the case, lays crack and soot decals on its faces (none takes clicks), bends the post, tears it with teeth and dangling wiring, and removes a castor. The new stand is chrome all over, with additive glow sprites breathing round the box and the stand.

## Implementation

`createMobileStand` now takes `chrome` and puts everything above 0.55 m in a `head` group pivoted there, returning its pieces so they can be repainted; with no bend dev9 looks as before (checked in Chrome). `createControlStation` takes `chrome` and returns its body and lid. dev11 is linked between dev10 and the Rhombus mini-game. Close views are computed from each button's actual world position, as bent posts carry buttons far from their base.

## Outcomes

- Checked in Chrome: all seven stands, the overview and each close-up, with no console errors; screenshots sent to the owner.
- Chrome needed work: mirror-smooth metal reflected the dark room and looked black, so the new stand's metal is brushed (roughness 0.26, metalness 0.85) with a strong environment reflection.
- Bending the post forward hid the box's face from the viewer, so bends are to one side and a little back.

## Next Steps

The owner will judge the look. The stand damage is static; like the lens, it could be made switchable for explosions later.

## Addendum: the leak

The owner asked for the wreck to stand in a small oil leak, a brown reflective fluid pulled to one side, as if whatever vital fluid the stand runs on had mostly leaked out. `StandCondition` gained `leak` (only the wreck has any; the tests now check that), and `src/scene/stand-condition.ts` draws it: runs down the lower post from the tear, a pool round the post's foot with a run to the edge of the base and drips down its skirt, and a puddle on the floor, a chain of blurred circles shrinking along a curve so its edge is rounded like a liquid's, amber where it is thin and nearly black where it is deep, pulled out to the side the head hangs over and back, clear of the label. Painted gloss alone looked like a stain, so the puddle also carries a planar reflection (three's `Reflector`, 512 px, with our own shader masking it to the puddle's alpha). Laid over the fluid normally it greyed the puddle with the dim walls; added, and squared so only bright things show, it keeps the oil dark and mirrors the lit base and stand. The stand now returns a `dispose` for the reflection's render target, which the gallery calls. Importing a new three addon made the running Vite dev server serve 504 "outdated optimize dep" until it was restarted.
