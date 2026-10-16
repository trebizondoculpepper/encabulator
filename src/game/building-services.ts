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
 * - **Fire**: a resettable manual call point, a smoke detector (a TEST
 *   SMOKE button puffs aerosol at it) and a sprinkler flow switch report
 *   to the fire alarm panel. Fire sounds the sounders and releases the
 *   magnetic door holders, so the fire doors close, and unlocks the access
 *   controlled door (fail-safe). The panel's SILENCE, RESET and EVACUATE
 *   work only with its access key turned. The sprinklers are a pre-action
 *   system: the smoke detector, confirmed for `PREACTION_DELAY` seconds,
 *   trips the pre-action valve and the heads discharge until the riser's
 *   main valve is shut; the valve is reset at the valve set.
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
/** Seconds of smoke before the pre-action valve trips. */
export const PREACTION_DELAY = 8;
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
  const smoke = g.state('fire.smoke', 0);
  const detector = g.state('fire.detector', false);
  const silenced = g.state('fire.silenced', false);
  const evacuating = g.state('fire.evacuate', false);
  const confirming = g.state('sprinkler.confirming', 0);
  const preaction = g.state('sprinkler.tripped', false);
  const discharging = g.output(
    'sprinkler.discharge',
    [preaction, riserValve],
    (tripped, open) => tripped && open,
    { where: 'sprinkler heads' },
  );
  const fire = g.derive(
    'fire.fire',
    [callPoint, detector, discharging],
    (c, d, flow) => c || d || flow,
  );
  const alarm = g.derive('fire.alarm', [fire, evacuating], (f, e) => f || e);
  const sounding = g.output(
    'fire.sounding',
    [alarm, silenced],
    (a, s) => a && !s,
    { where: 'sounders and beacons' },
  );
  const doorsHeld = g.output(
    'fire.doorsHeld',
    [alarm, main],
    (a, m) => !a && m,
    { where: 'door holders' },
  );
  const panelLamps = g.output(
    'fire.panel.lamps',
    [fire, callPoint, detector, discharging, alarm, silenced, main, panelKey],
    (f, c, d, flow, a, s, m, key) => ({
      fire: f,
      zone1: c,
      zone2: d || flow,
      alarm: a,
      silenced: s,
      power: true,
      onBattery: !m,
      enabled: key,
    }),
    {
      where: 'fire alarm panel',
      equals: (a: Record<string, boolean>, b: Record<string, boolean>) =>
        Object.keys(a).every((k) => a[k] === b[k]),
    },
  );
  g.process('smoke', [], [smoke, detector], (dt) => {
    smoke.set(Math.max(0, smoke.peek() - dt * 0.05));
    if (smoke.peek() > SMOKE_ALARM) detector.set(true);
  });
  g.process('pre-action', [smoke], [confirming, preaction], (dt) => {
    if (smoke.peek() > SMOKE_ALARM) {
      confirming.set(confirming.peek() + dt);
      if (confirming.peek() >= PREACTION_DELAY) preaction.set(true);
    } else confirming.set(0);
  });
  const pressCallPoint = g.action(
    'fire.callPoint.press',
    [],
    [callPoint, silenced],
    () => {
      callPoint.set(true);
      silenced.set(false);
    },
  );
  const resetCallPoint = g.action('fire.callPoint.reset', [], [callPoint], () =>
    callPoint.set(false),
  );
  const smokeTest = g.action('fire.smokeTest', [], [smoke, silenced], () => {
    smoke.set(1);
    silenced.set(false);
  });
  /** SILENCE: quiet the sounders, with the key turned. */
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
  /** EVACUATE: sound everything, with the key turned. */
  const evacuate = g.action(
    'fire.panel.evacuate',
    [panelKey],
    [evacuating, silenced],
    () => {
      if (!panelKey.peek()) return false;
      evacuating.set(true);
      silenced.set(false);
      return true;
    },
  );
  /**
   * RESET: clear what has cleared, with the key turned. A call point
   * still latched, smoke still about or water still flowing comes straight
   * back into alarm.
   */
  const reset = g.action(
    'fire.panel.reset',
    [panelKey, smoke],
    [detector, silenced, evacuating],
    () => {
      if (!panelKey.peek()) return false;
      if (smoke.peek() <= SMOKE_ALARM) detector.set(false);
      silenced.set(false);
      evacuating.set(false);
      return true;
    },
  );
  const resetSprinklers = g.action(
    'sprinkler.reset',
    [],
    [preaction, confirming],
    () => {
      preaction.set(false);
      confirming.set(0);
    },
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
    [main, releasedFor, breakGlass, alarm],
    (m, left, broken, a) => m && left <= 0 && !broken && !a,
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
    tick: (dt: number) => g.tick(dt),
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
      sounding,
      doorsHeld,
      panelLamps,
      discharging,
      preaction,
      confirming,
      pressCallPoint,
      resetCallPoint,
      smokeTest,
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
