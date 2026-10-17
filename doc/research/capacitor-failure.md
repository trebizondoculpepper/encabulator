# Single electrolytic capacitor

The loose pedestal component follows the [Chemi-Con KMQ EKMQ401VSN681MA45S](https://www.chemi-con.co.jp/en/products/detail-condenser.php?part_number=EKMQ401VSN681MA45S): a 680 µF, 400 V snap-in can, 35 mm in diameter and 45 mm long. The in-world maker and sleeve lettering are fictional. The board-mounted versions reuse the same view with their existing 50 mm can length.

The failed appearance is informed by [this split-vent photograph](https://commons.wikimedia.org/wiki/File:Blown_up_electrolytic_capacitor.jpg) and [Chemi-Con's pressure-vent explanation](https://www.chemi-con.co.jp/en/faq/detail.php?id=alVent): a swollen can, a domed top split along its scoring, darkened sleeve and discoloured metal around the opening. The photograph is a visual reference only and is not shipped as an asset.

The failure event is deliberately theatrical: one 65 ms blue-white flash, 3–5 individual orange embers emitted once from the top and three seconds of fading smoke. These timings are game presentation choices, not a simulation of a particular real failure. Health, failure age, flash, ember count and smoke are exposed by the shared capacitor component. A failed capacitor stays failed until explicitly replaced; calling fail again does not restart the effects.

Attachment is explicit: the loose gallery capacitor is detachable, while a capacitor mounted on a board is fixed. Dev0's LOCK / RELEASE switch can temporarily inhibit pickup without changing that inherent attachment property.
