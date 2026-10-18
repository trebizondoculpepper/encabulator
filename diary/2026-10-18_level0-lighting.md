# Level 0 warehouse lighting

Connected the two warehouse wall switches as a two-way pair controlling all twelve overhead luminaires and their actual scene lights. Level 0 supplies a shared architectural services instance to its lighting fittings and distribution board, so the lighting breaker and main supply also affect the lights. Emergency and exit lighting retain their separate supply behaviour. Other warehouse scenes retain their existing defaults.

Halved Level 0's daylight illumination so switching the overhead fittings makes a more noticeable difference. An unlit luminaire now uses shaded diffuser plastic instead of a self-lit material. No occupancy timeout was added to the warehouse.

Verified both physical switch actions, scene-light output, unchanged daylight and the distinction between wall-switch off and lighting supply failure in the architectural fittings integration test. Type checking and lint passed. Cabinet rear construction was discussed separately; no rear geometry was changed.

Confirmed the existing shared cabinet-door behaviour: both black fasteners toggle their door and the vented rear surface closes it only when open. Added full-machine raycast regression coverage for both fasteners approached from either side, alongside the existing rear-cover closing test.
