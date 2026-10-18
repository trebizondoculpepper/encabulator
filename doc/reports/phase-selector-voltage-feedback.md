# Phase selector and supply-voltage feedback: report

Completion notes for `doc/prompts/phase-selector-voltage-feedback.md`, for the owner and the next reviewing agent. Related: `doc/reports/level0-wiring-implementation.md`, `doc/reports/level0-default-controls-off.md` (which added the selector's OFF) and `doc/design/level0-wiring.md`.

## 2026-10-18, first run (Level 0)

### Electrical interpretation

MAIN INCOMING's three meters are phase-to-phase voltmeters (L1-L2, L2-L3, L3-L1), nominal 480 V, each permanently connected to its pair on the incoming side of the main disconnect. Its selector is a meter selector switch for the power monitor on MAIN DISCONNECT: OFF disconnects the monitor's volts and amps; L1, L2 or L3 puts that line's current and its voltage to the next line (L1-L2, L2-L3, L3-L1) on the monitor. Its legend is now METER PHASE (it was AMMETER PHASE), with OFF L1 L2 L3 printed under it. The monitor's kW is the total of all three phases, from its own inputs, whatever the selector.

The model (`src/game/level0-plant.ts`, pure, on the world graph): each line's current (`supply.lineAmps`) is the machine's balanced three-phase load (every motor, pump, fan and the drive, from the modelled machine) plus, on L1 and L2, the control transformer's single-phase load across that pair (4 A with the bus live). Each pair's voltage (`supply.volts`) is the nominal 480 V less the supply's impedance (0.1 Ω) times the mean current in its two lines, with a slow, smooth fluctuation of up to 0.02 V an amp of that current, from two slow sines a pair on the model's clock. So with no current every pair reads exactly 480 V and holds still; heavier loads sag further and wander more; the L1-L2 pair, carrying the control load, sits a little lower; removing the load restores the steady nominal reading at once. Without the incoming supply every pair reads 0. Opening the main disconnect takes the load away but not the incoming-side meters. The monitor's reading (`supply.meter`) only selects what is measured: no selector position moves or changes any load or voltage.

### Displays and controls

`src/scene/level0-faces.ts`: the three voltmeters read `supply.volts` (the meter views ease their needles); the power monitor shows `supply.meter` and the total kW; the selector is bound to the model's meter-phase input. The shared power monitor now fits its four digits: a reading of 100 or more is shown whole (a full machine's 103 A was showing as "02.5").

### Validation

- `src/game/level0-plant.test.ts`, supply voltage: no incoming supply reads 0 on every pair; incoming with the main disconnect open reads exactly 480 V on every pair for a minute; a light and a heavy load both sag below nominal, the heavy further and with a wider fluctuation, bounded within 6 V and above 460 V, changing by under a volt a quarter second; the L1-L2 pair sits lowest; removing the load restores exactly 480 V on every pair; every selector position measures its own line without changing any line's current or any pair's voltage, and OFF measures nothing. The Level 0 machine tests' power-up walkthrough reads no amps at OFF and some at L1. All checks pass at the commit.
- Browser (headless Chrome, the dev server): a fully loaded machine (103 A) showed the voltmeters near 470 V and the monitor at L1 reading 470 V, 103 A, 71.0 kW.

### Limitations and questions

- With every unit running and the drive at full speed the machine draws about 103 A through a 100 A main disconnect; nothing trips, as the main breaker has no overcurrent model. The owner may want the loads trimmed or the disconnect re-rated.
- Level 2 and dev6 keep the shared line-up's own meter readings; this change is Level 0's.

## 2026-10-18, owner's correction

The owner found that turning the selector changed the main disconnect's voltage and current, and wanted a three-position switch. The selector's real job, as the owner described it: it chooses which phase feeds the machine's control systems, so that the control supply can be moved to a sound phase if one fails, the three voltmeters showing which phases are sound. Now:

- MAIN INCOMING's PHASE selector is a three-position lever, L1, L2, L3 (no OFF, being a supply selector), captioned CONTROL SUPPLY, starting at L1. It connects the control transformer (every lamp, controller and the PLC, 4 A) across L1-L2, L2-L3 or L3-L1 (`incoming.controlPhase` in `src/game/level0-plant.ts`).
- Moving it moves that single-phase load to another pair: those two lines carry it (`supply.lineAmps`), and that pair's voltmeter sits a little lower than the others. The total current is unchanged.
- MAIN DISCONNECT's power monitor no longer follows the selector: it shows the supply's average phase-to-phase voltage, average line current and total kW from its own transformers (`supply.monitor`), which the selector cannot change.
- Tests: the selector moves the control load to its pair without changing the monitor or the total current; the selected pair's voltmeter reads lowest on average. Browser: the lever, its PHASE plate and its L1 L2 L3 CONTROL SUPPLY caption.
- Not modelled yet: a failed phase. With all three phases always sound, the selector only moves the control load; a phase-loss fault, in which the control supply on a failed pair is lost until PHASE is turned to a sound one, would complete the owner's description.
