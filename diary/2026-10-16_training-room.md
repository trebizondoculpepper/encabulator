# Development Diary Entry - 2026-10-16

## Context

- **Date**: 2026-10-16
- **Branch**: main
- **Contributors**: Claude Code + owner

## Problem Statement

The owner judged the Hall too expensive to draw and wanted a much smaller space for jokes that work better in it: a large, unremarkable, unfurnished training room in an English business-park office, in the spirit of the original _The Office_, on the ground floor, with windows on two sides, a fire exit in the glazing, floor boxes, and a car park with low-poly cars under a grey sky outside. They also asked that nothing link to the Hall any more.

## Our Approach

A pure, tested plan (`src/game/training-room-plan.ts`) fixes the room on a 600 mm grid so every ceiling fitting and floor box sits in a whole tile; the build (`src/scene/training-room.ts`) follows it with the fittings a 1990s English office has, and the car park outside. Everything static is merged with `mergeStatic`, so the room and its whole outside draw in about 110 calls and 15,000 triangles on the ordinary WebGL renderer. The rooms became one chain (`CHAIN` in `src/game/dev-room-links.ts`): training room, dev0 to dev7, Rhombus; the Hall lost its door station (`src/scene/door-station.ts` was deleted) and is reached only by its URL.

## Outcomes

The room renders cleanly with no console errors; the windows show the car park through vertical blinds. Half-turned blinds read as closed from an angle, so most were opened further. The portal tests now walk and click every portal along the chain.

## Revision: a tidy room on a trading estate

The owner asked for a clean, respectable company: the floor boxes are all shut with no lead, the whiteboard and flip chart are clean, the screen is rolled up, and the stained and lifted tiles, the flickering tube, the missing blind slats and the scuffs are gone; the clock now keeps time. The car park in front was replaced by a trading estate: a lawn and the estate road, then other units as plain boxes with rows of windows and car parks between them, every car at least 30 m away so its low polygon count does not show.

## Next Steps

The owner's jokes; perhaps a working fire exit, lights on the switch plate, and the projector.
