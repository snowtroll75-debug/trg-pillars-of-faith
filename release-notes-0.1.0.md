# Pillars of Faith 0.1.0 — foundations (Chapters 1–2)

16 September 2026. The first block of the *Pillars of Faith* sourcebook as a TRG Prime companion module, built against TRG Prime 3.560.0 (the companion-module API release, shipped alongside). Scope per Graham: foundations first — traits, races, heritages, backgrounds — with Unliving archetypes and Spirits & Haunts confirmed in scope for later blocks.

## What ships

62 documents across six packs, each extending the matching system pack by manifest flag.

**Traits** — Haunt, Investigation, Spirit, Unliving. Registered into the defence vocabulary so "immune to Haunt" parses; Spirit Sense is a sense, not a trait, and is modelled as one.

**Languages** — Vesperic (Eshari), Rhevic (Rhevani), Mycelic (Myrathi), in the language chooser under their rarity group.

**Races** — Eshari, Kethrani, Myrathi, Rhevani. Ability modifiers as racial-slot effects, Medium at 25 ft, core languages, "any common or regional" additional languages, two specialist skills each, Power Points 0 (registered explicitly, not left to the homebrew default). Racial abilities are ability items:

| ability | how it works |
|---|---|
| Soul Warden | +1 race to saves; pre-ticked against Soul-trait effects, offered for Soul Drain and possession |
| Spirit Sense | a tertiary sense on the senses list, full range (see Rulings) |
| Living Testament | +1 race offered in Religion and Linguistics dialogs with the book's wording |
| Revelatory Script | Read Aura granted by the race as an innate Focus cantrip (needs the new race `grantedSpells` field in 3.560.0) |
| Sacred Inscription | +1 race to saves; pre-ticked against Curse-trait effects, offered otherwise |
| Fungal Physiology | +2 race to saves; pre-ticked against Disease/Poison traits, offered otherwise |
| Ancestral Communion | Use: 1 AP + Focus use; advantage pre-ticked on the next Recall Knowledge for two round boundaries |
| Continuity of Self | +1 race offered on every save with the book's wording |
| Past-Life Echo | Use: choose a skill; +2 racial on it and its trained actions waived (the Gnome's `untrainedActions` mechanism) for two round boundaries; 1 AP + Focus use |

**Heritages** — twenty, five per race, every printed line carried:
Ashen (fire resistance; smoke note), Kelvan (Sacred Toll), Lumari (Lantern Glow toggle + Guidance innate Focus), Velari (Spirit Sense (Velari) at 60 ft replacing the race's, +1 race Perception offered), Morrin (Con +1); Avenor (+1 race Medicine, Stabilise innate Focus), Korath (+1 race Intimidate and Sense Motive; Demoralise floor note), Sapiren (Int +1; "any one Lore" chooser), Serel (advantage vs Illusion pre-ticked; +1 race on Detect Deception pre-ticked), Tharos (Warding Word); Karuum (Base DR 1 as base natural armour), Lumeri (Bloom Light toggle + Guidance verdant innate Focus), Morrai (essence resistance), Nethri (+1 race Sense Motive; Silent Exchange), Vaelori (+1 race Medicine; Purify innate Focus); Arathi (Str +1; +10 race Initiative), Dornai (Death State +2), Sevrai (+5 ft; one extra common/regional language via the language chooser), Thaeli (Guidance innate Focus), Velori (Int +1; "any one Lore" chooser).

**Sacred Toll** is shipped as an innate spell-like rather than a text ability, because the system's innate branch already does exactly what the entry asks: 0 PP, a level-based save DC, Focus by default, Refocus restores it. The target rolls a real Will save and the frightened ladder lands by degree (partial 1, failure 2, fumble 2 + no-reactions note, blunder 3 + note). Success is unaffected, as printed.

**Warding Word** is a reaction Focus ability: target the ally, press Use; the +1 status DB effect is created on them (through the GM relay when the player does not own them), the reaction and the Focus use are spent.

**Backgrounds** — twelve, identical in shape to the core ones: bonus feat granted by name, three +1 class skill changes in CUSTOM mode, specialist skill created on apply. Wealth defaults to 1, which is the value most core backgrounds carry (Graham to confirm; the book does not print one).

**Feats** — the twelve General feats the backgrounds grant, with prerequisites as printed. Wired now: Voice of Resolve (Use queues the ally's +2), Outcast's Resolve (reaction + daily use + optional +1 queued), Grave Vigil (offered +2 Search / +10 Initiative), Sworn Testimony (offered +4 Detect Deception), Sanctified Treatment (Use queues the patient's bonus), Consecrated Craft (offered +2 Create/Repair), Pilgrim's Grace (Make an Impression opened from Culture), Keeper of Records (Research note). Declared against next block's action keys, live the moment those actions land: Relic Appraiser, Veil Listener, Doctrinal Recall, Rite of Passing, and the substitution halves of Consecrated Craft and Pilgrim's Grace. Each of those says PENDING in its own text; nothing is claimed as automated that is not.

## Rulings needed from Graham

1. **Language rarity.** Vesperic, Rhevic and Mycelic are registered as *uncommon* (like Dengaris and Sharuk). The book prints no rarity. Common would put them on every race's additional-language list.
2. **Spirit Sense range.** Chapter 1 says "its range is the same as any other tertiary sense. 30 + Wis x 5 feet"; the Eshari race entry says "within 30 feet". The sense is modelled on Chapter 1 (the formula, not halved — the same ruling as granted senses on 25 Aug). Velari's "increases to 60 feet" is modelled as a fixed 60.
3. **Background wealth.** Not printed; set to 1.
4. **Book text defects found while transcribing** (V1.01): Tharos's Warding Word and Velori's mechanic and Shrine Mason's specialist skill are all present in the .docx but anchored to images in a way that a plain export drops — they were recovered from the document XML. The Vaelori heritage has an editorial paragraph ("These expansions preserve the existing identity and mechanics of all four races…") sitting between its lore and its mechanic; carried as printed, but it reads as a leftover.
5. **Korath's Demoralise floor** ("frightened cannot be reduced below 1 until the end of your next turn") is a note, not enforced — the frightened decrement lives in the condition machinery and a floor would be a system change. Say if you want it built.
6. **Living Testament / Continuity of Self / Velari** are offered-with-wording rather than pre-ticked, because whether a Religion check "concerns sacred writing" is the judgement the text leaves to a person — the same split the core conditionals use.

## Harness

`tools/verify-foundation.mjs` — 486 checks. A: every printed number diffed against a hand-typed table (races, all twenty heritages, all twelve backgrounds, Sacred Toll's ladder, the Focus abilities). B: every granted name resolves against the system's packs or this module's; every conditional action key is a real system action or on the declared PENDING list, and a pending feat says so in its text; no module item shadows a core one; every automation and hint names a shipped item; every ability, heritage and feat has a Use or a hint. C: registration driven against a fake API. D: manifest and compiled packs.

Not driven here: the Use handlers themselves (they need Foundry). They are the next live-test pass, on Graham's world.

## Live-test plan (not yet run)

On a fresh character in TRG V14 with 3.560.0 and this module active: pick each race from the race picker (module entries should appear beside core ones), confirm attributes/size/speed/specialist skills/abilities land; pick each heritage (filtered to the race), confirm effects and granted spells (innate, Focus); Kelvan casts Sacred Toll at an undead — Will save at level DC, frightened by degree; Past-Life Echo and Ancestral Communion spend AP and a use, Refocus restores; Lantern Glow toggles; Sapiren names a Lore and the specialist skill appears; a background applies its feat, skills and specialist skill; console shows one "companion content from: trg-pillars-of-faith" line and no registration warnings.
