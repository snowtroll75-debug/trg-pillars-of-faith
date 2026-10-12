# Pillars of Faith 0.3.1 — live-test fixes and Graham's four rulings

17 September 2026. Built against TRG Prime 3.564.0 (required).

## Rulings (17 Sep)

1. **Healer's magical ability is Wisdom** — the book's Charisma sentence is a typo. No data change (0.3.0 already used Wisdom); the comment says so now.
2. **Specialist spells wait for the Grimoire block.** Unchanged: the disciplines and the Healer name them and the Apply Grants card reports them unresolved until Chapter 10 ships.
3. **Judgement's secondary damage is automated.** The Judgement effect declares a strike damage rider (TRG Prime 3.564.0): the first damaging Strike against the Subject each round adds +1d6 (2d6 at 9th, 3d6 at 17th) in the weapon's type, through the damage pipeline, with its own card line. When the Subject was typed rather than targeted the rider is offered on every Strike. A Grimward spell's first damage is still added by hand (spells have no rider hook yet).
4. **Inquisition's bonus is read live.** The effect's conditionals say `valueFrom: "classBonus"`, so a level-up needs no re-Use.

## Live-test fixes (0.3.0 on 3.563.0, world TRG V14)

- **The Archivist's Prayer Book never arrived.** The class ability and the gear item shared the name "Archivist's Prayer Book"; the grant path's already-granted test is by name across item types, so the gear was "already granted — skipped". The gear is now **Prayer Book** and the class grants that.
- **Beast Within moved nothing.** Its effect added to `movement.land` itself and to a `defence.dodge` slot the pool does not have. Both now write the pools' untyped slot (`.other`): +10 ft Speed and +1 to DB land on the sheet.

## What the live test confirmed

Startup clean: five classes registered, eight packs federated (pof-classes into classes, pof-gear into gear). Healer: class lands with its five 1st-level abilities, Cure/Restoration/Stabilise granted, Touch of Healing reported not found (loud), Wisdom casting, 2 Control Levels at 1st (+1 per level), 4 PP; Healer's Calling → Chirurgeon lands with Chirurgery; deleting Chirurgeon takes Chirurgery away; XP to 5th grants Restorative Overflow and the Repertoire card says 6 picks, 1 swap, next pick 6 / next swap 6; Gift of Healing healed a targeted 1-HP rat by 5. Archivist: three granted feats, four abilities, learned book caster, 6 opening book slots offered as "any PP 2 divinity spell", Bless picked into the book; Recite from the Text marked it prepared and spent the Focus use. Folkwarden: Heighten Spell and Alchemist granted, Alchemical Crafting followed from the Alchemist, Folk Lore on the specialist skills; Warding Charm (Mind, +1) landed on the targeted creature with the Preparation count 1 of 2. Grimward: needs a Divine Aspect (slot opens); Inquisition on a targeted rat then Judgement — the +1 attack conditional pre-ticks against the rat's uuid and not another's, the +1 save pre-ticks from the rat, the +2 class bonus is offered on Recall Knowledge and Sense Motive. Shaman: Spirit Lore on landing; Spirit Guide → Beast Spirit with Animal Lore; Manifest Spirit put Beast Within on the sheet for 60 s; Spirit Communion offered 59 Ethereal PP ≤ 2 spells and Alarm landed flagged; Nature offers Trace Possession and Interpret Haunt. Cleanup: five test actors and both tokens removed.

## Harness

`verify-classes.mjs` — 881: the two fixes and the four rulings pinned (the prayer book's name is not an ability's; Beast Within writes pool slots; Inquisition never bakes a value; Judgement declares its rider; the system carries riders and scaling).
