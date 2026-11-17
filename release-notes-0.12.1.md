# Pillars of Faith 0.12.1: review fixes and rulings

16 November 2026. Requires TRG Prime 3.689.1 or later; verified on 3.694.0. No core change is needed to run it. Document ids are unchanged, so existing characters keep their links.

Graham reviewed 0.12.0: "you have definitely missed things. Elemental Spirit for example is not granting a free cantrip." He also ruled on the five open questions. This release fixes what the re-run sweep found and puts the rulings in.

## Why things were missed

The audit's inventory had cut every description at 600 characters. On a long entry, the module's own "Works automatically… / On the sheet…" line comes last, so the classifier never saw "is yours to add", "by hand" or "the table's". It now reads the full text, and the manual-step scan is broader. The honest count of partly-manual entries (class C) is 86, not 21. Each is listed with its manual step in `PILLARS_OF_FAITH_UNRESOLVED.md`.

## Now automated

- **Elemental Spirit** gives its free Verdant cantrip of your element. If you chose your element before this release, Use the ability again to take it.
- **Second Discipline** gives the second discipline's skill and 1st-level spell, never its 7th-level Advanced spell.
- **Sacred Marginalia:** Use it to add four Divinity spells to your Prayer Book. They don't use up your levels' free picks, and they leave with the feat.
- **Liturgist:**
  - Use it to take the Liturgical Book and record four Divinity spells you can cast.
  - Use it again each day for the daily selection. That spell is on your spells table until your next daily preparation, and it is not counted against your memorised spells or repertoire.
  - It also records spells learned from written sources.
  - **Liturgy of Prayer** now reaches only spells recorded in the book. The spell leaves at the end of your turn.
- **Lantern of the Veil** (20 ft) and the **Lantern of the Last Road** relic (30 ft) give magical light while held and invested. The relic also gives Resistance to essence.
- **Final Toll:** Use it after Sacred Toll's save (target the creature, pick the result). No Reactions, −1 to attacks and Slowed 1 land for a round, and Sacred Toll stays spent.

## Rulings

1. Gift of Healing's and Healer's Touch's extra HP does nothing on a Dying ally. The spell has already reduced Dying.
2. Lumeri and Lumari racial light is magical.
3. Break the Evil Eye and Sever Influence now also counteract Charm and Compulsion (Enchantment). Cancel the dialog against an effect the target accepted willingly.
4. An item with the Invested trait gives nothing until invested. This covers the module's own item effects. Item **conditionals** need a core change: `core-patches/core-invested-conditionals.diff` is supplied and tested. It is not applied; fold it into a core release if you approve.
5. Lifeline and Not Yet Finished leave you at least Fatigued 1. They no longer add 1.

## Still to decide

See `PILLARS_OF_FAITH_UNRESOLVED.md` U6–U8:
- the Sealed Sepulchre's resistance;
- Eternal Resonance's scope;
- Cleansing Radiance's five effects.

## Verification

- The 11 harness files: 9,623 checks, all green.
- The new Liturgist, Sacred Marginalia, lantern and Final Toll code was driven in the world on temporary copies of the QA characters.
- Elemental Spirit's and Second Discipline's changes are covered by the harness only. Please check them after install; see the retest list in `PILLARS_OF_FAITH_TEST_REPORT.md`.
