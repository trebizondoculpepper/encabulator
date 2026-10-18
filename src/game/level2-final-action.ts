/** A fresh TEST press after the recovery speech licenses the final failure. */
export function createLevel2FinalAction() {
  let baseline: number | null = null;
  let taken = false;
  return {
    arm(presses: number) {
      baseline = presses;
    },
    take(presses: number, speaking: boolean) {
      if (baseline === null || taken || speaking || presses <= baseline)
        return false;
      taken = true;
      return true;
    },
  };
}
