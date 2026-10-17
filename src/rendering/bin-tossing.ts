import { Box3, Matrix4, Quaternion, Vector3 } from 'three';
import type { Camera, Object3D } from 'three';
import { click, partAudio } from '../audio/part-audio';
import {
  BIN_REACH,
  aimsAtBin,
  arcSeconds,
  binArc,
  binRest,
} from '../game/bin-toss';
import type { BinShape, Point3 } from '../game/bin-toss';
import type { PortableObject } from './object-handling';

/** A bin things can be thrown into: its model, its inside and where it is. */
export interface TossBin {
  name: string;
  /** Its model, placed by `x` and `z` (metres) on the floor. */
  group: Object3D;
  shape: BinShape;
  /** Its size on the floor plan, metres, its length along x. */
  footprint: { x: number; z: number };
  x: number;
  z: number;
}

// Landing in a steel skip: a hollow clang.
const clang = click({
  band: 820,
  q: 7,
  decay: 0.45,
  level: 0.3,
  thump: [72, 0.16],
});

/**
 * Throwing things into bins, for any room (`src/game/bin-toss.ts` is the
 * rule): pass `divert` to `createFirstPerson`, and a released object let
 * go facing a bin within reach, counted from its middle plus half its
 * length so a long skip can be reached from its end, flies in a parabola
 * into the bin faced most squarely, turning to lie flat along it, and
 * lands with a clang on whatever is already there, where it stays,
 * locked. Bins can be added at any time, so a room may conjure one up.
 * Objects are in the scene's frame, `metre` units to the metre.
 */
export function createBinTossing({
  camera,
  metre: m,
  random = Math.random,
  onLanded = () => {},
}: {
  camera: Camera;
  metre: number;
  random?: () => number;
  /** Called as each object lands in its bin. */
  onLanded?: (object: Object3D, bin: TossBin) => void;
}) {
  const bins: (TossBin & { filled: number })[] = [];
  const tosses: {
    object: Object3D;
    portable: PortableObject;
    from: Point3;
    to: Point3;
    fromQ: Quaternion;
    toQ: Quaternion;
    centre: Vector3;
    age: number;
    seconds: number;
    bin: TossBin;
  }[] = [];
  const eye = new Vector3();
  const look = new Vector3();
  /** Where an object's middle is, in its own frame, scaled. */
  const middleOf = (object: Object3D) => {
    object.updateMatrixWorld(true);
    const box = new Box3().setFromObject(object);
    const centre = box.getCenter(new Vector3());
    return object.worldToLocal(centre).multiply(object.scale);
  };
  /** Send `object` into `bin` from where it is now. */
  const toss = (
    object: Object3D,
    portable: PortableObject,
    bin: TossBin & { filled: number },
  ) => {
    const centre = middleOf(object);
    const start = object.position
      .clone()
      .add(centre.clone().applyQuaternion(object.quaternion))
      .divideScalar(m);
    const rest = binRest(bin.filled++, bin.shape, random);
    const to = { x: bin.x + rest.x, y: rest.y + 0.02, z: bin.z + rest.z };
    // Lying flat (its thinnest side up) with its length along the bin,
    // then tipped up at the end as the bin fills, and turned a little.
    const turned = object.quaternion.clone();
    object.quaternion.identity();
    object.updateMatrixWorld(true);
    const own = new Box3().setFromObject(object).getSize(new Vector3());
    object.quaternion.copy(turned);
    object.updateMatrixWorld(true);
    const axes = [
      new Vector3(1, 0, 0),
      new Vector3(0, 1, 0),
      new Vector3(0, 0, 1),
    ].sort((p, q) => own.dot(p) - own.dot(q));
    const thin = axes[0];
    const long = axes[2];
    const across = long.clone().cross(thin);
    const lay = new Quaternion().setFromRotationMatrix(
      new Matrix4().makeBasis(long, thin, across).transpose(),
    );
    const toQ = new Quaternion()
      .setFromAxisAngle(new Vector3(0, 1, 0), rest.yaw)
      .multiply(
        new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), rest.tilt),
      )
      .multiply(lay);
    tosses.push({
      object,
      portable,
      from: { x: start.x, y: start.y, z: start.z },
      to,
      fromQ: object.quaternion.clone(),
      toQ,
      centre,
      age: 0,
      seconds: arcSeconds(Math.hypot(start.x - to.x, start.z - to.z)),
      bin,
    });
  };
  /** How far off the line of sight a bin is, radians. */
  const off = (bin: TossBin) => {
    const a =
      Math.abs(
        Math.atan2(bin.x - eye.x, bin.z - eye.z) - Math.atan2(look.x, look.z),
      ) %
      (Math.PI * 2);
    return Math.min(a, Math.PI * 2 - a);
  };
  return {
    bins: bins as readonly (TossBin & { filled: number })[],
    /** Add a bin to throw things into; it must already be in the scene. */
    add(bin: TossBin) {
      const entry = Object.assign(bin, { filled: 0 });
      bins.push(entry);
      return entry;
    },
    /** For `createFirstPerson`: take a released object into a bin, or not. */
    divert(object: Object3D, portable: PortableObject) {
      camera.getWorldPosition(eye).divideScalar(m);
      camera.getWorldDirection(look);
      const bin = bins
        .filter((b) =>
          aimsAtBin(
            { x: eye.x, z: eye.z },
            { x: look.x, z: look.z },
            { x: b.x, z: b.z },
            BIN_REACH + b.footprint.x / 2,
          ),
        )
        .sort((a, b) => off(a) - off(b))[0];
      if (!bin) return false;
      toss(object, portable, bin);
      return true;
    },
    /** Throw `object` straight into the named bin (for development). */
    toss(object: Object3D, portable: PortableObject, name: string) {
      const bin = bins.find((b) => b.name === name) ?? bins[0];
      if (bin) toss(object, portable, bin);
    },
    /** Fly whatever is on its way into a bin. */
    update(delta: number) {
      for (let i = tosses.length - 1; i >= 0; i--) {
        const t = tosses[i];
        t.age += delta;
        const k = Math.min(1, t.age / t.seconds);
        const at = binArc(t.from, t.to, k);
        t.object.quaternion.copy(t.fromQ).slerp(t.toQ, k);
        t.object.position
          .set(at.x * m, at.y * m, at.z * m)
          .sub(t.centre.clone().applyQuaternion(t.object.quaternion));
        if (k < 1) continue;
        // Landed: on the bin's bottom, or on what is already in it.
        tosses.splice(i, 1);
        t.portable.component.impact(1.4, 0);
        t.portable.component.settle();
        t.portable.component.setLocked(true);
        partAudio.play(clang, t.object);
        onLanded(t.object, t.bin);
      }
    },
  };
}
