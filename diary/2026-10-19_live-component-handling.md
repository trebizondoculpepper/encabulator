# Live component handling is a consequence, not a safety lock

Recorded the owner's design rule in AGENTS.md: the machine is intentionally easy to damage, and detachable components can be removed and inserted while powered. Isolation affects the result rather than permission. Compatible sockets and occupancy remain physical restrictions; fixed or soldered parts retain their attachment setting.

Removed Level0's cabinet-power pickup locks and reseating refusals for its automation cards and VFD capacitor board. Live pickup and insertion use a reusable live-contact part with sparks, a crack and random follow-up spits, and the existing discharge flash/afterimage system. Isolated handling remains quiet and damaged components remain damaged after reinsertion. Level2's cards likewise no longer have power or narrative pickup locks; its narrative still observes removed cards when the repair sequence is reached. The repair workshop already allows live handling.

Added regression coverage for live capacitor-board and card handling, occupied-place refusal, quiet isolated handling, and preservation of component failure through live reseating.
