/**
 * Chapter 5 — the forty-eight class feats, for the five new classes and
 * for Adept, Expert and Martial characters generally. Gated by the class
 * and tier traits on their printed trait line (the five class names are
 * registered, so the picker reads them as it reads "Fighter").
 *
 * Where a feat changes what a Chapter 3 automation does (Distant
 * Lifeline's range, Full Satchel's Preparation cap, Old Ways Endure's
 * doses, Second Guide's manifest choice, Twin Inquisition's two
 * Subjects...), the automation reads the feat off the sheet — see
 * module/class-automations.mjs. What is stated here is what the player
 * reads under the book text.
 */
import { declaredEffect } from "./builders.mjs";
import { bookFeat, saveBonus, offeredBonus, actionBonus } from "./feat-builder.mjs";
import { conditional } from "./builders.mjs";

export const CLASS_FEATS = [
  /* ---------------- Archivist ---------------- */
  bookFeat("class", "LITURGICAL REVISION", {
    sheet: "Works automatically: +2 class is offered on Meditation with the book's wording; the 1-minute Spell Substitution is a rule for the table.",
    flags: { conditionals: [offeredBonus("Liturgical Revision", 2, "class", { checkTypes: ["skill"], subjects: ["meditation"] }, "The Meditation check of a Spell Substitution replacing one Divinity spell with another from your Prayer Book")] }
  }),
  bookFeat("class", "LIVING CONCORDANCE", { sheet: "Works automatically: Spell Substitution asks for the higher Casting DC of two replacement spells and its card says both are swapped on a success, neither on a failure.", effects: [declaredEffect("Living Concordance", "Spell Substitution replaces up to two memorised Divinity spells on one Meditation check, against the higher Casting DC.", { spellSubstitution: { count: 2, label: "Living Concordance" } })] }),
  bookFeat("class", "PERFECT EXEGESIS", { sheet: "Works through Recite from the Text: its card notes the −2 Casting Difficulty and +1 Save DC for the recited spell — apply them in the cast dialog." }),
  bookFeat("class", "RAPID REFERENCE", { sheet: "Works through Recite from the Text: once a round its Use may be a Free action (it asks), for a spell of base PP no more than half your level." }),
  bookFeat("class", "SACRED MARGINALIA", {
    sheet: "Works automatically: +2 class is offered on Linguistics with the book's wording; the four extra Prayer Book spells and the halved copying cost are for the table (add them to the book from its own sheet).",
    flags: { conditionals: [offeredBonus("Sacred Marginalia", 2, "class", { checkTypes: ["skill"], subjects: ["linguistics"], actions: ["learnSpell"] }, "Linguistics checks to Learn a Spell from a written Divinity source")] }
  }),
  bookFeat("class", "SECOND DISCIPLINE", {
    sheet: "Use to choose your second Archival Discipline: it arrives as an ability with its specialist skill and 1st-level specialist spell (delete its 7th-level spell if the level grants it).",
    flags: { abilityChoices: ["Canonist", "Apocryphist", "Eschatologist", "Hagiographer", "Revelator"] }
  }),

  /* ---------------- Folkwarden ---------------- */
  bookFeat("class", "A WORD AT THE RIGHT TIME", { sheet: "A rule for the table: Aid as a Reaction through Practical Counsel." }),
  bookFeat("class", "BODY CHARM", { sheet: "Works automatically: Warding Charm's Use offers Body (Disease and Poison) as a protection." }),
  bookFeat("class", "BURN THE WARD", { sheet: "Use as the Reaction: ends your Ward the Threshold (its effects come off everyone) and the card says the triggering creature rerolls with advantage." }),
  bookFeat("class", "CHARM OF MANY PERILS", { sheet: "Works automatically: Warding Charm's Use takes every protection at once." }),
  bookFeat("class", "FIELD PRACTICE", { sheet: "Use to choose the two rites that take 1 minute — recorded on the feat; the rites' cards say so." }),
  bookFeat("class", "FULL SATCHEL", { sheet: "Works automatically: your active-Preparation limit is one higher (two with the second copy).", repeatable: true, repeatLimit: 2 }),
  bookFeat("class", "OLD SECRET", { sheet: "Use at daily preparation to name the day's Folkwarden Specialist Spell — it lands on your list when the Grimoire block ships; until then the card records it." }),
  bookFeat("class", "OLD WAYS ENDURE", { sheet: "Works automatically: Warding Charm's effect says two activations; Brew Remedy makes two doses (three with Herbal)." }),

  /* ---------------- Grimward ---------------- */
  bookFeat("class", "ADVANCED DISCIPLINE", { sheet: "Works through Judgement and Inquisition: the card names your discipline's advanced benefit; Grave Warden's extra 1d6 rides the Judgement rider when you choose Essence." }),
  bookFeat("class", "CHAIN OF EVIDENCE", { sheet: "A rule for the table: Study Target from evidence takes one time step less." }),
  bookFeat("class", "EXPOSE THE SUBJECT", { sheet: "Use (1 AP; target your Judged Subject): every targeted ally — target them too — gets +1 circumstance to saves from that creature until your next turn (and from 12th, +1 circumstance to their first attack against it)." }),
  bookFeat("class", "FINAL SANCTION", { sheet: "Works through Judgement: the rider adds 1d6 more when the Subject is at half HP or fewer (tick it on the damage card by hand — the roll does not see HP); a Critical's −1 status to DB is a note." }),
  bookFeat("class", "TWIN INQUISITION", { sheet: "Works automatically: Inquisition's Use keeps two Subjects, each with its own Judgement." }),
  bookFeat("class", "UNBROKEN PURSUIT", {
    sheet: "Works automatically: +2 circumstance is offered on checks with the book's wording.",
    flags: { conditionals: [offeredBonus("Unbroken Pursuit", 2, "circumstance", { checkTypes: ["skill"] }, "Checks to recognise or penetrate an Illusion, polymorph effect or mundane disguise your Subject uses to conceal its identity")] }
  }),

  /* ---------------- Healer ---------------- */
  bookFeat("class", "CLEANSING RADIANCE", { sheet: "Use after a Healing spell restores HP (target the recipient): choose the PP-threshold effect — Remove Fear, Paralysis, Restore Senses (8), Remove Disease (10), Remove Curse (12); the card records it for the GM to apply." }),
  bookFeat("class", "DEEP RESERVES", { sheet: "Works through Gift of Healing: Restorative Overflow's cap is twice your level + Charisma and the temp HP last 10 minutes." }),
  bookFeat("class", "DISTANT LIFELINE", { sheet: "Works automatically: Lifeline's Use reaches 60 feet (120 from 11th) — the card says so." }),
  bookFeat("class", "ENHANCED VITALITY", { sheet: "Works through Restorative Hands: the reduction scales with the PP entered." }),
  bookFeat("class", "LIFEBOUND WARD", { sheet: "Use after a Healing spell (target the second ally, enter the amount the first regained): they regain half." }),
  bookFeat("class", "MIRACULOUS RECOVERY", { usesPerDay: "1", sheet: "Use (Focus, +4 PP metamagic) when casting a Healing spell on a creature dead within the round: spends the use; the card says they return at half the healing — set HP by hand." }),
  bookFeat("class", "REJUVENATING SURGE", { sheet: "Use after a Healing spell (target the creature, enter the PP): +1 status to attacks and damage (+2 at 6 PP; +5 ft Speed at 10 PP) lands as a one-round effect." }),
  bookFeat("class", "RENEWED RESTORATION", { sheet: "Works automatically: Restoration's Warp? dialog offers \"+4 PP: ignore the once-per-day limit\" to you." }),
  bookFeat("class", "RESURGENT HEALING", {
    sheet: "Works automatically: a Dying creature you heal magically regains half the spell's healing (and the Dying step as normal).",
    effects: [declaredEffect("Dying creatures regain half", "A Dying creature you magically heal regains half the normal amount of HP.", { healingRider: { label: "Resurgent Healing", dyingHalf: true } })]
  }),
  bookFeat("class", "SECOND CALLING", {
    sheet: "Use to choose your second Healer's Calling: it arrives as an ability with its specialist skill and ability.",
    flags: { abilityChoices: ["Chirurgeon", "Lifebinder", "Purifier", "Soul Tender", "Sanctuary Keeper"] }
  }),
  bookFeat("class", "SWIFT MENDER", { sheet: "Works automatically: every Healing spell's Warp? dialog offers \"+4 PP: 1 AP less (minimum 1)\" to you." }),
  bookFeat("class", "UNDYING RESTORATION", { usesPerDay: "1", sheet: "Use (Focus, +8 PP metamagic) when casting a Healing spell on a Dying or just-dead creature: spends the use; the card states the return at half the healing, Dazed/Weakened removed and Injured halved — apply by hand." }),

  /* ---------------- Shaman ---------------- */
  bookFeat("class", "DOMAIN OF THE LAND", {
    sheet: "Works automatically while Rooted World is active: allies within 10 feet (20 from 13th) get +1 circumstance against being moved — an ally-aura conditional offered in their dialogs; ignoring natural difficult terrain is a note.",
    flags: { auras: [{ id: "domain-of-the-land", name: "Domain of the Land", kind: "ally", radius: 10, triggers: ["turnStart", "enter"], save: "", appliesTo: "Allies", outcomes: {}, immunitySeconds: 0, text: "AURA SHAMAN SPIRIT\nWhile Rooted World is active, allies within 10 feet of you ignore ordinary natural difficult terrain and gain a +1-circumstance bonus to checks and saving throws made to resist being Shoved, Tripped or moved against their will.", grants: { kind: "modifier", value: 1, type: "circumstance", checkTypes: ["save", "skill", "attribute"], scope: "checks and saving throws to resist being Shoved, Tripped or moved, while the Shaman's Rooted World is active" } }] }
  }),
  bookFeat("class", "ELEMENTAL OVERFLOW", { sheet: "Works automatically: when Elemental Mantle's secondary damage lands, you pick a second creature within 10 feet of the target; it takes Constitution + half your Shaman level of the element, once per round per creature." }),
  bookFeat("class", "PREDATOR'S MANIFESTATION", { sheet: "Use to choose the damage type: while Manifest Spirit (Beast) is active a Magical natural attack (1d6; 1d8 from 11th) is added to your weapons and removed with the manifestation." }),
  bookFeat("class", "SECOND GUIDE", {
    sheet: "Use to choose your second Spirit Guide: it arrives as an ability with its specialist skill and Spirit Boon; Manifest Spirit then asks which guide manifests.",
    flags: { abilityChoices: ["Ancestor Spirit", "Beast Spirit", "Elemental Spirit", "Land Spirit", "Veil Spirit"] }
  }),
  bookFeat("class", "SHARED MANIFESTATION", { sheet: "Use (1 AP; target the ally) while Manifest Spirit is active: the guide's shared benefit lands on them as a one-round effect." }),
  bookFeat("class", "TWIN MANIFESTATION", { sheet: "Works automatically: Manifest Spirit's Use manifests both guides at once." }),
  bookFeat("class", "VOICES OF EXPERIENCE", { sheet: "Works through Manifest Spirit (Ancestor): its Use asks for the skill and the effect treats you as having half your level in ranks for the trained gates (the ranks themselves are yours to note)." }),
  bookFeat("class", "WALK BETWEEN WORLDS", { sheet: "A rule for the table while Part the Veil is active: movement through creatures and thin solid objects." }),

  /* ---------------- Adept / Expert / Martial ---------------- */
  bookFeat("class", "CONSECRATED ARMAMENT", { sheet: "Use once to bind it to your Aspect's favoured weapon: attacks with that weapon count as Magical for Resistance and Immunity, and once a round a Critical hit with it against an Undead creature adds 1d6 Essence on the damage card. An opposing Eternal or a desecrator is the GM's call — the card says when the die did not fire." }),
  bookFeat("class", "MEASURED INVOCATION", { sheet: "Use (1 AP): +1 circumstance to your next Spellcraft check this turn is queued, and the card notes the −5 to a Spell Fumble roll." }),
  bookFeat("class", "PREPARED FOR TROUBLE", {
    sheet: "Works automatically: +10 circumstance to Initiative is offered with the book's wording; the free Recall Knowledge is a note.",
    flags: { conditionals: [offeredBonus("Prepared for Trouble", 10, "circumstance", { checkTypes: ["initiative"] }, "Initiative when at least one of your Studied Targets is in the encounter")] }
  }),
  // Named apart from the core's racial feat "Read the Room" (the grant
  // dedupe and the action gate are both by name).
  bookFeat("class", "READ THE ROOM", { name: "Read the Room (Expert)", sheet: "Rolled as a Sense Motive skill action (1 minute) against the GM's DC; the card prints its ladder. Named \"(Expert)\" on the sheet because a core racial feat already bears the name." }),
  bookFeat("class", "SOULGUARD", {
    sheet: "Works automatically: +1 class to saves is pre-ticked against Fear-, Soul- and Possession-trait effects and offered against Soul Drain.",
    flags: { conditionals: saveBonus("Soulguard", 1, "class", ["fear", "soul", "possession"], "Saving throws against Fear, possession, Soul Drain and Soul-trait effects") }
  }),
  bookFeat("class", "SPELL-WISE DEFENCE", {
    sheet: "Works automatically: advantage is offered on saves with the book's wording — tick when you identified the spell first.",
    flags: { conditionals: [conditional({ kind: "advantage", label: "Spell-Wise Defence", scope: "A saving throw against a spell or magical effect you successfully identified before attempting it", auto: false, when: { checkTypes: ["save"] } })] }
  }),
  bookFeat("class", "SPIRITUAL RESERVE", {
    sheet: "Works automatically: a Critical or Heroic Power Recovery during a rest recovers 1 more PP per caster level.",
    effects: [declaredEffect("Power Recovery", "A Critical or Heroic Power Recovery recovers 1 additional PP per caster level.", { powerRecoveryExtra: { label: "Spiritual Reserve", degrees: ["critical", "heroic"], perCasterLevel: 1 } })]
  }),
  bookFeat("class", "STAND OVER THE FALLEN", {
    sheet: "Works automatically: +2 circumstance against being moved is offered with the book's wording; Use to mark that you stand over a Dying ally — +1 circumstance to DB lands until you Use again. The Attack of Opportunity is a note.",
    flags: { conditionals: [offeredBonus("Stand Over the Fallen", 2, "circumstance", { checkTypes: ["save", "skill", "attribute"] }, "Checks and saving throws to resist being moved away from an adjacent Dying ally")] }
  })
];

/** Read the Room, a rolled class feat, as a skill action gated on the feat. */
