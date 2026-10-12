# Pillars of Faith 0.9.1 — the Chapter 9 live test's fixes

7 October 2026. Requires TRG Prime 3.627.1 (`release-notes-3.627.1.md`). The live test is `pillars-of-faith-live-testing-report-0.9.0.md`. No documents were added or removed: 650 across 20 packs, as in 0.9.0.

## "Racial" bonuses are typed as the core types them

The book says "racial bonus". TRG Prime's key for that type is `race` (`dice/resolution.mjs`, BONUS_TYPES). Every Pillars conditional written as `racial` reached the core as an unknown type, so it was shown on the card as **Untyped** and stacked as one.

This was found live. Iron Will of the Tomb's +2 printed "Iron Will of the Tomb Untyped +2", and Soul-Magic Dominion's +1 on Spellcraft did the same. It affected 27 feats:

- seven Chapter 9 feats with eight conditionals between them (Grave-Touched Presence, Sense the Living, Dead Weight, Zombie Fortitude, Iron Will of the Tomb ×2, Tomb Guardian, Soul-Magic Dominion);
- Soul-Magic Dominion's spell DC bonus as well;
- twenty racial feats from 0.3.0 onward (Morrowmade, Impossible Anatomy, Velvet Voice, Radiant Constitution, Soul-Hardened, Gravecap Resonance and the rest).

The heritages and race abilities were already typed `race`.

The conditional builder now maps the book's word to the core's key. The harness checks that every modifier the module ships has a type TRG Prime knows. The feats suite used to allow "racial", which is how this got through.

**Copies already on characters.** TRG Prime 3.627.1 reads `racial` as `race` wherever a conditional is read, so feats already on sheets are also corrected. Nothing needs re-adding.

## Through TRG Prime 3.627.1

These fixes are in the system, not the module, and need no change to the module's data:

- The Phylactery siphon's Fortitude save, the death guards' saves, the after-strike saves, the aura saves and Drink Blood's Athletics check now roll with the creature's modifiers.
- Ghoul Fever, Zombie Plague and Mummy Rot exposure is once a day per creature again.
- Corpse Leaper's automatic High Jump costs its 2 AP.
- A player's critical injury on a GM's creature no longer throws away the strike.
- Undead NPCs are immune to disease.

## Harness

verify-unliving gains section H (4 checks; 517 in all). verify-feats no longer accepts "racial" as a bonus type. Version pins moved to 0.9.1 / 3.627.1. All eight suites are green.
