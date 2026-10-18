import { BoxGeometry, Group, Mesh } from 'three';
import { createMicroLabel, kitPaint } from '../scene/eighties-controls';
import type { PanelKit } from '../scene/eighties-controls';
import { createArchitecturalServices } from '../game/warehouse-services';
import { ARCHITECTURAL_FITTINGS } from '../game/architectural-fittings';
import { architecturalPart } from './architectural-parts';
import { createPartSet } from './parts';
import type { TestFitting } from './test-boards';

/** Dev0's true-size board and sockets, shared with the full architectural gallery. */
export function createArchitecturalElectricalGallery(
  kit: PanelKit,
): TestFitting {
  const group = new Group(),
    parts = createPartSet(),
    services = createArchitecturalServices();
  group.name = 'Architectural electrical fittings';
  const back = new Mesh(
    new BoxGeometry(2.8, 1.5, 0.045),
    kitPaint(kit, '#cbd0c6'),
  );
  group.add(back);
  const title = createMicroLabel(kit, 'ARCHITECTURAL FITTINGS', {
    height: 0.045,
    ink: '#233638',
    maxWidth: 2.6,
  });
  title.position.set(0, 0.62, 0.025);
  group.add(title);
  for (const [kind, x, y] of [
    ['distribution', -0.75, 0.08],
    ['socket', 0.4, 0.12],
    ['switch', 1, 0.12],
  ] as const) {
    const part = parts.add(
      architecturalPart(kit, kind, services, { testers: kind === 'socket' }),
    );
    part.object.position.set(x, y, 0.024);
    group.add(part.object);
    const spec = ARCHITECTURAL_FITTINGS[kind];
    const label = createMicroLabel(kit, `${spec.title}\n${spec.reference}`, {
      height: 0.016,
      ink: '#253b3f',
      maxWidth: kind === 'distribution' ? 1 : 0.65,
    });
    label.position.set(x, -0.36, 0.025);
    group.add(label);
  }
  return {
    group,
    parts,
    update(_seconds, dt) {
      services.model.tick(dt);
      parts.update(dt);
    },
    dispose: () => parts.dispose(),
  };
}
