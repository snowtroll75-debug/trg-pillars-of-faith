# Pillars of Faith 0.12.4 — Core Dependencies

16 November 2026. Every proposal below has been built or answered.

- **TRG Prime 3.695.0** carries CD0, CD10, CD13 and CD14 (Graham: "move onto the core fixes").
- **TRG Prime 3.696.0** carries CD1–CD4, CD6, CD7, CD9 and CD12 (Graham: "build CD1-CD9 and Cd12").
- **CD5 and CD8 were already in the core:** `forcedMovementReduction` and `registerCriticalReaction`'s `after`, which answers `severitySteps`. So was CD12's half-HP growth (3.625.0).
- **0.12.4 requires and is verified against 3.696.0.** It uses every one of them except CD9, which is optional (see below).

**What 0.12.4 uses from 3.696.0:**
- **Reactions:**
  - `registerCheckReaction` `after` answering `{ reroll, keepBetter, advantage }`;
  - `registerReactionStep` and `helpers.askReactor` (3.681.0);
  - `registerCriticalReaction` `after` (3.685.0).
- **Riders.** `strikeDamageRider`'s `weaponNames`, `damageType`, `targetLiving`, `spells`, `spellClasses` and `onCritical`, including a critical-only rider with no dice.
- **Counteract rows.** The `counteract` row's `confirm`, and the `counteractLimitBonus` warp mod.
- **Defences:**
  - the `drVersus` effect flag;
  - a shield's `bashTraits`;
  - `forcedMovementReduction`.
- **Skill actions.** `registerDegreeUpgrades`' `{ degree, bonusValue }`.

**What 0.12.0–0.12.3 use** is unchanged:
- `registerEffectSuppressor`, `registerLightSources`, `helpers.healActor` and `helpers.grantTempHP`;
- the `counteract` and `counteractRoll` rows, and `fastHealing`;
- the daily-preparation and turn-end hooks;
- `spellDCBonus` and `spellAttackBonus` (3.695.0).

## CD0 — The core's own race items carry the same bare speed key — **done in 3.695.0**

- **Finding.** The core `races` pack (Dwarf, Elf, Gnome, Halfling, Human, Kornargon, Orc, Ascendan) and some companion and feat entries still write `system.combat.movement.land` (OVERRIDE), the shape repaired in the module as F1.
- **Effect.** A character created from a core race after the world's `migrateMovementEffectKeys` has run carries the bare key. The first `land.other` or `land.status` change then throws "Cannot create property 'other' on number …" and its preparation stops.
- **Confirmed live** on 16 Nov 2026: a fresh character with the core **Human** race, then Bone Stride (+5 `land.other`). Preparation threw twice, and land Speed read `{other: 5}` with no base. The test actor was deleted. Any core change into the pool does the same, for example `change-shape.mjs` writing `land.other`.
- **Proposed.** Re-key the core packs to `.base`, or make `migrateMovementEffectKeys` also run on an item when it is created on an actor.
- **Impact.** Data only, and the migration already defines the conversion.
- **Regression test.** A Human or Dwarf character, then Bone Stride (`land.other` +5): it should prepare, with total = base + 5.

## CD1 — A check reaction that keeps the better result — **done in 3.696.0, used by 0.12.4**

- **Entries.** Spirit Intercession, Continuity Unbroken, Vowbound Resolve, Revelation in Crisis: "reroll … and use the better result", several with advantage.
- **Today.** `registerCheckReaction` `after()` → `{reroll: true}` keeps the second result (`rerollForReaction`, "the second result stands").
- **Proposed.**
  - `{reroll: true, keepBetter: true, advantage: true}` keeps whichever degree is better.
  - Spirit Intercession also needs `ctx` to carry the saver's token, so a reaction can answer for an **ally** within 30 feet (`ctx.token` is the roller's). The module would then offer the reaction after a failed save and spend the use and the reaction.
- **Impact.** Additive. Existing reactions do not send the flag.

## CD2 — A filtered strike rider — **done in 3.696.0, used by 0.12.4**

- **Entries:**
  - Blood Awakened: Bite or Fangs, +1d6 **essence** once a round against a **living** creature;
  - Hunter's Fangs: Bleed 1 on a **critical** hit.
- **Today.** `strikeDamageRider` adds dice in the weapon's own damage type, to every weapon, against every target (`combat/damage-riders.mjs`).
- **Proposed.** Optional `weaponNames`, `damageType`, `targetLiving: true` and `onCritical: {conditions}` on the rider.
- **Impact.** Additive. Judgement and Restless End are unchanged.

## CD3 — A counteract row that always asks — **done in 3.696.0, used by 0.12.4**

- **Entries.** Break the Evil Eye and Sever Influence for Charm and Compulsion (UNRESOLVED U3).
- **Today.** With `limit: 1` and a single candidate, the row rolls without asking. Charm and Compulsion are Enchantment in TRG Prime, a trait Bless and Heroism share, so the module cannot safely name it.
- **Proposed.**
  - `confirm: true` on a `counteract` row prompts the caster with a "none of these" choice, even for one candidate.
  - A warp mod `counteractLimitBonus` handles the "+1 additional effect" warps (Break the Evil Eye, Sever Influence, Sever Soulchain). `promptCounteractChoice` currently returns one pick whatever the limit.
- **Impact.** Additive.

## CD4 — DR against one damage type — **done in 3.696.0, used by 0.12.4**

- **Entry.** Ossuary Lamellar: "+1 DR against slashing".
- **Proposed.** A declared `drVersus: { slashing: 1 }` read by the damage pipeline.

## CD5 — Forced-movement reduction — **already in the core** (`forcedMovementReduction`); used by 0.12.4

- **Entry.** Deep-Rooted Ironcap: "reduce forced movement by 5 feet".
- **Proposed.** `forcedMoveReduction: 5` read by `combat/forced-move` before a displacement.

## CD6 — A shield's bash trait — **done in 3.696.0, used by 0.12.4**

- **Entry.** Ossuary Board: "A Shield Bash … gains the Shove trait".
- **Proposed.** `registerWeaponTraitRule` (it exists) accepting a shield bash. Brace (the Last-Road Spear) is a separate core rules question.

## CD7 — A degree-specific bonus on a skill action's result — **done in 3.696.0, used by 0.12.4**

- **Entry.** Expert Autopsist: "+4 on a Critical".
- **Proposed.** A `degreeBonus` in the degree-upgrade registry (`registerDegreeUpgrades`).

## CD8 — A critical-injury reaction that can lower the severity — **already in the core** (3.685.0 `registerCriticalReaction` `after` → `severitySteps`); used by 0.12.4

- **Entry.** Redundant Anatomy: "Deadly becomes Serious…".
- **Today.** `trgPrimeCriticalInjury` announces the injury after it is applied.
- **Proposed.** A `before` reaction (as `registerDamageReaction`) that can return `{ severityStep: -1 }`.

## CD9 — A heal announcement (optional; would remove a Use press) — **done in 3.696.0** (`trgPrimeSpellHealed`); not yet adopted

- **Entries.** Gift of Healing, Healer's Touch, Restorative Hands, Lifebound Ward, Rejuvenating Surge: "when a healing spell you cast restores HP…".
- **Today.** These are Use presses after the spell, which is class B. `trgPrimeOverheal` fires only on overflow.
- **Proposed.** `trgPrimeSpellHealed { caster, spell, ppSpent, healed: [{target, amount, excess, dying}] }`. The module could then offer each ability at the moment its trigger happens, with the PP and the amounts already known. Today the player types them in.

## CD10 — Invested-trait conditionals wait for investment (ruling U4) — **done in 3.695.0**

- **Ruling.** Graham, 16 November 2026: an Invested-trait item's benefits wait for Invest Item.
- **Module half (shipped in 0.12.1).** The module's effect suppressor holds every Active Effect on an Invested-trait Pillars of Faith item until it is invested.
- **Core half.** Conditionals are read by core `conditionals.mjs`. Its `equipmentInUse` uses `wornAndStanding`, which asks only "equipped and not broken". A module cannot reach that.
- **Patch.** `core-patches/core-invested-conditionals.diff` (against 3.694.0):
  - adds an exported `hasInvestedTrait(item)`;
  - makes `equipmentInUse` return false for an Invested-trait item that is not invested.
  
  `wondrousActive` already required investment, so wondrous rows are unchanged.
- **Reach.** 5 core items: Animal Staff, Staff of Imagery, Verdant Staff, Versarians Sight, Staff of the Coast Runner. Also 16 Pillars of Faith items, and any other sourcebook's Invested-trait equipment with conditionals.
- **Tested** on a copy of the 3.694.0 core:
  - a fake-actor unit test: equipped only gives 0 rows; equipped and invested gives 1; untraited gear equipped gives 1;
  - every core verify file that imports `conditionals.mjs` or `wornAndStanding`. All passed.
  
  The full core battery exceeded this session's 10-minute command limit and was not run end to end.
- **Status.** Applied in TRG Prime 3.695.0.

## CD11 — A spell bonus scoped to one source's spells (no longer needed)

- **Entry.** Eternal Resonance: "+1-racial bonus to attack rolls and Save DCs generated by innate spells gained from your Eternal Blood Heritage".
- **Today.** `spellDCBonus` can scope by trait or `innateOnly`, but not by granting source. Spell attacks have no declared-bonus row of that kind.
- **Resolved without the core.** Graham ruled (U7) that it covers all innate spells. 0.12.2 does it with `registerCastOption` (3.679.0), whose `apply` can answer `attack` and `saveDC`.

## CD14 — A declared spell-attack bonus — **done in 3.695.0**

- **Finding (live, 16 Nov).** 0.12.2's Eternal Resonance used a casting option. The core gives no casting options to an innate cast, so the +1 never applied.
- **Done.** `flags.trg-prime.spellAttackBonus` mirrors `spellDCBonus`. Both accept `itemCasts: true`. Eternal Resonance declares both rows.

## CD12 — A rider condition on the target's HP — **the HP half was already in the core (3.625.0); the spell path and the critical's effect were done in 3.696.0**, and 0.12.4 uses both

- **Entry.** Final Sanction: +1d6 to the Judgement rider while the Subject is at half HP or fewer.
- **Today.** `lowHalfExtraDice` is carried on the rider, but the roll does not see the target's HP, so it is ticked on the damage card.
- **Proposed.** The strike-rider resolver reads the target's HP fraction when it has a target.

## CD13 — Afflictions cured in order (Mummy Rot) — **done in 3.695.0**

- **Rule.** Fiends & Fables, "Removing Mummy Rot": Remove Curse must be cast, then Remove Disease. The caster doesn't know whether either worked until both have been cast.
- **Module (0.12.2).** Cleansing Radiance follows the order. Mummy Rot declares `flags.trg-pillars-of-faith.cureSequence: ["curse", "disease"]`, and the steps taken are recorded on the affliction (`cureSteps`).
- **Core before 3.695.0** (corrected). Remove Disease carried no row at all, so it cured nothing. Remove Curse reached curse effects only. Neither touched Mummy Rot.
- **Done in 3.695.0.** Remove Disease gained a disease `counteractAffliction` row. Remove Curse gained a curse one, ahead of its effect row. The core reads `flags.trg-prime.cureSequence`:
  - a counteract of an earlier kind records its step without ending the affliction;
  - a later kind ends it only once the earlier steps are recorded;
  - the result can be whispered to the GM until the last step, per the "secret check" note.

## Recorded, not proposed

- **Investment (UNRESOLVED U4).** Ruled 16 November 2026, now CD10 above.

## 0.12.4 notes

- **CD1.** Spirit Intercession's ally (7th level) is found by scanning the scene for a same-disposition token within 30 feet whose actor has the ability. Line of Effect is the reactor's call, and the question says so.
- **CD2.** Hunter's Fangs needed one more core change during the build: a rider with `onCritical` and no `dice` (3.696.0). Before that change, it would have had to add a die to every blow.
- **CD12.** "The first Strike or Grimward spell" is now a rider with `spells: true, spellClasses: ["Grimward"]` (3.696.0). A spell of another class does not burn it.
- **CD9.** Not adopted. Gift of Healing, Healer's Touch, Restorative Hands and Lifebound Ward are already class B (one Use press), and each would need its own prompt at the heal. It is a candidate for a later block.
