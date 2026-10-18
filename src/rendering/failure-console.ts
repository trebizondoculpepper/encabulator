import { BoxGeometry, Group, Mesh } from 'three';
import { FAILURES } from '../game/machine-failure';
import type { FailureId } from '../game/machine-failure';
import type { OperatorColour } from '../toolkit/components/industrial-control/views/industrial-controls';
import { createNameplate } from '../toolkit/components/industrial-control/views/industrial-controls';
import type { PanelKit } from '../toolkit/components/core/views/eighties-controls';
import {
  createMicroLabel,
  kitPaint,
} from '../toolkit/components/core/views/eighties-controls';
import {
  createPartSet,
  pushButton,
} from '../toolkit/components/core/parts/parts';

/** What the console works: the line-up's failures. */
interface Failing {
  fail(id: FailureId): void;
  restart(): void;
  recover(): void;
}

const COLOURS: Record<FailureId, OperatorColour> = {
  hiccup: 'amber',
  sputter: 'amber',
  restart: 'green',
  kaput: 'red',
};

/**
 * The failure simulator: a steel lectern in front of the Retro Encabulator
 * (dev6) with a sloping panel of push buttons, one for each way the
 * machine gives up (`src/game/machine-failure.ts`): HICCUP, SPUTTER,
 * RESTART and KAPUT, and a black RESET that puts it back as it was. It is
 * for trying the failures out, as Level 2 will use them. Front faces +z;
 * metres; its origin on the floor under the middle of its panel.
 */
export function createFailureConsole(kit: PanelKit, machine: Failing) {
  const group = new Group();
  group.name = 'Failure simulator';
  const parts = createPartSet();
  const steel = kitPaint(kit, '#3a3f44', 0.35);
  const face = kitPaint(kit, '#c9c6bb', 0.1);
  const box = (
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
  ) => {
    const mesh = new Mesh(new BoxGeometry(w, h, d), steel);
    mesh.position.set(x, y, z);
    group.add(mesh);
    return mesh;
  };
  box(0.5, 0.04, 0.4, 0, 0.02, 0);
  box(0.12, 0.9, 0.12, 0, 0.47, -0.04);
  // The sloping panel, its face towards whoever stands in front.
  const panel = new Group();
  panel.position.set(0, 1.0, 0);
  panel.rotation.x = -0.6;
  group.add(panel);
  const back = new Mesh(new BoxGeometry(0.56, 0.3, 0.05), steel);
  back.position.z = -0.026;
  panel.add(back);
  const plate = new Mesh(new BoxGeometry(0.54, 0.28, 0.002), face);
  plate.position.z = 0.0;
  panel.add(plate);
  const title = createNameplate(kit, 'FAILURE SIMULATOR', {
    width: 0.24,
    height: 0.032,
  });
  title.position.set(0, 0.1, 0.001);
  panel.add(title);
  const note = createMicroLabel(kit, 'FOR TRAINING USE ONLY', {
    height: 0.005,
    ink: '#3a3a36',
  });
  note.position.set(0, 0.07, 0.0015);
  panel.add(note);
  const buttons: {
    legend: string;
    colour: OperatorColour;
    action: () => void;
  }[] = [
    ...FAILURES.map((f) => ({
      legend: f.legend,
      colour: COLOURS[f.id],
      action: () =>
        f.id === 'restart' ? machine.restart() : machine.fail(f.id),
    })),
    { legend: 'RESET', colour: 'black' as const, action: machine.recover },
  ];
  buttons.forEach(({ legend, colour, action }, i) => {
    const button = parts.add(
      pushButton(kit, { colour, legend, name: `FAILURE ${legend}`, action }),
    );
    button.object.position.set(
      (i - (buttons.length - 1) / 2) * 0.095,
      -0.04,
      0.001,
    );
    panel.add(button.object);
  });
  return { group, parts };
}

/** Half the console's footprint, metres, for walking into it. */
export const FAILURE_CONSOLE_HALF = { x: 0.3, z: 0.25 };
