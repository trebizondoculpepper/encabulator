# Development Diary Entry - 2026-10-17

## Context

- **Date**: 2026-10-17 22:30 UTC
- **Branch**: main
- **Commit**: see the commit adding dev16
- **Contributors**: Claude Code + User

## Problem Statement

The owner wanted skips with random spray-paint graffiti and, on some, flashing amber lamps, and then a new development room that is an exhibit hall for graffiti and street art, a collection to be reused on things in the game. The art should not be about skips (taggers put their names on everything); the hall should be big, with partitions in the middle to hang more, and more art generated.

## Our Approach

Skip lamps first: a first try modelled an American clip-on hazard lamp, which the owner rejected; I collected photographs of the UK kinds (the hanging Ecolite-type road lamp, a steel skip light bolted to the lug, a plastic clamp-on one) and the owner chose the ProSolve Ecolite. It is now a yellow cylindrical battery body under a ribbed two-tier amber dome, hung by its strap from the skip's lifting lugs, flashing once a second. Which skips get lamps (two in five), on which lugs, is pure logic in `skip-dressing.ts`, tested. For the graffiti, the collection is pure data (`src/game/graffiti.ts`, tested: no piece mentions skips) and the drawing is one module (`src/scene/graffiti.ts`), drawn per piece from a seed on canvas, so the gallery and, later, the skips share it.

## Implementation

Ten kinds of graffiti, each drawn procedurally: tags with drips and a swoosh, throw-ups drawn as outline, shadow, fill and shine passes wobbling alike, pieces with 3D blocks, gradient fills, highlights, arrows and a fill-in cloud, stencils cut with bridges and hazed with overspray, stickers, characters, hearts, a tag gone over by a rival's, marker messages and roller letters with streaks and dry edges. Forty-two pieces hang in a 36 × 22 m hall: along the walls, clear of the portals, and on both faces of four partitions. dev16 joins the chain after dev15, so the Rhombus exit leads to it.

## Outcomes

All five checks pass. Seen in Chrome: the partitions, the pieces on both faces, the tags and stencils on the walls; no console errors. Skips do not yet carry graffiti: `dressSkip` chooses tags but nothing draws them; the next step is to spray pieces from the collection onto skips.

## Next Steps

Spray collection pieces on skips' sides (clear of the hire firm's name), and perhaps let the gallery's 44 places grow as the collection does.
