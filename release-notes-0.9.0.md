# Pillars of Faith 0.9.0 — Chapter 9, The Unliving

7 October 2026. Requires TRG Prime 3.627.0 (`release-notes-3.627.0.md`), which carries every mechanism this chapter needed. The audit is `pillars-of-faith-chapter9-audit.md`.

This release adds 650 documents across 20 packs, an increase of 85:

| What | Count | Pack |
|---|---|---|
| Unliving Archetype feats | 7 | pof-feats |
| Unliving class feats | 55 | pof-feats |
| Abilities | 10 | pof-abilities |
| Natural attacks | 8 | pof-companions |
| Diseases | 3 | pof-afflictions (new) |
| Wail of the Departed | 1 | pof-spells |
| The phylactery's vessel | 1 | pof-wondrous |

## Graham's rulings, 7 October 2026

- **The Unliving Lich is Level 12.**
- **The Unliving auras roll their saves and apply them.** The core's own creature auras stay as cards.
- **Sunlight is the GM's mark** on the scene or the token.
- **Zombie Plague and Ghoul Fever** use Graham's Fiends & Fables statistics.

## Who may take what

**Unliving Archetypes.** Taken through the ordinary archetype feat pick, from 2nd level (the Lich from 12th).
- One per character: the picker hides the other six once one is taken, and a second is refused if dragged on.
- They have no progression requirements, so they never block a regular archetype.

**Unliving class feats.** Taken with an ordinary class feat pick, by any class.
- The generic nine (the Unliving trait) open to any Unliving archetype.
- Each type's feats (Unliving-Skeleton, Unliving-Zombie, …) open to that archetype only.
- The Vampire feats print "UNLIVING VAMPIRE" without the hyphen; it is normalised.

These gates are TRG Prime 3.627.0's `registerFeatGate` and `registerExclusiveFeats`.

## What each archetype gives

**Shared Unliving Base Mods**, which every archetype carries:
- the Unliving trait (Requiem, Embalmer's Black Resin, the Shroud and every "Unliving trait" rule read it);
- immunity to disease, Soul Drain, subdual damage and effects, and the Suffocating condition;
- no breath to hold;
- Darkvision, as the core's ability (a second grant is skipped).

**Each archetype also gives:**
- **Skeleton:** Base DR +1 and immunity to Bleed.
- **Zombie:** Endless Hunger and Life Sense (tertiary, full range).
- **Ghoul:** Carrion Feast (a Use) and a Bite. The book prints no statistics for the Bite, so it uses the core Bite: 1d8 piercing, Finesse.
- **Mummy:** resistance to physical damage and weakness to fire.
- **Vampire:**
  - Fast Healing 1, suppressed in sunlight.
  - Drink Blood, which is TRG Prime's own automation.
  - Sunlight Weakness, applied and lifted by the GM's Sunlit mark.
- **Ghost:** the Incorporeal trait, and weakness to essence and force.
- **Lich:**
  - Immunity to Bleed.
  - The Phylactery of Eternal Resurgence ability: a Use for each hour of rebuilding, with the siphon's Fortitude saves.
  - Its vessel, a wondrous item with 200 HP and Hardness 20.

## The class feats, by what carries them

- **Immunities, resistances, DR, Speed, ability bonuses.** These are effects:
  - Bloodless Frame, Poisonless Flesh, Still Corpse (sleep, Fatigued), Dead Nerves and Complete Undead Physiology;
  - Ossified Frame, Gravebone Wards, Toughened Bones and Bone Stride;
  - Necrotic Constitution and Desiccated Strength;
  - Necromantic Resistances (piercing and slashing, plus a Use to choose Cold or Electricity immunity);
  - Subtle Haunt (+2 Stealth).
- **Natural attacks:**
  - Bone Claws, Grave Bite, Corpse Slam, Ghoul Claws, Tomb Slam and Vampire Claws, magical where the book says so.
  - Bony Hand: 1d8 bludgeoning, plus a declared 1d6 essence rider that a critical never multiplies.
- **Death guards** (3.627.0):
  - **Unliving Fortitude:** an opposed, level-based Fortitude save, against the attacker's Level DC; a success leaves you at 1 HP. It has no effect against essence damage or a type you are weak to.
  - **Zombie Fortitude:** grants Unliving Fortitude and gives its save +2 racial.
  - **Gaseous Escape:** once a day, offered; yes leaves you at 1 HP under Gaseous Form's own effects.
- **On a critical injury with the named attack** (3.627.0 after-strikes; DCs are your Level DC):
  - **Ghoulish Venom:** a Fortitude ladder — slowed, then paralysed for a round, then paralysed for a minute with an escape save at the end of each turn.
  - **Paralytic Touch:** +2 against a Serious injury and +5 against a Deadly one; a Blunder paralyses permanently.
  - **Plague Carrier, Ghoul Fever, Mummy Rot:** expose the target to the disease at your level, once a day per creature.
- **Hunger Beyond Pain:** felling a living creature with Grave Bite or Corpse Slam heals your level + Constitution modifier (minimum 1), once a round.
- **Essence Attacks:** an unarmed or natural strike asks, as Versatile does, whether to deal essence instead; an essence strike is magical.
- **Grave-Cold Touch:** +1d6 cold on an essence strike.
- **Iron Will of the Tomb:**
  - +2 racial on Will saves against fear and mind control: pre-ticked where the save's traits say so, offered otherwise.
  - Once a round, a failed such save can become a Success, at the cost of slowed 1. This is asked after any reroll.
- **Faultless Casting:** every cast is defensive, at +0.
- **Soul-Magic Dominion:** +1 racial to the Spellcraft check and the save DC of a soul spell.
- **Corpse Leaper (Natural Leaper):**
  - High Jump to half your Speed with no check.
  - Long Jump to your full Speed with no check and no action.
  - Never the run-up penalty.
- **Spectral Drift:** fly Speed equal to your land Speed, recomputed as it changes.
- **Dead Weight:** +2 to the DCs Shove, Trip and Reposition are rolled against, as Storgar's shove bonus works; a save against forced movement offers +2.
- **Auras** (rolled, 3.627.0):
  - **Ghast Stench:** 10 ft, Fortitude, living creatures only; immunity only after a save.
  - **Aura of Despair:** 30 ft, Will, living creatures only; 24 hours' immunity to the paralysis, not to the fear.
  - **Lich Aura:** Frightful Aura at 5 ft × level, when entering; a minute's immunity whatever the result; a Blunder collapses the creature to 0 HP.
- **Innate spells:**
  - Charm Kind, Obscuring Mist, Spider Climb, Shape of the Animal (bat or wolf only), Dominate and Inflict, each with the Focus trait.
  - Hurling, at will.
  - Wail of the Departed: an innate spell-like, 2 AP, a 60-ft emanation, Will save; frightened 2 on a Failure, 4 on a Fumble, a minute's immunity on a success.
- **Through other automations:**
  - Greater Carrion Feast: Carrion Feast heals 3d6.
  - Blood Renewal: Drink Blood +5, +10 from 12th level.
  - Eternal Resurgence: the phylactery's rate.
- **Offered to tick, with the book's scope in the row:**
  - Grave-Touched Presence: vs undead.
  - Sense the Living: Perception, if you already had Life Sense.
  - Tomb Guardian: Search and Track in funerary spaces.
- **The table's:**
  - Endless Hunger.
  - Grave-Touched Presence's attitude step.
  - Still Corpse's eating and sleeping.
  - Subtle Haunt's concealment.
  - Vampiric Spawn.
  - Dominating Gaze's "visibly vampiric".

## Diseases (new pack, pof-afflictions)

- **Zombie Plague.** Incubation 1d4 days; fatigued 1–4; death at stage 5.
- **Ghoul Fever (Disease).** 2d8 essence at stages 2–5; death at stage 6.
- **Mummy Rot (Disease).** A minute as a carrier, then 4d6 essence and Injured 1.

Essence stage damage is dealt through TRG Prime 3.627.0's stage `damageType`. 3.627.0 also deals a disease's stage damage at all; only a poison's was dealt before.

The book's feats share these two diseases' names, so the items are suffixed "(Disease)" (the module keeps names unique across item types).

## Readings for Graham

- **Undead Lords option.** Not built: a campaign rule, and the GM grants the bonus feat.
- **Gaseous Escape** leaves the vampire at 1 HP. The page says what it becomes, not where its HP lands.
- **"Fail such a Will save"** (Iron Will) is read as Failure, Fumble or Blunder, not Partial.
- **The Ghoul's Bite** is the core Bite (no statistics are printed).
- **"The attack remains magical"** (Essence Attacks) is read as: an essence strike is magical.
- **Still Corpse's "Fatigue"** is read as the Fatigued condition.
- **Necrotic Constitution's no-stacking clause** concerns the Undead type, which a PC never has.
- **The Lich feats Bony Hand, Inflict Vitae, Faultless Casting and Paralytic Touch** print no prerequisites, so they need only the archetype.
- **Zombie Plague:**
  - The stage interval is not printed; 1 day is used.
  - The soul damage at stages 3 and 4 (5 a day / 5 an hour), the soul-check disadvantage at stage 2, and rising as a zombie are on the stage text for the table.
- **Ghoul Fever:**
  - The disease level is the ghoul's level, so its DC is level-based, not the printed DC 18.
  - Stages 3 and 5 are unprinted and carry the stage before.
  - Its "all healing halves / fails" is the table's.
- **Mummy Rot:** "cannot be healed until the curse is removed" is the table's.
- **The phylactery's "Regeneration 1/hour"** is read as the Codex reads Regeneration: HP equal to the lich's level, once an hour.
  - Eternal Resurgence makes it twice; a failed siphon save doubles that hour.
  - "The excess hits inflicting soul drain to the targets" is read as Soul Drain equal to the lich's level on each failing creature.
- **Sense the Living's +2** cannot see where Life Sense came from, so it is offered with the condition in its scope.

## Editorial errata (for the next printing)

- Duplicated flavour lines:
  - Still Corpse repeats Poisonless Flesh's.
  - Corpse Slam repeats Grave Bite's.
  - Mist Veil repeats Vampiric Climb's.
  - Grave-Cold Touch repeats Poltergeist Hurling's.
- The Vampire trait lines lack their hyphen.
- The chapter introduction and the Undead Lords table give the Lich as 10th level.

## Harness

- `verify-unliving` (new, 513 checks):
  - every feat against its printed entry;
  - every declaration read by TRG Prime's own pure reader for it;
  - the gates run in the system's own picker filter;
  - every name a declaration points at exists;
  - the immunity words are the defences parser's.
- Version strings and counts were updated in the seven existing suites: foundation 760, classes 897, feats 3030, grimoire 2080, equipment 1330, automation 51, magic items 592.
