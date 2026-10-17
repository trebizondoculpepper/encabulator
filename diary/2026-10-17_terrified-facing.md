# Update SKITTISH and face the player in TERRIFIED

Fast-forwarded main to origin/main at 05d2b53, bringing in the circular lion-and-man SKITTISH behaviour. Temporarily stashed only local AGENTS.md edits, then restored them with a clean automatic merge; all ongoing cabinet, card-handling and scenario work remains uncommitted and intact. Restarted the Vite dev server on 127.0.0.1:5174.

Changed TERRIFIED to turn towards the player's current position throughout its flight, at its destination and after surrender, replacing both its outward travel heading and room-centre final approach. Preserved bounded turning speed, corner selection, three evasions and surrender. Tests now use an off-centre player and cover initial flight and surrender as well as all four corner approaches.

SKITTISH now also turns towards the player when their walking speed falls below 0.05 m/s, ignoring tiny movement jitter. This applies while it waits at a safe distance as well as during escape. When the player moves and threatens it again, it turns away as before; the pursuit loop and running speed are unchanged. Added stationary-facing and resumed-flight orientation checks.

Added physical speed easing to NORMAL, SKITTISH and TERRIFIED, alongside EAGER's existing integrated smoothstep journeys. Reactive modes integrate exponential speed ramps (a quicker response for SKITTISH), slow near finite destinations and ease their angular velocity with a turn-rate/acceleration cap. SKITTISH coasts along its loop when braking, preserving the circular route. Added checks for acceleration and braking at home, coasting to a halt on the loop and a ramped TERRIFIED turn; existing pursuit and corner-evasion tests still pass.
