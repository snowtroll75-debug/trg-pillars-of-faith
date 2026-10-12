/**
 * Chapter 5 feats — the shared builder.
 *
 * Every feat's text comes from feat-text.json (extracted from the book
 * by heading: the trait line, the Prerequisites line and the body), so
 * a feat's description is the printed entry plus one sentence saying
 * what the sheet does with it. What each feat DOES is authored beside
 * its heading in feats-racial/-archetype/-class/-general.mjs, in the
 * same vocabulary the Chapter 2 and 3 content used: effects on typed
 * pool slots, conditionals, grants, specialist skills, a Use automation
 * or a passive hint.
 *
 * THE TRAIT LINE IS READ, NOT RETYPED. "AUDITORY DIVINITY ESHARI FOCUS"
 * gives the traits (Auditory, Divinity, Focus) and the race (Eshari);
 * "FLOURISH FOLKWARDEN" the traits (Flourish) and the class trait
 * (Folkwarden). The lists of race and class names below are what tells
 * one from the other; everything else on the line is a trait.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { feat, html, conditional } from "./builders.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const FEAT_TEXT = JSON.parse(fs.readFileSync(path.join(HERE, "feat-text.json"), "utf8"));

/** Words on a trait line that name a RACE (or a heritage-trait that works as one for the picker). */
const RACE_WORDS = {
  eshari: "Eshari", kethrani: "Kethrani", myrathi: "Myrathi", rhevani: "Rhevani",
  dwarf: "Dwarf", human: "Human", orc: "Orc", gnome: "Gnome", halfling: "Halfling", elf: "Elf",
  ascendan: "Ascendan", kornargon: "Kornargon",
  // Vesperyn and Morrowmade are heritage FEATS whose sub-feats are open
  // to anyone who owns them — effectiveRaces pushes an owned Heritage
  // feat's name into the race list, so the sub-feats tag it as a race.
  vesperyn: "Vesperyn", morrowmade: "Morrowmade"
};
/** Words on a trait line that name a CLASS (a class-feat or archetype gate). */
const CLASS_WORDS = ["archivist", "folkwarden", "grimward", "healer", "shaman", "bard", "cleric", "crusader", "druid", "fighter", "ranger", "rogue", "wizard"];

function titleCase(word) {
  return word.split("-").map((w) => w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w).join("-");
}

/** Split "AUDITORY DIVINITY ESHARI FOCUS" into {traits, race, classes}. */
export function parseTraitLine(line) {
  const traits = [];
  const races = [];
  const classes = [];
  for (const raw of String(line ?? "").split(/\s+/).filter(Boolean)) {
    const w = raw.toLowerCase();
    if (RACE_WORDS[w]) races.push(RACE_WORDS[w]);
    else if (CLASS_WORDS.includes(w)) classes.push(titleCase(w));
    else traits.push(titleCase(w));
  }
  return { traits, races, classes };
}

/** The "Progression Requirements ..." line, pulled out of a body. */
function splitProgression(body) {
  const lines = String(body ?? "").split("\n");
  const at = lines.findIndex((l) => /^Progression Requirements\b/.test(l.trim()));
  if (at < 0) return { body, progression: "" };
  const progression = lines[at].replace(/^Progression Requirements\s*/, "").replace(/\.$/, "").trim();
  return { body: [...lines.slice(0, at), ...lines.slice(at + 1)].join("\n"), progression };
}

/**
 * A feat from its book heading.
 *
 * @param {"racial"|"archetype"|"class"|"general"} cat
 * @param {string} heading Exactly as printed, upper case.
 * @param {object} spec
 * @param {string} [spec.sheet] One sentence on what the sheet does — appended to the description.
 * @param {string} [spec.usesPerDay]
 * @param {string} [spec.grantedSpells] etc. — passed through to the feat builder.
 * @param {object} [spec.flags] `flags.trg-prime` entries (conditionals, grantInnate, specialistChoice...).
 * @param {Array<function>} [spec.effects] (id, name) => effect.
 * @param {string} [spec.sourceRace] Overrides the trait line's race (an Eternal Blood follow-up has none).
 * @param {string} [spec.traits] Overrides the parsed traits.
 */
export function bookFeat(cat, heading, spec = {}) {
  const entry = FEAT_TEXT[cat]?.[heading];
  if (!entry) throw new Error(`No ${cat} feat "${heading}" in feat-text.json`);
  const parsed = parseTraitLine(entry.traits);
  const { body, progression } = splitProgression(entry.body);
  const name = spec.name ?? heading.split(" ").map((w) => w === "OF" || w === "THE" || w === "AT" || w === "FOR" || w === "A" || w === "IN" || w === "FROM" || w === "WITHOUT" || w === "ONE" ? w.toLowerCase() : titleCase(w)).join(" ").replace(/^the /i, "The ").replace(/^a /i, "A ").replace(/, one /, ", One ").replace(/Many Roads, Many Gods/, "Many Roads, Many Gods");
  const category = { racial: "Racial", archetype: "Archetype", class: "Class", general: "General" }[cat];
  // Class feats and archetypes gate on their class traits; racial feats on sourceRace.
  const traits = spec.traits ?? [...parsed.traits, ...(cat !== "racial" ? parsed.classes : [])].join(", ");
  const sourceRace = spec.sourceRace ?? (cat === "racial" ? parsed.races.join(", ") : "");
  const prerequisites = spec.prerequisites ?? entry.prerequisites;
  const text = [
    entry.traits ? entry.traits : "",
    body,
    prerequisites ? `Prerequisites ${prerequisites}` : "",
    progression ? `Progression Requirements ${progression}` : "",
    spec.sheet ?? ""
  ].filter(Boolean).join("\n\n");
  const built = feat({
    name,
    category,
    prerequisites,
    traits,
    sourceRace,
    sourceClass: spec.sourceClass ?? "",
    sourceArchetype: spec.sourceArchetype ?? "",
    usesPerDay: spec.usesPerDay ?? "",
    grantedSpells: spec.grantedSpells ?? "",
    grantedAbilities: spec.grantedAbilities ?? "",
    grantedFeats: spec.grantedFeats ?? "",
    repeatable: Boolean(spec.repeatable),
    description: html(text),
    flags: spec.flags ?? {},
    effects: spec.effects ?? []
  });
  if (progression) built.system.progressionRequirements = progression;
  if (spec.grantedWeapons) built.system.grantedWeapons = spec.grantedWeapons;
  if (spec.repeatLimit) built.system.repeatLimit = spec.repeatLimit;
  built.flags["trg-prime"] = { ...(built.flags["trg-prime"] ?? {}), bookCategory: cat };
  return built;
}

/* ------------------------------------------------------------------ */
/* Shared shapes                                                        */
/* ------------------------------------------------------------------ */

/** A save bonus pre-ticked on matching traits, offered on the rest. */
export function saveBonus(label, value, type, traits, scope) {
  return [
    conditional({ kind: "modifier", value, type, label, scope, auto: true, when: { checkTypes: ["save"], traits } }),
    conditional({ kind: "modifier", value, type, label, scope, auto: false, when: { checkTypes: ["save"], not: { traits } } })
  ];
}

/** Advantage on saves, pre-ticked on matching traits, offered on the rest. */
export function saveAdvantage(label, traits, scope) {
  return [
    conditional({ kind: "advantage", label, scope, auto: true, when: { checkTypes: ["save"], traits } }),
    conditional({ kind: "advantage", label, scope, auto: false, when: { checkTypes: ["save"], not: { traits } } })
  ];
}

/** A bonus pre-ticked on named actions. */
export function actionBonus(label, value, type, actions, scope, extra = {}) {
  return conditional({ kind: "modifier", value, type, label, scope, auto: true, when: { checkTypes: ["skill"], actions, ...extra } });
}

/** A bonus offered (unticked) on named actions or skills. */
export function offeredBonus(label, value, type, when, scope) {
  return conditional({ kind: "modifier", value, type, label, scope, auto: false, when });
}

/** Plain effect change helpers on typed pool slots. */
export const CHANGE = {
  baseDR: (n) => ({ key: "system.combat.naturalArmourBase.natural", mode: 2, value: String(n), priority: 20 }),
  speed: (n) => ({ key: "system.combat.movement.land.other", mode: 2, value: String(n), priority: 20 }),
  resistance: (type) => ({ key: "system.combat.resistances", mode: 2, value: `, ${type}`, priority: 20 }),
  immunity: (what) => ({ key: "system.combat.immunities", mode: 2, value: `, ${what}`, priority: 20 }),
  trait: (t) => ({ key: "system.details.traits", mode: 2, value: `, ${t}`, priority: 20 }),
  save: (save, slot, n) => ({ key: `system.combat.saves.${save}.${slot}`, mode: 2, value: String(n), priority: 20 }),
  skill: (key, slot, n) => ({ key: `system.skills.${key}.${slot}`, mode: 2, value: String(n), priority: 20 }),
  defence: (slot, n) => ({ key: `system.combat.defence.${slot}`, mode: 2, value: String(n), priority: 20 }),
  initiative: (slot, n) => ({ key: `system.combat.initiative.${slot}`, mode: 2, value: String(n), priority: 20 })
};

/** A sense derived on the senses list (creatureAbility shape the races use). */
export function senseFlag(name, feet, finds, source) {
  return {
    creatureAbility: {
      printedTraits: "", printedAction: "", printedArea: "",
      derives: { sense: { category: "tertiary", modality: name === "Blood Sense" ? "olfactory" : "spiritual", fixedFeet: feet, name, finds } },
      source
    }
  };
}
