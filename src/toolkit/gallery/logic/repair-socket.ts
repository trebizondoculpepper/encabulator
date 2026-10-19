/** A keyed, isolated service socket selected by the player's aim ray. */
export type SocketRefusal = 'live' | 'occupied' | 'wrong-part' | 'wrong-board';

export function socketDecision(input: {
  live: boolean;
  occupied: boolean;
  partKind: string;
  socketKind: string;
  partBoard: number;
  socketBoard: number;
}): 'insert' | SocketRefusal {
  if (input.live) return 'live';
  if (input.occupied) return 'occupied';
  if (input.partKind !== input.socketKind) return 'wrong-part';
  if (input.partBoard !== input.socketBoard) return 'wrong-board';
  return 'insert';
}
