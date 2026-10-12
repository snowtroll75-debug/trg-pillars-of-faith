# Pillars of Faith 0.6.0 — Chapter 6 Gear

29 September 2026. Built against TRG Prime 3.607.0 (required — one small mechanism: an armour's or shield's own bonus is in force only while it is worn), on Graham's own 3.606.0.

## What ships

**Four new packs beside the core ones** — pof-armour (extends armour), pof-shields (shields), pof-weapons (weapons), pof-alchemical (alchemical) — and twelve tools in pof-gear. 493 documents across 14 packs. Every item appears in the sheet's own Add Armour / Add Shield / Add Weapon / Add Gear / Add Alchemical Item pickers beside the core rows, purchasable at the printed price.

**Six suits of armour** (Hospice Jack, Pilgrim's Coat, Gravewarden Coat, Ossuary Lamellar, Sepulchral Plate, Oathguard Plate) with the table's DR, ACP, Max Dex, HP, speed penalty, weight and traits — Helm and Full Helm perception penalties and metal/rigid flags as the core reads them. Their printed bonuses are conditionals on the suit, gated by the new system rule: the Pilgrim's Coat offers +1 item on Conceal Faith; the Gravewarden Coat and Sepulchral Plate pre-tick +1 item on Fortitude saves against Disease and Poison effects (and offer it otherwise); the Oathguard Plate offers +1 against Shove, Trip and forced movement for a turn you have not moved. The Hospice Jack is declared the tool for Administer First Aid (`toolFor: ["firstAid"]`).

**Five shields** (Censer Buckler, Reliquary Shield, Vigil Shield, Ossuary Board, Processional Aegis) — buckler / light / heavy categories with the core Shield Bash dice for the category (none, 1d4 FDC 6, 1d6 FDC 8), the table's DB, ACP, DR, HP. The Processional Aegis offers +1 item on Perform Last Rites and Observe Sacred Custom while planted.

**Nine weapons** (Bloom Scythe, Censer Flail, Crozier, Funeral Sickle, Grave Hook, Last-Road Spear, Oath Hammer, Penitent Chain, Testament Blade) — category, group, size, damage die and type, Fumble DC, Armour Rending, weight, price and the trait line as printed. The attack workflow reads Agile, Finesse, Reach, Sweep, Trip, Shove, Disarm, Versatile and AR from the line as it does for the core weapons; the group makes a Polearm-favouring aspect reach the Bloom Scythe and Grave Hook (3.572.0).

**Twelve tools** in the core gear shape (Kits & Tools / Goods). The nine that print a +1 carry it as `goodsConditionals`, offered in the check dialog while the tool is equipped and standing, scoped to the module's action keys (Analyse Scripture, Compare Testaments, Examine the Dead, Perform Autopsy, Recognise Doctrine, Trace Religious Provenance, Preserve Remains, Perform Last Rites, Interpret Haunt, Conceal Faith) or to Search / Crafting. The Autopsy Roll is declared the tool for Perform Autopsy.

**Fifty herbs and eight consumables** in the alchemical pack's herb shape, so a Use goes down the same path as Limorsor or Winterbite: the herb is spent and its effect lands as a spell's would. Healing (Black Sap 1d6 → Godsblood Moss 6d6+15), bleeding stopped and Injury reduced, resistance to fire / cold / acid / electricity / poison and Heart of Ash's fire immunity, the +1 save herbs on the save slots (Ironbloom, Nightspire, Thunderleaf), Crystal Bark's DR 1 and Kingshield Moss's DR 2 + DB 1, Swiftfern's +5 Speed, Mindlace's +1 Spellcraft, Mistwraith Bloom's Invisible, Deepmire Lily's and Root of Stone's condition relief, Vigil Draught's Fatigued 1 suppressed for an hour, Dragon's Breath Reed as a once-only 1d6 fire strike rider, Silvermould as a silver material oil (like Silversheen), Glowmoss as a torch-bright light, Embalming Salts and Evidence Powder as pending +2s on the next check, Dreamthorn's and Void Lily's week of immunity to themselves, and nineteen scoped bonuses and advantages as conditionals on the user (the once-only ones — King's Blood, Lifeblossom, Moonpetal, Mourner's Incense — spend themselves when ticked). The rest of each entry is on the card.

## Readings and things to flag

- **Ossuary Lamellar's +1 DR against slashing** — DR on the sheet is one number; it is a note to apply by hand.
- **Ossuary Board's Shove on a Shield Bash** — a note; the Shove is resolved by hand after a hit.
- **Brace, Balanced, Nonlethal** are printed weapon traits the core weapons pack does not carry; kept on the line with a note. Balanced is a superior trait in the core (Fumble DC −1) and the printed FDC 16 already reflects it.
- **Hospice Jack "counts as a basic healer's kit for Administer First Aid"** — declared, but the core's Administer First Aid asks for no tool, so nothing changes at the table. The Autopsy Roll's declaration likewise waits on a tool requirement for Perform Autopsy (the module's actions carry none today).
- **"Until you complete a Full Rest"** (Deepmire Lily, Root of Stone, Vigil Draught) and **"once per day"** (Mourner's Incense) are notes; the rest workflow has no per-item lock.
- **Soulvine's Dying reduction, Sunveil's Dazzled removal**, Phoenix Root, Prism Lotus, Worldroot Fragment, Divine Nectar's full heal and Blackfire Ivy / Emberthistle spell riders, Rose of Thorns / Tangleweed weapon coatings — notes (Dying and Dazzled are not on the relief rail; the rest have no rail). Divine Nectar's rows take down Fatigued, Weakened and bleeding and offer the poison re-save.
- **Needleberry's +1 to ranged attacks** is offered on every attack roll (the attack check does not say whether it is ranged) — tick it on a bow.
- **Mindcrown Ivy's "checks made as part of Concentrate or Mental actions"** is offered on skill and attribute checks; the Will half is automatic against Mental effects.
- **Eternis Bloom's "1 week"** is written as 7 days so the effect has a clock.
- Weapon/armour images are the core SVG placeholders; Graham's assets folder has none for these.

## Harness

`verify-equipment.mjs` — 1,322 checks: every printed table row (armour, shields, weapons, tools) ships once with the row's numbers, category, traits and description paragraph; every herb and consumable heading ships once with its level, price, activation, usage, terrain, body and traits; the core shapes field-for-field; every equipment conditional through the system's normaliser and through `collectConditionals` worn and packed (7 rows); every goods row harvested while equipped and none while packed; `toolFor` through `toolMatches`; every consumable effect row a handled kind with its fields (73 rows — conditions real, relief relievable, durations parse, bonus slots land, riders and immunities normalise, every conditional grant kept); no name collides with a core item; the weapon groups and categories are core vocabulary; the manifest and packs. `verify-foundation` 742 (four more packs), `verify-classes` 893, `verify-feats` 3,023, `verify-grimoire` 2,057. `npm run verify` runs all five.

## 0.6.1 (30 September)

Live-tested 0.6.0 on 3.607.0 — everything passed (`claude/pillars-of-faith-live-testing-report-0.6.0.md`). Two cosmetic fixes from the cards: a tool's offered row printed "Archivist's Travel Desk (Archivist's Travel Desk)" because goods.mjs prefixes the item name to the row's label — the labels are now the context ("at the deployed desk", "examining or opening a body", "the folio's tradition"…); and a resistance herb's effect was named "Emberleaf Emberleaf" because a defence row's note is its bracketed scope — the notes are now "(resistance to fire)" and so on. `verify-equipment` guards both (1,330). No system change.
