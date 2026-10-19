# Placement targets and live repair insertion

Extended the shared carried-object target feedback to bins, skips and gallery plinths. Bins use the same proximity rule for the green circle and the actual toss; an aimed bin outside that range rejects the action. Empty plinths accept any carried exhibit, occupied plinths reject it, and gallery restocking respects returned objects. Dev0 reset retains the original exhibit home. Added regression coverage for placement, occupancy changes, pickup after placement and bin feedback.

Found Cordy's Mop And Bucket PBR set on TurboSquid as a potential replacement for the corridor's procedural janitorial prop: https://www.turbosquid.com/3d-models/3d-mop-and-bucket-pbr-1783635. The listing reports 4,877 polygons and a $29 price. No purchase or asset import was made; the current corridor model remains in place.

Repair-room service sockets now permit compatible parts to be inserted while powered. At the end of the insertion animation, a powered socket produces the existing electrical arc, crack and brief dazzle used for live extraction. Power is checked at contact, so isolating during insertion prevents the arc. Wrong part types and occupied sockets remain rejected; compatible cards can be shared between boards. This changes repair-room handling only.
