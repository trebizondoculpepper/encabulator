# Emergency lighting and lighting-circuit parts (UK)

## 2026-10-19: first survey

Research for modelling the emergency lighting, exit signs, test switch, lighting protection and general lighting of the present-day English warehouse and office rooms at true size. Each section names one real product to copy (under a maker's name of our own), its source, its dimensions and appearance, its data and a short note on how to model it. Where a figure could not be confirmed from a manufacturer's document it says so. Figures marked "estimate" are mine, not a manufacturer's.

Contents: 1 high-mounting emergency downlight; 2 twin-spot; 3 bulkhead; 4 exit box sign; 5 test key switch; 6 lighting circuit protection; 7 general lighting (batten and high bay); 8 electrical and standards facts; unconfirmed and open questions.

Thorn's own web site (thornlighting.co.uk, .com, .fi) sits behind Cloudflare and refused every automated fetch; Thorn's PDFs were reached through the Zumtobel group's mirror (`resources.zumtobel.com/PDB/...`), which serves the same files.

## 1. Self-contained LED emergency downlight for high mounting

**Product:** Thorn Voyager Star, recessed (MRCR) or surface (MSC), self-contained, with its three interchangeable lenses: ANT (anti-panic / open area), ESC (escape route) and HC (high ceiling). Self-contained variants: E1/3 (1 h or 3 h, selectable, manual test), E1/3T (auto test), E1/3D (DALI), E1/3BC (Casambi); and E3/8, E3/8T, E3/8D, E3/8BC (3 h or 8 h). Example codes: VOYAGER STAR MRCR ANT E3 WH, Thorn 96548988 (recessed, open-area optic, white); VOYAGER STAR MRCR ECP P WH, 96638083 (central-battery sibling, used here only for its dimension data). For the game: a recessed E3/8T (3 h, auto test), white, non-maintained, with the HC lens over the warehouse floor.

**Sources:**

- Spacing guide (German, 2025, based on EN 1838:2025-03, maintenance factor 0.9, measured 2 cm above the floor, 2 m corridor): https://resources.zumtobel.com/PDB/resources/teaser/DE/TLG_VoyagerStar_Installation_Spacing.pdf
- Installation leaflet MAN_VSTR_MRCR_2520 (May 2025): https://resources.zumtobel.com/PDB/Ressource/Manual/TLG_VSTR_MRCR.pdf
- Dimension data from a German wholesaler's copy of Thorn's data for 96638083: https://www.hardy-schmitz.de/Thorn%20VOYAGER%20STAR%20MRCR%20ECP%20P%20WH-4701500.html
- Thorn product listing 96548988 (search excerpt only; page blocked): https://thornlighting.co.uk/en-gb/products/controls-and-emergency-lighting/emergency-lighting-luminaires/Voyager_Star/voyager-star-recessed-area/96548988

**Dimensions (recessed MRCR):** visible flange Ø85 mm; overall height 27 mm, of which 22 mm is recessed above the ceiling, so about 5 mm stands below the ceiling face (5 mm is derived: 27 − 22). Ceiling cut-out Ø65–68 mm (wholesaler data; the installation leaflet's drawing reads "Ø 65-80mm", so 68 mm is a safe hole to model). Ceiling thickness 1–25 mm. The leaflet asks for at least 150 mm clearance (drawn above the fitting). Thorn's listing excerpt for 96548988 gives "Ø85 x 2 mm", that is, the flange is a thin 2 mm disc at the ceiling. Battery: LiFePO4 3.2 V 2.0 Ah (E1/3 family, Thorn spare 59013928) or 3.2 V 3.8 Ah (E3/8 family, 59013929). IP20, IK03 (leaflet) or IK04 (wholesaler). Class II. 220–240 V 50/60 Hz. Max system power 3.9 W (central version). Through-wiring, 0.75–2.5 mm².

**Appearance:** a small white (WH) or black (BK) or silver (SR in the spot variants) round disc flush with the ceiling, with a small clear polycarbonate lens in the middle; the lens is a push-in insert (ESC, ANT or HC), chosen on site. A single status window shows a green LED and a red LED. Colour of the finish: the order code suffix WH is white; no RAL given in what I could read.

**Status LED (from the leaflet, self-contained versions):**

- Manual-test versions (E1/3, E3/8): green steady = on mains (AC mode), battery connected. Green off = in emergency mode, in test mode, or battery disconnected. Function test monthly (1 min); duration test annually, for the rated 1, 3 or 8 h.
- Auto-test versions (E1/3T, E3/8T and the DALI/Casambi ones): function test every 7 days, duration test annually, started automatically (a manual start is also possible: a press of more than 1 s starts a function test, more than 5 s a duration test). Green steady = system OK. Green flashing slowly (1 s on, 1 s off) = duration test in progress. Green flashing fast (0.1 s) = function test in progress. Red steady = LED module failure; red flashing slowly = battery disconnected; red flashing fast = battery failure. Green and red both on = battery operation (emergency mode) or rest mode. A short 0.1 s / 1 s pattern means DALI inhibit mode; a 10 s pattern means address identification mode (DALI/Casambi versions only). The exact pairing of patterns to the red states is read from the leaflet's diagram, which pdftotext scrambled a little; treat the red flash assignments as probable.
- Selectable duration by DIP switch: E1/3 factory set to 1 h (switchable to 3 h); E3/8 factory set to 3 h (switchable to 8 h). Non-maintained by default for self-contained (maintained by adding a wire bridge or by DALI).

**Emergency output (from the spacing guide):** E1/3 at 1 h: 270 lm with ANT lens, 260 lm with ESC, 235 lm with HC. E1/3 at 3 h: 205 lm ANT, 200 lm ESC, 180 lm HC. E3/8 at 3 h: 270 lm ANT, 235 lm HC. E3/8 at 8 h: 145 lm ANT, 125 lm HC.

**Open-area (anti-panic, 0.5 lx) spacing, E3/8 at 3 h (the game's choice).** a = luminaire to wall, b = c = luminaire to luminaire. Where the guide gives a mixed layout (HC lens next to the wall, ANT lens between), its columns are a, b, c.

    Mounting   ANT lens          HC (wall) + ANT        HC lens
    height m   a      b=c        a     b      c         a      b=c
    2          3.50   8.00
    3          4.70   11.00
    4          5.60   13.70
    5          6.40   16.20
    6          7.00   18.50
    7                            3.90  9.25   14.60
    8                            3.90  8.95   14.00
    9                            3.90  9.20   14.50
    10                           3.90  9.35   14.80
    11                           3.80  9.40   15.00
    12                           3.80  9.50   15.20
    13                                                  3.80   14.60
    14                                                  3.80   14.90

Values in metres. The guide says heights between those listed may be interpolated linearly, never extrapolated. For the E1/3 at 3 h (205 lm) the same table is smaller: ANT a/b = 3.40/7.70 at 2 m, 4.50/10.70 at 3 m, 5.30/13.30 at 4 m, 6.00/15.60 at 5 m; mixed HC/ANT from 6 m (a 3.40, b 8.10, c 12.80) to 10 m (3.30, 8.25, 13.20); HC only from 11 m (a 3.30, b=c 12.70) to 14 m (3.30, 13.20).

**Escape-route (1 lx, 2 m wide) spacing, E1/3 at 1 h with ESC lens:** a/b = 7.65/16.00 at 2 m, 10.35/22.35 at 3 m, 12.50/27.75 at 4 m, 11.65/32.40 at 5 m, 9.70/32.65 at 6 m, 4.60/31.30 at 7 m, 2.55/30.35 at 8 m. With the E1/3 at 3 h and ESC lens: 7.35/15.60 at 2 m, 9.90/21.60 at 3 m, 11.65/26.65 at 4 m, 8.70/28.40 at 5 m, 4.10/27.45 at 6 m, 1.90/26.35 at 7 m.

For the 7.2 m warehouse roof (fittings at about 7 m) the guide's answer is the HC lens at the walls and the ANT lens between: about 3.9 m from a wall and about 9.25 m from the wall-row to the next row, 14.6 m between inner rows. A 30 × 30 m floor would need roughly a 4 × 3 grid (estimate, mine).

An older, simpler sheet for the previous Voyager C LED E3 (Thorn TLG_VYLD_E3_SPACING.pdf, ta = 30 °C, MF 0.8) gives the antipanic 0.5 lx a1/a2 as 2.35/8.95 at 2.5 m, 0.75/10.20 at 3.5 m, –/9.55 at 4 m, –/8.15 at 5 m; escape 1 lx 5.75/13.30 at 2.5 m, 5.40/17.30 at 4 m; spot 5 lx a1 2.15 at 2.5 m, 2.05 at 4 m. It shows why an ordinary open-area optic stops working above about 5 m: https://resources.zumtobel.com/PDB/resources/manual/TLG_VYLD_E3_SPACING.pdf

**Luminous intensity:** not obtained. The LDT file exists (`2_VSTR_A_E13-3H_230V_MODE_E13X_E38X_ECX_ELP.ldt`, linked from the wholesaler's page through Thorn's ldc viewer), but Thorn's server blocked it. If needed, an estimate: for the 7–8 m HC spacing of 14 m between fittings to give 0.5 lx at the midpoint (about 7 m out, 7.2 m down, so 10 m away at about 44° off axis; two fittings contribute), each must give roughly 0.25 lx × 100 m² / cos 44° ≈ 35 cd at 44°; with 180 lm that suggests a batwing distribution of perhaps 30–40 cd at 40–50° and less straight down (estimate only).

**How to model it:** a 85 mm white disc 2 mm thick flush on the ceiling tile or deck, a 5 mm shallow dome or lens boss in the middle (about 30–40 mm across, estimate) of clear polycarbonate, and a tiny status window (about 3 mm) beside the lens showing green steady when charged, with the auto-test flash patterns above (weekly 0.1 s flashing for the function test, 1 s flashing for the duration test). In emergency mode the lens lights at 180–270 lm, cool white (the CCT was not read; Thorn emergency LEDs are typically 5000–6500 K, estimate). Use the spacing table to place them. On the warehouse's open deck (no ceiling tiles) use the surface MSC version: same optic, a shallow round surface box (dimensions not obtained).

## 2. Twin-spot emergency floodlight (wall mounted, high bay)

**Product:** Whitecroft Lighting Twin Spot LED, code TSL2NM (COMEPS addressable test option: TSL2NM/EP). Whitecroft is a UK maker (Ashton-under-Lyne). Datasheet ©2024.

**Sources:** datasheet https://www.whitecroftlighting.com/products/downloads/twin-spot-led/1963/twin-spot-led-datasheet.pdf ; product page https://www.whitecroftlighting.com/products/twin-spot-led/ ; older halogen version (for comparison and dimensions) https://www.whitecroftlighting.com/content/files/knowledge_source/twin_spot.pdf

**Dimensions:** L 275, W 50, H 300, H1 155 mm; 3.6 kg. The datasheet does not label the axes on the text I could read. My reading (unconfirmed): the box is 275 mm wide, 300 mm high, the heads project 155 mm from the wall (H1), and 50 mm is probably the depth of the slim back box, the heads standing proud of it.

**Appearance:** an injection-moulded polycarbonate box, white RAL 9010, wall mounted (upright), with two independently adjustable LED heads with polycarbonate lenses, rotating 45–90° down and 20–90° to the side. Side cable entry by a 20 mm knockout. The datasheet does not mention an indicator LED for the LED version; the halogen predecessor had "a single LED for battery charge monitor and dual lamp filament monitor", and comparable LED twin-spots have charge and lamp-status LEDs (Luxna LXETS: "individual LED indicators for charge and lamp status"), so a green charge LED on the front of the box is a safe detail.

**Data:** 2 × 6 W LED heads, 380 lm per head in emergency, 6 W in non-maintained mode, 5000 K, CRI > 70, medium beam, LOR 100 %. 3 h self-contained non-maintained. NiCd 3.6 V 4 Ah. IP20. Ambient 0–25 °C. EN 60598-2-22.

**Spacing (Whitecroft performance guide):**

    Open area, 5 m wide, 0.5 lx min      Escape route, 2 m wide, 1 lx min
    Height   From wall  Between heads    Height   From wall  Between heads
    3.0 m    4.0 m      12.2 m           3.0 m    4.0 m      10.2 m
    4.5 m    4.6 m      13.0 m           4.5 m    5.0 m      12.1 m
    6.0 m    5.3 m      14.6 m           6.0 m    5.7 m      13.5 m

**Alternative IP65 version:** Luxna LXETS, 280 × 300 × 70 mm, 2 × 3 W, 500 lm total, IP65, 6000 K, LiFePO4 3.2 V 6 Ah, 3 h NM, charge and lamp-status LEDs, mounts in any orientation: https://cdn.yesss.co.uk/documents/1539860_03_LXETS_Datasheet_f632461b2d57289f72d693c936bb0bf3.pdf

**How to model it:** a white box about 275 × 300 mm on the wall at 4–6 m, two short cylindrical heads (lamp-holder size about 60–70 mm across, estimate) on yokes aimed 45–60° down and splayed apart, a small green charge LED on the box front. Twin spots are now the older choice; for the warehouse, item 1 with the HC lens is the more current answer, but a twin spot over the loading-gate wall would look right.

## 3. Emergency bulkhead (over an exit door, inside and outside)

**Product:** LEDVANCE EM BULKHEAD E 1.3W 3H EM/AC AT (rectangular emergency bulkhead, IP65, auto test). EAN 4099854230677. Datasheet dated 2026.

**Source:** https://docs.rs-online.com/6d4d/A700000015974009.pdf

**Dimensions:** 355 × 115 × 63 mm (length × width × height), 510 g. (A near-identical generic UK bulkhead, Farnell/Pro-Elec 243014, is 355 × 110 × 69.8 mm with fixing centres 240 mm and a 333 mm inner diffuser length: https://www.farnell.com/datasheets/4555490.pdf)

**Appearance:** white (nearest RAL 9003) polycarbonate/ABS body and cover, a rounded rectangle; the diffuser is the whole front, opal white (the datasheet says "cover material PC/ABS"; that the diffuser is opal rather than prismatic is my reading of the product family, not stated). Pictogram legends (running man and arrow) are supplied in the box to stick on the diffuser, turning it into a sign. Integrated test switch for manual testing as well as auto test; the status LED is not described in the datasheet (unconfirmed: a small green/red LED at one end of the base is usual).

**Data:** 200 lm in emergency, 1.3 W, 5700 K, Ra > 80, beam 100° × 120° (half-beam angles C0/C180 108.6°, C90/C270 122.6°). LiFePO4 3.2 V 1800 mAh, 24 h recharge, 3 h duration. Maintained or non-maintained (selectable), escape route and anti-panic. IP65, IK06, Class II, 0–45 °C. Surface mount, ceiling or wall, indoor (the datasheet says "Application environment: Indoor"; for an outside doorway a bulkhead rated for outdoor use is needed: Integral LED ILEMBH026, 355 × 110 × 70 mm, matt white, IP65, IK08, −20 to +50 °C, 250 lm mains, 130–160 lm emergency (its page disagrees with itself), https://integral-led.com/en/product/emergency-emergency-bulkheads/led-ip65-emergency-bulkhead-with-mains-power-operation-250lm-45w-4000k-3-hrs-no--ILEMBH026). Its cone table: at 2.0 m distance, about 6 lx on axis; at 3.0 m about 3 lx.

**How to model it:** a 355 × 115 × 63 mm white rounded box, wall-mounted centred about 150–300 mm above the door head (placement estimate), long axis horizontal; a white diffuser across the whole face, optionally with the green running-man legend applied; a small charge LED and test button at one end. Maintained over an exit, it is lit all the time.

## 4. Maintained LED exit box sign

**Product:** EXIT3MLED / EXIT3MLISO / SEEXIT3ML LED emergency exit box sign (sold by YESSS Electrical; the catalogue sheet does not show the maker's name; the "CATALOGUE RANGE" layout and the EB4 battery code look like ML Accessories (Knightsbridge), unconfirmed).

**Source:** https://cdn.yesss.co.uk/documents/354318_03_EXIT3MLED_Datasheet_1c8d1d9c40fd39b5cb29f481700cc501.pdf

**Dimensions:** 390 × 192 × 60 mm (from the drawing: 390 wide, 192 high, 60 deep).

**Appearance:** steel box, white, with an interchangeable polycarbonate legend panel at the front and a diffuser on the base "for added downward illumination of exit path". Knockouts on each side. "LED charge light" on the fitting and a battery test button (not on the self-test version). Legends: EXIT3MLISO comes with an ISO 7010 up-arrow legend; the others available are ISO 7010 left, right, up and down arrows (ISOEBLGDL/R/U/D) and the older Signs Directive arrows (EBLGDL/R/U/D).

**Data:** 3 h maintained as standard, configurable non-maintained; remote switching facility; 4 W; 55 lm in mains mode; viewing distance 32 m; IP20; 30,000 h rated life. SEEXIT3ML: automatic testing to EN 62034.

**Legend layout (ISO 7010 E001 + arrow, standard practice, not from this sheet):** a safety-green rectangle with a white running man exiting through a white doorway (E001, "emergency exit (left hand)", or its mirror E002 for right), with a white directional arrow (ISO 7010 supplementary, 45° or 90°) beside the man on the side he runs towards. In the UK the words "FIRE EXIT" or "EXIT" are often added on a white strip or in white below (BS 5499-4 permits text as a supplement; unconfirmed in a primary source here). The man always runs towards the arrow. Safety green is ISO 3864 green, close to RAL 6032.

**Viewing distance rule (secondary sources, not the standard text):** maximum viewing distance = 200 × sign height for an internally illuminated sign, 100 × for an externally lit sign (BS 5266-7 / EN 1838; Zemper and fire-safety suppliers). For this 192 mm sign the legend panel must be about 160 mm high to justify 32 m (32/200 = 0.16 m); the panel height is my estimate from that. A technical summary of the EN 1838 approach ties the distance factor Z to the mean luminance of the white: Z = 150 at ≥ 10 cd/m², 175 at ≥ 30 cd/m², 200 at ≥ 100 cd/m² (https://nippon.zaidan.info/seikabutsu/2002/00305/contents/053.htm). Other UK products for comparison: Thorlux Exit Sign 34 m, Thorlux Seven 26 m, Thorlux Exit Sign XL 60 m, Eterna SIGNLEDEM3 hanging sign 29 m.

**How to model it:** a white steel box 390 × 192 × 60 mm, wall or ceiling (on drop rods), with the green ISO legend panel filling most of the front, lit evenly from within (maintained, so always lit); a small opal strip on the underside casting light down; a green charge LED beside a small test button on the underside or side. Blade-style alternatives exist (edge-lit acrylic blade in a slim ceiling or wall bracket) for the office.

## 5. Emergency lighting test key switch

**Product:** MK Grid Plus K4898ELWHI, 20 A SP 2-way secret key switch marked EMG LTG TEST, white, supplied with its key (MK 3405ZIC). The double-pole equivalents are MK Logic Plus K4917ELWHI (20 A DP, "EMG LTG TEST"), Click Scolmore GridPro GM2046PWET (20 A DP, "marked Emergency Test", module 50 × 24.5 × 22.5 mm) and Hager Sollysta WMGKS/EL (20 A DP grid key switch, "EM LTG TEST", 59 mm high). A one-piece moulded version: Click Scolmore Mode CMA110, 10 AX DP 1-gang emergency test key switch, white moulded, for a 16 mm back box (an 86 × 86 mm plate, the Mode range's standard size; the plate size and legend are not stated on the retailer page).

**Sources:** https://www.bewdirect.co.uk/wiring-accessories/grid-and-modular/mk-grid-plus/mk-grid-plus-k4898el-2-way-sp-secret-key-switch-marked-emg-ltg-test-20a ; https://sparksdirect.co.uk/mk-logic-20a-dp-grid-key-switch-marked-quotemergency-lighting-testquot-1-way-modular-switch-white ; https://www.yesss.co.uk/sollysta-20a-double-pole-grid-key-switch-marked-emergency-lighting-test ; https://www.diy.com/departments/click-cma110-mode-10a-dp-1-gang-emergency-test-key-switch/5055112820294_BQ.prd

**Dimensions:** MK grid module 25 × 59 mm (retailer data; one listing gives 25 × 50 mm), mounted in a 1-gang grid frame behind an 86 × 86 mm front plate (the standard UK single-gang plate; the grid plate code was not checked). 250 V AC; BS 3676-1:1989 / BS EN 60669-1.

**Appearance:** a white plate 86 × 86 mm with one narrow grid module in the middle; on the module a small round brass/chrome key cylinder with a slot, and the legend EMG LTG TEST (MK) or EM LTG TEST (Hager) or EMERGENCY TEST (Click) printed in small black capitals above or below it. The key is a small flat "secret" key (MK 3405ZIC); UK electricians call such keys fishtail keys, but whether MK's 3405ZIC is the fishtail pattern was not confirmed (one forum user says two of his test switches took fishtail keys). Turning the key a quarter turn and pulling it out is not possible on most (the key is held while the switch is off; unconfirmed).

**Wiring (what the switch interrupts):** confirmed by a manufacturer: CP Electronics' ELT10 timed test switch "is designed to test the function of emergency luminaires by interrupting the permanent live mains supply"; the emergency load is on the normally closed contact, the incoming permanent live looped to the common, and at the end of the test "the permanent live supply to the emergency luminaires is automatically re-instated" (https://assets.legrand.com/pim/NP-FT-GT/WD004%20ELT10%20Installation%20Guide%20Issue%2011%20A4.pdf). The ELT10 offers 10 min, 1 h and 3 h tests, with SUPPLY ON, 10 MIN, 1 HOUR and 3 HOURS LEDs. That the normal lighting stays on during the test is the usual practice and the intent of BS 5266-1 (the test simulates failure of the supply to the emergency luminaires without interrupting the normal supply), but I found it only in forum quotations of BS 5266-1:2011 §8.3.3 ("simulate failure of the normal supply ... without interruption of the normal supply"; https://electricianforum.co.uk/threads/operation-of-the-emergency-lighting-test-switch-should-not-affect-the-normal-lighting.23618/), not in the standard itself. A maintained fitting has two lives (permanent and switched; Safelincs FAQ, https://www.safelincs.co.uk/category/emergency-lighting-faqs): the key switch breaks only the permanent (unswitched) live, so a maintained fitting's lamp stays on from the switched live while its battery takes over its emergency function; on a non-maintained fitting the lamp comes on from its battery. Double-pole key switches are often used so that both the permanent live and the neutral of the emergency circuit are broken (forum advice, unconfirmed).

**How to model it:** an 86 × 86 mm white plate with a grid module, a key cylinder and a black EMG LTG TEST legend, bound in the world model to the permanent live feeding only the emergency fittings of its area, not the lighting circuit. Turning the key (a "use") opens it; the fittings go to battery and light; turning back restores the charge (green LEDs back on). A timed ELT10-style unit is the alternative if a timed test is wanted.

## 6. Lighting circuit protection in a UK distribution board

**MCB:** Hager MTN106, 1-pole, curve B, 6 A, 6 kA (IEC 60898-1), 1 module. MTN110 is the 10 A one, same body. Height 83 mm, width 17.5 mm, depth 70 mm. Ue 230–400 V; Ui 500 V; Uimp 4 kV; IP20; 2.8 Nm terminals; rigid 1–35 mm², flexible 1–25 mm²; bottom connection "Bpiconnect" (busbar), top a screw terminal; grid distance (front-to-front of the DIN rows) 35 mm; power loss 1.30 W at In; rated current derates from 7.54 A at −15 °C to 4.36 A at 70 °C. Source: https://hager.com/uk/products/h/mtn106-mcb-1p-6ka-b-6a-1m

**RCBO:** the one the brief named, ADA906G, is a 2-module 1P+N device for Hager's European ranges. For a UK board, use Hager ADA306G: RCBO electronic 1P, 6 kA, curve B, 6 A, 30 mA, type A, 1 module. Height 92 mm, width 17.70 mm, depth 70 mm (taller than the MCB by 9 mm). Ue 230 V, Ui 250 V, max 253 V; IP2X; screw terminals top and bottom; neutral position right; a flying neutral lead (300 mm, retailer data) to the board's neutral bar. 16,000 electrical / 20,000 mechanical operations. Sources: https://assets.hager.com/step-content/P/PDS_156785553001EN/Document/std.lang.all/ADA306G_3001_en-GB.pdf and https://hager.com/uk/products/h/ada306g-rcbo-1p-6ka-b-6a-30ma-type-a-1m . The 10 kA single-module alternatives are ADA106U (discontinued) and ADB406U (width 17.8 mm).

**Face (appearance), partly unconfirmed:** none of the Hager datasheets describe the front. From general knowledge of the Hager range (not confirmed from a source here): a white (light grey-white) moulded body with a dark grey/black toggle, the rating "B6" and the Hager name printed on the front, the IEC 60898 rating box (6000, class 3), and a small contact-position window showing red for ON (I) and green for OFF (O). A retailer description of a sibling Hager MCB (NCN110A) confirms green for OFF. The RCBO has the same toggle plus a test button marked "T" (and "30mA", "IΔn") on the face; whether Hager's is a blue or grey button was not confirmed. Labels I/ON at the top of the toggle travel, O/OFF at the bottom, are the IEC convention.

**Board:** the game's board is a Hager Invicta JK104B, 125 A 4-way TPN, 500 × 465 × 132.5 mm, steel, RAL 7035 light grey, IP30, IK05, key and quarter-turn lock, supplied with neutral and earth bars (https://hager.com/uk/products/h/jk104b-125a-4-way-tpn-board-plain). What matters for modelling: a TPN board's "way" is three single-pole positions (L1, L2, L3), so 4 ways give 12 single-module outgoing devices, normally in one row, with the incomer (a 125 A 3-pole switch disconnector, not specified on the page) on the left or top. A lighting circuit is one single-pole MCB (or RCBO) on one phase; spreading lighting circuits across L1, L2 and L3 is normal, which is why one phase failing kills only a third of the lights. RCBOs in a TPN board each carry their own neutral lead to the neutral bar. The emergency fittings are fed from the same final circuit as the local lighting (BS 5266 practice: the permanent live is taken from the local lighting circuit, upstream of the light switch, so a fault that kills that circuit also starts the emergency fittings of that area; this is standard UK practice and the logic of the test switch, not confirmed from a primary source here).

**How to model it:** 17.5 mm per module (17.7 for the RCBO), 83 mm MCB and 92 mm RCBO bodies, 70 mm deep, on a 35 mm DIN rail behind the board's fascia with only the toggle front (about 45 mm square, estimate) showing through. The red/green window and the RCBO's T button are the visible states.

## 7. General lighting: LED batten and high bay

**Batten (already in the game):** Thorn Aquaforce Pro L, 1600 × 92 × 90 mm (the game's 1600 × 90 × 90 is within 2 mm), IP66, IK08, surface mounted, 2.5 kg. Variants: AQFPRO L LED8000-840 PC WB HF (Thorn 92901918), 52.3 W, 7670 lm, wide beam; a medium-beam 52.3 W at 7960 lm (96630758); 28 W at 4350–4510 lm; 69 W at 10110 lm (96636097); an emergency version 48.4 W, 6610 lm. 4000 K (840). Sources (search excerpts; Thorn's pages blocked automated fetch): https://www.thornlighting.fi/en-fi/products/indoor-lighting/industrial-lighting/Aquaforce_Pro/aquaforce-pro-l/92901918 and https://www.thornlighting.fi/en-fi/products/indoor-lighting/industrial-lighting/Aquaforce_Pro/aquaforce-pro-l/92903815

**High bay (more typical at a 7.2 m roof):** Thorn (ThornEco) Boris Flex, a round "UFO" LED high bay for single-point suspension (hook or chain), IP65, IK08, 90° wide beam, 4000 K, 50,000 h. 130–195 W selectable version (Thorn 96700009): Ø380 mm × 130 mm high, 3.13 kg, 20,000, 25,000 or 30,000 lm at 130, 160 or 195 W. 78–130 W version (96700008): Ø303 mm, 2.26 kg. Sources: CEF listings https://www.cef.co.uk/catalogue/products/5263205-boris-flex-130w-195w-led-high-bay-4000k and https://www.cef.co.uk/catalogue/products/5263204-boris-flex-78w-130w-led-high-bay-4000k ; ThornEco datasheet (195 W) https://media.goelectrical.com.au/Datasheets/ThornEco/ThornEco_Boris_96651365.pdf . The heavier rectangular Thorn HiPak Pro LED (756 × 271 × 92 mm, 104 W, 13,500–14,000 lm, 8.8 kg) is the older alternative.

**Which to use:** at 7 m both are seen in UK warehouses; long IP66 battens in continuous rows are common in racked aisles, round high bays over open floor. For a 30 × 30 m open floor at 7 m, about 12–16 Boris Flex at 20,000 lm would give roughly 200–300 lx (estimate, mine: 16 × 20,000 lm × 0.7 utilisation ÷ 900 m² ≈ 250 lx). The Aquaforce rows already in the game are plausible; no change needed.

## 8. Electrical behaviour and standards facts

### 8.1 Changeover of a self-contained emergency luminaire (IEC/EN 60598-2-22, IEC 61347-2-7)

The standard governing changeover is IEC 60598-2-22 clause 22.18 "Changeover operation" (edition 4.0, 2014 and edition 5.0, 2021; EN IEC 60598-2-22:2022 adopted without change), with the controlgear requirement in IEC 61347-2-7 clause 21 "Changeover operation" and its Annex L timing diagram. I could reach only the tables of contents (VDE previews: https://www.vde-verlag.de/iec-normen/preview-pdf/info_iec60598-2-22{ed5.0.RLV}en.pdf , https://www.vde-verlag.de/iec-normen/preview-pdf/info_iec61347-2-7{ed3.1}b.pdf), not the clause text. IEC 61347-2-7 defines changeover as "automatic connection of the lamp to emergency lighting supply when failure of the normal lighting supply occurs, and connecting automatically back to the normal lighting supply when it is restored".

The thresholds you recall (changes over before the supply falls to 60 % of rated, does not change over above 85 %) I could **not** confirm from a primary or manufacturer source. The nearest confirmed figures: Trilux (citing the EN 50171/EN 50172 central-system practice, not 60598-2-22) says changeover "must occur once the general power supply voltage has dropped by more than 15 % over a time period longer than 0.5 s" and that above 85 % of rated voltage the return to mains "must occur within 1 minute" (https://trilux.com/en/lighting-practice/lighting-equipment/specific-requirements-on-luminaires/emergency-light-installations/standby-electric-sources). Beghelli's DS3 UV mains monitor switches at U < 85 % Un (https://beghelli.it/en-de/products/safety-lighting/accessories-decentral-central-supply/mains-monitoring-module-ds3-uv). Kosnic's emergency modules say only that the changeover threshold "follows EN 60598-2-22". For the game, a model consistent with all of this: a self-contained fitting is guaranteed on mains at ≥ 85 % of 230 V (≥ 196 V), guaranteed on battery at ≤ 60 % (≤ 138 V), with each unit's own threshold somewhere between (a per-fitting random threshold in 140–195 V would make a sag light some fittings and not others, which is what one sees); returning to mains when the supply is back above 85 %, after a short delay. Treat the 60 % figure as unconfirmed.

Response time (EN 1838, via Tridonic's technical summary, below): 50 % of the required illuminance within 5 s and 100 % within 60 s; high-risk task area lighting within 0.5 s. A self-contained LED fitting in practice lights at once (well under 1 s).

### 8.2 LED drivers in sags, and flicker

- A typical good LED driver (Tridonic LCI 150 W, data sheet 06/17-LC113-9): rated 220–240 V, AC operating range 198–264 V, turn-on time ≤ 0.5 s, turn-off time ≤ 0.5 s, and "hold on time at power failure (output) 0 s"; to clear a latched fault "the AC is recycled (turn off the AC for longer than 0.5 s and then turn on)". https://bltdirect.com/downloads/products/Tridonic_ADVANCED_Series_150W_LCI_Compact_Fixed_Output_LED_Driver_2100mA_TEC_C.pdf . So an interruption of more than a few tens of milliseconds (whatever the bulk capacitor holds) puts the light out, and it comes back up to 0.5 s after the supply returns: a visible blink, then a clean restart. Below the operating range a driver either keeps regulating (constant current, no visible dimming) until its input stage drops out, or drops out and restarts; the exact dropout voltage is not published on that sheet.
- An experimental study of a flyback LED driver found stable operation through dips to 60 % and interruptions of up to 200 ms without intervention (Journal of Scientific Reports-A, doi 10.59313/jsr-a.1776888; https://www.citedrive.com/en/discovery/post-fault-behavior-of-led-circuit-driven-by-flyback-converter-under-voltage-dips-and-short-term-interruptions/). One topology only.
- Lamps that drop out "restart with output luminous flux reduced to zero for a restart period" (EC&M on LEDs and power quality, IEC 61000-4-11 being the immunity test: https://ecmweb.com/power-quality-reliability/ranking-electrical-disturbances-part-2-7).
- Fluorescent: electromagnetic ballasts are more sensitive to sags than electronic ones; extra DC-bus capacitance extends ride-through (Shareef, Mohamed, Marzuki, UAEU: https://research.uaeu.ac.ae/en/publications/analysis-of-ride-through-capability-of-low-wattage-fluorescent-la/). A fluorescent tube that goes out must restrike: with an electronic ballast about 0.5–1 s of preheat, with a switch-start glow starter several flickering attempts over 1–3 s (general knowledge, not from these sources).
- Flicker under fluctuating voltage: LED luminaires are generally less susceptible than incandescent lamps, but it depends strongly on the driver (Poznań 2017 study, https://www.measurement.sk/2017/msr-2017-0028.pdf); not all efficient lamps are less sensitive than incandescent, and the response depends on the complexity of the fluctuation (Azcárate et al. 2014, IJEPES 63:499–506; https://addi.ehu.eus/handle/10810/64462); CIGRE WG C4.111 concluded they "cannot generally be said to be more or less sensitive than incandescent lamps" (TB 656). LEDVANCE's bulkhead quotes Pst LM < 1 and SVM ≤ 0.4 for its own light at steady supply.
- For the game: a well-regulated LED fitting shows nothing during a shallow sag, then, if the sag goes deep or the supply breaks, goes out cleanly and snaps back within 0.5 s of recovery; a cheap driver may shimmer or dim visibly with the voltage. Fluorescent under the same events flickers, may drop out and then restrikes with the characteristic blink. The emergency fittings, if the sag passes their own threshold, come on at their low emergency output and go back to charging (green LED) when the supply recovers.

### 8.3 BS 5266-1:2016 and EN 1838 design figures

Confirmed from secondary sources (not the standards' text):

- Escape routes up to 2 m wide: at least 1 lx horizontal on the centre line at floor level, with the central band (at least half the width) at not less than 50 % of that; wider routes treated as 2 m strips or as open area. BS 5266-1 clause 5.2.5, BS EN 1838 clause 4.2.1 (NICEIC via Voltimum: https://www.voltimum.co.uk/articles/what-are-recommendations-emergency).
- Open area (anti-panic): at least 0.5 lx at the floor, excluding a 0.5 m border at the perimeter; for rooms over 60 m², areas an escape route passes through, and areas the risk assessment identifies. BS 5266-1 clause 5.2.6 (same source; the 0.5 m border is also in Tridonic's EN 1838 summary).
- Uniformity: Emax : Emin not more than 40 : 1, for both escape routes and open areas; Ra ≥ 40 (Tridonic, EN 1838 Technical Information 01-2020: https://a.storyblok.com/f/158120/x/16e33dc9a6/en-1838-emergency-lighting-en.pdf; also Ledil: https://www.ledil.com/?p=122580).
- Response: 50 % of the required illuminance within 5 s, 100 % within 60 s (Tridonic, EN 1838 summary).
- High-risk task areas: 10 % of normal maintained illuminance or 15 lx, whichever is greater, within 0.5 s, uniformity 10 : 1 (Tridonic summary; BS 5266-1 clause 5.2.7 per NICEIC).
- Points of emphasis (BS 5266-1 clause 5.2.8): luminaires at changes of direction, exits, outside the final exit to a place of safety, and similar points (NICEIC). The "within 2 m horizontally" rule (a luminaire within 2 m of each exit door, change of level, call point, fire-fighting equipment, first aid post) is the long-standing UK list; I found the 2 m only in a manufacturer's summary ("the direct area, at a distance of at least two metres, must also be illuminated", INOTEC: https://www.inotec-licht.de/en/system-luminaires/products/series/snp-2004-1), not in the standard.
- Fire-fighting equipment, call points and first aid points: 5 lx; since EN 1838:2013 this is required at the equipment regardless of whether it is on an escape route (Engineers Ireland on call points, "a minimum of five lux vertical illuminance shall be provided at each fire alarm manual call point": https://www.engineersireland.ie/Engineers-Journal/More/Sponsored/illuminated-call-point-cover; INOTEC as above). Whether it is 5 lx vertical at the equipment or horizontal at its foot is worded differently in different summaries; the 2013 change says "at the equipment to be operated", so vertical at the device is the safer model.
- Duration: EN 1838 minimum 1 h; UK practice for workplaces is 3 h (premises that may be reoccupied immediately after the event). The 3 h is from my knowledge of BS 5266-1, not confirmed from a source here.
- Testing (BS 5266-1 / BS EN 50172 practice, confirmed by Thorn's leaflet): a short function test monthly, a full rated-duration test annually; auto-test fittings (EN 62034) do a function test weekly.
- Exit signs: internally illuminated maximum viewing distance about 200 × legend height, externally lit 100 × (see item 4). EN 1838 was revised as EN 1838:2025 (Thorn's spacing guide cites "EN 1838 | 2025-03"); BS EN 1838:2013 is listed by BSI as withdrawn.

## Unconfirmed / open questions

- The 60 % lower changeover threshold of IEC/EN 60598-2-22 (the 85 % upper figure is supported by Trilux and Beghelli for related systems). The clause text (22.18) was not reachable. Someone with access to the standard should check it.
- Voyager Star: the exact cut-out (65–68 mm per wholesaler data, "65–80 mm" in the leaflet drawing), the lens diameter, the position of the status window on the flange, the CCT, and the intensity distribution (LDT blocked). The red-LED flash meanings are read from a scrambled diagram.
- Whitecroft Twin Spot LED: which of L/W/H/H1 is depth; whether the LED version has a charge LED.
- LEDVANCE bulkhead: diffuser type (opal assumed) and status LED.
- Exit box sign: the maker behind the EXIT3MLED (probably ML Accessories / Knightsbridge) and the legend panel's size; the UK "FIRE EXIT" text convention under BS 5499-4 was not checked against the standard.
- Key switch: whether MK's 3405ZIC key is the "fishtail" pattern; the exact 1-gang grid plate code; the CMA110's legend wording; the BS 5266-1 clause that the normal lighting must stay on during a test (only forum quotations found).
- Hager MCB and RCBO faces: toggle colour, the exact printing and the colour of the RCBO's test button were not confirmed from a Hager document (only "green = OFF" from a retailer description of a sibling MCB).
- That the emergency fittings' permanent live is taken from the local lighting circuit (standard UK practice, not sourced here).
- LED driver dropout voltage: not published on the Tridonic sheet; the 198 V lower limit is its guaranteed range, not where it stops.
- BS 5266-1: the 2 m "points of emphasis" distance and the 3 h duration for workplaces are from memory plus a manufacturer summary, not the standard.

## 2026-10-19: model verification

**Confirmed:** LEDVANCE's current [product page](https://www.ledvance.com/en-int/professional-lighting/products/luminaires/professional-luminaires/emergency-lighting/wall-and-ceiling-luminaire-with-up-to-ip66-protection--convertible-into-an-emergency-exit-sign/rectangular-emergency-bulkhead-with-ip65-and-3-h-standby-time-c365513?productId=283840) independently gives 355 × 115 × 63 mm, white PC/ABS body and cover, an integrated test switch, and wall or ceiling surface mounting. The moulded diffuser profile and the location and colour of the status LED remain **estimated** from the product image and similar fittings.

**Confirmed:** Hager's [MTN106 page](https://hager.com/uk/products/h/mtn106-mcb-1p-6ka-b-6a-1m) gives 83 × 17.5 × 70 mm for a one-module MCB. **Estimated:** the exact visible contact flag and rocker sizes, as well as the position and colour of the ADA306G RCBO test button, remain approximations in the model; the board places the test button on the first outgoing breaker as a representative RCBO.
