import { describe, expect, it } from 'vite-plus/test';
import {
  DOOR_RELEASE_SECONDS,
  FAN_RUN_ON_SECONDS,
  INVESTIGATION_SECONDS,
  VACANCY_SECONDS,
  createBuildingServices,
} from './building-services';

const run = (
  b: ReturnType<typeof createBuildingServices>,
  seconds: number,
  random = () => 0,
) => {
  for (let t = 0; t < seconds; t += 0.1) b.tick(0.1, random);
};
/** The investigation finds a fire (0) or a false alarm (0.9). */
const finds = { fire: () => 0, falseAlarm: () => 0.9 };

describe('dev8 building services', () => {
  it('switch the room lights from either end (two-way)', () => {
    const b = createBuildingServices();
    expect(b.lighting.roomLight.value).toBe(1);
    b.lighting.switchFar.set(true);
    expect(b.lighting.roomLight.value).toBe(0);
    b.lighting.switchDoor.set(false);
    expect(b.lighting.roomLight.value).toBe(1);
    b.lighting.dimmer.set(4);
    expect(b.lighting.roomLight.value).toBeCloseTo(0.4);
  });

  it('turn the lights off when nobody moves, and back on with movement', () => {
    const b = createBuildingServices();
    run(b, VACANCY_SECONDS + 1);
    expect(b.lighting.roomLight.value).toBe(0);
    b.lighting.motion();
    expect(b.lighting.roomLight.value).toBe(1);
  });

  it('light the emergency lights when the lighting circuit fails or is tested', () => {
    const b = createBuildingServices();
    expect(b.lighting.emergencyLit.value).toBe(false);
    b.lighting.emergencyTest.set(true);
    expect(b.lighting.emergencyLit.value).toBe(true);
    expect(b.lighting.roomLight.value).toBe(0);
    expect(b.lighting.exitSign.value).toBeGreaterThan(0);
    b.lighting.emergencyTest.set(false);
    b.power.lightingBreaker.set(false);
    expect(b.lighting.emergencyLit.value).toBe(true);
  });

  it('detect the lit bin a few seconds later, and investigate it', () => {
    const b = createBuildingServices();
    expect(b.fire.startFire()).toBe(true);
    expect(b.fire.flames.value).toBeGreaterThan(0);
    run(b, 2);
    expect(b.fire.stage.value).toBe('normal');
    run(b, 5);
    expect(b.fire.detector.value).toBe(true);
    expect(b.fire.stage.value).toBe('alert');
    expect(b.fire.voice.value).toBe('alert');
    expect(b.fire.doorsHeld.value).toBe(false);
    expect(b.access.locked.value).toBe(true);
    expect(b.fire.panelLamps.value.countdown).toBeGreaterThan(80);
  });

  it('call a false alarm while the bin burns, then evacuate on the second activation', () => {
    const b = createBuildingServices();
    b.fire.startFire();
    run(b, 7, finds.falseAlarm);
    expect(b.fire.stage.value).toBe('alert');
    run(b, INVESTIGATION_SECONDS, finds.falseAlarm);
    expect(b.fire.announcement.value.kind).toBe('false-alarm');
    expect(b.fire.stage.value).toBe('all-clear');
    // The bin is still alight: its smoke is soon back, and this time
    // everyone leaves.
    run(b, 20, finds.falseAlarm);
    expect(b.fire.stage.value).toBe('evacuate');
  });

  it('evacuate, burst the nearest head and put the bin out', () => {
    const b = createBuildingServices();
    b.fire.startFire();
    run(b, 7 + INVESTIGATION_SECONDS, finds.fire);
    expect(b.fire.stage.value).toBe('evacuate');
    expect(b.fire.voice.value).toBe('evacuate');
    expect(b.access.locked.value).toBe(false);
    expect(b.fire.panelLamps.value.brigade).toBe(true);
    // The fire grows until the hot gas at the nearest head reaches 68 °C.
    run(b, 20, finds.fire);
    expect(b.fire.discharging.value).toBe(false);
    run(b, 15, finds.fire);
    expect(b.fire.discharging.value).toBe(true);
    expect(b.fire.heads.value[0].spraying).toBe(true);
    // The spray puts the bin out; the water runs until the valve is shut.
    run(b, 25, finds.fire);
    expect(b.fire.flames.value).toBe(0);
    expect(b.fire.discharging.value).toBe(true);
    // RESET needs the key and nothing still in alarm: not while water flows.
    b.fire.panelKey.set(true);
    expect(b.fire.reset()).toBe(false);
    b.fire.riserValve.set(false);
    expect(b.fire.discharging.value).toBe(false);
    run(b, 30, finds.fire);
    expect(b.fire.reset()).toBe(true);
    expect(b.fire.announcement.value.kind).toBe('all-clear');
    b.fire.resetSprinklers();
    expect(b.fire.heads.value.some((h) => h.burst)).toBe(false);
  });

  it('go straight to evacuation from a call point', () => {
    const b = createBuildingServices();
    b.fire.startFire();
    run(b, 7);
    expect(b.fire.stage.value).toBe('alert');
    b.fire.pressCallPoint();
    b.tick(0.1);
    expect(b.fire.stage.value).toBe('evacuate');
  });

  it('latch a call point until it is reset with its key', () => {
    const b = createBuildingServices();
    b.fire.pressCallPoint();
    b.tick(0.1);
    expect(b.fire.sounding.value).toBe(true);
    b.fire.panelKey.set(true);
    expect(b.fire.reset()).toBe(false);
    expect(b.fire.sounding.value).toBe(true);
    b.fire.resetCallPoint();
    expect(b.fire.reset()).toBe(true);
    expect(b.fire.stage.value).toBe('all-clear');
  });

  it('silence and evacuate only with the panel key turned', () => {
    const b = createBuildingServices();
    b.fire.pressCallPoint();
    b.tick(0.1);
    expect(b.fire.silence()).toBe(false);
    expect(b.fire.sounding.value).toBe(true);
    b.fire.panelKey.set(true);
    expect(b.fire.silence()).toBe(true);
    expect(b.fire.sounding.value).toBe(false);
    b.fire.resetCallPoint();
    b.fire.reset();
    expect(b.fire.evacuate()).toBe(true);
    expect(b.fire.sounding.value).toBe(true);
  });

  it('let the door open only once a card or the exit button releases it', () => {
    const b = createBuildingServices();
    expect(b.access.workDoor()).toBe(false);
    b.access.presentCard();
    expect(b.access.workDoor()).toBe(true);
    expect(b.access.doorOpen.value).toBe(true);
    run(b, DOOR_RELEASE_SECONDS + 1);
    expect(b.access.doorOpen.value).toBe(false);
    expect(b.access.locked.value).toBe(true);
    b.access.breakDoorRelease();
    expect(b.access.locked.value).toBe(false);
    b.access.resetDoorRelease();
    expect(b.access.locked.value).toBe(true);
  });

  it('warm a cold room with the radiator, and faster with the AC on heat', () => {
    const slow = createBuildingServices();
    slow.climate.thermostat.set(22);
    run(slow, 60);
    const fast = createBuildingServices();
    fast.climate.thermostat.set(22);
    fast.climate.acPower.set(true);
    fast.climate.acMode.set(1);
    fast.climate.acSetpoint.set(26);
    run(fast, 60);
    expect(slow.climate.temperature.value).toBeGreaterThan(18);
    expect(fast.climate.temperature.value).toBeGreaterThan(
      slow.climate.temperature.value,
    );
    expect(fast.climate.acRunning.value).toBe(true);
  });

  it('run the WC extractor with its light and for a while after', () => {
    const b = createBuildingServices();
    b.lighting.wcCord.set(true);
    b.tick(0.1);
    expect(b.fan.running.value).toBe(true);
    b.lighting.wcCord.set(false);
    run(b, FAN_RUN_ON_SECONDS / 2);
    expect(b.fan.running.value).toBe(true);
    run(b, FAN_RUN_ON_SECONDS);
    expect(b.fan.running.value).toBe(false);
  });

  it('sound the accessible toilet alarm until it is reset', () => {
    const b = createBuildingServices();
    b.welfare.pullWcAlarm();
    expect(b.welfare.wcAlarmOn.value).toBe(true);
    b.welfare.resetWcAlarm();
    expect(b.welfare.wcAlarmOn.value).toBe(false);
  });

  it('feed the sockets from their breaker', () => {
    const b = createBuildingServices();
    expect(b.sockets.socketsLive.value.right).toBe(true);
    b.power.socketsBreaker.set(false);
    expect(b.sockets.socketsLive.value.right).toBe(false);
    expect(b.sockets.spurLive.value).toBe(false);
  });

  it('has no control whose effect cannot be seen, and nothing hidden', () => {
    const analysis = createBuildingServices().g.analyse();
    expect(analysis.unseenControls).toEqual([]);
    expect(analysis.constantOutputs).toEqual([]);
    expect(analysis.unwrittenStates).toEqual([]);
  });
});
