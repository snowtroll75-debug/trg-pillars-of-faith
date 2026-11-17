# Pillars of Faith 0.12.0: the automation audit

16 November 2026. Requires TRG Prime 3.689.1 or later; verified on 3.694.0. No core change is needed.

Graham asked for a full audit of every compendium entry against the mechanics it prints, live tests of every class from 1st to 20th level, and repairs to whatever fell short. Content, artwork, document ids and compendium layout are unchanged.

## What was wrong, and is now fixed

- **Race Speed broke characters.** The four races' Speed overwrote TRG Prime's speed pool with a bare number. From then on, any Speed bonus crashed the character's whole sheet preparation, so its level, saves and HP fell back:
  - Bone Stride and Pilgrim of Many Lives;
  - Blood Awakened;
  - the Beast Spirit's +10 ft;
  - Rejuvenating Surge.
  The races and Sevrai now write the pool's base.
- **The Healer worked only for the GM.** Healing another player's character told the player to "apply it on their sheet". Healing also ignored the Dying rule.
  - Healing now goes through the system's own heal: Dying −1 and no HP for a Dying creature; the Unconscious clear.
  - Temporary HP, condition reductions and Lifeline's hold go through the GM when the player does not own the target.
  - Affected: Gift of Healing (with Restorative Overflow), Healer's Touch, Restorative Hands, Lifeline, Lifebound Ward, Restorative Spores and Share the Wound.
- **Not Yet Finished** left you Dying at 1 HP. It now clears the Dying the blow gave.
- **Break the Evil Eye, Sever Influence and Sever Soulchain** now find a Curse, possession or Fear effect on the target, roll the Counteract, and end it on a success. Charm and Compulsion stay on the card; see UNRESOLVED U3.
- **Expel Possessor** now rolls and prints its rung, as Exorcise does. Its +4 PP warp pre-fills +2.
- **Plate of the Sealed Sepulchre's** essence resistance now holds only while the plate is worn.
- **Bloom Light and Lantern Glow** light the token, and count for the illumination around their bearer.
- **Blood Awakened and Perfected Aberration** now give real Fast Healing 1 at the start of each turn.
- **Vesperyn** gives Darkvision when the race already has Nightvision.
- **First Age Theologian** offers Intelligence in place of Wisdom in the dialog.

## Packaging

- Packs rebuilt from source and compacted. The shipped 0.11.4 packs pointed at a MANIFEST that was not in the archive, and pof-races held a stale second table.
- The loader, manifest, package.json and README agree on the version and the system requirement.

## Reports

These sit beside this file:
- `PILLARS_OF_FAITH_AUTOMATION_AUDIT.md`: all 661 entries;
- `…_REPAIR_REPORT.md`;
- `…_TEST_REPORT.md`;
- `…_UNRESOLVED.md`: five rulings wanted;
- `…_CORE_DEPENDENCIES.md`, which includes CD0: the core's own races have the same Speed crash;
- `CHANGELOG.md`.

## Harness

- **New:** `verify-audit`, 57 checks. On the 0.11.4 tree it reports 17 failures out of its first 22 checks.
- Every suite is re-pinned to 0.12.0 / 3.689.1.
- Total: 9,585 checks, all green.
