/** Move a released board from the cabinet volume to the floor in front. */
export function ejectCabinetDrop(
  placement: { x: number; y: number; z: number; vx: number; vz: number },
  cabinet: { minX: number; maxX: number; back: number; front: number },
) {
  if (
    placement.x < cabinet.minX ||
    placement.x > cabinet.maxX ||
    placement.z < cabinet.back ||
    placement.z > cabinet.front + 0.12
  )
    return placement;
  return {
    ...placement,
    y: Math.max(placement.y, 0.35),
    z: cabinet.front + 0.22,
    vx: placement.vx * 0.25,
    vz: Math.max(0.8, Math.abs(placement.vz)),
  };
}
