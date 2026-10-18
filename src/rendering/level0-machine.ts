import { computed, effect, signal } from '@preact/signals-core';
import type { Object3D, Quaternion } from 'three';
import { createIncidentScheduler } from '../game/level0-incidents';
import { CARD_KINDS, createLevel0Plant } from '../game/level0-plant';
import type { CardKind } from '../game/level0-plant';
import { createLevel0Dresser, level0Tones, UNITS } from '../scene/level0-faces';
import { createRetroEncabulatorMcc } from '../scene/retro-encabulator-mcc';
import type { MccView } from '../scene/retro-encabulator-mcc';
import { partAudio } from '../toolkit/components/core/audio/part-audio';
import type { SoundRecipe } from '../toolkit/components/core/audio/part-audio';
import type { PanelKit } from '../toolkit/components/core/views/eighties-controls';
import { createShortSpark } from '../toolkit/components/core/views/button-effects';
import { createSmokeEmitter } from '../toolkit/components/core/views/smoke-emitter';
import type { MachineDevice } from '../toolkit/components/industrial-control/parts/machine-components';
import type { PortableObject } from '../toolkit/controls/input/object-handling';

const portableOf = (device: MachineDevice) =>
  (device.object.userData.portable as PortableObject | undefined)?.component;

const reducedMotion = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);

/**
 * Level 0's machine: the shared line-up, wired unit by unit to its own
 * process model (`src/game/level0-plant.ts`) through the line-up's hooks,
 * with one random failure at a time and the repair loop's parts: spares,
 * isolation and reseating. Its wiring is described in
 * `doc/design/level0-wiring.md`.
 */
export function createLevel0Machine(
  kit: PanelKit,
  { random = Math.random }: { random?: () => number } = {},
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
  const mcc = createRetroEncabulatorMcc(kit, {
    incomingOn: false,
    dress: createLevel0Dresser(plant, ref),
    interlock: {
      // No lube oil pressure, no main drive motor.
      [UNITS.mainMotor]: plant.oilOk,
      // LOCAL on its key, or REMOTE when Automation Control runs it.
      [UNITS.hydraulic]: plant.hydraulicPermit,
    },
    breakerLatch: {
      // The Kirk key: turned out, the main disconnect will not close.
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
        booting ||
        plant.plcStatus.value === 'booting' ||
        plant.state.dimension.value < plant.allowed.value,
    }),
  });
  ref.value = mcc;
  const circuit = (id: string) => mcc.circuits.get(id)!;
  const breaker = (id: string) => circuit(id).breaker!.breaker!;
  // Level 2's initial switch positions: both pumps off.
  breaker(UNITS.lube).position.set('off');
  breaker(UNITS.hydro).position.set('off');
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
  const overload = circuit(UNITS.mainMotor).devices.find(
    (d) => d.kind === 'overload',
  )!;
  const devices = [...mcc.circuits.values()].flatMap((c) => c.devices);

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
      control: circuit(UNITS.control).powered.value,
      phase: circuit(UNITS.phase).powered.value,
      panMonitor: circuit(UNITS.panMonitor).powered.value,
      dingle: circuit(UNITS.dingle).powered.value,
      grammeter: circuit(UNITS.grammeter).powered.value,
      plcCabinet: circuit(UNITS.automation).powered.value,
      backplane: assembly.service!.running.value,
      field: circuit(UNITS.field).powered.value,
      vfdControl: circuit(UNITS.vfd).powered.value,
      vfdReady: circuit(UNITS.vfd).running.value,
      driveIsolator: circuit(UNITS.driveIsolator).powered.value,
      tripped: devices.some(
        (d) =>
          (d.kind === 'breaker' || d.kind === 'overload') && d.faulted.value,
      ),
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
  const eligible = () => [
    ...assembly
      .slots!.filter(
        (slot) =>
          slot.occupant.value?.active.value &&
          !slot.occupant.value.service!.failed.value,
      )
      .map((slot) => `card:${slot.kind}`),
    ...(circuit(UNITS.mainMotor).running.value ? ['overload:main motor'] : []),
  ];
  const inflict = (id: string) => {
    if (id.startsWith('card:')) {
      const kind = id.slice(5) as CardKind;
      assembly.slots![CARD_KINDS.indexOf(kind)].occupant.value?.test();
    } else if (id === 'overload:main motor') overload.test();
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
      for (const hazard of hazards) hazard.smoke.dispose();
    },
  };
}
