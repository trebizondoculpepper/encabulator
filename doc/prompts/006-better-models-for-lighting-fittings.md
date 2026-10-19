# 006: Better models for the lighting fittings

The lighting fittings were built as simple placeholders so that the game's behaviour could be got right first; the owner wants another agent to bring their models up to the standard of the rest of the game. Read first: `AGENTS.md` (copying real catalogue parts at true size, brands, Performance), `src/toolkit/components/CLAUDE.md`, `doc/research/emergency-lighting-parts.md`, `doc/research/warehouse-lighting-control.md`, `doc/research/fluorescent-battens.md` (prompt 002), and the views: `src/toolkit/components/general-safety/views/safety-fittings.ts` (emergency downlight, emergency bulkhead, exit box sign, test key), `src/toolkit/components/architectural/views/building-fittings.ts` (grid switch bank, presence detector, distribution board) and `architectural-fixtures.ts` (the batten).

## What to do

Model each fitting after the real product its research names, at true size, under no real maker's name: the Thorn Voyager Star recessed emergency downlight (85 mm flange, lens, status window with green and red LEDs), the LEDVANCE emergency bulkhead (355 × 115 × 63 mm, opal diffuser, charge LED and test button), the EXIT3MLISO exit box sign (390 × 192 × 60 mm, ISO 7010 legend, base diffuser, charge LED and test button), MK's Metalclad Plus Grid Plus plate and modules (86 × 146 mm, zinc finish, rounded corners, screws, grid modules, secret-key module), CP Electronics' EBDHS-PRM detector (88 mm flange, faceted Fresnel dome, box), the Hager breakers in the distribution board (module widths, toggles, contact windows, an RCBO's test button), and the switch-start fluorescent batten. Keep each part's API and behaviour (the views' `set` methods, the use targets, `userData.live` on anything that changes), so nothing outside the views changes. Mind the draw budget: small detail is merged and culled as `fine`.

## Verification

dev18's specimens and installation, dev8's specimens and Level 0 looked at closely and from a distance; the merge-safety and draw budget tests; the five checks. Do not commit unless the owner asks.

## Return path

Leave completion notes in `doc/reports/lighting-fitting-models.md` (create it), with a dated entry: each fitting, what it now copies and how closely, screenshots, anything the research could not confirm, and open questions. A final chat response alone is not the return path.
