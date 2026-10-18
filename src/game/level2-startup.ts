/** Two mundane operations, deliberately completed in order. */
export function createLevel2Startup() {
  let stage: 'isolator' | 'main' | 'ready' = 'isolator';
  let mainArmed = false;
  return {
    step(incoming: boolean, main: boolean) {
      if (stage === 'ready') return null;
      if (!incoming) {
        if (stage === 'isolator') return null;
        stage = 'isolator';
        mainArmed = false;
        return 'isolator' as const;
      }
      if (stage === 'isolator') {
        stage = 'main';
        mainArmed = !main;
        return main ? ('main-reset' as const) : ('main' as const);
      }
      if (!main) mainArmed = true;
      if (main && mainArmed) {
        stage = 'ready';
        return 'ready' as const;
      }
      return null;
    },
  };
}
