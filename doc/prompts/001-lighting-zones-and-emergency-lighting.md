# 001: Lighting zones and emergency lighting in the building fittings gallery

**Status: done on 19 October 2026 (uncommitted at the time of writing); kept as the record of the owner's briefing. A reviewing agent may use it to check the work.**

The owner wants Level 0's lighting to answer to the machine: to flicker, to brown out when the machine is run hard for long, and to go out entirely in its catastrophic failures, with emergency lighting when it fails and a darker day so that the room's own lights matter. The theme of the game is machines coming to life, and that is to apply to the lighting in Level 0. Every part and system is to be modelled first in the building fittings gallery (dev18), then fitted to Level 0. Models are simple placeholders at true size after real catalogue products; the effort goes into behaviour. The owner chose the research's recommendations: direct switching by zone with no contactors, and switch-start fluorescent control gear (prompt 002).

## What was asked

- dev18 lit only by its own lighting, with a light switch, a way to test-trip the lighting circuit that brings on the emergency lights, and a way to check that the fire exits are well lit.
- Every fitting modelled on a real product (researched in `doc/research/emergency-lighting-parts.md` and `doc/research/warehouse-lighting-control.md`), but as placeholders.
- No domestic light switch in a space this size: lighting zones (rows of fittings), each wired as its own circuit, switched from a bank of switches near both exits, with presence detectors.
- Every fitting a component in the catalogue, shown as a specimen in the dev rooms and installed by the warehouse.

## What exists

The supply's quality (normal, brownout, severe), LED drivers, per-fitting emergency changeover (EN 60598-2-22), the BS 5266-1 check, zones with breakers, two-way banks and presence detectors in the building services model, the catalogue kinds `gridswitch`, `presence` and `bulkhead`, dev18's installation, dev8's and dev18's specimens and the warehouse's zoned lighting. The full account is in `doc/reports/level0-lighting.md` and the plan is `doc/plans/level0-lighting.md`.

## Return path

Review notes go in `doc/reports/level0-lighting.md`, for the owner and the next agent: add a dated entry under prompt 001, preserving what is there. A final chat response alone is not the return path.
