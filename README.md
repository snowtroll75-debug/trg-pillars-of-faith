# TRG Prime: Pillars of Faith

A companion module for the [TRG Prime](https://www.trarisgames.co.uk/) system on Foundry VTT, carrying the *Pillars of Faith* sourcebook. Requires **TRG Prime 3.627.1 or later**. The system gave modules their API at 3.560.0; each later requirement is the release that carries the mechanisms a chapter needed. See the release notes beside this file.

## What is in this build (0.9.3)

- **Chapter 1:** the Haunt, Investigation, Spirit and Unliving traits.
- **Chapter 2:**
  - four races (Eshari, Kethrani, Myrathi, Rhevani), their twenty heritages and racial abilities;
  - twelve backgrounds;
  - three languages.
- **Chapter 3:** five classes (Archivist, Folkwarden, Grimward, Healer, Shaman), with their tables, class abilities, sub-choices and Use-driven activations.
- **Chapter 4:** the faith-flavoured skill actions.
- **Chapter 5:** the racial, archetype, class and general feats and their automations.
- **Chapter 6:** armour, shields, weapons, tools, fifty herbs and eight consumables.
- **Chapter 7:** twenty-two Divine Aspects.
- **Chapter 9 (0.9.0, live-tested, fixed in 0.9.1 and 0.9.2):** the Unliving.
  - Seven Unliving Archetypes, at most one per character.
  - Fifty-five Unliving class feats, gated to their archetype.
  - The Shared Unliving Base Mods.
  - Eight natural attacks.
  - Zombie Plague, Ghoul Fever and Mummy Rot.
  - Wail of the Departed.
  - The Phylactery of Eternal Resurgence.
  - Every numbered rule is a declaration TRG Prime 3.627.0 reads: death guards, after-strike saves and disease exposure, rolled auras, sunlight, save conversion and the rest.
- **Chapter 10:** the Grimoire (65 spells), plus Sacred Toll. It also carries the two Eldritch Arts spells until that book ships.
- **Chapter 11:** runes, specific magic armour and weapons, wondrous items and relics, rods and staves, and magical consumables.

**Coming later:** Chapter 8, Spirits & Haunts.

## How it plugs in

Every pack declares in `module.json` which system pack it extends (`flags.trg-prime.extends`), and TRG Prime federates it into its own choosers and grants. What is not data is registered from `scripts/pillars-of-faith.mjs` inside the system's `trgPrime.registerContent` hook:
- traits and languages;
- racial Power Points;
- classes and archetypes;
- skill substitutions and degree upgrades;
- feat access, feat gates and exclusive groups;
- runes and item automations;
- the Use-driven automations.

## Building and verifying

```
node tools/build-packs.mjs   # packs-source/ JSON and compiled packs/
npm run verify               # the eight suites (foundation, classes, feats, grimoire, equipment, automation, magic items, unliving)
node tools/build-zip.mjs     # ../trg-pillars-of-faith-<version>.zip
```

The suites expect the TRG Prime system beside this module, or at `TRG_PRIME_ROOT`. They resolve every granted name against the system's packs, and hand every declaration to the system's own reader for it.
