import { computed } from '@preact/signals-core';
import type { ReadonlySignal } from '@preact/signals-core';
import type { ModuleWindow, PlantFault } from '../game/level0-plant';
import { UNITS } from '../scene/level0-faces';
import type { MccView } from '../scene/retro-encabulator-mcc';
import type { MachineDevice } from '../toolkit/components/industrial-control/parts/machine-components';

/**
 * How each unit of Level 0's line-up is wired inside: what every terminal,
 * relay and chassis in its bucket carries. The line-up builds the same
 * devices into every bucket (`populateInterior`); this gives them their
 * roles. The full table, unit by unit, is `doc/design/level0-wiring.md`.
 *
 * Terminals, on every unit's strip, left to right:
 * - X1 control supply (wired inside the line-up: open, the unit is dead);
 * - X2 run circuit: a starter's contactor coil, a control unit's enable,
 *   the drive's enable, the PanelView's supply;
 * - X3 indication supply: the unit's door lamps and displays;
 * - X4 PLC signal: the unit's command from, or status to, Automation
 *   Control, where it has one;
 * - X5 and on: spare terminals, wired to nothing.
 *
 * Relays, in the control units and FIELD TERMINATIONS, K1 to K3:
 * - control units: K1 enable, K2 PLC link, K3 indication;
 * - FIELD TERMINATIONS: K1 the 24 VDC supply contactor, K2 the output
 *   interposing relay, K3 the input interposing relay.
 *
 * Chassis in Automation Control: RU1 the PanelView interface, RU2 the
 * remote I/O adapter that carries the outputs to the field.
 */

export type UnitRole =
  | 'supply'
  | 'starter'
  | 'control'
  | 'field'
  | 'automation'
  | 'drive'
  | 'isolator';

export const UNIT_ROLES: Record<string, UnitRole> = {
  [UNITS.incoming]: 'supply',
  [UNITS.main]: 'supply',
  [UNITS.distribution]: 'supply',
  [UNITS.mainMotor]: 'starter',
  [UNITS.feed]: 'starter',
  [UNITS.auxMotor]: 'starter',
  [UNITS.lube]: 'starter',
  [UNITS.cooling]: 'starter',
  [UNITS.hydraulic]: 'starter',
  [UNITS.auxDrive]: 'starter',
  [UNITS.vent]: 'starter',
  [UNITS.control]: 'control',
  [UNITS.modial]: 'control',
  [UNITS.phase]: 'control',
  [UNITS.panMonitor]: 'control',
  [UNITS.automation]: 'automation',
  [UNITS.field]: 'field',
  [UNITS.vfd]: 'drive',
  [UNITS.driveIsolator]: 'isolator',
  [UNITS.dingle]: 'starter',
  [UNITS.hydro]: 'starter',
  [UNITS.fan]: 'starter',
  [UNITS.grammeter]: 'starter',
};

/** Each unit's name, as its nameplate gives it, for diagnostics. */
export const UNIT_NAMES: Record<string, string> = {
  [UNITS.incoming]: 'MAIN INCOMING',
  [UNITS.main]: 'MAIN DISCONNECT',
  [UNITS.distribution]: 'DISTRIBUTION',
  [UNITS.mainMotor]: 'MAIN DRIVE MOTOR',
  [UNITS.feed]: 'FEED MOTOR',
  [UNITS.auxMotor]: 'AUXILIARY MOTOR',
  [UNITS.lube]: 'LUBE OIL PUMP',
  [UNITS.cooling]: 'COOLING FAN',
  [UNITS.hydraulic]: 'HYDRAULIC PUMP',
  [UNITS.auxDrive]: 'AUXILIARY DRIVE',
  [UNITS.vent]: 'VENTILATION FAN',
  [UNITS.control]: 'ENCABULATOR CONTROL',
  [UNITS.modial]: 'MODIAL INTERACTION',
  [UNITS.phase]: 'PHASE REFERENCE',
  [UNITS.panMonitor]: 'PANENDERMIC MONITOR',
  [UNITS.automation]: 'AUTOMATION CONTROL',
  [UNITS.field]: 'FIELD TERMINATIONS',
  [UNITS.vfd]: 'VFD-601',
  [UNITS.driveIsolator]: 'DRIVE ISOLATOR',
  [UNITS.dingle]: 'DINGLE ARM',
  [UNITS.hydro]: 'HYDROCOPTIC PUMP',
  [UNITS.fan]: 'PANENDERMIC FAN',
  [UNITS.grammeter]: 'CARDINAL GRAMMETER',
};

/** Each unit's window on the status annunciator. */
export const MODULE_OF: Record<string, ModuleWindow> = {
  [UNITS.incoming]: 'INCOMING',
  [UNITS.main]: 'MAIN',
  [UNITS.distribution]: 'DISTRIBUTION',
  [UNITS.mainMotor]: 'M-101',
  [UNITS.feed]: 'M-102',
  [UNITS.auxMotor]: 'M-103',
  [UNITS.lube]: 'LUBE',
  [UNITS.cooling]: 'COOLING',
  [UNITS.hydraulic]: 'HYDRAULIC',
  [UNITS.auxDrive]: 'AUX DRIVE',
  [UNITS.vent]: 'VENT',
  [UNITS.control]: 'CONTROL',
  [UNITS.modial]: 'MODIAL',
  [UNITS.phase]: 'PHASE',
  [UNITS.panMonitor]: 'PAN MONITOR',
  [UNITS.automation]: 'PLC',
  [UNITS.field]: 'FIELD',
  [UNITS.vfd]: 'VFD',
  [UNITS.driveIsolator]: 'ISOLATOR',
  [UNITS.dingle]: 'DINGLE',
  [UNITS.hydro]: 'HYDRO',
  [UNITS.fan]: 'FAN',
  [UNITS.grammeter]: 'GRAMMETER',
};

/** The terminals with a role; the rest of each strip is spare. */
export const WIRED_TERMINALS = 4;

/** A unit's internal circuits, as readable values. */
export interface UnitWiring {
  /** Its run circuit is made: X2, and for a control unit its K1. */
  run: ReadonlySignal<boolean>;
  /** Its door's lamps and displays have their supply: X3 (and K3). */
  indication: ReadonlySignal<boolean>;
  /** Its PLC signal is connected: X4 (and a control unit's K2). */
  link: ReadonlySignal<boolean>;
}

const ofKind = (devices: readonly MachineDevice[], kind: string) =>
  devices.filter((device) => device.kind === kind);

/**
 * Every unit's internal circuits, read through `machine` once it is built
 * (the line-up's interlocks are wired before it exists).
 */
export function createUnitWiring(machine: ReadonlySignal<MccView | null>) {
  const devices = (id: string) =>
    machine.value?.circuits.get(id)?.devices ?? [];
  /** A terminal carries its circuit: supplied, connected and sound. */
  const terminal = (id: string, n: number) =>
    computed(
      () => ofKind(devices(id), 'terminal')[n - 1]?.active.value ?? false,
    );
  const relay = (id: string, n: number) =>
    computed(() => ofKind(devices(id), 'relay')[n - 1]?.active.value ?? false);
  const chassis = (n: number) =>
    computed(
      () =>
        ofKind(devices(UNITS.automation), 'rack-unit')[n - 1]?.active.value ??
        false,
    );
  const running = (id: string) =>
    computed(() => machine.value?.circuits.get(id)?.running.value ?? false);
  const interfaceChassis = chassis(1);
  const cache = new Map<string, UnitWiring>();
  const wiring = (id: string): UnitWiring => {
    const known = cache.get(id);
    if (known) return known;
    const role = UNIT_ROLES[id] ?? 'supply';
    const x2 = terminal(id, 2);
    const x3 = terminal(id, 3);
    const x4 = terminal(id, 4);
    const k = [1, 2, 3].map((n) => relay(id, n));
    const relays = role === 'control' || role === 'field';
    const output = running(id);
    const unit: UnitWiring = {
      run: computed(
        () =>
          x2.value &&
          (!relays || k[0].value) &&
          (role !== 'automation' || interfaceChassis.value) &&
          (role !== 'isolator' || output.value),
      ),
      indication: computed(() => x3.value && (!relays || k[2].value)),
      link: computed(() => x4.value && (role !== 'control' || k[1].value)),
    };
    cache.set(id, unit);
    return unit;
  };
  return {
    wiring,
    terminal,
    relay,
    /** RU2, the remote I/O adapter, in its rack. */
    remoteIo: chassis(2),
  };
}

/**
 * The faults the components report of themselves, while their bucket's
 * breaker can supply the diagnostics: each with its unit's code (U and
 * its section and bucket) and the device's tag.
 */
export function componentReports(machine: MccView): PlantFault[] {
  const list: PlantFault[] = [];
  for (const [id, circuit] of machine.circuits) {
    const [, section, bucket] = /section(\d)\.bucket(\d)/.exec(id) ?? [];
    const base = `U${section}${bucket}`;
    const name = UNIT_NAMES[id] ?? id;
    // Every component's fault shows on its own unit's window.
    const window = MODULE_OF[id] ?? 'SAFETY';
    const report = (tag: string, text: string) =>
      list.push({ code: `${base}-${tag}`, text: `${name} ${text}`, window });
    const breaker = circuit.breaker;
    if (breaker?.faulted.value) report('Q', 'BREAKER TRIPPED');
    if (!breaker?.active.value) continue;
    let relays = 0;
    let chassis = 0;
    let terminals = 0;
    for (const device of circuit.devices) {
      switch (device.kind) {
        case 'fuse':
          if (device.faulted.value) report('F1', 'CONTROL FUSE BLOWN');
          break;
        case 'overload':
          if (device.faulted.value) report('F2', 'OVERLOAD TRIPPED');
          break;
        case 'contactor':
          if (device.faulted.value) report('KM', 'CONTACTOR WELDED');
          break;
        case 'relay':
          relays++;
          if (device.faulted.value)
            report(`K${relays}`, `RELAY K${relays} WELDED`);
          break;
        case 'terminal':
          terminals++;
          if (terminals <= WIRED_TERMINALS && device.faulted.value)
            report(`X${terminals}`, `TERMINAL X${terminals} OPEN`);
          break;
        case 'rack-unit':
          chassis++;
          if (device.faulted.value)
            report(
              `RU${chassis}`,
              `${chassis === 1 ? 'PANELVIEW INTERFACE' : 'REMOTE I/O ADAPTER'} WITHDRAWN`,
            );
          break;
        case 'capacitors':
          if (device.faulted.value) report('C1', 'DC BUS CAPACITORS FAILED');
          break;
        case 'drive-power':
          if (device.faulted.value) report('A1', 'POWER STAGE FAILED');
          break;
      }
    }
  }
  return list;
}

/**
 * What each kind of unit's control circuit draws while energised, in amps
 * at the supply's voltage, through the control transformer: its lamps,
 * meters and screens, coils and electronics. A starter's contactor coil
 * draws a little more while it is pulled in; Automation Control's rack a
 * little more while its backplane runs.
 */
export const CONTROL_AMPS: Record<UnitRole, number> = {
  supply: 0.05,
  starter: 0.08,
  control: 0.25,
  field: 0.3,
  automation: 0.4,
  drive: 0.5,
  isolator: 0.05,
};
/** The control transformer's own magnetising current, energised. */
export const TRANSFORMER_AMPS = 0.2;
const COIL_AMPS = 0.04;
const RACK_AMPS = 0.6;

/**
 * The control load downstream of the main disconnect: the transformer
 * itself while the bus is live, and every energised unit's draw. MAIN
 * INCOMING is upstream of the disconnect and not counted.
 */
export function controlAmps(machine: MccView, mains: boolean) {
  if (!mains) return 0;
  let amps = TRANSFORMER_AMPS;
  for (const [id, circuit] of machine.circuits) {
    if (id === UNITS.incoming || !circuit.powered.value) continue;
    const role = UNIT_ROLES[id] ?? 'supply';
    amps += CONTROL_AMPS[role];
    if (role === 'starter' && circuit.running.value) amps += COIL_AMPS;
    if (role === 'automation') {
      const rack = circuit.devices.find((d) => d.kind === 'backplane');
      if (rack?.service?.running.value) amps += RACK_AMPS;
    }
  }
  return amps;
}
