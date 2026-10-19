/**
 * Level 0's sky, as the skylights show it and the daylight it lets in: a
 * starting condition (overcast, sunny or night), drawn as the game starts,
 * and HELL, which the dimensional shift brings in as the machine nears a
 * breakdown (`strangeness().hell`), mixing the sky towards it, and which
 * goes at once when the machine breaks down. Pure: colours are hex strings,
 * mixed here; the room applies them to its lights and glazing.
 */

export type Weather = 'overcast' | 'sunny' | 'night';
export const WEATHERS: readonly Weather[] = ['overcast', 'sunny', 'night'];

export interface SkyLook {
  /** The sky behind the clouds, seen through the skylights. */
  glazing: string;
  /** The clouds' colour, lit as they are. */
  clouds: string;
  /** How fast the clouds drift and churn: 1 a breeze. */
  drift: number;
  /** What shows through an open door: the clear colour. */
  background: string;
  /** The hemisphere light's sky and ground colours. */
  sky: string;
  ground: string;
  /** The sun (or moon): its colour. */
  sun: string;
  /** How much daylight comes in, 0 to 1 (Level 0's overcast day is 0.2). */
  daylight: number;
}

export const SKIES: Record<Weather | 'hell', SkyLook> = {
  // A dark English day: the room lit mostly by its own battens.
  overcast: {
    glazing: '#b9c4c9',
    clouds: '#e4e9ec',
    drift: 1,
    background: '#cbd3d6',
    sky: '#e1e9ec',
    ground: '#6f7067',
    sun: '#edf3f5',
    daylight: 0.2,
  },
  sunny: {
    glazing: '#78ade4',
    clouds: '#ffffff',
    drift: 0.7,
    background: '#bcdcf5',
    sky: '#d6e9ff',
    ground: '#7d725f',
    sun: '#fff0d2',
    daylight: 0.6,
  },
  // Moonlight through the skylights, faint and blue: the battens do it all.
  night: {
    glazing: '#060b15',
    clouds: '#1c2638',
    drift: 0.5,
    background: '#05080d',
    sky: '#22324f',
    ground: '#0a0a0c',
    sun: '#8fa6d8',
    daylight: 0.035,
  },
  // Hell (the owner's hell is purple): a deep violet sky behind roiling
  // violet and magenta clouds, and a lurid purple cast over everything.
  hell: {
    glazing: '#14031f',
    clouds: '#c04dff',
    drift: 5,
    background: '#1c0530',
    sky: '#a24dff',
    ground: '#2a0838',
    sun: '#cc5cff',
    daylight: 0.5,
  },
};

/** A starting condition: the one asked for, if any, else one at random. */
export function pickWeather(
  asked: string | null,
  random: () => number = Math.random,
): Weather {
  if (asked && (WEATHERS as readonly string[]).includes(asked))
    return asked as Weather;
  return WEATHERS[Math.floor(random() * WEATHERS.length) % WEATHERS.length];
}

const channels = (hex: string) => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];
/** `a` mixed towards `b` by `k`, 0 to 1. */
export function mixColour(a: string, b: string, k: number) {
  const [x, y] = [channels(a), channels(b)];
  return `#${x
    .map((v, i) =>
      Math.round(v + (y[i] - v) * k)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

/** The sky now: `weather`, turned towards hell by `hell`, 0 to 1. */
export function skyLook(weather: Weather, hell: number): SkyLook {
  const k = Math.max(0, Math.min(1, hell));
  const from = SKIES[weather];
  const to = SKIES.hell;
  return {
    glazing: mixColour(from.glazing, to.glazing, k),
    clouds: mixColour(from.clouds, to.clouds, k),
    drift: from.drift + (to.drift - from.drift) * k,
    background: mixColour(from.background, to.background, k),
    sky: mixColour(from.sky, to.sky, k),
    ground: mixColour(from.ground, to.ground, k),
    sun: mixColour(from.sun, to.sun, k),
    daylight: from.daylight + (to.daylight - from.daylight) * k,
  };
}
