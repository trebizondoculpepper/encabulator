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

## Revision: present-day UK health and safety

The owner set the game in the present day and asked what the room lacked against UK health and safety standards. Added: emergency lights and their test key switch (BS 5266), a second fire alarm call point at the fire exit (BS 5839), frosted manifestation dots at two heights and an etched toughened-glass mark on the fire exit's glass, a vision panel on the door reaching down to 550 mm (Approved Document M), intumescent strips and smoke seals in the door frame, the statutory No Smoking sign, a first-aid notice on the pinboard and an electrical test label on the projector. The owner asked not to model the building's exterior, so the assembly-point sign and the fire exit's outer sign were left out.

## Next Steps

The owner's jokes; perhaps a working fire exit, lights on the switch plate, and the projector.
