import { signal } from '@preact/signals-core';
import { createBuildingServices } from './building-services';

/** Physical pendant-head locations; room-wide service wiring is deliberately deferred. */
export const WAREHOUSE_HEADS = Array.from({ length: 10 }, (_, z) =>
  Array.from({ length: 10 }, (_, x) => ({
    x: -13.5 + x * 3,
    z: -13.5 + z * 3,
  })),
).flat();
export function createArchitecturalServices() {
  const model = createBuildingServices();
  const callPoints = [signal(false), signal(false)];
  let serial = 0;
  return {
    model,
    callPoints,
    testDrain: model.g.input('architectural.testDrain', false),
    id: () => `architectural.${serial++}`,
    press(index: number) {
      callPoints[index].value = true;
      model.fire.pressCallPoint();
    },
    reset(index: number) {
      callPoints[index].value = false;
      if (!callPoints.some((p) => p.value)) model.fire.resetCallPoint();
    },
  };
}
export type ArchitecturalServices = ReturnType<
  typeof createArchitecturalServices
>;
