# The Retro Encabulator film and its machine

## The film

Rockwell Automation's "Retro Encabulator" is a short promotional parody from the late 1990s: a presenter in a grey suit explains, in fluent nonsense, a product that does not exist. It descends from the 1944 "turbo-encabulator" spoof and its 1977 filmed version. The copy studied is the two-minute upload at https://www.youtube.com/watch?v=RXJKdh1KZ0w (stills were taken locally for study and are not kept in the repository).

## The machine behind the presenter

The equipment on the set is real: an Allen-Bradley CENTERLINE motor control centre, a line-up of grey steel sections, each holding stacked plug-in units ("buckets"), with Reliance Electric, Dodge and Rockwell Software branding on the backdrop and an Allen-Bradley motor on a blue pedestal. Its schematics and parts are those of any 480 V motor control centre of the period.

What the stills show, and where each landed in dev0:

| Seen in the film                                                 | What it is                                                                                                         | In dev0                                                  |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| Red lever handles on each unit door                              | Flange-mounted operating handle of the unit's breaker: ON, OFF and TRIPPED, padlockable, interlocked with the door | `createOperatingHandle`, motor control unit pedestal     |
| Vertical stacks of red, green and black round buttons and lenses | 30 mm oiltight pilot devices: START, STOP, push-to-test pilot lights                                               | CONTROLS board, pilot lights on the DISPLAYS board       |
| Small two-line blue-green display high on a section              | Plant message display (vacuum fluorescent)                                                                         | Message display, DISPLAYS board                          |
| Grey terminal with a blue screen and keys                        | Operator terminal with function keys and keypad                                                                    | Operator terminal, DISPLAYS board                        |
| Small charcoal keypads with an LCD on lower units                | AC drive human interface modules                                                                                   | Drive keypad, DISPLAYS board                             |
| An open unit, its breaker and starters inside                    | Combination starter: breaker, contactor, overload relay, control transformer and fuses, terminal blocks            | Pedestals: unit, contactor, overload relay, control fuse |
| Engraved white-on-black labels on each unit                      | Phenolic nameplates                                                                                                | `createNameplate` on units and pedestals                 |
| Stainless motor with a blue A-B badge on a pedestal              | TEFC induction motor                                                                                               | Motor pedestal                                           |

Things a 1990s motor control centre would also have, added to round out the set: a mushroom-head emergency stop, HAND-OFF-AUTO and key selectors, a speed potentiometer, switchboard ammeter and voltmeter, a red LED digital panel meter, an elapsed-time meter, a stack light, and the drive's DC bus capacitors (a part that can fail spectacularly).
