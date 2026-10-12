/**
 * Chapter 5 — the racial feats (93), including the Eternal Blood
 * Heritage feats and the Vesperyn and Morrowmade heritage feats.
 *
 * Each entry names the book heading and says what the sheet does with
 * it: an effect on a typed slot, a scoped conditional, a granted innate
 * spell, a specialist skill, a sense, a Use automation (module/
 * feat-automations.mjs) or nothing but the printed rule. The `sheet`
 * sentence on each is what the player reads under the book text.
 */
import { declaredEffect } from "./builders.mjs";
import { bookFeat, saveBonus, saveAdvantage, actionBonus, offeredBonus, CHANGE, senseFlag } from "./feat-builder.mjs";
import { changesEffect, conditional } from "./builders.mjs";

/** An ally aura in the system's own shape (creature-auras.mjs): a typed modifier granted to allies within the radius. */
function allyAura(id, name, radius, grants, text) {
  return { auras: [{ id, name, kind: "ally", radius, triggers: ["turnStart", "enter"], save: "", appliesTo: "Allies", outcomes: {}, immunitySeconds: 0, text, grants }] };
}

const fx = (name, changes, description) => (id, n) => changesEffect(id, `${n}: ${name}`, changes, description);

const SPIRIT_FINDS = "disembodied spirits, incorporeal undead, haunts and active possession";

export const RACIAL_FEATS = [
  /* ---------------- Morrowmade ---------------- */
  bookFeat("racial", "MORROWMADE", {
    sheet: "Works automatically: the Morrowmade trait joins your traits, +1 racial to Fortitude is on your saves, and the +2 (one more) is offered on saves and flat checks with the book's wording. Morrowmade racial feats open to you in the racial-feat picker.",
    effects: [fx("trait and Fortitude", [CHANGE.trait("Morrowmade"), CHANGE.save("fortitude", "racial", 1)], "Morrowmade trait; +1 racial bonus to Fortitude saving throws.")],
    flags: {
      conditionals: [
        offeredBonus("Morrowmade", 1, "racial", { checkTypes: ["save", "flat"] }, "One more (+2 in all) on a save or flat check to resist, reduce or recover from a critical injury, Disease, Poison, Bleed or an effect that would transform or alter your body")
      ]
    }
  }),
  bookFeat("racial", "ADAPTIVE TISSUE", {
    usesPerDay: "1",
    sheet: "Use as the Reaction (Focus): choose the damage type just suffered; Resistance to it lands on your defences until the end of your next turn."
  }),
  bookFeat("racial", "GRAFTED ARMAMENT", {
    sheet: "Use to choose Bite, Claw, Bone Spur or Heavy Appendage: the natural attack arrives as a weapon on your sheet (it leaves with this feat)."
  }),
  bookFeat("racial", "IMPOSSIBLE ANATOMY", {
    sheet: "Works automatically: +2 racial is pre-ticked on Escape and offered on checks to resist a Grapple; squeezing through a smaller space is a rule for the table.",
    flags: {
      conditionals: [
        actionBonus("Impossible Anatomy", 2, "racial", ["escape"], "Escape checks"),
        offeredBonus("Impossible Anatomy", 2, "racial", { checkTypes: ["skill", "save", "attribute"], not: { actions: ["escape"] } }, "Checks to resist or escape a Grapple")
      ]
    }
  }),
  bookFeat("racial", "PERFECTED ABERRATION", {
    usesPerDay: "1",
    sheet: "Use (1 AP, Focus): a one-minute effect with Fast Healing 1 (a note), Bleed immunity, Base DR +1, and advantage on saves against Disease and Poison and against body-altering effects pre-ticked or offered."
  }),
  bookFeat("racial", "REDUNDANT ANATOMY", {
    usesPerDay: "1",
    sheet: "Use once per day after a critical injury is determined: spends the use and the card says the injury is one step less severe — apply the lesser result."
  }),

  /* ---------------- Vesperyn ---------------- */
  bookFeat("racial", "VESPERYN", {
    sheet: "Works automatically: the Vesperyn trait joins your traits and Nightvision (Darkvision if your race already sees in the dark — swap the ability by hand) is granted. Vesperyn racial feats open to you in the racial-feat picker.",
    grantedAbilities: "Nightvision",
    effects: [fx("trait", [CHANGE.trait("Vesperyn")], "Vesperyn trait.")]
  }),
  bookFeat("racial", "BLOOD AWAKENED", {
    usesPerDay: "1",
    sheet: "Use (1 AP, Focus): a one-minute effect — +5 ft Speed on your sheet, advantage on Diplomacy, Bluff and Demoralise against living humanoids offered, Fast Healing 1 and the Fangs rider as notes on the card."
  }),
  bookFeat("racial", "BLOOD-SCENT", {
    sheet: "Works automatically: Blood Sense (30 ft, tertiary) is on your senses list; +2 racial to Track is offered with the book's wording.",
    flags: {
      ...senseFlag("Blood Sense", 30, "living creatures suffering a Bleed effect or at half their maximum HP or fewer", "Pillars of Faith, Chapter 5 (Blood-Scent)"),
      conditionals: [offeredBonus("Blood-Scent", 2, "racial", { checkTypes: ["skill"], actions: ["track"] }, "Track checks following a trail containing fresh blood")]
    }
  }),
  bookFeat("racial", "HUNTER'S FANGS", {
    sheet: "Works automatically: Fangs (1d6 P, Agile, Finesse) arrive as a natural attack on your weapons; the Bleed 1 on a critical injury is a note on the attack.",
    grantedWeapons: "Fangs (Vesperyn)"
  }),
  bookFeat("racial", "MESMERIC GAZE", {
    sheet: "Works automatically: Charm Kind is an innate Ethereal spell with the Focus trait on your spell list (living humanoids only — a note on the cast). The book's prerequisite names \"Velvet Gaze\"; the feat printed is Velvet Voice.",
    prerequisites: "Velvet Voice, Level 5",
    grantedSpells: "Charm Kind",
    flags: { grantInnate: true }
  }),
  bookFeat("racial", "VELVET VOICE", {
    sheet: "Works automatically: +1 racial is offered on Diplomacy and Bluff checks with the book's wording.",
    flags: {
      conditionals: [
        offeredBonus("Velvet Voice", 1, "racial", { checkTypes: ["skill"], subjects: ["diplomacy"] }, "Diplomacy checks against living humanoids that can hear and understand you"),
        offeredBonus("Velvet Voice", 1, "racial", { checkTypes: ["skill"], actions: ["bluff"] }, "Bluff checks against living humanoids that can hear and understand you")
      ]
    }
  }),

  /* ---------------- Eternal Blood Heritage ---------------- */
  ...[
    ["BALANCE-BLOODED", "Balance", "Resistance"],
    ["CHAOS-BLOODED", "Chaos", "Startle"],
    ["DAWN-BLOODED", "Good", "Guiding Bolt"],
    ["DREAD-BLOODED", "Evil", "Bane"],
    ["ORDER-BLOODED", "Order", "Sanctuary"]
  ].map(([heading, trait, spell]) => bookFeat("racial", heading, {
    sheet: `Works automatically: the ${trait} aligned trait joins your traits, Nightvision is granted, and ${spell} is an innate Divinity spell with the Focus trait on your spell list.`,
    grantedAbilities: "Nightvision",
    grantedSpells: spell,
    flags: { grantInnate: true },
    effects: [fx("aligned trait", [CHANGE.trait(trait)], `${trait} aligned trait.`)]
  })),
  bookFeat("racial", "ETERNAL RESONANCE", {
    sheet: "Works automatically: Eternal Lore is added to your specialist skills (if you already had it, the +2 to Recall Knowledge with it is a note); the +1 racial to innate-spell attacks and Save DCs is a note for the cast.",
    flags: { grantedSpecialistSkills: "Eternal Lore" }
  }),
  bookFeat("racial", "ETERNAL MANIFESTATION", {
    traits: "Aligned",
    sheet: "Use (1 AP; the book prints no frequency): a one-minute effect — the aligned immunity for your heritage on your defences, the +1d6 secondary damage as a strike rider (once a round, any Strike), Magical attacks a note."
  }),
  bookFeat("racial", "ORDERED MIND", {
    sheet: "Works automatically: advantage on saves against Confusion and Fear effects, pre-ticked by trait and offered otherwise.",
    flags: { conditionals: saveAdvantage("Ordered Mind", ["confusion", "fear"], "Saving throws against Confusion and Fear effects") }
  }),
  bookFeat("racial", "PROFANE CONSTITUTION", {
    sheet: "Works automatically: Poison Resistance is on your defences; advantage on saves against Sleep effects is pre-ticked by trait.",
    effects: [fx("Poison Resistance", [CHANGE.resistance("poison")], "Resistance to poison.")],
    flags: { conditionals: saveAdvantage("Profane Constitution", ["sleep"], "Saving throws against Sleep effects") }
  }),
  bookFeat("racial", "RADIANT CONSTITUTION", {
    sheet: "Works automatically: Poison Resistance is on your defences; +2 racial to saves against Disease and Poison is pre-ticked by trait.",
    effects: [fx("Poison Resistance", [CHANGE.resistance("poison")], "Resistance to poison.")],
    flags: { conditionals: saveBonus("Radiant Constitution", 2, "racial", ["disease", "poison"], "Saving throws against Disease and Poison effects") }
  }),
  bookFeat("racial", "STILL CENTRE", {
    sheet: "Works automatically: Mental Resistance is on your defences.",
    effects: [fx("Mental Resistance", [CHANGE.resistance("mental")], "Resistance to mental damage.")]
  }),
  bookFeat("racial", "UNBOUND IMPULSE", {
    usesPerDay: "1",
    sheet: "Works automatically: advantage on saves against Stunned effects is offered with the book's wording; Use spends the day's reduction of one Stunned gained.",
    flags: { conditionals: [conditional({ kind: "advantage", label: "Unbound Impulse", scope: "Saving throws against effects that would inflict the Stunned condition", auto: false, when: { checkTypes: ["save"] } })] }
  }),

  /* ---------------- Rhevani ---------------- */
  bookFeat("racial", "BATTLE REMEMBERED", {
    sheet: "Works automatically: when your Initiative is rolled and Past-Life Echo is available, a card offers it as a Free action — Acrobatics, Athletics, Intimidate, Perception or Survival — and the Use is spent as normal."
  }),
  bookFeat("racial", "CONTINUITY UNBROKEN", {
    usesPerDay: "1",
    sheet: "Use as the Reaction (Focus): spends the use and the reaction; reroll the failed save with advantage from your sheet."
  }),
  bookFeat("racial", "DEEP RECALL", {
    sheet: "Works automatically: Past-Life Echo's effect now lasts 1 minute (10 rounds) when you Use it."
  }),
  bookFeat("racial", "ECHO-TRAINED", {
    sheet: "Works automatically: Past-Life Echo's Use grants +3 racial instead of +2 when you already have a rank in the skill."
  }),
  bookFeat("racial", "LOST SCHOLARSHIP", {
    sheet: "Works automatically: Past-Life Echo's Use offers a typed Lore specialist skill as the choice — it is created on your sheet for the duration and removed with the effect, with the +2 racial applied."
  }),
  bookFeat("racial", "MANY LIVES, ONE SOUL", {
    sheet: "Works automatically: Past-Life Echo's Use asks for a second skill (or, with Lost Scholarship, a Lore)."
  }),
  bookFeat("racial", "MEMORY OF LOST MASTERS", {
    sheet: "Works automatically: Lost Scholarship's temporary Lore is offered advantage on its first check, and a Critical or Heroic on that check gives Past-Life Echo's use back."
  }),
  bookFeat("racial", "NOT YET FINISHED", {
    usesPerDay: "1",
    sheet: "Use as the Reaction (Focus): you stay at 1 HP (set on your sheet) and gain Fatigued 1."
  }),
  bookFeat("racial", "PILGRIM OF MANY LIVES", {
    usesPerDay: "1",
    sheet: "Works automatically: +5 ft Speed is on your sheet; +2 racial to Sense Direction is pre-ticked while Past-Life Echo (Survival) is active; a Fumble on Sense Direction resolves as a Failure once a day (this feat's use).",
    effects: [fx("Speed", [CHANGE.speed(5)], "+5 feet Speed.")],
    flags: { conditionals: [offeredBonus("Pilgrim of Many Lives", 2, "racial", { checkTypes: ["skill"], actions: ["senseDirection"] }, "Sense Direction while Past-Life Echo (Survival) is active")] }
  }),
  bookFeat("racial", "PRAYER FROM ANOTHER LIFE", {
    sheet: "Use at daily preparation: choose any Divinity cantrip but Guidance — it lands as an innate Focus cantrip until your next choice."
  }),
  bookFeat("racial", "REFLEXES OF A HUNDRED BATTLES", {
    sheet: "Works automatically: +2 racial to the encounter's first save is offered in every save dialog with the book's wording; the free Step after Past-Life Echo is a note.",
    flags: { conditionals: [offeredBonus("Reflexes of a Hundred Battles", 2, "racial", { checkTypes: ["save"] }, "The first saving throw you make in an encounter after rolling Initiative")] }
  }),
  bookFeat("racial", "REMEMBERED LITURGY", {
    sheet: "Use at daily preparation: choose a PP 2 Divinity spell — it lands as an innate Focus spell until your next choice."
  }),
  bookFeat("racial", "ROADS REMEMBER ME", {
    sheet: "Works automatically: Past-Life Echo (Survival) lasts 10 minutes when you Use it, with advantage pre-ticked on Sense Direction and Track for the duration."
  }),
  bookFeat("racial", "UNFINISHED DUTY", {
    usesPerDay: "1",
    sheet: "Use once per day at the end of a turn on which Dying would increase: spends the use; the card records that Dying does not increase — the GM leaves it as it stands."
  }),

  /* ---------------- Eshari ---------------- */
  bookFeat("racial", "BEACON FOR THE DEPARTING", {
    sheet: "A rule for the table while your light is active (the aura's +1 status to a Dying ally's recovery checks is offered in that dialog).",
    flags: { conditionals: [offeredBonus("Beacon for the Departing", 1, "status", { checkTypes: ["flat", "save"] }, "A Dying recovery check by a living ally within your active light")] }
  }),
  bookFeat("racial", "BELL-WARDEN'S EAR", { sheet: "A rule for the table: what Spirit Sense tells you is finer — kind and distance band, exact location on a Critical Search." }),
  bookFeat("racial", "CONSECRATED FLAME", {
    sheet: "Works automatically: the first time each round one of your spells deals Fire damage to an Undead creature, +1d6 secondary Essence is rolled and applied on the card. Cremation counting as a Partial Last Rites is a note.",
    effects: [declaredEffect("Essence on Fire", "The first successful Fire damage you deal to an Undead creature each round also inflicts 1d6 secondary Essence damage.", { spellDamageRider: { label: "Consecrated Flame", dice: "1d6", damageType: "essence", when: { damageTypes: ["fire"], targetTypes: ["undead"] }, oncePerRound: true } })]
  }),
  bookFeat("racial", "EYES BEYOND THE VEIL", { sheet: "A rule for the table: Recall Knowledge on a sensed presence, exact location on a successful Search, movement on a Critical." }),
  bookFeat("racial", "FINAL TOLL", {
    sheet: "Works through Sacred Toll: declare a Final Toll before the save — the card's ladder (no reactions; −1 status to attacks; Slowed 1) is applied by hand from the result. Sacred Toll is then expended regardless."
  }),
  bookFeat("racial", "GUIDE THE LAST ROAD", { sheet: "Works automatically: Perform Last Rites takes 1 minute and its card prints the longer protections (1 month / 7 days / 24 hours)." }),
  bookFeat("racial", "KEEPER AT THE THRESHOLD", { sheet: "Works automatically as an aura: allies within 10 feet get +1 status to saves against possession, Soul Drain and Soul-trait effects — offered in their save dialogs while they stand near you (an ally-aura conditional).",
    flags: allyAura("keeper-at-the-threshold", "Keeper at the Threshold", 10, { kind: "modifier", value: 1, type: "status", traits: ["soul", "possession"], scope: "saving throws against possession, Soul Drain and Soul-trait effects" }, "AURA ESHARI\nWhile you are conscious, allies within 10 feet gain a +1-status bonus to saving throws against possession, Soul Drain and effects with the Soul trait.") }),
  bookFeat("racial", "LANTERN OF THE LAST ROAD", {
    sheet: "Works automatically: Lantern Glow's Use offers the 30-foot radius; allies within 10 feet of your active light get +1 status to saves against Fear (an ally-aura conditional, pre-ticked by trait).",
    flags: allyAura("lantern-of-the-last-road", "Lantern of the Last Road", 10, { kind: "modifier", value: 1, type: "status", traits: ["fear"], scope: "saving throws against Fear effects while the light is active" }, "ESHARI\nWhile your light is active, allies within 10 feet of you gain a +1-status bonus to saving throws against Fear effects.")
  }),
  bookFeat("racial", "PURIFYING ASH", {
    sheet: "Works automatically: Purify is an innate Divinity spell with the Focus trait on your spell list.",
    grantedSpells: "Purify", flags: { grantInnate: true }
  }),
  bookFeat("racial", "SEPULCHRAL ENDURANCE", { sheet: "Works automatically: Base DR +1 is on your defences.", effects: [fx("Base DR", [CHANGE.baseDR(1)], "Base DR +1.")] }),
  bookFeat("racial", "SOUL-HARDENED", {
    sheet: "Works automatically: Soul Warden's racial bonus is +2 — this feat adds the second +1 beside it, pre-ticked on the same saves; recognising a possession attempt is a note.",
    flags: { conditionals: saveBonus("Soul-Hardened", 1, "racial", ["soul", "possession"], "Saving throws against Soul-trait effects, Soul Drain and possession (the second point of Soul Warden's bonus)") }
  }),
  bookFeat("racial", "STAND OVER THE DEAD", {
    sheet: "Works automatically: +2 racial is offered on checks and saves to resist being moved; Use to name what you guard — +1 circumstance to DB lands on your sheet while you stand by it (Use again to stand down).",
    flags: { conditionals: [offeredBonus("Stand Over the Dead", 2, "racial", { checkTypes: ["save", "skill", "attribute"] }, "Saving throws and skill checks to resist being Shoved, Tripped or forcibly moved")] }
  }),
  bookFeat("racial", "TOLL OF PASSAGE", { sheet: "A rule for the table: Sacred Toll reaches 60 feet and may target a possessing entity; the host's +2 status on a Failure or worse is queued by Use after the save (target the host)." }),
  bookFeat("racial", "VEIL TRACKER", {
    sheet: "Works automatically: rolling Spirit Lore from the sheet offers Track, rolled with Spirit Lore. Whether a spirit left a trace to follow (Spirit Sense within the hour, or another spiritual trace) is the GM's."
  }),

  /* ---------------- Kethrani ---------------- */
  bookFeat("racial", "CONSEQUENCE WRITTEN", { sheet: "Use after a successful Demoralise (target the creature): a one-round mark effect on it; when it first damages you or an ally, it suffers Essence damage equal to your level — the card says how much." }),
  bookFeat("racial", "EXPANDED TESTAMENT", {
    sheet: "Works automatically: this feat adds the second +1 beside Living Testament's, offered on the same Religion and Linguistics checks.",
    flags: { conditionals: [offeredBonus("Expanded Testament", 1, "racial", { checkTypes: ["skill"], subjects: ["religion", "linguistics"] }, "Religion and Linguistics checks concerning sacred writing or doctrine (the second point of Living Testament's bonus)")] }
  }),
  bookFeat("racial", "INTERLOCKING SCRIPT", { sheet: "Works automatically: Warding Word's Use reaches 30 feet and grants +2 status to DB." }),
  bookFeat("racial", "LIVING GOSPEL", { sheet: "Use at daily preparation: choose any non-specialist Divinity spell of base PP 4 or less — it lands as an innate Focus spell until your next choice." }),
  bookFeat("racial", "LIVING INDEX", {
    sheet: "Use to name your extra Lore specialist skill; +1 racial to Recall Knowledge is offered with the book's wording.",
    flags: {
      specialistChoice: { label: "One additional Lore specialist skill", prompt: "The Lore your Testament indexes", placeholder: "e.g. Temple Lore", suffix: "Lore" },
      conditionals: [offeredBonus("Living Index", 1, "racial", { checkTypes: ["skill"], actions: ["recallKnowledge"] }, "Recall Knowledge with a skill in which you have at least 1 rank")]
    }
  }),
  bookFeat("racial", "MERCY WRITTEN DEEP", { sheet: "Use after casting your racial Stabilise (target the creature): queues +2 status on their next Dying recovery check." }),
  bookFeat("racial", "NO LIFE ABANDONED", {
    sheet: "Works automatically: a healing spell you cast on another creature at half its HP or fewer heals half your level more (minimum 1), once per creature per spell. A Medicine action's healing is by hand; Stabilise works on anyone.",
    effects: [declaredEffect("Mercy's healing", "Healing you cast on another living creature at half its maximum HP or fewer is increased by half your level (minimum 1).", { healingRider: { label: "No Life Abandoned", lowHalfBonus: "halfLevel" } })]
  }),
  bookFeat("racial", "REVELATION IN CRISIS", { sheet: "Use as the Reaction (Focus): spends Read Aura's Focus use (Revelatory Script) and the reaction; reroll the failed save with advantage from your sheet." }),
  bookFeat("racial", "SCRIPT AGAINST CORRUPTION", {
    sheet: "Works automatically: this feat adds the second +1 beside Sacred Inscription's, pre-ticked on saves against Curse-trait effects.",
    flags: { conditionals: saveBonus("Script Against Corruption", 1, "racial", ["curse"], "Saving throws against Curse effects (the second point of Sacred Inscription's bonus)") }
  }),
  bookFeat("racial", "SENTENCE OF JUDGEMENT", { sheet: "Use after a successful Demoralise (target the creature): a strike rider — your first damaging Strike against it before the end of your next turn adds +1d6 Essence (added to the damage roll automatically)." }),
  bookFeat("racial", "TESTAMENT OF ANSWERS", { usesPerDay: "1", sheet: "Use once per day after a failed Recall Knowledge: spends the use; reroll from your sheet and keep the second result. The free Recall Knowledge after Read Aura is a note." }),
  bookFeat("racial", "THE TESTAMENT STANDS BETWEEN", { sheet: "Works automatically: Warding Word's Use also puts Resistance on the ally for the round. The book's sentence ends \"Resistance to the triggering\" — the damage type of the triggering attack is assumed; flagged for Graham." }),
  bookFeat("racial", "TRUTH BURNS THROUGH", { sheet: "A rule for the table: after a Critical or Heroic Detect Deception, ask the GM whether one statement was a deliberate lie." }),
  bookFeat("racial", "UNWRITTEN LIE", { sheet: "Use after a successful Detect Deception (target the creature): a one-minute effect with advantage pre-ticked on saves from that creature and offered on Sense Motive against it." }),

  /* ---------------- Myrathi ---------------- */
  bookFeat("racial", "ANCESTRAL CHORUS", { sheet: "Works automatically: a Success on a Recall Knowledge check made under Ancestral Communion resolves as a Critical (the card says so)." }),
  bookFeat("racial", "BLOOM AT THE VEIL", {
    sheet: "Works automatically: Spirit Sense (15 ft, tertiary) is on your senses list — if you already have one, note the +15 ft by hand; +1 racial to Recall Knowledge is offered with the book's wording.",
    flags: {
      ...senseFlag("Spirit Sense", 15, SPIRIT_FINDS, "Pillars of Faith, Chapter 5 (Bloom at the Veil)"),
      conditionals: [offeredBonus("Bloom at the Veil", 1, "racial", { checkTypes: ["skill"], actions: ["recallKnowledge"] }, "Recall Knowledge concerning spirits, souls, burial practices and the Ancestral Bloom")]
    }
  }),
  bookFeat("racial", "BLOOM-TENDER'S SPORES", { sheet: "Works automatically: Nature offers Preserve Remains to you; the +1 status after a successful Purify is queued by Use (target the creature)." }),
  bookFeat("racial", "CHORUS WITHOUT WORDS", { sheet: "A rule for the table: Whisper Network's connected creatures may speak through you, and simple emotional impressions cross a language gap." }),
  bookFeat("racial", "DEEP BLOOM MEMORY", { sheet: "Works automatically: Ancestral Communion's Use waives the trained gate for one Recall Knowledge in a non-specialist skill you have no ranks in." }),
  bookFeat("racial", "DEEP-ROOTED IRONCAP", { sheet: "Works automatically: Base DR +1 more is on your defences; the 5-foot reduction to forced movement is a note.", effects: [fx("Base DR", [CHANGE.baseDR(1)], "Base DR +1 (with Ironcap Plating, +2 in all).")] }),
  bookFeat("racial", "GRAVECAP RESONANCE", {
    sheet: "Works automatically: +2 racial to saves is pre-ticked against Soul-trait and possession effects and offered against Soul Drain.",
    flags: { conditionals: saveBonus("Gravecap Resonance", 2, "racial", ["soul", "possession"], "Saving throws against Soul Drain, possession and Soul-trait effects") }
  }),
  bookFeat("racial", "GUIDING LUMINESCENCE", { sheet: "Works automatically: your innate Guidance offers a free warp for a second target in the Warp? dialog." }),
  bookFeat("racial", "IRONCAP PLATING", { sheet: "Works automatically: Base DR +1 is on your defences.", effects: [fx("Base DR", [CHANGE.baseDR(1)], "Base DR +1.")] }),
  bookFeat("racial", "LANTERN OF THE BLOOM", {
    sheet: "Works automatically: Bloom Light's Use offers the 30-foot radius; allies within 10 feet who can see your light get +1 status to Sense Direction and to saves against Fear (ally-aura conditionals). The free Step after a Guidance is a note.",
    flags: { auras: [
      ...allyAura("lantern-of-the-bloom-fear", "Lantern of the Bloom", 10, { kind: "modifier", value: 1, type: "status", traits: ["fear"], scope: "saving throws against Fear while the light is active" }, "AURA MYRATHI VERDANT\nWhile your light is active, allies within 10 feet who can see you gain a +1-status bonus to Sense Direction and saving throws against Fear.").auras,
      ...allyAura("lantern-of-the-bloom-direction", "Lantern of the Bloom", 10, { kind: "modifier", value: 1, type: "status", checkTypes: ["skill"], actions: ["senseDirection"], scope: "Sense Direction while the light is active" }, "AURA MYRATHI VERDANT\nWhile your light is active, allies within 10 feet who can see you gain a +1-status bonus to Sense Direction.").auras
    ] }
  }),
  bookFeat("racial", "MEMORY GATHERER", { sheet: "Use after a Success or better on a Recall Knowledge under Ancestral Communion (target the ally): queues their +1 circumstance for the related check." }),
  bookFeat("racial", "RESTORATIVE SPORES", { sheet: "Use after your Vaelori Purify Counteracts an affliction (target the creature): heals them by your level." }),
  bookFeat("racial", "ROOTED SOUL", {
    sheet: "Works automatically: advantage on saves against possession is pre-ticked by trait and offered against soul-displacing effects.",
    flags: { conditionals: saveAdvantage("Rooted Soul", ["possession"], "Saving throws against possession and effects that forcibly remove, displace or separate your soul") }
  }),
  bookFeat("racial", "WHISPER NETWORK", { sheet: "Use at daily preparation: name the creatures attuned (up to your Wisdom, minimum 1) — the card records them until your next choice." }),

  /* ---------------- Core races ---------------- */
  bookFeat("racial", "ANCESTRAL STONE", {
    sheet: "Works automatically: Burial Lore is added to your specialist skills; the +2 racial is offered on Perform Last Rites with the book's wording (roll it from Religion — a specialist skill cannot carry an action).",
    flags: {
      grantedSpecialistSkills: "Burial Lore",
      conditionals: [offeredBonus("Ancestral Stone", 2, "racial", { checkTypes: ["skill"], actions: ["performLastRites"] }, "Perform Last Rites upon a corpse interred within a stone tomb, crypt, cairn or similar structure")]
    }
  }),
  bookFeat("racial", "GRAVE-SEAL MASON", { sheet: "A rule for the table: a Grave Seal (Warding, your level) on a Success or better with Ancestral Stone." }),
  bookFeat("racial", "CHORUS OF THE FALLEN", { sheet: "Works through Death Chant's Use: choose up to two allies — each gets +1 status to attacks against the attacker until the end of their next turn (an effect with the attacker's uuid)." }),
  bookFeat("racial", "DEATH CHANT", { sheet: "Use as the Reaction (target the fallen ally, then the attacker if you can): queues the ally's +1 status to their next Dying recovery check, and puts +1 status to attacks against the attacker on you until the end of your next turn." }),
  bookFeat("racial", "CROSSROADS OF FAITH", { sheet: "Works through Many Roads, Many Gods' Use: two traditions may be named; swapping one after a Critical is a second Use." }),
  bookFeat("racial", "FAITH THROUGH EXPERIENCE", { usesPerDay: "1", sheet: "Use once per day after a Critical or Heroic on one of the six actions: regains 1 Conviction Point (to your maximum)." }),
  bookFeat("racial", "MANY ROADS, MANY GODS", { sheet: "Use at daily preparation: name the tradition — +2 racial is then pre-ticked on Observe Sacred Custom and Recognise Doctrine with that name beside it, and the 1-rank waiver applies." }),
  bookFeat("racial", "FEY-SOUL LISTENER", {
    sheet: "Works automatically: Spirit Lore is added to your specialist skills; Nature offers Trace Possession and Interpret Haunt to you, and +1 racial is offered on them with the book's wording.",
    flags: {
      grantedSpecialistSkills: "Spirit Lore",
      conditionals: [offeredBonus("Fey-Soul Listener", 1, "racial", { checkTypes: ["skill"], actions: ["tracePossession", "interpretHaunt"] }, "Trace Possession or Interpret Haunt against a Fey creature, a natural spirit or an effect one created")]
    }
  }),
  bookFeat("racial", "HEARTHWARD", {
    sheet: "Works automatically: +1 racial is offered on saves against Fear, possession, Soul Drain and Soul effects — tick when an ally is within 10 feet.",
    flags: { conditionals: [offeredBonus("Hearthward", 1, "racial", { checkTypes: ["save"] }, "Saving throws against Fear, possession, Soul Drain and Soul-trait effects while a conscious ally is within 10 feet")] }
  }),
  bookFeat("racial", "FIRST AGE THEOLOGIAN", {
    sheet: "Works automatically: +1 racial is offered on Religion checks with the book's wording; using Intelligence in place of Wisdom is for the table.",
    flags: { conditionals: [offeredBonus("First Age Theologian", 1, "racial", { checkTypes: ["skill"], subjects: ["religion"], actions: ["recallKnowledge", "recogniseDoctrine", "identifySpiritualAffliction"] }, "Religion checks concerning Eternals, Divine Aspects or an ancient religious tradition")] }
  }),
  bookFeat("racial", "GRASP THE UNSEEN", { sheet: "Works automatically: while Shadow Stance is up, your Strikes count as Ghost Touch against incorporeal creatures. Touching a sensed spirit, and finding one you have only a direction for, are the table's.", effects: [declaredEffect("Grasp the Unseen", "Ghost Touch on your Strikes while in Shadow Stance.", { ghostTouch: { whileStance: "Shadow Stance" } })] }),
  bookFeat("racial", "SHADOWED SOUL", {
    sheet: "Works automatically: Spirit Sense (15 ft, tertiary) is on your senses list — the book grants it only in Shadow Stance; +1 racial to saves against possession is offered (tick while in the stance).",
    flags: {
      ...senseFlag("Spirit Sense", 15, SPIRIT_FINDS, "Pillars of Faith, Chapter 5 (Shadowed Soul) — while in Shadow Stance"),
      conditionals: [offeredBonus("Shadowed Soul", 1, "racial", { checkTypes: ["save"], traits: ["possession"] }, "Saving throws against possession while Shadow Stance is active")]
    }
  }),
  bookFeat("racial", "SOUL OF THE LONG YEARS", {
    sheet: "Works automatically: +1 racial to saves is pre-ticked against Soul-trait and possession effects and offered against Soul Drain; the +2 to Recall Knowledge about your own lifetime is offered.",
    flags: { conditionals: [...saveBonus("Soul of the Long Years", 1, "racial", ["soul", "possession"], "Saving throws against possession, Soul Drain and Soul-trait effects"), offeredBonus("Soul of the Long Years", 2, "racial", { checkTypes: ["skill"], actions: ["recallKnowledge"] }, "Recall Knowledge concerning religious, spiritual or historical events during your own lifetime (100 years or older)")] }
  })
];
