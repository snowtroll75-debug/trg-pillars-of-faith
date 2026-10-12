/**
 * What Pillars of Faith registers with TRG Prime's module API.
 *
 * Kept separate from the automations so the harness can call this with
 * a fake `api` and assert exactly what was registered, without Foundry.
 */
import { PERIL_AUTOMATIONS } from "./haunt-automations.mjs";
import { AUTOMATIONS, PASSIVE_HINTS } from "./automations.mjs";
import { CLASS_AUTOMATIONS, CLASS_PASSIVE_HINTS } from "./class-automations.mjs";
import { FEAT_AUTOMATIONS, FEAT_PASSIVE_HINTS } from "./feat-automations.mjs";
import { GRIMOIRE_AUTOMATIONS, GRIMOIRE_PASSIVE_HINTS } from "./grimoire-automations.mjs";
import { SKILL_ACTIONS } from "./skill-actions.mjs";
import { registerMagicItems } from "./magic-items.mjs";
import { UNLIVING_AUTOMATIONS } from "./unliving-automations.mjs";
import { undeadLordsEnabled, undeadLordsPicks } from "./campaign-options.mjs";
import { martyrsAegisShare } from "./pass-automations.mjs";

/** Chapter 1 — the four new traits. */
export const TRAITS = ["haunt", "investigation", "spirit", "unliving"];

/** Chapter 2 — the three racial tongues. Uncommon, per Graham's ruling of 17 Sep 2026. */
export const LANGUAGES = {
  Vesperic: { rarity: "uncommon", speakers: "Eshari" },
  Rhevic: { rarity: "uncommon", speakers: "Rhevani" },
  Mycelic: { rarity: "uncommon", speakers: "Myrathi" }
};

/** Chapter 2 — every new race prints "Power Points: 0". Registered explicitly. */
export const RACIAL_PP = { Eshari: 0, Kethrani: 0, Myrathi: 0, Rhevani: 0 };

/**
 * Chapter 3 — the five classes, registered so the proficiency profile,
 * the Class Wealth table (Chapter 6: Archivist 1, Folkwarden 0, Grimward
 * 1, Healer 1, Shaman -1), the Divine Aspect slot and the class-feat
 * gate all know them. The class ITEMS live in the pof-classes pack.
 */
/**
 * WARPING OPTIONS A FEAT GRANTS (TRG Prime 3.625.0, `registerSpellWarps`).
 * Three Chapter 5 feats print a warp that belongs to the caster, not the
 * spell; each joins the Warp? dialog of the spells its match names.
 */
export const SPELL_WARPS = {
  "Swift Mender": [{ match: { traits: ["healing"] }, warp: { ppCost: 4, text: "Swift Mender: cast for 1 AP less (minimum 1 AP)", mods: { castApDelta: -1, once: true } } }],
  "Renewed Restoration": [{ match: { name: "Restoration" }, warp: { ppCost: 4, text: "Renewed Restoration: the target ignores Restoration's once-per-day limit", mods: { ignoreDailyLimit: true } } }],
  "Guiding Luminescence": [{ match: { name: "Guidance", innate: true }, warp: { ppCost: 0, text: "Guiding Luminescence: target two creatures within range", mods: { extraTargets: 1, once: true } } }]
};

export const CLASS_REGISTRATIONS = {
  Archivist: {
    // "An Archivist does not automatically select a deity or Divine
    // Aspect" (Chapter 3) — a divinity caster the 3.623.0 banner would
    // otherwise ask for one. Declined out loud (3.625.0).
    needsDivineAspect: false,
    wealth: 1,
    proficiency: {
      label: "Archivist",
      armourCategories: [], armourNames: [], otherTiers: [], armourExclude: [],
      shieldCategories: [], shieldNames: [],
      weaponCategories: [], weaponNames: ["Club", "Dagger", "Staff"], weaponRules: [],
      deityWeapons: false
    }
  },
  Folkwarden: {
    wealth: 0,
    proficiency: {
      label: "Folkwarden",
      armourCategories: ["Light"], armourNames: [], otherTiers: ["light"], armourExclude: [],
      shieldCategories: ["buckler", "light", "heavy"], shieldNames: [],
      weaponCategories: ["Simple"], weaponNames: ["Spear", "Short Bow", "Composite Shortbow"], weaponRules: [],
      deityWeapons: false
    }
  },
  Grimward: {
    wealth: 1,
    needsDivineAspect: true,
    proficiency: {
      label: "Grimward",
      armourCategories: ["Light", "Medium"], armourNames: [], otherTiers: ["light", "medium"], armourExclude: [],
      shieldCategories: ["buckler", "light", "heavy"], shieldNames: [],
      weaponCategories: ["Simple", "Martial"], weaponNames: [], weaponRules: [],
      deityWeapons: true
    }
  },
  Healer: {
    // "your power does not depend upon … service to a particular Divine
    // Aspect" (Chapter 3): a divinity caster that needs no aspect (3.625.0).
    needsDivineAspect: false,
    wealth: 1,
    proficiency: {
      label: "Healer",
      armourCategories: ["Light"], armourNames: [], otherTiers: ["light"], armourExclude: [],
      shieldCategories: [], shieldNames: [],
      weaponCategories: ["Simple"], weaponNames: [], weaponRules: [],
      deityWeapons: false
    }
  },
  Shaman: {
    wealth: -1,
    proficiency: {
      label: "Shaman",
      armourCategories: ["Light"], armourNames: [], otherTiers: ["light"], armourExclude: [],
      shieldCategories: ["buckler", "light", "heavy"], shieldNames: [],
      weaponCategories: ["Simple"], weaponNames: ["Spear", "Short Bow", "Composite Shortbow"], weaponRules: [],
      deityWeapons: false
    }
  }
};

/**
 * Feats — and, from 0.3.0, class abilities — that open an action from
 * another skill. Chapter 5's background feats; the Shaman's Spirit
 * Speaker ("use Nature instead of Occultism... spirits, haunts,
 * possession"); the Folkwarden's Seasoned Hands ("use Nature instead of
 * Medicine" for natural diseases and poisons).
 */
export const SKILL_SUBSTITUTIONS = {
  "Spirit Speaker": [
    { action: "tracePossession", skill: "nature" },
    { action: "interpretHaunt", skill: "nature" }
  ],
  "Seasoned Hands": [
    { action: "treatDisease", skill: "nature" },
    { action: "treatToxin", skill: "nature" }
  ],
  "Rite of Passing": { action: "performLastRites", skill: "perform" },
  "Doctrinal Recall": [
    { action: "recogniseDoctrine", skill: "linguistics" },
    { action: "recogniseDoctrine", skill: "culture" }
  ],
  "Consecrated Craft": { action: "traceReligiousProvenance", skill: "crafting" },
  "Pilgrim's Grace": { action: "makeAnImpression", skill: "culture" },
  // Chapter 5 racial and general feats.
  "Fey-Soul Listener": [
    { action: "tracePossession", skill: "nature" },
    { action: "interpretHaunt", skill: "nature" }
  ],
  "Lay Exorcist": [
    { action: "tracePossession", skill: "religion" },
    { action: "interpretHaunt", skill: "religion" }
  ],
  "Bloom-Tender's Spores": { action: "preserveRemains", skill: "nature" },
  // VEIL TRACKER (0.11.0, TRG Prime 3.630.0): "You may use Spirit Lore instead
  // of Survival" to Track — offered when Spirit Lore is rolled from the sheet.
  "Veil Tracker": { action: "track", skill: "specialist:spiritLore" }
};

/** Chapter 5 — "treat a Partial as a Success" style upgrades, by feat. */
export const DEGREE_UPGRADES = {
  "Keeper of Records": [{ actionKey: "compareTestaments", from: "partial", to: "success" }],
  // Chapter 3, Seasoned Hands (Folkwarden 3rd): "Whenever you Fumble ... a
  // check made as part of Read the Signs or Lay to Rest, or a Medicine
  // check made to Treat Disease, Treat Toxin or Treat Wounds, treat the
  // result as a Failure instead."
  "Seasoned Hands": ["readTheSigns", "layToRest", "treatDisease", "treatToxin", "treatWounds"]
    .map((actionKey) => ({ actionKey, from: "fumble", to: "failure" })),
  // Chapter 5 general feats.
  "Close Reading": [{ actionKey: "analyseScripture", from: "partial", to: "success" }],
  "Expert Autopsist": [{ actionKey: "performAutopsy", from: "fumble", to: "failure" }],
  "Watch the Eyes": [{ actionKey: "senseOutsideInfluence", from: "partial", to: "success" }]
};

/**
 * Chapter 5 — the thirteen archetypes. Five open a class's feat list
 * (`classGrants`) at a tier; the rest are registered so the archetype
 * chooser and the archetype-feat gate know the name.
 */
export const ARCHETYPE_REGISTRATIONS = {
  "Hedge Witch": { classGrants: [], tierGrants: [] },
  "Inquisitor": { classGrants: ["Grimward"], tierGrants: ["Expert"] },
  "Lifebearer": { classGrants: ["Healer"], tierGrants: ["Adept"] },
  "Liturgist": { classGrants: ["Archivist"], tierGrants: ["Adept"] },
  "Martyr": { classGrants: [], tierGrants: [] },
  "Oathkeeper": { classGrants: [], tierGrants: [] },
  "Prophet": { classGrants: [], tierGrants: [] },
  "Reliquarian": { classGrants: [], tierGrants: [] },
  "Sage": { classGrants: [], tierGrants: [] },
  "Spirit Walker": { classGrants: ["Shaman"], tierGrants: ["Adept"] },
  "Veil Warden": { classGrants: [], tierGrants: [] },
  "Votary": { classGrants: [], tierGrants: [] },
  "Waywarden": { classGrants: [], tierGrants: [] }
};

/** The class-skill choice two archetype feats offer on Use (system CLASS_SKILL_GRANTS shape). */
export const ARCHETYPE_CLASS_SKILL_GRANTS = [
  { name: "inquisitor", flag: "inquisitorClassSkill", label: "Inquisitor", options: ["occultism", "religion", "senseMotive", "survival"] },
  { name: "lifebearer", flag: "lifebearerClassSkill", label: "Lifebearer", options: ["medicine", "meditation", "religion"] }
];

/**
 * Chapter 5 — core-book feats the new races and classes may take. The
 * picker gates a racial feat on `sourceRace` and a class feat on class
 * traits, which the core items name only for core races and classes;
 * `registerFeatAccess` (3.571.0) opens each list without editing the
 * core item. Ethereal Trick's Eshari access is the book's (the Velari
 * feat is player-checked); the Shaman's Animal Companion, Animal Soul
 * and Favoured Terrain are conditioned on its guide by the book text on
 * the sheet, not by the gate.
 */
export const FEAT_ACCESS = {
  race: {
    Rhevani: ["Self Aware", "Worldly"],
    Eshari: ["Innate Courage", "Ethereal Trick"],
    Kethrani: ["Self Aware"],
    Myrathi: ["Stone-Like Endurance"]
  },
  class: {
    Archivist: ["Bardic Lore", "Empower Familiar", "Familiar", "Versatile Familiar"],
    Grimward: ["Combat Awareness", "Monster Lore"],
    Healer: ["Conductive Healing", "Healing Channel"],
    Folkwarden: ["Animal Companion", "Animal Soul", "Assess Tracks", "Favoured Terrain", "Trackless Step", "Wild Stride"],
    Shaman: ["Animal Companion", "Animal Soul", "Favoured Terrain"]
  }
};

/**
 * Chapter 9 — The Unliving (0.9.0). "Generic Unliving class feats are
 * available to any Unliving character. Type-specific class feats require the
 * named Unliving Archetype." — a feat gate per trait (TRG Prime 3.627.0); and
 * "a character may only ever select one Unliving Archetype Feat" — an
 * exclusive group. The archetypes print the Unliving trait themselves and are
 * not kept behind it.
 */
export const UNLIVING_ARCHETYPES = ["Unliving Skeleton", "Unliving Zombie", "Unliving Ghoul", "Unliving Mummy", "Unliving Vampire", "Unliving Ghost", "Unliving Lich"];
export const UNLIVING_GATES = {
  Unliving: UNLIVING_ARCHETYPES,
  ...Object.fromEntries(UNLIVING_ARCHETYPES.map((a) => [`Unliving-${a.split(" ")[1]}`, [a]]))
};
export const UNLIVING_TRAITS = Object.keys(UNLIVING_GATES).filter((t) => t !== "Unliving").map((t) => t.toLowerCase());

export function registerContent(api, moduleId) {
  api.registerTraits(TRAITS, moduleId);
  for (const [name, spec] of Object.entries(CLASS_REGISTRATIONS)) api.registerClass(name, spec, moduleId);
  api.registerSkillActions(SKILL_ACTIONS, moduleId);
  for (const [name, entries] of Object.entries(DEGREE_UPGRADES)) api.registerDegreeUpgrades(name, entries, moduleId);
  for (const [name, entries] of Object.entries(SPELL_WARPS)) api.registerSpellWarps?.(name, entries, moduleId);
  for (const [name, spec] of Object.entries(LANGUAGES)) api.registerLanguage(name, spec, moduleId);
  for (const [name, per] of Object.entries(RACIAL_PP)) api.registerRacialPP(name, per, moduleId);
  for (const [name, entries] of Object.entries(SKILL_SUBSTITUTIONS)) api.registerSkillSubstitution(name, entries, moduleId);
  for (const [name, spec] of Object.entries(ARCHETYPE_REGISTRATIONS)) api.registerArchetype(name, spec, moduleId);
  for (const entry of ARCHETYPE_CLASS_SKILL_GRANTS) api.registerClassSkillGrant(entry, moduleId);
  if (typeof api.registerFeatAccess === "function") {
    for (const [kind, owners] of Object.entries(FEAT_ACCESS)) {
      for (const [owner, feats] of Object.entries(owners)) api.registerFeatAccess(kind, owner, feats, moduleId);
    }
  }
  for (const [name, entry] of Object.entries({ ...AUTOMATIONS, ...CLASS_AUTOMATIONS, ...FEAT_AUTOMATIONS, ...GRIMOIRE_AUTOMATIONS })) api.registerFeatAutomation(name, entry, moduleId);
  for (const [name, hint] of Object.entries({ ...PASSIVE_HINTS, ...CLASS_PASSIVE_HINTS, ...FEAT_PASSIVE_HINTS, ...GRIMOIRE_PASSIVE_HINTS })) api.registerPassiveAutomation(name, hint, moduleId);
  // Chapter 11 (0.8.0): the fifteen runes and the wondrous items' uses (3.626.0).
  registerMagicItems(api, moduleId);
  // Chapter 9 (0.9.0): the type traits, the gates, the one-archetype rule, the two Uses.
  api.registerTraits(UNLIVING_TRAITS, moduleId);
  if (typeof api.registerFeatGate === "function") {
    for (const [trait, feats] of Object.entries(UNLIVING_GATES)) api.registerFeatGate(trait, feats, moduleId);
    api.registerExclusiveFeats("Unliving Archetype", UNLIVING_ARCHETYPES, moduleId);
  }
  for (const [name, entry] of Object.entries(UNLIVING_AUTOMATIONS)) api.registerFeatAutomation(name, entry, moduleId);
  // Chapter 8 (0.10.0): the Hungry Reliquary's two redistributions (3.629.0).
  for (const [name, spec] of Object.entries(PERIL_AUTOMATIONS)) api.registerPerilAutomation?.(name, spec, moduleId);
  // Chapter 9 (0.11.0): the Undead Lords campaign's bonus Archetype feat,
  // when the world setting is ticked (TRG Prime 3.630.0).
  api.registerFeatPickBonus?.("Undead Lords", (actor) => undeadLordsPicks(actor, undeadLordsEnabled(moduleId)), moduleId);
  // Chapter 11 (0.11.0): Martyr's Aegis takes its share of an ally's blow.
  api.registerDamageShare?.("Martyr's Aegis", martyrsAegisShare, moduleId);
}
