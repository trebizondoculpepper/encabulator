# Model the Encabulator's cabinet backs

Give the freestanding Encabulator a convincing rear elevation, visible when walking around it in the warehouse. Some cabinets should have solid backs; others should offer rear access to their internal equipment. The initial implementation is complete; see [the completion report](../reports/encabulator-cabinet-backs.md) before follow-up work.

Research and a proposed per-section implementation plan are now available in [the plan](../plans/encabulator-cabinet-backs.md), [research notes](../research/encabulator-cabinet-backs.md) and [reference pictures](../../resources/reference/encabulator-cabinet-backs/README.md). Read these before implementation. Coordinate a future diagnostic cable connection with [the BBC Micro terminal prompt](bbc-micro-diagnostic-terminal.md), without implementing that separate feature as part of this task.

## Design intent

Use real industrial cabinet construction as the reference. Start with the Rockwell CENTERLINE 2100 selection guide (https://literature.rockwellautomation.com/idc/groups/literature/documents/sg/2100-sg003_-en-p.pdf) and manufacturer enclosure/cable-entry documentation from Rittal or equivalent. Confirm relevant dimensions and construction details before modeling. Preserve the machine's existing proportions, powder-blue finish and Neumann Dynamik identity.

Propose a rear treatment for each existing section before building geometry. Use mainly solid removable steel rear panels with folded edges, seams, captive fasteners and restrained identification labels. Give selected automation/control sections accessible rear service compartments showing galvanized mounting plates, actual equipment backs, terminal strips, connectors and neatly routed wiring. Retain guards or barriers over power buswork. Distinguish a cabinet's rear access panel from the back of its front control door.

Show purposeful connections between sections: enclosed horizontal trunking linked to vertical wiring channels, short supported cable looms, grommeted penetrations and blanked unused openings. Heavy incoming cables should enter through gland plates near the base, with strain relief and routes consistent with the existing floor-fed isolator and machine trunking. Separate substantial power cabling from smaller signal wiring. Include appropriate green/yellow bonding conductors, earth connections, cable markers and clips. Add vents, filters or fans where the equipment actually needs cooling. Keep the installation tidy and intentional.

Rear views must correspond to the installed internal components. Reuse their actual models and connection points; do not duplicate electronics or put unrelated decorative components behind them. An open service bay should reveal plausible depth and mounting structure rather than a texture pasted onto a flat wall. Closed panels should conceal their contents while honoring existing per-part visibility options and components visible through any apertures.

## Architecture and interaction

Read `AGENTS.md`, applicable toolkit instructions, `src/scene/retro-encabulator-mcc.ts` and its tests. Inspect the existing continuous rear sheet before replacing it with per-section assemblies. Keep room layout and machine wiring unchanged. Reusable fittings belong in the appropriate toolkit category and architectural or machine gallery; the machine-specific arrangement belongs in the scene.

Reuse shared door components for any operable rear access doors. An open door must close when the player uses its rear surface or either black opening fastener, allowing closure from either side. Preserve this behaviour on existing front doors too. Solid screwed panels need not become operable doors unless the design calls for it. Use only the shared interaction scheme; labels never intercept use.

## Verification

Inspect the machine from the rear, both ends and oblique angles, with relevant doors open and closed. Check for floating cables, penetrations without glands, overlapping rear sheets, inaccessible fasteners, exposed voids and duplicated equipment. Verify rear access interaction, existing front controls, internal culling and shared scene reuse. Document the selected real-world references and any intentional fictional departures. Run appropriate tests and the repository's required checks before committing if requested.

## Return path

Leave completion notes in `doc/reports/encabulator-cabinet-backs.md` for the owner and the next reviewing agent. Create the destination if missing; preserve existing feedback and append a dated entry on subsequent runs. Include the per-section rear design, reference links, reusable fittings/gallery additions, validation results, screenshots or viewing instructions, limitations and unresolved questions or blockers. A final chat response alone does not satisfy this return path.
