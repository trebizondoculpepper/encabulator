/** Architectural catalogue: physical building fittings, separate from machine parts. */
export const ARCHITECTURAL_FITTINGS = {
  distribution: {
    title: 'TPN distribution board',
    reference: 'Hager Invicta JK104B enclosure, 465 × 500 × 132.5 mm',
    source: 'https://hager.com/uk/products/h/jk104b-125a-4-way-tpn-board-plain',
  },
  socket: {
    title: 'UK metalclad twin socket',
    reference: 'MK Metalclad Plus K2946 / BS 1363, 146 × 86 mm face',
    source:
      'https://buildings.honeywell.com/dk/en/products/by-category/electrical-and-wiring/wiring-devices/sockets/switchsockets/metalclad-plus-13a-switched-socket-outlet',
  },
  switch: {
    title: 'Lighting switch',
    reference: 'MK Logic Plus one-gang plate format',
    source:
      'https://buildings.honeywell.com/gb/en/brands/our-brands/mk-electric',
  },
  luminaire: {
    title: 'Industrial LED luminaire',
    reference: 'Thorn Aquaforce Pro, 1600 × 90 × 90 mm',
    source:
      'https://www.thornlighting.co.nz/en-nz/products/indoor-lighting/industrial-luminaires/Aquaforce_Pro',
  },
  emergency: {
    title: 'Emergency downlight',
    reference: 'Recessed self-contained emergency downlight format',
    source: 'https://www.thornlighting.com/',
  },
  exit: {
    title: 'Maintained exit sign',
    reference: 'UK maintained running-man exit sign format',
    source: 'https://www.thornlighting.com/',
  },
  callpoint: {
    title: 'Resettable fire call point',
    reference: 'KAC MCP resettable indoor call-point format',
    source: 'https://www.kac.co.uk/',
  },
  sounder: {
    title: 'Fire sounder-beacon',
    reference: 'Conventional wall sounder-beacon format',
    source: 'https://www.kac.co.uk/',
  },
  detector: {
    title: 'Optical smoke detector',
    reference: 'Apollo Series 65 optical detector format',
    source: 'https://www.apollo-fire.co.uk/',
  },
  firepanel: {
    title: 'Conventional fire alarm panel',
    reference: 'C-TEC CFP702-4 two-zone panel',
    source: 'https://c-tec.com/productpdf/?product=7695',
  },
  sprinkler: {
    title: '68°C pendant sprinkler',
    reference: 'Tyco TY-B standard-response pendant format',
    source:
      'https://www.tyco-fire.com/products-and-solutions/sprinklers-nozzles-and-accessories/standard-coverage/series_tyb_sprinklers_fsp/series-ty-b-sprinklers',
  },
  valves: {
    title: 'Wet sprinkler valve assembly',
    reference: 'Conventional wet alarm-valve riser arrangement',
    source: 'https://www.tyco-fire.com/',
  },
  testvalve: {
    title: 'Sprinkler alarm test valve',
    reference: 'Victaulic Series 720 TestMaster II functional reference',
    source: 'https://assets.victaulic.com/assets/uploads/literature/I-720.pdf',
  },
  bell: {
    title: 'Sprinkler flow alarm bell',
    reference: 'Conventional sprinkler water-flow alarm gong',
    source: 'https://www.tyco-fire.com/',
  },
  water: {
    title: 'Water extinguisher',
    reference: 'UK water extinguisher format, red identification',
    source: 'https://www.chubbfiresecurity.com/en/uk/',
  },
  co2: {
    title: 'CO₂ extinguisher',
    reference: 'UK CO₂ extinguisher format, black identification and horn',
    source: 'https://www.chubbfiresecurity.com/en/uk/',
  },
  heater: {
    title: 'Radiant heater',
    reference: 'Frico Elztrip EZ222, 1520 × 282 × 64 mm',
    source:
      'https://shop.frico.net/upload/assets/CAT_FRICO_EZ200_FR_FRANCE_160603_20190426_004834846.PDF',
  },
  grille: {
    title: 'Aluminium ventilation grille',
    reference: 'TROX AT grille family, selected 1200 × 600 mm nominal opening',
    source:
      'https://www.troxuk.co.uk/wall-sill-and-duct-installation/awt-d08cf71342728937',
  },
  escapedoor: {
    title: 'Steel escape doorset',
    reference:
      'Commercial steel escape door with Briton 378M-type panic furniture',
    source: 'https://briton.co.uk/en/products/briton-378.html',
  },
  utilitydoor: {
    title: 'Steel utility doorset',
    reference: 'Commercial steel personnel doorset construction',
    source: 'https://www.hag.co.uk/',
  },
  loadingdoor: {
    title: 'Folding loading door',
    reference:
      'HAG C Door horizontal folding family, selected 6000 × 5000 mm opening',
    source: 'https://www.hag.co.uk/product/c-door/',
  },
  ladder: {
    title: 'Galvanised cable ladder',
    reference: 'Legrand Swifts 3 m length, 300 mm width, 100 mm side rails',
    source:
      'https://www.legrand.co.uk/en/catalog/swifts-cable-ladder-pre-galvanised',
  },
  pipe: {
    title: 'Steel sprinkler pipe',
    reference: 'Conventional screwed steel sprinkler pipe, 32 mm nominal',
    source: 'https://www.tyco-fire.com/',
  },
  lever: {
    title: 'Return-to-door lever handle',
    reference: 'ARRONE AR361-type 19 mm stainless lever on rose',
    source: 'https://www.hoppe.com/gb-en/',
  },
  pull: {
    title: 'Stainless pull handle',
    reference:
      'ARRONE straight pull family, selected 300 mm centres and 19 mm tube',
    source:
      'https://www.hoppe.com/in-en/product/1001705277/ar9216-pull-handles',
  },
  panic: {
    title: 'Panic exit device',
    reference: 'Briton 378M rim latch and site-cut tubular push bar',
    source: 'https://briton.co.uk/en/products/briton-378.html',
  },
  conduit: {
    title: 'Steel electrical conduit',
    reference: '20 mm galvanised steel conduit and saddles',
    source: 'https://www.legrand.co.uk/',
  },
} as const;
export type ArchitecturalKind = keyof typeof ARCHITECTURAL_FITTINGS;
export const ARCHITECTURAL_KINDS = Object.keys(
  ARCHITECTURAL_FITTINGS,
) as ArchitecturalKind[];
export function architecturalComponent(kind: ArchitecturalKind) {
  return Object.freeze({
    kind,
    attachment: 'fixed' as const,
    ...ARCHITECTURAL_FITTINGS[kind],
  });
}
