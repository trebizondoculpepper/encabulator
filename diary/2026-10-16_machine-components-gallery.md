# Shared machine components and a larger dev0

Expanded dev0 to 20 × 16 m and replaced the six old device exhibits with seventeen separate full-size plinths. Each has supply, load/input, fault injection and repair controls, nonpressable status lamps, and a named real product reference. The original controls, displays and cabinet-fittings boards remain. `?room=dev0&view=components` gives an overview and `view=pedestals` a close inspection start.

Introduced one machine-device factory shared by dev0 and the MCC. Breakers, terminals, relays, PLC supply/processor/I/O/comms and the drive power stage now have component state and service actions alongside the existing contactor, overload, fuse, capacitor, motor and rack parts. Starter breaker/fuse/terminal/overload state affects the contactor; PLC outputs depend on supply and processor availability. Kept structural steel, rails, ducts and wiring as passive geometry. Replaced fictitious rack-format PLC cards with actual card-format 1771-style modules and separate instrument chassis.

Recorded manufacturer references and dimensional assumptions in `doc/research/machine-components.md` and shared reference metadata. Corrected the cartridge fuse, capacitor cans, contactor envelope, overload range, motor shaft height and bucket envelope. Views remain simplified representations; PLC firmware and semiconductor switching are not emulated.

Verified the gallery and open MCC visually in Chrome. Added tests for trip reset order, PLC power/fault propagation, analogue clamping, terminal isolation, gallery coverage and spacing, unscaled device placement, and the installed starter's breaker/fuse response. The door visibility, ventilation, back-close and raycast tests remain in place.

Typecheck, lint, formatting, all 284 tests and the production build passed. Left the unrelated untracked `pyproject.toml` untouched. Changes remain uncommitted.
