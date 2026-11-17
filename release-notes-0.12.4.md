# Pillars of Faith 0.12.4: the core proposals in use, on TRG Prime 3.696.0

16 November 2026. **Requires TRG Prime 3.696.0.** Install the core first. Document ids are unchanged, and no entry is renamed.

Graham asked for the remaining core proposals to be built ("build CD1-CD9 and Cd12"). TRG Prime 3.696.0 carries them. This release puts them to use: eleven class-C entries are now automated (C 85 → 74), and most of the steps that were still pressed by hand are gone.

## Rerolls that keep the better result (CD1)

- **Which entries.** Spirit Intercession, Continuity Unbroken, Vowbound Resolve and Revelation in Crisis.
- **When a save fails** (or a skill check, for Vowbound Resolve), the owner is asked whether to use the reaction.
  - The question goes to their player if one is online, or to the GM if not.
  - It quotes the trigger. The narrower part of it is the player's call: for example "a Mental effect on memory or identity", "a spell or magical effect", or "in your Vow's fulfilment".
- **On yes:**
  - the Focus use (Revelatory Script, for Revelation in Crisis) and the reaction are spent on their own sheet;
  - the system rerolls the check, with advantage where the book says so;
  - the better of the two results stands, and the card says which.
- **Spirit Intercession from 7th level** is offered to a Shaman ally whose token is within 30 feet of the creature that failed. Line of Effect is their call.
- **The Use** stays as a fallback, for when the question was missed.

## Strike riders (CD2)

- **Blood Awakened.** While the effect lasts, a Bite or Fangs hit on a living creature adds 1d6 essence once a round. It is rolled and applied as essence, against the target's essence defences.
- **Hunter's Fangs.** A critical injury inflicted by your Fangs on a living creature also gives it Bleed 1, after the injury roll.

## Counteracts that ask (CD3)

- **Always asked.** Break the Evil Eye and Sever Influence now always ask which effect to counteract, even when there is only one, with a "None of these" button. Enchantment is also the trait of a welcomed Bless or Heroism, which the book excludes, so the caster decides.
- **Warps.** The "+1 additional effect" warps on Break the Evil Eye, Sever Influence and Sever Soulchain let the caster pick a second effect in the same dialog, each with its own check.

## Equipment and feats (CD4–CD8)

- **Ossuary Lamellar:** +1 DR against slashing damage while worn.
- **Deep-Rooted Ironcap:** forced movement against you is 5 feet shorter, minimum 0. The push card says so.
- **Ossuary Board:** with no Shove-trait weapon equipped, a Shove Attack is made with the board's Shield Bash, and the card names it.
- **Expert Autopsist:** Perform Autopsy's Critical +2 circumstance bonus is +4, and the card says so. The 30-minute autopsy is still a note.
- **Redundant Anatomy:** once a day, after a critical injury against you is determined, you are asked. On yes, the daily use is spent and the injury is read one step less severe: Deadly → Serious → Minor → none.

## Judgement and Final Sanction (CD12)

- **Judgement's rider** now also reaches the first **Grimward spell** that damages the Subject each round. It shares the once-a-round limit with the Strike. A spell from another class does not trigger it.
- **Final Sanction:**
  - the half-HP +1d6 is read from the Subject's HP as the damage is rolled; nothing needs ticking;
  - a Critical hit against the Subject lays −1 status to DB until the beginning of your next turn.

## Existing characters

The new declarations sit on the compendium entries. To pick them up, re-add these from the compendium (or run the compendium refresh):
- **Feats:** Hunter's Fangs, Deep-Rooted Ironcap.
- **Equipment:** Ossuary Lamellar, Ossuary Board.
- **Spells:** Break the Evil Eye, Sever Influence, Sever Soulchain.

The rest take effect without re-adding:
- Blood Awakened's rider and Judgement's rider arrive with the next Use.
- The reactions and Expert Autopsist work from registration.

## Testing

- **The module's 11 verify files:** 9,654 checks, all green.
  - The new section P of `verify-audit` reads every 0.12.4 declaration with TRG Prime 3.696.0's own readers: the rider, counteract, DR, forced-movement, shield-bash and degree-bonus functions.
- **The core's `verify-fixes-3696-0`** drives the seams themselves.
- **Not yet tested live.** The retest list is at the end of `PILLARS_OF_FAITH_UNRESOLVED.md`.
