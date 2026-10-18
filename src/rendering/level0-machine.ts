import { createRetroEncabulatorMcc } from '../scene/retro-encabulator-mcc';
import type { PanelKit } from '../toolkit/components/core/views/eighties-controls';

/** Ordinary component wiring, ready for the sandbox's own wiring changes. */
export function createLevel0Machine(kit: PanelKit) {
  const mcc = createRetroEncabulatorMcc(kit, {
    incomingOn: false,
    driveTrainWithMains: true,
  });
  const breaker = (id: string) =>
    mcc.components.find((device) => device.object.name === `${id}: breaker`)!
      .breaker!;
  // Match Level 2's initial switch positions without its scenario feed gates.
  breaker('section3.bucket1').position.set('off');
  breaker('section7.bucket2').position.set('off');
  return { mcc, automation: breaker('section5.bucket1') };
}
