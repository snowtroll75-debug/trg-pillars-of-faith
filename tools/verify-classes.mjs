#!/usr/bin/env node
/**
 * verify-classes — Pillars of Faith, Chapter 3 (the five classes),
 * checked against the book and against the system that will read them.
 *
 *   node tools/verify-classes.mjs
 *
 * SECTIONS
 *   A  Transcription: the five class tables are the book's. Two copies
 *      that have to agree — class-tables.json (extracted from the text)
 *      against the arithmetic every column follows and against a
 *      hand-typed first and last row for each class; the class lines
 *      (skills, HP, SP, key scores, proficiencies) against a table typed
 *      here from the book.
 *   B  Shape: every class item field the system reads is present and in
 *      the core shape; every class ability the class names exists with
 *      the right sourceClass and level; every chooser's options exist;
 *      every discipline carries its lore skill; conditionals normalise
 *      under the system's own validator; grants parse as levelled lists.
 *   C  Resolution: named feats, spells, gear and weapons exist in the
 *      system (or are declared as arriving with the Grimoire block);
 *      skill-action keys the conditionals, substitutions and upgrades
 *      name exist; the system machinery this block leans on is present.
 *   D  Registration and automation: what registration.mjs hands the
 *      system for the classes; every ability has a Use or a hint.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SYSTEM_ROOT = process.env.TRG_PRIME_ROOT ?? path.resolve(ROOT, "..", "..", "sys", "trg-prime");

let checks = 0;
const failures = [];
function ok(label, condition, detail = "") {
  checks += 1;
  if (!condition) failures.push(`${label}${detail ? ` — ${detail}` : ""}`);
}
function equal(label, actual, expected) {
  ok(label, JSON.stringify(actual) === JSON.stringify(expected), `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

const { CLASSES, CLASS_ABILITIES, CLASS_GEAR, TABLES } = await import("./content/classes.mjs");
const { registerContent, CLASS_REGISTRATIONS, SKILL_SUBSTITUTIONS, DEGREE_UPGRADES } = await import("../module/registration.mjs");
const { CLASS_AUTOMATIONS, CLASS_PASSIVE_HINTS, spiritCommunionAllowance } = await import("../module/class-automations.mjs");
const { GRIMOIRE_AUTOMATIONS } = await import("../module/grimoire-automations.mjs");
const { SKILL_ACTIONS: POF_ACTIONS } = await import("../module/skill-actions.mjs");
const byName = (list) => Object.fromEntries(list.map((d) => [d.name, d]));
const classes = byName(CLASSES);
const abilities = CLASS_ABILITIES;
const split = (s) => String(s ?? "").split(",").map((x) => x.trim()).filter(Boolean);
const levelled = (s) => split(s).map((e) => { const at = e.indexOf(":"); return at < 0 ? { level: 1, name: e } : { level: Number(e.slice(0, at)), name: e.slice(at + 1).trim() }; });

/* ------------------------------------------------------------------ *
 * A. Transcription
 * ------------------------------------------------------------------ */

// Typed from the book's five tables: the 1st and 20th rows, and the column
// arithmetic each table follows (checked on all twenty rows).
const BOOK_TABLES = {
  Archivist:  { first: [0, 0, 0, 0, 6, 0, 1, 4, 1],  last: [10, 10, 19, 19, 25, 4, 20, 80, 20], bab: (L) => Math.floor(L / 2),      fort: (L) => L - 1, ref: (L) => L - 1, will: (L) => L + 5, feats: (L) => Math.floor(L / 5),     cl: (L) => L,                              pp: (L) => 4 * L, bsb: (L) => L },
  Folkwarden: { first: [0, 0, 6, 0, 3, 0, 1, 2, 1],  last: [15, 15, 25, 19, 22, 4, 15, 40, 15], bab: (L) => Math.floor(3 * L / 4),  fort: (L) => L + 5, ref: (L) => L - 1, will: (L) => L + 2, feats: (L) => Math.floor(L / 5),     cl: (L) => Math.max(1, Math.floor(3 * L / 4)), pp: (L) => 2 * L, bsb: (L) => Math.max(1, Math.floor(3 * L / 4)) },
  Grimward:   { first: [0, 0, 3, 3, 6, 1, 1, 2, 0],  last: [15, 15, 22, 22, 25, 6, 15, 40, 15], bab: (L) => Math.floor(3 * L / 4),  fort: (L) => L + 2, ref: (L) => L + 2, will: (L) => L + 5, feats: (L) => 1 + Math.floor(L / 4), cl: (L) => Math.max(1, Math.floor(3 * L / 4)), pp: (L) => 2 * L, bsb: (L) => Math.floor(3 * L / 4) },
  Healer:     { first: [0, 0, 3, 0, 6, 0, 1, 4, 1],  last: [10, 10, 22, 19, 25, 4, 20, 80, 20], bab: (L) => Math.floor(L / 2),      fort: (L) => L + 2, ref: (L) => L - 1, will: (L) => L + 5, feats: (L) => Math.floor(L / 5),     cl: (L) => L,                              pp: (L) => 4 * L, bsb: (L) => L },
  Shaman:     { first: [0, 0, 3, 3, 3, 0, 1, 4, 1],  last: [15, 15, 22, 22, 22, 4, 20, 80, 20], bab: (L) => Math.floor(3 * L / 4),  fort: (L) => L + 2, ref: (L) => L + 2, will: (L) => L + 2, feats: (L) => Math.floor(L / 5),     cl: (L) => L,                              pp: (L) => 4 * L, bsb: (L) => L }
};

for (const [name, book] of Object.entries(BOOK_TABLES)) {
  const table = TABLES[name];
  ok(`A ${name} table has twenty rows of nine`, Array.isArray(table) && table.length === 20 && table.every((r) => r.length === 9));
  equal(`A ${name} 1st row is the book's`, table[0], book.first);
  equal(`A ${name} 20th row is the book's`, table[19], book.last);
  const cols = ["bab", "bdb", "fort", "ref", "will", "feats", "cl", "pp", "bsb"];
  for (let L = 1; L <= 20; L += 1) {
    const expect = [book.bab(L), book.bab(L), book.fort(L), book.ref(L), book.will(L), book.feats(L), book.cl(L), book.pp(L), book.bsb(L)];
    equal(`A ${name} level ${L} follows the printed arithmetic (${cols.join("/")})`, table[L - 1], expect);
  }
  const item = classes[name];
  equal(`A ${name} item's progression is the table`, item.system.progression.map((r) => [r.bab, r.bdb, r.fortitude, r.reflex, r.will, r.bonusFeats, r.casterLevel, r.pp, r.bsb]), table);
  ok(`A ${name} progression levels are 1..20`, item.system.progression.every((r, i) => r.level === i + 1));
}

// The class lines, typed from the book.
const BOOK_CLASSES = {
  Archivist:  { type: "Adept", key: "Intelligence (min +2), Wisdom, Dexterity", hp: 4, sp: 4, skills: "Artistry, Culture, Linguistics, Medicine, Meditation, Mental Focus, Occultism, Planes, Power Manipulation, Religion, Sense Motive", tradition: "divinity", ability: "intelligence", style: "learned", memo: "book", cantripsPerDay: 4, cantripsKnown: 0, firstPicks: 6, wealth: "1", feats: ["Heighten Spell", "Scribe Scroll", "Spell Substitution"], abilities: 5 },
  Folkwarden: { type: "Adept/Expert", key: "Constitution (min +2), Wisdom, Intelligence", hp: 6, sp: 8, skills: "Artistry, Culture, Crafting, Diplomacy, Handle Animal, Linguistics, Medicine, Meditation, Mental Focus, Nature, Occultism, Perception, Power Manipulation, Religion, Sense Motive, Survival", tradition: "verdant", ability: "constitution", style: "instinctive", memo: "", cantripsPerDay: 0, cantripsKnown: 2, firstPicks: 0, wealth: "0", feats: ["Heighten Spell", "Alchemist"], abilities: 12 },
  Grimward:   { type: "Expert/Adept", key: "Wisdom (min +2), Intelligence, Charisma", hp: 8, sp: 6, skills: "Athletics, Culture, Deception, Diplomacy, Intimidate, Linguistics, Medicine, Mental Focus, Occultism, Perception, Religion, Sense Motive, Stealth, Survival", tradition: "divinity", ability: "wisdom", style: "instinctive", memo: "", cantripsPerDay: 0, cantripsKnown: 0, firstPicks: 0, wealth: "1", feats: [], abilities: 8 },
  Healer:     { type: "Adept", key: "Wisdom (min +2), Charisma, Constitution", hp: 6, sp: 6, skills: "Culture, Diplomacy, Linguistics, Medicine, Meditation, Mental Focus, Nature, Perception, Power Manipulation, Religion, Sense Motive", tradition: "divinity", ability: "wisdom", style: "instinctive", memo: "", cantripsPerDay: 0, cantripsKnown: 2, firstPicks: 0, wealth: "1", feats: [], abilities: 6 },
  Shaman:     { type: "Adept", key: "Constitution (min +2), Wisdom, Charisma", hp: 6, sp: 6, skills: "Artistry, Culture, Diplomacy, Handle Animal, Linguistics, Medicine, Meditation, Mental Focus, Nature, Occultism, Perception, Power Manipulation, Religion, Sense Motive, Survival", tradition: "verdant", ability: "constitution", style: "instinctive", memo: "", cantripsPerDay: 0, cantripsKnown: 3, firstPicks: 0, wealth: "-1", feats: ["Heighten Spell"], abilities: 8 }
};
for (const [name, b] of Object.entries(BOOK_CLASSES)) {
  const c = classes[name];
  ok(`A ${name} exists`, Boolean(c));
  if (!c) continue;
  equal(`A ${name} class type`, c.system.classType, b.type);
  equal(`A ${name} tier mirrors class type (core shape)`, c.system.tier, b.type);
  equal(`A ${name} key ability scores`, c.system.keyAbilityScores, b.key);
  equal(`A ${name} HP per level`, c.system.hitPoints, b.hp);
  equal(`A ${name} skill points per level`, c.system.skillPoints, b.sp);
  equal(`A ${name} class skills`, c.system.classSkills, b.skills);
  equal(`A ${name} tradition`, c.system.magicalTradition, b.tradition);
  equal(`A ${name} magical ability`, c.system.magicalAbility, b.ability);
  equal(`A ${name} caster style`, c.system.casterStyle, b.style);
  equal(`A ${name} memorisation style`, c.system.memorisationStyle, b.memo);
  equal(`A ${name} cantrips per day`, c.system.cantripsPerDay, b.cantripsPerDay);
  equal(`A ${name} cantrips known`, c.system.cantripsKnown, b.cantripsKnown);
  equal(`A ${name} spell book first picks`, c.system.spellBookFirstPicks, b.firstPicks);
  equal(`A ${name} Chapter 6 class wealth`, c.system.wealth, b.wealth);
  equal(`A ${name} granted feats`, levelled(c.system.grantedFeats).map((e) => e.name), b.feats);
  ok(`A ${name} granted feats all arrive at 1st`, levelled(c.system.grantedFeats).every((e) => e.level === 1));
  equal(`A ${name} names ${b.abilities} class abilities`, levelled(c.system.classAbilities).length, b.abilities);
}
// The three "+1 Control Level per level" classes carry the effect; the other two do not.
for (const name of ["Archivist", "Healer", "Shaman"]) {
  const e = classes[name].effects.find((x) => x.changes.some((ch) => ch.key === "system.magic.controlBonusPerLevel"));
  ok(`A ${name} adds +1 Control Level per level`, e && e.changes[0].mode === 2 && e.changes[0].value === "1");
}
for (const name of ["Folkwarden", "Grimward"]) ok(`A ${name} adds no Control Level bonus`, !classes[name].effects.some((x) => x.changes.some((ch) => /controlBonus/.test(ch.key))));
// Repertoire schedules, as printed.
equal("A Grimward repertoire: one pick a level from 2nd, core swaps", classes.Grimward.flags["trg-prime"].repertoire, { pickStep: 1, pickFrom: 2 });
equal("A Healer repertoire: one pick a level from 2nd, one swap a level from 5th", classes.Healer.flags["trg-prime"].repertoire, { pickStep: 1, pickFrom: 2, swapStep: 1, swapFrom: 5 });
equal("A Shaman repertoire: as the Healer's", classes.Shaman.flags["trg-prime"].repertoire, { pickStep: 1, pickFrom: 2, swapStep: 1, swapFrom: 5 });
ok("A Folkwarden repertoire is the core schedule (no flag)", !classes.Folkwarden.flags["trg-prime"].repertoire);
ok("A Archivist has no repertoire (a book caster) and grants the Prayer Book", !classes.Archivist.flags["trg-prime"].repertoire && classes.Archivist.system.grantedGear === "Prayer Book");
equal("A Healer's granted spells: Cure, Restoration, Stabilise, Touch of Healing at 1st", levelled(classes.Healer.system.grantedSpells), [{ level: 1, name: "Cure" }, { level: 1, name: "Restoration" }, { level: 1, name: "Stabilise" }, { level: 1, name: "Touch of Healing" }]);
ok("A only the Healer grants spells from the class itself", CLASSES.filter((c) => c.system.grantedSpells).map((c) => c.name).join() === "Healer");
equal("A the Spirit Communion allowance is the printed ladder", [1, 5, 6, 11, 12, 17, 18, 20].map(spiritCommunionAllowance), [
  { count: 1, maxPP: 2 }, { count: 1, maxPP: 2 }, { count: 2, maxPP: 4 }, { count: 2, maxPP: 4 }, { count: 3, maxPP: 10 }, { count: 3, maxPP: 10 }, { count: 4, maxPP: 14 }, { count: 4, maxPP: 14 }
]);

// The sub-choices, typed from the book: five each, with their specialist skills.
const BOOK_CHOICES = {
  "Archival Discipline":      { Canonist: "Canon Lore", Apocryphist: "Heresy Lore", Eschatologist: "Soul Lore", Hagiographer: "Eternal Lore", Revelator: "Prophecy Lore" },
  "Folk Tradition":           { Charmwright: "Charm Lore", Gravetender: "Burial Lore", Hearthkeeper: "Hearth Lore", Herbal: "Herbalism Lore", "Omen Reader": "Omen Lore" },
  "Inquisitorial Discipline": { Exorcist: "Spirit Lore", "Grave Warden": "Burial Lore", Hexbreaker: "Curse Lore", "Relic Warden": "Relic Lore", Truthseeker: "Interrogation Lore" },
  "Healer's Calling":         { Chirurgeon: "Chirurgery", Lifebinder: "Vitality Lore", Purifier: "Affliction Lore", "Soul Tender": "Soul Lore", "Sanctuary Keeper": "Hospice Lore" },
  "Spirit Guide":             { "Ancestor Spirit": "Ancestor Lore", "Beast Spirit": "Animal Lore", "Elemental Spirit": "Elemental Lore", "Land Spirit": null, "Veil Spirit": "Veil Lore" }
};
const abilityByName = byName(abilities);
for (const [chooser, options] of Object.entries(BOOK_CHOICES)) {
  const item = abilityByName[chooser];
  ok(`A chooser "${chooser}" exists`, Boolean(item));
  equal(`A "${chooser}" offers the book's five`, item?.flags["trg-prime"]?.abilityChoices, Object.keys(options));
  for (const [option, lore] of Object.entries(options)) {
    const o = abilityByName[option];
    ok(`A option "${option}" exists as an ability of the same class`, o && o.system.sourceClass === item.system.sourceClass);
    if (lore) equal(`A "${option}" grants ${lore}`, o?.flags["trg-prime"]?.grantedSpecialistSkills, lore);
    else ok(`A "${option}" asks for its Terrain Lore (specialistChoice)`, Boolean(o?.flags["trg-prime"]?.specialistChoice));
  }
}
// The Archivist's ten specialist spells, typed from the book.
const BOOK_DISCIPLINE_SPELLS = { Canonist: "1: Doctrinal Ward, 7: Word of Censure", Apocryphist: "1: Hidden Doctrine, 7: Forbidden Name", Eschatologist: "1: Last Rite, 7: Anchor the Departing Soul", Hagiographer: "1: Exemplar's Grace, 7: Saintly Intercession", Revelator: "1: Read Omen, 7: Unfold the Future" };
for (const [d, s] of Object.entries(BOOK_DISCIPLINE_SPELLS)) equal(`A ${d} specialist spells`, abilityByName[d].system.grantedSpells, s);

/* ------------------------------------------------------------------ *
 * B. Shape
 * ------------------------------------------------------------------ */

const CORE_CLASS_FIELDS = ["classType", "keyAbilityScores", "classSkills", "grantedFeats", "classAbilities", "proficiencies", "hitPoints", "skillPoints", "magicalTradition", "magicalAbility", "casterStyle", "repertoireCategory", "memorisationStyle", "cantripsPerDay", "spellBookFirstPicks", "grantedGear", "grantedSpells", "progression", "cantripsKnown", "wealth", "source", "category", "tier", "level", "prerequisites", "active", "description"];
for (const c of CLASSES) {
  ok(`B ${c.name} is a class item with every core field`, c.type === "class" && CORE_CLASS_FIELDS.every((f) => f in c.system), CORE_CLASS_FIELDS.filter((f) => !(f in c.system)).join());
  const named = levelled(c.system.classAbilities);
  for (const { level, name } of named) {
    const a = abilityByName[name];
    ok(`B ${c.name} ability "${name}" exists as ${c.name}'s`, a && a.system.sourceClass === c.name && a.type === "ability" && a.system.category === "Class");
    equal(`B ${c.name} ability "${name}" prints level ${level}`, a?.system.level, level);
    equal(`B ${c.name} ability "${name}" classAbility flag agrees`, a?.flags["trg-prime"]?.classAbility, { class: c.name, level });
    ok(`B ${c.name} ability "${name}" prerequisite names the level`, a?.system.prerequisites === `${c.name} ${level}${["th", "st", "nd", "rd"][(level % 100 - 20) % 10] || ["th", "st", "nd", "rd"][level % 100] || "th"} level`);
  }
  equal(`B ${c.name} abilityLevels flag mirrors classAbilities`, c.flags["trg-prime"].abilityLevels, Object.fromEntries(named.map((e) => [e.name, e.level])));
  ok(`B ${c.name} has a magicalNote and bonusFeatsNote (core shape)`, typeof c.flags["trg-prime"].magicalNote === "string" && typeof c.flags["trg-prime"].bonusFeatsNote === "string");
  ok(`B ${c.name} description carries the book's DESCRIPTION`, c.system.description.length > 800);
}
ok("B every class ability belongs to one of the five classes", abilities.every((a) => classes[a.system.sourceClass]));
ok("B class ability names are unique", new Set(abilities.map((a) => a.name)).size === abilities.length);
equal("B sixty-four class abilities in all (0.5.0: the two PP 1 specialist-spell pickers)", abilities.length, 64);
ok("B every class ability has a description from the book", abilities.every((a) => a.system.description.length > 60));
ok("B Focus abilities track one use", abilities.filter((a) => /\bFocus\b/.test(a.system.traits)).every((a) => a.system.usesPerDay === "1" && a.system.usesValue === 1));
equal("B five Focus abilities: Recite, Healer's Touch, Lifeline, Manifest Spirit, Spirit Intercession", abilities.filter((a) => /\bFocus\b/.test(a.system.traits)).map((a) => a.name), ["Recite from the Text", "Healer's Touch", "Lifeline", "Manifest Spirit", "Spirit Intercession"]);
ok("B the Grimward's Deific Aspect is named apart from the Cleric's", abilityByName["Deific Aspect (Grimward)"] && !abilityByName["Deific Aspect"]);
ok("B the Veil Spirit derives Spirit Sense at a fixed 30 feet", abilityByName["Veil Spirit"].flags["trg-prime"].creatureAbility.derives.sense.fixedFeet === 30);
ok("B the prayer book is a spellbook container gear item", CLASS_GEAR.length === 1 && CLASS_GEAR[0].type === "gear" && CLASS_GEAR[0].system.spellbookContainer === true && CLASS_GEAR[0].name === "Prayer Book");
ok("B the prayer book's name is not also a class ability's (the grant dedupe is by name)", !abilityByName[CLASS_GEAR[0].name]);

// Conditionals normalise under the system's own validator.
const haveSystem = fs.existsSync(path.join(SYSTEM_ROOT, "system.json"));
ok("B the TRG Prime system is beside this module (or TRG_PRIME_ROOT)", haveSystem, SYSTEM_ROOT);
if (haveSystem) {
  const { normaliseConditional } = await import(path.join(SYSTEM_ROOT, "module", "conditionals.mjs"));
  let count = 0;
  for (const a of abilities) {
    for (const [i, raw] of (a.flags["trg-prime"]?.conditionals ?? []).entries()) {
      count += 1;
      // A SCALED ROW (3.625.0's ability differences) needs the figures it reads.
      const n = normaliseConditional(raw, { id: a._id, name: a.name, kind: "item" }, i, { classBonus: 2, level: 4, halfLevel: 2, intelligence: 3, wisdom: 1 });
      ok(`B ${a.name} conditional ${i} normalises`, n !== null);
      ok(`B ${a.name} conditional ${i} has a scope sentence`, String(raw.scope ?? "").length > 8);
      if (raw.kind === "modifier") ok(`B ${a.name} conditional ${i} has a typed non-zero value (or a scaled one)`, (raw.valueFrom ? /^[a-z]+(-[a-z]+)?$/.test(raw.valueFrom) : Number.isInteger(raw.value) && raw.value !== 0) && ["class", "circumstance", "status", "race", "untyped"].includes(raw.type));
    }
  }
  equal("B twenty-seven authored conditionals across the class abilities (Scholarly Exegesis joined at 0.7.0)", count, 27);
}

/* ------------------------------------------------------------------ *
 * C. Resolution
 * ------------------------------------------------------------------ */

if (haveSystem) {
  const { ClassicLevel } = await import("classic-level");
  async function packNames(pack) {
    const db = new ClassicLevel(path.join(SYSTEM_ROOT, "packs", pack), { valueEncoding: "json" });
    const names = new Set();
    for await (const [k, v] of db.iterator()) if (k.startsWith("!items!")) names.add(String(v.name).toLowerCase());
    await db.close();
    return names;
  }
  const coreFeats = await packNames("feats");
  const coreSpells = await packNames("spells");
  const coreWeapons = await packNames("weapons");
  const coreAbilities = await packNames("abilities");
  const coreClasses = await packNames("classes");
  const coreGear = await packNames("gear");
  for (const c of CLASSES) {
    ok(`C ${c.name} does not shadow a core class`, !coreClasses.has(c.name.toLowerCase()));
    for (const { name } of levelled(c.system.grantedFeats)) ok(`C ${c.name} granted feat "${name}" is a core feat`, coreFeats.has(name.toLowerCase()));
    for (const { name } of levelled(c.system.grantedGear)) ok(`C ${c.name} granted gear "${name}" is ours`, CLASS_GEAR.some((g) => g.name === name) && !coreGear.has(name.toLowerCase()));
  }
  for (const a of abilities) ok(`C class ability "${a.name}" does not shadow a core ability`, !coreAbilities.has(a.name.toLowerCase()));
  // Specialist spells arrive with the Grimoire block (Chapter 10); until
  // then the grant reports them unresolved — loudly, as the system does.
  const GRIMOIRE_PENDING = new Set(["doctrinal ward", "word of censure", "hidden doctrine", "forbidden name", "last rite", "anchor the departing soul", "exemplar's grace", "saintly intercession", "read omen", "unfold the future", "touch of healing"]);
  for (const item of [...CLASSES, ...abilities]) {
    for (const { name } of levelled(item.system.grantedSpells)) {
      ok(`C ${item.name} granted spell "${name}" is a core spell or a declared Grimoire spell`, coreSpells.has(name.toLowerCase()) || GRIMOIRE_PENDING.has(name.toLowerCase()));
    }
  }
  equal("C Cure, Restoration and Stabilise are core spells the Healer can be handed today", ["cure", "restoration", "stabilise"].filter((s) => coreSpells.has(s)).length, 3);
  for (const [name, spec] of Object.entries(CLASS_REGISTRATIONS)) {
    for (const w of spec.proficiency.weaponNames) ok(`C ${name} proficiency weapon "${w}" is in the weapons pack`, coreWeapons.has(w.toLowerCase()));
  }

  const { SKILL_ACTIONS } = await import(path.join(SYSTEM_ROOT, "module", "data", "skill-actions.mjs"));
  const actionKeys = new Set([...SKILL_ACTIONS, ...POF_ACTIONS].map((a) => a.key));
  for (const a of abilities) {
    for (const c of a.flags["trg-prime"]?.conditionals ?? []) {
      for (const key of [...(c.when?.actions ?? []), ...(c.when?.not?.actions ?? [])]) ok(`C ${a.name} conditional names a real action "${key}"`, actionKeys.has(key));
      for (const key of c.when?.subjects ?? []) if (c.when.checkTypes?.includes("skill")) ok(`C ${a.name} conditional subject "${key}" is a skill`, SKILL_ACTIONS.some((x) => (x.skills ?? []).includes(key)));
    }
  }
  for (const name of ["Spirit Speaker", "Seasoned Hands"]) {
    ok(`C substitution "${name}" is a class ability`, Boolean(abilityByName[name]));
    for (const e of SKILL_SUBSTITUTIONS[name]) ok(`C ${name} substitutes a real action "${e.action}" from a real skill "${e.skill}"`, actionKeys.has(e.action) && SKILL_ACTIONS.some((x) => (x.skills ?? []).includes(e.skill)));
  }
  equal("C Seasoned Hands upgrades the five printed checks fumble → failure", DEGREE_UPGRADES["Seasoned Hands"], ["readTheSigns", "layToRest", "treatDisease", "treatToxin", "treatWounds"].map((actionKey) => ({ actionKey, from: "fumble", to: "failure" })));
  for (const key of ["readTheSigns", "layToRest"]) {
    const action = POF_ACTIONS.find((a) => a.key === key);
    ok(`C ${key} is a module skill action gated on its ability`, action && abilityByName[action.requiresFeat] && abilityByName[action.requiresFeat].system.sourceClass === "Folkwarden");
  }
  equal("C Read the Signs rolls from Nature or Survival with no fixed DC", [POF_ACTIONS.find((a) => a.key === "readTheSigns").skills, POF_ACTIONS.find((a) => a.key === "readTheSigns").against], [["nature", "survival"], "none"]);
  equal("C Lay to Rest rolls from Medicine, Nature or Religion against the Level DC", [POF_ACTIONS.find((a) => a.key === "layToRest").skills, POF_ACTIONS.find((a) => a.key === "layToRest").against], [["medicine", "nature", "religion"], "levelDC"]);

  // The system-side machinery this block leans on (3.563.0).
  const read = (rel) => fs.readFileSync(path.join(SYSTEM_ROOT, rel), "utf8");
  ok("C system: version is at least 3.564.0", Number(JSON.parse(read("system.json")).version.split(".")[1]) >= 564);
  ok("C system: declared strike riders exist (Judgement's damage)", fs.existsSync(path.join(SYSTEM_ROOT, "module", "combat", "damage-riders.mjs")) && /riderFormula\(damageRiders\)/.test(read("module/combat/attack-workflow.mjs")));
  ok("C system: conditionals scale by valueFrom (Inquisition's live bonus)", /valueFrom/.test(read("module/conditionals.mjs")) && /scalingFor\(actor\)/.test(read("module/apps/check-dialog.mjs")));
  const auto = fs.readFileSync(path.join(ROOT, "module", "class-automations.mjs"), "utf8");
  ok("C Inquisition's bonus is read live, never baked", /valueFrom: "classBonus"/.test(auto) && !/value: bonus, type: "class", label: `Inquisition/.test(auto));
  ok("C Judgement declares its strike rider against the Subject (growing with Final Sanction at 0.7.0)", /strikeDamageRider: \{ dice, label: "Judgement", targetUuids: subjectUuid \? \[subjectUuid\] : \[\], oncePerRound: true, \.\.\.\(hasFeat\(actor, "Final Sanction"\) \? \{ lowHalfExtraDice: "1d6" \} : \{\}\),/.test(auto)
    // RESTLESS END (0.11.0): +1d6 against Undead or Unliving, grown on the damage path.
    && /extraVs: \{ dice: "1d6", label: "Restless End", targetTypes: \["undead"\], targetTraits: \["undead", "unliving"\] \}/.test(auto));
  ok("C Beast Within writes the pools' untyped slots", /system\.combat\.movement\.land\.other/.test(auto) && /system\.combat\.defence\.other/.test(auto));
  ok("C system: the declared ability chooser exists", /export function abilityChoicesOf/.test(read("module/feats-workflow.mjs")) && /abilityChoicesOf\(item\)/.test(read("module/feats-workflow.mjs")));
  ok("C system: an ability's own grants are a grant type", /ability: \[[\s\S]*?grantedSpells[\s\S]*?levelled: true/.test(read("module/grants-workflow.mjs")) && /"ability"/.test(read("module/grant-autorun.mjs")));
  ok("C system: a class grants spells", /class: \[[\s\S]*?grantedSpells[\s\S]*?\],\s*\/\/ A CLASS ABILITY/.test(read("module/grants-workflow.mjs")));
  ok("C system: specialist skills come off any item declaring the flag", /declaresSpecialistSkills\(sourceItem\)/.test(read("module/grants-workflow.mjs")) && /declaresSpecialistSkills\(item\)/.test(read("module/grant-cleanup.mjs")));
  ok("C system: the repertoire schedule is data", /repertoireSchedule\(classItem\)/.test(read("module/magic/repertoire-workflow.mjs")) && /pickStep/.test(read("module/magic/repertoire.mjs")));
  ok("C system: feat gates read class abilities too", /i\.type === "feat" \|\| i\.type === "ability"/.test(read("module/combat/action-workflow.mjs")) && /\.concat\(abilityNames\)/.test(read("module/sheets/actor-sheet.mjs")));
  ok("C system: a class-granted archetype is waived from progression", /type === "class"\) return false/.test(read("module/picker-filters.mjs")));
  ok("C system: a module class can be barred by name and gate archetypes", (read("module/picker-filters.mjs").match(/registeredClassNames\(\)\.includes\(/g) ?? []).length >= 3);
  ok("C system: the control-level field the class effects write exists", /controlBonusPerLevel/.test(read("template.json")) && /controlBonusPerLevel/.test(read("module/documents/actor.mjs")));
  ok("C system: registerClass takes proficiency, wealth and needsDivineAspect", /needsDivineAspect: Boolean\(spec\.needsDivineAspect\)/.test(read("module/module-api.mjs")) && /proficiency: spec\.proficiency/.test(read("module/module-api.mjs")));
  ok("C system: the spellbook container flag the prayer book carries is read", /spellbookContainer/.test(read("module/magic/spellbook-workflow.mjs")) || /spellbookContainer/.test(read("module/sheets/item-sheet.mjs")));
}

/* ------------------------------------------------------------------ *
 * D. Registration and automation
 * ------------------------------------------------------------------ */

const calls = [];
const fake = new Proxy({}, { get: (_, name) => (...args) => { calls.push([name, ...args]); return true; } });
registerContent(fake, "trg-pillars-of-faith");
const of = (fn) => calls.filter((c) => c[0] === fn);
equal("D registers the five classes", of("registerClass").map((c) => c[1]), ["Archivist", "Folkwarden", "Grimward", "Healer", "Shaman"]);
for (const [name, spec] of Object.entries(CLASS_REGISTRATIONS)) {
  equal(`D ${name} registered wealth is the Chapter 6 table`, String(spec.wealth), classes[name].system.wealth);
  ok(`D ${name} proficiency block is in the core shape`, ["armourCategories", "armourNames", "otherTiers", "armourExclude", "shieldCategories", "shieldNames", "weaponCategories", "weaponNames", "weaponRules", "deityWeapons"].every((k) => k in spec.proficiency) && spec.proficiency.label === name);
}
ok("D only the Grimward needs a Divine Aspect", Object.entries(CLASS_REGISTRATIONS).filter(([, s]) => s.needsDivineAspect).map(([n]) => n).join() === "Grimward");
ok("D the Grimward's proficiency counts its deity's weapon", CLASS_REGISTRATIONS.Grimward.proficiency.deityWeapons === true && Object.entries(CLASS_REGISTRATIONS).filter(([n, s]) => n !== "Grimward" && s.proficiency.deityWeapons).length === 0);
// Proficiency blocks against the printed lines.
equal("D Archivist: no armour; club, dagger, staff", [CLASS_REGISTRATIONS.Archivist.proficiency.armourCategories, CLASS_REGISTRATIONS.Archivist.proficiency.weaponNames], [[], ["Club", "Dagger", "Staff"]]);
equal("D Folkwarden: light armour, shields but tower, simple + spear + shortbow", [CLASS_REGISTRATIONS.Folkwarden.proficiency.armourCategories, CLASS_REGISTRATIONS.Folkwarden.proficiency.shieldCategories, CLASS_REGISTRATIONS.Folkwarden.proficiency.weaponCategories, CLASS_REGISTRATIONS.Folkwarden.proficiency.weaponNames], [["Light"], ["buckler", "light", "heavy"], ["Simple"], ["Spear", "Short Bow", "Composite Shortbow"]]);
equal("D Grimward: light and medium, shields but tower, simple and martial", [CLASS_REGISTRATIONS.Grimward.proficiency.armourCategories, CLASS_REGISTRATIONS.Grimward.proficiency.shieldCategories, CLASS_REGISTRATIONS.Grimward.proficiency.weaponCategories], [["Light", "Medium"], ["buckler", "light", "heavy"], ["Simple", "Martial"]]);
equal("D Healer: light armour, no shields, simple weapons", [CLASS_REGISTRATIONS.Healer.proficiency.armourCategories, CLASS_REGISTRATIONS.Healer.proficiency.shieldCategories, CLASS_REGISTRATIONS.Healer.proficiency.weaponCategories], [["Light"], [], ["Simple"]]);
equal("D Shaman: as the Folkwarden", CLASS_REGISTRATIONS.Shaman.proficiency, { ...CLASS_REGISTRATIONS.Folkwarden.proficiency, label: "Shaman" });

const shipped = new Set(abilities.map((a) => a.name.toLowerCase()));
for (const key of Object.keys(CLASS_AUTOMATIONS)) ok(`D automation "${key}" names a class ability`, shipped.has(key));
for (const key of Object.keys(CLASS_PASSIVE_HINTS)) ok(`D passive hint "${key}" names a class ability`, shipped.has(key));
for (const key of Object.keys(CLASS_AUTOMATIONS)) ok(`D automation "${key}" is not also a hint`, !(key in CLASS_PASSIVE_HINTS));
for (const [key, entry] of Object.entries(CLASS_AUTOMATIONS)) ok(`D automation "${key}" has hint and use()`, typeof entry.hint === "string" && typeof entry.use === "function");
for (const a of abilities) {
  const key = a.name.toLowerCase();
  const chooser = Boolean(a.flags["trg-prime"]?.abilityChoices);
  ok(`D ability "${a.name}" has a Use, a hint or a chooser`, key in CLASS_AUTOMATIONS || key in CLASS_PASSIVE_HINTS || key in GRIMOIRE_AUTOMATIONS || chooser);
  if (chooser) ok(`D chooser "${a.name}" carries no automation of its own (the system's chooser runs)`, !(key in CLASS_AUTOMATIONS));
}
ok("D every Focus ability is automated", abilities.filter((a) => /\bFocus\b/.test(a.system.traits)).every((a) => a.name.toLowerCase() in CLASS_AUTOMATIONS));
equal("D nineteen class automations", Object.keys(CLASS_AUTOMATIONS).length, 19);
ok("D the automations file has no static import of the system", !/from "\.\.\/\.\.\/sys|trg-prime\/module/.test(fs.readFileSync(path.join(ROOT, "module", "class-automations.mjs"), "utf8")));

const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "module.json"), "utf8"));
equal("D module version", manifest.version, "0.11.1");
equal("D requires TRG Prime 3.630.1+", manifest.relationships.systems[0].compatibility.minimum, "3.630.1");
ok("D pof-classes extends classes; pof-gear extends gear", manifest.packs.find((p) => p.name === "pof-classes")?.flags["trg-prime"].extends === "classes" && manifest.packs.find((p) => p.name === "pof-gear")?.flags["trg-prime"].extends === "gear");

/* ------------------------------------------------------------------ */
const EXPECTED_CHECKS = 897;
if (EXPECTED_CHECKS) equal("Z the suite ran every check it is meant to", checks + 1, EXPECTED_CHECKS);

if (failures.length) {
  console.log(`verify-classes: ${checks} checks — ${failures.length} FAILED\n`);
  for (const f of failures) console.log(`  ✗ ${f}`);
  process.exitCode = 1;
} else {
  console.log(`verify-classes: ${checks} checks — all green.`);
}
