# Pillars of Faith 0.5.0 — Chapter 7 Divine Aspects, Chapter 10 the Grimoire

18 September 2026. Built against TRG Prime 3.572.0 (required — one small mechanism: a favoured weapon may be a weapon group).

## What ships

**Twenty-two Divine Aspects in a new pof-aspects pack** (extends the core divine-aspects pack): Ancestors, Beauty, Decadence, Endurance, Fellowship, Harvest, Knowledge, Life, Mercy, Moon, Oaths, Oblivion, Oceans, Pain, Pilgrimage, Protection, Purification, Revelation, Sacrifice, Undeath, The Veil, Wrath — each in the core shape: alignment traits, edicts, anathema, suggested ethics (the flag the Apply Grants card reads), class skill (derived), favoured weapon (proficiency and +1 class to attacks), the eight-spell specialist list the aspect's Use chooser offers (PP 1 only for a Grimward or Cleric), and the four bonus spells as a levelled grant. They appear in the sheet's Divine Aspect slot beside the core ten.

**Sixty-five spells in pof-spells** (beside Sacred Toll): 21 ordinary Divinity/Verdant/Arcane spells and 44 Specialist Spells — Archivist 10 (the discipline spells: Doctrinal Ward, Word of Censure, Hidden Doctrine, Forbidden Name, Last Rite, Anchor the Departing Soul, Exemplar's Grace, Saintly Intercession, Read Omen, Unfold the Future), Folkwarden 10, Grimward 6, Healer 5, Shaman 10, Cleric 2 (Communal Litany, Grace Beyond Need), Druid 1 (Green Witness). Every spell carries the book's trait line, tradition, cast time and components, range, area, targets, save, duration, body, warping options and caster-level lines, in the fields the cast workflow reads.

**What the cast does.** Where a spell's effect is a number the applier knows it is a declared row: degree-gated conditions (Word of Censure's Frightened 1/2/3 and Dazed; Forbidden Name's Weakened; Writ of Restraint's Slowed; Binding Cord's Speed penalties on every speed and Immobilised), healing (Bloom of Renewal 3d8 to allies in the area; Distant Remedy 3d6; Restorative Wave 5d8), essence resistance (Soul Sanctuary, Spirit Shelter), Soul Drain relief (Soul Rebinding), Fatigued suppression (Litany of Endurance), a chosen save bonus (Exemplar's Grace), a sense (Veil Sight, Open the Veil), a spell attack for essence (Spirit Rebuke), and nineteen scoped bonuses and advantages as conditionals on the target (Fungal Ward, Hallowed Rest, Hearthsign, Hedgeward, Bitter Charm, Old Law of the Threshold, Ancestral Grove, Breath of the Land, Litany of Remembrance, Rooted Soul, Doctrinal Ward, Unfold the Future's Portents, Steady Hands, Forensic Light, Offering to the Unseen, Vital Diagnosis, Unmask the Subject…) — pre-ticked where a trait settles it, offered with the book's wording otherwise. Fifty-odd warping options carry the mods the chooser applies (+1 to the bonus with its cap, +1d8 healing, extra targets, wider emanations, longer durations, a farther range); the rest are printed on the card. Counteract attempts (Exorcise, Expel Possessor, Break the Evil Eye, Sever Soulchain, Sever Influence, Restore Memory, Nine-Herb Restorative, Quarantine Working, Still the Haunt, Soul Rebinding's second mode) roll from Spellcraft as they always have, with the ladder on the card.

**The class specialist spells resolve.** The Archivist disciplines' `grantedSpells` land now (Canonist's Doctrinal Ward at 1st and Word of Censure at 7th, and so on); the Grimward's PP 1 pick comes from its Divine Aspect's Use as the Cleric's does (the class line prints the sentence the chooser keys on); **two new 1st-level class abilities, Folkwarden Specialist Spell and Shaman Specialist Spell**, choose the PP 1 spell from the Grimoire on Use (six Folkwarden options, five Shaman) and replace it on a second Use. Old Secret (the day's borrowed Folkwarden spell) and Hedge Witch (the extra one) are real choosers now rather than notes.

## Readings and things to flag

- **Touch of Healing** — the Healer's 1st-level specialist spell "from the Core Rulebook" is in neither the core spells pack nor this chapter. Still reported unresolved on the Healer's Apply Grants card.
- **Symbol of Pain** — Pain's 12th-level bonus spell exists nowhere. Reported unresolved when a Pain aspect reaches 12th.
- **Spirit Rebuke** prints Base Damage 1d6 on the stat line and "2d6 essence damage" in the text; 2d6 is shipped.
- **Bonus spell "(0)"** — the book prints Guidance (0) and Light (0) where the core prints (1) for a cantrip's slot; read as arriving at 1st.
- **Favoured weapons printed as groups** (Sword, Hammer, Knife, Polearm) need 3.572.0's group match; Club, Spear and Flail already reached their families by name.
- **Rooted Soul** is both a Myrathi racial feat (Chapter 5) and a Verdant spell here. Nothing grants the spell by name, so the pair never meets the by-name dedupe; kept as printed.
- Grace Beyond Need's temporary HP (the excess healing) is set by hand — the cast cannot see the overflow of the spell it reacts to.

## Harness

`verify-grimoire.mjs` — 2,032 checks: every aspect and spell heading ships once with the book's fields, text, warps and caster-level lines; the core shapes; every effect row a handled kind with its fields, every spell conditional through the system's normaliser, every warp mod a known key, every condition real; every aspect spell resolves in the core pack (Symbol of Pain excepted) and splits four PP 1 / four PP 7; the class grants resolve (Touch of Healing excepted); the registrations, the pickers, the manifest. `verify-foundation` 730, `verify-classes` 893, `verify-feats` 3,023 updated. `npm run verify` runs all four.

## 0.5.1 (same day)

**Touch of Healing and Symbol of Pain are from the Eldritch Arts sourcebook** (Graham, 18 Sep), not missing. Both are carried in pof-spells from the text he supplied, flagged `borrowedFrom: "Eldritch Arts"` and saying so in their description, so the Healer's 1st-level grant and Pain's 12th-level bonus spell resolve now. Touch of Healing: PP 1 Healer specialist, 2d6 healing (+1d6 per +1 PP warp), somatic *or* verbal (the gate asks for neither; on yourself 1 AP verbal — a card note). Symbol of Pain: PP 12 arcane/divinity Rune, Fortitude save, Injured 2 on a Failure and 4 on a Fumble, the hour and the Remove Curse rule on the card. **When Eldritch Arts ships as a module, these two leave this pack** (the flag finds them). `verify-grimoire` 2,060.

## 0.5.2 (same day)

Live-tested 0.5.1 on 3.572.0 — everything passed (`claude/pillars-of-faith-live-testing-report-0.5.1.md`) except **Spirit Rebuke, which applied its 2d6 twice**: an attack spell's damage is `system.damage` and the extra `damage` effect row applied it again. Row removed; the harness now refuses a damage row on any attack spell. No system change.
