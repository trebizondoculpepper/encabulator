# Diminishing dropped-board clatter

Replaced the three-click burst restarted at every board collision with one knock driven by actual normal collision speed. Impact amplitude falls faster than speed, and weaker impacts have shorter decays and lighter thumps. The existing restitution and settling physics produce the accelerating bounce timing; a short low-level filtered-noise scrape accompanies the initial sliding contact. Each new drop resets the component's impact count. No new recordings are used.

This follows the collision-controlled impact approach in [Menzies, Physically Motivated Environmental Sound Synthesis](https://link.springer.com/article/10.1155/2010/137878), and contact-dependent character described in [FoleyAutomatic](https://www.cs.mcgill.ca/~kry/pubs/foleyautomatic/foleyautomatic.pdf). The PCB sound is an artistic approximation, not a measured board model.

Regression tests verify diminishing collision speed, impact-count reset, strongly attenuating sound levels, absence of repeated bursts and a substantially quieter scrape.
