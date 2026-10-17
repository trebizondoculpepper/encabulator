import { signal } from '@preact/signals-core';
import type { PartEvent, PartListener } from './world/components';

/** A component stays electrically removed after being carried or dropped. */
export function createPortableBoard() {
  const phase = signal<'installed' | 'held' | 'falling' | 'settled'>(
    'installed',
  );
  const impactSpeed = signal(0);
  const slipSpeed = signal(0);
  const impacts = signal(0);
  const listeners = new Set<PartListener>();
  const emit = (event: PartEvent) => {
    for (const listener of listeners) listener(event, null);
  };
  return {
    phase,
    impactSpeed,
    slipSpeed,
    impacts,
    pickUp() {
      phase.value = 'held';
      emit('pick-up');
    },
    drop() {
      if (phase.value === 'held') {
        impacts.value = 0;
        phase.value = 'falling';
        emit('drop');
      }
    },
    impact(normalSpeed = 5, slidingSpeed = 0) {
      if (phase.value !== 'falling') return;
      impactSpeed.value = normalSpeed;
      slipSpeed.value = slidingSpeed;
      impacts.value++;
      emit('impact');
    },
    settle() {
      if (phase.value === 'falling') phase.value = 'settled';
    },
    onEvent(listener: PartListener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispose() {
      listeners.clear();
    },
  };
}

/** Metres and seconds. Small fixed steps keep impact/skitter stable at low frame rates. */
export function createBoardFall(
  x: number,
  y: number,
  z: number,
  vx: number,
  vz: number,
) {
  const body = { x, y, z, vx, vy: 0, vz, settled: false, impacts: 0 };
  return {
    body,
    step(
      dt: number,
      floor: (x: number, z: number) => number,
      impact: (normalSpeed: number, slidingSpeed: number) => void,
    ) {
      let left = Math.min(0.2, dt);
      while (left > 0 && !body.settled) {
        const h = Math.min(left, 1 / 120);
        left -= h;
        body.vy -= 9.81 * h;
        body.x += body.vx * h;
        body.z += body.vz * h;
        body.y += body.vy * h;
        const ground = floor(body.x, body.z);
        if (body.y <= ground) {
          body.y = ground;
          if (body.vy < -0.35) {
            body.impacts++;
            impact(-body.vy, Math.hypot(body.vx, body.vz));
          }
          body.vy = body.impacts < 3 && body.vy < -0.7 ? -body.vy * 0.16 : 0;
          const friction = Math.exp(-h * 22);
          body.vx *= friction;
          body.vz *= friction;
          if (body.vy === 0 && Math.hypot(body.vx, body.vz) < 0.035) {
            body.vx = 0;
            body.vz = 0;
            body.settled = true;
          }
        }
      }
    },
  };
}
