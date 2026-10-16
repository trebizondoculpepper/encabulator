import { createGraph } from './world/graph';

/**
 * Dev8's world model: the building services of one room of a present-day
 * English office, on the world graph, so that every fitting in the room
 * does what it would do in a real building. Each development room may
 * have a world model of its own like this one; the fittings are bound to
 * it and show it, and none of them decides anything for itself.
 *
 * - **Power**: a distribution board's main switch and its circuits
 *   (lighting, sockets, HVAC), each a breaker.
 * - **Lighting**: the room's lights on two-way switching (a switch at
 *   each end of the room; either one changes them), a dimmer, and an
 *   occupancy sensor that turns them off when nobody has moved for a
 *   while. Emergency lights are non-maintained: they light only when the
 *   lighting circuit loses power, which the test key switch simulates. The
 *   exit sign is maintained: always lit.
 * - **Fire**: a two-stage fire alarm with a voice alarm, as in a UK
 *   office (BS 5839-1 and -8), set off by the dev room's joke: a steel
 *   waste-paper bin under the smoke detector, lit by a button on a
 *   pedestal. A few seconds after it is lit its smoke sets off the
 *   detector, and the alert stage begins: the door holders let the fire
 *   doors close, and the voice alarm asks everyone to stay where they are
 *   while it is investigated, for `INVESTIGATION_SECONDS`. The
 *   investigation finds, at random, a fire (full evacuation) or a false
 *   alarm, announced while the bin is still alight, so that its smoke soon
 *   sets the detector off again, and a second activation goes straight to
 *   evacuation. In evacuation the access door unlocks and the brigade is
 *   called; the fire grows, and when the hot gas at a sprinkler head
 *   reaches 68 °C its glass bulb bursts and it sprays, which puts the bin
 *   out. A call point, or water flowing, goes straight to evacuation. The
 *   panel's SILENCE, RESOUND/EVACUATE and RESET work only with its key
 *   turned, and RESET only once nothing is still in alarm; then the
 *   all-clear is announced. At the valve set, the main valve stops the
 *   water and RESET replaces the burst heads.
 * - **Climate**: an air-conditioning unit with a wall controller (power,
 *   mode, setpoint), a radiator with a room thermostat and a thermostatic
 *   radiator valve, an opening window vent and blinds. The room's
 *   temperature follows from all of them and the weather outside.
 * - **Ventilation**: the WC's extractor fan runs with its light and for a
 *   while after (run-on).
 * - **Access**: a maglocked door released for a few seconds by a card or
 *   the push-to-exit button, or until reset by the green emergency door
 *   release; the door closes itself.
 * - **Welfare**: the accessible toilet's emergency pull cord, which
 *   sounds and lights an alarm until reset.
 */

/** Seconds without movement before the occupancy sensor turns the lights off. */
export const VACANCY_SECONDS = 90;
/**
 * The investigation period of a two-stage alarm (BS 5839-1): how long
 * the alert stage lasts after a detector, before full evacuation.
 */
export const INVESTIGATION_SECONDS = 90;
/** How long the all-clear lasts before the system is normal again. */
export const ALL_CLEAR_SECONDS = 10;
/**
 * The fire's size when the bin is lit, its growth a second once the
 * building is evacuating, and how fast a sprinkler puts it out.
 */
export const FIRE_START = 0.15;
export const FIRE_GROWTH = 0.015;
export const FIRE_QUENCH = 0.02;
/** How fast smoke builds up at the detector, a second: a few seconds' worth. */
export const SMOKE_RISE = 0.06;
/** A sprinkler head's glass bulb bursts at this temperature, °C. */
export const HEAD_OPENS_AT = 68;
/** Where the waste-paper bin stands, under the smoke detector: mid-room. */
export const FIRE_SEAT = { x: 0.4, z: 0.3 };
/** The sprinkler heads in the ceiling, metres. */
export const SPRINKLER_HEADS: readonly { x: number; z: number }[] = [
  { x: 1.5, z: 2 },
  { x: -1.5, z: 2 },
  { x: 1.5, z: -2 },
  { x: -1.5, z: -2 },
  { x: 4.5, z: 2 },
  { x: -4.5, z: 2 },
  { x: 4.5, z: -2 },
  { x: -4.5, z: -2 },
];
/** The fire alarm's stages. */
export type FireStage = 'normal' | 'alert' | 'evacuate' | 'all-clear';

/**
 * The hot gas at sprinkler head `i` under a fire of `size` (0 to 1):
 * hotter the bigger the fire and the nearer the head, °C.
 */
export function headTemperature(size: number, i: number) {
  const { x, z } = SPRINKLER_HEADS[i];
  const distance = Math.hypot(x - FIRE_SEAT.x, z - FIRE_SEAT.z);
  return 20 + (100 * size * 4) / (distance + 1.5);
}
/** Seconds the door stays released after a card or the exit button. */
export const DOOR_RELEASE_SECONDS = 6;
/** Seconds the WC extractor runs on after its light goes off. */
export const FAN_RUN_ON_SECONDS = 20;
/** Smoke at the detector, 0 to 1, above which it goes into alarm. */
export const SMOKE_ALARM = 0.3;
export const OUTSIDE_TEMPERATURE = 9;
/** Air-conditioning modes, in the order the MODE button steps them. */
export const HVAC_MODES = ['auto', 'heat', 'cool', 'fan'] as const;

export function createBuildingServices() {
  const g = createGraph();

  // ---- Power -----------------------------------------------------------
  const main = g.input('board.main', true, { where: 'main switch' });
  const lightingBreaker = g.input('board.lighting', true, {
    where: 'lighting breaker',
  });
  const socketsBreaker = g.input('board.sockets', true, {
    where: 'sockets breaker',
  });
  const hvacBreaker = g.input('board.hvac', true, { where: 'HVAC breaker' });
  const emergencyTest = g.input('emergency.test', false, {
    where: 'emergency lighting test key switch',
  });
  const lightingSupply = g.derive(
    'lighting.supply',
    [main, lightingBreaker, emergencyTest],
    (m, b, test) => m && b && !test,
  );
  const socketSupply = g.derive(
    'sockets.supply',
    [main, socketsBreaker],
    (m, b) => m && b,
  );
  const hvacSupply = g.derive(
    'hvac.supply',
    [main, hvacBreaker],
    (m, b) => m && b,
  );

  // ---- Lighting --------------------------------------------------------
  const switchDoor = g.input('lights.switch.door', true, {
    where: 'light switch by the door',
  });
  const switchFar = g.input('lights.switch.far', false, {
    where: 'light switch at the far end',
  });
  const dimmer = g.input('lights.dimmer', 10, { where: 'dimmer' });
  const stillFor = g.state('room.still', 0);
  g.process('occupancy', [], [stillFor], (dt) =>
    stillFor.set(stillFor.peek() + dt),
  );
  const motion = g.action('room.motion', [], [stillFor], () => stillFor.set(0));
  const occupied = g.output(
    'room.occupied',
    [stillFor],
    (s) => s < VACANCY_SECONDS,
    { where: 'occupancy sensor LED' },
  );
  const roomLight = g.output(
    'lights.room',
    [lightingSupply, switchDoor, switchFar, dimmer, occupied],
    (supply, a, b, level, here) =>
      supply && a !== b && here ? Math.max(0.1, level / 10) : 0,
    { where: 'ceiling lights' },
  );
  const emergencyLit = g.output(
    'lights.emergency',
    [lightingSupply],
    (supply) => !supply,
    { where: 'emergency lights' },
  );
  const charging = g.output('lights.charging', [lightingSupply], (s) => s, {
    where: 'emergency lights charging LEDs',
  });
  const exitSign = g.output(
    'lights.exit',
    [lightingSupply],
    (supply) => (supply ? 1 : 0.75),
    { where: 'exit sign' },
  );
  const wcCord = g.input('wc.cord', false, { where: 'WC pull-cord switch' });
  const wcLight = g.output(
    'wc.light',
    [lightingSupply, wcCord],
    (supply, on) => supply && on,
    { where: 'WC light' },
  );

  // ---- Ventilation -----------------------------------------------------
  const runOn = g.state('fan.runOn', 0);
  g.process('fan.run-on', [wcLight], [runOn], (dt) =>
    runOn.set(
      wcLight.peek() ? FAN_RUN_ON_SECONDS : Math.max(0, runOn.peek() - dt),
    ),
  );
  const fanRunning = g.output(
    'fan.running',
    [lightingSupply, wcLight, runOn],
    (supply, light, left) => supply && (light || left > 0),
    { where: 'extractor fan' },
  );

  // ---- Fire ------------------------------------------------------------
  const panelKey = g.input('fire.panel.key', false, {
    where: 'fire panel access key',
  });
  const riserValve = g.input('sprinkler.main', true, {
    where: 'sprinkler main valve',
  });
  const callPoint = g.state('fire.callPoint', false);
  /** The fire itself: 0 when out, growing towards 1. */
  const fireSize = g.state('fire.size', 0);
  /**
   * What the investigation will find (decided, at random, when the alert
   * begins): a fire, or a false alarm.
   */
  const willFindFire = g.state('fire.willFindFire', true);
  /** A false alarm has been called while the bin still smoulders. */
  const calledFalse = g.state('fire.calledFalse', false);
  const smoke = g.state('fire.smoke', 0);
  const detector = g.state('fire.detector', false);
  const silenced = g.state('fire.silenced', false);
  const brigade = g.state('fire.brigade', false);
  const stage = g.state<FireStage>('fire.stage', 'normal');
  const investigation = g.state('fire.investigation', 0);
  const allClearFor = g.state('fire.allClearFor', 0);
  /** One-off announcements, numbered so a repeat is heard as new. */
  const message = g.state<{
    kind: 'false-alarm' | 'all-clear' | null;
    n: number;
  }>('fire.message', { kind: null, n: 0 });
  /** Each sprinkler head's glass bulb: burst, or whole. */
  const bulbs = g.state<boolean[]>(
    'sprinkler.bulbs',
    SPRINKLER_HEADS.map(() => false),
    { equals: (a: boolean[], b: boolean[]) => a.every((v, i) => v === b[i]) },
  );
  const heads = g.output(
    'sprinkler.heads',
    [bulbs, riserValve],
    (burst, open) => burst.map((b) => ({ burst: b, spraying: b && open })),
    {
      where: 'sprinkler heads',
      equals: (
        a: { burst: boolean; spraying: boolean }[],
        b: { burst: boolean; spraying: boolean }[],
      ) =>
        a.every(
          (h, i) => h.burst === b[i].burst && h.spraying === b[i].spraying,
        ),
    },
  );
  const discharging = g.output(
    'sprinkler.discharge',
    [heads],
    (hs) => hs.some((h) => h.spraying),
    { where: 'sprinkler flow switch and alarm bell' },
  );
  const fire = g.derive(
    'fire.fire',
    [callPoint, detector, discharging],
    (c, d, flow) => c || d || flow,
  );
  const alarm = g.derive(
    'fire.alarm',
    [stage],
    (s) => s === 'alert' || s === 'evacuate',
  );
  const sounding = g.output(
    'fire.sounding',
    [alarm, silenced],
    (a, s) => a && !s,
    { where: 'sounder-beacons' },
  );
  const voice = g.output(
    'fire.voice',
    [stage, silenced],
    (s, quiet): 'alert' | 'evacuate' | null =>
      quiet ? null : s === 'alert' || s === 'evacuate' ? s : null,
    { where: 'voice alarm speakers' },
  );
  const announcement = g.output('fire.announcement', [message], (m) => m, {
    where: 'voice alarm speakers',
  });
  const doorsHeld = g.output(
    'fire.doorsHeld',
    [alarm, main],
    (a, m) => !a && m,
    { where: 'door holders' },
  );
  const flames = g.output('fire.flames', [fireSize], (s) => s, {
    where: 'the fire in the bin',
  });
  const smokeShown = g.output('fire.smokeShown', [smoke], (s) => s, {
    where: 'smoke under the ceiling',
  });
  const panelLamps = g.output(
    'fire.panel.lamps',
    [
      fire,
      callPoint,
      detector,
      discharging,
      stage,
      investigation,
      silenced,
      brigade,
      main,
      panelKey,
    ],
    (f, c, d, flow, s, left, quiet, called, m, key) => ({
      fire: f,
      zone1: c,
      zone2: d || flow,
      alarm: s === 'alert' || s === 'evacuate',
      stage: s,
      countdown: Math.ceil(left),
      sprinkler: flow,
      brigade: called,
      silenced: quiet,
      power: true,
      onBattery: !m,
      enabled: key,
    }),
    {
      where: 'fire alarm panel',
      equals: (a: Record<string, unknown>, b: Record<string, unknown>) =>
        Object.keys(a).every((k) => a[k] === b[k]),
    },
  );
  const announce = (kind: 'false-alarm' | 'all-clear') =>
    message.set({ kind, n: message.peek().n + 1 });
  const finish = (kind: 'false-alarm' | 'all-clear') => {
    stage.set('all-clear');
    allClearFor.set(ALL_CLEAR_SECONDS);
    silenced.set(false);
    brigade.set(false);
    announce(kind);
  };
  g.process(
    'fire',
    [riserValve, callPoint],
    [
      fireSize,
      willFindFire,
      calledFalse,
      smoke,
      detector,
      bulbs,
      stage,
      investigation,
      brigade,
      allClearFor,
      silenced,
      message,
    ],
    (dt, random) => {
      // The fire in the bin: smouldering while it is investigated, growing
      // once the building is evacuating, and put out by a sprinkler head.
      const spraying = bulbs
        .peek()
        .filter((burst) => burst && riserValve.peek()).length;
      let size = fireSize.peek();
      if (size > 0) {
        const growing = stage.peek() === 'evacuate';
        size +=
          dt * (spraying === 0 ? (growing ? FIRE_GROWTH : 0) : -FIRE_QUENCH);
        size = Math.min(1, Math.max(0, size));
        fireSize.set(size);
      }
      // Heat at each head, from the fire's size and the head's distance:
      // a head's bulb bursts at 68 °C.
      const burst = bulbs.peek();
      const next = burst.map(
        (b, i) => b || headTemperature(size, i) >= HEAD_OPENS_AT,
      );
      if (next.some((b, i) => b !== burst[i])) bulbs.set(next);
      // Smoke builds up over a few seconds and clears slowly.
      const target = size > 0 ? Math.min(1, 0.4 + size) : 0;
      const now = smoke.peek();
      smoke.set(
        target > now
          ? Math.min(target, now + dt * SMOKE_RISE)
          : Math.max(target, now - dt * 0.03),
      );
      if (smoke.peek() > SMOKE_ALARM) detector.set(true);
      // The fire alarm's stages.
      const flow = spraying > 0;
      switch (stage.peek()) {
        case 'normal':
          if (callPoint.peek() || flow) {
            stage.set('evacuate');
            silenced.set(false);
          } else if (detector.peek()) {
            // A second activation after a false alarm is not investigated
            // again: everyone leaves.
            if (calledFalse.peek()) stage.set('evacuate');
            else {
              stage.set('alert');
              investigation.set(INVESTIGATION_SECONDS);
              willFindFire.set(random() < 0.5);
            }
            silenced.set(false);
          }
          break;
        case 'alert':
          investigation.set(Math.max(0, investigation.peek() - dt));
          if (callPoint.peek() || flow) {
            stage.set('evacuate');
            silenced.set(false);
          } else if (investigation.peek() <= 0) {
            if (willFindFire.peek()) {
              stage.set('evacuate');
              silenced.set(false);
            } else {
              // Called a false alarm, and the panel reset, though the bin
              // is still alight: its smoke will soon be back.
              detector.set(false);
              smoke.set(Math.min(smoke.peek(), SMOKE_ALARM * 0.5));
              calledFalse.set(size > 0);
              finish('false-alarm');
            }
          }
          break;
        case 'evacuate':
          // The panel calls the fire brigade (an alarm receiving centre).
          if (!brigade.peek()) brigade.set(true);
          break;
        case 'all-clear':
          allClearFor.set(allClearFor.peek() - dt);
          if (allClearFor.peek() <= 0) stage.set('normal');
          break;
      }
    },
  );
  /** LIGHT THE BIN: set fire to the waste-paper bin under the detector. */
  const startFire = g.action('fire.start', [], [fireSize, calledFalse], () => {
    if (fireSize.peek() > 0) return false;
    fireSize.set(FIRE_START);
    calledFalse.set(false);
    return true;
  });
  const pressCallPoint = g.action('fire.callPoint.press', [], [callPoint], () =>
    callPoint.set(true),
  );
  const resetCallPoint = g.action('fire.callPoint.reset', [], [callPoint], () =>
    callPoint.set(false),
  );
  /** SILENCE: quiet the sounders and the voice, with the key turned. */
  const silence = g.action(
    'fire.panel.silence',
    [panelKey, alarm],
    [silenced],
    () => {
      if (!panelKey.peek() || !alarm.peek()) return false;
      silenced.set(true);
      return true;
    },
  );
  /** RESOUND or EVACUATE: sound full evacuation, with the key turned. */
  const evacuate = g.action(
    'fire.panel.evacuate',
    [panelKey],
    [stage, silenced],
    () => {
      if (!panelKey.peek()) return false;
      stage.set('evacuate');
      silenced.set(false);
      return true;
    },
  );
  /**
   * RESET, with the key turned. It succeeds only once nothing is still in
   * alarm: no call point latched, no water flowing, no fire and the smoke
   * cleared; then the voice gives the all-clear.
   */
  const reset = g.action(
    'fire.panel.reset',
    [panelKey, smoke, fireSize, callPoint, discharging],
    [detector, stage, silenced, brigade, allClearFor, message],
    () => {
      if (!panelKey.peek()) return false;
      const clear =
        !callPoint.peek() &&
        !discharging.peek() &&
        fireSize.peek() <= 0 &&
        smoke.peek() <= SMOKE_ALARM;
      if (!clear) return false;
      detector.set(false);
      if (stage.peek() === 'normal') return true;
      finish('all-clear');
      return true;
    },
  );
  /** At the valve set: replace the burst heads (shut the main valve first). */
  const resetSprinklers = g.action('sprinkler.reset', [], [bulbs], () =>
    bulbs.set(SPRINKLER_HEADS.map(() => false)),
  );

  // ---- Climate ---------------------------------------------------------
  const outside = g.fixed('weather.outside', OUTSIDE_TEMPERATURE);
  const acPower = g.input('hvac.power', false, {
    where: 'AC controller ON/OFF',
  });
  const acMode = g.input('hvac.mode', 0, { where: 'AC controller MODE' });
  const acSetpoint = g.input('hvac.setpoint', 21, {
    where: 'AC controller up and down',
  });
  const thermostat = g.input('heating.thermostat', 20, {
    where: 'room thermostat dial',
  });
  const valve = g.input('heating.trv', 3, {
    where: 'thermostatic radiator valve',
  });
  const vent = g.input('window.vent', false, { where: 'window vent' });
  const blindsOpen = g.input('blinds.open', true, { where: 'blinds' });
  const temperature = g.state('room.temperature', 18);
  const acDuty = g.derive(
    'hvac.duty',
    [hvacSupply, acPower, acMode, acSetpoint, temperature],
    (supply, on, mode, set, t): -1 | 0 | 1 => {
      if (!supply || !on) return 0;
      const name = HVAC_MODES[mode] ?? 'auto';
      if ((name === 'heat' || name === 'auto') && t < set - 0.3) return 1;
      if ((name === 'cool' || name === 'auto') && t > set + 0.3) return -1;
      return 0;
    },
  );
  const acRunning = g.output(
    'hvac.running',
    [hvacSupply, acPower, acMode, acDuty],
    (supply, on, mode, duty) =>
      supply && on && (duty !== 0 || HVAC_MODES[mode] === 'fan'),
    { where: 'AC cassette' },
  );
  const calling = g.output(
    'heating.calling',
    [thermostat, temperature],
    (set, t) => t < set,
    { where: 'thermostat lamp' },
  );
  const radiatorHot = g.output(
    'heating.radiator',
    [calling, valve],
    (call, open) => (call ? open / 5 : 0),
    { where: 'radiator' },
  );
  g.process(
    'room heat',
    [outside, acDuty, radiatorHot, vent, blindsOpen],
    [temperature],
    (dt) => {
      const t = temperature.peek();
      // Losses to outside, worse with the vent open; a little sun through
      // open blinds; the radiator and the air conditioning.
      const loss = (vent.peek() ? 0.006 : 0.002) * (t - outside.peek());
      const sun = blindsOpen.peek() ? 0.004 : 0;
      const radiator = radiatorHot.peek() * 0.03;
      const ac = acDuty.peek() * 0.05;
      temperature.set(t + (sun + radiator + ac - loss) * dt);
    },
  );

  // ---- Access ----------------------------------------------------------
  const releasedFor = g.state('door.releasedFor', 0);
  const breakGlass = g.state('door.breakGlass', false);
  const doorOpen = g.state('door.open', false);
  const locked = g.output(
    'door.locked',
    [main, releasedFor, breakGlass, stage],
    (m, left, broken, s) => m && left <= 0 && !broken && s !== 'evacuate',
    { where: 'maglock and its reader LED' },
  );
  const openFor = g.state('door.openFor', 0);
  const doorShown = g.output('door.swing', [doorOpen], (open) => open, {
    where: 'door leaf',
  });
  g.process('door release', [], [releasedFor, doorOpen, openFor], (dt) => {
    releasedFor.set(Math.max(0, releasedFor.peek() - dt));
    if (doorOpen.peek()) {
      openFor.set(openFor.peek() + dt);
      // The closer brings it to after a few seconds.
      if (openFor.peek() > 5) doorOpen.set(false);
    } else openFor.set(0);
  });
  const presentCard = g.action('door.card', [], [releasedFor], () =>
    releasedFor.set(DOOR_RELEASE_SECONDS),
  );
  const pushToExit = g.action('door.exit', [], [releasedFor], () =>
    releasedFor.set(DOOR_RELEASE_SECONDS),
  );
  const breakDoorRelease = g.action('door.break', [], [breakGlass], () =>
    breakGlass.set(true),
  );
  const resetDoorRelease = g.action('door.break.reset', [], [breakGlass], () =>
    breakGlass.set(false),
  );
  /** Push or pull the door: opens if the lock lets it. */
  const workDoor = g.action('door.work', [locked], [doorOpen], () => {
    if (doorOpen.peek()) {
      doorOpen.set(false);
      return true;
    }
    if (locked.peek()) return false;
    doorOpen.set(true);
    return true;
  });

  // ---- Welfare ---------------------------------------------------------
  const wcAlarm = g.state('wc.alarm', false);
  const wcAlarmOn = g.output('wc.alarmOn', [wcAlarm], (a) => a, {
    where: 'over-door alarm light and buzzer',
  });
  const pullWcAlarm = g.action('wc.alarm.pull', [], [wcAlarm], () =>
    wcAlarm.set(true),
  );
  const resetWcAlarm = g.action('wc.alarm.reset', [], [wcAlarm], () =>
    wcAlarm.set(false),
  );

  // ---- Sockets ---------------------------------------------------------
  const socketLeft = g.input('socket.left', false, { where: 'left socket' });
  const socketRight = g.input('socket.right', true, { where: 'right socket' });
  const spur = g.input('spur', true, { where: 'fused spur' });
  const socketsLive = g.output(
    'sockets.live',
    [socketSupply, socketLeft, socketRight],
    (supply, l, r) => ({ left: supply && l, right: supply && r }),
    {
      where: 'socket tester lamps',
      equals: (a: { left: boolean; right: boolean }, b: typeof a) =>
        a.left === b.left && a.right === b.right,
    },
  );
  const spurLive = g.output(
    'spur.live',
    [socketSupply, spur],
    (supply, on) => supply && on,
    { where: 'fused spur neon' },
  );

  return {
    g,
    /** Advance `dt` seconds; `random` decides the investigation's finding. */
    tick: (dt: number, random?: () => number) => g.tick(dt, random),
    power: { main, lightingBreaker, socketsBreaker, hvacBreaker },
    lighting: {
      switchDoor,
      switchFar,
      dimmer,
      emergencyTest,
      motion,
      occupied,
      roomLight,
      emergencyLit,
      charging,
      exitSign,
      wcCord,
      wcLight,
    },
    fan: { running: fanRunning },
    fire: {
      panelKey,
      riserValve,
      callPoint,
      smoke,
      detector,
      stage,
      sounding,
      voice,
      announcement,
      doorsHeld,
      panelLamps,
      heads,
      discharging,
      flames,
      smokeShown,
      startFire,
      pressCallPoint,
      resetCallPoint,
      silence,
      evacuate,
      reset,
      resetSprinklers,
    },
    climate: {
      acPower,
      acMode,
      acSetpoint,
      acRunning,
      thermostat,
      calling,
      valve,
      radiatorHot,
      vent,
      blindsOpen,
      temperature,
    },
    access: {
      locked,
      doorOpen: doorShown,
      breakGlass,
      presentCard,
      pushToExit,
      breakDoorRelease,
      resetDoorRelease,
      workDoor,
    },
    welfare: { wcAlarmOn, pullWcAlarm, resetWcAlarm },
    sockets: { socketLeft, socketRight, spur, socketsLive, spurLive },
  };
}

export type BuildingServices = ReturnType<typeof createBuildingServices>;
