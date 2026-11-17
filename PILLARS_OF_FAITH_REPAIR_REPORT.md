# Pillars of Faith — Repair Report (0.12.0 to 0.12.4)

## 0.12.4 — the core proposals in use, on TRG Prime 3.696.0 (16 November 2026)

Graham: "build CD1-CD9 and Cd12". The core work is in TRG Prime 3.696.0. These are the module's changes. F19–F27 are new numbers; 0.12.3's "F19b" was a Mummy Rot sub-item.

| # | Entries | Change |
|---|---|---|
| F19 | Spirit Intercession, Continuity Unbroken, Vowbound Resolve, Revelation in Crisis | `module/core-reactions.mjs` registers a check reaction (`after`). On a failed save (or skill check, for Vowbound), it asks each owner through `askReactor`, quoting the trigger. On a 7th-level Shaman ally's token within 30 feet, Spirit Intercession is asked too. A yes runs the `pof-reaction-pay` step on the reactor's client: the use (Revelatory Script) is checked first, then the reaction and use are spent. The answer is `{ reroll, keepBetter: true, advantage }`. The Use stays as a fallback. |
| F20 | Blood Awakened, Hunter's Fangs | Blood Awakened's effect carries a rider: 1d6 essence; Bite or Fangs; living targets; once a round. Hunter's Fangs carries a critical-only rider: Fangs; living targets; Bleed 1. |
| F21 | Break the Evil Eye, Sever Influence, Sever Soulchain | `confirm: true` on the first two. `counteractLimitBonus: 1` on the "+1 additional effect" warp of all three. The notes no longer say "cancel the dialog" or "counteract it from Spellcraft". |
| F22 | Ossuary Lamellar | A worn-only effect (`worn: true`) declaring `drVersus: { slashing: 1 }`. |
| F23 | Deep-Rooted Ironcap | A declared effect: `forcedMovementReduction: 5`. |
| F24 | Ossuary Board | `bashTraits: ["shove"]`. |
| F25 | Expert Autopsist | `registerDegreeUpgrades` adds `{ actionKey: "performAutopsy", degree: "critical", bonusValue: 4 }`. |
| F26 | Redundant Anatomy | A critical reaction (`after`) asks the injured character once a day. Yes spends the daily use and answers `severitySteps: -1`. It is not a reaction, so no reaction is spent. |
| F27 | Judgement, Final Sanction | Judgement's rider adds `spells: true, spellClasses: ["Grimward"]`. With Final Sanction, it also adds `onCritical`: an effect of −1 to `system.combat.defence.status` for 1 round (`finalSanctionCritical`). The card no longer says "add it by hand" for a Grimward spell. |

**Harness:**
- `verify-audit` section P.
- Re-pointed: `verify-classes` C (Judgement's rider), `verify-automation` B6/C3, `verify-feats` C (degree upgrades), `verify-grimoire` (the new warp key; 2,121 → 2,124 checks) and `verify-audit` G1.
- Version pins 0.12.4 / 3.696.0.

## 0.12.3 — on TRG Prime 3.695.0 (16 November 2026)

| # | Change |
|---|---|
| F17b | **Eternal Resonance, fixed.** 0.12.2's F17 registered a casting option. The core gives no casting options to an innate cast, so the bonus never applied. The live test of the installed 0.12.2 showed Chill Touch's DC without the +1. Now the feat's effect declares `spellDCBonus` and `spellAttackBonus` (+1 race, `innateOnly`, `itemCasts`), read on every cast by TRG Prime 3.695.0 (CD14). The casting option was removed. |
| F19b | **Mummy Rot.** The order is also declared as `flags.trg-prime.cureSequence`, which 3.695.0's Remove Curse and Remove Disease read. Cleansing Radiance stores its steps in the core's `flags.trg-prime.cureSteps`, so a Radiance step and a cast spell count towards the same cure. |


## 0.12.2 — rulings U6–U8 (16 November 2026)

| # | Change | Entries |
|---|---|---|
| F17 | **Eternal Resonance (U7: all innate spells).** A required casting option (`registerCastOption`, `pof-eternal-resonance`) on every innate cast by the feat's owner: +1 racial to the spell attack and +1 Save DC. Before, it was a note. | 1 feat |
| F18 | **Cleansing Radiance (U8: applied directly).** The chosen effect is applied at once, with no Counteract roll: the named conditions, Disease or Curse afflictions, and effects of a Fear, Paralysis, Disease or Curse source come off. A creature the player does not own is handled through the GM (new relay action `cleanse`). Before, it was a card note "for the GM to apply". | 1 feat |
| F19 | **Mummy Rot's cure order** (Fiends & Fables): Remove Curse, then Remove Disease. Declared on the affliction (`cureSequence`), and followed by Cleansing Radiance, which records each step on the affliction. The core's Remove Disease still cures it alone: CD13. | 1 affliction |
| U6 | Plate of the Sealed Sepulchre: plain essence Resistance, as already shipped. | — |
| H4 | The Liturgical Book sweep deletes only items still present (found in the live retest). | — |


## 0.12.1 — Graham's review and rulings (16 November 2026)

Graham found a missed automation ("Elemental Spirit … is not granting a free cantrip"). The audit tooling had hidden it, along with others: the 0.12.0 inventory kept only the first 600 characters of each description, so most of the module's own sheet lines, which come last, were never seen by the classifier. The re-run sweep found the items below. Each fix is checked by `tools/verify-audit.mjs` (sections C, D, F, J–N, 89 checks).

| # | Defect | Severity | Fix | Entries |
|---|---|---|---|---|
| F11 | Elemental Spirit's bonus Verdant cantrip of the chosen element was "yours to add" | Moderate | The Use offers the PP 0 Verdant cantrips with the element's trait from the federated spells pack. The chosen one is granted outside cantrips known and leaves with the ability. A character who chose an element before 0.12.1 Uses it again to take the cantrip. | 1 ability |
| F12 | Second Discipline brought the second discipline's 7th-level Advanced Specialist Spell ("delete it by hand") | Moderate | A `preCreateItem` hook trims the granted discipline ability's levelled `grantedSpells` to level 1 when Second Discipline granted it (`module/second-discipline.mjs`). | 1 feat |
| F13 | Sacred Marginalia's four extra Prayer Book spells were "for the table" | Moderate | Use: four choosers of Divinity spells you can cast (PP 1 to caster level + 1, not specialist, not known). Each is created as core's Learn a Spell creates one: `spellBookPick` + `learnedExtra` (outside the level ladder), granted by the feat. The halved copying cost stays the table's. | 1 feat |
| F14 | Liturgist: four spells recorded in a book that could not hold them; daily selection by hand; Liturgy of Prayer reached any unprepared spell | Major | `module/liturgy.mjs`. The book records its spells on the gear item. The Liturgist Use takes the book, records the four, then offers the daily selection or a learned spell. The selection becomes a **granted** spell (castable; counted against neither the memorised total nor the repertoire), swept at the next daily preparation (`trgPrimeDailyPreparation`). Liturgy of Prayer picks only a recorded spell not on the sheet; it is swept at the end of the caster's turn (`trgPrimeTurnEnded`). | 1 feat, 1 ability, 1 gear |
| F15 | Lantern of the Veil's 20 ft light and the Lantern of the Last Road relic's 30 ft light and essence Resistance were "the table's" | Minor | Two registered magical light sources. An actor effect carrying the key is kept in step with the item, held and invested (`module/item-lights.mjs`). The relic carries a worn-flagged essence Resistance. | 2 wondrous items |
| F16 | Final Toll's ladder was "applied by hand from the result" | Minor | The feat's Use (target, choose the save result) lands no Reactions and −1 status to attacks as a one-round effect, and Slowed 1 through the core condition relay. It leaves Sacred Toll expended. | 1 feat |
| R1–R5 | Graham's rulings U1–U5 | — | See `PILLARS_OF_FAITH_UNRESOLVED.md`: Gift rider on Dying, magical racial light, Enchantment counteracted, invested gate (module half and a core patch), Fatigued at least 1. | 2 abilities, 2 spells, 4 light sources, every Invested-trait item, 2 relay steps |
| T1 | Stale sheet text | Trivial | Plate of the Sealed Sepulchre's essence Resistance "is a note", although it was already on the sheet. | 1 item |

### What else the re-run sweep found

The broader scan raised the **C** count from 21 to 86. Each newly C entry keeps a step for the table, the GM or the player's hand that 0.12.0 did not report. They are listed with that step in the audit matrix and in `PILLARS_OF_FAITH_UNRESOLVED.md`. Most are a judgement inside an otherwise automated entry, for example:
- "the free Step after a Guidance is a note";
- "recognising a possession attempt is a note";
- "the vow, and whether it was kept, is the table's".

Some need the core. Where a cheap, rule-faithful module fix existed, it was made (F11–F16). The rest were not changed: fixing them would mean inventing rules, or a core feature.

### Core

The core half of ruling U4 is `core-patches/core-invested-conditionals.diff`. It changes core `module/conditionals.mjs` `equipmentInUse` so that an Invested-trait item's conditionals need the item invested as well as equipped. That affects 5 core items and 16 Pillars of Faith items.

The patch was tested on a copy of core 3.694.0:
- a unit test with fakes (Invested trait: equipped only gives 0 rows; equipped and invested gives 1; plain gear equipped gives 1);
- every core verify suite that reads conditionals, with no failures.

**Not applied to the production core.** It needs Graham's approval and a core release (CD10).

---

## 0.12.0

16 November 2026. Every defect this audit found, how it was found, and what was changed. Document ids are unchanged throughout: the builders in `tools/content/` regenerate the same deterministic `_id`s, and the compiled packs were checked document by document against `packs-source/` (661 of 661, 0 differences).

## Summary

| # | Defect | Severity | Kind | Found by | Entries |
|---|---|---|---|---|---|
| F1 | Race Speed written to the bare speed node crashes actor preparation | **Critical** | Module data | Live Use sweep | 4 races, 1 heritage |
| F2 | Healer and healing feats cannot heal a creature the player does not own, and ignore Dying | **Major** | Module code | Static scan, then live | 7 abilities and feats, plus Restorative Overflow |
| F3 | Counteract spells only printed their rule; a success removed nothing | Moderate | Module data | Audit (note-only spells) | 3 spells |
| F4 | Expel Possessor did not roll, unlike Exorcise, its twin | Minor | Module data | Audit | 1 spell |
| F5 | "While worn" essence resistance applied with the armour in a pack | Moderate | Module code | Live equipment test | 1 item |
| F6 | Racial light was a description only, and the token was not lit | Minor | Module code | Live Use sweep | 2 abilities |
| F7 | Fast Healing 1 was a note | Minor | Module code | Audit (hint text) | 2 feats |
| F8 | Vesperyn's Darkvision substitution was "swap by hand" | Minor | Module code | Audit (hint text) | 1 feat |
| F9 | Not Yet Finished left Dying standing beside 1 HP | Moderate | Module code | Audit, then live | 1 feat |
| F10 | First Age Theologian's Intelligence for Wisdom was "for the table" | Minor | Module data | Audit (hint text) | 1 feat |
| H1 | Harness pinned to 0.11.1 / 3.630.1, and one check read a moved core file | Housekeeping | Tests | Baseline run | 10 suites |
| H2 | Loader's `REQUIRED_SYSTEM` (3.630.1) disagreed with the manifest (3.689.1); README and package.json said 0.9.3 | Housekeeping | Packaging | Baseline | — |
| H3 | The shipped LevelDB packs had no MANIFEST and stale extra `.ldb` tables | Packaging | Packaging | Packaging check | 22 packs |

## F1 — Race Speed crashed actor preparation (critical)

**Rule.** Each race: "Speed 25 feet". Sevrai: "+5 feet".

**Defect.** The four race items carried `system.combat.movement.land` OVERRIDE `25`, and the Sevrai heritage carried ADD `5`. Since TRG Prime 3.412.0 every speed is a pool: `{base, item, status, circumstance, other, total}`.

- The override replaced the whole pool with the number 25.
- The next change into the pool then threw "Cannot create property 'other' on number '25'", and Foundry abandoned the actor's whole `prepareDerivedData`. The changes that trigger it:
  - Pilgrim of Many Lives and Bone Stride (`land.other` +5);
  - Blood Awakened;
  - the Beast Spirit's Beast Within (+10);
  - Rejuvenating Surge's `land.status`.
- Once it fails, the actor's level, saves and HP all fall back. Abilities read the wrong level: in the sweep, Restorative Spores healed 1 HP instead of 20.

**How found.** The live Use sweep. 18 automations threw "Failed data preparation for Actor …" in a row on the PoF QA Healer (Rhevani) after the Pilgrim feats were added.

**Why it was never seen.** TRG Prime's own world migration (`migrateMovementEffectKeys`, 3.595.2) rewrites owned copies to `.base`. The bad key comes back on every character created from the compendium after that migration ran.

**Fix.** `tools/content/builders.mjs` `sizeSpeedEffect` writes `system.combat.movement.land.base` (OVERRIDE). Sevrai writes ADD `land.base`. This is exactly what the core migration converts to.

**Verified:**
- `verify-audit` A1–A4, which go red on 0.11.4;
- `verify-foundation`;
- live: the five QA characters' owned race effects were re-keyed, and the crash stopped. The Healer then read land `{base 25, other +10, total 35}` with both speed feats.

**Existing characters.** An owned race item keeps its old key until the next TRG Prime migration, or until the race is refreshed from the compendium (Compendium Refresh).

## F2 — Healing in multiplayer, and the Dying rule (major)

**Rule:**
- Gift of Healing, Healer's Touch, Restorative Hands, Lifeline, Lifebound Ward, Restorative Spores and Share the Wound each heal, or set the state of, another creature.
- Restorative Overflow turns overflow into temporary HP.
- Chapter 7: "If a character receives the benefit of a magical effect … that heals HP while they have the Dying condition, the condition is reduced by 1". It restores no HP.

**Defect:**
- **Not owned.** Each wrote straight to the target: `target.update({"system.resources.hp.value": …})`. When the client did not own the target, it printed "apply it on their sheet". At a real table the Healer is a player and the people they heal are other players' characters, so every one of these abilities fell back to hand bookkeeping in the case it exists for. Earlier live tests always ran as GM, which owns everything.
- **Dying ignored.** The local heal added HP to a Dying creature and left it Dying.
- **Overflow.** Restorative Overflow's temporary HP was written directly too.

**How found.** A static scan for writes to non-owned targets, then live: Gift of Healing on a Dying 2 ally at 0 HP gave **23 HP and left Dying 2**. TRG Prime's own `healActor`, applied to the same state, gave **Dying 1, 0 HP**.

**Fix.** A new `module/relay.mjs`, one place for writes to creatures this client may not own:
- **Healing.** `healTarget` uses the core helper `healActor`, which applies the Dying rule and the Unconscious clear and relays to the GM itself.
- **Other writes.** These go through the module's own socket (`module.trg-pillars-of-faith`, already declared for Grace beyond Need), handled by the one active GM:
  - `giveTempHp` (keeps the larger pool);
  - `reduceCondition`;
  - `holdAtOneHp` (Lifeline: 1 HP, not Dying, Fatigued +1).
- **Owned creatures** are still written directly, as before.

Grace beyond Need's temporary-HP relay now shares the same handler.

**Changed files:**
- `module/class-automations.mjs`: the Healer block;
- `module/feat-automations.mjs`: Lifebound Ward, Restorative Spores, Share the Wound;
- `module/pass-automations.mjs`: the socket.

**Verified:**
- `verify-audit` C1–C13 drive relay.mjs with fake actors and a fake socket:
  - the owner path and the relay path;
  - the GM handler;
  - a player client ignoring relayed writes;
  - a second GM deferring to the active one.
- Live: the core behaviour the fix relies on was shown, as above.

## F3 — Counteract spells removed nothing (moderate)

**Rule:**
- **Break the Evil Eye:** "Select one effect … Curse; Charm or Compulsion; possession; magical Fear… Attempt to Counteract… Success: The effect ends."
- **Sever Influence:** "Select one Curse, Charm, Compulsion, possession effect…"
- **Sever Soulchain:** "…maintains possession…"

**Defect.** Each spell carried only a `note`. The check was rolled from Spellcraft by hand, and a success ended nothing.

**Fix.** The core `counteract` row (TRG Prime 3.613.0; Remove Curse uses it). It finds effects from sources with the named traits, lets the caster choose when there are several, rolls the check against the effect's own level and DC where one is recorded, and removes the effect on a success:

| Spell | Traits |
|---|---|
| Break the Evil Eye | curse, possession, fear |
| Sever Influence | curse, possession |
| Sever Soulchain | possession |

All three have limit 1, as printed.

**Charm and Compulsion are deliberately not included.** In TRG Prime those are Enchantment spells, and so are Bless, Aid and Heroism. The book excludes "voluntarily accepted magical effects", and a lone candidate is rolled against without the caster being asked. The note keeps the rest of the rule: Charm and Compulsion, the critical rider, the fumble lock-out and the extra-effect warp. See UNRESOLVED U3.

**Verified:**
- `verify-audit` B1–B4 and B7;
- `verify-grimoire` (2,121 checks).
- Live: a copy of Break the Evil Eye carrying the new rows was cast on a creature carrying "QA Curse of Ill Luck" (Curse) and "QA Blessing" (Enchantment). The counteract rolled, the curse was removed, and the blessing stayed.

## F4 — Expel Possessor (minor)

Exorcise rolls its Counteract and prints the rung (Graham's ruling of 8 October). Expel Possessor, the same mechanic for the Shaman, was a note. It now carries the same `counteractRoll` row with the book's rungs, and its +4 PP warp pre-fills +2 circumstance (`bonusValue 2`, `bonusMax 2`). Verified by `verify-audit` B5 and B6.

## F5 — Plate of the Sealed Sepulchre's resistance (moderate)

**Rule.** "You possess Resistance to essence damage from Soul Warding", on armour that must be worn.

**Defect.** A transferred Active Effect flagged `worn: true`, but nothing read the flag. Foundry transfers item effects regardless of equipped state, and the core suppresses only broken items. No core equipment carries a transferred effect, which is why the core never needed the gate.

**How found.** Live: the essence resistance was present on a character carrying the plate unequipped.

**Fix.** `module/worn-effects.mjs`, registered through `registerEffectSuppressor` (TRG Prime 3.678.0). An item effect flagged `worn` is switched off while its armour, shield, weapon or gear item is not equipped. Nothing is written.

**Verified:**
- `verify-audit` F1–F5;
- live, with the same function registered in the running world: unequipped, no resistance; equipped, resistance; unequipped again, none.

## F6 — Bloom Light and Lantern Glow (minor)

The toggles made a descriptive effect and told the player to light the token by hand.

The module now registers four light sources through `registerLightSources` (TRG Prime 3.669.0): Bloom Light and Lantern Glow, at 10 ft and at 30 ft with the Lantern feats. Each is dim light: one step, capped at dim, no bright ring. The toggle's effect carries the key and asks the core to redraw the token. The core's own delete watcher restores the token when the light is suppressed.

**Verified:**
- `verify-audit` D1–D6;
- live, with the same source registered: the token went to 10 ft dim when the light was on and back to none when it was suppressed.

## F7 — Fast Healing (minor)

Blood Awakened and Perfected Aberration each print "You gain Fast Healing 1". Both were notes. Their effects now declare `fastHealing: 1`, the flag TRG Prime's turn start heals from. The Unliving Vampire's Fast Healing already uses it. Verified by `verify-audit` G1.

## F8 — Vesperyn (minor)

"You gain Nightvision. If your race already grants Nightvision, you instead gain Darkvision." The core correctly refuses a second Nightvision, so an Eshari Vesperyn ended with neither upgrade.

`module/vesperyn.mjs` grants Darkvision once the feat's grants settle, on the client that added the feat. It is stamped as the feat's grant, so it leaves with the feat.

**Verified:**
- `verify-audit` H1–H6;
- live on the Eshari Archivist: Nightvision from the race, then Darkvision with the feat, then the Darkvision gone when the feat was removed.

## F9 — Not Yet Finished (moderate)

**Rule.** "You would be reduced to 0 HP … You remain at 1 HP instead. After using this ability, you become Fatigued 1."

**Defect.** The reaction is pressed after the damage has landed. It set HP to 1, but left the Dying the blow had given, producing an impossible state.

**Live (0.11.4).** At 0 HP and Dying 1, Use gave 1 HP, Dying 1 and Fatigued 1.

**Fix.** It now uses the same step as Lifeline (relay.mjs `holdAtOneHp`): 1 HP, Dying removed, Fatigued +1. The sheet text no longer says "set on your sheet".

**Verified.** `verify-audit` C3b.

## F10 — First Age Theologian (minor)

"You may use Intelligence instead of Wisdom for Religion checks made to Recall Knowledge, Recognise Doctrine or Identify Spiritual Affliction when the subject concerns…"

The sheet said this was "for the table". The core already reads an Intelligence-for-Wisdom row: `valueFrom: "intelligence-wisdom"`, which Scholarly Exegesis has used since 0.7.0. The feat now carries that row beside its +1 racial row, offered on those three actions with the book's wording.

**Verified:**
- `verify-audit` I1 and I2;
- `verify-feats` (3,039 checks), now normalising scaled rows with the figures they read, as `verify-classes` does.

## H1–H3 — Housekeeping

- **Harness pins.** Every suite was pinned to module 0.11.1 and TRG Prime 3.630.1, so nine failed on the 0.11.4 baseline for version reasons alone. They are now pinned to 0.12.0 / 3.689.1.
- **Moved core check.** `verify-classes`' repertoire check read a file the call moved out of (TRG Prime 3.674.0). It now reads `grants-workflow.mjs`, where `repertoireSchedule(sourceItem, actor)` lives. The live progressions confirmed the schedules.
- **Grimoire count.** `verify-grimoire`'s pinned count rose from 2,111 to 2,121: ten new per-row and per-mod checks for F3 and F4.
- **Version strings.** The loader's `REQUIRED_SYSTEM` is now 3.689.1, matching the manifest. The manifest records `verified: 3.694.0`. `package.json` and the README now say 0.12.0.
- **Packs.** All 22 packs were rebuilt from `packs-source/` and compacted, leaving one table, a MANIFEST and CURRENT each, with no LOCK and no LOG. The uploaded 0.11.4 packs had CURRENT pointing at a MANIFEST that was not in the archive, and pof-races held two tables, one dated 23 October.

## Not changed, deliberately

- **Published rules.** None were altered.
- **Entries already working.** Nothing was rebuilt or renamed:
  - the 93 Use automations driven live ran without error once F1 was fixed;
  - the 70 herbs and consumables consumed, or refused, correctly;
  - all five classes matched the book's tables at every level from 1 to 20.
- **Core TRG Prime.** Not modified. What a further step would need from it is in `PILLARS_OF_FAITH_CORE_DEPENDENCIES.md`.
