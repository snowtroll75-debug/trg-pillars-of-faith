# Pillars of Faith 0.12.4 — Unresolved Items

16 November 2026. What is still not automated, and why. These items need one of three things:
- a ruling from Graham ("Rulings needed");
- a core change ("Core-limited"; the details are in `PILLARS_OF_FAITH_CORE_DEPENDENCIES.md`);
- nothing, because they are table rules ("Narrative").

## Rulings given (16 November 2026), now implemented (U1–U5 in 0.12.1, U6–U8 in 0.12.2)

| # | Ruling | 0.12.1 |
|---|---|---|
| U1 | Gift of Healing's extra HP on a Dying recipient is **not** a second magical heal. | Gift of Healing and Healer's Touch heal in "rider" mode: on a Dying recipient they do nothing, because the spell's own healing already took Dying down by 1. Lifebound Ward, Restorative Spores and Share the Wound are heals in their own right and keep the core Dying rule. |
| U2 | Lumeri/Lumari racial light **is** magical. | All four Bloom Light / Lantern Glow sources are `magical: true`, so Supernatural Darkness does not simply negate them. The two new lantern lights are magical too. |
| U3 | **Automate** Charm and Compulsion (the Enchantment trait) for Break the Evil Eye and Sever Influence. | Enchantment is added to both counteract rows. Their notes tell the caster to cancel the Counteract dialog against a voluntarily accepted effect (a Bless, say). |
| U4 | Invested-trait items' benefits **wait for Invest Item**. | Module half: every Active Effect on a Pillars of Faith item with the Invested trait is suppressed until invested (and, if flagged worn, until equipped too). Core half: the conditionals on such items still need only "equipped". The patch `core-patches/core-invested-conditionals.diff` fixes it and passes every core conditionals suite; it is **not** applied to the production core (CD10). |
| U5 | Lifeline and Not Yet Finished set Fatigued to **at least 1**. | Fatigued 0 → 1, 1 stays 1, 2 stays 2. |
| U6 | Plate of the Sealed Sepulchre: **plain** Resistance to essence. | Already so (while worn and invested). No change. |
| U7 | Eternal Resonance covers **all innate spells**. | Declared rows on the feat's effect (TRG Prime 3.695.0): +1 racial to the attack roll and Save DC of every innate cast, an item's included. (0.12.2's casting option never reached an innate cast; fixed in 0.12.3.) |
| U8 | Cleansing Radiance **applies its effects directly**. | No Counteract roll. Remove Fear ends Frightened and Fear-sourced effects. Remove Paralysis ends Paralysed. Restore Senses ends Blinded and Deafened. Remove Disease ends disease afflictions (including those declared counteredAs disease) and Disease-sourced effects. Remove Curse does the same for curses. A creature the player does not own is handled through the GM. **Mummy Rot** follows Fiends & Fables' "Removing Mummy Rot" (Graham, 16 Nov 2026): Remove Curse first marks the step, then Remove Disease cures it. Remove Disease on its own does nothing to it. Declared on the affliction as `cureSequence`, and Fiends & Fables' own copy is recognised by name. TRG Prime 3.695.0's cast Remove Curse and Remove Disease follow the same order and share the recorded steps. |

## Rulings needed

None open.

## Core-limited: automated as far as the engine allows

TRG Prime 3.696.0 built CD1–CD4, CD6, CD7, CD9 and CD12; CD5 and CD8 were already in the core. 0.12.4 uses them, so these rows from 0.12.3 are closed (F19–F27 in the audit):
- **Rerolls:** Spirit Intercession, Continuity Unbroken, Vowbound Resolve, Revelation in Crisis.
- **Riders:** Blood Awakened, Hunter's Fangs.
- **Equipment:** Ossuary Lamellar, Ossuary Board.
- **Feats:** Final Sanction, Deep-Rooted Ironcap, Expert Autopsist's +4, Redundant Anatomy.
- **Counteracts:** Break the Evil Eye's and Sever Influence's "cancel the dialog" note and their extra-effect warps.

Each reaction asks the reactor whether its trigger applies; the narrower wording, such as "a Mental effect on memory" or "in the Vow's fulfilment", is the reactor's call.

| Entry | What is still manual | Needs |
|---|---|---|
| Last-Road Spear | Brace is printed, but core weapons carry no Brace rule. | Core rules decision (Brace). |
| Close Reading | Partial → Success on Analyse Scripture is automated. The accidental-or-deliberate reading on a Critical is a note. | Narrative: what the GM reveals. |
| Expert Autopsist | Fumble → Failure and the Critical's +4 are automated (0.12.4). The 30-minute autopsy is a note. | A per-feat action duration. Minor. |
| Prepared for Trouble | +10 Initiative is offered. The free Recall Knowledge is a note. | A free-action prompt after initiative. Possible on `trgPrimeInitiativeRolled`, as Battle Remembered is; not done yet. |
| Soul-Hardened | The save bonus is automated. Recognising a possession attempt is a note. | Narrative. |
| Grave-Touched Presence | +2 is offered. The worse attitude step with the undead is the GM's. | Attitude is GM-tracked in TRG Prime. |
| Restore Memory | Counteract against memory-altering effects is rolled from Spellcraft and the effect removed by hand. No TRG trait marks a memory effect, so the counteract row cannot find one. | A "memory" trait on the relevant core spells (Forget, Memory Lapse), then a counteract row. |
| Anchor the Departing Soul; Last Rite | The rule that possession, animation or binding of the corpse must first counteract the spell is a card instruction. | A per-corpse counteract gate in the core's animate/possess spells. |
| Censer Buckler | The burning incense is a note. The buckler itself is automated. | Narrative. |
| Gift of Healing; Healer's Touch; Restorative Hands; Lifebound Ward | Still a Use press after the healing spell (class B, not C). | Optional: 3.696.0's `trgPrimeSpellHealed` hook (CD9) could offer them at the heal. Not adopted in 0.12.4, because each needs its own prompt design. |

Earlier rulings, unchanged: Perform Last Rites leaves its +2 DC mark on the remains. Grave-Seal Mason, Walk between Worlds, Chain of Evidence and the other Section C items of `pillars-of-faith-automation-pass.md` remain the table's (Graham, 8 October 2026).

## Every class C entry (74), with its manual step

Generated by `tools/audit-matrix/gen-audit-0124.py` from the module's own sheet lines. Many are a table judgement left inside an otherwise automated entry, such as "the free Step is a note". Others are listed above as core-limited.

| Compendium | Entry | Manual step |
|---|---|---|
| pof-abilities | Land Spirit | Manual step: …emory of the Land — +2 class is offered on Nature and Survival with the book's wording; ignoring that terrain is a note. Rooted World is what Manifes… |
| pof-abilities | Purifier | Manual step: …(tick it for a Counteract against disease, poison or a curse with a Healing spell); the target's follow-up +2 is a note for the table.… |
| pof-afflictions | Ghoul Fever (Disease) | Manual step: …than the printed DC 18. Stages 3 and 5 are not printed and carry the stage before them. The healing penalties are the table's (the card says so).… |
| pof-afflictions | Mummy Rot (Disease) | Manual step: …ay, as its Injured is. Damage it inflicts cannot be healed until the curse is removed and the disease cured — the table's. Removing it takes Remove Cur… |
| pof-afflictions | Zombie Plague | Manual step: …ted — one day is used, the disease's own rhythm; the soul damage at stages 3 and 4 and the rising as a zombie are the table's (the card says each).… |
| pof-charged-items | Rod of Intercession | Manual step: … check — take it on a Counteract against possession or a Soul effect. Its vibration near a possessed creature is a note. Pillars of Faith, Chapter 11… |
| pof-consumables | Thread of Continuity | Manual step: …tage is offered on saves for 24 hours and spent by the first memory or identity effect; the Counteract clause is a note. Pillars of Faith, Chapter 11… |
| pof-consumables | Vial of Sanctified Dew | Manual step: …ered (target an adjacent creature to feed it): choose one of the four effects at the Use; the Full Rest limit is a note. Pillars of Faith, Chapter 11… |
| pof-feats | Beacon for the Departing | Manual step: …A rule for the table while your light is active (t… |
| pof-feats | Bloom at the Veil | Manual step: …tomatically: Spirit Sense (15 ft, tertiary) is on your senses list — if you already have one, note the +15 ft by hand; +1 racial to Recall Knowledg… |
| pof-feats | Close Reading | Manual step: …nalyse Scripture resolves as a Success (the card says so); the accidental-or-deliberate reading on a Critical is a note.… |
| pof-feats | Consecrated Armament | Manual step: …ith it against an Undead creature adds 1d6 Essence on the damage card. An opposing Eternal or a desecrator is the GM's call — the card says when the… |
| pof-feats | Consecrated Flame | Manual step: …reature, +1d6 secondary Essence is rolled and applied on the card. Cremation counting as a Partial Last Rites is a note.… |
| pof-feats | Convincing Devotion | Manual step: …tomatically: +1 circumstance is offered on Conceal Faith with the book's wording; the observer's lost +2 is a rule for the table.… |
| pof-feats | Cultural Theologian | Manual step: …is offered on Observe Sacred Custom with the book's wording; folding it into Recognise Doctrine's action is a rule for the table.… |
| pof-feats | Death Investigator | Manual step: … is offered on Perception, Medicine and Survival checks with the book's wording; Examine the Dead in 1 minute is a note.… |
| pof-feats | Domain of the Land | Manual step: …e against being moved — an ally-aura conditional offered in their dialogs; ignoring natural difficult terrain is a note.… |
| pof-feats | Eternal Resonance | Manual step: …y: Eternal Lore is added to your specialist skills (if you already had it, the +2 to Recall Knowledge with it is a note); every innate spell you cast… |
| pof-feats | Expert Autopsist | Manual step: …s as a Failure, and a Critical's +2 circumstance bonus becomes +4 (the card says each). The 30-minute autopsy is a note.… |
| pof-feats | Grasp the Unseen | Manual step: …Touch against incorporeal creatures. Touching a sensed spirit, and finding one you have only a direction for, are the table's.… |
| pof-feats | Grave-Touched Presence | Manual step: … racial is offered on Intimidate and Sense Motive checks (tick it against undead). The attitude step worse is the GM's.… |
| pof-feats | Hedge Witch | Manual step: … to you. The extra Folkwarden Specialist Spell waits on the Grimoire block; Folk Lore for Identify Power is a rule for the table.… |
| pof-feats | Impossible Anatomy | Manual step: …ial is pre-ticked on Escape and offered on checks to resist a Grapple; squeezing through a smaller space is a rule for the table.… |
| pof-feats | Keeper of Records | Manual step: …ss for you automatically (the card says so); the older/authoritative caveat stands. The Research time halving is a note.… |
| pof-feats | Lantern of the Bloom | Manual step: … status to Sense Direction and to saves against Fear (ally-aura conditionals). The free Step after a Guidance is a note.… |
| pof-feats | Liturgical Revision | Manual step: …utomatically: +2 class is offered on Meditation with the book's wording; the 1-minute Spell Substitution is a rule for the table.… |
| pof-feats | Mesmeric Gaze | Manual step: …ically: Charm Kind is an innate Ethereal spell with the Focus trait on your spell list (living humanoids only — a note on the cast). The book's prer… |
| pof-feats | Miraculous Recovery | Manual step: …l on a creature dead within the round: spends the use; the card says they return at half the healing — set HP by hand.… |
| pof-feats | No Life Abandoned | Manual step: … or fewer heals half your level more (minimum 1), once per creature per spell. A Medicine action's healing is by hand; Stabilise works on anyone.… |
| pof-feats | Outcast's Resolve | Manual step: …n and the day's use, and queues the optional +1 circumstance bonus for the reroll — then reroll the Will save from your sheet.… |
| pof-feats | Perfected Aberration | Manual step: … bend at impossible angles. Prerequisites Level 15 Use (1 AP, Focus): a one-minute effect with Fast Healing 1 (a note), Bleed immunity, Base DR +1, … |
| pof-feats | Pilgrim's Grace | Manual step: …pon a member of that tradition. Make an Impression is offered from your Culture skill. The lasting bonus is a rule for the table: Observe Sacred Custom queues… |
| pof-feats | Prepared for Trouble | Manual step: …s automatically: +10 circumstance to Initiative is offered with the book's wording; the free Recall Knowledge is a note.… |
| pof-feats | Read the Room (Expert) | Manual step: …ally detect lies. Prerequisites Sense Motive 5 ranks Rolled as a Sense Motive skill action (1 minute) against the GM's DC; the card prints its ladde… |
| pof-feats | Reflexes of a Hundred Battles | Manual step: …nter's first save is offered in every save dialog with the book's wording; the free Step after Past-Life Echo is a note.… |
| pof-feats | Sacred Marginalia | Manual step: …our Prayer Book (outside your levels' free picks; they leave with the feat). The halved copying time and cost are for the table.… |
| pof-feats | Sacred Polyglot | Manual step: …d on Linguistics checks with the book's wording; reading a scripture's terminology without a language penalty is a note.… |
| pof-feats | Sanctified Treatment | Manual step: …fter a successful treatment: target the patient and press Use — the bonus (+1, or +2 on a Critical) is queued on their sheet for their next save against d… |
| pof-feats | Soul Anchor | Manual step: …l-trait and possession effects and offered against Soul Drain; recognising a possession attempt on a Critical is a note.… |
| pof-feats | Soul-Hardened | Manual step: …s +2 — this feat adds the second +1 beside it, pre-ticked on the same saves; recognising a possession attempt is a note.… |
| pof-feats | Spiritual Forensics | Manual step: …dentify Spiritual Affliction with the book's wording; making the second check as part of the examination is a rule for the table.… |
| pof-feats | Stand Over the Fallen | Manual step: …that you stand over a Dying ally — +1 circumstance to DB lands until you Use again. The Attack of Opportunity is a note.… |
| pof-feats | Still Corpse | Manual step: …Works automatically: immunity to sleep effects and to the Fatigued condition. Not needing to eat or sleep is the table's.… |
| pof-feats | Subtle Haunt | Manual step: …s automatically: +2 racial Stealth. Being concealed in dim light, darkness, mist, smoke or supernatural gloom is the table's.… |
| pof-feats | Testament of Answers | Manual step: …Use once per day after a failed Recall Knowledge: spends the use; reroll from your sheet and keep the second result. T… |
| pof-feats | Toll of Passage | Manual step: …A rule for the table: Sacred Toll reaches 60 feet … |
| pof-feats | Undying Restoration | Manual step: …ds the use; the card states the return at half the healing, Dazed/Weakened removed and Injured halved — apply by hand.… |
| pof-feats | Unfinished Duty | Manual step: … of a turn on which Dying would increase: spends the use; the card records that Dying does not increase — the GM leaves it as it stands.… |
| pof-feats | Unliving Vampire | Manual step: …iving Base Mods, Fast Healing 1 (suppressed in sunlight), Drink Blood (Use) and Sunlight Weakness (applied by the GM's Sunlit scene or token mark). … |
| pof-feats | Veil Tracker | Manual step: …t Lore. Whether a spirit left a trace to follow (Spirit Sense within the hour, or another spiritual trace) is the GM's.… |
| pof-feats | Voices of Experience | Manual step: … and the effect treats you as having half your level in ranks for the trained gates (the ranks themselves are yours to note).… |
| pof-feats | Votary | Manual step: …A rule for the table with one automation: add your… |
| pof-runes | Banishing | Manual step: …isembodied spirit or a possessor the system cannot see, the GM adds it. A Fumble's Counteract of a possession is the table's. Pillars of Faith, Chapter 11… |
| pof-runes | Exorcist (Rune) | Manual step: …ks and its resistance do not apply to this weapon (Ghost Touch's rail). Striking a possessor without its host is the table's. Pillars of Faith, Chapter 11… |
| pof-runes | Martyr's Aegis | Manual step: …the ally's defences — not reduced by the wearer's own, not passed on, never below 1 HP. The prompt appears to whoever applies the damage (usually the GM). … |
| pof-runes | Soul Mirror | Manual step: … 1 minute; Fumble: Frightened 3 and it cannot possess anyone for 1 minute. Without a known possessor the card asks the GM to roll it. Pillars of Faith, Chapter… |
| pof-runes | Soulchain | Manual step: … creature's Will save against your Level DC and the printed ladder on the damage card. A Fumble's second save is the table's. Pillars of Faith, Chapter 11… |
| pof-runes | Vowkeeper | Manual step: …le you act in furtherance of the vow you spoke at daily preparation. The vow itself, and whether it was kept, is the table's. Pillars of Faith, Chapter 11… |
| pof-shields | Censer Buckler | Manual step: …On the sheet: a buckler (no Shield Bash); the burning incense is a note. Pillars of Faith, Chapter 6.… |
| pof-specific-items | Ashen Censer | Manual step: …poreal spirits and incorporeal Undead normally). The outline of spirits within 10 feet of its burning incense is a note. Pillars of Faith, Chapter 11… |
| pof-specific-items | Hospice Vestment of the Last Lamp | Manual step: …2 AP). The integrated kit counts as an Expert healer's kit for Administer First Aid — the +1 of an Expert kit is the table's. Pillars of Faith, Chapter 11… |
| pof-specific-items | Testament of the Unbroken Line | Manual step: …ge is offered while you pursue the day's vow; the once-a-day 1d6 essence on a Critical under the vow is added by hand). Pillars of Faith, Chapter 1… |
| pof-spells | Analytical Glance | Manual step: …esilience, Mobility and Senses are read off the target's sheet and whispered to you and the GM; Capability is the GM's.… |
| pof-spells | Ancestral Grove | Manual step: …gainst Fear, possession and Soul effects is a scoped bonus on each willing creature in the grove; the rest is the GM's.… |
| pof-spells | Anchor the Departing Soul | The anchor (possession/animation/binding must first Counteract it) is a card instruction: the core has no per-corpse counteract gate |
| pof-spells | Breath of the Land | Manual step: …0. The two +2 status save bonuses are scoped rows on you and your allies in the emanation; the terrain relief is a note.… |
| pof-spells | Exorcise | Manual step: …. Ending the possession does not destroy the possessing entity. If it can normally manifest outside the host, resolve its separation according to the … |
| pof-spells | Expel Possessor | Manual step: …ter 10. The Counteract is rolled (enter the possessor's level) and its rung printed; ending the possession is the GM's.… |
| pof-spells | Last Rite | As Anchor the Departing Soul: the Counteract gate on the corpse is the card's |
| pof-spells | Restore Memory | Counteract against memory-altering effects is rolled from Spellcraft and removed by hand: no TRG trait marks a memory effect, so the core counteract row cannot find one |
| pof-weapons | Last-Road Spear | Manual step: …pse without approaching too closely. Brace is printed as a trait; the core weapons carry no Brace rule, so it is a note for the table. Pillars of Fai… |
| pof-wondrous | Lantern of the Veil | Manual step: … invested, it sheds magical light in a 20-foot radius (drawn on your token); the outline of spirits within it is the table's. Pillars of Faith, Chapter 11… |
| pof-wondrous | Pilgrim's Waystone | Manual step: …l to navigate; Walk the Road is Long Stride as an innate spell, 1/day. The designated place and its direction are the table's. Pillars of Faith, Chapter 11… |
| pof-wondrous | Thread of the Returning Soul | Manual step: …eld as an innate spell (1/day, 24 hours): the thread casts it on you when you die — cast it then. The trigger is the table's. Pillars of Faith, Chapter 11… |

## Narrative or information (class D) — nothing for the engine to execute

These are information, communication or table-judgement effects, and their cards print the rule:

- **Spells:** Blackthorn Warning, Call Minor Spirit, Final Whisper, Green Witness, Hidden Doctrine, Memory of Stone, Mycelial Message, Oathseal, Read Omen, Red Thread, Spirit Road, Spirit Trace, Veil Lantern.
- **Feats:** Bell-Warden's Ear, Chain of Evidence, Chorus without Words, Truth Burns Through, Walk Between Worlds, Vampiric Spawn (a Fiends & Fables creature rule).
- **Abilities:** Endless Hunger, Deific Aspects (an explicit "nothing to do").
- **Mundane goods:** Archive Sealant, Purifying Lye, Bloom Culture, Oath-Wax Seal, Incense of the Open Veil, Reliquary Case, Waterproof Bookcase, Testimony Kit, Vigil Censer.
- **The GM guide journal.**

## Not verified live

0.12.1 was retested live after Graham installed it. Every item on its retest list passed except two, which were not driven: Break the Evil Eye against a charm (data-checked only) and token light drawing. See `PILLARS_OF_FAITH_TEST_REPORT.md`.

From 0.12.2:
- Cleansing Radiance's removal code was driven live on a temporary copy.
- Eternal Resonance's 0.12.2 casting option **failed live**: no +1 on an innate Chill Touch. Fixed in 0.12.3 with TRG Prime 3.695.0, to be cast live after install.

Run the 0.12.2 retest list after install.

From 0.12.4: nothing has been live-tested yet. To check after installing 3.696.0 and 0.12.4:
- a failed save offering each reroll (and an ally's Spirit Intercession);
- Blood Awakened's essence on a Bite;
- Hunter's Fangs' Bleed on a critical;
- Break the Evil Eye's "None of these";
- a warped second counteract;
- Ossuary Lamellar against slashing;
- Ironcap against a Shove;
- Ossuary Board's Shove;
- Expert Autopsist's Critical;
- Redundant Anatomy after a critical;
- Judgement on a Grimward spell;
- Final Sanction's −1 DB.
