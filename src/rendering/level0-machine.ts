import { level0Diagnostics } from '../game/bbc-machine-diagnostics';
import type { UnitHealth } from '../toolkit/components/industrial-control/logic/bbc-micro';
import { computed, effect, signal } from '@preact/signals-core';
import type { Readable } from '../toolkit/components/core/logic/world/components';
import type { Object3D, Quaternion } from 'three';
import { createIncidentScheduler } from '../game/level0-incidents';
import {
  CARD_KINDS,
  FIRE_SEATS,
  createLevel0Plant,
} from '../game/level0-plant';
import type { CardKind, SeatState } from '../game/level0-plant';
import { createLevel0Dresser, level0Tones, UNITS } from '../scene/level0-faces';
import {
  UNIT_ROLES,
  MODULE_OF,
  UNIT_NAMES,
  componentReports,
  controlAmps,
  createUnitWiring,
} from './level0-wiring';
import { createRetroEncabulatorMcc } from '../scene/retro-encabulator-mcc';
import type { MccView } from '../scene/retro-encabulator-mcc';
import { partAudio } from '../toolkit/components/core/audio/part-audio';
import type { SoundRecipe } from '../toolkit/components/core/audio/part-audio';
import type { PanelKit } from '../toolkit/components/core/views/eighties-controls';
import { createShortSpark } from '../toolkit/components/core/views/button-effects';
import { createSmokeEmitter } from '../toolkit/components/core/views/smoke-emitter';
import type { MachineDevice } from '../toolkit/components/industrial-control/parts/machine-components';
import type { PortableObject } from '../toolkit/controls/input/object-handling';

/** Starters with their own START and STOP: stopped until START. */
const STARTED_UNITS = [UNITS.mainMotor, UNITS.cooling, UNITS.auxMotor] as const;
const STARTED: Record<string, true> = Object.fromEntries(
  STARTED_UNITS.map((id) => [id, true]),
);

const portableOf = (device: MachineDevice) =>
  (device.object.userData.portable as PortableObject | undefined)?.component;

const reducedMotion = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);

/**
 * Level 0's machine: the shared line-up, wired unit by unit to its own
 * process model (`src/game/level0-plant.ts`) through the line-up's hooks,
 * with one random failure at a time and the repair loop's parts:
 * isolation, removal and reseating. Its wiring is described in
 * `doc/design/level0-wiring.md`.
 */
export function createLevel0Machine(
  kit: PanelKit,
  {
    random = Math.random,
    diagnosticsAvailable = signal(false),
  }: { random?: () => number; diagnosticsAvailable?: Readable<boolean> } = {},
) {
  const plant = createLevel0Plant();
  const ref = signal<MccView | null>(null);
  const running = (id: string) =>
    computed(() => ref.value?.circuits.get(id)?.running.value ?? false);
  const mains = computed(
    () =>
      (ref.value?.supply.value ?? false) &&
      (ref.value?.mainBreaker.closed.value ?? false),
  );
  const wires = createUnitWiring(ref);
  const { wiring } = wires;
  /** Each starter's coil circuit: its X2, and any permissive in series. */
  const permits: Record<string, Readable<boolean>> = {
    // No lube oil pressure, no main drive motor.
    // A seized motor will not turn at all.
    [UNITS.mainMotor]: computed(
      () => plant.oilOk.value && plant.state.seized.value !== 'M-101',
    ),
    // LOCAL on its key, or REMOTE when Automation Control runs it.
    [UNITS.hydraulic]: plant.hydraulicPermit,
  };
  const interlock = Object.fromEntries(
    Object.entries(UNIT_ROLES)
      .filter(([, role]) => role === 'starter')
      .map(([id]) => [
        id,
        computed(() => wiring(id).run.value && (permits[id]?.value ?? true)),
      ]),
  );
  /**
   * A unit's supply as a fire takes it: whole, stuttering off for
   * irregular moments a few times a second, or gone.
   */
  const failing = (state: () => SeatState, seed: number) =>
    computed(() => {
      const now = state();
      if (now === 'dead') return false;
      if (now === 'ok') return true;
      const tick = Math.floor(plant.state.clock.value * 7) + seed * 13;
      return ((tick * 2654435761) >>> 0) % 5 > 1;
    });
  const mcc = createRetroEncabulatorMcc(kit, {
    incomingOn: false,
    diagnosticsAvailable,
    // After the water, INCOMING may be the last to give way: its meters die.
    bucketFeed: {
      // A burning unit glitches, its supply stuttering, then gives out.
      // And the unit above, cooked by the heat rising into it, after it.
      ...Object.fromEntries(
        FIRE_SEATS.flatMap((seat, i) => [
          [seat.unit, failing(() => plant.seatStates.value[i], i)],
          [seat.above.unit, failing(() => plant.aboveStates.value[i], i + 7)],
        ]),
      ),
      [UNITS.incoming]: computed(
        () =>
          plant.distributionFate.value !== 'dead' ||
          plant.lastToFail.value !== 'INCOMING',
      ),
    },
    dress: createLevel0Dresser(plant, ref, wiring),
    interlock,
    breakerLatch: {
      // The power interlock: its key turned out, the main disconnect will
      // not close.
      [UNITS.main]: computed(
        () =>
          !plant.closePermit.value &&
          ref.value?.mainBreaker.position.value !== 'on',
      ),
    },
    ...level0Tones(plant, running),
    stackLight: (booting) => ({
      powered: mains.value,
      battery: ref.value?.supply.value ?? false,
      fault: !plant.healthy.value,
      restarting: false,
      booting:
        booting || plant.plcStatus.value === 'booting' || !plant.steady.value,
    }),
  });
  ref.value = mcc;
  const circuit = (id: string) => mcc.circuits.get(id)!;
  const breaker = (id: string) => circuit(id).breaker!.breaker!;
  // A fresh machine starts with everything off, set once here so that a
  // retained room keeps whatever the player has done since: every unit's
  // breaker open, however it is worked, except MAIN INCOMING's, sealed
  // behind its cover and never operated; and every starter with its own
  // START button stopped, to wait for it. Emergency stops stay released,
  // protective devices healthy.
  for (const [id, unit] of mcc.circuits) {
    if (id !== UNITS.incoming) unit.breaker?.breaker?.position.set('off');
    if (STARTED[id as (typeof STARTED_UNITS)[number]]) unit.stop();
  }
  const automation = breaker(UNITS.automation);
  const driveBreaker = breaker(UNITS.vfd);
  const assembly = circuit(UNITS.automation).devices.find(
    (d) => d.kind === 'backplane',
  )!;
  const capacitors = circuit(UNITS.vfd).devices.find(
    (d) => d.kind === 'capacitors',
  )!;
  const capacitorHome = {
    parent: capacitors.object.parent!,
    position: capacitors.object.position.clone(),
    quaternion: capacitors.object.quaternion.clone() as Quaternion,
  };
  const devices = [...mcc.circuits.values()].flatMap((c) => c.devices);

  // FIELD TERMINATIONS' interposing relays: K2 outputs, K3 inputs.
  const outputRelay = wires.relay(UNITS.field, 2);
  const inputRelay = wires.relay(UNITS.field, 3);

  // The feed motor's emergency stop latch, kept in the model (`feedHeld`):
  // struck, it holds the motor stopped; pulled out, it holds on until
  // HAND OFF AUTO is turned to OFF.
  const feedLatch = effect(() => {
    if (circuit(UNITS.feed).emergency.value) plant.control.feedHeld.set(true);
    else if (plant.control.feedHoa.value === 1)
      plant.control.feedHeld.set(false);
  });

  // ---- Electrical components into the model --------------------------------
  const unbridge = effect(() => {
    plant.sense({
      incoming: mcc.supply.value,
      mains: mains.value,
      lube: circuit(UNITS.lube).running.value,
      cooling: circuit(UNITS.cooling).running.value,
      hydraulic: circuit(UNITS.hydraulic).running.value,
      auxDrive: circuit(UNITS.auxDrive).running.value,
      vent: circuit(UNITS.vent).running.value,
      mainMotor: circuit(UNITS.mainMotor).running.value,
      feed: circuit(UNITS.feed).running.value,
      auxMotor: circuit(UNITS.auxMotor).running.value,
      hydro: circuit(UNITS.hydro).running.value,
      fan: circuit(UNITS.fan).running.value,
      control: wiring(UNITS.control).run.value,
      phase: wiring(UNITS.phase).run.value,
      panMonitor: wiring(UNITS.panMonitor).run.value,
      dingle: circuit(UNITS.dingle).running.value,
      grammeter: circuit(UNITS.grammeter).running.value,
      distribution: circuit(UNITS.distribution).powered.value,
      modial: wiring(UNITS.modial).run.value,
      feedReady: wiring(UNITS.feed).run.value,
      hydraulicReady: wiring(UNITS.hydraulic).run.value,
      plcCabinet: circuit(UNITS.automation).powered.value,
      backplane: assembly.service!.running.value,
      // FIELD TERMINATIONS: K1 the supply contactor, K2 and K3 interposing.
      field: wiring(UNITS.field).run.value,
      hmi: wiring(UNITS.automation).run.value,
      outputLink:
        wires.remoteIo.value &&
        outputRelay.value &&
        wiring(UNITS.field).link.value,
      inputLink: inputRelay.value,
      feedLink: wiring(UNITS.feed).link.value,
      hydraulicLink: wiring(UNITS.hydraulic).link.value,
      driveLink: wiring(UNITS.vfd).link.value,
      hydroLink: wiring(UNITS.hydro).link.value,
      dingleLink: wiring(UNITS.dingle).link.value,
      phaseLink: wiring(UNITS.phase).link.value,
      vfdControl: circuit(UNITS.vfd).powered.value,
      // Its power stage and DC bus sound, and its enable circuit made.
      vfdReady: circuit(UNITS.vfd).running.value && wiring(UNITS.vfd).run.value,
      // The isolator closed, and its output filter board sound.
      driveIsolator: wiring(UNITS.driveIsolator).run.value,
      liveDoorOpen: [...mcc.doors].some(
        ([id, open]) => open.value && circuit(id).powered.value,
      ),
      failedInstalled:
        assembly.service!.failed.value ||
        assembly.slots!.some(
          (slot) => slot.occupant.value?.service?.failed.value,
        ) ||
        devices.some(
          (d) =>
            (['fuse', 'contactor', 'relay', 'capacitors'].includes(d.kind) &&
              d.faulted.value) ||
            (d.kind === 'terminal' && d.service!.failed.value),
        ),
    });
    plant.report(
      componentReports(
        mcc,
        (id) => id === UNITS.feed && plant.control.feedHeld.value,
      ),
    );
    plant.senseControlAmps(controlAmps(mcc, mains.value));
    assembly.slots!.forEach((slot, i) => {
      const card = slot.occupant.value;
      plant.senseCard(
        CARD_KINDS[i],
        !card || !card.service!.connected.state.value
          ? 'absent'
          : card.service!.failed.value
            ? 'failed'
            : 'ok',
      );
    });
  });

  // ---- Sparks and smoke from a failed, energised rack power card ------------
  const hazards: {
    card: MachineDevice;
    spark: ReturnType<typeof createShortSpark>;
    smoke: ReturnType<typeof createSmokeEmitter>;
    strength: number;
    next: number;
  }[] = [];
  const watchHazard = (card: MachineDevice) => {
    if (card.kind !== 'plc-power') return;
    const spark = createShortSpark(kit, 12);
    spark.group.scale.setScalar(2);
    spark.group.position.set(0, 0.06, 0.03);
    card.object.add(spark.group);
    const smoke = createSmokeEmitter(10, '58, 56, 52');
    smoke.group.position.set(0, 0.11, 0.02);
    smoke.group.scale.setScalar(0.6);
    smoke.group.visible = false;
    card.object.add(smoke.group);
    hazards.push({ card, spark, smoke, strength: 0, next: 0 });
  };
  for (const card of assembly.cards!) watchHazard(card);
  const crackle: SoundRecipe = {
    click: { band: 3800, q: 1.1, decay: 0.04, level: 0.22, repeat: [4, 0.03] },
  };
  /** Whether a card is in its slot with the cabinet's supply on. */
  const energised = (card: MachineDevice) =>
    assembly.slots!.some((slot) => slot.occupant.value === card) &&
    plant.electrical.plcCabinet.value;

  // ---- One random failure at a time ----------------------------------------
  const scheduler = createIncidentScheduler({ random });
  /**
   * What may fail, each with a repair the player can make: a powered
   * unit's control fuse blows (the fuse is replaced by working it inside
   * the open bucket), or a running starter's overload trips (reset on the
   * relay inside, or MAIN DRIVE MOTOR's O/L RESET, once it has cooled).
   * Cards are kept out of the pool while there are no spares to fit.
   */
  const eligible = () =>
    [...mcc.circuits].flatMap(([id, unit]) =>
      unit.devices.flatMap((device) =>
        device.kind === 'fuse' && unit.powered.value && !device.faulted.value
          ? [`fuse:${id}`]
          : device.kind === 'overload' &&
              unit.running.value &&
              !device.faulted.value
            ? [`overload:${id}`]
            : [],
      ),
    );
  const inflict = (id: string) => {
    const [what, where] = id.split(':');
    if (what === 'card') {
      const kind = where as CardKind;
      assembly.slots![CARD_KINDS.indexOf(kind)].occupant.value?.test();
      return;
    }
    circuit(where)
      ?.devices.find((device) => device.kind === what)
      ?.test();
  };

  // ---- Boards: isolation, removal and reseating ----------------------------
  const seated = () =>
    assembly
      .slots!.map((slot) => slot.occupant.value)
      .filter(Boolean) as MachineDevice[];
  const capacitorsInPlace = () =>
    portableOf(capacitors)?.phase.value === 'installed' &&
    capacitors.object.parent === capacitorHome.parent;
  const removedListeners = new Set<(board: MachineDevice) => void>();
  let installed = new Set<MachineDevice>([...seated(), capacitors]);

  let clock = 0;
  const update = (delta: number) => {
    clock += delta;
    // Installed boards come out only with their own cabinet isolated; a
    // loose one can always be picked up.
    for (const card of seated())
      portableOf(card)?.setLocked(automation.closed.value);
    portableOf(capacitors)?.setLocked(
      capacitorsInPlace() && driveBreaker.closed.value,
    );
    plant.step(delta);
    mcc.update(delta);
    const now = new Set<MachineDevice>([
      ...seated(),
      ...(capacitorsInPlace() ? [capacitors] : []),
    ]);
    for (const board of installed)
      if (!now.has(board) && portableOf(board)?.phase.value === 'held')
        for (const listener of removedListeners) listener(board);
    installed = now;
    const struck = scheduler.step(delta, {
      operating: plant.operating.value,
      healthy: plant.healthy.value,
      eligible: eligible(),
    });
    if (struck) inflict(struck);
    for (const hazard of hazards) {
      const live = hazard.card.service!.failed.value && energised(hazard.card);
      // Isolated, it stops arcing at once; its smoke drifts away slowly.
      hazard.strength +=
        ((live ? 1 : 0) - hazard.strength) *
        Math.min(1, delta / (live ? 3 : 9));
      if (live && clock >= hazard.next) {
        hazard.spark.fire();
        partAudio.play(crackle, hazard.card.object);
        hazard.next = clock + 0.5 + random() * 1.4;
      }
      hazard.spark.update(delta, reducedMotion());
      hazard.smoke.group.visible = hazard.strength > 0.01;
      if (hazard.smoke.group.visible)
        hazard.smoke.update(clock, hazard.strength * 0.8, reducedMotion());
    }
  };

  return {
    mcc,
    diagnostics: {
      steady: computed(() => plant.steady.value && mcc.steady.value),
      powered: mains,
      // Each unit as its annunciator window truly stands (not as scanned):
      // green, failed, or otherwise (off, starting, a warning).
      units: computed<Record<string, UnitHealth>>(() =>
        Object.fromEntries(
          plant.windowStates.value.map((state) => [
            state.window,
            state.worst === 'failure' || state.worst === 'critical'
              ? 'failed'
              : state.on && !state.starting && !state.worst
                ? 'green'
                : 'other',
          ]),
        ),
      ),
      ...level0Diagnostics(
        plant,
        mcc.diagnosticEndpoint,
        Object.fromEntries(
          [...mcc.circuits].map(([id, circuit]) => [
            MODULE_OF[id],
            circuit.powered,
          ]),
        ),
        Object.fromEntries(
          Object.entries(UNIT_NAMES).map(([id, name]) => [MODULE_OF[id], name]),
        ),
      ),
    },
    plant,
    automation,
    driveBreaker,
    assembly,
    capacitors,
    scheduler,
    update,
    /** Called when an installed board is first taken out of the machine. */
    onBoardRemoved(listener: (board: MachineDevice) => void) {
      removedListeners.add(listener);
      return () => removedListeners.delete(listener);
    },
    /** A healthy spare card of one kind, ready to place and add to parts. */
    spare(kind: CardKind) {
      const card = assembly.spare!(kind);
      watchHazard(card);
      return card;
    },
    /** Every card the rack knows, installed or not. */
    isCard: (object: Object3D) =>
      object.userData.machineComponentKind?.startsWith?.('plc-') === true,
    /**
     * Seat a card (or the capacitor board) back in the machine: only into
     * an empty slot of its kind, and only with that cabinet isolated.
     */
    reseat(device: MachineDevice) {
      if (device === capacitors) {
        if (driveBreaker.closed.value || capacitorsInPlace()) return false;
        capacitorHome.parent.add(device.object);
        device.object.position.copy(capacitorHome.position);
        device.object.quaternion.copy(capacitorHome.quaternion);
        device.object.scale.setScalar(1);
        portableOf(device)!.reset();
        return true;
      }
      if (automation.closed.value) return false;
      const slot = CARD_KINDS.indexOf(device.kind as CardKind);
      return slot >= 0 && assembly.insert!(device, slot);
    },
    /** Whether a failed card is arcing now, and how much smoke it gives. */
    hazard: () => ({
      arcing: hazards.some(
        (h) => h.card.service!.failed.value && energised(h.card),
      ),
      smoke: Math.max(0, ...hazards.map((h) => h.strength)),
    }),
    /** Development: fail something now, as the scheduler would. */
    inflict,
    eligible,
    capacitorParent: capacitorHome.parent,
    dispose() {
      unbridge();
      feedLatch();
      for (const hazard of hazards) hazard.smoke.dispose();
    },
  };
}
