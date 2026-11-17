# Pillars of Faith — Test Report (0.12.0 to 0.12.5)

## Live test of the installed 0.12.4 on TRG Prime 3.696.0 (17 November 2026)

The full table is in `release-notes-0.12.5.md`. In summary:
- **Passed live (12):** the four keep-better rerolls, including an ally's Spirit Intercession and its range limit, plus Redundant Anatomy, Hunter's Fangs, Blood Awakened, Break the Evil Eye's two-effect confirm, Ossuary Lamellar, Ossuary Board, Deep-Rooted Ironcap and Final Sanction.
- **Found and fixed:**
  - In TRG Prime 3.696.1: the shield maneuver read weapon proficiency, a typed rider's card line was ambiguous, and Final Sanction's line was named twice.
  - In 0.12.5: the reroll line was printed twice.
- **Install problem:** the installed Deep-Rooted Ironcap was stale.
- **Not tested live:** Judgement on a Grimward spell and Expert Autopsist.

## 0.12.4 (16 November 2026, evening)

### Live test of the installed 0.12.3 on TRG Prime 3.695.0

| Test | Result |
|---|---|
| **Eternal Resonance** (innate cast by a temporary copy with the feat) | **Passed.** +1 racial on both the Save DC and the spell attack, named on the card. |
| **Mummy Rot**: Remove Disease, then Remove Curse, then Remove Disease | **Passed.** The first Remove Disease does nothing ("Remove Curse must come first"). Remove Curse records its step. Remove Disease then ends the affliction. The true results are whispered to the GM. Found: the counteract card itself was public, so the degree showed. Fixed in TRG Prime 3.696.0, where a cure-step check rolls blind. |
| **Core Human + Bone Stride** (CD0) | **Passed.** Land Speed 30, and no preparation error. |
| **Invested gating (CD10)** | **Passed.** Ancestor's Locket's conditionals were offered only once it was invested. |

**Incident during this run.** One test cast landed on a real player character, Borin Slatevein, as well as the temporary target. The token selection had picked up his token. Everything was reverted at once:
- his HP was set back to 60;
- the Fatigued effect was deleted;
- the three chat messages were deleted.

The test helper now selects targets only by name, and only tokens named "TEMP …". The temporary copies and their tokens were removed afterwards.

### 0.12.4, static

- **`npm run verify`** (against the 3.696.0 working tree): all 11 harness files green, **9,654 checks**.
  - `verify-audit` section P (14 checks) reads each 0.12.4 declaration with the core's own pure readers:
    - `declaredDamageRiders`, `damageRidersFor`, `criticalRiders` and `typedRiderPackets`;
    - `normaliseCounteract` and `counteractLimit`;
    - `drVersusFor`, `forcedMovementReduction`, `maneuverWeapon` and `degreeBonusFor`;
    - the module's own `rerollOffers`, `rerollAnswer` and `redundantAnatomyAnswer`, and the registrations.
  - It also checks that no adopted entry's sheet line still sends the step to the table.
- **`check-packs`:** 661 documents, 0 problems.
- **The core's `verify-fixes-3696-0`** (38 checks) and `mutate-fixes-3696-0` (35 mutations, all caught) cover the seams.

### Retest after install (0.12.4)

Not yet run. See the list at the end of `PILLARS_OF_FAITH_UNRESOLVED.md`. Use temporary copies and "TEMP"-named tokens only.

## Live test of the installed 0.12.2 (16 November 2026, 15:00)

| Test | Result |
|---|---|
| **Eternal Resonance** (Healer copy with the feat; innate Chill Touch cast on itself through the sheet) | **Failed.** Save DC 43 = 10 + 3 + 20 + 10 (caster-level warp), with no +1, and no Eternal Resonance line on the card. The core gives no casting options to an innate cast (cast-workflow: "An innate, item or no-check cast is offered none"). The 0.12.2 harness tested the option, not the cast. Fixed in 0.12.3 on TRG Prime 3.695.0. |
| **Cleansing Radiance** (Healer copy with the feat, the Undead Target copy targeted) | Remove Fear ended Frightened 2. Restore Senses ended Blinded. Remove Disease on Mummy Rot: "resists — Remove Curse must come first", affliction kept. Remove Curse: "takes hold — Remove Disease must follow", step recorded. Remove Disease: Mummy Rot removed. |

The copies, their tokens and the scene view were removed afterwards.

### 0.12.3

- `npm run verify`: all 11 harness files green (9,635 checks). verify-audit O2–O4 now check the declared rows, the removed option and the 3.695.0 minimum. O10–O11 check the shared step format and the core flag.


## 0.12.2 and the live retest of 0.12.1 (16 November 2026, afternoon)

### Live retest of the installed 0.12.1

Graham installed 0.12.1, and the world reports Pillars of Faith 0.12.1 on TRG Prime 3.694.0. The installed module's own handlers were driven against temporary copies of the QA characters. Tokens for the copies were placed on the "PoF QA" scene (viewed, never activated). The copies, their tokens and the scene view were removed afterwards. Their chat cards remain in the log.

| Retest item | Result |
|---|---|
| 1. Elemental Spirit, chosen before 0.12.1 (Fire) | Use again granted Orb Of Fire (PP 0, `bonusCantrip`). It was the only Fire Verdant cantrip, so it was granted without a chooser. A further Use granted nothing more. |
| 1. Elemental Spirit, fresh choice | Element chooser (4 options), then Cold. The cantrip chooser offered 2 and granted Orb Of Cold. |
| 2. Second Discipline (Archivist L20, through the sheet's Use button and core's own chooser) | Apocryphist arrived with `grantedSpells` "1: Hidden Doctrine" (the pack holds "1: Hidden Doctrine, 7: Forbidden Name"). Only Hidden Doctrine was granted at 20th level. |
| 3–4. Liturgist and Liturgy of Prayer (Healer copy) | One book with four records. Daily selection: Alarm. Liturgy of Prayer: Animate Dead. Turn end removed Animate Dead; daily preparation removed Alarm. |
| 5. Sacred Marginalia (Archivist copy) | Four spells added, each `spellBookPick` + `learnedExtra`. |
| 6. Lantern of the Veil / Last Road relic | Light only while equipped **and** invested (`pof-lantern-of-the-veil`, `pof-lantern-of-the-last-road`). The relic's essence Resistance: equipped only, no; equipped and invested, yes; invested only, no. Stowed: light and Resistance gone. |
| 7. Final Toll (Fumble, targeted) | The target got "Final Toll" (1 round) and Slowed 1 (1 round). Sacred Toll was at 0 uses. The card was correct. |
| 8. Gift of Healing rider on Dying 2 | Rider heal: no HP, Dying stays 2. A plain magical heal afterwards took Dying 2 → 1 with no HP (the core rule). |
| 8. Lifeline (Not Yet Finished's step) | Fatigued 1 stayed 1; Fatigued 0 became 1. HP 1, Dying cleared. |
| 8. Light is magical | `magical: true` on Bloom Light, Lantern Glow (30) and the Veil lantern. |
| 8. Ancestor's Locket | Carries no Active Effect, only conditionals, so its investment gate is the core patch (CD10). Not changed by the module. |

**Found:** when a turn's end and a daily preparation fired together, the second sweep's delete named an item the first had just removed, and failed whole. The daily selection stayed until the next preparation. That can't happen in play: the turn-end hook fires on the GM's client in combat, and daily preparation is a deliberate press. 0.12.2 still guards it (only items still present are deleted, and a failure is logged).

**Not driven:** Break the Evil Eye against a charm (the Enchantment row is verified in the installed pack data); token light drawing; the relay with a player client.

### 0.12.2

- `npm run verify`: all 11 harness files green, **9,634 checks**. verify-audit has 100 checks, including the new section O for rulings U6–U8. O10–O11 cover Mummy Rot's cure order.
- **Cleansing Radiance's removal code, live** (loaded alone into the world on a copy of the Undead Target). Removed:
  - Remove Fear: Frightened 2 (applied with a Fear source);
  - Restore Senses: Blinded and Deafened;
  - Remove Disease: Ghoul Fever and Mummy Rot (both `afflictionType: disease`);
  - Remove Curse: an effect whose source carried the Curse trait.
  
  Nothing else on the creature was touched.
- **Eternal Resonance:** harness only (O2–O4). Core's cast-option context passes `innate` and `itemCast` (cast-workflow.mjs 2828). `attack` and `saveDC` from `apply` reach the spell attack and the Save DC (cast-options.mjs; cast-workflow.mjs 2956).

### Retest after install (0.12.2)

1. **Eternal Resonance.** Cast an innate spell. The Casting Conditions prompt shows "Eternal Resonance (+1 racial)" as required. The spell attack shows +1 racial and the Save DC is 1 higher.
2. **Mummy Rot.** On a creature with Mummy Rot, Cleansing Radiance with Remove Disease leaves it, and the card says Remove Curse comes first. Remove Curse, then Remove Disease, cures it.
3. **Cleansing Radiance.** Target a Frightened ally and Use it with Remove Fear: Frightened ends. As a player, on another player's character: it ends through the GM.

---


## 0.12.1 (16 November 2026)

### Static validation

- `npm run verify` against core 3.694.0: **all 11 harness files green, 9,623 checks.**
  - foundation 769, classes 897, feats 3,045, grimoire 2,121, equipment 1,349, automation 51, magic items 592, unliving 520, haunts 153, pass 37, audit 89.
  - Counts that moved on purpose: two feats became Uses (Sacred Marginalia, Final Toll), and the version pins changed.
- **`verify-audit` new sections:**
  - J: Elemental Spirit's cantrip;
  - K: Second Discipline;
  - L: Sacred Marginalia and the Liturgist;
  - M: lantern light and the relic's Resistance;
  - N: Final Toll;
  - C10/C14–C16, D2, F6–F7: rulings U1, U2, U4 and U5.
  
  Each check is written to fail on the 0.12.0 code or data it replaces.
- **Packs:** rebuilt from `tools/content` (661 documents, 22 packs) and compacted; ids unchanged (verify-audit E1–E2).
- **Core patch (CD10)**, on a copy of core 3.694.0:
  - fake-actor unit test passed;
  - every core verify file that reads `conditionals.mjs` / `wornAndStanding` passed (0 failures).

### Live, in Graham's world (TRG Prime 3.694.0; Pillars of Faith 0.11.4 installed)

The new modules have no imports (`liturgy.mjs`, `item-lights.mjs`), so their built code was loaded into the running world and driven against **temporary copies** of the QA characters. The copies were deleted afterwards and the client reloaded, so no registrations remain. The choosers were answered by script.

| Test | Result |
|---|---|
| Liturgist Use on a copy of the Healer (instinctive Divinity caster, CL 20) | Took one Liturgical Book and recorded four Divinity spells through four choosers (264 eligible). Liturgy of Prayer was already on the sheet. |
| Daily selection, then a second selection | First pick: Alarm, prepared. The second pick replaced it (Argent Mark). One spell item added in all. Core `spellAvailability`: "Granted", on the table, castable; `spellCastBlocked` returned null. |
| Liturgy of Prayer | Offered only the recorded spells not on the sheet (2 of 4). It created the pick and spent the day's use (0 left). |
| Turn end (`trgPrimeTurnEnded`) | Liturgy of Prayer's spell removed; the daily selection kept. |
| Daily preparation (`trgPrimeDailyPreparation`) | Daily selection removed. |
| Sacred Marginalia on a copy of the Archivist | 4 spells added as `spellBookPick`, unprepared. The Prayer Book went from 0 to 4; the level ladder count stayed 0 (`learnedExtra`). A second Use added nothing. Deleting the feat removed all four. |
| Lantern of the Veil, light registered at runtime | Added: no light. Equipped: no light. Invested: light `pof-lantern-of-the-veil` (core `lightSourceKeysOn`), one effect "Lantern of the Veil: light (20 ft)". Stowed: gone. Re-equipped: back. Deleted: gone, with no effect left behind. |
| Final Toll's two core calls on a copy of the Undead Target | The −1 attack effect landed with a 1-round duration. `applyConditionTagsTo` slowed → "Slowed 1", Slowed 1 for 1 round. |

**Not driven live:**
- Elemental Spirit's cantrip grant and Second Discipline's trim (both import other module files, so they cannot be loaded alone). These are harness-only.
- Token light drawing (no token on a scene).
- The relic's 30 ft light (same code path as the Veil lantern).

### Retest after install (0.12.1)

1. **Elemental Spirit.** On a Shaman who chose before: Use again, and a Verdant cantrip of the element is offered and granted. On a fresh Shaman: choosing the element grants it.
2. **Second Discipline.** Choose a discipline. The new ability's granted spells hold only its 1st-level spell; at 7th level the Advanced spell does not appear.
3. **Liturgist** on a non-Archivist Divinity caster: Use → four recordings; Use again → daily selection on the spells table. Daily preparation removes it.
4. **Liturgy of Prayer:** a recorded spell, castable this turn; gone at the end of the turn in combat.
5. **Sacred Marginalia** on an Archivist: four book spells; the level ladder is unchanged.
6. **Lanterns.** Hold and invest the Lantern of the Veil on a token: 20 ft dim light drawn. Stow it: the light goes out.
7. **Final Toll.** Use with a target and choose Fumble: no Reactions and −1 attack effect, Slowed 1, Sacred Toll at 0 uses.
8. **Rulings.**
   - Gift of Healing on a Dying ally: Dying −1 from the spell only, no extra.
   - Bloom Light under Supernatural Darkness still counts.
   - Break the Evil Eye on a charmed target offers the charm.
   - An uninvested Ancestor's Locket gives no effect.
   - Lifeline on Fatigued 1 leaves Fatigued 1.

---

## 0.12.0

16 November 2026.

## Environment

- **Live world:** "TRG V14" at localhost:30000, Foundry 14.367, as the Gamemaster user.
- **Installed versions:** TRG Prime 3.694.0 and Pillars of Faith 0.11.4.
- **Other active modules:**
  - Eldritch Arts 0.17.2;
  - Inner Tempest 1.0.5;
  - Fiends & Fables 0.45.2;
  - Prime Codex 0.1.5;
  - Vhalendar 0.2.3;
  - Alchemist Maps.
- **Static suites** were run in the build workspace against the 3.694.0 source.

**The live tests ran against the installed 0.11.4.** They characterised the module as Graham's players have it, found defects F1, F2, F5 and F9, and exercised each repair by running the same function or data in the world (§4). The 0.12.0 ZIP itself has not been installed: Graham installs releases. See §6 for the retest after install.

## 1. Static validation (0.12.0 tree)

| Check | Result |
|---|---|
| Syntax (`node --check`): 15 runtime files, 31 harness/builder/tool files | all pass |
| JSON validity: module.json, package.json, 12 content JSON, 661 pack-source documents | all pass |
| Pack build: `tools/build-packs.mjs` regenerates `packs-source/` from `tools/content/` | deterministic; ids unchanged |
| Compiled LevelDB checked document by document against `packs-source/` (`check-packs`) | 661 / 661, 0 differences |
| LevelDB hygiene | one `.ldb`, MANIFEST and CURRENT per pack; no LOCK, LOG or stale tables |
| AE change keys against the actor schema (`template.json`) | all valid. The bare speed node was the only shape problem (F1, fixed) |
| Core API drift: every `register…` call, every helper and every hook the module uses, against 3.694.0 | 22/22 register calls present; all helpers present; all 8 system hooks still fired |
| `verify-foundation` | 769 checks, green |
| `verify-classes` | 897 checks, green |
| `verify-feats` | 3,039 checks, green |
| `verify-grimoire` | 2,121 checks, green |
| `verify-equipment` | 1,349 checks, green |
| `verify-automation` | 51 checks, green |
| `verify-magic-items` | 592 checks, green |
| `verify-unliving` | 520 checks, green |
| `verify-haunts` | 153 checks, green |
| `verify-pass` | 37 checks, green |
| `verify-audit` (new, the 0.12.0 repairs) | 57 checks, green |
| **Total** | **9,585 checks, all green** |

**Baseline (0.11.4 against 3.694.0).** Before any change, nine suites failed on version pins alone (0.11.1 / 3.630.1). `verify-classes` also failed one real check, the moved repertoire call (H1).

**`verify-audit` can fail.** Run against the 0.11.4 tree, its sections A–C report 17 failures out of 22 checks: A1–A4, B1–B3, B5–B6 and C1–C3.

## 2. Class progression, 1st to 20th level (live)

### How it was run

- One fresh character per class, in the folder "PoF QA (0.12.0 audit)".
- Each was built from the compendium as a player would: race first, then class. Grants ran through the core's own grant-autorun.
- Each class's sub-choice was made through its Use.
- XP was then raised one level at a time to 20. After each level the script waited for the level-up grants, then read the derived sheet.

### What was compared at every level

- BAB, BDB, Fortitude, Reflex and Will (the class-table components), bonus feats, Caster Level, PP and BSB, all against **the book's class table** (`tools/content/class-tables.json`);
- every class ability, against the class's level schedule: present when due, absent before;
- granted feats and spells;
- HP and PP steps;
- duplicates.

| Class | Race, key scores | L1 HP / step | L1 PP / step | Sub-choice (Use) | Gained on level | Mismatches (20 levels) |
|---|---|---|---|---|---|---|
| Healer | Rhevani, Wis +2 | 36 / +6 | 7 / +4 | Healer's Calling → Chirurgeon (Chirurgery added) | 3: Restorative Overflow | **0** |
| Archivist | Eshari, Int +2 | 35 / +5 | 6 / +4 | Archival Discipline → Canonist (Canon Lore; Doctrinal Ward at 1st) | 7: Word of Censure | **0** |
| Grimward | Kethrani, Wis +2; aspect The Veil | 39 / +9 | 5 / +2 | Inquisitorial Discipline → Grave Warden (Burial Lore) | 2: Grim Resolve, Hide from Undead · 4: Sanctioned Strike · 6: Speak with Dead · 10: Death Ward | **0** |
| Folkwarden | Myrathi, Con +2 | 39 / +9 | 5 / +2 | Folk Tradition → Herbal (Herbalism Lore) | 2: Practical Counsel · 3: Seasoned Hands | **0** |
| Shaman | Rhevani, Con +2 | 37 / +7 | 5 / +4 | Spirit Guide → Elemental Spirit → Fire (Elemental Lore; +1 class vs fire) | 3: Spirit Ward · 7: Deepened Bond | **0** |

**Grants at 1st level.** Every class received its granted feats:
- Archivist: Heighten Spell, Scribe Scroll and Spell Substitution;
- Folkwarden: Heighten Spell and Alchemist, plus Alchemical Crafting;
- Shaman: Heighten Spell;
- Healer: Cure, Restoration, Stabilise and Touch of Healing.

Racial abilities arrived with each race: Past-Life Echo, Continuity of Self, Nightvision, Spirit Sense, Soul Warden, Fungal Physiology, Ancestral Communion and so on.

**Conviction maximum.** It read 1, 2, 3, 4 and 5 at 1st, 5th, 10th, 15th and 20th, on every class.

**HP and PP arithmetic.** Base 30, plus (class HP + Constitution) a level. PP is the table's PP plus the magical ability. Both checked against the races' modifiers: for example Rhevani Con −1 and Eshari Con +1.

**Re-running the grants (idempotence).** `applyAllGrants` was re-run on every class, race, aspect and sub-choice of all five characters at 20th level. Nothing new was created on any of them and there were no duplicates (Healer 15 items, Archivist 17, Grimward 19, Folkwarden 20, Shaman 14, before and after).

## 3. Undead Lords exception (live)

Run on the Healer: Votary, then Waywarden. Both are archetype feats with unmet progression requirements.

| State | Result |
|---|---|
| Setting **off**, Votary owned | Blocked: "You're still progressing Votary…" |
| Setting **on**, Votary owned | **Not blocked.** The first archetype feat is the bonus pick, and its progression is waived |
| Setting on, Votary plus Waywarden owned | Blocked by **Waywarden**: the second archetype is not waived |
| Setting off, both owned | Blocked by Votary again |
| Setting on, character at **1st level** | Blocked: no bonus before 2nd level |

The feat banner's extra pick reads `{archetype: 1, archetypeProgressionWaivers: 1}`.

**Out of reach of the waiver** (read from the core's `blockingArchetype`; not driven live):
- an archetype handed over by a class (the Folkwarden's Alchemist);
- one granted through a waiver chooser (Martial Training, Archetypal Path, Priestly Path).

The setting was left **off**, as found.

## 4. Use automations, equipment, consumables and the repairs (live)

### 4a. Use sweep

Every Use handler the module registers was driven on a character who owns the item, with a target selected and dialogs answered automatically:
- the 34 ability handlers and 61 feat handlers;
- Carrion Feast and the Phylactery were left out (driven live at 0.9.x and unchanged), as were the two heritage handlers.

For each, the sweep recorded thrown errors, chat cards, effects, HP, PP, uses and the target's state.

- **First pass.** 18 handlers in a row on the Rhevani Healer failed with "Failed data preparation … Cannot create property 'other' on number '25'". That was F1.
- **After re-keying the QA characters' race effects (the F1 repair):** 93 of 93 ran with **no errors**.
  - **46** changed state: an effect, HP, a use spent, or an item added.
  - **47** printed a card or refused for a precondition, which was correct. Examples:
    - "no unprepared spell to reach for";
    - "add your Divine Aspect first";
    - "your element is fire. This choice cannot normally be changed";
    - queued one-shot modifiers;
    - uses already spent on the first pass.
- **Three no-ops were the harness's fault, then confirmed working.** Healer's Touch, Land Spirit and Share the Wound ask for a number or a name. Re-run with values: Healer's Touch healed 6; Land Spirit gave Forest Lore; Share the Wound moved 10 HP.
- **Defects found and confirmed live on 0.11.4:**
  - **F2:** Gift of Healing on a Dying ally gave +23 HP and left Dying 2. The core's `healActor` on the same state gave Dying 1 and 0 HP.
  - **F9:** Not Yet Finished at 0 HP with Dying 1 left HP 1 with **Dying 1** still in place.
  - **F6:** Bloom Light's card said the token is not lit.

### 4b. Herbs and consumables (70)

All 58 herbs and 12 magical consumables were each given at quantity 2 and used through the core's `useConsumable`, with an injured ally targeted.

- **Errors and timeouts:** none.
- **Correctly refused, nothing consumed:**
  - Rose of Thorns and Tangleweed with no weapon wielded (the 0.11.0 F7 fix holds);
  - Embalmer's Black Resin on a creature without the Unliving trait;
  - ten items whose range is "self", while another creature was targeted (the failure case for an invalid target).
- **The same ten self-range items, used untargeted:** each consumed one dose and applied its effect, or cast its synthetic spell.
- **The rest:** consumed one dose. Fourteen changed no visible state because their condition was absent:
  - Soulvine needs a Dying creature;
  - Sunveil removes Dazzled;
  - Void Lily restores Conviction, which the harness did not read;
  - others are narrative goods (class D).

### 4c. Equipment: equip and unequip

| Item | Unequipped | Equipped | Unequipped again |
|---|---|---|---|
| Ancestor's Locket (conditionals) | 0 rows | 1 row | 0 rows |
| Pilgrim's Coat (conditionals) | 0 | 1 | 0 |
| Plate of the Sealed Sepulchre: conditionals | 0 | 2 | 0 |
| Plate of the Sealed Sepulchre: essence resistance (0.11.4) | **present** ✗ | present | **present** ✗ (F5) |
| Same, with the 0.12.0 suppressor registered in the world | absent | present | absent ✓ |

Investment does not gate conditionals; equipping does. This is the core rule (UNRESOLVED U4).

### 4d. Each repair's mechanism, exercised live

| Repair | How it was exercised in the running world | Result |
|---|---|---|
| F1 race speed | The five QA characters' owned race effects re-keyed to `land.base` | Crash gone; the Healer's land Speed reads {base 25, other +10, total 35} |
| F1, core | A fresh **core Human** character, then Bone Stride | Same crash: land `{other: 5}`, two preparation errors. Reported as CD0; the test actor was deleted |
| F3 counteract | Break the Evil Eye copy carrying the 0.12.0 rows, cast by the Folkwarden on a creature carrying a Curse effect and an Enchantment "blessing" | Counteract rolled; **curse removed, blessing kept** |
| F5 worn gate | `registerEffectSuppressor` with the 0.12.0 function | As in the table above |
| F6 light | `registerLightSources` with the 0.12.0 entry; an effect carrying the key; `refreshTokenLight` | Token 0 → 10 ft dim; back to 0 when the effect was deleted |
| F8 Vesperyn | The Eshari Archivist (racial Nightvision) takes Vesperyn; the 0.12.0 decision and grant run in the world | Darkvision granted beside the racial Nightvision; removed with the feat |

**Not exercisable as a single GM client:** the F2 relay path, where a **player's** client heals a character it does not own. It is covered by `verify-audit` C4–C13 with fake actors and a fake socket, and is on the retest list.

## 5. Regressions

- No core file was changed.
- The ten pre-existing suites pass unchanged apart from the version pins, the grimoire count (+10 new row checks) and the feats suite's scaled-row normalisation.
- Every repair adds behaviour only where an entry declares it:
  - the `worn` flag;
  - the light keys;
  - the counteract rows;
  - the Vesperyn feat.
- Grace beyond Need's temporary-HP relay keeps its socket and payload (`tempHP`), now handled by relay.mjs.

## 6. Retest after install (0.12.0)

Install the ZIP and reload the world. Then:

1. **Speed.** Create a new character from a Pillars race. Its race effect key reads `system.combat.movement.land.base`. Add Bone Stride: Speed 30, no console error.
2. **Healing as a player.**
   - Log in as a player who owns a Healer but not the ally. Damage the ally and Use Gift of Healing: the ally's HP rises (through the GM) and the card gives the number.
   - Put the ally on Dying 2 and repeat: the card says Dying is reduced and the ally reads Dying 1, 0 HP.
   - Restorative Hands on the ally's Fatigued 2 → 1.
   - Lifeline on the ally → 1 HP, not Dying, Fatigued +1.
3. **Restorative Overflow.** Heal an ally already at full: temporary HP arrive, on a player client too.
4. **Plate of the Sealed Sepulchre.** Unequipped: no essence resistance. Equipped: resistance.
5. **Bloom Light** on a Lumeri character: the token glows at 10 ft dim; Use again and it is restored.
6. **Break the Evil Eye** on a cursed creature: the curse is removed on a success. On a creature carrying only Bless: "nothing to counteract".
7. **Expel Possessor.** It rolls, and the +4 PP warp pre-fills +2.
8. **Vesperyn** on an Eshari: Darkvision is added. Remove the feat and it is removed.
9. **Blood Awakened.** At your next turn start you heal 1.
10. **First Age Theologian.** A Religion Recall Knowledge dialog offers both the +1 and the Intelligence row.

## Test-world state left behind

- **Folder "PoF QA (0.12.0 audit)":** the five 20th-level test characters, a "Target" NPC and an "Undead Target" NPC.
  - The Healer carries the feats the sweep added.
  - All are at full HP with Dying and Fatigued cleared.
  - Their race effects were re-keyed (F1).
- **Scene "PoF QA (0.12.0 audit)":** holds their tokens. It was never activated; the active scene is still Oldwatch Approach.
- **Session-only registrations.** The world session holds runtime registrations from §4d (a worn-effect suppressor and one light source). They disappear on reload.
- **Undead Lords:** left off. Game time was not advanced.
