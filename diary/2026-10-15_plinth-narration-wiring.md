# Plinth narration wired into dev5

Prepared 31 browser-ready mono MP3s from the numbered `resources/sound/narrations/rhombus_room/` WAVs: 44.1 kHz, 96 kb/s, 80 Hz high-pass and FFmpeg loudnorm targeting -16 LUFS and -1.5 dB true peak. The WAVs remain working assets; the MP3s in `src/audio/assets/narration/plinths/` are bundled for game playback.

Added a pure narration selector for room entry, shape arrivals, direct moves between shapes, repeat visits, lingering, leaving, time in darkness and the exit. It rotates alternate lines, uses the room's arrival history, and plays the numbered script lines through a browser audio player after a gesture. More immediate moments can interrupt lesser lines; the player pauses while dev5 is hidden. Added a portal to the Hall at the far east wall for the narrated exit. The first room-entry line is offered once per retained room session.

The five CI checks passed: typecheck, lint, format check, 204 tests and build. Chrome showed dev5 rendering with the updated room note. The owner can check the actual sound mix and timing in the browser.
