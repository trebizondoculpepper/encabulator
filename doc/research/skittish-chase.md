# The skittish button: an uncatchable escape

Dev9's SKITTISH button should never be caught. Before 2026-10-16 it fled greedily, each frame stepping to whichever nearby spot was furthest from the player, and that strategy loses: it runs to a wall, then into a corner, and is pinned there. This note records what the mathematics of pursuit says, what the stand now does (`src/game/mobile-pedestal.ts`) and how its speed was chosen.

## The literature

The problem is the "lion and man" pursuit-evasion game, posed by Richard Rado in the 1920s and treated generally by Rufus Isaacs in _Differential Games_ (1965).

- With equal speeds and capture only on contact, A. S. Besicovitch showed the man survives forever in a round arena, though the lion gets arbitrarily close.
- With a capture radius (caught when within some distance, as our button is, being pressable), the lion always wins in a bounded arena at equal speeds (Alonso, Goldstein and Reingold).
- A faster man can survive. How much faster, for a given arena and capture radius, was studied by Flynn ("Lion and man: the boundary constraint") and Breakwell ("Pursuit of a faster evader"); see [Pursuit of a faster evader in a circular arena](https://link.springer.com/article/10.1007/BF00941070).
- The points an evader can reach before a pursuer are bounded by the Apollonius circle (with a capture radius, a Cartesian oval): [One Apollonius Circle is Enough for Many Pursuit-Evasion Games](https://arxiv.org/pdf/2111.09205).

## The strategy

The faster man's strategy is simple: keep to a circle (the loop) and run round it away from the lion, reversing whenever the lion cuts ahead. Dev9's loop is the largest circle in the room less 0.6 m (radius 5.4 m in the 16 × 12 m room), so the player cannot get round the outside of it. Off the loop (at home, or where TERRIFIED left it), the stand makes for the point of the loop it can reach with the most time to spare before the player could. It runs only when the player comes within 2.5 m, and turns its button away.

## The speed

The simple bound is that a lion keeping level with the man on a radius cannot get further out than R/k (k the speed ratio), so the man is safe if k > R/(R − c): 1.29 for R = 5.4 m and a catching distance c = 1.2 m. That bound is wrong: a lion that lags a little behind the man can still get further out, and closer.

So the chase was solved exactly (`skittish-chase.py`). In the frame turning with the man, the lion's state is its radius and how far it lags; the man reversing makes lagging and leading the same. A value function, the least distance the lion can ever come from each state, was found by semi-Lagrangian value iteration, and its least value over every start at least 2.5 m from the man (where the man starts running) is the closest any chaser can come:

| Speed ratio | Closest approach (m) |
| ----------- | -------------------- |
| 1.3         | 0.47                 |
| 1.5         | 0.88                 |
| 1.68        | 1.22                 |
| 1.75        | 1.34                 |
| 1.8         | 1.42                 |
| 2.0         | 1.71                 |

The stand runs at 1.8 times the player's speed (`ORBIT_RATIO`), above the ratio of about 1.67 at which the best chaser would reach 1.2 m, and the best chaser comes no nearer than 1.42 m: 3.6 m/s against a walking player, 7.6 m/s against a running one. A test chases it with seven strategies (pure pursuit, two lead pursuits, the lion keeping level on a radius, running head-on round the loop, ambushing ahead and a change of plan), walking and running from six starts; none comes within 1.7 m.

The physical controller now eases changes of SKITTISH speed with a 0.10-second response and coasts along the same circle while stopping. The table above describes the constant-speed pursuit model; it does not model acceleration. The same multi-strategy chase regression still checks the actual eased controller against the button's catching distance.
