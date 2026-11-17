# Pillars of Faith 0.12.2: the last three rulings

16 November 2026. Requires TRG Prime 3.689.1 or later; verified on 3.694.0. No core change is needed. Document ids are unchanged.

## Changes

- **Eternal Resonance:** every innate spell you cast gets +1 racial to its attack roll and Save DC. That includes an item's innate spells. It shows as a required option on the casting prompt.
- **Cleansing Radiance:** the effect you choose now happens immediately, with no roll:
  - Remove Fear ends Frightened;
  - Remove Paralysis ends Paralysed;
  - Restore Senses ends Blinded and Deafened;
  - Remove Disease and Remove Curse end those afflictions, and effects of that kind.
  
  On another player's character it goes through the GM.
- **Plate of the Sealed Sepulchre:** plain Resistance to essence, as it already was.
- **Liturgical Book:** a small robustness fix found in the live retest.

## Your 0.12.1 install, retested

These were all driven in your world on temporary copies of the QA characters and worked:
- Elemental Spirit's cantrip, both for a character who chose before and for a fresh choice;
- Second Discipline withholding Forbidden Name;
- Liturgist and Liturgy of Prayer;
- Sacred Marginalia;
- both lanterns' light and Resistance;
- Final Toll;
- the Dying rider;
- Fatigued at least 1.

The copies have been removed. Their chat cards are still in the log.

**Mummy Rot** now follows Fiends & Fables' "Removing Mummy Rot". With Cleansing Radiance:
- Remove Curse comes first, and the card says Remove Disease must follow;
- Remove Disease then cures it;
- Remove Disease on its own does nothing.

This also works on Fiends & Fables' own copy of the affliction. The core's own Remove Disease spell still cures Mummy Rot alone. That is a core change, written up as CD13 in the core dependencies.

Verification: 9,634 harness checks, all green.
