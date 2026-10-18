# BBC Micro steady-state fanfare

The owner reported an early fanfare. The stack light previously went green whenever the machine had no standing fault and had finished building whatever partial dimensional stage its current controls allowed. That could announce success before full operation.

Added a shared `plant.steady` output requiring healthy, operating automation with all six dimensional conditions satisfied and all six dimensions built. Level0 keeps its stack light amber through incomplete startup, gates the BBC readiness event on this output and the green lamp, and uses the same condition for the diagnostic screen’s STEADY / NOMINAL message. The existing powered-on requirement and one-shot fanfare handling remain in place.

Regression coverage runs the real machine through a settled partial startup without a fanfare, then completes startup and expects exactly one fanfare. Unrelated ongoing Level0 symptom and simulator changes are left in place.

Validation: 67 relevant tests passed across the real-machine startup, diagnostics, process model, workstation audio and BBC logic suites. Type checking, linting, formatting and the production build passed.
