import { computed, effect } from '@preact/signals-core';
import { Mesh, MeshStandardMaterial, Shape, ShapeGeometry } from 'three';
import type { Object3D } from 'three';
import { FIRE_SEATS } from '../game/level0-plant';
import { sootAfter } from '../game/machine-failure';
import { UNITS } from '../scene/level0-faces';
import { createUnitSmoke } from '../scene/mcc-smoke';
import { BAY_WIDTHS, MCC_WIDTH } from '../scene/retro-encabulator-mcc';
import { partAudio } from '../toolkit/components/core/audio/part-audio';
import type { SoundRecipe } from '../toolkit/components/core/audio/part-audio';
import { beginPart } from '../toolkit/components/core/parts/parts';
import { createShortSpark } from '../toolkit/components/core/views/button-effects';
import type { PanelKit } from '../toolkit/components/core/views/eighties-controls';
import { createSmokeEmitter } from '../toolkit/components/core/views/smoke-emitter';
import { machineTone } from '../toolkit/components/sound/audio/machine-tones';
import type { createLevel0Machine } from './level0-machine';

type Level0Machine = ReturnType<typeof createLevel0Machine>;

/** The spill's largest reach across the floor, metres, all the oil out. */
const SPILL_METRES = 1.6;

/** A seizure: a hard metallic bang and the rattle of a bearing breaking up. */
const SEIZE: SoundRecipe = {
  sequence: [
    {
      at: 0,
      click: { band: 900, q: 0.8, decay: 0.2, level: 0.9, thump: [40, 0.35] },
    },
    {
      at: 0.05,
      click: {
        band: 4200,
        q: 1.4,
        decay: 0.03,
        level: 0.45,
        repeat: [8, 0.03],
      },
    },
  ],
};

/** DISTRIBUTION giving way: a fizzing crackle of small arcs. */
const CRACKLE: SoundRecipe = {
  sequence: [
    {
      at: 0,
      click: {
        band: 3200,
        q: 1.2,
        decay: 0.02,
        level: 0.4,
        repeat: [18, 0.11],
      },
    },
    { at: 1.9, click: { band: 700, q: 0.8, decay: 0.12, level: 0.6 } },
  ],
};

const reducedMotion = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);

/**
 * What Level 0's failures look and sound like, from its model: lube
 * starvation's oil spill spreading from the base of the lube pump's
 * section, the grinding of worn bearings from the motors' units, and the
 * seizure (a bang, sparks and smoke at the motor's unit, its overload and
 * the main breaker tripping). Machine-local; the room updates it.
 */
export function createLevel0Failures(kit: PanelKit, machine: Level0Machine) {
  const { mcc, plant } = machine;
  /** A unit door's hinge, by its nameplate, and the middle of its face. */
  const unit = (label: string) => {
    let leaf: Object3D | undefined;
    mcc.group.traverse((o) => {
      if (!leaf && o.name.includes(label) && o.name.endsWith(' door')) leaf = o;
    });
    return { hinge: leaf!.parent!, middle: leaf!.position.x };
  };
  const units = {
    'M-101': unit('MAIN DRIVE MOTOR M-101'),
    VFD: unit('MAIN ENCABULATOR DRIVE VFD-601'),
  } as const;

  // ---- The spill: a glossy black puddle from the lube section's base. ----
  const outline = new Shape();
  for (let i = 0; i <= 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    const r = 1 + 0.18 * Math.sin(a * 3 + 1.1) + 0.1 * Math.sin(a * 7 + 0.4);
    // Spreading mostly forward, away from the machine's base.
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r * (Math.sin(a) > 0 ? 0.5 : 1.2);
    if (i === 0) outline.moveTo(x, y);
    else outline.lineTo(x, y);
  }
  const oil = new MeshStandardMaterial({
    color: '#110c07',
    roughness: 0.05,
    metalness: 0.35,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const spill = new Mesh(new ShapeGeometry(outline), oil);
  spill.name = 'Lube oil spill';
  spill.rotation.x = -Math.PI / 2;
  spill.userData.noCollision = true;
  spill.raycast = () => {};
  // The lube oil pump's section, the third.
  const lubeX =
    -MCC_WIDTH / 2 + BAY_WIDTHS[0] + BAY_WIDTHS[1] + BAY_WIDTHS[2] / 2;
  spill.visible = false;
  mcc.group.add(spill);

  // ---- Grinding: each worn bearing's dry tick and squeal. ----------------
  const grind = (
    where: keyof typeof units,
    wear: () => number,
    turning: () => boolean,
  ) => {
    const sound = beginPart(kit, `${where} worn bearing`);
    sound.holdWhile(
      computed(() => wear() > 0.05 && turning()),
      machineTone(
        'worn-fan',
        computed(() => 0.7 + wear() * 0.9),
        computed(() => 0.015 + wear() * 0.09),
      ),
    );
    sound.object.position.set(units[where].middle, 0, -0.2);
    units[where].hinge.add(sound.object);
    mcc.parts.add(sound.part());
  };
  grind(
    'M-101',
    () => plant.state.motorWear.value,
    () => plant.electrical.mainMotor.value,
  );
  grind(
    'VFD',
    () => plant.state.driveWear.value,
    () => plant.state.driveHz.value > 1,
  );

  // ---- The seizure: a bang, sparks and smoke, and the trips. ---------------
  const hazards = (Object.keys(units) as (keyof typeof units)[]).map(
    (where) => {
      const spark = createShortSpark(kit, 16);
      spark.group.scale.setScalar(3);
      spark.group.position.set(units[where].middle, 0, 0.06);
      units[where].hinge.add(spark.group);
      const smoke = createSmokeEmitter(14, '46, 44, 41');
      smoke.group.position.set(units[where].middle, 0.15, 0.08);
      smoke.group.visible = false;
      units[where].hinge.add(smoke.group);
      return { where, spark, smoke, strength: 0, sparks: 0 };
    },
  );
  const overload = mcc.circuits
    .get(UNITS.mainMotor)!
    .devices.find((d) => d.kind === 'overload');
  let seized: string | null = plant.state.seized.peek();
  const stop = effect(() => {
    const now = plant.state.seized.value;
    if (now && now !== seized) {
      if (now === 'M-101') overload?.test();
      mcc.mainBreaker.trip();
      const hazard = hazards.find((h) => h.where === now)!;
      hazard.strength = 1;
      hazard.sparks = 5;
      partAudio.play(SEIZE, hazard.spark.group);
    }
    seized = now;
  });

  // ---- Water in a live machine: shorts, then total shutdown. -------------
  // The sprinkler water floods the floor round the machine, as wide as it
  // is wet; where it reaches the live bus it flashes over in unit after
  // unit, trips the main breaker and keeps it tripped until the machine is
  // dried out and repaired; and the wet units are left with faults of
  // their own (blown fuses, tripped overloads) to find and repair.
  const waterMaterial = new MeshStandardMaterial({
    color: '#3d4a52',
    roughness: 0.02,
    metalness: 0.1,
    transparent: true,
    opacity: 0.55,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const flood = new Mesh(spill.geometry, waterMaterial);
  flood.name = 'Sprinkler water on the floor';
  flood.rotation.x = -Math.PI / 2;
  flood.userData.noCollision = true;
  flood.raycast = () => {};
  flood.visible = false;
  mcc.group.add(flood);
  const shorting = [
    UNITS.vfd,
    UNITS.mainMotor,
    UNITS.control,
    UNITS.automation,
    UNITS.hydraulic,
    UNITS.auxDrive,
  ].map((id) => {
    const unit = mcc.unitFaces.get(id)!;
    const spark = createShortSpark(kit, 14);
    spark.group.scale.setScalar(2.5);
    spark.group.position.set(
      unit.centre,
      (unit.face.bottom + unit.face.top) / 2,
      mcc.doorFront + 0.04,
    );
    unit.section.add(spark.group);
    return spark;
  });
  // ---- The fire: smoke from three lower cabinets, soot on the faces above.
  const burning = FIRE_SEATS.map(({ unit: id }, i) => {
    const source = mcc.unitFaces.get(id)!;
    const faces = [...mcc.unitFaces.values()]
      .filter(
        (u) => u.bay === source.bay && u.face.bottom >= source.face.bottom,
      )
      .map((u) => u.face);
    return {
      soot: 0,
      view: createUnitSmoke(source.section, {
        x: source.centre,
        width: source.face.width,
        seam: source.face.top + 0.003,
        z: mcc.doorFront,
        seed: 6100 + i,
        faces,
      }),
    };
  });
  // DISTRIBUTION, holding out after the water, fails in its turn: it
  // crackles and flashes over as the annunciator sputters, then its
  // breaker trips and everything it feeds goes dark.
  const distribution = mcc.unitFaces.get(UNITS.distribution)!;
  const distributionSpark = createShortSpark(kit, 14);
  distributionSpark.group.scale.setScalar(2.5);
  distributionSpark.group.position.set(
    distribution.centre,
    (distribution.face.bottom + distribution.face.top) / 2,
    mcc.doorFront + 0.04,
  );
  distribution.section.add(distributionSpark.group);
  let distributionFlashes = 0;
  let fate = plant.distributionFate.peek();
  const stopDistribution = effect(() => {
    const now = plant.distributionFate.value;
    if (now === 'sputtering' && fate === 'holding') {
      distributionFlashes = 6;
      partAudio.play(CRACKLE, distributionSpark.group);
    }
    if (now === 'dead') {
      const breaker = mcc.circuits.get(UNITS.distribution)?.breaker?.breaker;
      if (breaker?.position.peek() === 'on') breaker.trip();
    }
    fate = now;
  });
  let flashes = 0;
  let wasDrowned = plant.drowned.peek();
  const stopDrowning = effect(() => {
    const drowned = plant.drowned.value;
    const live = plant.electrical.mains.value;
    if (drowned && !wasDrowned) {
      flashes = 12;
      partAudio.play(SEIZE, shorting[0].group);
      // Secondary faults in the wet units.
      const eligible = machine.eligible();
      for (let i = 0; i < 2 && eligible.length; i++)
        machine.inflict(
          eligible.splice(Math.floor(Math.random() * eligible.length), 1)[0],
        );
    }
    wasDrowned = drowned;
    // Shorted or burnt out, the bus will not hold: the main breaker trips
    // straight out, whenever it is closed, until the machine is repaired.
    if ((drowned || plant.ruined.value) && live) mcc.mainBreaker.trip();
  });

  let clock = 0;
  return {
    spill,
    flood,
    /** How sooted the fire has left the faces above it, 0 to 1. */
    get soot() {
      return Math.max(...burning.map((seat) => seat.soot));
    },
    /** Cleaned up, as if it had never burnt (the simulator's RESET). */
    clean() {
      for (const seat of burning) seat.soot = 0;
    },
    /** `symptom`: oil the simulator's OIL LEAK has spread, 0 to 1. */
    update(delta: number, symptom = 0) {
      clock += delta;
      // The spill, as wide as the oil that has leaked out.
      const out = Math.max(plant.spilled.value, symptom);
      spill.visible = out > 0.002;
      const radius = 0.12 + SPILL_METRES * 0.5 * Math.sqrt(out);
      spill.scale.set(radius, radius, 1);
      // Its back edge stays tucked under the plinth: it spreads forward
      // from the base of the cabinet, never from a gap in front of it.
      spill.position.set(lubeX, 0.004, radius * 0.5 - 0.02);
      // The sprinkler water, wider and thinner, under the heads.
      const wet = plant.wetness.value;
      flood.visible = wet > 0.01;
      const reach = 0.3 + 1.6 * Math.sqrt(wet);
      flood.scale.set(reach * 1.6, reach, 1);
      flood.position.set(0, 0.003, reach * 0.5 - 0.1);
      if (flashes > 0 && Math.random() < delta * 5) {
        shorting[Math.floor(Math.random() * shorting.length)].fire();
        flashes--;
      }
      for (const spark of shorting) spark.update(delta, reducedMotion());
      if (distributionFlashes > 0 && Math.random() < delta * 4) {
        distributionSpark.fire();
        distributionFlashes--;
      }
      distributionSpark.update(delta, reducedMotion());
      // The fire's smoke, thicker as it grows, and the soot it leaves.
      // Plainly smoking from the start, pouring as it takes hold.
      const size = plant.fireSize.value;
      const smoke = size > 0 ? Math.min(1, 0.4 + size * 1.5) : 0;
      for (const seat of burning) {
        seat.soot = sootAfter(seat.soot, smoke, delta);
        seat.view.update(clock, smoke, seat.soot);
      }
      for (const hazard of hazards) {
        if (hazard.sparks > 0 && Math.random() < delta * 6) {
          hazard.spark.fire();
          hazard.sparks--;
        }
        hazard.spark.update(delta, reducedMotion());
        // Smoke pours, then thins over half a minute.
        hazard.strength = Math.max(0, hazard.strength - delta / 30);
        hazard.smoke.group.visible = hazard.strength > 0.01;
        if (hazard.smoke.group.visible)
          hazard.smoke.update(clock, hazard.strength, reducedMotion());
      }
    },
    dispose() {
      stop();
      stopDrowning();
      stopDistribution();
      for (const seat of burning) seat.view.dispose();
      waterMaterial.dispose();
      oil.dispose();
      spill.geometry.dispose();
      for (const hazard of hazards) hazard.smoke.dispose();
    },
  };
}

export type Level0Failures = ReturnType<typeof createLevel0Failures>;
