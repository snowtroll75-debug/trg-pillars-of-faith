# Pillars of Faith 0.2.0 — rulings applied, Chapter 4 skill actions

17 September 2026. Built against TRG Prime 3.561.0 (required).

## Graham's rulings (17 Sep)

- **Spirit Sense** — confirmed as modelled: a tertiary sense at full range, 30 + Wis × 5; Velari a fixed 60. No change.
- **Language rarity** — Vesperic, Rhevic, Mycelic are uncommon. Already so; the assumption note is gone.
- **Korath's Demoralise floor — enforced.** The heritage now declares `inflictedFloors` and the system (3.561.0) stamps a floor on the target after a successful Demoralise: its frightened cannot drop below 1 until the end of the Korath's next turn, and the recovery save, Rally and Medicine all honour it and say so on the card. The note effect is gone.
- **Vaelori** — the heritage text is now the paragraph Graham supplied; the stray editorial sentence is out.
- Background wealth stays at 1 (not ruled on; not printed).

## Chapter 4 — fifteen skill actions

Registered through the module API and appended to the live skill-action table, so each appears in its skill's action chooser exactly as a core action does: Observe Sacred Custom and Trace Religious Provenance (Culture); Conceal Faith (Deception); Analyse Scripture and Compare Testaments (Linguistics); Examine the Dead, Perform Autopsy and Preserve Remains (Medicine); Read Spirit Signs (Nature); Trace Possession and Interpret Haunt (Occultism); Recognise Doctrine, Perform Last Rites and Identify Spiritual Affliction (Religion); Sense Outside Influence (Sense Motive).

What the generic path gives them: the Secret trait's roll mode; the trained gate on all fifteen and the new `minRank` gate on the eight that print Rank 2 or 3; the target's Level DC where the book names one (target a token, or roll and let the GM compare); Preserve Remains' fixed DC 20; the full outcome ladder on the card; and every printed bonus or penalty — Observe Sacred Custom's +2/+1 and −2, Perform Autopsy's +2 and −2, Preserve Remains' −2 — queued on the character and offered in the next matching roll dialog. Perform Autopsy's "same DC as Examine the Dead, reduced by 2" is stated on the entry for the GM.

Not modelled: Conceal Faith's result-as-DC for later Detect Deception (the card prints the result; the opposing check takes it by hand), Perform Last Rites' +2 to Casting DCs against the corpse for 24 hours / 7 days (a rule for the table until corpses are actors), and Perform Last Rites' fumble lock-out. Each is on the entry's text.

## Background feats now fully wired

The six that waited on Chapter 4 are live. Relic Appraiser's +2 and Veil Listener's +1 are pre-ticked on their actions. Doctrinal Recall offers Recognise Doctrine from Linguistics and Culture as well as Religion, and its Use queues the +1 follow-up. Rite of Passing offers Perform Last Rites from Perform, and its Use puts the mourner's +1 status against Fear on their sheet for 24 hours. Consecrated Craft offers Trace Religious Provenance from Crafting. Pilgrim's Grace offers Make an Impression from Culture. Keeper of Records resolves a Partial on Compare Testaments as a Success (the card says which feat did it). No feat says PENDING any more.

## Harness

`verify-foundation.mjs` — 680 checks: the earlier 490 plus every Chapter 4 action diffed against a hand-typed table (skill, action time, rank, traits, DC source, outcome text present, bonus grammar the system can read), no shadowing of core keys or names, and the registration calls. Rulings are pinned: Korath's `inflictedFloors` shape, Vaelori's clean text, the system's floor and rank machinery present.

## Live-test plan

On 3.561.0 with 0.2.0: a Korath Demoralises a target (Intimidate chooser), the target's Effects show *Korath: frightened cannot drop below 1*, Rally on it reports the floor; Religion's action chooser lists Recognise Doctrine, Perform Last Rites and Identify Spiritual Affliction, and Linguistics/Culture also list Recognise Doctrine for a Doctrinal Recall holder; Trace Possession refuses at Occultism 1 rank and rolls at 2; Compare Testaments with Keeper of Records shows the Partial → Success note; Rite of Passing's Use lands the effect on a targeted ally.
