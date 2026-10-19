# Scenario console and Chrome wheel zoom

Pulled main; the remote was already up to date, and existing local work was preserved. Changed the shared studio switch to register its whole view as the use target, including its cap, printed legend, LED and bezel. Added raycast regression coverage across every simulator button after static merging.

Added a labeled two-line character LCD to the testing scenarios console. It begins at “standing by”, shows “resetting” briefly during reset, and displays “running scenario:” with the selected scenario on its second line. Slow start remains displayed until its steps finish; completed state-setting actions return to standby. Fault and symptom selections remain identified until another action is selected.

Fixed wheel event routing for pointer lock on the app: the shared first-person controller now receives document wheel events for the active captured room, or canvas wheel events when uncaptured. Other rooms and ordinary page scrolling are left alone. Added an event-routing regression test, including cleanup. Verified in Chrome that a press on the lower face of SLOW START works, its LCD identifies the scenario, and scrolling changes the view magnification.
