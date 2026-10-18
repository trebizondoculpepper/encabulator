/**
 * The companies of the world of the VX3 and the Encabulator: who makes
 * what, as their brands would present them. The first ten are named
 * already (in the VX3 Simulator's component catalogue or on the
 * Encabulator's parts); the last six fill the gaps (who builds the line-up,
 * its PLC and its drive, its meters and screens, its oil, and who runs the
 * training). All are our own invention. Each brand's logo is drawn from
 * its `mark` (`src/scene/brand-logo.ts`). Pure data.
 */

export type BrandMark =
  /** Interlocked initials in a ring. */
  | 'monogram'
  /** A lightning bolt through a letter X. */
  | 'bolt'
  /** A mid-century starburst behind the name. */
  | 'starburst'
  /** A rising sun over waves. */
  | 'sun'
  /** Initials on a heraldic shield. */
  | 'shield'
  /** A sine wave in a rounded square. */
  | 'wave'
  /** A star inside a cogwheel. */
  | 'cog'
  /** A chilli pepper. */
  | 'pepper'
  /** A letter in a hexagon. */
  | 'hexagon'
  /** Dots joined in a bus line. */
  | 'bus'
  /** A switch handle in a box. */
  | 'switch'
  /** A Q with a circuit trace for a tail. */
  | 'circuit'
  /** A ring of arrows turning. */
  | 'rotor'
  /** A meter dial and needle. */
  | 'dial'
  /** An oil drop. */
  | 'drop'
  /** A laurel wreath. */
  | 'laurel';

export interface Brand {
  id: string;
  name: string;
  /** How the name is set in the logo, if not as `name`. */
  wordmark?: string;
  tagline: string;
  founded: number;
  country: string;
  /** What it makes, for the brand sheet. */
  makes: string;
  /** Where it is seen in the games, if anywhere yet. */
  seen: string;
  mark: BrandMark;
  /** Main, second and ink colours. */
  colours: readonly [string, string, string];
  /** The wordmark's type: a plain modern sans, a serif, or a script. */
  type: 'sans' | 'serif' | 'script' | 'slab';
}

export const BRANDS: readonly Brand[] = [
  {
    id: 'neumann-dynamik',
    name: 'Neumann Dynamik',
    tagline: 'Präzision in Bewegung',
    founded: 1952,
    country: 'West Germany',
    makes: 'Precision electronics and drive controls',
    seen: 'VX3 components; owner of the Guildford training room',
    mark: 'monogram',
    colours: ['#1f3a68', '#9aa6b2', '#14181d'],
    type: 'sans',
  },
  {
    id: 'volt-xoccula',
    name: 'Volt Xoccula',
    wordmark: 'VOLT XOCCULA',
    tagline: 'The power of X',
    founded: 1961,
    country: 'Switzerland',
    makes: 'High-voltage apparatus; the VX rigs',
    seen: 'Nine VX3 components',
    mark: 'bolt',
    colours: ['#d22f27', '#f4c430', '#111111'],
    type: 'slab',
  },
  {
    id: 'bonk-industries',
    name: 'Bonk Industries',
    wordmark: 'BONK',
    tagline: 'Industrial strength since 1946',
    founded: 1946,
    country: 'United States',
    makes: 'Motors and drives, incl. the Model 77 Encabulator Drive',
    seen: 'Six VX3 components',
    mark: 'starburst',
    colours: ['#e0702a', '#5a3820', '#1c1410'],
    type: 'slab',
  },
  {
    id: 'wonshou-labs',
    name: 'Wonshou Labs',
    tagline: 'Research for tomorrow',
    founded: 1958,
    country: 'Japan',
    makes: 'Laboratory instruments and oscillators',
    seen: 'Four VX3 components',
    mark: 'sun',
    colours: ['#c8102e', '#1d5fa8', '#111111'],
    type: 'sans',
  },
  {
    id: 'trager-feinstein',
    name: 'Trager-Feinstein Laboratory',
    wordmark: 'Trager-Feinstein',
    tagline: 'Instruments of record',
    founded: 1931,
    country: 'Austria',
    makes: 'Measuring instruments and reference standards',
    seen: 'Four VX3 components',
    mark: 'shield',
    colours: ['#1e4d3a', '#c9a227', '#14201a'],
    type: 'serif',
  },
  {
    id: 'synclex',
    name: 'Synclex',
    wordmark: 'synclex',
    tagline: 'Modules that agree',
    founded: 1968,
    country: 'Netherlands',
    makes: 'Modular signal units (TS-8, OD-12, CT-3)',
    seen: 'Six VX3 modules',
    mark: 'wave',
    colours: ['#12898a', '#e8e3d3', '#10292a'],
    type: 'sans',
  },
  {
    id: 'gorskiy',
    name: 'Gorskiy',
    wordmark: 'ГОРСКИЙ',
    tagline: 'Завод точных приборов · Gorskiy Precision Works',
    founded: 1949,
    country: 'Soviet Union',
    makes: 'Transformers, amplifiers and field instruments',
    seen: 'Six VX3 components',
    mark: 'cog',
    colours: ['#b3121b', '#e3c26b', '#1a0f0f'],
    type: 'slab',
  },
  {
    id: 'pepperdyne',
    name: 'Pepperdyne',
    wordmark: 'Pepperdyne',
    tagline: 'Modial interaction for less',
    founded: 1994,
    country: 'Unknown',
    makes: 'Modial-interaction boards, cheaply',
    seen: 'The five cards that fry the Encabulator',
    mark: 'pepper',
    colours: ['#d6281e', '#2e8b3a', '#1a1a1a'],
    type: 'script',
  },
  {
    id: 'voltara',
    name: 'Voltara',
    wordmark: 'VOLTARA',
    tagline: 'Switchgear you can lean on',
    founded: 1979,
    country: 'Ireland',
    makes: 'Isolators and switchgear',
    seen: 'The yellow incoming supply isolator',
    mark: 'hexagon',
    colours: ['#f2c014', '#222222', '#111111'],
    type: 'sans',
  },
  {
    id: 'fankel',
    name: 'Fankel',
    wordmark: 'FANKEL',
    tagline: 'Every bus, on time',
    founded: 1983,
    country: 'Germany',
    makes: 'Fieldbus interfaces and network cards',
    seen: 'The Fankel bus interface board',
    mark: 'bus',
    colours: ['#2a62b8', '#9cc3f0', '#0f1d33'],
    type: 'sans',
  },
  {
    id: 'hartwell-bligh',
    name: 'Hartwell & Bligh Controls',
    wordmark: 'HARTWELL & BLIGH',
    tagline: 'Motor control, centred',
    founded: 1957,
    country: 'United States',
    makes: 'Motor control centres and starters',
    seen: 'New: builds the Encabulator’s line-up',
    mark: 'switch',
    colours: ['#7fa7c9', '#2b3a48', '#141b22'],
    type: 'slab',
  },
  {
    id: 'quorvane',
    name: 'Quorvane Automation',
    wordmark: 'QUORVANE',
    tagline: 'Logic that keeps its word',
    founded: 1971,
    country: 'United States',
    makes: 'Programmable controllers and I/O',
    seen: 'New: the PLC in Automation Control',
    mark: 'circuit',
    colours: ['#8a1c2b', '#d9b7a0', '#1d0d10'],
    type: 'sans',
  },
  {
    id: 'torvald',
    name: 'Torvald Drive Systems',
    wordmark: 'TORVALD',
    tagline: 'Turning, reliably',
    founded: 1975,
    country: 'Sweden',
    makes: 'Variable-frequency drives',
    seen: 'New: the main Encabulator drive, VFD-601',
    mark: 'rotor',
    colours: ['#2f7d4f', '#d7e8dc', '#0f2418'],
    type: 'sans',
  },
  {
    id: 'kessler-moody',
    name: 'Kessler-Moody Instruments',
    wordmark: 'Kessler-Moody',
    tagline: 'Read it right',
    founded: 1948,
    country: 'United Kingdom',
    makes: 'Panel meters, recorders and monitors',
    seen: 'New: the line-up’s meters, chart recorder and CRTs',
    mark: 'dial',
    colours: ['#3b3f45', '#e8a33d', '#141518'],
    type: 'serif',
  },
  {
    id: 'oleander',
    name: 'Oleander Lubricants',
    wordmark: 'OLEANDER',
    tagline: 'Keeps everything moving',
    founded: 1923,
    country: 'United Kingdom',
    makes: 'Lubricating and hydrocoptic oils',
    seen: 'New: the oil in the lube oil pump',
    mark: 'drop',
    colours: ['#d4a017', '#2a5a2a', '#1b1b10'],
    type: 'slab',
  },
  {
    id: 'meridale',
    name: 'Meridale Training Solutions',
    wordmark: 'Meridale',
    tagline: 'Learning that sticks',
    founded: 1998,
    country: 'United Kingdom',
    makes: 'Industrial training courses',
    seen: 'New: runs the Encabulation training',
    mark: 'laurel',
    colours: ['#5b3f8c', '#c7b8e0', '#1c1428'],
    type: 'script',
  },
];
