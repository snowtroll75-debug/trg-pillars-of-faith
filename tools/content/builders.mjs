/**
 * Builders for Pillars of Faith pack documents.
 *
 * Every document the module ships is authored in tools/content/*.mjs as
 * a call to one of these and compiled by tools/build-packs.mjs. The
 * shapes here are copied from what TRG Prime's own packs hold — an
 * ability-modifier effect is `system.attributes.<x>.racial` in ADD mode
 * at priority 20 because that is what the Elf's is — so a module item
 * is indistinguishable from a core one to every rule that reads it.
 *
 * IDS ARE DETERMINISTIC: a 16-character id derived from the pack and the
 * name, so a rebuild never changes an id a world already holds.
 */
import { createHash } from "node:crypto";

export const MODULE_ID = "trg-pillars-of-faith";
export const SYSTEM_ID = "trg-prime";
export const SOURCE = "Pillars of Faith";

const ID_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/** A stable 16-character Foundry id from a seed. */
export function stableId(seed) {
  const digest = createHash("sha256").update(String(seed)).digest();
  let out = "";
  for (let i = 0; i < 16; i += 1) out += ID_ALPHABET[digest[i] % ID_ALPHABET.length];
  return out;
}

const STATS = {
  coreVersion: "14",
  systemId: SYSTEM_ID,
  systemVersion: "3.560.0",
  createdTime: 1789000000000,
  modifiedTime: 1789000000000,
  lastModifiedBy: null,
  compendiumSource: null,
  duplicateSource: null
};

/** Attribute names as `abilityModifiers` prints them → schema keys. */
const ATTRIBUTES = {
  str: "strength", dex: "dexterity", con: "constitution",
  int: "intelligence", wis: "wisdom", cha: "charisma"
};

/** Skill labels as the book prints them → schema keys. */
export const SKILL_KEYS = {
  "acrobatics": "acrobatics", "arcana": "arcana", "artistry": "artistry", "athletics": "athletics",
  "climbing": "climbing", "crafting": "crafting", "culture": "culture", "deception": "deception",
  "diplomacy": "diplomacy", "handle animal": "handleAnimal", "intimidate": "intimidate",
  "linguistics": "linguistics", "medicine": "medicine", "meditation": "meditation",
  "mental focus": "mentalFocus", "nature": "nature", "occultism": "occultism",
  "perception": "perception", "perform": "perform", "planes": "planes",
  "power manipulation": "powerManipulation", "religion": "religion", "sense motive": "senseMotive",
  "stealth": "stealth", "survival": "survival", "swimming": "swimming"
};

export function skillKey(label) {
  const key = SKILL_KEYS[String(label).trim().toLowerCase()];
  if (!key) throw new Error(`Unknown skill label "${label}"`);
  return key;
}

/** "Con +1, Wis +1, Cha +1, Str -1" → [{key, value}] */
export function parseAbilityModifiers(text) {
  return String(text ?? "").split(",").map((part) => part.trim()).filter(Boolean).map((part) => {
    const m = /^([A-Za-z]{3})\s*([+-]\d+)$/.exec(part);
    if (!m) throw new Error(`Bad ability modifier "${part}"`);
    const key = ATTRIBUTES[m[1].toLowerCase()];
    if (!key) throw new Error(`Bad attribute "${m[1]}"`);
    return { key, value: Number(m[2]) };
  });
}

function effectBase(id, name, { description = "", img = "icons/svg/upgrade.svg", changes = [], flags = {} } = {}) {
  return {
    _id: id,
    name,
    img,
    transfer: true,
    disabled: false,
    changes,
    flags: { [SYSTEM_ID]: { featPassive: true, ...flags } },
    type: "base",
    system: {},
    origin: null,
    duration: {},
    statuses: [],
    description,
    tint: "#ffffff",
    _stats: { ...STATS }
  };
}

/** An effect that only carries a note (no changes) — flagged featNote as the core packs do. */
export function noteEffect(ownerId, name, description) {
  const e = effectBase(stableId(`${ownerId}:${name}`), name, { description, img: "icons/svg/book.svg" });
  e.flags[SYSTEM_ID] = { featNote: true };
  return e;
}

/** Ability modifiers as a racial-slot ADD effect, exactly as the core races carry them. */
export function abilityModifierEffect(ownerId, ownerName, text) {
  const mods = parseAbilityModifiers(text);
  return effectBase(stableId(`${ownerId}:ability`), `${ownerName}: ability modifiers`, {
    description: text,
    changes: mods.map(({ key, value }) => ({
      key: `system.attributes.${key}.racial`, mode: 2, value: String(value), priority: 20
    }))
  });
}

export function sizeSpeedEffect(ownerId, ownerName, size, speed) {
  return effectBase(stableId(`${ownerId}:size`), `${ownerName}: size and speed`, {
    description: `${size[0].toUpperCase()}${size.slice(1)} size and a base land speed of ${speed} feet.`,
    changes: [
      { key: "system.identity.size", mode: 5, value: size, priority: 10 },
      { key: "system.combat.movement.land", mode: 5, value: String(speed), priority: 10 }
    ]
  });
}

/**
 * A passive effect whose whole job is a DECLARATION the system reads
 * (3.625.0): a healing rider, a spell-damage rider, a strike rider, a
 * magical-attacks declaration, a Power Recovery extra, an Aid boost, a
 * refocus companion. No changes; the flag is the rule.
 */
export function declaredEffect(name, description, flags) {
  return (ownerId, ownerName) => changesEffect(ownerId, `${ownerName}: ${name}`, [], description, flags);
}

/** A generic changes effect. */
export function changesEffect(ownerId, name, changes, description = "", flags = {}) {
  return effectBase(stableId(`${ownerId}:${name}`), name, { description, changes, flags });
}

/** Racial skill bonus: `system.skills.<key>.racial` ADD, as the core heritages do. */
export function racialSkillEffect(ownerId, ownerName, skills, value = 1) {
  const list = Array.isArray(skills) ? skills : [skills];
  return changesEffect(ownerId, `${ownerName}: skill bonuses`,
    list.map((s) => ({ key: `system.skills.${skillKey(s)}.racial`, mode: 2, value: String(value), priority: 20 })),
    `+${value} racial bonus to ${list.join(" and ")} checks.`);
}

/** Background skill bonus: `system.skills.<key>.class` CUSTOM, as the core backgrounds do. */
export function classSkillEffect(ownerId, ownerName, skills, value = 1) {
  const list = Array.isArray(skills) ? skills : [skills];
  return changesEffect(ownerId, `${ownerName}: skill bonuses`,
    list.map((s) => ({ key: `system.skills.${skillKey(s)}.class`, mode: 0, value: String(value), priority: 20 })),
    `+${value} class bonus to ${list.join(", ")}.`);
}

export function resistanceEffect(ownerId, ownerName, type) {
  return changesEffect(ownerId, `${ownerName}: resistances`,
    [{ key: "system.combat.resistances", mode: 2, value: `, ${type}`, priority: 20 }],
    `Resistance to ${type}.`);
}

/** The book's words for a bonus type, as TRG Prime keys them. */
const BONUS_TYPE_ALIASES = Object.freeze({ racial: "race" });

/** Conditionals live in flags on the item — see TRG Prime's conditionals.mjs. */
export function conditional({ kind, value, valueFrom, sign, type, label, scope, auto = false, when, oneShot }) {
  const c = { kind, label, scope, auto, when };
  if (kind === "modifier") {
    if (valueFrom) { c.valueFrom = valueFrom; if (sign === -1) c.sign = -1; } else c.value = value;
    // THE CORE'S KEY IS "race" (dice/resolution.mjs BONUS_TYPES). The book
    // says "racial bonus", and every Pillars conditional written that way —
    // eighteen racial feats, the nine Chapter 9 rows — reached TRG Prime as a
    // type it does not know: shown and stacked as Untyped. Found live on
    // 7 October 2026 (0.9.1); mapped here so no builder can write it again.
    c.type = BONUS_TYPE_ALIASES[type] ?? type;
  }
  if (oneShot) c.oneShot = true;
  return c;
}

function feature({ id, name, type, category, description, img, system = {}, effects = [], flags = {} }) {
  return {
    _id: id,
    name,
    img,
    type,
    system: {
      source: SOURCE,
      category,
      tier: "",
      level: 0,
      prerequisites: "",
      active: true,
      description,
      ...system
    },
    effects,
    folder: null,
    sort: 0,
    ownership: { default: 0 },
    flags: Object.keys(flags).length ? { [SYSTEM_ID]: flags } : {},
    _stats: { ...STATS }
  };
}

export function race({ name, description, abilityModifiers, size = "medium", speed = 25, coreLanguages, additionalLanguages = "common, regional", languageChoices = "", specialistSkills = "", racialAbilities = "", grantedFeats = "", grantedSpells = "", flags = {}, extraEffects = [] }) {
  const id = stableId(`races:${name}`);
  return feature({
    id, name, type: "race", category: "Race", description,
    img: "icons/svg/mystery-man.svg",
    system: {
      abilityModifiers,
      maximumSize: "",
      languages: `Core: ${coreLanguages}. Additional: ${additionalLanguages}.`,
      coreLanguages,
      additionalLanguages,
      languageChoices,
      grantedFeats,
      racialAbilities,
      grantedWeapons: "",
      grantedSpells,
      specialistSkills
    },
    effects: [
      abilityModifierEffect(id, name, abilityModifiers),
      sizeSpeedEffect(id, name, size, speed),
      ...extraEffects.map((fn) => fn(id, name))
    ],
    flags
  });
}

export function heritage({ name, sourceRace, description, abilityModifiers = "", racialAbilities = "", removedAbilities = "", grantedFeats = "", grantedSpells = "", specialistSkills = "", languageChoices = "", flags = {}, effects = [] }) {
  const id = stableId(`heritages:${name}`);
  const built = [];
  if (abilityModifiers) {
    const e = abilityModifierEffect(id, name, abilityModifiers);
    e.name = `${name}: racial adjustments`;
    built.push(e);
  }
  for (const fn of effects) built.push(fn(id, name));
  return feature({
    id, name, type: "heritage", category: "Heritage", description,
    img: "icons/svg/mystery-man.svg",
    system: {
      sourceRace,
      abilityModifiers,
      grantedFeats,
      grantedSpells,
      racialAbilities,
      removedAbilities,
      loyalties: "",
      specialistSkills,
      coreLanguages: "",
      additionalLanguages: "",
      languageChoices
    },
    effects: built,
    flags
  });
}

export function background({ name, description, grantedFeats, skillBonuses, specialistSkill, special = "", wealth = "1" }) {
  const id = stableId(`backgrounds:${name}`);
  const skills = skillBonuses.split(",").map((s) => s.trim());
  return feature({
    id, name, type: "background", category: "Background", description,
    img: "icons/svg/book.svg",
    system: {
      grantedFeats,
      grantedSpells: "",
      skillBonuses,
      specialistSkill,
      special,
      coreLanguages: "",
      additionalLanguages: "",
      languageChoices: "",
      wealth
    },
    effects: [classSkillEffect(id, name, skills)],
    flags: { grantedSpecialistSkills: specialistSkill }
  });
}

export function ability({ name, description, sourceRace = "", traits = "", usesPerDay = "", flags = {}, effects = [], img = "icons/svg/aura.svg" }) {
  const id = stableId(`abilities:${name}`);
  return feature({
    id, name, type: "ability", category: "Racial", description, img,
    // A tracked item ARRIVES FULL. Live test 17 Sep 2026: a granted Focus
    // ability with usesValue 0 read as spent until the next Daily
    // Preparation, and its Use refused. (The core per-day feats ship at 0
    // too — flagged for Graham; here the pack simply says what is true.)
    system: { usesPerDay, bonusUses: 0, usesValue: initialUses(usesPerDay), sourceRace, sourceClass: "", traits },
    effects: effects.map((fn) => fn(id, name)),
    flags
  });
}

export function feat({ name, description, category = "General", prerequisites = "", traits = "", usesPerDay = "", sourceRace = "", sourceClass = "", sourceArchetype = "", grantedSpells = "", grantedAbilities = "", grantedFeats = "", repeatable = false, flags = {}, effects = [], img = "icons/svg/upgrade.svg" }) {
  const id = stableId(`feats:${name}`);
  return feature({
    id, name, type: "feat", category, description, img,
    system: {
      prerequisites,
      usesPerDay, bonusUses: 0, usesValue: initialUses(usesPerDay),
      sourceRace, sourceClass, sourceArchetype,
      traits,
      repeatable,
      repeatLimit: 0,
      grantedSpells, grantedAbilities, grantedFeats
    },
    effects: effects.map((fn) => fn(id, name)),
    flags
  });
}

/**
 * A CLASS in the shape TRG Prime's classes pack uses (Chapter 3).
 *
 * `progression` is the printed twenty-row table, one object per level in
 * the exact field names class-progression.mjs reads. `abilityLevels` is
 * the same "name → level" map the core classes carry in their flags,
 * derived from `classAbilities` so the two can never disagree.
 */
export function classItem({ name, classType, description, keyAbilityScores, classSkills, proficiencies, hitPoints, skillPoints, grantedFeats = "", classAbilities = "", grantedGear = "", grantedSpells = "", magicalTradition = "", magicalAbility = "", casterStyle = "", memorisationStyle = "", repertoireCategory = "", cantripsPerDay = 0, cantripsKnown = 0, spellBookFirstPicks = 0, wealth = "1", table, flags = {}, effects = [], img = "icons/svg/book.svg" }) {
  const id = stableId(`classes:${name}`);
  if (!Array.isArray(table) || table.length !== 20) throw new Error(`${name}: a class table has twenty rows`);
  const progression = table.map((row, i) => {
    const [bab, bdb, fortitude, reflex, will, bonusFeats, casterLevel, pp, bsb] = row;
    return { level: i + 1, bab, bdb, fortitude, reflex, will, bonusFeats, casterLevel, pp, bsb };
  });
  const abilityLevels = {};
  for (const entry of String(classAbilities).split(",").map((e) => e.trim()).filter(Boolean)) {
    const at = entry.indexOf(":");
    abilityLevels[entry.slice(at + 1).trim()] = Number(entry.slice(0, at));
  }
  return feature({
    id, name, type: "class", category: "", description, img,
    system: {
      tier: classType,
      classType,
      keyAbilityScores,
      classSkills,
      grantedFeats,
      classAbilities,
      proficiencies,
      hitPoints,
      skillPoints,
      magicalTradition,
      magicalAbility,
      casterStyle,
      repertoireCategory,
      memorisationStyle,
      cantripsPerDay,
      spellBookFirstPicks,
      grantedGear,
      grantedSpells,
      progression,
      cantripsKnown,
      wealth
    },
    effects: effects.map((fn) => fn(id, name)),
    flags: { abilityLevels, ...flags }
  });
}

/**
 * A CLASS ABILITY: the same `ability` type a racial ability is, with
 * `sourceClass` and the `classAbility {class, level}` flag the core class
 * abilities carry, so a grant can tell two same-named ones apart and the
 * sheet files it under its class.
 */
export function classAbility({ name, sourceClass, level = 1, description, traits = "", usesPerDay = "", grantedSpells = "", grantedAbilities = "", grantedFeats = "", flags = {}, effects = [], img = "icons/svg/book.svg" }) {
  const id = stableId(`abilities:${sourceClass}:${name}`);
  return feature({
    id, name, type: "ability", category: "Class", description, img,
    system: {
      level,
      prerequisites: `${sourceClass} ${ordinal(level)} level`,
      usesPerDay, bonusUses: 0, usesValue: initialUses(usesPerDay),
      sourceRace: "", sourceClass, traits,
      grantedSpells, grantedAbilities, grantedFeats
    },
    effects: effects.map((fn) => fn(id, name)),
    flags: { classAbility: { class: sourceClass, level }, ...flags }
  });
}

function ordinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

/** A gear item — the shape the core gear pack holds (the Wizard's Spellbook is the model). */
export function gear({ name, description, price = 0, weight = 1, traits = "", flags = {}, system = {}, img = "icons/svg/book.svg" }) {
  const id = stableId(`gear:${name}`);
  return {
    _id: id,
    name,
    img,
    type: "gear",
    system: {
      quantity: 1, weight, price, equipped: false, invested: false,
      hp: { value: 0, max: 0 },
      traits,
      description,
      slot: "",
      uses: { value: 0, max: 0 },
      itemSize: "T",
      itemLevel: 1,
      heldHands: 0,
      formulae: "",
      gearCategory: "Goods",
      gearCategoryInferred: true,
      ...system
    },
    effects: [],
    folder: null,
    sort: 0,
    ownership: { default: 0 },
    flags: Object.keys(flags).length ? { [SYSTEM_ID]: flags } : {},
    _stats: { ...STATS }
  };
}

/** A spell in the shape TRG Prime's spells pack uses. */
export function spell({ name, description, tradition, category = "utility", ppCost = 0, castAP = 1, range = "", area = "", targets = "", duration = "", defence = "", traits = "", effects = [], components = { somatic: false, verbal: true, material: false, focus: false }, innate = false, usesPerDay = "", flags = {}, img = "icons/svg/holy-symbol.svg" }) {
  const id = stableId(`spells:${name}`);
  return {
    _id: id,
    name,
    img,
    type: "spell",
    system: {
      tradition,
      category,
      level: 0,
      ppCost,
      castAP,
      range,
      area,
      targets,
      duration,
      defence,
      baseDamage: "",
      damage: { formula: "", type: "", persistent: "" },
      casterLevelMods: [],
      effects,
      warps: [],
      apOptions: [],
      prepared: false,
      sustained: false,
      sustainType: "",
      areaTargeting: "all",
      specialist: false,
      specialistClass: "",
      innate,
      usesPerDay,
      bonusUses: 0,
      usesValue: initialUses(usesPerDay),
      components,
      traits,
      description
    },
    effects: [],
    folder: null,
    sort: 0,
    ownership: { default: 0 },
    flags: Object.keys(flags).length ? { [SYSTEM_ID]: flags } : {},
    _stats: { ...STATS }
  };
}

/** A flat per-day count starts full; anything else starts at 0 as the core packs do. */
export function initialUses(usesPerDay) {
  const n = Number(String(usesPerDay ?? "").trim());
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Plain text → the minimal HTML the sheets render. */
export function html(text) {
  return String(text ?? "")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
    .join("\n");
}
