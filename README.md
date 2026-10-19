# Encabulator

Choose a room at https://trebizondoculpepper.github.io/encabulator/ (the Hall: https://trebizondoculpepper.github.io/encabulator/?room=hall). Every push to `main` that passes CI is deployed there.

A browser game about a mysterious machine whose operation is stupid, opaque and profoundly unsafe, after Rockwell Automation's Retro Encabulator film. It is set in an American plant in the late 1990s.

The machine is not built yet. The game currently has development rooms, the Hall and a Rhombus mini-game:

- `?room=dev0` Controls and Displays: 30 mm pilot devices, plant displays, and the working parts of a motor control unit on test pedestals (a breaker and its door, a contactor, an overload relay, a fuse, a drive's capacitors, a motor), every one working and able to fail.
- `?room=dev1` Effects: end-state effects carried over from the VX3 Simulator.
- `?room=dev2` Hallucinations: apparitions, ghosting and geometric patterns.
- `?room=hall` The Hall: the vast concrete hall the game will take place in, with a door station to every other room and a console desk to change its materials and light.
- `?room=dev3` Racks: rack cabinets and rack-mount units of every kind, built to catalogue dimensions.
- `?room=dev6` Retro Encabulator MCC: a seven-section CENTERLINE-style motor-control lineup with opening buckets and modelled interiors.
- `?room=dev7` Corridor: a zig-zagging basement service passage with access to a locker room, plant room, service bay and lift lobby, modelled from the photographs in `resources/reference/underground-corridors/`.

- `?room=rhombus` Rhombus mini-game: a narrated gallery with three mysterious shapes.

The old `?room=dev4` and `?room=dev5` URLs still open the Hall and Rhombus respectively.

Walk into the coloured patch on a wall to go to the room it names.

```sh
npm ci
npm run dev   # http://127.0.0.1:5174/
```

Walk with WASD, click or press E to work a part, turn a knob down or up by clicking its left or right half, and press Esc to free the cursor. See `AGENTS.md` for how it is put together, `CREDITS.md` for the sounds, and `resources/sound/README.md` for the working sound library.
