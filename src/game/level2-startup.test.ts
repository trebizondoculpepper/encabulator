import { describe, expect, it } from 'vite-plus/test';
import { createLevel2Startup } from './level2-startup';

describe('Level 2 startup', () => {
  it('waits for the isolator, then the main power', () => {
    const startup = createLevel2Startup();
    expect(startup.step(false, false)).toBeNull();
    expect(startup.step(true, false)).toBe('main');
    expect(startup.step(true, false)).toBeNull();
    expect(startup.step(true, true)).toBe('ready');
    expect(startup.step(true, true)).toBeNull();
  });
  it('requires the main power to be operated after the isolator', () => {
    const startup = createLevel2Startup();
    expect(startup.step(false, true)).toBeNull();
    expect(startup.step(true, true)).toBe('main-reset');
    expect(startup.step(true, true)).toBeNull();
    expect(startup.step(true, false)).toBeNull();
    expect(startup.step(true, true)).toBe('ready');
  });
  it('returns to the isolator instruction if the incoming feed is lost', () => {
    const startup = createLevel2Startup();
    expect(startup.step(true, false)).toBe('main');
    expect(startup.step(false, false)).toBe('isolator');
    expect(startup.step(true, false)).toBe('main');
    expect(startup.step(true, true)).toBe('ready');
  });
});
