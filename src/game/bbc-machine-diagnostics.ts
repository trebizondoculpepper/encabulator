import { computed } from '@preact/signals-core';
import type { Readable } from '../toolkit/components/core/logic/world/components';
import type {
  BbcDiagnosticLink,
  ScreenLine,
} from '../toolkit/components/industrial-control/logic/bbc-micro';
import { cardDesignation } from '../toolkit/components/industrial-control/logic/machine-components';
import { CARD_KINDS, MODULE_WINDOWS, severityOf } from './level0-plant';
import type { Level0Plant } from './level0-plant';

/** Word wrapping belongs to the terminal adapter, never truncates fault identities. */
export function diagnosticPage(
  title: string,
  reason: string,
  action: string,
  others: readonly string[] = [],
): readonly ScreenLine[] {
  const wrap = (text: string): string[] =>
    text.split('\n').flatMap((paragraph) => {
      const rows: string[] = [''];
      for (const word of paragraph.split(/\s+/)) {
        if (rows.at(-1)!.length + word.length + 1 > 40) rows.push('');
        rows[rows.length - 1] += (rows.at(-1) ? ' ' : '') + word;
      }
      return rows;
    });
  return [
    ...wrap(title).map((s): ScreenLine => [s, '#f4e04a']),
    ['', '#ffffff'] as ScreenLine,
    ...wrap(reason).map((s): ScreenLine => [s, '#ffffff']),
    ['', '#ffffff'] as ScreenLine,
    ['NEXT ACTION', '#5fe0e8'] as ScreenLine,
    ...wrap(action).map((s): ScreenLine => [s, '#6ef06e']),
    ['', '#ffffff'] as ScreenLine,
    ...others.flatMap(wrap).map((s): ScreenLine => [s, '#f4e04a']),
  ].slice(0, 22);
}

/** Observes the same graph as the annunciator/PanelView; never invokes an action. */
export function level0Diagnostics(
  p: Level0Plant,
  online: Readable<boolean>,
  supplies: Readonly<Record<string, Readable<boolean>>>,
  names: Readonly<Record<string, string>> = {},
): BbcDiagnosticLink {
  const name = (id: string) =>
    names[id] ??
    MODULE_WINDOWS.find(([w]) => w === id)?.[1]
      .replace(/-\n/g, '')
      .replace(/\n/g, ' ') ??
    id;
  const lines = computed(() => {
    const e = p.electrical;
    const page = diagnosticPage;
    const badCard = CARD_KINDS.find((kind) => p.cards[kind].value !== 'ok');
    if (badCard) {
      const slot = CARD_KINDS.indexOf(badCard) + 1;
      const fault = p.faults.value.find(
        (f) => f.window === 'PLC' || f.code === 'E11',
      );
      return page(
        `AUTOMATION CONTROL: FAULT DETECTED`,
        `SLOT ${slot}: ${cardDesignation(badCard)!.name.toUpperCase()} ${p.cards[badCard].value.toUpperCase()}${fault ? '\n' + fault.code + ' ' + fault.text : ''}`,
        e.plcCabinet.value
          ? 'Switch OFF the internal AUTOMATION CONTROL isolator before touching cards.'
          : `Repair/reseat slot ${slot}, then power AUTOMATION CONTROL and press RESET.`,
      );
    }
    const hardware = p.faults.value.find(
      (f) =>
        !f.advisory &&
        ((severityOf(f.code) === 'critical' &&
          !['E01', 'E10', 'E20'].includes(f.code)) ||
          /-(Q|F1|F2|KM|K\d|X\d|RU\d)$/.test(f.code)),
    );
    if (hardware?.code === 'F04')
      return page(
        'VFD-601: F04',
        hardware.text,
        'Start COOLING FAN; wait for the heatsink to cool, then use VFD-601 STOP/RESET.',
      );
    if (hardware)
      return page(
        `${name(hardware.window)}: FAULT DETECTED`,
        `${hardware.code}: ${hardware.text}`,
        `Isolate ${name(hardware.window)} before inspecting the named component. Repair the cause before RESET.`,
        p.faults.value
          .filter(
            (f) =>
              !f.advisory &&
              f.window !== hardware.window &&
              severityOf(f.code) === 'critical',
          )
          .slice(0, 2)
          .map((f) => `${f.window}: ${f.code} ${f.text}`),
      );
    if (!e.mains.value)
      return page(
        'MAIN DISCONNECT: POWER FAULT',
        'Incoming supply available. Main bus OFF.',
        !p.control.interlockKey.value
          ? 'Turn POWER INTERLOCK SECURITY key IN on MAIN DISCONNECT.'
          : 'Turn MAIN DISCONNECT to ON.',
      );
    const required = [
      'CONTROL',
      'PLC',
      'FIELD',
      'LUBE',
      'COOLING',
      'PHASE',
      'ISOLATOR',
      'VFD',
    ] as const;
    for (const id of required)
      if (!(supplies[id]?.value ?? false)) {
        const cabinet = name(id);
        const action =
          id === 'ISOLATOR'
            ? 'Turn DRIVE ISOLATOR to ON.'
            : id === 'LUBE' || id === 'COOLING'
              ? `Set ${cabinet} POWER I / O to I.`
              : `Open ${cabinet}, turn its internal isolator ON, then close the door.`;
        return page(
          `${cabinet}: POWER FAULT`,
          'Required supply is OFF or interrupted.',
          action,
        );
      }
    if (e.plcCabinet.value && !e.backplane.value)
      return page(
        'AUTOMATION CONTROL: E01',
        'BACKPLANE SUPPLY LOST',
        'Isolate AUTOMATION CONTROL; check PCB BACKPLANE REV C supply/connection before RESET.',
      );
    if (p.state.plcHalt.value)
      return page(
        'AUTOMATION CONTROL: RESET REQUIRED',
        `${p.state.plcHalt.value}: latched processor stop. Cards now present.`,
        'Press RESET on AUTOMATION CONTROL.',
      );
    if (p.plcStatus.value === 'booting')
      return page(
        'AUTOMATION CONTROL: STARTING',
        'Processor self-test in progress.',
        'Wait for the controller boot to finish.',
      );
    if (!p.oilOk.value)
      return page(
        'LUBE OIL PUMP: PRESSURE LOW',
        e.lube.value
          ? 'Pump running; oil pressure building.'
          : 'Pump is stopped; drive permissive denied.',
        e.lube.value
          ? 'Wait for oil pressure to build.'
          : 'Check LUBE OIL PUMP POWER I / O and internal overload/fuse.',
      );
    if (!e.cooling.value)
      return page(
        'COOLING FAN: STOPPED',
        'Drive needs cooling airflow.',
        'Press START on COOLING FAN.',
      );
    if (p.driveBlock.value)
      return page(
        'VFD-601: NOT READY',
        p.driveBlock.value,
        'Check VFD-601 power stage and DRIVE ISOLATOR before START.',
      );
    if (p.state.driveHz.value < 1)
      return page(
        'VFD-601: STOPPED',
        'Drive power and oil permissive ready.',
        p.control.driveSpeed.value === 0
          ? 'Turn VFD-601 SPEED above zero.'
          : !p.control.driveLocal.value
            ? 'Use ENTER on VFD-601 to select LOCAL, then press START.'
            : 'Press START on VFD-601 in LOCAL control.',
      );
    if (!p.phaseLocked.value)
      return page(
        'PHASE REFERENCE: NOT LOCKED',
        `Reference error ${p.phaseError.value.toFixed(1)} degrees.`,
        'Adjust PHASE TRIM on PHASE REFERENCE towards zero error.',
      );
    if (p.control.dingleEnable.value === 1 && !p.stroking.value)
      return page(
        'DINGLE ARM: WAITING',
        e.hydraulic.value
          ? 'Hydraulic pressure building or remote output not ready.'
          : 'Hydraulic pump stopped.',
        !e.hydraulic.value
          ? 'Power HYDRAULIC PUMP and turn its key to REMOTE.'
          : 'Wait for hydraulic pressure; check FIELD TERMINATIONS if pressure is already nominal.',
      );
    const fault = p.faults.value.find((f) => !f.advisory);
    if (fault)
      return page(
        `${name(fault.window)}: ${fault.code}`,
        fault.text,
        fault.code === 'A07'
          ? 'Use ZERO and CALIBRATE on CARDINAL GRAMMETER.'
          : fault.code === 'A04'
            ? 'Power PANENDERMIC FAN and select LOW or HIGH.'
            : `Check the supply and local settings on ${name(fault.window)}.`,
        p.faults.value
          .filter((f) => !f.advisory && f !== fault)
          .slice(0, 2)
          .map((f) => `${f.window}: ${f.code} ${f.text}`),
      );
    if (p.healthy.value && p.operating.value)
      return page(
        'STEADY / NOMINAL',
        'Machine healthy; automation operating.',
        'Explore the local controls. Diagnostics remain live.',
      );
    return page(
      'STARTUP IN PROGRESS',
      'Waiting for operating permissives.',
      'Check AUTOMATION CONTROL and the module status windows.',
    );
  });
  return { online, lines };
}

/** Narrative scene observes only the readings it really exposes. */
export function narrativeDiagnostics(
  online: Readable<boolean>,
  mains: Readable<boolean>,
  interlock: Readable<number>,
  failure: Readable<boolean>,
): BbcDiagnosticLink {
  return {
    online,
    lines: computed(() =>
      !mains.value
        ? diagnosticPage(
            'MAIN DISCONNECT: POWER FAULT',
            'Incoming supply available. Main bus OFF.',
            interlock.value
              ? 'Turn MAIN DISCONNECT to ON.'
              : 'Turn POWER INTERLOCK SECURITY key IN.',
          )
        : failure.value
          ? diagnosticPage(
              'AUTOMATION CONTROL: FAULT DETECTED',
              'Machine failure reported by annunciator.',
              'Follow the training supervisor. Isolate before inspecting AUTOMATION CONTROL.',
            )
          : diagnosticPage(
              'TRAINING MONITOR',
              'Main bus powered. Process telemetry is controlled by the training sequence.',
              'Follow the training supervisor.',
            ),
    ),
  };
}
