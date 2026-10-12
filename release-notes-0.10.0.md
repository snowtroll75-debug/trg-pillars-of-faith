# Pillars of Faith 0.10.0 — Chapter 8: Spirits & Haunts

8 October 2026. **Requires TRG Prime 3.629.0.** This follows Graham's design (`claude/pillars-of-faith-chapter8-design.md`), with all four questions answered as recommended. 661 documents across 22 packs (+11).

## New: Pillars of Faith: Haunts & Spirits (an Actor pack)

The nine sample haunts, each an NPC with TRG Prime 3.629.0's Peril section filled in from its stat block:

| Haunt | Level (DC) | Kind | Disable | Suppressed for |
|---|---|---|---|---|
| The Unfinished Farewell | 1 (15) | simple | Occultism / Religion 15 | 24 hours |
| The Empty Chair | 3 (17) | simple | Occultism / Religion 17; +2 for a remembered name (offered) | until Reset |
| The Bell That Calls No One | 4 (18) | simple | Religion 18, Occultism 20 | until Reset ("sunrise") |
| The Drowned Procession | 6 (20) | complex, Initiative +30 | Occultism / Religion / Nature 20 ×3 | until Reset |
| The False Confession | 7 (21) | simple | Occultism / Religion 21; +2 for the examined ledger (offered) | 1 hour |
| The Oathbound Door | 9 (23) | simple | Religion 23, Linguistics 25 | until Reset |
| The Last Watchman | 10 (24) | simple | Diplomacy / Religion / Spirit Lore 24 ×3 | until Reset |
| The Choir Beneath the Floor | 12 (26) | complex, Initiative +60 | Religion / Occultism 26, Performance 28 ×4 | until Reset |
| The Hungry Reliquary | 15 (29) | complex, Initiative +75 | Religion / Spirit Lore 29, Occultism 31 ×5 | until Reset |

**What each haunt carries:**
- the Detection and Disable lines, Trigger, Effect, Anchor, Resolution and Reset as printed (the core reads the lines itself);
- *suppressed* by Disable;
- **no physical body**;
- marked as a spiritual presence, because "Spirit Sense can reveal that a haunt is present and its general direction";
- a complex haunt's **routine actions** as abilities on its sheet. Each **Use** rolls and applies its effect against the creatures the GM targets.

**What Trigger applies, rung by rung,** is pinned in `verify-haunts`. For example, the Bell rolls a Will save at DC 18 for every living creature within 30 feet of its token. Its rungs are:

| Rung | Result |
|---|---|
| Success | Frightened 1 until the end of the creature's next turn |
| Partial | Frightened 2 |
| Failure | Frightened 3 |
| Fumble | Frightened 3, plus Dazed 1 until the end of the next turn |
| Blunder | Frightened 4, plus Dazed 1 for a round |

The deaf are skipped.

The pack also holds **Spirit Presence (Template)**: an NPC with the Spirit trait and a level, with the ten Spirit Presence lines in its GM notes. Placed as a token, it can be targeted by the Level-DC actions (Read Spirit Signs, Trace Possession, Interpret Haunt).

## New: Pillars of Faith: GM Guides (a JournalEntry pack)

*Running Spirits & Haunts*, in three pages:
1. **Spirits and Spirit Presences.**
2. **Haunts:** what each field and button does.
3. **What stays at the table.**

## Automations (module/haunt-automations.mjs)

- **The Hungry Reliquary's Effect.** The creature the GM targets (the one that asked for aid) regains 5d6 HP. A random living creature within 60 feet of the reliquary loses the same as essence damage, but not below 1 HP on this opening trigger. The haunt then rolls Initiative.
- **Redistribute Suffering.** The living creature within 60 feet with the lowest share of its HP heals 4d6. A different random living creature in range takes the same as essence damage, with a Basic Will save at DC 29.
- **Interpret Haunt** (Chapter 4), answered through the core's new `trgPrimeActionResolved` hook:
  - on a Success, the GM is whispered the haunt's traits and **likely trigger**;
  - on a Critical, its **Anchor** and **Resolution** too ("the GM may also reveal one method that could placate, avoid or weaken it").

## Spells

- **Still the Haunt** now counteracts the targeted haunt at its level and Level DC. It suppresses for 24 hours on a Critical, 1 hour on a Success, and until the beginning of your next turn on a Failure. The +4 PP warp makes those 48 hours and 2 hours.
- **Quarantine Working** does the same against a haunt or magical trap: 10 minutes on a Critical, 1 minute on a Success, and 1 hour on a Critical with the +4 PP warp. Against an item, ward or effect, it stays the note.

## Readings taken (for Graham)

**Spans and timing**
- The Bell's "until sunrise" is **until Reset**, which the GM presses; there is no sunrise clock.
- The Empty Chair's "Destroying the chair suppresses the haunt for 1 week" stays text.
- "Until the end of its next turn" is 2 rounds.

**Effects that stay as text**
- The Last Watchman's 1 AP response and countersign: the GM simply doesn't press Trigger when the countersign is given.
- The Watchman's Blunder grudge (−2 to social checks) and "unable to cross".
- The Unfinished Farewell's "cannot willingly approach the bed".
- The False Confession's false conviction and compelled confession.
- The Surging Crowd's push.
- Drowning Memory's "cannot speak" and Borrowed Voice's singing.
- Borrowed Memory's lost skill and memory: Dazed on a Partial is applied; the rest is on the card.
- Destroying an Anchor or a petition.

**Clocks**
- In "Frightened 3 and Dazed 1 until the end of the creature's next turn", the clock goes to the Dazed. Frightened keeps its recovery save.

**Fumbles**
- A counteract's Fumble triggers the haunt (Chapter 12), even where Still the Haunt's own Fumble reads "unaffected".

**The Hungry Reliquary**
- Its requester is the GM's target.
- "Most visibly injured" means the lowest share of maximum HP.
- "Within range" means 60 feet of the reliquary's token.

## Harness

- **New suite:** `verify-haunts` (153 checks). It checks the nine haunts against the book, every line as the core reads it, what every Effect and routine action applies, the template, the guide, the spells, registration and the packs.
- **Versions and pins:** every suite now pins 0.10.0 and requires 3.629.0.
- **Check counts:**
  - foundation 766 (the two new packs);
  - grimoire 2086 (`perilSuppress`, and the rows' targets).
