# Pillars of Faith 0.12.5: after the live test of 0.12.4

17 November 2026. Requires TRG Prime 3.696.0, verified on 3.696.1. Document ids and the compendium content are unchanged from 0.12.4.

## Fixed

- **A reroll said its result twice.** The card read "Continuity Unbroken: rerolled with advantage (5 and 10); the better, 10, stands…" and then "Continuity Unbroken: rerolled with advantage; the better result stands." TRG Prime's own line already says it all. The module now adds a line only when an ally answered, for example "Spirit Intercession: TEMP Shaman intercedes for TEMP Seer."

## Install note: one stale compendium entry was found

The installed 0.12.4 served the 0.12.3 copy of **Deep-Rooted Ironcap**: the old sheet line, and no forced-movement effect.
- Every other entry in all 22 compendiums matched the 0.12.4 build, and the ZIP itself held the new Ironcap.
- The likeliest cause is an old database fragment left in `modules/trg-pillars-of-faith/packs/pof-feats` by installing over the previous folder.

**To install 0.12.5:**
1. Stop Foundry.
2. Delete the `trg-pillars-of-faith` module folder.
3. Install the ZIP fresh.

With the effect added by hand, Ironcap's reduction worked live: a 10-foot push became 5 feet, and a 5-foot push did not move the creature.

## Live test of 0.12.4 (17 November 2026, temporary actors only)

| Entry | Result |
|---|---|
| Continuity Unbroken | **Passed.** Asked on a failed Will save against possession. Rerolled with advantage, and the better result (10 over 5) stood. The Focus use was spent. |
| Vowbound Resolve | **Passed.** Asked on a failed skill check, rerolled with advantage, and the better result (17 over 5) stood. |
| Revelation in Crisis | **Passed.** Asked; Revelatory Script (Read Aura's Focus use) was expended, and the better result (15 over 14) stood. |
| Spirit Intercession (ally) | **Passed.** A level-8 TEMP Shaman 10 feet away was asked when the TEMP Seer failed. The Shaman's use was spent, and the better result (4 over −10) stood. At 35 feet it was not asked. Answering No kept the use. |
| Redundant Anatomy | **Passed.** Asked after a Serious critical injury. Yes spent the daily use, and the card read it as Minor. Once the use was spent, it was not asked again. |
| Hunter's Fangs | **Passed.** A critical injury from the Fangs laid Bleed 1 on the living target, which added to the injury's own Bleeding. |
| Blood Awakened | **Passed.** The Use put the rider on its effect. A Fangs hit added 3 essence as its own packet (30 → 26 HP with 1 piercing). TEMP Brute is a character, so it counted as living. |
| Break the Evil Eye (warped) | **Passed.** The dialog read "choose up to 2", with "None of these", and each chosen effect got its own counteract check. |
| Ossuary Lamellar | **Passed.** Worn: 5 slashing → 4, 5 piercing → 5. Stowed: 5 slashing → 5. |
| Ossuary Board | **Passed, after a core fix.** The Shove was made with the board, and the card named it. Found: shield proficiency was read as weapon proficiency. Fixed in TRG Prime 3.696.1. |
| Deep-Rooted Ironcap | **Passed with the effect added by hand.** See the install note. |
| Final Sanction | **Passed.** After Inquisition and Judgement, a critical against the Subject laid "−1 status to DB". Found: the card line named it twice. Fixed in 3.696.1. |
| Judgement on a Grimward spell; Expert Autopsist's Critical | **Not tested live.** These are covered by the harness only. |

The temporary scene, five temporary actors and their 37 chat messages were deleted afterwards. Borin Slatevein and the other characters were untouched (Borin: 60/60 HP, no new effects).
