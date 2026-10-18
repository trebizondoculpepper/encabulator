# VFD knob and keypad hit areas

Investigated the reported stuck VFD-601 SPEED knob and unresponsive small-console buttons, treating the latter as the VFD keypad pending clarification. The world bindings and central front/oblique hit tests worked, but the potentiometer’s visible mounting ring and the keys’ narrow black bezels had no registered use. Clicks on those surfaces stopped without reaching the control.

Registered each potentiometer’s view group and each drive-keypad key’s group as its use target, including the visible ring or bezel. This preserves left/right knob direction, power guards, individual key actions and the shared input scheme. Regression tests cast actual rays through the MCC, check that every VFD input is reachable, change the bound speed through the ring and start the drive through the START key edge. These failed on the missing hit targets before the fix and pass afterward.

Validation: the new hit-area regressions pass, as do the complete VFD machine tests. Type checking, linting, formatting and the build passed. The full suite finished with 692 passing and two failing architectural-fitting tests, where the concurrently edited warehouse sprinkler setup supplies an undefined head; these failures are outside this control fix.

The owner still found the knob and keypad completely silent. A live browser click trace revealed the actual blocker: a hidden `SmokeEmitter` sprite in the new Level0 failure effects was the nearest ray hit. Three.js raycasting does not skip invisible ancestors or transparent sprites. Marked every smoke sprite as non-interactive in the shared emitter, so smoke cannot block controls in any room. Extended the VFD regression to include the actual failure effects and a correctly positioned viewing camera: it fails before this fix and passes afterward. Removed the temporary DOM click diagnostics after tracing the hit.

Final validation: all five required checks passed, including all 703 tests across 93 files.
