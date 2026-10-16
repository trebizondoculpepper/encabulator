import { createGraph } from './world/graph';

/**
 * Dev9's wandering button: a push button on a mobile floor stand (four
 * swivel castors) that a four-position knob on the wall puts into one of
 * four moods.
 *
 * - **Normal**: it stays put, going back to its spot in the middle of the
 *   room if it has wandered.
 * - **Eager**: it wants to be pressed. Whichever way the player looks, it
 *   creeps (a quarter of walking speed) to the spot on the floor that puts
 *   its red button nearest the middle of the player's view, never closer
 *   than a comfortable pressing distance, and turns to face them. It waits
 *   for a random one to four seconds of still camera, then turns and travels together,
 *   easing in and out at capped speeds. Tiny camera jitter is ignored.
 * - **Skittish**: it does not want to be pressed, and plays the faster
 *   man in the "lion and man" pursuit game. It keeps to a circle round the
 *   middle of the room (the loop) and, when the player comes near, runs
 *   round it away from them, reversing whenever they cut ahead, and turns
 *   its button away. Running `ORBIT_RATIO` times the player's speed, it
 *   can never be caught (`doc/research/skittish-chase.md`). A corner, or a
 *   straight run to the furthest spot, is where it would be.
 * - **Terrified**: first the furthest corner, then three random corner
 *   escapes when approached. After arriving from the third escape it
 *   gives up, faces the viewer and waits to be pressed.
 *
 * Everything here is in metres on the floor plan; the stand is a disc of
 * `STAND_RADIUS` on the floor, its lens `BUTTON_HEIGHT` up and
 * `BUTTON_FORWARD` ahead of the post.
 */

export type PedestalMode = 'normal' | 'eager' | 'skittish' | 'terrified';
export const PEDESTAL_MODES: readonly PedestalMode[] = [
  'normal',
  'eager',
  'skittish',
  'terrified',
];

// The mobile station's mount is 1.035 + 0.004 m high; the lens face is
// 0.036 + 0.053 + 0.0035 + 0.007 m forward of the post's centre.
export const BUTTON_HEIGHT = 1.039;
export const BUTTON_FORWARD = 0.0995;
/** Random still-camera wait before each eager journey, seconds. */
export const EAGER_DELAY_MIN = 1;
export const EAGER_DELAY_MAX = 4;
/** Eager: angular speed cap (rad/s) and acceleration/braking ramp times (s). */
export const EAGER_TURN_SPEED = 1.5;
export const EAGER_TURN_RAMP = 0.5;
export const EAGER_TRAVEL_RAMP = 0.6;
export const STAND_RADIUS = 0.3;
/** Eager and normal: a quarter of walking speed, m/s. */
export const CREEP_SPEED = 0.5;
/** Eager: the nearest it comes to the player, and the furthest it goes. */
export const PRESSING_DISTANCE = 0.8;
/** Unreachable EAGER target: bring the lens half a metre from the player. */
export const EAGER_NEAR_DISTANCE = 0.5;
const EAGER_CLEARANCE = STAND_RADIUS + 0.25;
export const FURTHEST = 6;
/** Skittish: how near the player may come before it moves away. */
export const FLEE_RADIUS = 2.5;
/** Skittish: its least speed while it flees, m/s. */
export const FLEE_MIN_SPEED = 0.6;
/** Skittish: within this of the stand's centre, the player could press it. */
export const CAUGHT_DISTANCE = 1.2;
/** Skittish: how far its loop keeps the stand's centre off the walls. */
export const ORBIT_CLEARANCE = 0.6;
/**
 * Skittish: how many times the player's speed it runs at. Solving the chase
 * on dev9's loop (`doc/research/skittish-chase.py`), a chaser comes within
 * `CAUGHT_DISTANCE` only below about 1.67; at 1.8 the best chaser comes no
 * nearer than 1.42 m.
 */
export const ORBIT_RATIO = 1.8;
/** The player's top speed, running (`RUN_METRES_PER_SECOND`), m/s. */
export const PLAYER_TOP_SPEED = 4.2;
/** Terrified: its pace while escaping to a corner. */
export const TERRIFIED_MIN_SPEED = 2.8;
export const TERRIFIED_MARGIN = 1.35;
export const EVASION_LIMIT = 3;
export const SPARK_SECONDS = 0.8;
/** How close to a wall its centre may come. */
export const WALL_MARGIN = STAND_RADIUS + 0.1;

export interface Floor {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface Viewer {
  /** The eye, metres. */
  x: number;
  y: number;
  z: number;
  /** Where it looks: a unit vector. */
  dx: number;
  dy: number;
  dz: number;
  /** How fast the player is moving over the floor, m/s. */
  speed: number;
}

export interface Stand {
  x: number;
  z: number;
  /** Which way its button faces, radians (0 faces −z, as the walker's yaw). */
  heading: number;
}

const clampTo = (floor: Floor, x: number, z: number) => ({
  x: Math.min(floor.maxX - WALL_MARGIN, Math.max(floor.minX + WALL_MARGIN, x)),
  z: Math.min(floor.maxZ - WALL_MARGIN, Math.max(floor.minZ + WALL_MARGIN, z)),
});

/**
 * Put the pushable lens on the sight line when that spot is reachable.
 * Otherwise wait just in front of the viewer, ready for a downward glance.
 */
function sightLineTarget(viewer: Viewer, floor: Floor) {
  const flat = Math.hypot(viewer.dx, viewer.dz);
  const ux = flat > 1e-6 ? viewer.dx / flat : 0;
  const uz = flat > 1e-6 ? viewer.dz / flat : -1;
  const along =
    Math.abs(viewer.dy) > 1e-6 ? (BUTTON_HEIGHT - viewer.y) / viewer.dy : -1;
  const distance = along * flat + BUTTON_FORWARD;
  const target = { x: viewer.x + ux * distance, z: viewer.z + uz * distance };
  const inside = clampTo(floor, target.x, target.z);
  if (
    flat > 1e-6 &&
    along > 0 &&
    distance >= PRESSING_DISTANCE &&
    distance <= FURTHEST &&
    Math.hypot(inside.x - target.x, inside.z - target.z) < 1e-6
  )
    return target;
  return null;
}

export function eagerTarget(viewer: Viewer, floor: Floor) {
  const reachable = sightLineTarget(viewer, floor);
  if (reachable) return reachable;
  const flat = Math.hypot(viewer.dx, viewer.dz);
  const ux = flat > 1e-6 ? viewer.dx / flat : 0;
  const uz = flat > 1e-6 ? viewer.dz / flat : -1;
  const close = EAGER_NEAR_DISTANCE + BUTTON_FORWARD;
  const front = {
    x: viewer.x + ux * close,
    z: viewer.z + uz * close,
  };
  // If a wall blocks the space immediately ahead, use the closest safe
  // spot beside it, rather than squeezing into the player or the wall.
  const candidates = [clampTo(floor, front.x, front.z)];
  for (let i = 0; i < 32; i++) {
    const angle = (i * Math.PI * 2) / 32;
    candidates.push(
      clampTo(
        floor,
        viewer.x + Math.sin(angle) * close,
        viewer.z - Math.cos(angle) * close,
      ),
    );
  }
  return candidates
    .filter(
      (p) => Math.hypot(p.x - viewer.x, p.z - viewer.z) >= EAGER_CLEARANCE,
    )
    .sort(
      (a, b) =>
        Math.hypot(a.x - front.x, a.z - front.z) -
        Math.hypot(b.x - front.x, b.z - front.z),
    )[0];
}

/** The heading that faces from (x, z) towards (tx, tz). */
export const facing = (x: number, z: number, tx: number, tz: number) =>
  Math.atan2(tx - x, -(tz - z));

/** Turn `from` towards `to` by at most `step` radians. */
function turn(from: number, to: number, step: number) {
  let d = to - from;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return from + Math.max(-step, Math.min(step, d));
}

/** Move (x, z) towards (tx, tz) at `speed` for `dt` seconds. */
function towards(
  x: number,
  z: number,
  tx: number,
  tz: number,
  speed: number,
  dt: number,
) {
  const dx = tx - x;
  const dz = tz - z;
  const gap = Math.hypot(dx, dz);
  const step = Math.min(gap, speed * dt);
  return gap > 1e-6
    ? { x: x + (dx / gap) * step, z: z + (dz / gap) * step, moved: step }
    : { x, z, moved: 0 };
}

/** Skittish: the loop it runs round, the largest circle in the room. */
export function orbitOf(floor: Floor) {
  return {
    x: (floor.minX + floor.maxX) / 2,
    z: (floor.minZ + floor.maxZ) / 2,
    radius:
      Math.min(floor.maxX - floor.minX, floor.maxZ - floor.minZ) / 2 -
      ORBIT_CLEARANCE,
  };
}

/** Skittish: its speed while it flees from a player moving at `speed`. */
export const fleeSpeed = (speed: number) =>
  Math.min(
    ORBIT_RATIO * PLAYER_TOP_SPEED,
    Math.max(FLEE_MIN_SPEED, ORBIT_RATIO * speed),
  );

/** Which way round the loop it runs: 1 anticlockwise seen from above, −1 not. */
export type OrbitDirection = 1 | -1;

/**
 * Skittish: one step of `speed` for `dt` seconds. Off its loop (at home,
 * say), it makes for the point of the loop it can reach with the most time
 * to spare before the player could. On it, it
 * runs round it away from the player's side, keeping its way while they
 * are all but level with it (`direction`, returned for the next step).
 */
export function orbitStep(
  stand: { x: number; z: number },
  viewer: Viewer,
  floor: Floor,
  speed: number,
  dt: number,
  direction: OrbitDirection,
): { x: number; z: number; direction: OrbitDirection } {
  const loop = orbitOf(floor);
  const sx = stand.x - loop.x;
  const sz = stand.z - loop.z;
  const out = Math.hypot(sx, sz);
  if (Math.abs(out - loop.radius) > 0.05) {
    // Of the points round the loop, the one it reaches with most time to
    // spare before the player could (at its usual speed ratio).
    let best = { x: loop.x + loop.radius, z: loop.z, lead: -Infinity };
    for (let k = 0; k < 72; k++) {
      const a = (k / 72) * Math.PI * 2;
      const x = loop.x + Math.cos(a) * loop.radius;
      const z = loop.z + Math.sin(a) * loop.radius;
      const lead =
        Math.hypot(x - viewer.x, z - viewer.z) -
        Math.hypot(x - stand.x, z - stand.z) / ORBIT_RATIO;
      if (lead > best.lead) best = { x, z, lead };
    }
    const to = towards(stand.x, stand.z, best.x, best.z, speed, dt);
    return { x: to.x, z: to.z, direction };
  }
  const angle = Math.atan2(sz, sx);
  const px = viewer.x - loop.x;
  const pz = viewer.z - loop.z;
  if (Math.hypot(px, pz) > 0.3) {
    const behind = Math.atan2(
      Math.sin(angle - Math.atan2(pz, px)),
      Math.cos(angle - Math.atan2(pz, px)),
    );
    if (Math.abs(behind) > 0.03) direction = behind > 0 ? 1 : -1;
  }
  const next = angle + (direction * speed * dt) / loop.radius;
  return {
    x: loop.x + Math.cos(next) * loop.radius,
    z: loop.z + Math.sin(next) * loop.radius,
    direction,
  };
}

/**
 * One step of the stand's behaviour in `mode`, for `dt` seconds: where it
 * goes, which way it turns, and how fast it moved (for its castors and
 * their sound).
 */
export function stepStand(
  stand: Stand,
  mode: PedestalMode,
  viewer: Viewer,
  floor: Floor,
  home: { x: number; z: number },
  dt: number,
  escape?: { target: { x: number; z: number }; surrendered: boolean },
  eagerPose?: Stand,
  orbit: { direction: OrbitDirection } = { direction: 1 },
): Stand & { speed: number } {
  const near = Math.hypot(stand.x - viewer.x, stand.z - viewer.z);
  let next = { x: stand.x, z: stand.z, moved: 0 };
  let heading = stand.heading;
  if (mode === 'normal') {
    next = towards(stand.x, stand.z, home.x, home.z, CREEP_SPEED, dt);
  } else if (mode === 'eager') {
    if (eagerPose) {
      next = {
        ...eagerPose,
        moved: Math.hypot(eagerPose.x - stand.x, eagerPose.z - stand.z),
      };
      heading = eagerPose.heading;
    } else {
      const target = eagerTarget(viewer, floor);
      next = towards(stand.x, stand.z, target.x, target.z, CREEP_SPEED, dt);
      heading = turn(
        heading,
        eagerHeading(viewer, floor),
        dt * EAGER_TURN_SPEED,
      );
    }
  } else if (mode === 'terrified' && escape) {
    const speed = Math.max(
      TERRIFIED_MIN_SPEED,
      viewer.speed * TERRIFIED_MARGIN,
    );
    if (!escape.surrendered) {
      const waypoint = escapeWaypoint(stand, escape.target, viewer, floor);
      next = towards(stand.x, stand.z, waypoint.x, waypoint.z, speed, dt);
    }
    // Finish every corner journey looking back into the room, and keep
    // that orientation while waiting or after giving up.
    const arriving =
      Math.hypot(next.x - escape.target.x, next.z - escape.target.z) <= 2;
    const face =
      arriving || escape.surrendered
        ? facing(
            next.x,
            next.z,
            (floor.minX + floor.maxX) / 2,
            (floor.minZ + floor.maxZ) / 2,
          )
        : facing(viewer.x, viewer.z, next.x, next.z);
    heading = turn(heading, face, dt * Math.max(4.5, (speed * Math.PI) / 2));
  } else if (mode === 'skittish') {
    // Near, it runs; left alone, it creeps onto its loop, ready to.
    const threatened = near < FLEE_RADIUS;
    const loop = orbitOf(floor);
    const onLoop =
      Math.abs(Math.hypot(stand.x - loop.x, stand.z - loop.z) - loop.radius) <=
      0.05;
    if (threatened || !onLoop) {
      const to = orbitStep(
        stand,
        viewer,
        floor,
        threatened ? fleeSpeed(viewer.speed) : CREEP_SPEED,
        dt,
        orbit.direction,
      );
      orbit.direction = to.direction;
      next = { ...to, moved: Math.hypot(to.x - stand.x, to.z - stand.z) };
    }
    if (threatened)
      heading = turn(
        heading,
        facing(viewer.x, viewer.z, next.x, next.z),
        dt * 6,
      );
  }
  // Never into the player.
  const gap = Math.hypot(next.x - viewer.x, next.z - viewer.z);
  const least = mode === 'eager' ? EAGER_CLEARANCE : STAND_RADIUS + 0.3;
  if (gap < least && gap > 1e-6) {
    next.x = viewer.x + ((next.x - viewer.x) / gap) * least;
    next.z = viewer.z + ((next.z - viewer.z) / gap) * least;
  }
  const at = clampTo(floor, next.x, next.z);
  return {
    x: at.x,
    z: at.z,
    heading,
    speed: dt > 0 ? Math.hypot(at.x - stand.x, at.z - stand.z) / dt : 0,
  };
}

/** Route round the player rather than driving straight through pressing range. */
function escapeWaypoint(
  stand: Stand,
  target: { x: number; z: number },
  viewer: Viewer,
  floor: Floor,
) {
  const dx = target.x - stand.x;
  const dz = target.z - stand.z;
  const length = Math.hypot(dx, dz);
  if (length < 1e-6) return target;
  const ux = dx / length;
  const uz = dz / length;
  const along = (viewer.x - stand.x) * ux + (viewer.z - stand.z) * uz;
  const across = Math.abs(
    (viewer.x - stand.x) * uz - (viewer.z - stand.z) * ux,
  );
  if (along <= 0 || along >= length || across >= 1.4) return target;
  // Prefer the shorter detour, including wall clearance. A consistent tie
  // break keeps the stand from dithering between the two sides.
  const options = [-1, 1].map((side) =>
    clampTo(floor, viewer.x + uz * side * 1.8, viewer.z - ux * side * 1.8),
  );
  return options.sort(
    (a, b) =>
      Math.hypot(a.x - stand.x, a.z - stand.z) +
      Math.hypot(a.x - target.x, a.z - target.z) -
      (Math.hypot(b.x - stand.x, b.z - stand.z) +
        Math.hypot(b.x - target.x, b.z - target.z)),
  )[0];
}

/** Lens facing back along the viewing axis, square-on when it arrives. */
function eagerHeading(viewer: Viewer, floor: Floor) {
  const target = eagerTarget(viewer, floor);
  return facing(target.x, target.z, viewer.x, viewer.z);
}

/**
 * Distance travelled with smooth velocity ramps and a constant speed cap.
 * Integrating smoothstep gives zero acceleration at both ends of each ramp.
 * Short journeys use a lower peak speed instead of snapping to their target.
 */
function easedDistance(
  distance: number,
  maximum: number,
  ramp: number,
  elapsed: number,
) {
  if (distance < 1e-9) return distance;
  const peak = Math.min(maximum, distance / ramp);
  const duration = distance / peak + ramp;
  const integral = (u: number) => u * u * u - 0.5 * u * u * u * u;
  const accelerating = (t: number) => peak * ramp * integral(t / ramp);
  if (elapsed >= duration) return distance;
  if (elapsed <= ramp) return accelerating(elapsed);
  if (elapsed >= duration - ramp)
    return distance - accelerating(duration - elapsed);
  return peak * (elapsed - ramp / 2);
}

export interface CornerEscape {
  target: { x: number; z: number };
  evasions: number;
  surrendered: boolean;
}

/** Stateful camera reaction, kept outside the stateless movement calculation. */
export function createStandMotion(random: () => number = Math.random) {
  let escape: CornerEscape | undefined;
  const orbit: { direction: OrbitDirection } = { direction: 1 };
  let previous: Viewer | undefined;
  let stillFor = 0;
  let wasEager = false;
  let eagerDelay = EAGER_DELAY_MIN;
  let eagerJourney:
    | {
        start: Stand;
        target: { x: number; z: number };
        angle: number;
        elapsed: number;
        fallback: boolean;
        angularVelocity: number;
      }
    | undefined;
  const move = (
    stand: Stand,
    mode: PedestalMode,
    viewer: Viewer,
    floor: Floor,
    home: { x: number; z: number },
    dt: number,
  ) => {
    if (mode !== 'terrified') escape = undefined;
    else {
      const corners = [
        clampTo(floor, floor.minX, floor.minZ),
        clampTo(floor, floor.maxX, floor.minZ),
        clampTo(floor, floor.minX, floor.maxZ),
        clampTo(floor, floor.maxX, floor.maxZ),
      ];
      const distance = (p: { x: number; z: number }) =>
        Math.hypot(p.x - viewer.x, p.z - viewer.z);
      if (!escape) {
        const target = corners.sort((a, b) => distance(b) - distance(a))[0];
        escape = { target, evasions: 0, surrendered: false };
      } else if (
        Math.hypot(stand.x - escape.target.x, stand.z - escape.target.z) < 0.05
      ) {
        if (escape.evasions === EVASION_LIMIT) escape.surrendered = true;
        else if (distance(stand) < FLEE_RADIUS) {
          const others = corners.filter(
            (p) =>
              Math.hypot(p.x - escape!.target.x, p.z - escape!.target.z) > 0.1,
          );
          const safe = others.filter((p) => distance(p) > FLEE_RADIUS);
          const choices = safe.length ? safe : others;
          escape = {
            target:
              choices[
                Math.min(
                  choices.length - 1,
                  Math.floor(random() * choices.length),
                )
              ],
            evasions: escape.evasions + 1,
            surrendered: false,
          };
        }
      }
    }
    const moved =
      !previous ||
      Math.hypot(
        viewer.x - previous.x,
        viewer.y - previous.y,
        viewer.z - previous.z,
      ) > 0.01 ||
      Math.hypot(
        viewer.dx - previous.dx,
        viewer.dy - previous.dy,
        viewer.dz - previous.dz,
      ) > 0.005;
    const restarting = mode === 'eager' && (moved || !wasEager);
    if (restarting)
      eagerDelay =
        EAGER_DELAY_MIN + random() * (EAGER_DELAY_MAX - EAGER_DELAY_MIN);
    stillFor = mode !== 'eager' || restarting ? 0 : stillFor + dt;
    wasEager = mode === 'eager';
    if (moved) previous = { ...viewer };
    if (mode !== 'eager' || restarting) eagerJourney = undefined;
    // EAGER starts turning and travelling together once the delay expires.
    // Compare against the last meaningful pose so slow movement accumulates,
    // while sub-centimetre / sub-degree camera jitter does not starve travel.
    const movementTime =
      mode === 'eager' ? Math.min(dt, Math.max(0, stillFor - eagerDelay)) : dt;
    let eagerPose: Stand | undefined;
    if (mode === 'eager') {
      eagerPose = { ...stand };
      if (movementTime > 0) {
        if (!eagerJourney) {
          const desired = eagerHeading(viewer, floor) - stand.heading;
          eagerJourney = {
            start: { ...stand },
            fallback: !sightLineTarget(viewer, floor),
            angularVelocity: 0,
            target: eagerTarget(viewer, floor),
            angle: Math.atan2(Math.sin(desired), Math.cos(desired)),
            elapsed: 0,
          };
        }
        eagerJourney.elapsed += movementTime;
        const { start, target, angle, elapsed } = eagerJourney;
        const distance = Math.hypot(target.x - start.x, target.z - start.z);
        const travel = easedDistance(
          distance,
          CREEP_SPEED,
          EAGER_TRAVEL_RAMP,
          elapsed,
        );
        const share = distance > 1e-9 ? travel / distance : 1;
        eagerPose = {
          x: start.x + (target.x - start.x) * share,
          z: start.z + (target.z - start.z) * share,
          heading:
            start.heading +
            Math.sign(angle) *
              easedDistance(
                Math.abs(angle),
                EAGER_TURN_SPEED,
                EAGER_TURN_RAMP,
                elapsed,
              ),
        };
        if (eagerJourney.fallback) {
          // Keep the face aimed at the viewer throughout a close approach,
          // instead of aiming along the eventual viewing axis while sideways.
          const desired = facing(eagerPose.x, eagerPose.z, viewer.x, viewer.z);
          const error = Math.atan2(
            Math.sin(desired - stand.heading),
            Math.cos(desired - stand.heading),
          );
          const acceleration = EAGER_TURN_SPEED / EAGER_TURN_RAMP;
          const rate = Math.max(
            -EAGER_TURN_SPEED,
            Math.min(EAGER_TURN_SPEED, error * 4),
          );
          const previousRate = eagerJourney.angularVelocity;
          eagerJourney.angularVelocity += Math.max(
            -acceleration * movementTime,
            Math.min(acceleration * movementTime, rate - previousRate),
          );
          const step =
            ((previousRate + eagerJourney.angularVelocity) * movementTime) / 2;
          if (Math.abs(step) >= Math.abs(error) && step * error >= 0) {
            eagerPose.heading = desired;
            eagerJourney.angularVelocity = 0;
          } else eagerPose.heading = stand.heading + step;
        }
      }
    }
    const next = stepStand(
      stand,
      mode,
      viewer,
      floor,
      home,
      movementTime,
      escape,
      eagerPose,
      orbit,
    );
    return {
      ...next,
      speed: dt > 0 ? Math.hypot(next.x - stand.x, next.z - stand.z) / dt : 0,
    };
  };
  return Object.assign(move, {
    escape: () => (escape ? { ...escape, target: { ...escape.target } } : null),
  });
}

/**
 * Dev9's world model: the mode knob, the button and the lamp that shows
 * it was pressed.
 */
export function createWanderingButton(random: () => number = Math.random) {
  const g = createGraph();
  const mode = g.input<number>('pedestal.mode', 0, { where: 'mode knob' });
  const pressedFor = g.state('pedestal.pressedFor', 0);
  const sparksFor = g.state('pedestal.sparksFor', 0);
  const dormant = g.state('pedestal.dormant', false);
  const heartbeat = g.state('pedestal.heartbeat', { mode: 0, seconds: 0 });
  const buttonLight = g.output(
    'pedestal.buttonLight',
    [mode, heartbeat],
    (m, beat) => {
      if (m === 0) return false;
      const bpm = [0, 60, 90, 120][m] ?? 0;
      if (!bpm) return false;
      const phase = (((beat.mode === m ? beat.seconds : 0) * bpm) / 60) % 1;
      return phase < 0.1 || (phase >= 0.2 && phase < 0.3);
    },
    { where: 'red button lamp' },
  );
  g.process('pedestal.heartbeat', [mode], [heartbeat, dormant], (dt) => {
    const m = mode.peek();
    const before = heartbeat.peek();
    heartbeat.set({
      mode: m,
      seconds: before.mode === m ? before.seconds + dt : 0,
    });
    if (m !== 0) dormant.set(false);
  });
  const sparks = g.output(
    'pedestal.sparks',
    [sparksFor],
    (t) => t / SPARK_SECONDS,
    {
      where: 'button sparks',
    },
  );
  const indicator = g.output('pedestal.indicator', [pressedFor], (t) => t > 0, {
    where: 'PRESSED lamp',
  });
  const moodOf = g.output(
    'pedestal.mood',
    [mode],
    (m): PedestalMode => PEDESTAL_MODES[m] ?? 'normal',
    { where: 'the stand' },
  );
  g.process('pedestal.lamp', [], [pressedFor, sparksFor], (dt) => {
    pressedFor.set(Math.max(0, pressedFor.peek() - dt));
    sparksFor.set(Math.max(0, sparksFor.peek() - dt));
  });
  const press = g.action(
    'pedestal.press',
    [mode],
    [pressedFor, sparksFor, mode, dormant],
    () => {
      pressedFor.set(PRESSED_SECONDS);
      if (PEDESTAL_MODES[mode.peek()] === 'terrified') {
        sparksFor.set(SPARK_SECONDS);
        mode.set(0);
        dormant.set(true);
      }
    },
  );
  const motion = createStandMotion(random);
  const move = (
    stand: Stand,
    viewer: Viewer,
    floor: Floor,
    home: { x: number; z: number },
    dt: number,
  ) => {
    if (mode.peek() !== 0) dormant.set(false);
    return motion(
      stand,
      moodOf.peek(),
      viewer,
      floor,
      dormant.peek() ? stand : home,
      dt,
    );
  };
  return {
    g,
    mode,
    mood: moodOf,
    indicator,
    sparks,
    move,
    dormant,
    buttonLight,
    press,
    tick: (dt: number) => g.tick(dt),
  };
}

/** How long the PRESSED lamp stays lit after a press. */
export const PRESSED_SECONDS = 3;
