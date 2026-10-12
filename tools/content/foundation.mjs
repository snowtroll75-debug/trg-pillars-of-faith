/**
 * Pillars of Faith — Chapters 1 and 2: traits, the four races, their
 * twenty heritages, twelve backgrounds, and the twelve General feats
 * those backgrounds grant (Chapter 5).
 *
 * Every mechanical number here is transcribed from the sourcebook
 * (V1.01, 16 Sep 2026). Where the book's text is ambiguous or where a
 * rule needs machinery a later block will ship, the item says so in its
 * description rather than pretending — see the PENDING notes, which are
 * also listed in the build report.
 */
import fs from "node:fs";
import { CLASSES, CLASS_ABILITIES, CLASS_GEAR } from "./classes.mjs";
import { RACIAL_FEATS } from "./feats-racial.mjs";
import { ARCHETYPE_FEATS, ARCHETYPE_ABILITIES, ARCHETYPE_GEAR } from "./feats-archetype.mjs";
import { CLASS_FEATS } from "./feats-class.mjs";
import { GENERAL_FEATS } from "./feats-general.mjs";
import { FEAT_WEAPONS } from "./feats-weapons.mjs";
import { DIVINE_ASPECTS } from "./aspects.mjs";
import { ALL_GRIMOIRE_SPELLS } from "./spells.mjs";
import { ARMOUR, SHIELDS, WEAPONS, TOOLS } from "./equipment.mjs";
import { CONSUMABLES } from "./consumables.mjs";
import { RUNE_ITEMS, SPECIFIC_ARMOUR, SPECIFIC_WEAPONS, WONDROUS_ITEMS, RELICS, CHARGED_ITEMS, MAGIC_CONSUMABLES } from "./magic-items.mjs";
import {
  race, heritage, background, ability, feat, spell,
  changesEffect, racialSkillEffect, resistanceEffect, noteEffect, conditional, html, stableId
} from "./builders.mjs";
import { UNLIVING_ABILITIES, UNLIVING_ARCHETYPE_FEATS, UNLIVING_CLASS_FEATS, UNLIVING_WEAPONS, UNLIVING_SPELLS, UNLIVING_AFFLICTIONS, UNLIVING_ITEMS } from "./unliving.mjs";
import { HAUNTS, SPIRIT_ACTORS, HAUNT_JOURNAL } from "./haunts.mjs";

const text = JSON.parse(fs.readFileSync(new URL("./book-text.json", import.meta.url), "utf8"));

const raceLore = (name, extra = "") => html(`${text.races[name].lore}\n\n${extra}`.trim());
const heritageLore = (name) => html(text.heritages[name]);

/* ------------------------------------------------------------------ */
/* Traits (Chapter 1)                                                   */
/* ------------------------------------------------------------------ */

export const TRAITS = ["haunt", "investigation", "spirit", "unliving"];

/* ------------------------------------------------------------------ */
/* Languages (Chapter 2) — rarity is NOT printed; see the build report  */
/* ------------------------------------------------------------------ */

export const LANGUAGES = {
  Vesperic: { rarity: "uncommon", speakers: "Eshari" },
  Rhevic: { rarity: "uncommon", speakers: "Rhevani" },
  Mycelic: { rarity: "uncommon", speakers: "Myrathi" }
};

/* ------------------------------------------------------------------ */
/* Racial abilities (Chapter 2, OTHER ABILITIES)                         */
/* ------------------------------------------------------------------ */

export const ABILITIES = [
  // ESHARI
  ability({
    name: "Soul Warden", sourceRace: "Eshari",
    description: html("You gain a +1 racial bonus to saving throws against Soul Drain, possession and effects with the Soul trait."),
    flags: {
      conditionals: [
        conditional({ kind: "modifier", value: 1, type: "race", label: "Soul Warden", scope: "Saving throws against effects with the Soul trait", auto: true, when: { checkTypes: ["save"], traits: ["soul"] } }),
        conditional({ kind: "modifier", value: 1, type: "race", label: "Soul Warden", scope: "Saving throws against Soul Drain or possession — tick if this roll is one", auto: false, when: { checkTypes: ["save"], not: { traits: ["soul"] } } })
      ]
    }
  }),
  ability({
    name: "Spirit Sense", sourceRace: "Eshari",
    description: html("You possess Spirit Sense as a tertiary sense. When you use Search (Perception), you can detect the presence and general direction of disembodied spirits, incorporeal undead, haunts and active possession within 30 feet. You cannot determine exact location, identity or allegiance through this sense alone. Spirit Sense is blocked by 1 foot of stone, 1 inch of common metal or any thickness of lead.\n\nSpirit Sense is a tertiary sense; its range is 30 + Wis x 5 feet unless an ability says otherwise (Chapter 1)."),
    flags: {
      creatureAbility: {
        printedTraits: "", printedAction: "", printedArea: "",
        // A tertiary sense at a tertiary sense's FULL range (Chapter 1:
        // "its range is the same as any other tertiary sense. 30 + Wis x
        // 5 feet") — the same ruling Graham gave for granted senses on
        // 25 Aug 2026, so `special` is deliberately absent. The race
        // entry's own "within 30 feet" is the flat figure; the two
        // disagree and Chapter 1's general rule is taken as governing —
        // flagged in the release notes.
        derives: { sense: { category: "tertiary", modality: "spiritual", finds: "disembodied spirits, incorporeal undead, haunts and active possession" } },
        source: "Pillars of Faith, Chapter 1"
      }
    }
  }),
  ability({
    name: "Spirit Sense (Velari)", sourceRace: "Eshari",
    description: html("Your Spirit Sense reaches 60 feet (Velari heritage). When you use Search (Perception), you can detect the presence and general direction of disembodied spirits, incorporeal undead, haunts and active possession within 60 feet. You cannot determine exact location, identity or allegiance through this sense alone. Spirit Sense is blocked by 1 foot of stone, 1 inch of common metal or any thickness of lead."),
    flags: {
      creatureAbility: {
        printedTraits: "", printedAction: "", printedArea: "",
        derives: { sense: { category: "tertiary", modality: "spiritual", fixedFeet: 60, finds: "disembodied spirits, incorporeal undead, haunts and active possession" } },
        source: "Pillars of Faith, Chapter 2 (Velari)"
      }
    }
  }),
  // KETHRANI
  ability({
    name: "Living Testament", sourceRace: "Kethrani",
    description: html("You gain a +1 racial bonus to Religion and Linguistics checks made to identify, translate or understand prayers, religious symbols, divine doctrine and sacred writings."),
    flags: {
      conditionals: [
        conditional({ kind: "modifier", value: 1, type: "race", label: "Living Testament", scope: "Religion or Linguistics checks to identify, translate or understand prayers, religious symbols, doctrine or sacred writings — tick if this check is one", auto: false, when: { checkTypes: ["skill"], subjects: ["religion", "linguistics"] } })
      ]
    }
  }),
  ability({
    name: "Sacred Inscription", sourceRace: "Kethrani",
    description: html("The Testament is difficult to overwrite with hostile spiritual authority. You gain a +1 racial bonus to saving throws against curse effects."),
    flags: {
      conditionals: [
        conditional({ kind: "modifier", value: 1, type: "race", label: "Sacred Inscription", scope: "Saving throws against curse effects", auto: true, when: { checkTypes: ["save"], traits: ["curse"] } }),
        conditional({ kind: "modifier", value: 1, type: "race", label: "Sacred Inscription", scope: "Saving throws against a curse effect that does not carry the Curse trait — tick if this roll is one", auto: false, when: { checkTypes: ["save"], not: { traits: ["curse"] } } })
      ]
    }
  }),
  // MYRATHI
  ability({
    name: "Fungal Physiology", sourceRace: "Myrathi",
    description: html("You gain a +2 racial bonus to saving throws against disease and poison."),
    flags: {
      conditionals: [
        conditional({ kind: "modifier", value: 2, type: "race", label: "Fungal Physiology", scope: "Saving throws against disease and poison", auto: true, when: { checkTypes: ["save"], traits: ["disease", "poison"] } }),
        conditional({ kind: "modifier", value: 2, type: "race", label: "Fungal Physiology", scope: "Saving throws against a disease or poison that carries neither trait — tick if this roll is one", auto: false, when: { checkTypes: ["save"], not: { traits: ["disease", "poison"] } } })
      ]
    }
  }),
  ability({
    name: "Ancestral Communion", sourceRace: "Myrathi", traits: "Concentrate, Focus", usesPerDay: "1",
    description: html("Action 1 AP\n\nYou quiet your own thoughts and allow inherited fragments of memory to surface. The next Recall Knowledge check you attempt before the end of your next turn gains advantage.\n\nAncestral Communion does not allow you to attempt a check that would otherwise be impossible, nor does it grant knowledge that could never have been possessed by the Myrathi or their ancestors.\n\nUse: spends 1 AP in combat and the ability's Focus use (restored by Refocus), and puts the advantage on your next Recall Knowledge check automatically.")
  }),
  // RHEVANI
  ability({
    name: "Continuity of Self", sourceRace: "Rhevani",
    description: html("You gain a +1 racial bonus to saving throws against possession and mental effects that alter, erase or suppress your memories or identity."),
    flags: {
      conditionals: [
        conditional({ kind: "modifier", value: 1, type: "race", label: "Continuity of Self", scope: "Saving throws against possession, or mental effects that alter, erase or suppress your memories or identity — tick if this roll is one", auto: false, when: { checkTypes: ["save"] } })
      ]
    }
  }),
  ability({
    name: "Past-Life Echo", sourceRace: "Rhevani", traits: "Concentrate, Focus", usesPerDay: "1",
    description: html("Action 1 AP\n\nYou allow a fragment of experience from an earlier incarnation to rise into conscious memory. Select one non-specialist skill. Until the end of your next turn, you gain a +2 racial bonus to checks made using that skill and may use actions that normally require at least 1 rank in that skill as though you possessed 1 rank.\n\nThis ability does not grant access to specialist skills, feats or other options with separate prerequisites.\n\nUse: choose the skill; the +2 racial bonus and the trained-action waiver are applied for two round boundaries, and the Focus use is spent (restored by Refocus).")
  }),
  // KETHRANI — Tharos
  ability({
    name: "Warding Word", sourceRace: "Kethrani", traits: "Divinity, Focus, Warding", usesPerDay: "1",
    description: html("Action R; Trigger You or an ally within 10 feet is targeted by an attack\n\nThe protective script upon your body flashes with sudden light. The target of the triggering attack gains a +1 status bonus to DB against that attack.\n\nUse: target the creature being attacked (or nobody, for yourself); the +1 status bonus to DB is applied to them until the end of the current turn, the reaction is spent in combat, and the Focus use is spent (restored by Refocus).")
  }),
  // ESHARI — Lumari / MYRATHI — Lumeri light
  ability({
    name: "Lantern Glow", sourceRace: "Eshari",
    description: html("You emit dim light within 10 feet and can suppress or restore this light as a 1 AP action with the Concentrate trait.\n\nUse: toggles the light (1 AP in combat).")
  }),
  ability({
    name: "Bloom Light", sourceRace: "Myrathi",
    description: html("You emit dim light within 10 feet and can suppress or restore this light as a 1 AP action with the Concentrate trait.\n\nUse: toggles the light (1 AP in combat).")
  }),
  ability({
    name: "Silent Exchange", sourceRace: "Myrathi",
    description: html("You can communicate silently with willing Myrathi within 60 feet, provided you share a language and neither of you is completely sealed away from the surrounding air."),
    effects: [(id, name) => noteEffect(id, name, "Silent communication with willing Myrathi within 60 feet who share a language, unless either of you is sealed from the air.")]
  })
];

/* ------------------------------------------------------------------ */
/* Spell-like: Sacred Toll (Kelvan heritage)                            */
/*                                                                      */
/* An innate spell-like with a LEVEL-BASED save — which is exactly what  */
/* TRG Prime's innate-spell branch does (level-based attack/save maths,  */
/* 0 PP, Focus by default when granted). Shipped as a spell so the       */
/* target rolls a real Will save against a real DC and the ladder lands. */
/* ------------------------------------------------------------------ */

export const SPELLS = [
  spell({
    name: "Sacred Toll",
    tradition: "divinity",
    category: "save",
    ppCost: 0,
    castAP: 1,
    range: "30 feet",
    targets: "1 Undead or Unliving creature that can hear you",
    duration: "until the end of its next turn",
    defence: "Will",
    traits: "Auditory, Focus",
    // ONE USE, TRACKED. Live test 17 Sep 2026: with usesPerDay blank the
    // innate branch tracks nothing, so the Focus use was never spent and
    // Refocus had nothing to restore. "1" makes it a real Focus use.
    usesPerDay: "1",
    components: { somatic: false, verbal: true, material: false, focus: false },
    description: html("AUDITORY DIVINITY FOCUS\n\nAction 1 AP; Range 30 feet; Target one Undead or Unliving creature that can hear you\n\nThe target attempts a level-based Will saving throw.\n\nHeroic/Critical The target is unaffected.\nSuccess The target is unaffected.\nPartial The target becomes frightened 1 until the end of its next turn.\nFailure The target becomes frightened 2 until the end of its next turn.\nFumble The target becomes frightened 2 and cannot use reactions until the end of its next turn.\nBlunder The target becomes frightened 3 and cannot use reactions until the end of its next turn.\n\nA Kelvan heritage ability (Pillars of Faith, Chapter 2). Granted as an innate spell-like with the Focus trait: the save DC is level-based, no PP is spent, and Refocus restores it."),
    effects: [
      { kind: "condition", target: "targets", condition: "frightened", value: 1, onSave: ["partial"] },
      { kind: "condition", target: "targets", condition: "frightened", value: 2, onSave: ["failure", "fumble"] },
      { kind: "condition", target: "targets", condition: "frightened", value: 3, onSave: ["blunder"] },
      { kind: "note", text: "On a Fumble or Blunder the target also cannot use reactions until the end of its next turn." }
    ]
  })
];

/* ------------------------------------------------------------------ */
/* Races                                                                */
/* ------------------------------------------------------------------ */

export const RACES = [
  race({
    name: "Eshari",
    description: raceLore("Eshari", "RACIAL MECHANICS\n\nAbility Modifiers Con +1, Wis +1, Cha +1, Str -1; Size: Medium; Speed: 25 feet; Power Points: 0\n\nLANGUAGES\n\nCore Languages: Low Tongue, Vesperic; Additional Languages: Choose from any common or regional language.\n\nSPECIALIST SKILLS\n\nYou gain Eshari Lore and Spirit Lore as specialist skills.\n\nOTHER ABILITIES\n\nNightvision, Soul Warden, Spirit Sense — granted as ability items when the race is added.\n\nHERITAGES\n\nOnce you have selected the Eshari race you must select one of the Eshari heritages: Ashen, Kelvan, Lumari, Velari, Morrin."),
    abilityModifiers: "Con +1, Wis +1, Cha +1, Str -1",
    coreLanguages: "Low Tongue, Vesperic",
    specialistSkills: "Eshari Lore, Spirit Lore",
    racialAbilities: "Nightvision, Soul Warden, Spirit Sense"
  }),
  race({
    name: "Kethrani",
    description: raceLore("Kethrani", "RACIAL MECHANICS\n\nAbility Modifiers Int +1, Wis +1, Cha +1, Dex -1; Size: Medium; Speed: 25 feet; Power Points: 0\n\nLANGUAGES\n\nCore Languages: High Tongue, Low Tongue; Additional Languages: Choose from any common or regional language.\n\nSPECIALIST SKILLS\n\nYou gain Kethrani Lore and Theology as specialist skills.\n\nOTHER ABILITIES\n\nLiving Testament, Sacred Inscription — granted as ability items; Revelatory Script — Read Aura as a divinity innate cantrip with the Focus trait, granted as a spell.\n\nHERITAGES\n\nOnce you have selected the Kethrani race you must select one of the Kethrani heritages (Dominant Verses): Avenor, Korath, Sapiren, Serel, Tharos."),
    abilityModifiers: "Int +1, Wis +1, Cha +1, Dex -1",
    coreLanguages: "High Tongue, Low Tongue",
    specialistSkills: "Kethrani Lore, Theology",
    racialAbilities: "Living Testament, Sacred Inscription",
    grantedSpells: "Read Aura",
    flags: { grantInnate: true }
  }),
  race({
    name: "Myrathi",
    description: raceLore("Myrathi", "RACIAL MECHANICS\n\nAbility Modifiers Con +1, Int +1, Wis +1, Dex -1; Size: Medium; Speed: 25 feet; Power Points: 0\n\nLANGUAGES\n\nCore Languages: Low Tongue, Mycelic; Additional Languages: Choose from any common or regional language.\n\nSPECIALIST SKILLS\n\nYou gain Myrathi Lore and Ancestor Lore as specialist skills.\n\nOTHER ABILITIES\n\nFungal Physiology, Ancestral Communion — granted as ability items when the race is added.\n\nHERITAGES\n\nOnce you have selected the Myrathi race you must select one of the Myrathi heritages (Growths): Karuum, Lumeri, Morrai, Nethri, Vaelori."),
    abilityModifiers: "Con +1, Int +1, Wis +1, Dex -1",
    coreLanguages: "Low Tongue, Mycelic",
    specialistSkills: "Myrathi Lore, Ancestor Lore",
    racialAbilities: "Fungal Physiology, Ancestral Communion"
  }),
  race({
    name: "Rhevani",
    description: raceLore("Rhevani", "RACIAL MECHANICS\n\nAbility Modifiers Int +1, Wis +1, Cha +1, Con -1; Size: Medium; Speed: 25 feet; Power Points: 0\n\nLANGUAGES\n\nCore Languages: Low Tongue, Rhevic; Additional Languages: Choose from any common or regional language.\n\nSPECIALIST SKILLS\n\nYou gain Rhevani Lore and Soul Lore as specialist skills.\n\nOTHER ABILITIES\n\nContinuity of Self, Past-Life Echo — granted as ability items when the race is added.\n\nHERITAGES\n\nOnce you have selected the Rhevani race you must select one of the Rhevani heritages: Arathi, Dornai, Sevrai, Thaeli, Velori."),
    abilityModifiers: "Int +1, Wis +1, Cha +1, Con -1",
    coreLanguages: "Low Tongue, Rhevic",
    specialistSkills: "Rhevani Lore, Soul Lore",
    racialAbilities: "Continuity of Self, Past-Life Echo"
  })
];

/* ------------------------------------------------------------------ */
/* Heritages                                                            */
/* ------------------------------------------------------------------ */

export const HERITAGES = [
  // ESHARI
  heritage({
    name: "Ashen", sourceRace: "Eshari", description: heritageLore("Ashen"),
    effects: [
      (id, n) => resistanceEffect(id, n, "fire"),
      (id, n) => noteEffect(id, `${n}: smoke`, "Immune to the harmful effects of mundane smoke produced by ordinary fires.")
    ]
  }),
  heritage({
    name: "Kelvan", sourceRace: "Eshari", description: heritageLore("Kelvan"),
    grantedSpells: "Sacred Toll",
    flags: { grantInnate: true }
  }),
  heritage({
    name: "Lumari", sourceRace: "Eshari", description: heritageLore("Lumari"),
    racialAbilities: "Lantern Glow",
    grantedSpells: "Guidance",
    flags: { grantInnate: true }
  }),
  heritage({
    name: "Velari", sourceRace: "Eshari", description: heritageLore("Velari"),
    // The 60-foot sense REPLACES the race's 30-foot one: the heritage
    // removes the race's ability item and grants its own, the way Urloch
    // takes abilities away — so the senses list shows one Spirit Sense.
    racialAbilities: "Spirit Sense (Velari)",
    removedAbilities: "Spirit Sense",
    flags: {
      conditionals: [
        conditional({ kind: "modifier", value: 1, type: "race", label: "Velari", scope: "Perception checks to locate spirits, haunts, possession or undead creatures — tick if this check is one", auto: false, when: { checkTypes: ["skill"], subjects: ["perception"] } })
      ]
    },
  }),
  heritage({
    name: "Morrin", sourceRace: "Eshari", description: heritageLore("Morrin"),
    abilityModifiers: "Con +1"
  }),

  // KETHRANI
  heritage({
    name: "Avenor", sourceRace: "Kethrani", description: heritageLore("Avenor"),
    grantedSpells: "Stabilise",
    flags: { grantInnate: true },
    effects: [(id, n) => racialSkillEffect(id, n, ["Medicine"])]
  }),
  heritage({
    name: "Korath", sourceRace: "Kethrani", description: heritageLore("Korath"),
    // "When you successfully Demoralise a creature, its frightened
    // condition cannot be reduced below 1 until the end of your next
    // turn" — ENFORCED (Graham, 17 Sep 2026) through the system's
    // inflicted-floor declaration (3.561.0): a floor effect lands on the
    // target and every frightened reducer honours it.
    flags: { inflictedFloors: [{ action: "demoralise", condition: "frightened", value: 1, rounds: 2 }] },
    effects: [(id, n) => racialSkillEffect(id, n, ["Intimidate", "Sense Motive"])]
  }),
  heritage({
    name: "Sapiren", sourceRace: "Kethrani", description: heritageLore("Sapiren"),
    abilityModifiers: "Int +1",
    // "may select any one Lore specialist skill" — the same authored
    // chooser a core background uses; Use on the heritage names it.
    flags: { specialistChoice: { label: "Any one Lore specialist skill", prompt: "The Lore your Testament dwells on", placeholder: "e.g. Ruins Lore", suffix: "Lore" } }
  }),
  heritage({
    name: "Serel", sourceRace: "Kethrani", description: heritageLore("Serel"),
    flags: {
      conditionals: [
        conditional({ kind: "advantage", label: "Serel", scope: "Saving throws against illusion effects", auto: true, when: { checkTypes: ["save"], traits: ["illusion"] } }),
        conditional({ kind: "modifier", value: 1, type: "race", label: "Serel", scope: "Detect Deception (Sense Motive) checks", auto: true, when: { checkTypes: ["skill"], subjects: ["senseMotive"], actions: ["detectDeception"] } })
      ]
    }
  }),
  heritage({
    name: "Tharos", sourceRace: "Kethrani", description: heritageLore("Tharos"),
    racialAbilities: "Warding Word"
  }),

  // MYRATHI
  heritage({
    name: "Karuum", sourceRace: "Myrathi", description: heritageLore("Karuum"),
    effects: [(id, n) => changesEffect(id, `${n}: Base DR 1`,
      [{ key: "system.combat.naturalArmourBase.natural", mode: 0, value: "1", priority: 20 }],
      "Your hardened body grants you Base DR 1 (natural armour; scales with BDB like any base DR).")]
  }),
  heritage({
    name: "Lumeri", sourceRace: "Myrathi", description: heritageLore("Lumeri"),
    racialAbilities: "Bloom Light",
    grantedSpells: "Guidance",
    flags: { grantInnate: true }
  }),
  heritage({
    name: "Morrai", sourceRace: "Myrathi", description: heritageLore("Morrai"),
    effects: [(id, n) => resistanceEffect(id, n, "essence")]
  }),
  heritage({
    name: "Nethri", sourceRace: "Myrathi", description: heritageLore("Nethri"),
    racialAbilities: "Silent Exchange",
    effects: [(id, n) => racialSkillEffect(id, n, ["Sense Motive"])]
  }),
  heritage({
    name: "Vaelori", sourceRace: "Myrathi", description: heritageLore("Vaelori"),
    grantedSpells: "Purify",
    flags: { grantInnate: true },
    effects: [(id, n) => racialSkillEffect(id, n, ["Medicine"])]
  }),

  // RHEVANI
  heritage({
    name: "Arathi", sourceRace: "Rhevani", description: heritageLore("Arathi"),
    abilityModifiers: "Str +1",
    effects: [(id, n) => changesEffect(id, `${n}: Initiative +10`,
      [{ key: "system.combat.initiative.race", mode: 0, value: "10", priority: 20 }],
      "+10 racial bonus to Initiative checks.")]
  }),
  heritage({
    name: "Dornai", sourceRace: "Rhevani", description: heritageLore("Dornai"),
    effects: [(id, n) => changesEffect(id, `${n}: Death State +2`,
      [{ key: "system.combat.deathState", mode: 2, value: "2", priority: 20 }],
      "Your Death State increases by 2.")]
  }),
  heritage({
    name: "Sevrai", sourceRace: "Rhevani", description: heritageLore("Sevrai"),
    languageChoices: "1 common|regional",
    effects: [(id, n) => changesEffect(id, `${n}: Speed +5`,
      [{ key: "system.combat.movement.land", mode: 2, value: "5", priority: 20 }],
      "Your land Speed increases by 5 feet.")]
  }),
  heritage({
    name: "Thaeli", sourceRace: "Rhevani", description: heritageLore("Thaeli"),
    grantedSpells: "Guidance",
    flags: { grantInnate: true }
  }),
  heritage({
    name: "Velori", sourceRace: "Rhevani", description: heritageLore("Velori"),
    abilityModifiers: "Int +1",
    flags: { specialistChoice: { label: "Any one Lore specialist skill appropriate to a former life", prompt: "The Lore a former life studied", placeholder: "e.g. Lost Library Lore", suffix: "Lore" } }
  })
];

/* ------------------------------------------------------------------ */
/* Backgrounds                                                          */
/* ------------------------------------------------------------------ */

/** Chapter 6, BACKGROUND WEALTH table — the bonus to starting wealth. */
export const BACKGROUND_WEALTH = {
  "Battlefield Chaplain": 1, "Doctrine Keeper": 1, "Excommunicate": -1, "Funeral Cantor": 1,
  "Grave Custodian": 0, "Oath Witness": 1, "Pilgrim Envoy": -1, "Reliquary Seeker": 1,
  "Sacred Chirurgeon": 1, "Shrine Mason": 1, "Spirit Medium": 0, "Temple Chronicler": 2
};

export const BACKGROUNDS = Object.entries(text.backgrounds).map(([name, b]) => {
  if (!(name in BACKGROUND_WEALTH)) throw new Error(`No Chapter 6 wealth row for background "${name}"`);
  return background({
    name,
    description: html(`${b.description}\n\nBONUS FEAT\n\n${b.feat}\n\nSKILL BONUSES\n\n${b.skills}\n\nSPECIALIST SKILL\n\n${b.specialist}\n\nWEALTH\n\n${BACKGROUND_WEALTH[name]}`),
    grantedFeats: b.feat,
    skillBonuses: b.skills,
    specialistSkill: b.specialist,
    wealth: String(BACKGROUND_WEALTH[name])
  });
});

/* ------------------------------------------------------------------ */
/* The twelve General feats the backgrounds grant (Chapter 5)           */
/*                                                                      */
/* Several key off Chapter 4's NEW skill actions (Recognise Doctrine,    */
/* Trace Religious Provenance, Perform Last Rites, ...). Those actions   */
/* ship in the next block; the conditionals below already name their    */
/* keys, so they light up the moment the actions exist. Until then the  */
/* feat's description says what it will do. Nothing here is claimed as  */
/* automated that is not.                                               */
/* ------------------------------------------------------------------ */

const P = (t) => html(t);

export const FEATS = [
  feat({
    name: "Voice of Resolve", traits: "Auditory, Emotion", prerequisites: "Diplomacy 1 rank",
    description: P("AUDITORY EMOTION\n\nWhen fear takes hold, you know exactly what must be said.\n\nPrerequisites Diplomacy 1 rank\n\nWhenever you use Encourage upon an ally suffering from a Fear effect, that ally gains a +2 circumstance bonus to the new saving throw granted by Encourage.\n\nIf your Encourage check is a Critical result, the ally also reduces its Frightened condition by 1 after resolving the saving throw.\n\nUse: queues the +2 circumstance bonus on the encouraged ally's next save against the fear effect (target them first); the Critical rider is reported on the card."),
    flags: { pofAutomation: "voiceOfResolve" }
  }),
  feat({
    name: "Doctrinal Recall", prerequisites: "Religion or Linguistics 1 rank",
    description: P("Years spent comparing teachings allow you to recognise religious ideas even when they are expressed in unfamiliar language.\n\nPrerequisites Religion or Linguistics 1 rank\n\nWhen using Recognise Doctrine, you may use Religion, Linguistics or Culture, whichever has the highest bonus. Use the selected skill's ranks to meet the action's Rank requirement.\n\nFurthermore, when you achieve a Success or better on Recognise Doctrine, you gain a +1 circumstance bonus to your next Recall Knowledge or Analyse Scripture check concerning the same doctrine within the next hour.\n\nRecognise Doctrine is offered from your Religion, Linguistics and Culture skills alike — invoke it from whichever is highest. After a Success or better, press Use to queue the +1 circumstance bonus for the follow-up check."),
    flags: { pofAutomation: "doctrinalRecall" }
  }),
  feat({
    name: "Outcast's Resolve", prerequisites: "Mental Focus 1 rank", usesPerDay: "1",
    description: P("You have already survived condemnation once. Authority no longer possesses quite the same power over you.\n\nPrerequisites Mental Focus 1 rank\n\nAction R; Trigger You fail a Will saving throw against a Fear, Charm or Compulsion effect.\nFrequency Once per day\n\nYou may reroll the triggering saving throw. You must use the second result.\n\nIf the effect originates from a creature, institution, Divine Aspect or religious tradition responsible for your excommunication or rejection, you gain a +1 circumstance bonus to this reroll.\n\nUse: spends the reaction and the day's use, and queues the optional +1 circumstance bonus for the reroll — then reroll the Will save from your sheet."),
    flags: { pofAutomation: "outcastsResolve" }
  }),
  feat({
    name: "Rite of Passing", prerequisites: "Perform or Religion 1 rank",
    description: P("Your funerary practice gives the bereaved something firm to hold onto while the dead begin their final journey.\n\nPrerequisites Perform or Religion 1 rank\n\nYou may use Perform instead of Religion when using Perform Last Rites, provided the performance takes the form of an appropriate funeral chant, prayer, lament or ritual recitation. Use your Perform ranks to meet the action's Rank requirement.\n\nWhenever you achieve a Success or better on Perform Last Rites, choose one willing living creature present who knew the deceased. That creature gains a +1 status bonus to saving throws against Fear effects for the next 24 hours.\n\nA creature may benefit from Rite of Passing only once per day.\n\nPerform Last Rites is offered from your Perform skill as well as Religion. After a Success or better, target the mourner and press Use: they gain the +1 status bonus to saves against Fear effects for 24 hours, applied automatically."),
    flags: { pofAutomation: "riteOfPassing" }
  }),
  feat({
    name: "Grave Vigil", prerequisites: "Perception 1 rank",
    description: P("You know what a burial ground looks like when everything is where it should be.\n\nPrerequisites Perception 1 rank\n\nYou gain a +2 circumstance bonus to Search checks made to notice disturbed graves, opened crypts, damaged funerary seals, concealed entrances within burial structures or physical evidence that a corpse has been moved.\n\nWhen rolling Initiative within a cemetery, crypt, tomb or similar burial site, you gain a +10 circumstance bonus if an Undead creature, Unliving creature or grave-related hazard is involved in the encounter.\n\nBoth bonuses are offered in the roll dialog with the book's wording — tick when the scene matches."),
    flags: {
      conditionals: [
        conditional({ kind: "modifier", value: 2, type: "circumstance", label: "Grave Vigil", scope: "Search checks to notice disturbed graves, opened crypts, damaged funerary seals, concealed entrances in burial structures or evidence a corpse was moved", auto: false, when: { checkTypes: ["skill"], subjects: ["perception"], actions: ["search"] } }),
        conditional({ kind: "modifier", value: 10, type: "circumstance", label: "Grave Vigil", scope: "Initiative in a cemetery, crypt, tomb or similar burial site when an Undead or Unliving creature or a grave-related hazard is involved", auto: false, when: { checkTypes: ["initiative"] } })
      ]
    }
  }),
  feat({
    name: "Sworn Testimony", prerequisites: "Sense Motive 1 rank",
    description: P("Promises have rhythms of their own, and you have heard enough of them to recognise the places where people leave themselves room to escape.\n\nPrerequisites Sense Motive 1 rank\n\nWhenever you deliberately witness a creature make a formal oath, vow, contract or promise, you can accurately recall the significant wording of that declaration for one month.\n\nDuring that period, you gain a +4 circumstance bonus to Detect Deception checks against that creature when the conversation specifically concerns the terms, meaning or fulfilment of the witnessed promise.\n\nThis feat does not reveal whether the creature will ultimately keep the oath.\n\nThe +4 is offered on every Detect Deception check with the book's wording — tick when the conversation concerns a witnessed promise."),
    flags: {
      conditionals: [
        conditional({ kind: "modifier", value: 4, type: "circumstance", label: "Sworn Testimony", scope: "Detect Deception against a creature whose oath you witnessed, when the conversation concerns that promise's terms, meaning or fulfilment", auto: false, when: { checkTypes: ["skill"], subjects: ["senseMotive"], actions: ["detectDeception"] } })
      ]
    }
  }),
  feat({
    name: "Pilgrim's Grace", prerequisites: "Culture 1 rank",
    description: P("Years of entering unfamiliar shrines taught you that respect travels farther than certainty.\n\nPrerequisites Culture 1 rank\n\nWhen you achieve at least a Success using Observe Sacred Custom, the circumstance bonus granted by that action applies to all appropriate Diplomacy checks involving that religious community for 1 hour rather than only the next check.\n\nFurthermore, after successfully Observing Sacred Custom, you may use Culture instead of Diplomacy to Make an Impression upon a member of that tradition.\n\nMake an Impression is offered from your Culture skill. The lasting bonus is a rule for the table: Observe Sacred Custom queues its bonus for one check as printed, and with this feat you keep applying it to Diplomacy against that community for the hour."),
    effects: [(id, n) => noteEffect(id, `${n}: lasting custom`, "After a Success on Observe Sacred Custom, its circumstance bonus applies to all appropriate Diplomacy checks with that religious community for 1 hour, not only the next check.")]
  }),
  feat({
    name: "Relic Appraiser", prerequisites: "Culture or Religion 1 rank",
    description: P("You have learned to separate sacred history from an enthusiastic seller's story.\n\nPrerequisites Culture or Religion 1 rank\n\nYou gain a +2 circumstance bonus when using Trace Religious Provenance.\n\nOn a Success or better, you can also estimate the object's mundane market value and determine whether its construction, age and provenance are consistent with claims made about it.\n\nOn a Critical result, you gain a +1 circumstance bonus to the next Identify Power or Recall Knowledge check made concerning that object. Relic Appraiser does not itself reveal magical properties.\n\nThe +2 circumstance bonus is applied automatically on Trace Religious Provenance checks."),
    flags: {
      conditionals: [
        conditional({ kind: "modifier", value: 2, type: "circumstance", label: "Relic Appraiser", scope: "Trace Religious Provenance checks", auto: true, when: { checkTypes: ["skill"], actions: ["traceReligiousProvenance"] } })
      ]
    }
  }),
  feat({
    name: "Sanctified Treatment", prerequisites: "Medicine 1 rank",
    description: P("Prayer does not replace medicine, but discipline, reassurance and careful ritual can make treatment considerably easier to endure.\n\nPrerequisites Medicine 1 rank\n\nWhenever you achieve at least a Success using Administer First Aid, Treat Injury or Treat Wounds, the patient gains a +1 circumstance bonus to the next saving throw they attempt against a Disease, Poison or effect with the Soul trait within the next hour.\n\nIf your Medicine check is a Critical result, this bonus increases to +2.\n\nA creature can benefit from Sanctified Treatment only once at a time.\n\nUse after a successful treatment: target the patient and press Use — the bonus (+1, or +2 on a Critical) is queued on their sheet for their next save against disease, poison or a Soul effect."),
    flags: { pofAutomation: "sanctifiedTreatment" }
  }),
  feat({
    name: "Consecrated Craft", prerequisites: "Crafting 1 rank",
    description: P("You understand that sacred craftsmanship is as much about meaning and placement as it is about stone, timber and metal.\n\nPrerequisites Crafting 1 rank\n\nYou gain a +2 circumstance bonus to Create and Repair checks involving shrines, altars, reliquaries, funerary objects, holy symbols and other items primarily intended for religious or ritual use.\n\nYou may also use Crafting instead of Culture when using Trace Religious Provenance upon a crafted religious object or architectural feature. Use your Crafting ranks to meet the action's Rank requirement.\n\nBe aware that this does not allow Crafting to identify magical properties.\n\nThe +2 is offered on Create and Repair checks with the book's wording — tick when the object is religious or ritual. Trace Religious Provenance is offered from your Crafting skill as well as Culture."),
    flags: {
      conditionals: [
        conditional({ kind: "modifier", value: 2, type: "circumstance", label: "Consecrated Craft", scope: "Create or Repair checks involving shrines, altars, reliquaries, funerary objects, holy symbols or other religious/ritual items", auto: false, when: { checkTypes: ["skill"], subjects: ["crafting"], actions: ["create", "repair"] } })
      ]
    }
  }),
  feat({
    name: "Veil Listener", prerequisites: "Occultism or Religion 1 rank",
    description: P("You have learned not to assume that every strange feeling is a ghost - and not to assume that it is not.\n\nPrerequisites Occultism or Religion 1 rank\n\nYou gain a +1 circumstance bonus to Trace Possession, Interpret Haunt and Identify Spiritual Affliction checks.\n\nWhen you achieve a Critical result on any of these actions, you may immediately attempt an appropriate Recall Knowledge check concerning the spirit, haunt or affliction as a Free (0 AP) action.\n\nVeil Listener does not itself allow communication with spirits.\n\nThe +1 circumstance bonus is applied automatically on those three checks."),
    flags: {
      conditionals: [
        conditional({ kind: "modifier", value: 1, type: "circumstance", label: "Veil Listener", scope: "Trace Possession, Interpret Haunt and Identify Spiritual Affliction checks", auto: true, when: { checkTypes: ["skill"], actions: ["tracePossession", "interpretHaunt", "identifySpiritualAffliction"] } })
      ]
    }
  }),
  feat({
    name: "Keeper of Records", prerequisites: "Culture or Linguistics 1 rank",
    description: P("You know where institutions hide information - and which apparently meaningless entry usually reveals it.\n\nPrerequisites Culture or Linguistics 1 rank\n\nWhen using Research to investigate historical, religious or institutional records, reduce the time required by half.\n\nWhen using Compare Testaments, a Partial result is treated as a Success for the purpose of determining whether the texts differ, although you still cannot determine which version is older or authoritative unless your actual result would normally allow it.\n\nOn Compare Testaments a Partial is resolved as a Success for you automatically (the card says so); the older/authoritative caveat stands. The Research time halving is a note."),
    effects: [(id, n) => noteEffect(id, `${n}: Research`, "Research into historical, religious or institutional records takes half the usual time.")]
  })
];

/** The pack layout: logical system pack each of ours extends. */
export const PACKS = [
  { name: "pof-races", label: "Pillars of Faith: Races", extends: "races", docs: RACES },
  { name: "pof-heritages", label: "Pillars of Faith: Heritages", extends: "heritages", docs: HERITAGES },
  { name: "pof-backgrounds", label: "Pillars of Faith: Backgrounds", extends: "backgrounds", docs: BACKGROUNDS },
  { name: "pof-classes", label: "Pillars of Faith: Classes", extends: "classes", docs: CLASSES },
  { name: "pof-gear", label: "Pillars of Faith: Gear", extends: "gear", docs: [...CLASS_GEAR, ...ARCHETYPE_GEAR, ...TOOLS] },
  // Racial abilities (Chapter 2) and class abilities (Chapter 3) share
  // one pack, as the core abilities pack holds both kinds.
  { name: "pof-abilities", label: "Pillars of Faith: Abilities", extends: "abilities", docs: [...ABILITIES, ...CLASS_ABILITIES, ...ARCHETYPE_ABILITIES, ...UNLIVING_ABILITIES] },
  // Chapter 5: the twelve background feats (0.1.0) and the four feat
  // families (0.4.0) share the pack, as the core feats pack does.
  { name: "pof-feats", label: "Pillars of Faith: Feats", extends: "feats", docs: [...FEATS, ...RACIAL_FEATS, ...ARCHETYPE_FEATS, ...CLASS_FEATS, ...GENERAL_FEATS, ...UNLIVING_ARCHETYPE_FEATS, ...UNLIVING_CLASS_FEATS] },
  // The natural attacks feats hand over live where the core keeps its
  // own (the companions pack), so `grantedWeapons` (3.571.0) finds them.
  { name: "pof-companions", label: "Pillars of Faith: Natural Attacks", extends: "companions", docs: [...FEAT_WEAPONS, ...UNLIVING_WEAPONS] },
  // Chapter 10 (0.5.0): Sacred Toll (Chapter 2) and the Grimoire share the pack.
  { name: "pof-spells", label: "Pillars of Faith: Spells", extends: "spells", docs: [...SPELLS, ...ALL_GRIMOIRE_SPELLS, ...UNLIVING_SPELLS] },
  // Chapter 7 (0.5.0): the twenty-two Divine Aspects, beside the core ten.
  { name: "pof-aspects", label: "Pillars of Faith: Divine Aspects", extends: "divine-aspects", docs: DIVINE_ASPECTS },
  // Chapter 6 (0.6.0): the mundane equipment and the herbs, each beside its core pack.
  { name: "pof-armour", label: "Pillars of Faith: Armour", extends: "armour", docs: ARMOUR },
  { name: "pof-shields", label: "Pillars of Faith: Shields", extends: "shields", docs: SHIELDS },
  { name: "pof-weapons", label: "Pillars of Faith: Weapons", extends: "weapons", docs: WEAPONS },
  { name: "pof-alchemical", label: "Pillars of Faith: Herbs & Consumables", extends: "alchemical", docs: CONSUMABLES },
  // Chapter 11 (0.8.0): each kind of magic item beside its core pack.
  { name: "pof-runes", label: "Pillars of Faith: Runes", extends: "runes", docs: RUNE_ITEMS },
  { name: "pof-specific-items", label: "Pillars of Faith: Specific Magic Armour & Weapons", extends: "specific-items", docs: [...SPECIFIC_ARMOUR, ...SPECIFIC_WEAPONS] },
  { name: "pof-wondrous", label: "Pillars of Faith: Wondrous Items & Relics", extends: "wondrous", docs: [...WONDROUS_ITEMS, ...RELICS, ...UNLIVING_ITEMS] },
  { name: "pof-charged-items", label: "Pillars of Faith: Charged Items", extends: "charged-items", docs: CHARGED_ITEMS },
  { name: "pof-consumables", label: "Pillars of Faith: Magical Consumables", extends: "consumables", docs: MAGIC_CONSUMABLES },
  // Chapter 9 (0.9.0): the Unliving diseases, beside the core afflictions.
  { name: "pof-afflictions", label: "Pillars of Faith: Afflictions", extends: "afflictions", docs: UNLIVING_AFFLICTIONS },
  // Chapter 8 (0.10.0): the nine sample haunts and the Spirit Presence
  // template — NPCs with TRG Prime 3.629.0's Peril section — and the GM's
  // guide. Nothing in the core to extend: they stand alone.
  { name: "pof-haunts", label: "Pillars of Faith: Haunts & Spirits", type: "Actor", docs: [...HAUNTS, ...SPIRIT_ACTORS] },
  { name: "pof-journals", label: "Pillars of Faith: GM Guides", type: "JournalEntry", docs: HAUNT_JOURNAL }
];

export { stableId };
