# Development Diary Entry - 2026-10-16

## Context

- **Date**: 2026-10-16 17:00 UTC
- **Branch**: main
- **Commit**: (this commit)
- **Contributors**: Claude Code + User

## Problem Statement

The owner found that dev9's SKITTISH button could be chased into a corner and pressed. They asked whether mathematicians had studied two-dimensional chase and evasion, suspecting an optimal escape existed and might be simple, and then asked that SKITTISH be that optimal strategy, with its speed set so it can never be caught.

## Our Approach

A simulation of a simple chaser reproduced the trap: the old greedy flee (step to whichever nearby spot is furthest from the player) ran to a wall, then a corner, every time. The literature is the "lion and man" game (Rado, Besicovitch, Isaacs, Flynn, Breakwell): with a catching distance, an equally fast lion always wins in a bounded room, but a faster man survives by running round a circle away from the lion. We adopted that: a loop 0.6 m inside the nearer walls, run round away from the player, reversing when they cut ahead, joined at the point with the most time to spare.

## Implementation

`orbitOf`, `orbitStep`, `fleeSpeed` and `ORBIT_RATIO` replace `fleeStep` in `src/game/mobile-pedestal.ts`; `stepStand` and `createStandMotion` carry the loop direction. New tests check the loop, reversal, joining from home and from a corner, the top speed, and a never-caught chase by seven chasing strategies. The derivation is in `doc/research/skittish-chase.md`, with the solver `doc/research/skittish-chase.py`.

## Outcomes

- The textbook bound R/(R − c) (1.29 here) turned out to be wrong for this game: a chaser lagging a little behind can get closer than one keeping level, and a lead-pursuit chaser reached 1.19 m at 1.48 times. Solving the chase exactly as a value function (radius and lag, in the frame turning with the stand) gave the true threshold, about 1.67 for a 1.2 m catching distance, and we chose 1.8, at which the best possible chaser comes no nearer than 1.42 m.
- Two first attempts at the solver were biased by rounding on a grid (one moved points by whole cells, the other discarded progress within a cell); the semi-Lagrangian value iteration converged.
- In the browser, a full-speed chaser never came within 1.9 m in 15 s.

## Next Steps

At 1.8 times a running player the stand reaches 7.6 m/s, which is startling for a trolley; that is the price of never being caught in a room this size. The owner may want to try it by hand on a phone and a gamepad.
