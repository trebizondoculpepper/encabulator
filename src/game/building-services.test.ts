import { describe, expect, it } from 'vite-plus/test';
import {
  DOOR_RELEASE_SECONDS,
  FAN_RUN_ON_SECONDS,
  PREACTION_DELAY,
  VACANCY_SECONDS,
  createBuildingServices,
} from './building-services';

const run = (b: ReturnType<typeof createBuildingServices>, seconds: number) => {
  for (let t = 0; t < seconds; t += 0.1) b.tick(0.1);
};

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

  it('take smoke to the panel, the sounders, the door holders and the sprinklers', () => {
    const b = createBuildingServices();
    expect(b.fire.sounding.value).toBe(false);
    b.fire.smokeTest();
    b.tick(0.1);
    expect(b.fire.detector.value).toBe(true);
    expect(b.fire.sounding.value).toBe(true);
    expect(b.fire.doorsHeld.value).toBe(false);
    expect(b.access.locked.value).toBe(false);
    expect(b.fire.discharging.value).toBe(false);
    run(b, PREACTION_DELAY + 0.5);
    expect(b.fire.discharging.value).toBe(true);
    b.fire.riserValve.set(false);
    expect(b.fire.discharging.value).toBe(false);
  });

  it('latch a call point until it is reset with its key', () => {
    const b = createBuildingServices();
    b.fire.pressCallPoint();
    expect(b.fire.sounding.value).toBe(true);
    b.fire.panelKey.set(true);
    b.fire.reset();
    expect(b.fire.sounding.value).toBe(true);
    b.fire.resetCallPoint();
    expect(b.fire.sounding.value).toBe(false);
  });

  it('silence and evacuate only with the panel key turned', () => {
    const b = createBuildingServices();
    b.fire.pressCallPoint();
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
