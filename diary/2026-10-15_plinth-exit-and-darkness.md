# Plinth exit, spotlight fixtures and narration pacing

Dev5 now has a single Hall exit on its east wall. The former wall portals were removed, and the exit is modelled as a green steel door with a frame, kick plate, panic bar and illuminated EXIT sign. Dev3 still reaches dev5 through the Hall's door station. The portal network tests cover the new route.

The three overhead spotlights gained yokes, pivot pins, rear cooling fins and barn doors. Darkness line 11 now waits until 70 seconds away from a plinth; line 10 starts at 14 seconds and runs for about 25 seconds, leaving roughly 31 seconds of silence between them. The narration test checks the gap.

Typecheck, lint, format check and build passed. After updating the room-link expectation, all 195 tests passed.

The owner then heard clip 11 immediately after the intro. The 84-second intro had allowed the darkness timer to reach its threshold while it played, and clip 11 was queued. Timed narration now pauses during the intro; the intro also outranks plinth arrivals, which wait for it to finish, while the exit line can still interrupt it. All five checks passed again.

The intro was subsequently split into four self-contained passages at transcript and silence boundaries, delivered as clips 29 and 32–34 with 4.5-second pauses. A plinth arrival takes over after the current passage, so the rest of the intro does not force the player to wait. The cat interruption (“please, Nutmeg”), repeated line and unfinished retake were excluded after the complete warning “They change us. They make us feel.” Two playback tests cover the pauses and interruption. All five checks passed with 197 tests.

The owner specified three exact passage boundaries and asked for the second take of the final warning. The game files were recut as 29, 32 and 33; the third splices in the clean second take from the locally copied master at 88.02–96.08 seconds, including “dormant.” The earlier fourth passage file was removed. The owner also asked for a pause between messages about the same shape, so queued lines for that shape now wait five seconds after the current line ends.

The owner heard that the final “us” in “they will hurt us” was clipped from darkness clip 10. The working WAV's old end at 926.009 seconds of the master cut through the word, which ends around 926.04. Recut through 926.55 with the fade after the word, regenerated the game MP3, and corrected `clips.csv`.

Glowing yellow tape now marks a south-side route to the east exit, with arrows along both legs and the final approach. Its nearest edge is more than 7 m from the helix and farther from the other plinths, keeping it outside the 4 m activation zones.

Four illuminated green EXIT signs on steel poles now face approaching visitors along that route. Up arrows mark straight sections; a left arrow marks the turn north and a right arrow marks the final turn east. The poles stand outside the taped walking lane.

The owner also heard “everyone” clipped at the end of sphere clip 19. The word ends around 716.40 seconds in the master, after the old 716.298-second cut. Extended the working WAV to 717.0 seconds, regenerated its game MP3, and corrected `clips.csv`.
