import { click } from './part-audio';

/** A single contact: the fall simulation supplies its actual approach speed. */
export function boardImpact(speed: number, contact: number) {
  const strength = Math.min(1, Math.max(0, speed) / 5.5);
  return click({
    // Small contacts favour the light edge/connector tick over a heavy thump.
    band: contact === 1 ? 2100 : 2800,
    q: 0.9,
    decay: 0.025 + strength * 0.055,
    level: 0.42 * strength ** 1.25,
    thump: [contact === 1 ? 160 : 300, 0.02 + strength * 0.04],
  });
}

/** Brief, quiet friction under the first contact, rather than extra fake knocks. */
export function boardScrape(speed: number) {
  return click({
    band: 1100,
    q: 0.6,
    sweep: 0.035,
    decay: 0.14,
    level: 0.025 * Math.min(1, Math.max(0, speed) / 0.8),
  });
}
