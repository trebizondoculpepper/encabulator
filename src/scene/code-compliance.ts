import { Color, Group } from 'three';
import type { Footprint } from '../toolkit/controls/logic/walk-collision';
import { createBuildKit } from './build-kit';

/**
 * What a 1990s American plant needed to be up to code (see
 * doc/research/plant-code-1990s.md), as set pieces. Each factory returns a
 * group built in metres, standing on y = 0 (or hung on a wall at the
 * height it would be), facing +z, with any solid footprint in its own
 * frame. They share one build kit, freed by `dispose`.
 */
export function createCompliance() {
  const kit = createBuildKit();
  const red = kit.paint('#c0261b', 0.45, 0.2);
  const black = kit.paint('#1d1d1e', 0.6);
  const steel = kit.paint('#b9bec0', 0.3, 0.85);
  const yellow = kit.paint('#e1a915', 0.5, 0.2);
  const grey = kit.paint('#8f9493', 0.5, 0.4);

  return {
    /**
     * A 10 lb ABC dry chemical extinguisher on its wall bracket, its top
     * at 1.5 m (under the 5 ft maximum), with the red sign above it so it
     * can be seen down an aisle. OSHA 1910.157: one within 75 ft.
     */
    extinguisher() {
      const g = new Group();
      kit.box(g, black, 0.1, 0.12, 0.06, 0, 1.05, 0.03);
      kit.cyl(g, red, 0.065, 0.42, 0, 1.15, 0.1);
      kit.cyl(g, red, 0.04, 0.05, 0, 1.38, 0.1, 0.065);
      kit.box(g, black, 0.1, 0.05, 0.04, 0.02, 1.43, 0.1);
      kit.box(g, kit.paint('#2b2b2b', 0.5), 0.02, 0.3, 0.02, 0.07, 1.2, 0.13);
      kit.cyl(g, kit.paint('#e9e6dc', 0.4), 0.02, 0.01, -0.02, 1.32, 0.17);
      const sign = kit.sign(
        'FIRE\nEXTINGUISHER',
        0.3,
        0.3,
        '#ffffff',
        '#c0261b',
      );
      sign.position.set(0, 2.1, 0.01);
      g.add(sign);
      return g;
    },
    /** A lit EXIT sign, red letters on white, for over an exit door. */
    exitSign() {
      const g = new Group();
      kit.box(g, kit.paint('#e9e6dc', 0.4), 0.34, 0.2, 0.06, 0, 0, 0.03);
      const lit = kit.paint('#2a0c0a', 0.5, 0, {
        emissive: new Color('#ff2a1a'),
        emissiveIntensity: 2.2,
      });
      kit.box(g, lit, 0.26, 0.09, 0.065, 0, 0, 0.03);
      return g;
    },
    /** A twin-head emergency light pack: a box with two lamp heads, on a wall. */
    emergencyLight() {
      const g = new Group();
      kit.box(g, kit.paint('#e9e6dc', 0.4), 0.32, 0.18, 0.1, 0, 0, 0.05);
      for (const sx of [-1, 1]) {
        const head = kit.cyl(
          g,
          kit.paint('#e9e6dc', 0.4),
          0.045,
          0.08,
          sx * 0.13,
          -0.11,
          0.08,
          0.035,
        );
        head.rotation.x = 0.6;
      }
      kit.box(
        g,
        kit.glow(new Color(0.2, 1.6, 0.3)),
        0.02,
        0.02,
        0.01,
        0.1,
        0.03,
        0.105,
      );
      return g;
    },
    /** A red manual fire alarm pull station, at 1.2 m. */
    pullStation() {
      const g = new Group();
      kit.box(g, red, 0.13, 0.18, 0.05, 0, 1.2, 0.025);
      kit.box(g, kit.paint('#f2efe6', 0.4), 0.08, 0.04, 0.02, 0, 1.2, 0.055);
      const label = kit.sign('FIRE', 0.1, 0.035, '#ffffff', '#c0261b');
      label.position.set(0, 1.27, 0.052);
      g.add(label);
      return g;
    },
    /** A wall horn-strobe: a red horn box with a clear strobe lens. */
    hornStrobe() {
      const g = new Group();
      kit.box(g, red, 0.13, 0.15, 0.07, 0, 0, 0.035);
      kit.box(
        g,
        kit.glow(new Color(1.6, 1.6, 1.6)),
        0.06,
        0.03,
        0.02,
        0,
        0.045,
        0.075,
      );
      for (let k = 0; k < 4; k++)
        kit.box(g, black, 0.08, 0.008, 0.005, 0, -0.03 + k * 0.016, 0.072);
      return g;
    },
    /**
     * A forklift battery charging station (OSHA 1910.178(g)): three wall
     * chargers on their stands with cables, a yellow curbed bay, a plumbed
     * eyewash, a spill kit, a neutraliser drum, the charger guard rail and
     * the NO SMOKING sign. About 6 by 3 m.
     */
    batteryStation() {
      const g = new Group();
      for (let i = 0; i < 3; i++) {
        const x = -1.8 + i * 1.8;
        kit.box(g, grey, 0.6, 0.9, 0.4, x, 1.3, 0.25);
        kit.box(
          g,
          kit.glow(new Color(0.2, 1.4, 0.3)),
          0.06,
          0.03,
          0.01,
          x - 0.15,
          1.6,
          0.455,
        );
        kit.box(g, black, 0.2, 0.15, 0.01, x + 0.1, 1.5, 0.455);
        kit.box(g, steel, 0.5, 0.05, 0.4, x, 0.84, 0.25);
        for (const sx of [-1, 1])
          kit.box(g, steel, 0.04, 0.84, 0.04, x + sx * 0.22, 0.42, 0.4);
        const cable = kit.cyl(g, black, 0.015, 1.1, x + 0.2, 0.55, 0.55);
        cable.rotation.x = 0.4;
        kit.box(
          g,
          kit.paint('#c0261b', 0.5),
          0.12,
          0.08,
          0.08,
          x + 0.2,
          0.08,
          0.8,
        );
      }
      // The guard rail in front of the chargers, and the curb round the bay.
      for (const x of [-2.6, 0, 2.6])
        kit.cyl(g, yellow, 0.06, 0.9, x, 0.45, 1.0);
      kit.box(g, yellow, 5.4, 0.08, 0.08, 0, 0.85, 1.0);
      kit.box(g, yellow, 6.2, 0.1, 0.12, 0, 0.05, 3.0);
      for (const sx of [-1, 1])
        kit.box(g, yellow, 0.12, 0.1, 3, sx * 3.1, 0.05, 1.5);
      // The eyewash on the wall at the end, the spill kit and neutraliser.
      kit.box(
        g,
        kit.paint('#2f8a4a', 0.5, 0.4),
        0.05,
        1.0,
        0.05,
        2.9,
        0.5,
        0.1,
      );
      kit.cyl(g, yellow, 0.07, 0.12, 2.9, 1.02, 0.25, 0.14);
      kit.cyl(g, yellow, 0.25, 0.7, 2.5, 0.35, 2.4);
      kit.cyl(g, kit.paint('#2b6fb3', 0.5), 0.28, 0.85, -2.6, 0.425, 2.4);
      const sign = kit.sign(
        'BATTERY CHARGING\nNO SMOKING · NO OPEN FLAMES',
        1.6,
        0.5,
        '#ffffff',
        '#c0261b',
      );
      sign.position.set(0, 2.4, 0.01);
      g.add(sign);
      const eye = kit.sign('EYEWASH', 0.4, 0.15, '#ffffff', '#1f7a3a', 'cross');
      eye.position.set(2.9, 1.6, 0.01);
      g.add(eye);
      return {
        group: g,
        solids: [{ minX: -3.2, maxX: 3.2, minZ: 0, maxZ: 1.1 }] as Footprint[],
      };
    },
    /** A yellow flammable liquids safety cabinet, 45 gallon, doors shut. */
    flammablesCabinet() {
      const g = new Group();
      kit.box(g, yellow, 1.09, 1.65, 0.46, 0, 0.825, 0.23);
      kit.box(g, black, 0.005, 1.5, 0.01, 0, 0.84, 0.465);
      for (const sx of [-1, 1])
        kit.box(g, steel, 0.03, 0.15, 0.04, sx * 0.06, 0.95, 0.48);
      const sign = kit.sign(
        'FLAMMABLE\nKEEP FIRE AWAY',
        0.7,
        0.3,
        '#c0261b',
        '#e1a915',
      );
      sign.position.set(0, 1.35, 0.467);
      g.add(sign);
      return {
        group: g,
        solids: [{ minX: -0.6, maxX: 0.6, minZ: 0, maxZ: 0.5 }] as Footprint[],
      };
    },
    /** A Material Safety Data Sheet station: a yellow box of binders on a post. */
    msdsStation() {
      const g = new Group();
      kit.cyl(g, yellow, 0.04, 1.3, 0, 0.65, 0);
      kit.box(g, yellow, 0.6, 0.45, 0.25, 0, 1.45, 0.05);
      ['#c0261b', '#2b6fb3', '#2f8a4a', '#1d1d1e'].forEach((c, i) =>
        kit.box(
          g,
          kit.paint(c, 0.6),
          0.1,
          0.32,
          0.22,
          -0.18 + i * 0.12,
          1.43,
          0.07,
        ),
      );
      const sign = kit.sign(
        'MSDS\nMATERIAL SAFETY DATA SHEETS',
        0.6,
        0.2,
        '#1b1b1b',
        '#e1a915',
      );
      sign.position.set(0, 1.8, 0.05);
      g.add(sign);
      return {
        group: g,
        solids: [
          { minX: -0.35, maxX: 0.35, minZ: -0.1, maxZ: 0.25 },
        ] as Footprint[],
      };
    },
    /**
     * A steel stair up to `height`: switchback flights of 7 in risers and
     * 11 in treads, 1.1 m wide, with landings, yellow nosings, and
     * handrails, guardrails and midrails to OSHA 1910.23. It climbs along
     * +x; its foot at the origin, its flights side by side in z.
     */
    stair(height: number) {
      const g = new Group();
      const riser = 0.178;
      const tread = 0.28;
      const width = 1.1;
      const perFlight = 12;
      const flights = Math.ceil(height / (riser * perFlight));
      const run = perFlight * tread;
      const frame = kit.paint('#4d5256', 0.5, 0.6);
      const rail = kit.paint('#e1a915', 0.5, 0.3);
      let y = 0;
      for (let f = 0; f < flights; f++) {
        const steps = Math.min(perFlight, Math.round((height - y) / riser));
        const dir = f % 2 === 0 ? 1 : -1;
        const z = f % 2 === 0 ? width / 2 : width * 1.5 + 0.1;
        const x0 = dir > 0 ? 0 : run;
        for (let s = 0; s < steps; s++) {
          const x = x0 + dir * (s + 0.5) * tread;
          kit.box(g, frame, tread, 0.04, width, x, y + (s + 1) * riser, z);
          kit.box(
            g,
            rail,
            0.04,
            0.042,
            width,
            x + dir * (tread / 2 - 0.02),
            y + (s + 1) * riser,
            z,
          );
        }
        // The stringers, sloping, and the rails along the outside edge.
        const slope = Math.hypot(steps * tread, steps * riser);
        const angle = Math.atan2(steps * riser, steps * tread) * dir;
        for (const side of [z - width / 2, z + width / 2]) {
          const stringer = kit.box(
            g,
            frame,
            slope,
            0.2,
            0.03,
            x0 + (dir * steps * tread) / 2,
            y + (steps * riser) / 2,
            side,
          );
          stringer.rotation.z = angle;
        }
        for (const [hy, size] of [
          [1.0, 0.05],
          [0.53, 0.03],
        ] as const) {
          const outer = kit.box(
            g,
            rail,
            slope,
            size,
            size,
            x0 + (dir * steps * tread) / 2,
            y + (steps * riser) / 2 + hy,
            f % 2 === 0 ? z - width / 2 : z + width / 2,
          );
          outer.rotation.z = angle;
        }
        y += steps * riser;
        // The landing at the turn.
        const lx = dir > 0 ? run + 0.6 : -0.6;
        kit.box(g, frame, 1.2, 0.06, width * 2 + 0.1, lx, y, width + 0.05);
        for (const [hy, size] of [
          [1.07, 0.05],
          [0.53, 0.03],
        ] as const)
          kit.box(
            g,
            rail,
            size,
            size,
            width * 2 + 0.1,
            lx + (dir > 0 ? 0.6 : -0.6),
            y + hy,
            width + 0.05,
          );
        for (const cz of [0, width * 2 + 0.1])
          kit.box(
            g,
            rail,
            0.05,
            1.07,
            0.05,
            lx + (dir > 0 ? 0.6 : -0.6),
            y + 0.535,
            cz,
          );
        // A column under the landing.
        kit.box(
          g,
          frame,
          0.15,
          y,
          0.15,
          lx + (dir > 0 ? 0.5 : -0.5),
          y / 2,
          width + 0.05,
        );
      }
      return {
        group: g,
        solids: [
          { minX: -0.8, maxX: run + 1.3, minZ: -0.1, maxZ: width * 2 + 0.2 },
        ] as Footprint[],
      };
    },
    /** The safety notice board: OSHA's poster and the rest, behind glass. */
    noticeBoard() {
      const g = new Group();
      kit.box(g, kit.paint('#5a4632', 0.7), 1.4, 0.95, 0.04, 0, 1.6, 0.02);
      kit.box(g, kit.paint('#b08a5a', 0.9), 1.3, 0.85, 0.01, 0, 1.6, 0.045);
      const posters: [string, string, string][] = [
        ['JOB SAFETY AND HEALTH\nIT’S THE LAW', '#1b1b1b', '#f2efe6'],
        ['EQUAL EMPLOYMENT\nOPPORTUNITY', '#1b1b1b', '#e8e2cc'],
        ['MINIMUM WAGE', '#1b1b1b', '#f5e9a8'],
        ['EMERGENCY\nEVACUATION PLAN', '#ffffff', '#1f7a3a'],
      ];
      posters.forEach(([text, ink, plate], i) => {
        const s = kit.sign(text, 0.28, 0.36, ink, plate);
        s.position.set(-0.47 + i * 0.31, 1.6, 0.052);
        g.add(s);
      });
      const title = kit.sign('SAFETY NOTICES', 0.8, 0.12, '#ffffff', '#22324f');
      title.position.set(0, 2.15, 0.03);
      g.add(title);
      return g;
    },
    /**
     * The break room: a partitioned room like the office, 10 by 7 m, with
     * a window band at the front, an open door, folding tables and stacking
     * chairs, a soda machine and a snack machine glowing, a counter with a
     * sink, a microwave and a coffee maker, a refrigerator, a row of
     * lockers and benches for change (1910.141(e)), and a clock.
     */
    breakRoom() {
      const g = new Group();
      const solids: Footprint[] = [];
      const w = 10;
      const d = 7;
      const h = 3.05;
      const t = 0.12;
      const drywall = kit.paint('#e3dfd4', 0.85);
      const cove = kit.paint('#3b3a38', 0.6);
      const bronze = kit.paint('#3a3127', 0.45, 0.5);
      const glass = kit.paint('#a9bcc2', 0.05, 0.3, {
        transparent: true,
        opacity: 0.16,
      });
      const wall = (alongX: boolean, at: number, from: number, to: number) => {
        const len = to - from;
        const mid = (from + to) / 2;
        if (alongX) {
          kit.box(g, drywall, len, h, t, mid, h / 2, at);
          kit.box(g, cove, len, 0.1, t + 0.012, mid, 0.05, at);
          solids.push({
            minX: from - t,
            maxX: to + t,
            minZ: at - t,
            maxZ: at + t,
          });
        } else {
          kit.box(g, drywall, t, h, len, at, h / 2, mid);
          kit.box(g, cove, t + 0.012, 0.1, len, at, 0.05, mid);
          solids.push({
            minX: at - t,
            maxX: at + t,
            minZ: from - t,
            maxZ: to + t,
          });
        }
      };
      wall(true, -d / 2, -w / 2, w / 2);
      wall(false, -w / 2, -d / 2, d / 2);
      wall(false, w / 2, -d / 2, d / 2);
      // The front: a window band, and the door near its east end.
      const doorX = w / 2 - 1.5;
      kit.box(
        g,
        drywall,
        doorX - 0.46 + w / 2,
        0.9,
        t,
        (-w / 2 + doorX - 0.46) / 2,
        0.45,
        d / 2,
      );
      kit.box(
        g,
        drywall,
        doorX - 0.46 + w / 2,
        h - 2.2,
        t,
        (-w / 2 + doorX - 0.46) / 2,
        (2.2 + h) / 2,
        d / 2,
      );
      kit.box(
        g,
        glass,
        doorX - 0.46 + w / 2,
        1.3,
        0.01,
        (-w / 2 + doorX - 0.46) / 2,
        1.55,
        d / 2,
      );
      for (let x = -w / 2; x <= doorX - 0.46; x += 1.5)
        kit.box(g, bronze, 0.05, 1.32, 0.1, x, 1.55, d / 2);
      solids.push({
        minX: -w / 2,
        maxX: doorX - 0.46,
        minZ: d / 2 - t,
        maxZ: d / 2 + t,
      });
      kit.box(
        g,
        drywall,
        w / 2 - doorX - 0.46,
        h,
        t,
        (doorX + 0.46 + w / 2) / 2,
        h / 2,
        d / 2,
      );
      solids.push({
        minX: doorX + 0.46,
        maxX: w / 2,
        minZ: d / 2 - t,
        maxZ: d / 2 + t,
      });
      kit.box(g, drywall, 0.92, h - 2.13, t, doorX, (2.13 + h) / 2, d / 2);
      kit.box(g, drywall, w + 0.02, 0.06, d + 0.02, 0, h + 0.03, 0);
      kit.box(
        g,
        kit.paint('#ece9e0', 0.9),
        w - 0.24,
        0.02,
        d - 0.24,
        0,
        2.7,
        0,
      );
      const troffer = kit.glow(new Color(1.9, 1.95, 1.9));
      for (let x = -3.6; x <= 3.6; x += 2.4)
        for (const z of [-1.5, 1.5])
          kit.box(g, troffer, 0.58, 0.01, 1.2, x, 2.685, z);
      kit.box(
        g,
        kit.paint('#b9b3a3', 0.6),
        w - 0.24,
        0.01,
        d - 0.24,
        0,
        0.005,
        0,
      );
      const sign = kit.sign('BREAK ROOM', 1.2, 0.25, '#f2efe4', '#22324f');
      sign.position.set(doorX, 2.5, d / 2 + t / 2 + 0.01);
      g.add(sign);
      // Tables and stacking chairs.
      const table = kit.paint('#c9c2ae', 0.6);
      const legs = kit.paint('#4d4a45', 0.5, 0.5);
      const chair = kit.paint('#2b6fb3', 0.6);
      for (const [x, z] of [
        [-3, 0.8],
        [0, 0.8],
        [-3, -1],
        [0, -1],
      ]) {
        kit.box(g, table, 1.83, 0.04, 0.76, x, 0.74, z);
        for (const sx of [-1, 1])
          kit.box(g, legs, 0.04, 0.72, 0.6, x + sx * 0.8, 0.36, z);
        for (const sx of [-0.55, 0.55])
          for (const sz of [-1, 1]) {
            kit.box(g, chair, 0.42, 0.04, 0.4, x + sx, 0.45, z + sz * 0.62);
            kit.box(g, chair, 0.42, 0.38, 0.03, x + sx, 0.68, z + sz * 0.82);
            for (const lx of [-0.18, 0.18])
              kit.box(
                g,
                legs,
                0.02,
                0.45,
                0.02,
                x + sx + lx,
                0.225,
                z + sz * 0.62,
              );
          }
      }
      // The vending machines against the west wall, lit.
      const soda = kit.paint('#b21e1e', 0.4);
      kit.box(g, soda, 0.9, 1.83, 0.8, -w / 2 + 0.6, 0.915, -2.2);
      kit.box(
        g,
        kit.glow(new Color(1.4, 1.3, 1.2)),
        0.02,
        1.2,
        0.5,
        -w / 2 + 1.06,
        1.1,
        -2.3,
      );
      const sodaSign = kit.sign(
        'ICE COLD SODA',
        0.7,
        0.18,
        '#ffffff',
        '#b21e1e',
      );
      sodaSign.position.set(-w / 2 + 1.065, 1.65, -2.2);
      sodaSign.rotation.y = Math.PI / 2;
      g.add(sodaSign);
      kit.box(
        g,
        kit.paint('#26292b', 0.5),
        0.9,
        1.83,
        0.8,
        -w / 2 + 0.6,
        0.915,
        -1.2,
      );
      kit.box(
        g,
        kit.glow(new Color(1.1, 1.1, 1.0)),
        0.02,
        1.2,
        0.6,
        -w / 2 + 1.06,
        1.15,
        -1.25,
      );
      for (let r = 0; r < 5; r++)
        kit.box(
          g,
          kit.paint(
            ['#c0261b', '#e1a915', '#2b6fb3', '#2f8a4a', '#8a4fd6'][r],
            0.5,
          ),
          0.03,
          0.12,
          0.5,
          -w / 2 + 1.04,
          0.7 + r * 0.22,
          -1.25,
        );
      // The counter: cabinets, a sink, a microwave, a coffee maker; the fridge.
      kit.box(
        g,
        kit.paint('#a89a7e', 0.6),
        3,
        0.9,
        0.6,
        1.5,
        0.45,
        -d / 2 + 0.36,
      );
      kit.box(
        g,
        kit.paint('#e8e2cc', 0.4),
        3.02,
        0.04,
        0.62,
        1.5,
        0.92,
        -d / 2 + 0.36,
      );
      kit.box(g, steel, 0.5, 0.02, 0.4, 1.0, 0.935, -d / 2 + 0.36);
      kit.box(
        g,
        kit.paint('#e9e6dc', 0.4),
        0.5,
        0.3,
        0.38,
        2.2,
        1.09,
        -d / 2 + 0.33,
      );
      kit.box(g, black, 0.25, 0.35, 0.25, 2.8, 1.12, -d / 2 + 0.3);
      kit.box(
        g,
        kit.paint('#e9e6dc', 0.4),
        0.75,
        1.75,
        0.7,
        3.6,
        0.875,
        -d / 2 + 0.4,
      );
      // Lockers along the east wall, with a bench.
      for (let i = 0; i < 8; i++) {
        const z = -d / 2 + 1.2 + i * 0.32;
        kit.box(
          g,
          kit.paint(i % 2 ? '#7f8a86' : '#8a958f', 0.5, 0.4),
          0.45,
          1.8,
          0.3,
          w / 2 - 0.3,
          0.9,
          z,
        );
        for (let v = 0; v < 3; v++)
          kit.box(
            g,
            black,
            0.005,
            0.02,
            0.18,
            w / 2 - 0.525,
            1.55 + v * 0.05,
            z,
          );
      }
      kit.box(
        g,
        kit.paint('#b08a5a', 0.7),
        0.35,
        0.05,
        2.4,
        w / 2 - 1.0,
        0.45,
        -d / 2 + 2.3,
      );
      return { group: g, solids, size: { w, d } };
    },
    /** A labelled gas cylinder cage: oxygen kept apart from fuel gases. */
    gasCage(kind: 'OXYGEN' | 'FUEL GAS · ACETYLENE · PROPANE') {
      const g = new Group();
      const frame = yellow;
      const mesh = kit.paint('#3f4a3f', 0.6, 0.3, {
        transparent: true,
        opacity: 0.55,
      });
      for (const sx of [-1, 1])
        for (const sz of [-1, 1])
          kit.box(g, frame, 0.06, 1.9, 0.06, sx * 0.9, 0.95, sz * 0.45);
      kit.box(g, mesh, 1.8, 1.8, 0.02, 0, 0.95, 0.45);
      kit.box(g, mesh, 1.8, 1.8, 0.02, 0, 0.95, -0.45);
      kit.box(g, mesh, 0.02, 1.8, 0.9, 0.9, 0.95, 0);
      kit.box(g, mesh, 0.02, 1.8, 0.9, -0.9, 0.95, 0);
      const colours =
        kind === 'OXYGEN'
          ? ['#2c5e2c', '#2c5e2c', '#2c5e2c', '#2c5e2c']
          : ['#7a1f1f', '#3a3a3a', '#d8d8d0', '#7a1f1f'];
      colours.forEach((c, i) => {
        kit.cyl(
          g,
          kit.paint(c, 0.4, 0.4),
          0.115,
          1.45,
          -0.6 + i * 0.4,
          0.73,
          -0.1,
        );
        kit.cyl(g, steel, 0.04, 0.12, -0.6 + i * 0.4, 1.5, -0.1);
      });
      const sign = kit.sign(
        kind,
        1.4,
        0.2,
        '#1b1b1b',
        kind === 'OXYGEN' ? '#e8f2e8' : '#f5e9a8',
      );
      sign.position.set(0, 2.05, 0.46);
      g.add(sign);
      return {
        group: g,
        solids: [
          { minX: -0.95, maxX: 0.95, minZ: -0.5, maxZ: 0.5 },
        ] as Footprint[],
      };
    },
    dispose: kit.dispose,
  };
}
