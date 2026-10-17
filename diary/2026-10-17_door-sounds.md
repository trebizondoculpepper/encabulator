# Varied and quieter door movements

Added ten CC0 metal-door movement cues, cut from nine separate Joseph Sardin movements and one rubberduck door recording. Large MCC doors and building access/fire doors share a shuffled rotation that uses every recording before refilling and prevents consecutive repeats. The door component remains responsible for one sound per transition, including doors with two latches and a rear closing surface.

Small cabinet hinge cues are about 10.5 dB quieter in playback gain, with lower peaks and a 2.8 kHz low-pass to soften the harsh squeak. Sources, licences and edit details are recorded in CREDITS.md and the audio asset notes; working masters and cut provenance live under resources/sound/effects/doors/.

Validation: typecheck, lint, formatting, all 306 tests and the production build passed. Confirmed the running Vite server serves both the new audio module and the fire-room module successfully.

Fire-room audio follow-up: evacuation tones now originate at both wall sounder-beacons, pausing during voice announcements from the ceiling speaker. The voice-alarm part now stops its current recording, clears delayed announcements and pauses its sequence when the room is suspended, preventing fire-room audio from leaking into dev9. Regression tests cover sound placement, suspension, delayed-message cancellation and resumption.
