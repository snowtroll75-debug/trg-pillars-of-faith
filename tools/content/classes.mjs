/**
 * Chapter 3 — the five classes: Archivist, Folkwarden, Grimward, Healer,
 * Shaman.
 *
 * Each class is a `class` item in the exact shape TRG Prime's own eight
 * carry (tools/content/builders.mjs `classItem`), its twenty-row table
 * read from class-tables.json (extracted from the book text, not typed
 * by hand), and its abilities are `ability` items with `sourceClass` so
 * the class's levelled `classAbilities` field hands them over as the
 * character reaches each level — the same grant path the Fighter's
 * Weapon Supremacy takes.
 *
 * SUB-CHOICES ARE ABILITIES A CHOOSER GRANTS. An Archival Discipline, a
 * Folk Tradition, an Inquisitorial Discipline, a Healer's Calling and a
 * Spirit Guide are each one ability item per option, carrying its own
 * specialist skill (`grantedSpecialistSkills`), its specialist spells
 * (`grantedSpells`, levelled) and its scoped bonuses (conditionals or
 * effects). The class ability that offers them declares
 * `abilityChoices`, and TRG Prime 3.563.0's generic chooser does the
 * rest — no per-class code.
 *
 * What is code (module/automations.mjs) is only the in-play activations:
 * Recite from the Text, Calculated Portent, the Folk Rites, Inquisition
 * and Judgement, the Healer's four, Spirit Communion, Manifest Spirit
 * and Spirit Intercession.
 *
 * TEXT is class-text.json, extracted from the book by heading, so every
 * ability's description is the printed paragraph.
 */
import fs from "node:fs";
import path from "node:path";
import { declaredEffect } from "./builders.mjs";
import { fileURLToPath } from "node:url";
import { classItem, classAbility, gear, changesEffect, conditional, html } from "./builders.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TEXT = JSON.parse(fs.readFileSync(path.join(HERE, "class-text.json"), "utf8"));
export const TABLES = JSON.parse(fs.readFileSync(path.join(HERE, "class-tables.json"), "utf8"));

/** The printed paragraph(s) under a heading, as sheet HTML. */
function T(cls, heading, extra = "") {
  const text = TEXT[cls.toUpperCase()]?.sections?.[heading];
  if (text === undefined) throw new Error(`No section "${heading}" for ${cls}`);
  return html(extra ? `${text}\n\n${extra}` : text);
}

/** The class description: the printed DESCRIPTION plus the mechanical lines the sheet does not show elsewhere. */
function classDescription(cls, extraHeadings = []) {
  const s = TEXT[cls.toUpperCase()].sections;
  const parts = [s.DESCRIPTION];
  for (const h of extraHeadings) parts.push(`${h}\n${s[h]}`);
  return html(parts.join("\n\n"));
}

/** "+1 Control Level per class level" — the sheet field the cap reads, added by the class item's own effect. */
const controlPerLevel = (id, name) => changesEffect(id, `${name}: Control Levels`,
  [{ key: "system.magic.controlBonusPerLevel", mode: 2, value: "1", priority: 20 }],
  `+1 Control Level per ${name} level.`);

/* ------------------------------------------------------------------ */
/* Shared conditional shapes                                            */
/* ------------------------------------------------------------------ */

/** A save bonus pre-ticked when the effect carries one of the traits, offered otherwise. */
function saveBonusVsTraits(label, value, type, traits, scope, alsoOffered = true) {
  const out = [
    conditional({ kind: "modifier", value, type, label, scope, auto: true, when: { checkTypes: ["save"], traits } })
  ];
  if (alsoOffered) {
    out.push(conditional({ kind: "modifier", value, type, label, scope, auto: false, when: { checkTypes: ["save"], not: { traits } } }));
  }
  return out;
}

/** A skill bonus offered (unticked) on named actions, with the book's wording beside it. */
function offeredOnActions(label, value, type, actions, scope, extra = {}) {
  return conditional({ kind: "modifier", value, type, label, scope, auto: false, when: { checkTypes: ["skill"], actions, ...extra } });
}

/* ================================================================== */
/* ARCHIVIST                                                            */
/* ================================================================== */

const ARCHIVIST_ABILITIES = [
  classAbility({
    name: "Archivist's Prayer Book", sourceClass: "Archivist",
    description: T("Archivist", "ARCHIVIST'S PRAYER BOOK", "Your Prayer Book is the gear item this class grants: open it to record spells (six PP 2 Divinity spells at 1st level, two more each level), and memorise from it at daily preparation on the Magic tab. Specialist spells are never learned by copying.")
  }),
  classAbility({
    name: "Scholarly Exegesis", sourceClass: "Archivist",
    description: T("Archivist", "SCHOLARLY EXEGESIS", "Works automatically: on every Religion check a row offers Intelligence in place of Wisdom (the difference between the two) — tick it when the check is academic."),
    flags: { conditionals: [conditional({ kind: "modifier", valueFrom: "intelligence-wisdom", type: "untyped", label: "Scholarly Exegesis", scope: "An academic Religion check — Intelligence in place of Wisdom", auto: false, when: { checkTypes: ["skill"], subjects: ["religion"] } })] }
  }),
  classAbility({
    name: "Recite from the Text", sourceClass: "Archivist",
    traits: "Concentrate, Focus", usesPerDay: "1",
    description: T("Archivist", "RECITE FROM THE TEXT", "Use: spends 1 AP and the Focus use, lets you pick a Prayer Book spell that is not memorised today, and marks it prepared so it can be cast now — cast it before your turn ends, then it drops out of today's list at your next daily preparation.")
  }),
  classAbility({
    name: "Archival Discipline", sourceClass: "Archivist",
    description: T("Archivist", "ARCHIVAL DISCIPLINE", "Use to choose: the discipline arrives as its own ability with its specialist skill, its two specialist spells (the second at 7th) and its Discipline Ability."),
    flags: { abilityChoices: ["Canonist", "Apocryphist", "Eschatologist", "Hagiographer", "Revelator"] }
  }),
  classAbility({
    name: "Deific Aspects", sourceClass: "Archivist",
    description: T("Archivist", "DEIFIC ASPECTS")
  }),
  // The five disciplines
  classAbility({
    name: "Canonist", sourceClass: "Archivist",
    description: T("Archivist", "CANONIST", "Authoritative Interpretation — Use after a successful Recall Knowledge: puts +1 status to saving throws on you, or on one targeted ally within 30 feet, until the end of your next turn."),
    grantedSpells: "1: Doctrinal Ward, 7: Word of Censure",
    flags: { grantedSpecialistSkills: "Canon Lore" }
  }),
  classAbility({
    name: "Apocryphist", sourceClass: "Archivist",
    description: T("Archivist", "APOCRYPHIST", "Forbidden Research — the +2 circumstance bonus is offered in the dialog of Identify Power, Recall Knowledge and Research checks with the book's wording; the +1 circumstance to Counteract checks is offered on Spellcraft rolls (tick it for a Counteract against a Curse or Soul effect you have identified)."),
    grantedSpells: "1: Hidden Doctrine, 7: Forbidden Name",
    flags: {
      grantedSpecialistSkills: "Heresy Lore",
      conditionals: [
        offeredOnActions("Forbidden Research", 2, "circumstance", ["identifyPower", "recallKnowledge", "research"], "Identifying or understanding curses, corrupted Divinity magic, heresies, forbidden rites or concealed alterations to sacred texts"),
        conditional({ kind: "modifier", value: 1, type: "circumstance", label: "Forbidden Research", scope: "Counteract checks against an identified Curse- or Soul-trait effect", auto: false, when: { checkTypes: ["spellcraft"] } })
      ]
    }
  }),
  classAbility({
    name: "Eschatologist", sourceClass: "Archivist",
    description: T("Archivist", "ESCHATOLOGIST", "Scholar of the Last Road — +1 class to saves is pre-ticked against Soul-trait effects and offered against Soul Drain and possession; advantage on Recall Knowledge is offered with the book's wording."),
    grantedSpells: "1: Last Rite, 7: Anchor the Departing Soul",
    flags: {
      grantedSpecialistSkills: "Soul Lore",
      conditionals: [
        ...saveBonusVsTraits("Scholar of the Last Road", 1, "class", ["soul"], "Saving throws against Soul Drain, possession and Soul-trait effects"),
        conditional({ kind: "advantage", label: "Scholar of the Last Road", scope: "Recall Knowledge about Undead, Unliving creatures, souls, death or resurrection", auto: false, when: { checkTypes: ["skill"], actions: ["recallKnowledge"] } })
      ]
    }
  }),
  classAbility({
    name: "Hagiographer", sourceClass: "Archivist",
    description: T("Archivist", "HAGIOGRAPHER", "Lives of the Exemplars — advantage on Recall Knowledge is offered with the book's wording; the extra question is yours to ask on a success."),
    grantedSpells: "1: Exemplar's Grace, 7: Saintly Intercession",
    flags: {
      grantedSpecialistSkills: "Eternal Lore",
      conditionals: [
        conditional({ kind: "advantage", label: "Lives of the Exemplars", scope: "Recall Knowledge about Eternals, divine servants, avatars, saints, relics or recorded miracles", auto: false, when: { checkTypes: ["skill"], actions: ["recallKnowledge"] } })
      ]
    }
  }),
  classAbility({
    name: "Revelator", sourceClass: "Archivist",
    usesPerDay: "1",
    description: T("Archivist", "REVELATOR", "Calculated Portent — Use once to select the day's saving throw (Fortitude, Reflex or Will); Use again to spend the portent as a Reaction, granting advantage on that save to you or an ally within 30 feet. One use per day, restored at daily preparation."),
    grantedSpells: "1: Read Omen, 7: Unfold the Future",
    flags: { grantedSpecialistSkills: "Prophecy Lore" }
  })
];

export const ARCHIVIST = classItem({
  name: "Archivist", classType: "Adept",
  description: classDescription("Archivist", ["MAGICAL TRADITION", "CANTRIPS", "SPECIALIST SPELLS", "CONTROL LEVELS"]),
  keyAbilityScores: "Intelligence (min +2), Wisdom, Dexterity",
  classSkills: "Artistry, Culture, Linguistics, Medicine, Meditation, Mental Focus, Occultism, Planes, Power Manipulation, Religion, Sense Motive",
  proficiencies: "You are not proficient in any armour. You are proficient with the club, dagger and staff.",
  hitPoints: 4, skillPoints: 4,
  grantedFeats: "1: Heighten Spell, 1: Scribe Scroll, 1: Spell Substitution",
  classAbilities: "1: Archivist's Prayer Book, 1: Scholarly Exegesis, 1: Recite from the Text, 1: Archival Discipline, 1: Deific Aspects",
  grantedGear: "Prayer Book",
  magicalTradition: "divinity", magicalAbility: "intelligence",
  casterStyle: "learned", memorisationStyle: "book",
  cantripsPerDay: 4, spellBookFirstPicks: 6,
  wealth: "1",
  table: TABLES.Archivist,
  effects: [controlPerLevel],
  flags: {
    magicalNote: TEXT.ARCHIVIST.sections["MAGICAL TRADITION"],
    bonusFeatsNote: TEXT.ARCHIVIST.sections["BONUS FEATS"]
  }
});

// NAMED "Prayer Book", NOT "Archivist's Prayer Book" (0.3.1). Live test
// 17 Sep 2026: the class ability of that name landed first, and the
// grant path's already-granted test is by NAME across item types, so the
// gear was reported "already granted — skipped" and never arrived.
export const ARCHIVIST_GEAR = gear({
  name: "Prayer Book",
  price: 50,
  traits: "Stores Spells",
  description: html("Granted for free the moment a character takes the Archivist class. Open this item's own sheet to see the book grow — six PP 2 Divinity spells at 1st level, two more every level after — and to add spells to it as slots open up. Being in the book is not the same as knowing it for the day: memorise from it at daily preparation (the Magic tab's Memorisation card) before a spell in it can be cast, or Recite from the Text to reach one in the moment.\n\nThe book may hold prayers of religions other than your own; recording a prayer is not accepting it. Specialist spells cannot be learned by copying them in."),
  system: { spellbookContainer: true }
});

/* ================================================================== */
/* FOLKWARDEN                                                           */
/* ================================================================== */

const FOLKWARDEN_ABILITIES = [
  // Chapter 10 (0.5.0): "At 1st level, you gain one PP 1 Folkwarden
  // Specialist Spell of your choice" — a chooser over the Grimoire's
  // Folkwarden list, in module/grimoire-automations.mjs.
  classAbility({
    name: "Folkwarden Specialist Spell", sourceClass: "Folkwarden",
    description: T("Folkwarden", "SPECIALIST SPELLS", "Use to choose your PP 1 Folkwarden Specialist Spell from the Grimoire (Bitter Charm, Blackthorn Warning, Hearthsign, Hedgeward, Red Thread, Steady Hands); Use again to change it.")
  }),
  classAbility({
    name: "Folk Alchemy", sourceClass: "Folkwarden",
    description: T("Folkwarden", "FOLK ALCHEMY", "The Alchemist archetype feat is granted by the class itself (its own grants — Alchemical Crafting — follow), and because the class hands it over its Progression Requirements are waived in the feat picker.")
  }),
  classAbility({
    name: "Keeper of the Old Ways", sourceClass: "Folkwarden",
    description: T("Folkwarden", "KEEPER OF THE OLD WAYS", "Folk Lore is added to your specialist skills as this ability lands."),
    flags: { grantedSpecialistSkills: "Folk Lore" }
  }),
  classAbility({
    name: "Folk Rites", sourceClass: "Folkwarden",
    description: html(`${TEXT.FOLKWARDEN.sections["FOLK RITES"]}\n\nFOLK PREPARATIONS\n${TEXT.FOLKWARDEN.sections["FOLK PREPARATIONS"]}\n\nThe five rites are abilities of their own on your sheet. Warding Charm, Brew Remedy and Ward the Threshold count their Preparations against your class bonus when used; Read the Signs and Lay to Rest are skill actions offered from Nature/Survival and Medicine/Nature/Religion.`)
  }),
  classAbility({
    name: "Warding Charm", sourceClass: "Folkwarden",
    traits: "Concentrate, Manipulate, Verdant, Warding",
    description: T("Folkwarden", "WARDING CHARM", "Use: choose the protection (two for a Charmwright), then the charm lands as an effect on you or the targeted creature carrying the circumstance bonus (half your class bonus, rounded up) pre-ticked on matching saves. It is one of your Preparations; delete the effect when it is expended.")
  }),
  classAbility({
    name: "Brew Remedy", sourceClass: "Folkwarden",
    traits: "Manipulate",
    description: T("Folkwarden", "BREW REMEDY", "Use: choose Disease or Poison; the remedy lands as a one-hour effect on the targeted creature (or you) with the bonus pre-ticked on matching saves. An Herbal Folkwarden brews two doses for one Preparation.")
  }),
  classAbility({
    name: "Ward the Threshold", sourceClass: "Folkwarden",
    traits: "Concentrate, Manipulate, Verdant, Warding",
    description: T("Folkwarden", "WARD THE THRESHOLD", "Use: the ward lands as an effect on every targeted willing creature (and you) with the bonus pre-ticked against Fear- and Soul-trait effects and offered against possession, Soul Drain and mind effects while resting. It lasts until your next daily preparation or until you Use again to end it.")
  }),
  classAbility({
    name: "Read the Signs", sourceClass: "Folkwarden",
    traits: "Concentrate, Investigation",
    description: T("Folkwarden", "READ THE SIGNS", "Rolled as a skill action from Nature or Survival (10 minutes) against the DC the GM sets; the card prints the question ladder.")
  }),
  classAbility({
    name: "Lay to Rest", sourceClass: "Folkwarden",
    traits: "Concentrate, Manipulate, Soul, Verdant, Warding",
    description: T("Folkwarden", "LAY TO REST", "Rolled as a skill action from Medicine, Nature or Religion (10 minutes) against the deceased creature's Level DC; the card prints the protection ladder.")
  }),
  classAbility({
    name: "Folk Tradition", sourceClass: "Folkwarden",
    description: T("Folkwarden", "FOLK TRADITION", "Use to choose: the tradition arrives as its own ability with its specialist skill and Tradition Ability."),
    flags: { abilityChoices: ["Charmwright", "Gravetender", "Hearthkeeper", "Herbal", "Omen Reader"] }
  }),
  classAbility({
    name: "Practical Counsel", sourceClass: "Folkwarden", level: 2,
    description: T("Folkwarden", "PRACTICAL COUNSEL", "Works automatically: Aid from whichever class skill or lore row fits (the Aid is rolled from the row you choose), and a Success or better grants 1 more (to +4)."),
    effects: [declaredEffect("Aid", "A Success or better on an Aid check grants a circumstance bonus 1 higher, to a maximum of +4.", { aidBoost: { label: "Practical Counsel", value: 1, max: 4 } })]
  }),
  classAbility({
    name: "Seasoned Hands", sourceClass: "Folkwarden", level: 3,
    description: T("Folkwarden", "SEASONED HANDS", "Works automatically: a Fumble on Read the Signs, Lay to Rest, Treat Disease, Treat Toxin or Treat Wounds resolves as a Failure (the card says so), and Nature offers Treat Disease and Treat Toxin for natural afflictions.")
  }),
  // The five traditions
  classAbility({
    name: "Charmwright", sourceClass: "Folkwarden",
    description: T("Folkwarden", "CHARMWRIGHT", "Many-Layered Charm — Warding Charm's Use offers two protections."),
    flags: { grantedSpecialistSkills: "Charm Lore" }
  }),
  classAbility({
    name: "Gravetender", sourceClass: "Folkwarden",
    description: T("Folkwarden", "GRAVETENDER", "Quiet Passage — the +2 class bonus is pre-ticked on Lay to Rest checks; read the duration one step up the ladder."),
    flags: {
      grantedSpecialistSkills: "Burial Lore",
      conditionals: [
        conditional({ kind: "modifier", value: 2, type: "class", label: "Quiet Passage", scope: "Lay to Rest checks", auto: true, when: { checkTypes: ["skill"], actions: ["layToRest"] } })
      ]
    }
  }),
  classAbility({
    name: "Hearthkeeper", sourceClass: "Folkwarden",
    description: T("Folkwarden", "HEARTHKEEPER", "Safe Hearth — Ward the Threshold reaches 20 feet, or the room's boundary."),
    flags: { grantedSpecialistSkills: "Hearth Lore" }
  }),
  classAbility({
    name: "Herbal", sourceClass: "Folkwarden",
    description: T("Folkwarden", "HERBAL", "Deep Stores — Brew Remedy's Use creates two doses for one Preparation."),
    flags: { grantedSpecialistSkills: "Herbalism Lore" }
  }),
  classAbility({
    name: "Omen Reader", sourceClass: "Folkwarden",
    description: T("Folkwarden", "OMEN READER", "Clear Signs — the +2 class bonus is pre-ticked on Read the Signs checks; ask one more question on a Success or better."),
    flags: {
      grantedSpecialistSkills: "Omen Lore",
      conditionals: [
        conditional({ kind: "modifier", value: 2, type: "class", label: "Clear Signs", scope: "Read the Signs checks", auto: true, when: { checkTypes: ["skill"], actions: ["readTheSigns"] } })
      ]
    }
  })
];

export const FOLKWARDEN = classItem({
  name: "Folkwarden", classType: "Adept/Expert",
  description: classDescription("Folkwarden", ["MAGICAL TRADITION", "CANTRIPS", "SPECIALIST SPELLS"]),
  keyAbilityScores: "Constitution (min +2), Wisdom, Intelligence",
  classSkills: "Artistry, Culture, Crafting, Diplomacy, Handle Animal, Linguistics, Medicine, Meditation, Mental Focus, Nature, Occultism, Perception, Power Manipulation, Religion, Sense Motive, Survival",
  proficiencies: "You are proficient with light armour and shields, except tower shields. You are proficient with all simple weapons, as well as the spear and shortbow.",
  hitPoints: 6, skillPoints: 8,
  grantedFeats: "1: Heighten Spell, 1: Alchemist",
  classAbilities: "1: Folkwarden Specialist Spell, 1: Folk Alchemy, 1: Keeper of the Old Ways, 1: Folk Rites, 1: Warding Charm, 1: Brew Remedy, 1: Ward the Threshold, 1: Read the Signs, 1: Lay to Rest, 1: Folk Tradition, 2: Practical Counsel, 3: Seasoned Hands",
  magicalTradition: "verdant", magicalAbility: "constitution",
  casterStyle: "instinctive", cantripsKnown: 2,
  wealth: "0",
  table: TABLES.Folkwarden,
  flags: {
    magicalNote: TEXT.FOLKWARDEN.sections["MAGICAL TRADITION"],
    bonusFeatsNote: TEXT.FOLKWARDEN.sections["BONUS FEATS"]
  }
});

/* ================================================================== */
/* GRIMWARD                                                             */
/* ================================================================== */

const INQUISITION_ACTIONS = ["detectDeception", "identifyPower", "recallKnowledge", "research", "search", "studyTarget", "track"];

const GRIMWARD_ABILITIES = [
  classAbility({
    name: "Inquisition", sourceClass: "Grimward",
    traits: "Concentrate",
    description: T("Grimward", "INQUISITION", "Use: spends 1 AP and names your Subject (the targeted token, or a name you type for a creature not present). Your class bonus is then offered, with the book's wording, in the dialog of Detect Deception, Identify Power, Recall Knowledge, Research, Search, Study Target, Track and Sense Motive checks. Use again to change or end the Inquisition; Judgement ends with it.")
  }),
  classAbility({
    name: "Judgement", sourceClass: "Grimward",
    description: T("Grimward", "JUDGEMENT", "Use once you have earned it: your Subject becomes Judged — +1 circumstance to attack rolls against that creature and to saves against its effects are pre-ticked when the roll knows who is involved, and the card states the secondary damage your level grants (1d6; 2d6 at 9th; 3d6 at 17th). Use again to withdraw Judgement.")
  }),
  classAbility({
    name: "Reconstruct Target", sourceClass: "Grimward",
    traits: "Investigation",
    description: T("Grimward", "RECONSTRUCT TARGET", "A rule for the table: Study Target from evidence, with the skill the evidence calls for.")
  }),
  classAbility({
    name: "Prepared Adversary", sourceClass: "Grimward",
    description: T("Grimward", "PREPARED ADVERSARY", "Use when Initiative is rolled with a creature that is both your Subject and a Studied Target present: +10 class to Initiative for this encounter's roll, and the card reminds you of the free Recall Knowledge that can place it under Judgement.")
  }),
  classAbility({
    // NAMED APART from the Cleric's and Crusader's "Deific Aspect": the
    // automation and hint tables are name-keyed, and the Crusader's
    // carries its own alignment-feat chooser.
    name: "Deific Aspect (Grimward)", sourceClass: "Grimward",
    description: T("Grimward", "DEIFIC ASPECT", "Pick your Divine Aspect from the sheet's Divine Aspect slot: it grants its deific skill, its bonus spells (added to your repertoire as you meet their level), one PP 1 specialist spell of its list, and its favoured weapon — proficiency and the +1 class attack bonus.")
  }),
  classAbility({
    name: "Inquisitorial Discipline", sourceClass: "Grimward",
    description: T("Grimward", "INQUISITORIAL DISCIPLINE", "Use to choose: the discipline arrives as its own ability with its specialist skill and additional ability."),
    flags: { abilityChoices: ["Exorcist", "Grave Warden", "Hexbreaker", "Relic Warden", "Truthseeker"] }
  }),
  classAbility({
    name: "Grim Resolve", sourceClass: "Grimward", level: 2,
    description: T("Grimward", "GRIM RESOLVE", "Works automatically: the +2 class bonus is pre-ticked on saves against Fear-, Charm-, Compulsion- and Possession-trait effects, and offered on other saves with the book's wording."),
    flags: {
      conditionals: saveBonusVsTraits("Grim Resolve", 2, "class", ["fear", "charm", "compulsion", "possession"], "Saving throws against fear, charm, compulsion and possession effects")
    }
  }),
  classAbility({
    name: "Sanctioned Strike", sourceClass: "Grimward", level: 4,
    description: T("Grimward", "SANCTIONED STRIKE", "Works automatically: while you hold this, your Judgement marks the Subject so your weapon and unarmed attacks against it count as magical for Resistance and Immunity.")
  }),
  // The five disciplines
  classAbility({
    name: "Exorcist", sourceClass: "Grimward",
    description: T("Grimward", "EXORCIST", "Soul Sentinel — the +2 class bonus is pre-ticked on saves against Possession-trait effects and offered against effects that remove, control or displace your soul."),
    flags: {
      grantedSpecialistSkills: "Spirit Lore",
      conditionals: saveBonusVsTraits("Soul Sentinel", 2, "class", ["possession"], "Saving throws against possession and effects that forcibly remove, control or displace your soul")
    }
  }),
  classAbility({
    name: "Grave Warden", sourceClass: "Grimward",
    description: T("Grimward", "GRAVE WARDEN", "Consecrated Judgement — the +1 class bonus to Religion is offered on Identify Power and Recall Knowledge with the book's wording; essence damage in place of Judgement's type is your call at the table."),
    flags: {
      grantedSpecialistSkills: "Burial Lore",
      conditionals: [
        offeredOnActions("Consecrated Judgement", 1, "class", ["identifyPower", "recallKnowledge"], "Religion checks to identify undead creatures or the effects that created them", { subjects: ["religion"] })
      ]
    }
  }),
  classAbility({
    name: "Hexbreaker", sourceClass: "Grimward",
    description: T("Grimward", "HEXBREAKER", "Break the Working — the +2 class bonus is offered on Identify Power and Recall Knowledge with the book's wording; the +1 circumstance to Counteract checks is offered on Spellcraft rolls (tick it against your Judged Subject's effects)."),
    flags: {
      grantedSpecialistSkills: "Curse Lore",
      conditionals: [
        offeredOnActions("Break the Working", 2, "class", ["identifyPower", "recallKnowledge"], "Identifying curses and magical effects created by your Subject of Inquisition"),
        conditional({ kind: "modifier", value: 1, type: "circumstance", label: "Break the Working", scope: "Counteract checks against a spell or effect created by your Judged Subject", auto: false, when: { checkTypes: ["spellcraft"] } })
      ]
    }
  }),
  classAbility({
    name: "Relic Warden", sourceClass: "Grimward",
    description: T("Grimward", "RELIC WARDEN", "Object of Inquiry — Inquisition's Use accepts a typed name, so a relic, haunt, ward or trap can be your Subject; the offered class bonus covers locating, identifying, understanding, disabling and Counteracting it."),
    flags: { grantedSpecialistSkills: "Relic Lore" }
  }),
  classAbility({
    name: "Truthseeker", sourceClass: "Grimward",
    description: T("Grimward", "TRUTHSEEKER", "Piercing Scrutiny — advantage on Detect Deception is offered with the book's wording; +1 class to saves against illusion effects is offered likewise. A successful Detect Deception on your Subject lets you Use Judgement at no action cost."),
    flags: {
      grantedSpecialistSkills: "Interrogation Lore",
      conditionals: [
        conditional({ kind: "advantage", label: "Piercing Scrutiny", scope: "Detect Deception against your Subject of Inquisition", auto: false, when: { checkTypes: ["skill"], actions: ["detectDeception"] } }),
        conditional({ kind: "modifier", value: 1, type: "class", label: "Piercing Scrutiny", scope: "Saving throws against illusion effects created by your Judged Subject", auto: false, when: { checkTypes: ["save"], traits: ["illusion"] } })
      ]
    }
  })
];

export const GRIMWARD = classItem({
  name: "Grimward", classType: "Expert/Adept",
  description: classDescription("Grimward", ["MAGICAL TRADITION", "SPECIALIST SPELLS"]),
  keyAbilityScores: "Wisdom (min +2), Intelligence, Charisma",
  classSkills: "Athletics, Culture, Deception, Diplomacy, Intimidate, Linguistics, Medicine, Mental Focus, Occultism, Perception, Religion, Sense Motive, Stealth, Survival",
  proficiencies: "You are proficient in light and medium armour and shields, except tower shields. You are proficient with all simple and martial weapons.",
  hitPoints: 8, skillPoints: 6,
  classAbilities: "1: Inquisition, 1: Judgement, 1: Reconstruct Target, 1: Prepared Adversary, 1: Deific Aspect (Grimward), 1: Inquisitorial Discipline, 2: Grim Resolve, 4: Sanctioned Strike",
  magicalTradition: "divinity", magicalAbility: "wisdom",
  casterStyle: "instinctive",
  wealth: "1",
  table: TABLES.Grimward,
  flags: {
    // "At 2nd level and every level thereafter" — one pick a level;
    // swaps at 5th and every two levels, the core schedule.
    repertoire: { pickStep: 1, pickFrom: 2 },
    magicalNote: TEXT.GRIMWARD.sections["MAGICAL TRADITION"],
    bonusFeatsNote: TEXT.GRIMWARD.sections["BONUS FEATS"]
  }
});

/* ================================================================== */
/* HEALER                                                               */
/* ================================================================== */

const HEALER_ABILITIES = [
  classAbility({
    name: "Gift of Healing", sourceClass: "Healer",
    description: T("Healer", "GIFT OF HEALING", "Works automatically: the +2 class bonus is pre-ticked on Spellcraft checks for Healing-trait spells. Use after a healing spell lands on others: the targeted recipient regains your level + Wisdom modifier more (from 3rd, Restorative Overflow turns any excess into temporary HP; a Sanctuary Keeper's target also gains +2 status to DB until your next turn)."),
    flags: {
      conditionals: [
        conditional({ kind: "modifier", value: 2, type: "class", label: "Gift of Healing", scope: "Spellcraft checks to cast Healing-trait spells and Counteract with them", auto: true, when: { checkTypes: ["spellcraft"], traits: ["healing"] } })
      ]
    }
  }),
  classAbility({
    name: "Healer's Touch", sourceClass: "Healer",
    traits: "Concentrate, Essence, Focus, Healing", usesPerDay: "1",
    description: T("Healer", "HEALER'S TOUCH", "Use as the Reaction: spends the Focus use and the reaction, asks the PP the spell cost (or your level for an innate one) and heals every targeted creature by that much.")
  }),
  classAbility({
    name: "Restorative Hands", sourceClass: "Healer",
    traits: "Concentrate, Essence, Healing",
    description: T("Healer", "RESTORATIVE HANDS", "Use (Free): asks the PP the spell cost and reduces the matching condition on the targeted creature by one (Soul Drain by 5). Once per day per target is yours to track.")
  }),
  classAbility({
    name: "Lifeline", sourceClass: "Healer",
    traits: "Divinity, Focus, Healing, Soul", usesPerDay: "1",
    description: T("Healer", "LIFELINE", "Use as the Reaction: spends the Focus use and the reaction, sets the targeted ally to 1 HP with no Dying, and applies Fatigued 1.")
  }),
  classAbility({
    name: "Healer's Calling", sourceClass: "Healer",
    description: T("Healer", "HEALER'S CALLING", "Use to choose: the calling arrives as its own ability with its specialist skill and unique ability."),
    flags: { abilityChoices: ["Chirurgeon", "Lifebinder", "Purifier", "Soul Tender", "Sanctuary Keeper"] }
  }),
  classAbility({
    name: "Restorative Overflow", sourceClass: "Healer", level: 3,
    description: T("Healer", "RESTORATIVE OVERFLOW", "Works through Gift of Healing's Use: healing past the target's maximum becomes temporary HP (to your level + Wisdom modifier, one minute, higher value kept).")
  }),
  // The five callings
  classAbility({
    name: "Chirurgeon", sourceClass: "Healer",
    description: T("Healer", "CHIRURGEON", "Rapid Care — the +2 circumstance bonus is pre-ticked on Administer First Aid and Treat Wounds; Treat Wounds takes 1 minute for you."),
    flags: {
      grantedSpecialistSkills: "Chirurgery",
      conditionals: [
        conditional({ kind: "modifier", value: 2, type: "circumstance", label: "Rapid Care", scope: "Administer First Aid and Treat Wounds checks", auto: true, when: { checkTypes: ["skill"], actions: ["firstAid", "treatWounds"] } })
      ]
    }
  }),
  classAbility({
    name: "Lifebinder", sourceClass: "Healer",
    description: T("Healer", "LIFEBINDER", "Vital Surge works automatically: once a round, one die of your healing spell is maximised on the card."),
    flags: { grantedSpecialistSkills: "Vitality Lore" },
    effects: [declaredEffect("Vital Surge", "Once per round, one healing die of a spell you cast is maximised.", { healingRider: { label: "Vital Surge", maximiseOneDie: true, oncePerRound: true } })]
  }),
  classAbility({
    name: "Purifier", sourceClass: "Healer",
    description: T("Healer", "PURIFIER", "Cleansing Hands — the +2 circumstance bonus is offered on Spellcraft rolls with the book's wording (tick it for a Counteract against disease, poison or a curse with a Healing spell); the target's follow-up +2 is a note for the table."),
    flags: {
      grantedSpecialistSkills: "Affliction Lore",
      conditionals: [
        conditional({ kind: "modifier", value: 2, type: "circumstance", label: "Cleansing Hands", scope: "Counteract checks to remove disease, poison or curses with a Healing-trait spell", auto: false, when: { checkTypes: ["spellcraft"] } })
      ]
    }
  }),
  classAbility({
    name: "Soul Tender", sourceClass: "Healer",
    description: T("Healer", "SOUL TENDER", "Mend the Spirit — the +2 circumstance bonus is offered on Spellcraft rolls with the book's wording (tick it for a Counteract against possession or soul control); Restorative Hands' Soul Drain relief reads the extra 5 automatically."),
    flags: {
      grantedSpecialistSkills: "Soul Lore",
      conditionals: [
        conditional({ kind: "modifier", value: 2, type: "circumstance", label: "Mend the Spirit", scope: "Counteract checks to end possession or an effect controlling or displacing a soul", auto: false, when: { checkTypes: ["spellcraft"] } })
      ]
    }
  }),
  classAbility({
    name: "Sanctuary Keeper", sourceClass: "Healer",
    description: T("Healer", "SANCTUARY KEEPER", "Sheltering Care — Gift of Healing's Use also puts +2 status to DB on the chosen creature until the beginning of your next turn."),
    flags: { grantedSpecialistSkills: "Hospice Lore" }
  })
];

export const HEALER = classItem({
  name: "Healer", classType: "Adept",
  description: classDescription("Healer", ["MAGICAL TRADITION", "CANTRIPS", "SPECIALIST SPELLS", "CONTROL LEVELS"]),
  keyAbilityScores: "Wisdom (min +2), Charisma, Constitution",
  classSkills: "Culture, Diplomacy, Linguistics, Medicine, Meditation, Mental Focus, Nature, Perception, Power Manipulation, Religion, Sense Motive",
  proficiencies: "You are proficient with light armour. You are proficient with all simple weapons.",
  hitPoints: 6, skillPoints: 6,
  classAbilities: "1: Gift of Healing, 1: Healer's Touch, 1: Restorative Hands, 1: Lifeline, 1: Healer's Calling, 3: Restorative Overflow",
  // Cure and Restoration "do not count against the normal number of
  // spells you learn"; Stabilise is the automatic cantrip; Touch of
  // Healing the 1st-level specialist spell (Chapter 10).
  grantedSpells: "1: Cure, 1: Restoration, 1: Stabilise, 1: Touch of Healing",
  magicalTradition: "divinity",
  // "Charisma is your magical ability score. You add your Wisdom
  // modifier..." — Graham, 17 Sep 2026: Wisdom is correct; the Charisma
  // sentence is a typo in the book.
  magicalAbility: "wisdom",
  casterStyle: "instinctive", cantripsKnown: 2,
  wealth: "1",
  table: TABLES.Healer,
  effects: [controlPerLevel],
  flags: {
    // "At 2nd level and every level" — one pick a level; "Beginning at
    // 5th level, whenever you gain a Healer level" — one swap a level.
    repertoire: { pickStep: 1, pickFrom: 2, swapStep: 1, swapFrom: 5 },
    magicalNote: TEXT.HEALER.sections["MAGICAL TRADITION"],
    bonusFeatsNote: TEXT.HEALER.sections["BONUS FEATS"]
  }
});

/* ================================================================== */
/* SHAMAN                                                               */
/* ================================================================== */

const SHAMAN_ABILITIES = [
  // Chapter 10 (0.5.0): the Shaman's PP 1 pick, as the Folkwarden's.
  classAbility({
    name: "Shaman Specialist Spell", sourceClass: "Shaman",
    description: T("Shaman", "SPECIALIST SPELLS", "Use to choose your PP 1 Shaman Specialist Spell from the Grimoire (Call Minor Spirit, Spirit Rebuke, Spirit Shelter, Spirit Trace, Veil Lantern); Use again to change it.")
  }),
  classAbility({
    name: "Spirit Speaker", sourceClass: "Shaman",
    description: T("Shaman", "SPIRIT SPEAKER", "Spirit Lore is added to your specialist skills as this ability lands, and Nature offers Trace Possession and Interpret Haunt (the Chapter 4 Occultism actions) to you."),
    flags: { grantedSpecialistSkills: "Spirit Lore" }
  }),
  classAbility({
    name: "Spirit Communion", sourceClass: "Shaman",
    description: T("Shaman", "SPIRIT COMMUNION", "Use at daily preparation: pick the day's Ethereal spell(s) — one PP 2 at 1st; two to PP 4 at 6th; three to PP 10 at 12th; four to PP 14 at 18th. They join your spell list until you Use again, which clears yesterday's.")
  }),
  classAbility({
    name: "Spirit Guide", sourceClass: "Shaman",
    description: T("Shaman", "SPIRIT GUIDE", "Use to choose: the guide arrives as its own ability with its specialist skill and Spirit Boon; Manifest Spirit reads it for the manifestation."),
    flags: { abilityChoices: ["Ancestor Spirit", "Beast Spirit", "Elemental Spirit", "Land Spirit", "Veil Spirit"] }
  }),
  classAbility({
    name: "Manifest Spirit", sourceClass: "Shaman",
    traits: "Concentrate, Focus, Spirit", usesPerDay: "1",
    description: T("Shaman", "MANIFEST SPIRIT", "Use: spends 1 AP and the Focus use and puts your guide's one-minute manifestation on your sheet as an effect; Use again to dismiss it early.")
  }),
  classAbility({
    name: "Spirit Intercession", sourceClass: "Shaman",
    traits: "Chance, Concentrate, Focus, Spirit", usesPerDay: "1",
    description: T("Shaman", "SPIRIT INTERCESSION", "Use as the Reaction: spends the Focus use and the reaction; reroll the failed save (yours, or from 7th an ally's within 30 feet) and keep the better result.")
  }),
  classAbility({
    name: "Spirit Ward", sourceClass: "Shaman", level: 3,
    description: T("Shaman", "SPIRIT WARD", "Works automatically: the +2 class bonus is pre-ticked on saves against Soul-trait effects and offered against possession and Soul Drain."),
    flags: {
      conditionals: saveBonusVsTraits("Spirit Ward", 2, "class", ["soul", "possession"], "Saving throws against possession, Soul Drain and Soul-trait effects")
    }
  }),
  classAbility({
    name: "Deepened Bond", sourceClass: "Shaman", level: 7,
    description: T("Shaman", "DEEPENED BOND", "Works automatically: a successful Refocus also restores Manifest Spirit or Spirit Intercession (chosen when both are spent) on the same timing."),
    effects: [declaredEffect("Refocus", "A successful Refocus also restores Manifest Spirit or Spirit Intercession.", { refocusAlsoRestores: { label: "Deepened Bond", names: ["Manifest Spirit", "Spirit Intercession"] } })]
  }),
  // The five guides
  classAbility({
    name: "Ancestor Spirit", sourceClass: "Shaman", usesPerDay: "1",
    description: T("Shaman", "ANCESTOR SPIRIT", "Borrowed Memory — +1 class is pre-ticked on Recall Knowledge; the once-a-day rank is this ability's tracked use (Use it to spend). Chorus of the Past is what Manifest Spirit applies."),
    flags: {
      grantedSpecialistSkills: "Ancestor Lore",
      conditionals: [
        conditional({ kind: "modifier", value: 1, type: "class", label: "Borrowed Memory", scope: "Recall Knowledge checks", auto: true, when: { checkTypes: ["skill"], actions: ["recallKnowledge"] } })
      ]
    }
  }),
  classAbility({
    name: "Beast Spirit", sourceClass: "Shaman",
    description: T("Shaman", "BEAST SPIRIT", "Wild Understanding — +2 class is offered on Handle Animal checks with the book's wording. Beast Within is what Manifest Spirit applies."),
    flags: {
      grantedSpecialistSkills: "Animal Lore",
      conditionals: [
        conditional({ kind: "modifier", value: 2, type: "class", label: "Wild Understanding", scope: "Checks to communicate with animals", auto: false, when: { checkTypes: ["skill"], subjects: ["handleAnimal"] } })
      ]
    }
  }),
  classAbility({
    name: "Elemental Spirit", sourceClass: "Shaman",
    description: T("Shaman", "ELEMENTAL SPIRIT", "Use to choose Acid, Cold, Electricity or Fire: the +1 class save bonus is then pre-ticked against that trait, and the bonus cantrip is yours to add. Elemental Mantle is what Manifest Spirit applies."),
    flags: { grantedSpecialistSkills: "Elemental Lore" }
  }),
  classAbility({
    name: "Land Spirit", sourceClass: "Shaman",
    description: T("Shaman", "LAND SPIRIT", "Use to name your Terrain Lore. Memory of the Land — +2 class is offered on Nature and Survival with the book's wording; ignoring that terrain is a note. Rooted World is what Manifest Spirit applies."),
    flags: {
      specialistChoice: { label: "One appropriate Terrain Lore skill", prompt: "The terrain your guide is bound to", placeholder: "e.g. Mountain Lore", suffix: "Lore" },
      conditionals: [
        conditional({ kind: "modifier", value: 2, type: "class", label: "Memory of the Land", scope: "Nature and Survival checks involving your guide's terrain", auto: false, when: { checkTypes: ["skill"], subjects: ["nature", "survival"] } })
      ]
    }
  }),
  classAbility({
    name: "Veil Spirit", sourceClass: "Shaman",
    description: T("Shaman", "VEIL SPIRIT", "Second Sight — Spirit Sense (30 feet, tertiary) is on your senses list. Part the Veil is what Manifest Spirit applies."),
    flags: {
      grantedSpecialistSkills: "Veil Lore",
      creatureAbility: {
        printedTraits: "", printedAction: "", printedArea: "",
        derives: { sense: { category: "tertiary", modality: "spiritual", fixedFeet: 30, finds: "disembodied spirits, incorporeal undead, haunts and active possession" } },
        source: "Pillars of Faith, Chapter 3 (Veil Spirit)"
      }
    }
  })
];

export const SHAMAN = classItem({
  name: "Shaman", classType: "Adept",
  description: classDescription("Shaman", ["MAGICAL TRADITION", "CANTRIPS", "SPECIALIST SPELLS", "CONTROL LEVELS"]),
  keyAbilityScores: "Constitution (min +2), Wisdom, Charisma",
  classSkills: "Artistry, Culture, Diplomacy, Handle Animal, Linguistics, Medicine, Meditation, Mental Focus, Nature, Occultism, Perception, Power Manipulation, Religion, Sense Motive, Survival",
  proficiencies: "You are proficient with light armour and shields, except tower shields. You are proficient with all simple weapons, as well as the spear and shortbow. Unlike a Druid, you have no prohibition against metal equipment.",
  hitPoints: 6, skillPoints: 6,
  grantedFeats: "1: Heighten Spell",
  classAbilities: "1: Shaman Specialist Spell, 1: Spirit Speaker, 1: Spirit Communion, 1: Spirit Guide, 1: Manifest Spirit, 1: Spirit Intercession, 3: Spirit Ward, 7: Deepened Bond",
  magicalTradition: "verdant", magicalAbility: "constitution",
  casterStyle: "instinctive", cantripsKnown: 3,
  wealth: "-1",
  table: TABLES.Shaman,
  effects: [controlPerLevel],
  flags: {
    repertoire: { pickStep: 1, pickFrom: 2, swapStep: 1, swapFrom: 5 },
    magicalNote: TEXT.SHAMAN.sections["MAGICAL TRADITION"],
    bonusFeatsNote: TEXT.SHAMAN.sections["BONUS FEATS"]
  }
});

/* ================================================================== */

export const CLASSES = [ARCHIVIST, FOLKWARDEN, GRIMWARD, HEALER, SHAMAN];
export const CLASS_ABILITIES = [
  ...ARCHIVIST_ABILITIES, ...FOLKWARDEN_ABILITIES, ...GRIMWARD_ABILITIES, ...HEALER_ABILITIES, ...SHAMAN_ABILITIES
];
export const CLASS_GEAR = [ARCHIVIST_GEAR];

/** What registerClass gets for each class lives in module/registration.mjs (runtime code, harness-checked against these items). */
