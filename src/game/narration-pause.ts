/** A quiet interval after speech, consumed by one unsolicited reminder. */
export function createNarrationPause(seconds = 20) {
  let quiet = 0;
  return {
    step(delta: number, speaking: boolean) {
      quiet = speaking ? 0 : quiet + delta;
    },
    take() {
      if (quiet < seconds) return false;
      quiet = 0;
      return true;
    },
  };
}
