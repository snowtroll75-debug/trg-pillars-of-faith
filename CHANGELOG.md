# Changelog — TRG Prime: Pillars of Faith

The full notes for each release are in `release-notes-<version>.md` beside this file. This file is the running record.

## 0.12.5 — 17 November 2026

- **Fixed.** A keep-better reroll no longer prints its line twice. A line is added only when an ally answered.
- **Live test.** 0.12.4 was tested live: 12 entries passed, and Judgement on a Grimward spell and Expert Autopsist were not tested. See `release-notes-0.12.5.md`.
- **Reinstall.** The installed Deep-Rooted Ironcap was stale, so delete the module folder before installing.

## 0.12.4 — 16 November 2026 — on TRG Prime 3.696.0

**Requires TRG Prime 3.696.0.** Document ids are unchanged. Adopts the core proposals built in 3.696.0. Eleven class-C entries are automated (C 85 → 74); full notes are in `release-notes-0.12.4.md`.

- **Rerolls (F19).** Spirit Intercession, Continuity Unbroken, Vowbound Resolve and Revelation in Crisis are offered as the save fails. The system rerolls and keeps the better result.
- **Riders (F20).** Blood Awakened's Bite or Fangs adds 1d6 essence. Hunter's Fangs causes Bleed 1 on a critical.
- **Counteracts (F21).** Break the Evil Eye and Sever Influence always ask. Their "+1 additional effect" warps, and Sever Soulchain's, take a second effect.
- **Equipment and feats (F22–F26):**
  - Ossuary Lamellar: DR against slashing.
  - Deep-Rooted Ironcap: forced movement 5 feet shorter.
  - Ossuary Board: Shove with the bash.
  - Expert Autopsist: the Critical's +4.
  - Redundant Anatomy: offered after a critical injury.
- **Judgement and Final Sanction (F27).** Judgement reaches a Grimward spell. Final Sanction's −1 status to DB lands on a critical.
- **New:** `module/core-reactions.mjs`; `verify-audit` section P; `tools/audit-matrix/gen-audit-0124.py`.

## 0.12.3 — 16 November 2026 — on TRG Prime 3.695.0

**Requires TRG Prime 3.695.0.** Document ids are unchanged.

- **Eternal Resonance.** Fixed. 0.12.2's casting option never reached an innate cast: the core shows no Casting Conditions prompt for one (found live). The feat now declares `spellDCBonus` and `spellAttackBonus` rows (`innateOnly`, `itemCasts`), which TRG Prime 3.695.0 reads on every cast.
- **Mummy Rot.** It also declares `flags.trg-prime.cureSequence`, so a cast Remove Curse and Remove Disease (3.695.0) follow the order too. Cleansing Radiance now keeps its steps where the core does (`flags.trg-prime.cureSteps`), so a Cleansing Radiance step and a cast spell count towards the same cure.

## 0.12.2 — 16 November 2026 — rulings U6–U8

Requires TRG Prime 3.689.1+, verified on 3.694.0. Document ids unchanged.

- **F17.** Eternal Resonance: +1 racial to the attack roll and Save DC of every innate spell, as a required casting option (ruling U7).
- **F18.** Cleansing Radiance applies its effect directly, through the GM for another's creature (ruling U8). New relay action `cleanse`.
- **Mummy Rot** must be cured with Remove Curse and then Remove Disease, as Fiends & Fables says (declared `cureSequence`; Cleansing Radiance follows it). The core's Remove Disease does not yet: CD13.
- **U6.** Plate of the Sealed Sepulchre keeps plain essence Resistance.
- **H4.** The Liturgical Book sweep tolerates an item already removed.
- Installed 0.12.1 retested live (see the test report). verify-audit section O; 9,634 checks.

## 0.12.1 — 16 November 2026 — review fixes and rulings

Requires TRG Prime 3.689.1+, verified on 3.694.0. Document ids unchanged.

### Fixed

- **F11.** Elemental Spirit grants its bonus Verdant cantrip of the chosen element, outside cantrips known. A character who chose earlier Uses it again to take it.
- **F12.** Second Discipline no longer brings the second discipline's 7th-level Advanced Specialist Spell (`module/second-discipline.mjs`).
- **F13.** Sacred Marginalia's Use adds its four Divinity spells to the Prayer Book, outside the level ladder.
- **F14.** The Liturgist's book records its spells. The daily selection and Liturgy of Prayer's pick are granted spells, swept at daily preparation or at the end of the turn. Liturgy of Prayer is limited to recorded spells. New `module/liturgy.mjs`.
- **F15.** The Lantern of the Veil (20 ft) and the Lantern of the Last Road relic (30 ft) shed registered magical light while held and invested. The relic gives Resistance to essence. New `module/item-lights.mjs`.
- **F16.** Final Toll's Use lands its ladder: no Reactions, −1 status to attacks and Slowed 1. Sacred Toll stays expended.

### Rulings (Graham, 16 November 2026)

- **U1.** Gift of Healing's and Healer's Touch's extra HP does nothing on a Dying recipient.
- **U2.** Lumeri/Lumari light is magical.
- **U3.** Break the Evil Eye and Sever Influence counteract Enchantment, with the voluntary-effect warning.
- **U4.** Effects on Invested-trait items wait for Invest Item (module half). The core half is `core-patches/core-invested-conditionals.diff`, not applied.
- **U5.** Lifeline and Not Yet Finished set Fatigued to at least 1.

### Audit

- The inventory had cut every description at 600 characters, which hid most sheet lines from the classifier. Re-run with full text and a broader manual-step scan: A 318, B 222, C 86, D 35.
- New `verify-audit` sections J–N (89 checks).

## 0.12.0 — 16 November 2026 — the automation audit

Requires TRG Prime 3.689.1+, verified on 3.694.0. Document ids unchanged.

### Fixed

- **F1 (critical).** Race Speed (Eshari, Kethrani, Myrathi, Rhevani) and Sevrai's +5 ft write `system.combat.movement.land.base`. The bare node replaced the speed pool, and any later Speed bonus crashed actor preparation.
- **F2 (major).** Healer abilities and the healing feats heal through TRG Prime's `healActor`: the Dying rule, the Unconscious clear, and the GM relay. Temporary HP, condition steps and Lifeline go through the module socket for creatures the player does not own. New `module/relay.mjs`.
- **F3.** Break the Evil Eye, Sever Influence and Sever Soulchain carry the core `counteract` row (curse/possession/fear; curse/possession; possession).
- **F4.** Expel Possessor rolls a `counteractRoll` like Exorcise; its +4 PP warp gives +2 circumstance.
- **F5.** An item effect flagged `worn` is suppressed while the item is unequipped (Plate of the Sealed Sepulchre). New `module/worn-effects.mjs`, through `registerEffectSuppressor`.
- **F6.** Bloom Light and Lantern Glow are registered light sources; the token is lit and restored.
- **F7.** Blood Awakened and Perfected Aberration declare `fastHealing: 1`.
- **F8.** Vesperyn grants Darkvision in place of a duplicate Nightvision. New `module/vesperyn.mjs`.
- **F9.** Not Yet Finished clears the Dying the blow gave (shared Lifeline step).
- **F10.** First Age Theologian offers Intelligence for Wisdom (`valueFrom: "intelligence-wisdom"`).

### Changed

- The loader requires 3.689.1, matching the manifest. The manifest records `verified: 3.694.0`.
- All 22 packs rebuilt and compacted.
- Harness re-pinned to 0.12.0 / 3.689.1.
- `verify-classes` reads the repertoire call where TRG Prime 3.674.0 moved it.
- `verify-feats` normalises scaled conditional rows.
- `verify-grimoire` count raised from 2,111 to 2,121.

### Added

- `tools/verify-audit.mjs`.
- `tools/audit-matrix/`: the inventory and matrix generator.
- The five 0.12.0 reports.

## 0.11.4 and 0.11.3 — November 2026

- Manifest minimum raised to TRG Prime 3.689.1. No release notes shipped with them.

## 0.11.2 — artwork

- Gold artwork on 513 entries.
- Packs rebuilt.

## 0.11.1 — 9 October 2026

- Live-test fixes from the automation pass:
  - Anchored Soul's awareness line;
  - Exorcise's warp as `bonusValue` / `bonusMax`;
  - Sever Influence wording;
  - Nine-Herb Restorative's warp note.

## 0.11.0 — 8 October 2026 — the automation pass and Undead Lords

- See `release-notes-0.11.0.md`.

## 0.10.0 — Chapter 8: Spirits & Haunts

- See `release-notes-0.10.0.md`.

## 0.9.0 – 0.9.3 — Chapter 9: the Unliving

- See `release-notes-0.9.0.md` to `release-notes-0.9.3.md`.

## 0.1.0 – 0.8.1 — foundations, classes, feats, Grimoire, equipment, magic items

- See the release notes for each version.
