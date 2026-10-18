# BBC Micro and Cub comparison model

Creator: Ant Mercer, https://merkerwork.co.uk/. Originally made for IDESINE's Acorn: A World in Pixels. Downloaded unchanged on 18 October 2026 from https://virtual.bbcmic.ro/virtual-beeb/models/beeb.glb (4,028,952 bytes, embedded textures). Dominic Pajak's project history explains obtaining permission and exporting the Blender model to GLTF: https://www.dompajak.com/blog/webxr-beeb-virtual-beeb/index.html.

VirtualBeeb states CC BY-NC-SA 4.0 for its website (https://creativecommons.org/licenses/by-nc-sa/4.0/). Separate model rights for this project have not been independently confirmed. Retain creator attribution and the stated non-commercial/share-alike conditions; confirm appropriate rights before production/commercial use. Full credit is in CREDITS.md. The development-only comparison loader adapts its screen and power control at runtime without modifying this source GLB. It is not a production asset.

## Low-detail derivative

`beeb-low.glb` is a local development derivative of the credited original, reduced from 53,685 to 13,303 triangles and from 4,028,952 to 2,726,008 bytes. Regenerate from the original with `npx --yes @gltf-transform/cli@4.5.1 optimize resources/models/bbc-micro/virtualbeeb/beeb.glb resources/models/bbc-micro/virtualbeeb/beeb-low.glb --compress false --texture-compress false --texture-size 1024 --simplify-ratio .05 --simplify-error .025 --join false --flatten false --instance false --palette false`. No decoder is needed at runtime. The same source attribution and rights restrictions apply.

The runtime replaces keycaps with low-detail boxes combined into one unlettered vertex-coloured mesh, merges static geometry by material, replaces transmission materials with ordinary opaque materials and replaces the demonstration screen with inset curved glass and the live BBC display. The physical power rocker remains interactive. The original GLB is retained unchanged for provenance.
