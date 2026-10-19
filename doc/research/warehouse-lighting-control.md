# Warehouse lighting control: research

## 2026-10-19: first pass

Research for the 30 × 30 m Guildford warehouse shell (`src/scene/warehouse-training-room.ts`, used by dev17, dev18, Level 2 and level0), which today hangs twelve Thorn Aquaforce Pro 1600 mm battens (three rows of four: x ∈ {−10, 0, 10}, z ∈ {−10, −2, 6, 12} in the builder's own frame) and switches all of them from one domestic one-gang switch at each side door, labelled WAREHOUSE LIGHTS. Next reader: the main coding agent, who will build the parts below. Figures marked **(estimate)** are mine; everything else is from the source cited beside it.

### Contents

- How UK warehouses of this size are switched, and the recommendation for this unit
- Part 1: the switch bank by the door (MK Metalclad Plus Grid Plus)
- Part 2: the emergency lighting test key module
- Part 3: the lighting contactor (Hager ERC225 / ESC225, Schneider Acti9 iCT)
- Part 4: the lighting control enclosure (Hager Vector VE112)
- Part 5: the high-bay presence/absence detector (CP Electronics EBDHS)
- Part 6: DALI scene plates (optional, not recommended here)
- Unconfirmed / open questions
- Sources

## How UK warehouses of this size are switched

### The load is small

A Thorn Aquaforce Pro 1600 mm, AQFPRO L LED8000-840 (article 96630758), is 1600 × 92 × 90 mm and draws 52.3 W (Thorn product page, via search; the page itself refused a direct fetch). Twelve of them draw about 630 W, roughly 2.7 A at 230 V, or under 1 A per row of four **(estimate, arithmetic from the Thorn figure)**. That is far below the 20 A rating of a single grid switch module or the 10 A relay of a high-bay detector. Nothing about the load forces contactors on this unit: they are used when the switched current is large (hundreds of high bays), when switching must happen far from the switch position, when one control point must switch circuits on several phases, or when a timeclock, photocell or BMS must switch the lights. LED drivers do have a large, very brief inrush (a rectifier charging a smoothing capacitor in the first half-cycle), so makers publish luminaires-per-MCB tables (Thorn publishes one per driver, e.g. document 96671930 for the ALG5 driver) and contactor makers publish lamp-load tables; I found no Aquaforce Pro inrush figure. Inrush is a reason to choose a Type C MCB or an AC-7a/AC-1 rated contactor, not a reason for a contactor on a 630 W load.

### Building regulations: what a unit fitted out now must have

Approved Document L Volume 2 (2021 edition, in force in England from 15 June 2022) says, in its Lighting controls section:

- 6.62: lighting controls in new and existing buildings should follow BRE Digest 498 (Selecting lighting controls).
- 6.63: "Unoccupied spaces should have automatic controls to turn the general lighting off when the space is not in use (e.g. through presence detection). Occupied spaces should have automatic controls where suitable for the use of the space."
- 6.64: "General lighting in occupied spaces should have daylight controls (e.g. photo-switching and dimming) for parts of the space which are likely to receive high levels of natural light."
- 6.61: general lighting should be metered (dedicated lighting circuits with a kWh meter each, or a lighting management system that meters).
- 6.60: general lighting should average 95 luminaire lumens per circuit-watt, or meet the LENI method of Appendix B. LENI credits automatic off within 20 minutes of a space emptying (occupancy factor 0.8) and daylight dimming in areas "where 10% or more of the roof is translucent or made up of rooflights" (daylight factor 0.8).

The warehouse has ten skylights, so a unit fitted out today would be expected to have presence (or absence) detection and some daylight-linked switching or dimming on its general lighting. ADL Vol 2 6.16 also asks for presence-detection control on electric radiant heaters, which the shell has on its side walls (an aside, not part of this task).

BS 7671 Regulation 514.1.1 requires a label or other means of identification to show the purpose of each item of switchgear and controlgear, unless there is no possibility of confusion (wording confirmed only via secondary sources; I have no licensed copy). In practice each gang of a grid switch bank and each contactor is labelled. If gangs in one box are fed from different phases of the TPN board, BS 7671 514.10.1 asks for a warning of the higher voltage between them (the familiar "DANGER 400 VOLTS" label) **(from memory, not checked against the text in this session)**; small units usually avoid this by putting all the lighting on one phase.

### What is common in a modest unit

What follows is drawn from the sources and general UK practice; there is no single standard layout, and I found no published survey.

- **Zones by row.** Lighting is split into a few switched zones, usually by row of luminaires, so that one end or side can be lit alone, and rows nearest the rooflights or loading doors can be switched apart for daylight. Twelve battens in three rows of four gives three natural zones.
- **Switching at the main pedestrian entrance.** A bank of 20 A grid switch modules in a metalclad (galvanised steel) plate, surface mounted on a metalclad box on the blockwork or steel by the personnel door, one gang per zone, each labelled. Metalclad is the norm in warehouses for its robustness; plastic domestic plates are not used.
- **Emergency lighting test key in the same plate.** A key-operated module marked EMG LTG TEST (or similar) that breaks the unswitched permanent live to the self-contained emergency fittings of that lighting circuit, so the monthly BS 5266 flick test can be done; MK sells grid modules marked for exactly this. It sits in the same plate as the lighting switches because it must break the supply of the same circuit.
- **Detection on the high bays.** New or refurbished units fit presence/absence detectors at roof level, one per zone or per few fittings, either switching the zone directly (the detector's own 10 A relay) or dimming it over DALI. With a detector, the grid switch at the door becomes the zone's master on/off (or, in absence mode, the "manual on"), and the detector turns the zone off when nobody has been seen for the set time and holds it off when daylight is enough.
- **Contactors when the switching is remote or the load large.** Larger sheds put a lighting contactor per zone in the distribution board or in a small enclosure beside it, operated by grid switches (often retractive) at the doors, by a timeclock, or by a BMS; contactors are also how a single key switch or panel switches many circuits on three phases. In a twelve-fitting unit this is optional, and less likely than direct switching.
- **Central DALI systems** (CP Electronics RAPID or VITAL, Helvar, Zumtobel LITECOM and the like) are for large or multi-tenant buildings and offices; a 900 m² single unit with twelve fittings rarely has one. A DALI detector per zone (EBDHS-DD) gives daylight dimming without a central system.

### Recommendation for this 30 × 30 m unit

Recommended baseline (realistic, compliant with ADL 2021, and simple to model):

1. **Three zones**, one per row of four battens: ZONE 1 (one outer row), ZONE 2 (centre row), ZONE 3 (other outer row). Name them by place if the owner prefers (for example LIGHTS WEST / CENTRE / EAST, or by the rooflights). Each zone is its own lighting circuit, all three on one phase of the JK104B (no 400 V warning needed), each on its own MCB labelled LIGHTING ZONE 1/2/3 on the board's circuit chart. A Type C 6 A or 10 A MCB is the usual choice for LED lighting circuits **(practice, not sourced here)**.
2. **At the main pedestrian door** (south entrance in the shell's frame; the north door is an escape and gets no switches, as escape routes are covered by emergency lighting): one MK Metalclad Plus Grid Plus **4-module plate K3494ALM** (86 × 146 mm) on a 2-gang metalclad grid surface box, carrying three **20AX 2-way grid switch modules** (MK K4892WHI, used one-way) labelled ZONE 1, ZONE 2, ZONE 3, and one **EMG LTG TEST** key switch module. Mounted with its long side horizontal, centre about 1.1–1.2 m above floor **(estimate; ADM range for switches is 450–1200 mm)**, beside the door on the latch side. Replace the existing one-gang WAREHOUSE LIGHTS switch at the south door with it, and remove the one at the north door (or leave a single gang there labelled for the zone nearest that door, if the owner wants lights switchable from both ends; that would need 2-way wiring, and a 2-way switch at each end).
3. **On the roof steel**: one **CP Electronics EBDHS-PRM** high-bay PIR detector per zone, at the middle of each row, about 6.5 m up (just below the battens' suspension level), in its surface box. Each switches its zone's luminaires through its own 10 A relay, fed from the zone's grid switch; it turns the zone off after its time-out (10 s to 99 min, typically 15–20 min) with nobody seen, and holds it off while daylight is enough (lux level sensing). With three detectors at about 7 m each covering an estimated 18–19 m circle, the rows are covered.
4. **Nothing extra in the DB** in the baseline: the three MCBs are the whole of the board's part. No contactors.

Alternative (more machinery to play with; plausible but less likely for twelve fittings): a small **lighting control enclosure** (Hager Vector VE112, 12 modules, grey, clear door) fixed beside the JK104B, holding three **Hager ERC225** override contactors (1 module each, slide switch 1 / Auto / 0, mechanical position flag) labelled ZONE 1/2/3, with the grid switches at the door now switching the contactor coils, and optionally a 7-day timeclock in the same enclosure. Its sound and behaviour (a clunk as the coil pulls in, the manual override forcing a zone on or off, a status flag showing whether it is closed) suit a game that likes working parts. If chosen, the detectors switch the coil circuits instead of the lighting circuits.

My recommendation is the baseline, as what a real modest unit fitted out since 2022 most likely has; the alternative is what a bigger shed has, and it is the owner's call whether the game wants it.

## Part 1: the switch bank by the door

### MK Metalclad Plus, Grid Plus front plate (MK Electric, a Honeywell brand)

- **Codes and sizes** (MK Metalclad Plus catalogue page 234, the surface wiring devices section, as served by Farnell; and MK's own product page for K3494ALM):
  - K3491ALM: 1 module, 86 × 86 mm
  - K3492ALM: 2 module, 86 × 86 mm
  - K3493ALM: 3 module, 86 × 146 mm
  - **K3494ALM: 4 module, 86 × 146 mm** (recommended)
  - K3496ALM: 6 module, 146 × 146 mm
  - K3498ALM: 8 module, 146 × 146 mm
  - K3499ALM: 9 module, 146 × 206 mm
  - K3502ALM: 12 module, 146 × 206 mm
  - K3508ALM: 18 module, 206 × 206 mm
  - K3514ALM: 24 module, 206 × 266 mm
  - Standard: BS 5733:2010. The 3 and 4 module plates are the 2-gang (86 × 146) size; fixing centres 120.3 mm on K3493ALM (Sparks Direct listing; the matching blank plate K3369 is given by MK as 120.6 mm).
- **Mounting frame**: the modules clip into a grid yoke (K3703 is the 3-gang yoke, listed by Sparks Direct as needed with K3493ALM; I did not find the 4-module yoke code), which screws to the box; the plate screws over it.
- **Boxes**: 2-gang metalclad grid box K8892ALM, 38 mm deep (Farnell), for the 3 and 4 module plates (Sparks Direct names a "2 gang 35 mm back box" as the requirement for K3493ALM); K8893ALM is the 6–8 gang box, 146 × 146 × 38 mm, with 4 × 20 mm and 4 × 25 mm knockouts (CEF; now discontinued). MK says its plain 1 and 2 gang Metalclad Plus boxes (86 × 86 × 38 and 86 × 147 × 38 mm) are not suitable for Grid Plus modules.
- **Appearance**: the ALM finish is zinc-coated, "aluminium" coloured heavy-gauge steel (Farnell: "heavy gauge steel construction plate"; RS gives the face colour as aluminium), a pressed plate with softly rounded corners and a turned-back edge, fixed by two (on the 86 × 146 plate) round-headed screws on the long centre line, near the short ends **(fixing positions from the 120.3 mm centres; screw head look an estimate from product photographs I have seen, not inspected here)**. The box behind is the same finish, slightly smaller than the plate, with the plate overhanging it a few millimetres all round **(estimate)**. Conduit (20 mm galvanised or the shell's existing conduit) enters the box from above through a knockout.
- **Apertures**: one rectangular window per module, side by side in one row on the 86 × 146 plate; the four modules of K3494ALM sit in a row along the 146 mm length.

### MK Grid Plus 20AX switch modules

- **K4892WHI**: Grid Plus 20 A 2-way switch module, white (Farnell). **K4896WHI**: 20 A double-pole 1-way, white (Sparks Direct: 59 H × 23 W × 34 D mm, needs a 35 mm box). **K4899WHI**: 2-way and centre off. RS gives a Grid Plus 2-way module as 25 W × 59 H × 25 D mm. The sources disagree on depth (25 to 34 mm); take **25 mm wide × 59 mm high** as the module's overall face size, of which only the rocker and its surround show through the plate **(the visible window size is an estimate: about 22 × 44 mm)**.
- **Look**: a white moulded rocker in a white surround, the rocker split across its middle (press the top or bottom), modules standing upright side by side. Modules are also made in black and other colours; white modules in a metalclad plate is the common combination.
- **Alternative maker**: Click Scolmore GridPro, with official dimensions: the 20AX 2-way retractive module GM2004PW is 24.5 W × 50 H × 22.5 D mm, polar white, nylon body and urea rocker, needs a 25 mm box (35 mm with a flat plate); the 2-way switch GM2002PW is the same size. GridPro metalclad 6-gang plate and box CL20506: 146 × 146 mm, 40–42 mm deep, two GR20400 yokes. The GM2004PW retractive module is what a contactor or impulse relay scheme would use.

### Labels

BS 7671 514.1.1 (above) asks for each switch's purpose to be identified. Grid Plus switch modules carry no legend of their own (apart from specially marked ones, below), so installers fix a label under or over each gang: an engraved laminate (traffolyte) strip, white on black or black on white, screwed or stuck to the plate, or a printed tape label (Brother publish a guide to labelling under the wiring regulations) **(practice; no single source)**. For the game: a small label under each module reading ZONE 1, ZONE 2, ZONE 3 and, under the key switch, EMG LTG TEST, plus a strip across the top of the plate reading WAREHOUSE LIGHTING.

### How to model it

- Box: 146 × 86 × 38 mm, galvanised grey, behind the plate, landscape.
- Plate: 146 × 86 mm, about 1.2 mm thick steel **(thickness an estimate)** with rounded corners (about 6 mm radius, **estimate**), the same zinc-grey, two fixing screws on the horizontal centre line 120.3 mm apart.
- Four apertures in a row, 25 mm pitch **(estimate from the module width)**, centred on the plate.
- Modules 1–3: white rockers, `use` toggles each zone. Module 4: the key switch module (Part 2).
- Labels as `createMicroLabel` strips under each module (they must not take the click, per the project rule).
- Build it as a part on `beginPart` in `building-parts.ts`, bound to the room's building services model, as the existing `switch` fitting is, and add it to `ARCHITECTURAL_FITTINGS` with the MK sources.

## Part 2: the emergency lighting test key module

- **MK K4898ELW** (listed by Sparks Direct as K4898ELWHI and by Screwfix as K4898ELWHIS3): Grid Plus 20 A single-pole 2-way secret key switch, white, marked "EMG LTG TEST", supplied with secret key 3405ZIC. **MK K4917ELWHI**: 20 A double-pole 1-way version, also marked and supplied with key 3405ZIC. The plain key module K4898WHI is 59 × 22 × 22 mm per Sparks Direct. Honeywell's site now lists the Grid Plus secret key modules as discontinued; they are still sold by wholesalers.
- **Look**: a white module the size of a switch module, with a small round chromed keyhole in place of the rocker and the legend EMG LTG TEST printed on its face **(layout of keyhole and legend an estimate)**. The key is a small flat "secret" key, removed after use.
- **Function**: turned, it breaks the permanent (unswitched) live to the self-contained emergency fittings on that lighting circuit, so they go to battery; turned back, they recharge.
- **How to model it**: the fourth module of the plate; `use` turns it (when the key is in, if the game models the key at all), and it drives the emergency lights' test input of the building services model, as the training room's and dev8's test key switch already does.

## Part 3: the lighting contactor

### Hager ERC225 (override contactor) and ESC225 (plain)

- **ERC225**: override contactor, 25 A 2NO, 230 V~ 50 Hz coil. 1 module: 83 H × 17.85 W × 60 D mm. AC-7a/AC-7b; Ue 230 V, Ui 250 V, Uimp 4 kV; 100,000 mechanical operations, 30,000 electrical; 4 W loss at rated current, 10.7 VA inrush; terminals 1–6 mm² flexible, 1–10 mm² rigid, 1.2 Nm. "With switch for manual switch: Yes" (Hager catalogue page).
- **ESC225**: the same contactor without the manual switch (Hager datasheet: "With switch for manual switch: No", "Hum-free: No"), same 83 × 17.85 × 60 mm. Hager's catalogue page gives its lamp loads as 1900 W incandescent, 950 VA fluorescent, 810 VA parallel-compensated fluorescent; no LED figure. ESC225S is the "humfree" (silent) version, not recommended for continuous 24/7 duty.
- **ESC440**: 40 A 4NO, 3 modules, 85 H × 54 W × 60 D mm, for bigger three-phase loads (not needed here).
- **Appearance of the ERC225** (from Hager's product photograph in the datasheet): light grey moulded DIN-rail body (RAL 7035-like) with the usual stepped modular profile (a raised front "nose" between the lower terminal shoulders); two screw terminals top (1, 3) and two bottom (2, 4), with the coil terminals A1 (top) and A2 (bottom) set forward on the nose; on the front, the blue Hager logo and "ERC 225", "Ith 25A, Ui 250V~" in small print, a small rectangular window with a black/white mechanical contact-position flag beside the text, a vertical slide switch with three positions marked, top to bottom, **1 (bracketed, forced on) / Auto / 0**, a small square "+" mark, and at the foot a hinged clear plastic label cover over a printed wiring symbol (A1, 1, 3 / A2, 2, 4, 230 V~ 50 Hz).
- **How to model it**: a 1-module DIN device 18 × 83 × 60 mm on the rail of the lighting enclosure (Part 4) or of the JK104B; a component of the self-acting kind (the existing contactor component: pull-in, drop-out) with an added three-position override slide (forced on, auto, off) worked by `use` (one step per use, like a selector), and a two-state flag in its window. Sound: the contactor's pull-in clunk already in the parts' audio. Brand it, if at all, as Hartwell & Bligh (the game's contactor maker) per the brands rule, in small print only.

### Schneider Acti9 iCT (alternative)

- Manually operated iCT contactors have a selector on the front with positions **O (off), auto, I (temporary on, springs back to auto), I + P (permanent on, latched for maintenance)** (Schneider Acti9 iCT catalogue). Mechanical contact-position indicator.
- 2P 25 A 2NO 230–240 V with manual control: A9C21732 (2 modules of 9 mm = 18 mm wide; listed as end of life, replaced by A9C25732). 4P 25 A 4NO manual: A9C21834, 36 W × 81 H × 60 D mm, 4.6 VA hold, 34 VA inrush, 30 dB, 1,000,000 mechanical cycles, up to 100 operations a day (Schneider e-catalogue sheet).
- Use it only if the board is not Hager; in a Hager JK104B board a Hager contactor is the natural choice.

## Part 4: the lighting control enclosure (alternative scheme only)

- **Hager Vector VE112** (VE112L / VE112U / VE112PN variants): 12-module surface enclosure, 302 H × 310 W × 151 D mm, light grey RAL 7035, IP65 with the door shut; the VE112L has a transparent door, the VE112U an opaque one (Hager datasheets; retailer listing for VE112H also transparent). VE212PN is the 2 × 12 module version (dimensions not found).
- **Contents for this unit**: three ERC225 contactors labelled ZONE 1/2/3, optionally a 7-day timeclock (Hager EG071/EG203 are now phased out; EGN103 is the named successor) and blank cover strips over the spare modules (Hager P012 cover strip for 12 modules). Hager's own timer literature recommends switching loads through modular contactors from a time switch.
- **How to model it**: a grey box with a clear hinged door beside the JK104B, one DIN rail with a moulded shroud, labels printed on the shroud under each device. Only build it if the owner chooses the contactor scheme.

## Part 5: the high-bay presence/absence detector

### CP Electronics EBDHS-PRM (Legrand), switching

- **Datasheet (issue 2)**: PIR presence/absence detector for high bay/high level, flush mounted, IP40, switching with lux level sensing; absence detection functionality; programmable by IR handset (UHS5, UHS7, UNLCDHS) from the floor. 230 V AC ±10%, 50 Hz; parasitic 847 mW; 10 A relay rated for incandescent, fluorescent, compact fluorescent, **LED (10 A)**, resistive heaters and fans; time-out 10 s to 99 min; flame-retardant ABS/PC casing, class 2; 0.2 kg; −10 to 35 °C; cutout 64 mm; supplied with adjustable masking shields.
- **Detection**: up to 40 m (footprint diameter shown in the datasheet's pattern drawing) at 15 m mounting height; mountable up to 20 m. At 7 m: about 18–19 m diameter **(estimate, scaling the 15 m cone; real PIR patterns are not exact cones and need the masking shields to stop them reaching into the next zone)**.
- **Dimensions**: 88 mm diameter flange; the dome stands 49 mm below the mounting surface and the body 63 mm behind it (datasheet drawing: 88, 49, 63).
- **Appearance** (datasheet photographs): white, a round flange ring with a large faceted, translucent white Fresnel dome (a hemisphere of many small hexagonal and rhombic facets) below it; the body above the ceiling is a white cylinder with spring clips. Mounted on an open roof it goes in a surface back box (DBB, listed as an accessory on the datasheet; Legrand gives the DBB as white, 76 mm × 65 mm deep; whether square or round is not confirmed), or in an EBD-ENCIP1 IP65 enclosure; there is also a wall bracket EBDHS-DBB-WBRKT, 125.5 × 101.5 × 108.5 mm. A luminaire-mounted variant (EBDHS-MB, M20 × 1.5 thread) screws into a luminaire body or a conduit box.
- **Wiring**: switching variant: live in, switched live out to the zone's luminaires (up to 10 A), neutral, earth; the supply comes from the zone's grid switch in the baseline scheme. In the contactor scheme it would switch the contactor coil instead.

### EBDHS-DD (DALI/DSI dimming)

Same body and pattern, DALI/DSI dimming of up to 20 drivers, two channels, maintained illuminance (daylight linking), step-down illuminance, scene recall; parasitic 299 mW. Needs DALI drivers in the battens (Aquaforce Pro is sold with DALI drivers as an option; I did not confirm the exact article). Use it only if the game wants daylight dimming rather than daylight switching.

### How to model it

A white disc 88 mm across, a faceted dome 49 mm deep below it, on a short white box (76 mm, 65 mm deep) fixed to a purlin or to the cable ladder near the middle of each row, at about 6.4 m; small, so it should be merged as `fine` detail and culled at distance. Behaviour: in the building services model, a zone's lights are on when its grid switch is on, AND (someone has been within the detector's circle within the time-out) AND (daylight below the set lux, if daylight hold-off is modelled). A real detector has a small red LED that blinks when it sees movement during walk testing; I did not find this in the EBDHS datasheet, so leave it out or mark it as licence.

## Part 6: DALI scene plates (optional, not recommended here)

A central DALI system's wall plates are 86 × 86 mm UK-box plates with two to eight buttons: CP Electronics' RAPID scene select plate EBR-MS-S2 (86 mm square face, white, stainless or polished brass plates; datasheet drawing only partly readable), Helvar's 13x modular panels (each module about 35.4 × 48.4 × 31.8 mm) and 14xD2 panels (55 × 55 mm form factor), iLight's DALI control plate. They belong in offices and large sheds with a central lighting system; I found no evidence they are usual in a small single-tenant unit, and I recommend grid switches for this one.

## Unconfirmed / open questions

- **The owner's choice of scheme**: baseline (grid switches at the door + one detector per row, no contactors) or the alternative (contactors in a Vector enclosure beside the DB). This is the one decision to put to the owner.
- **Zone naming**: ZONE 1/2/3, or by position (WEST, CENTRE, EAST, or by the doors). Ask the owner.
- **Switching from both doors**: whether the north escape door gets switches too. Real practice usually puts the switch bank at the main entrance only.
- **MK Grid Plus module face size and visible window**: sources disagree (25 × 59 mm overall from RS and Sparks; depths 22 to 34 mm). The visible rocker window (about 22 × 44 mm) is my estimate. Scolmore GridPro's 24.5 × 50 × 22.5 mm is the only official module figure found.
- **Plate thickness, corner radius and screw head style** of the MK metalclad plate: estimates; check a product photograph.
- **The 4-module Grid Plus yoke code** for K3494ALM was not found (K3703 is given as the 3-gang yoke).
- **K4898ELW layout** (where the keyhole and EMG LTG TEST legend sit on the module face) is an estimate; Honeywell lists these modules as discontinued, though wholesalers stock them.
- **Hager ERC225 slide positions**: read from the datasheet photograph as "1 (bracketed) / Auto / 0" from top to bottom; Hager's text does not list them. Whether "1" is momentary or latching was not confirmed (Schneider's iCT has both: I momentary, I + P permanent).
- **LED lamp-load figures** for the Hager ESC/ERC contactors and the Aquaforce Pro driver's inrush were not found; irrelevant at this load, but the game should not quote a figure.
- **EBDHS-PRM absence mode wiring**: the datasheet claims absence functionality but does not show a switch input terminal; how the door switch gives "manual on" in absence mode is unconfirmed. The baseline treats the grid switch as the zone's supply and the detector as presence-off with lux hold-off, which needs no switch input.
- **DBB surface box shape** (square or round, 76 mm) unconfirmed.
- **BS 7671 514.1.1 and 514.10.1 wording**: confirmed only through secondary sources and memory.
- **Typical MCB type and rating** for LED lighting circuits (Type C, 6 or 10 A) is practice, not sourced here.

## Sources

- Approved Document L Volume 2, 2021 edition (6.16, 6.59–6.65, Appendix B LENI): https://assets.publishing.service.gov.uk/government/uploads/system/uploads/attachment_data/file/1045921/ADL2.pdf
- Statutory guidance page for Approved Document L: https://www.gov.uk/government/publications/conservation-of-fuel-and-power-approved-document-l
- MK Metalclad Plus catalogue page 234 (Grid Plus front plates, boxes, dimensions), via Farnell: https://www.farnell.com/datasheets/3698407.pdf
- MK product page for K3494ALM (4 module, 86 × 146 mm, BS 5733), archived as PDF: https://cdn.shopify.com/s/files/1/1043/4870/files/K3494_ALM.pdf
- Sparks Direct, MK K3493ALM (86 × 146 mm, fixing centres 120.3 mm, K3703 yoke, 2-gang box): https://www.sparksdirect.co.uk/switches-and-sockets/grid-systems-and-modules/mk-grid-metal-clad/mk-k3493alm-3-gang-metalclad-front-plate-for-mk-grid-plus-three-gang-front-cover-plate-metal-clad
- BEW Direct, MK K3498ALM and K3499ALM: https://bewdirect.co.uk/wiring-accessories/grid-and-modular/mk-grid-plus/mk-grid-plus-k3498alm-metalclad-8-module-frontplate and https://bewdirect.co.uk/wiring-accessories/grid-and-modular/mk-grid-plus/mk-grid-plus-k3499alm-metalclad-9-module-frontplate
- CEF, MK K8893ALM 6–8 gang grid box: https://www.cef.co.uk/catalogue/products/147388-6-8-gang-steel-box-with-8-knockouts
- Farnell, MK K8892ALM 2-gang grid box: https://ie.farnell.com/mk/k8892alm/grid-2-gang-surface-box/dp/3458837
- Farnell, MK K4892WHI 20 A 2-way module: https://uk.farnell.com/mk/k4892whi/grid-plus-switch-20a-2-way/dp/3458765
- Sparks Direct, MK K4896WHI: https://www.sparksdirect.co.uk/mk-k4896whi-20a-double-pole-1-way-grid-module-switch-mk-grid-plus-white
- Sparks Direct, MK K4898WHI key switch: https://www.sparksdirect.co.uk/mk-k4898whi-20a-2-way-grid-module-key-switch-single-pole-with-key-grid-plus-white
- RS, MK Grid Plus 2-way module (25 × 59 × 25 mm): https://za.rs-online.com/web/p/switch-insert-modules/3413932
- Sparks Direct, MK emergency lighting test key module: https://sparksdirect.co.uk/mk-logic-20a-dp-grid-key-switch-marked-quotemergency-lighting-testquot-1-way-modular-switch-white and https://sparksdirect.co.uk/mk-sp-key-sw-grid-el-test-marked-p-14926.html
- Screwfix, MK 20 A 2-way SP emergency lighting test secret key switch: https://www.screwfix.ie/p/mk-20a-2-way-sp-emergency-lighting-test-secret-key-switch-white/26165
- Honeywell, Grid Plus secret key switch modules (discontinued): https://buildings.honeywell.com/us/en/products/by-category/electrical-and-wiring/wiring-devices/switches/grid-switches/grid-plus-secret-key-switch-modules
- Scolmore GM2004PW datasheet (24.5 × 50 × 22.5 mm): https://www.expertelectrical.co.uk/media/catalog/product/g/m/gm2004-datasheet.pdf
- Scolmore GridPro CL20506 metalclad 6-gang plate and box: https://www.cef.co.uk/catalogue/products/4567175-6-gang-front-plate-with-surface-box-metal-clad and https://www.yesss.co.uk/gridpro-metal-clad-6-gang-2-rows-of-3-grid-frontplate-back-box
- Hager ESC225 datasheet: https://assets.hager.com/step-content/P/PDS_159055416901EN/Document/std.lang.all/ESC225_6901_en-GB.pdf
- Hager ESC225 catalogue page (lamp loads): https://hager.com/intl-en/catalogue/information/esc225-contactor-25a-2no-230v
- Hager ERC225 catalogue page and datasheet (photograph): https://hager.com/intl-en/catalogue/information/erc225-override-contactor-25a-2no-230v and https://assets.hager.com/step-content/P/PDS_157896730000EN/Document/std.lang.all/ERC225_0000_en-GB.pdf
- Hager ESC440 datasheet: https://assets.hager.com/step-content/P/PDS_159325146401EN/Document/std.lang.all/ESC440_6401_en-GB.pdf
- Hager ESC225S datasheet (humfree, not for 24/7): https://assets.hager.com/step-content/P/PDS_160497983001EN/Document/std.lang.all/ESC225S_3001_en-GB.pdf
- Schneider Acti9 iCT catalogue (manual control positions O / auto / I / I + P): https://baoanjsc.com.vn/TaiLieu/Contactors-SCHNEIDER-Acti-9-iCT-series-CATALOG-374.pdf
- Schneider A9C21834 e-catalogue sheet (36 × 81 × 60 mm): https://efobasen.efo.no/mime_root/20/A9C21834%20%7C%20Modul%C3%A6r%20kontaktor%20%7C%20iCT%20%7C%20Norge%20AS%20%7C%20Schneider%20Electric%20eKatalog.pdf
- Hager VE112L datasheet: https://assets.hager.com/step-content/P/PDS_156621125101EN/Document/std.lang.all/VE112L_5101_en-GB.pdf
- Hager VE112U product page: https://hager.com/uk/products/h/ve112u-encl-vector-ip5x-12m
- Hager timers and contactors flyer: https://assets.hager.com/step-content/P/HA_70595472/Document/std.lang.all/Hager%20_Timers%20and%20Contactors%20Flyer.pdf
- CP Electronics EBDHS-PRM datasheet issue 2: https://assets.legrand.com/pim/NP-FT-GT/EBDHS-PRM%20Datasheet%20Issue%202.pdf
- CP Electronics EBDHS-DD datasheet issue 2: https://assets.legrand.com/pim/NP-FT-GT/EBDHS-DD%20Datasheet%20Issue%202.pdf
- CP Electronics EBDHS-MB datasheet issue 2: https://assets.legrand.com/pim/NP-FT-GT/EBDHS-MB%20data%20sheet_issue%202.pdf
- Legrand, CP Electronics DBB surface back box: https://legrand.co.uk/en/catalog/products/cp-electronics-surface-mount-back-box-white-dbb
- Legrand, EBDHS wall bracket: https://www.legrand.co.uk/en/catalog/products/cp-electronics-ebdhs-wall-mount-bracket-white-ebdhs-dbb-wbrkt
- Thorn Aquaforce Pro 1600 mm, 52.3 W (article 96630758): https://www.thornlighting.lu/en-lu/p/96630758
- Thorn MCB loading sheet for the ALG5 driver (example of a luminaires-per-MCB table): https://www.zumtobel.com/PDB/resources/manual/MCB_96671930.pdf
- ABB, protecting LED lighting circuits (inrush): https://new.abb.com/news/detail/67528/how-to-protect-lighting-circuits-for-led-lights
- Ex-Or HighBay LightSpot (high-bay presence detection practice): https://modbs.co.uk/news/fullstory.php/aid/5831/Lighting_controllers_designed_for_buildings_with_high_racks.html
- CP Electronics RAPID scene plate EBR-MS-S2: https://assets.legrand.com/pim/NP-FT-GT/EBR-MS-S2%20Data%20Sheet_Issue%201.pdf
- Helvar 14xD2 control panels: https://helvar.com/product/14xd2-control-panels-dali-2/
- Voltimum / NICEIC on BS 7671 identification (514.1.1): https://www.voltimum.co.uk/articles/identification-electrical-wiring

## 2026-10-19: model verification

**Confirmed:** CP Electronics' [EBDHS-PRM datasheet](https://assets.legrand.com/pim/NP-FT-GT/EBDHS-PRM%20Datasheet%20Issue%202.pdf) specifies the 88 mm flange and the 49 mm below-ceiling and 63 mm above-ceiling dimensions. **Estimated:** the model's polygonal dome approximates the Fresnel facet pattern, and its red walk-test LED remains an artistic licence; the datasheet does not specify a visible LED. The surface box is modelled square because its exact outline was not confirmed.

**Confirmed:** The MK Metalclad Plus K3494ALM dimensions and module arrangement recorded above remain the basis of the model. **Estimated:** the pressed rim, visible grid recess, screw slots and rocker travel are drawn from catalogue appearance rather than measured dimensions.
