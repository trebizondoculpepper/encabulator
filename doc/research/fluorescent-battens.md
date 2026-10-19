# Twin 5 ft T8 switch-start fluorescent battens

Research for prompt 002 (`doc/prompts/002-fluorescent-battens-come-to-life.md`): how a 1990s twin 1500 mm T8 58 W batten on switch-start gear (glow starter and wire-wound choke) looks, starts, fails, drops out in a voltage dip and sounds. The next reader is the agent building `src/toolkit/components/architectural/logic/fluorescent-gear.ts`. Each section gives the facts with sources, then a **For the game** note with concrete model values. **Confirmed** means a manufacturer document, a standard quoted by one, or a measurement says so; **estimate** means it is my inference or a figure chosen to look right, and should be treated as tunable.

Researched 2026-10-19. Source list at the end; numbers in brackets like [P1] refer to it.

## Contents

1. The product
2. The switch-start sequence
3. Failure behaviour
4. Voltage dips
5. Sound
6. Unconfirmed / open questions
7. Sources

## 1. The product

### Facts

**The batten.** The archetypal UK fitting is Thorn's PopPack: a bare batten of rolled steel channel, pre-coated in high-reflectivity white paint, with the lampholder assembly in white polycarbonate, fixed through BESA piercings, with fixing centres of 600 mm for the 1200, 1500 and 1800 mm lengths [T1, the current T5 PopPack catalogue page; the construction was carried over from the T8 generation]. A retailer clearance listing for the switch-start twin 5 ft 58 W version (PP258) gives 1500 × 125 × 64 mm, a tool-less clip-on cover plate (the gear tray cover), twist-lock lampholders and a four-way terminal block for 2 × 2.5 mm² [T2; seen only as a search snippet, the page itself was unreachable, so treat as unverified]. No weight was found for the switch-start PP258. For comparison, a present-day high-frequency twin 58 W T8 steel batten (MLA T8258HF) is 1527 × 101 × 86 mm and weighs 1.84 kg with its electronic ballast [T3]. A bare batten of this kind has no diffuser: the tubes are exposed, sometimes with a clip-on white reflector or a prismatic diffuser as an accessory.

**The IP65 alternative.** For damp or dusty warehouses the 1990s choice was a "non-corrosive" (anti-corrosive) fitting: a polycarbonate (or glass-reinforced polyester) body with a clear or prismatic polycarbonate diffuser held by clips. Thorn's was Aquaforce: polycarbonate housing, IP65 (later IP66) and IK08 [T4]. A retailer listing for the twin 58 W Aquaforce (AQ258Z, HF) gives 1600 × 147 × 118 mm, IP65; the single (AQ158Z) 1600 × 94 × 118 mm with polycarbonate housing and cover [T5]. The listings found are for HF versions; whether a switch-start Aquaforce was sold was not confirmed.

**The tube.** Philips MASTER TL-D Super 80 58W/840: 5,240 lm, nominal lamp current 0.670 A, 58.5 W, 15,000 h to 50 % failures, 1500.0 mm between lampholder faces (A max), 1514.2 mm overall with pins (C max), T8 (26 mm diameter) [L1]. Lamp running voltage is roughly half the mains: Philips says it must be "not more than approximately half" the mains, 100 to 130 V [P1 §5.1.1]; a measured 36 W T8 ran at about 100 V, a near-square wave [G1].

**The gear (one set per tube).** Each 58 W tube has its own wire-wound choke and its own S10 starter: Philips' S10 is for single 4–65 W lamps at 220–240 V, while the S2 (series, two lamps per choke) only goes to 22 W [S1]. A typical 1990s 58 W choke, Philips BTA 58 L31 (230 V 50 Hz): 10.5 W loss, mains current 0.65 A running and 0.90 A during ignition (preheat), power factor 0.47 uncorrected, needs a 6.5 µF parallel capacitor (250 V) for correction, ballast efficiency class B2, about 0.92 kg, 195 mm long, cross-section 39 × 28 mm [B1]. The S10 starter is a 2-pin canister 40.3 mm tall and 21.5 mm across, flame-retardant polycarbonate, with a bimetal glow switch and a radio-suppression capacitor inside; minimum pulse voltage 900 V, minimum non-reclosure voltage 140 V, ambient −15 to 75 °C; standard white canister, the "safety" range blue [S1, S2]. In a twin batten the two starters plug into the gear tray, usually reachable without tools.

### For the game

- Batten: 1500 mm long (lamp centres), body 1520 × 125 × 64 mm (body slightly longer than the lamp face-to-face length: estimate), white RAL 9016-ish painted steel, two bare tubes 26 mm diameter on about 75 mm centres (estimate from the 125 mm width), white polycarbonate lampholders, two starters visible on the underside of the gear tray (white or blue canisters, 40 × 21.5 mm). Optional: the IP65 non-corrosive version at 1600 × 147 × 118 mm, translucent grey-white polycarbonate body, clear prismatic diffuser, stainless clips.
- Weight (if anything needs it): about 3.3 kg for the switch-start twin (estimate: the HF batten's 1.84 kg minus about 0.25 kg of electronic ballast plus two 0.92 kg chokes and a capacitor).
- Per tube: 58 W lamp + 10.5 W choke loss; 5,240 lm when new; mains current 0.65 A running (uncorrected), 0.90 A while preheating.
- The model is per tube: two independent gear models per batten, which is also what makes a twin batten flicker one tube at a time.

## 2. The switch-start sequence

### Facts

**How it works (confirmed).** At switch-on the full mains appears across the open starter; a glow discharge in its neon or argon fill heats the bimetal until it touches the fixed contact; current then flows through the choke and both lamp filaments in series, preheating them; with the glow gone the bimetal cools and opens; the interruption of the choke current gives an inductive kick (V = L di/dt) that may strike the tube. "If the lamp electrodes are not hot enough or the peak voltage is not high enough, the glow-switch starter will resume the whole starting process again until the lamp ignites." Once the tube is lit its voltage is too low to sustain the glow in the starter, which stays cool and open [P1 §5.2.2]. Whether an attempt succeeds depends on the mains voltage at the instant the starter opens [P1 §3.8]: if the contacts open near a current zero there is little inductive kick and the process repeats [R1]. Because the bimetal's closing time is not well defined, the electrodes may not be at emission temperature when it opens and the peak voltage varies a lot, "noticed in practice when the glow-switch starter works several times before the lamp ignites. This flickering gets worse at low ambient temperatures, at low mains voltages, or with aged lamps" [P1 §3.3].

**Measured timings (one bench measurement, 36 W T8, FS-U 4–65 W starter, 230 V) [G1]:**

| Phase                                 | Measured                | Notes                                                                                            |
| ------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------ |
| Glow (starter glowing, contacts open) | 550 ms                  | 38.5 mA, 7.2 W; starter ionises at about 220–240 V instantaneous and stops conducting near 180 V |
| Preheat (starter contacts closed)     | 400 ms                  | 589 mA, about 11 V and 6.5 W per filament                                                        |
| Ignition pulse                        | 1–3 kV, both polarities | −2.78 kV captured; strike "not guaranteed"                                                       |
| Running                               | —                       | 385 mA, lamp near-square wave about ±100 V                                                       |

The author notes starter timing is erratic "in the half a second range" and depends on mains voltage, ambient temperature and starter age [G1]. Other sources: the bimetal opens "after about a second" and several cycles are usually needed, with flickering and clicking [W2]; a starter patent gives contact closure of about 1–2 s; a Panasonic glow starter is sold with an "average lighting time" of 3 s; a starter patent says switch-start usually takes more than 3 s to light [W2 search results; patents, weak]. For comparison, Philips' electronic starter preheats for a defined 1.7 s and gives up after seven unsuccessful attempts [P1 §5.2.2], and IEC-compliant HF warm-start ballasts preheat for about 1 s [P1 §3.3].

**What is seen.** During preheat the filaments carry several watts each and the tube ends glow (dull orange to red, through the phosphor) while the middle is dark [G1 power figures; R1 describes the orange end glow of a stuck starter]. A failed attempt shows as a flash of the whole tube [W2, R1]. Brightness at the instant of striking: the arc reaches its working current almost at once (Philips requires the glow-to-arc transition within 100 ms for cold-ignition HF gear [P1 §3.8]); the light then creeps up as the tube wall warms and the mercury vapour pressure rises. Philips: "Normal 'TL' lamps in normal applications have a run-up time of 2-3 minutes to reach stable lamp voltage and a level of 90 per cent of the maximum light output" [P1 §3.3]; elsewhere it calls run-up of non-amalgam lamps "very short, as the lamps get their nominal lamp voltage almost immediately" [P1 §4.1.4]. The T8 is designed for a tube-wall temperature of 40 °C, reached at 20–25 °C ambient in the luminaire [P1 §4.1.6]; Radium gives 25 °C as the optimum ambient for T8 [Ra1].

**Cold.** Cold raises the ignition voltage needed and lengthens starting (Philips Fig. 23) [P1 §3.3]; electrodes take longer to heat and the gas is harder to ionise; around −10 °C the mercury does not vaporise, only the argon discharges, "a slight pinkish glow" that never gets bright; in a housing the lamp can warm itself and "(almost) reaches its usual luminous flux after a few minutes" [Ra1]. Philips gives no guarantee of operation below −15 to −25 °C [P1 §4.1.16]. So the dim pink glow is a cold-tube phenomenon, not part of a normal warm start.

### For the game

Model one tube's start as a loop of attempts. Values for a healthy tube at 20 °C and nominal mains (230 V); all distributions are estimates fitted to the sources above.

| Parameter                                   | Value                                                                                      | Basis                                                  |
| ------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| First glow (switch-on to contacts closing)  | 0.3–1.0 s, median 0.55 s                                                                   | measured 0.55 s [G1]; "about a second" [W2]            |
| Preheat (contacts closed)                   | 0.3–0.8 s, median 0.45 s                                                                   | measured 0.40 s [G1]                                   |
| Re-glow after a failed attempt              | 0.2–0.6 s, median 0.35 s                                                                   | estimate: bimetal already warm                         |
| Failed-strike flash                         | 20–80 ms of near-full light, then dark                                                     | estimate (one to a few half-cycles)                    |
| Strike probability per attempt, new tube    | 0.65                                                                                       | estimate, so a new tube usually strikes on attempt 1–2 |
| … aged tube (blackened ends, past 10,000 h) | 0.30                                                                                       | estimate                                               |
| … end-of-life tube                          | 0.05, falling to 0                                                                         | estimate; "dud" = 0                                    |
| Multiplier at 92 % mains                    | × 0.7                                                                                      | estimate; "worse at low mains voltages" [P1]           |
| Multiplier at 5 °C ambient                  | × 0.6, and glow/preheat × 1.3                                                              | estimate; "worse at low ambient temperatures" [P1]     |
| Resulting time to strike, new tube          | median about 1.2 s, 90 % within 3 s                                                        | follows from the above                                 |
| Resulting time to strike, aged tube         | median about 3 s, tail to 8–10 s                                                           | follows from the above                                 |
| Light at the moment of strike (20 °C)       | 0.75 of full, reached within 0.1 s                                                         | estimate                                               |
| Run-up after strike                         | exponential creep to 1.0, time constant 40 s (0.9 at about 60–90 s)                        | Philips' 2–3 min to stable [P1]; estimate              |
| Run-up at 5 °C                              | strike at 0.5, time constant 90 s, settles at 0.9                                          | estimate                                               |
| Run-up below −10 °C                         | pink argon glow at 0.05–0.1, no proper run-up                                              | [Ra1]                                                  |
| Ends glowing during preheat                 | each end emits about 0.03 of full light, orange (around 2,000 K), only over the last 50 mm | estimate                                               |

Visible order at switch-on for a twin batten: both starters glow independently, so the two tubes strike at different moments, each perhaps with a flash or two first; then a slow, barely noticeable brightening. Seed each tube's starter (glow and preheat medians ± 30 %) so a fitting has a consistent character from one switch-on to the next.

## 3. Failure behaviour

### Facts

- **A tube that will not strike.** "If the lamp will not ignite (end of life), the starter will continue producing peaks (flickering) until the mains voltage is switched off, one or two electrodes of the lamp break or until the electrodes of the glow-switch starter stick together" [P1 §5.2.2]. "With glow starters a failing tube will cycle repeatedly" [W1]; a lamp near end of life "will continuously blink on and off until the glow switch starter wears out", which also runs the ballast hotter [W2]. The starter "may keep cycling indefinitely if either it or one of the tubes is faulty" [R1].
- **Starter stuck closed (welded contacts).** "The short-circuit current is continuously running through the lamp electrodes, which can be seen at the glowing lamp ends" [P1 §5.2.2]; the ends glow, "usually with an orange color" [R1]. The tube does not light; the choke carries preheat current (0.90 A against 0.65 A running [B1]) and hums.
- **Starter life.** Glow-switch starters last 10,000 switching cycles or more [P1 §5.2.3]; Philips guarantees 12,000 for its Safety Starters [S2]. Starter wear is the commonest cause of a fitting that flashes repeatedly before lighting.
- **Safety starters.** Philips' blue Safety Starters claim "safe end-of-life behaviour" [S2]; the electronic S2-E/S10-E stop after seven failed attempts [P1]; the SiS10 stops after a time and needs its red button pressed, and switching the mains does not reset it [P1 §5.2.2]. A 1990s warehouse would most likely have plain glow starters (estimate).
- **End-of-life tube.** Each start erodes the emissive coating; when it is gone the lamp cannot start on the available voltage [W1]. Sputtered emitter blackens the glass near the ends [W1]; burned-out tubes "will often have one or both ends blackened" [R1]. "One end glowing bright orange means the tube is dead - the filament has lost its electron-emitting coating" [R1]. Uneven emission gives asymmetric current and 50 Hz flicker [R1, W1]; near end of life a tube can flicker at a frequency lower than the mains, from instability of the arc's negative resistance [W1], seen as a slow shimmer or swirl. A failing tube can also show "pink luminescence of the base gas in the vicinity of one of the electrodes" under asymmetric current [W1].
- **Lamp life.** 15,000 h to 50 % failures for TL-D Super 80 58 W [L1], on a standard switching cycle; frequent switching shortens it [P1 §3.9].
- **Low mains.** Blinking or dimming "sometimes indicates borderline low line voltage" [R1]; low voltage makes starting difficult, especially in high humidity, and the lamp may flash on and off without starting [E1].

### For the game

| Fault                | What it does                                                                                                                                                   | Suggested frequency                                                         |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Aged tube            | strikes after 2–6 attempts; ends blackened (dark grey band 30–60 mm from each end); light 0.85 of new                                                          | 20 % of tubes (estimate, a 1990s warehouse with tubes replaced as they die) |
| Dud tube             | never strikes: glow → preheat → flash (or no flash) → re-glow, for ever; cycle period 0.8–1.5 s; each preheat lights the ends orange; stops only on switch-off | 1–2 tubes in a room (estimate)                                              |
| Dead-filament tube   | one end glows orange during preheat, the other not; never strikes (a dud variant)                                                                              | occasional (estimate)                                                       |
| End-of-life flicker  | lit but output modulated: a slow shimmer at 0.5–3 Hz, ±15 %, sometimes dropping out and restriking every 10–60 s                                               | 1 tube in a room (estimate)                                                 |
| Starter stuck closed | tube dark, both ends glowing orange steadily, choke humming louder; persists until the starter is replaced                                                     | rare; a dev hook (estimate)                                                 |
| Worn starter         | glow phase 2–3 times longer and more failed attempts (strike probability × 0.6)                                                                                | 10 % of starters (estimate)                                                 |

A dud's cycle (from the facts above): starter glow 0.3–0.6 s (warm), preheat 0.4 s with orange ends, starter opens with a click and a flash of 20–80 ms (or nothing if the kick came at a bad moment), repeat. Leave the cycling running until the fitting's supply is switched off; on the next switch-on it starts again. If a safety starter is wanted for variety, it stops after 7 attempts.

## 4. Voltage dips

### Facts

- **Why a lit tube can go out.** On a choke the current passes through zero every half-cycle; the lamp is "out" at each zero and must be re-ignited by the supply voltage, which works only because the choke's phase shift means the mains is far from zero at that moment [P1 §5.1.3]. At each current zero the voltage across the lamp jumps to more than 300 V in the opposite polarity, which restrikes the hot lamp [G1]. A lower supply gives a lower re-ignition peak; below a threshold the discharge goes out [Lt1].
- **Threshold.** A trade article: "If the voltage drops below 80% of the rated level of a rapid-start ballast (and most other ballasts), the arc stream within the lamp becomes unstable and extinguishes", and a drop "even for a few cycles" makes a fluorescent lamp drop out [E1]. This is the American rapid-start case, generalised by the author; no measured threshold for UK switch-start gear was found.
- **Duration.** Philips: "a single dip of 10 milliseconds (half a cycle), or even less, can have a significant influence: the lamp will extinguish" [P1 §5.3.8]. Lab studies confirm that 18 W tubes on electromagnetic ballasts are more sensitive to sags than those on electronic ballasts and fail the ITIC and SEMI F47 curves [V1, V2], but their numerical curves were not accessible.
- **Shallow dips.** IEC requires lamp systems to work between 92 % and 106 % of rated voltage [P1 §1.3]; dips under about 5 % keep light within about 10 % [P1 §5.3.13]. On an inductive circuit light output moves faster than the voltage (lamp voltage is nearly constant, so the choke current carries the whole change) [P1 §5.3.13, Fig. 138].
- **Recovery.** Once out, a switch-start tube needs its full starting sequence: the starter sees the mains again, glows, preheats and kicks. Philips: "As the fluorescent lamp re-ignites in only a few seconds or less, these phenomena are not really a problem in practice" [P1 §5.3.8]. The electrodes are still hot, so the strike is easier than from cold (inference from [P1 §3.3] and [G1]). The American article's "restrike almost immediately" [E1] refers to rapid-start gear without a starter.
- **How often.** IEC 61000-2-2, quoted by Philips: a town consumer may see one to four dips a month deeper than 10 %, usually lasting 60 ms to 3 s, sometimes about 10 ms when a fuse clears a fault [P1 §4.1.15].
- **Starter in a brownout (inference).** The starter only ionises above about 220–240 V instantaneous [G1]. At 230 V the mains peak is 325 V; at 70 % (161 V rms) it is 228 V. So in a sustained brownout below about 70 % the starters cannot even glow and the tubes stay dark until the supply recovers.

### For the game

| Supply (fraction of 230 V) | Lit tube                                                                                                         | Dark tube trying to start                             |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| ≥ 0.92                     | stays lit; light = 1 − 2 × (1 − V) (estimate)                                                                    | starts normally                                       |
| 0.80–0.92                  | stays lit, dimmed by the same rule                                                                               | strike probability × 0.5 (estimate)                   |
| 0.70–0.80                  | drops out if the dip lasts ≥ 40 ms (2 cycles); an aged tube after ≥ 20 ms (estimate around the 80 % figure [E1]) | starter glows but strike probability × 0.2 (estimate) |
| < 0.70                     | drops out after 10 ms [P1]                                                                                       | starter cannot glow (inference from [G1]); waits      |

Give each tube its own drop-out threshold, 0.78–0.84 for new tubes and 0.83–0.88 for aged ones (estimates), so a dip near 80 % takes out some tubes and not others. On recovery each dropped tube goes through the sequence from the glow, with hot-electrode values: glow 0.3–0.8 s, preheat 0.3–0.5 s, strike probability 0.85 for a healthy tube (estimate), light at strike 0.9 of where it was, catching up over 5–10 s (estimate: the tube wall is still warm). Typical relight: 0.8–2.5 s after the supply returns, scattered across the room. Determinism: draw each tube's threshold and timings from its seed.

## 5. Sound

### Facts

- **Ballast hum.** Magnetostriction of the choke's iron, repeated every half-cycle, "results in a noise of 100 Hz in a 50Hz mains and higher harmonics"; magnetic forces across the core's air gap add more 100 Hz and harmonics; the stray field also shakes nearby steel (the ballast case, the luminaire's sheet steel); hum is worse when the ballast is mounted on a resonant surface [P1 §5.3.15]. Atlas: hum "may be amplified by the method of mounting the ballast in the fixture" and by the resonance of ceilings, walls and furniture [A1]. "Hum is eliminated in lamps with a high-frequency electronic ballast" [W1]; "there may be an audible buzz from the ballast, especially the iron type"; a faulty ballast has "a loud hum or buzz" [R1].
- **During starting.** "Sometimes during the starting process some hum or rustling can be noticed, especially with glow-switch starters" [P1 §5.3.15]. Starting with several cycles "causes flickering and clicking" [W2]. The preheat current is larger than the running current (0.90 A against 0.65 A on the BTA 58 [B1]; 589 mA against 385 mA measured on a 36 W [G1]), so the choke hums louder while the starter is closed. During the glow phase the current is only about 40 mA [G1], so the choke is nearly silent.
- **Levels.** No measured dB(A) for a UK 58 W choke was found. American practice rates ballasts A to D for the room they suit: A for rooms of 20–24 dB ambient (libraries), B 25–30 dB (quiet offices), C 31–36 dB (general offices, storerooms), D 37–42 dB (manufacturing, retail) [A1]. These are the ambient levels a ballast must not stand out above, not the ballast's own output.
- **Clicks, tinks and pings.** The starter's bimetal makes a small click when its contacts close and when they open [W2: "clicking"]. No source was found for a "tink" or "ping" at the strike; see open questions.

### For the game

- **Hum:** a machine tone (dev12 style) with a 100 Hz fundamental and strong 200 and 300 Hz harmonics, a little 50 Hz from asymmetry if the tube is aged (estimate), and a gentle rattle of the sheet steel (noise band 1–3 kHz modulated at 100 Hz, very quiet; estimate). Level proportional to the square of choke current (magnetostriction goes with flux squared; estimate): silent during the glow, 1.9 × the running level during preheat (0.90² / 0.65²), 1.0 lit, 0 when out. Give each choke a fixed ± 6 dB loudness and ± 2 % harmonic balance from its seed (old chokes louder). Suggested running level about 25–30 dB(A) at 1 m per choke (estimate, ballast class B–C), so a dozen fittings are audible in a quiet warehouse but sit under any machine noise.
- **Starter:** a soft click (2–5 ms, bright, about 4 kHz) when the contacts close and a slightly sharper one when they open; quiet, heard only within 2–3 m (estimate).
- **Strike / failed strike:** the opening click doubles as the strike sound; add a very faint electrical tick with the flash (estimate). The "tink" and "ping" the prompt asks for are best treated as estimates: a tick from the steel body as it warms (thermal expansion) in the first minute after switch-on, at random every 5–20 s, fading out (estimate).
- **Dud cycling:** the click pair once per cycle (0.8–1.5 s), the hum swelling during each preheat; a faint crackle (short noise bursts) during flicker.
- **Run-up:** the hum reaches its running level within one cycle of the strike (it follows the current); there is no audible run-up in a real choke, so if `createSpin` is used, keep the spin-up under 0.1 s.

## 6. Unconfirmed / open questions

- **The exact switch-start PopPack:** the PP258 dimensions (1500 × 125 × 64 mm) come from one retailer snippet whose page could not be opened; no weight was found. Thorn's own archive (or a 1990s catalogue) would settle it.
- **Whether an IP65 Aquaforce was sold with switch-start gear,** or only HF. Other 1990s non-corrosive makers (Thorlux, Fern-Howard, Crompton, Victor) were not checked.
- **Dip threshold and duration for switch-start gear.** The 80 % figure is from a 1999 American trade article on rapid-start ballasts [E1]; the measured immunity curves of Shareef et al. [V1, V2] (18 W, electromagnetic ballast) are behind paywalls. Their curves would give a measured threshold and duration.
- **Probability of a strike per attempt** and its dependence on age, voltage and temperature: no source gives a number; the values in section 2 are estimates.
- **Light at the moment of strike and the run-up curve for a T8 on a choke:** Philips' "2–3 minutes to 90 %" and "almost immediately" are both from the same guide; no measured T8 run-up curve was found (a 2020 measurement study on T5 [M1] says stabilisation can take tens of minutes).
- **Tube voltage of a 58 W T8** (about 110 V by IEC 60081 lamp data) was not confirmed from a fetched source.
- **Sounds:** no measured dB(A) for a 58 W choke; no source for the "tink" or "ping" at the strike, which may be folklore, the steel body's thermal ticking, or a magnetostrictive tick from the ignition pulse.
- **IEC 60155** (glow starters) specifies preheat and pulse requirements, but its text was not available; Philips' guide says preheat with glow starters is not well defined.

## 7. Sources

- [P1] Philips Lighting, _Technical Application Guide: Fluorescent Gear_ (2006), sections 1.3, 3.3, 3.8, 4.1.4, 4.1.6, 4.1.15, 4.1.16, 5.1.1, 5.1.3, 5.2.2, 5.2.3, 5.3.8, 5.3.13, 5.3.15. http://www.docs.lighting.philips.com/en_gb/oem/download/Technical_Application_Guide_Fluorescent_Gear.pdf
- [G1] A. Giangrandi, "Some measurements on a fluorescent tube and its magnetic ballast" (36 W T8, 230 V 50 Hz choke, FS-U starter). https://www.giangrandi.org/electronics/fluorescenttubes/fluorescenttubes.shtml
- [B1] Philips, electromagnetic "Low loss" ballasts for TL lamps, 230 V and 240 V 50 Hz (Spanish catalogue pages, BTA 58 L31 / L31LW / L25). https://www.ujaen.es/departamentos/ingele/sites/departamento_ingele/files/uploads/CH_RE_completo.pdf
- [S1] Signify, S10 4-65W SIN 220-240V datasheet (2023) and family data (pulse voltage 900 V min, non-reclosure 140 V min, −15 to 75 °C). https://assets.cef.co.uk/downloads/pdg/gerard_s10_datasheet/gerard_s10_datasheet.pdf and https://www.assets.lighting.philips.com/is/content/PhilipsLighting/comf2399-pss-global
- [S2] Signify, _Safety Starters_ product family leaflet (2024). https://www.signify.com/api/assets/v1/file/Signify/content/LP_CF_STARTS_EU.en_HK.PROF.CF/Safety_Starters.pdf
- [L1] Philips MASTER TL-D Super 80 58W/840 datasheet (927922084081), via search results. https://www.assets.lighting.philips.com/is/content/PhilipsLighting/fp927922084081-pss-global
- [T1] Thorn Lighting catalogue, PopPack (T5 generation) page. https://storage.electrika.com/flips/9010-thorn-lighting-15/files/assets/basic-html/page-142.html
- [T2] Trafford Electrical, clearance listing "THORN PP258 5' 58W twin" (search snippet only). https://trafe-traffordelectrical.dc01.gob2b.com/Catalogue/Clearance/THORN-PP258-5-58W-TWIN-PACK-FITZLPT258
- [T3] MLA, data sheet T8218HF–T8270HF high-frequency T8 twin battens (2018). https://cdn.yesss.co.uk/documents/50766.pdf
- [T4] Thorn Lighting, Aquaforce teaser. https://thornlighting.com/PDB/Ressource/teaser/DE/TLG_Aquaforce.pdf
- [T5] Trade Sparky listings, Thorn AQ258Z and AQ158Z (via search). https://www.tradesparky.com/lamps-and-lighting/fittings-battens-and-modular/corrosion-resistant/thorn-aq258z-lumin-hf-ip65-cw-2x58w
- [E1] J. R. Knisley, "Voltage Variations and Arc Discharge Lamps", _EC&M_, 1 March 1999. https://www.ecmweb.com/lighting-control/article/20893695/voltage-variations-and-arc-discharge-lamps
- [V1] H. Shareef, A. Mohamed, N. Marzuki, "Analysis of ride through capability of fluorescent lamps during voltage sags", IASTED MSI 2009 (abstract). https://research.uaeu.ac.ae/en/publications/analysis-of-ride-through-capability-of-fluorescent-lamps-during-v/
- [V2] H. Shareef, A. Mohamed, K. Mohamed, "Development of voltage acceptability curves for fluorescent lighting systems", _IREE_ 5(4), 2010 (abstract). https://research.uaeu.ac.ae/en/publications/development-of-voltage-acceptability-curves-for-fluorescent-light-2/
- [Lt1] Lamptech, "The Fluorescent Lamp: Effect of Operating Frequency". https://www.lamptech.co.uk/Documents/FL%20Frequency.htm
- [Ra1] Radium Lampenwerk, fluorescent lamps at low temperatures. https://www.radium.de/en/node/51372
- [A1] Atlas Lighting, _Full Line Catalog 2014–2015_, p. 5-1, "Ballast Sound" and sound ratings. https://michaelsforms.eastus2.cloudapp.azure.com/prod_image/PHILTGE04846_5_1_5_2_5_4.pdf
- [R1] S. Goldwasser, _Sci.Electronics.Repair FAQ: Fluorescent Lamps, Ballasts, and Fixtures_ (hobbyist reference, used for symptoms only). https://www.repairfaq.org/sam/flamp.htm
- [W1] Wikipedia, "Fluorescent lamp" (sections Preheating, End of life, Flicker, Ballast). https://en.wikipedia.org/wiki/Fluorescent_lamp
- [W2] Wikipedia, "Glow switch starter" (tagged as needing citations). https://en.wikipedia.org/wiki/Glow_switch_starter
- [M1] _Metrology and Measurement Systems_ 27(3), 2020, pp. 541–557, on fluorescent run-up (T5 and CFL). https://journals.pan.pl//Content/117624/PDF/art12.pdf
