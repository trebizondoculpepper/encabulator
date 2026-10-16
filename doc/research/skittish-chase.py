# How fast must dev9's SKITTISH button run to be uncatchable?
# (doc/research/skittish-chase.md). Usage: python3 skittish-chase.py 1.5 1.8
# Needs numpy and scipy; each ratio takes several minutes.
#
# Lion and (faster) man on a circle of radius R, man reversing whenever the
# lion gets ahead. In the frame turning with the man, the lion's state is its
# radius rho and its lag psi >= 0 behind the man; with speed 1 and heading
# theta (0 = straight out, + = forward):
#   d rho / dt = cos theta,   d psi / dt = (w rho - sin theta) / rho,  w = k/R.
# V(rho, psi) = least distance it can ever come to the man from there.
# Semi-Lagrangian value iteration with bilinear interpolation.
import numpy as np, sys, os
from scipy.ndimage import map_coordinates
R = float(os.environ.get('R', 5.4)); RMAX = R + 0.35
nr, npsi = 300, 400
rho = np.linspace(0, RMAX, nr); psi = np.linspace(0, np.pi, npsi)
P, S = np.meshgrid(rho, psi, indexing='ij')
dist = np.sqrt(np.maximum(0, R * R + P * P - 2 * R * P * np.cos(S)))
def solve(k, dt=0.01):
    w = k / R
    V = dist.copy()
    thetas = np.linspace(-np.pi, np.pi, 48, endpoint=False)
    for it in range(4000):
        best = V.copy()
        for t in thetas:
            r2 = np.clip(P + np.cos(t) * dt, 0, RMAX)
            q2 = S + (w * P - np.sin(t)) / np.maximum(P, 1e-3) * dt
            q2 = np.abs(q2)  # the man reverses: ahead is behind
            q2 = np.where(q2 > np.pi, 2 * np.pi - q2, q2)
            v = map_coordinates(V, [r2 / RMAX * (nr - 1), q2 / np.pi * (npsi - 1)], order=1, mode='nearest')
            best = np.minimum(best, v)
        change = np.abs(best - V).max()
        V = best
        if change < 1e-7: break
    return V
for k in [float(a) for a in sys.argv[1:]]:
    V = solve(k)
    # Starts: anywhere at least 2.5 m from the man (it stands till then).
    start = dist >= 2.5
    print(k, 'worst', round(V[start].min(), 3), flush=True)
