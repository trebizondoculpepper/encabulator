# Breaker indication and queued design work

Added a labeled status indicator to the shared moulded-case breaker view. Its part supplies upstream power independently of contact position: black without incoming power, red when supplied but open or tripped, green when supplied and closed. Automation's existing dedicated isolator indicator remains in place. Focused tests cover all three colours, supply loss with the handle OFF, and the tripped state. Type checking and lint passed.

Saved future implementation prompts for phase-selector voltage/load feedback, Level 0 machine controls initially OFF, and the freestanding machine's cabinet backs. Each has an explicit report return path. No phase-voltage, default-position or cabinet-back geometry change was made as part of writing those prompts.
