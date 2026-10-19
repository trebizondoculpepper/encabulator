import type { LoopSide } from './dev-corridor-plan';

/**
 * Which of the courtyard's four doors the player last went through, so
 * that the corridor and the courtyard, each a room of its own, put the
 * player at the matching door when they pass between them: the corridor's
 * north side's inner door and the courtyard's north wall's door are one
 * doorway, and so on round.
 */
export const courtyardLink: { side: LoopSide } = { side: 'north' };
