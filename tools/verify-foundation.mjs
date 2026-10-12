#!/usr/bin/env node
/**
 * verify-foundation — Pillars of Faith, Chapters 1–2 (and the twelve
 * background feats from Chapter 5), checked against the book.
 *
 *   node tools/verify-foundation.mjs
 *
 * Needs the TRG Prime system checked out beside this module (or at
 * TRG_PRIME_ROOT), because half of what this checks is that every name
 * the module's items point at — Nightvision, Guidance, Read Aura, a
 * skill action key — actually exists where the system will look for it.
 *
 * SECTIONS
 *   A  Transcription: the printed numbers, diffed against a hand-typed
 *      table below. Two copies that have to agree (the system's own
 *      class-tables discipline).
 *   B  Resolution: every grant name resolves; every conditional's action
 *      keys exist in the system's skill actions OR are on the declared
 *      PENDING list for the next block; every automation and passive
 *      hint names an item that exists.
 *   C  Registration: what registration.mjs hands the system, driven
 *      against a fake api.
 *   D  Manifest: module.json declares every pack with the right flag.
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
  ok(label, actual === expected, `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

const { PACKS, RACES, HERITAGES, BACKGROUNDS, ABILITIES, FEATS, SPELLS } = await import("./content/foundation.mjs");
const { registerContent, TRAITS, LANGUAGES, RACIAL_PP, SKILL_SUBSTITUTIONS, DEGREE_UPGRADES } = await import("../module/registration.mjs");
const { SKILL_ACTIONS: POF_ACTIONS } = await import("../module/skill-actions.mjs");
const { AUTOMATIONS, PASSIVE_HINTS } = await import("../module/automations.mjs");
const byName = (list) => Object.fromEntries(list.map((d) => [d.name, d]));
const races = byName(RACES); const heritages = byName(HERITAGES); const backgrounds = byName(BACKGROUNDS);
const abilities = byName(ABILITIES); const feats = byName(FEATS); const spells = byName(SPELLS);

/* ------------------------------------------------------------------ *
 * A. Transcription
 * ------------------------------------------------------------------ */

// Chapter 2, RACIAL MECHANICS — typed from the book, not from foundation.mjs.
const BOOK_RACES = {
  Eshari:   { mods: "Con +1, Wis +1, Cha +1, Str -1", core: "Low Tongue, Vesperic",    specialist: "Eshari Lore, Spirit Lore",     abilities: ["Nightvision", "Soul Warden", "Spirit Sense"] },
  Kethrani: { mods: "Int +1, Wis +1, Cha +1, Dex -1", core: "High Tongue, Low Tongue", specialist: "Kethrani Lore, Theology",       abilities: ["Living Testament", "Sacred Inscription"], spells: "Read Aura" },
  Myrathi:  { mods: "Con +1, Int +1, Wis +1, Dex -1", core: "Low Tongue, Mycelic",     specialist: "Myrathi Lore, Ancestor Lore",  abilities: ["Fungal Physiology", "Ancestral Communion"] },
  Rhevani:  { mods: "Int +1, Wis +1, Cha +1, Con -1", core: "Low Tongue, Rhevic",      specialist: "Rhevani Lore, Soul Lore",      abilities: ["Continuity of Self", "Past-Life Echo"] }
};
const ATTR = { str: "strength", dex: "dexterity", con: "constitution", int: "intelligence", wis: "wisdom", cha: "charisma" };

for (const [name, book] of Object.entries(BOOK_RACES)) {
  const r = races[name];
  ok(`A ${name} exists`, Boolean(r)); if (!r) continue;
  equal(`A ${name} ability modifiers`, r.system.abilityModifiers, book.mods);
  const change = r.effects.find((e) => e.name.endsWith("ability modifiers"))?.changes ?? [];
  for (const part of book.mods.split(",")) {
    const [ab, v] = part.trim().split(/\s+/);
    const c = change.find((x) => x.key === `system.attributes.${ATTR[ab.toLowerCase()]}.racial`);
    ok(`A ${name} effect carries ${part.trim()}`, c && c.value === String(Number(v)) && c.mode === 2, JSON.stringify(c));
  }
  equal(`A ${name} is Medium at 25 ft`, JSON.stringify(r.effects.find((e) => e.name.endsWith("size and speed")).changes.map((c) => c.value)), '["medium","25"]');
  equal(`A ${name} core languages`, r.system.coreLanguages, book.core);
  equal(`A ${name} additional languages: any common or regional`, r.system.additionalLanguages, "common, regional");
  equal(`A ${name} specialist skills`, r.system.specialistSkills, book.specialist);
  equal(`A ${name} racial abilities`, r.system.racialAbilities, book.abilities.join(", "));
  equal(`A ${name} granted spells`, r.system.grantedSpells ?? "", book.spells ?? "");
  equal(`A ${name} Power Points: 0`, RACIAL_PP[name], 0);
}
equal("A four races", RACES.length, 4);

// Heritages — the printed mechanic, one line each.
const BOOK_HERITAGES = {
  Ashen: ["Eshari", (h) => h.effects.some((e) => e.changes.some((c) => c.key === "system.combat.resistances" && c.value === ", fire"))],
  Kelvan: ["Eshari", (h) => h.system.grantedSpells === "Sacred Toll" && h.flags["trg-prime"].grantInnate === true],
  Lumari: ["Eshari", (h) => h.system.racialAbilities === "Lantern Glow" && h.system.grantedSpells === "Guidance" && h.flags["trg-prime"].grantInnate === true],
  Velari: ["Eshari", (h) => h.system.racialAbilities === "Spirit Sense (Velari)" && h.system.removedAbilities === "Spirit Sense" && h.flags["trg-prime"].conditionals.some((c) => c.value === 1 && c.type === "race" && c.when.subjects.includes("perception"))],
  Morrin: ["Eshari", (h) => h.system.abilityModifiers === "Con +1"],
  Avenor: ["Kethrani", (h) => h.system.grantedSpells === "Stabilise" && h.effects.some((e) => e.changes.some((c) => c.key === "system.skills.medicine.racial" && c.value === "1"))],
  Korath: ["Kethrani", (h) => ["intimidate", "senseMotive"].every((k) => h.effects.some((e) => e.changes.some((c) => c.key === `system.skills.${k}.racial` && c.value === "1"))) && JSON.stringify(h.flags["trg-prime"].inflictedFloors) === JSON.stringify([{ action: "demoralise", condition: "frightened", value: 1, rounds: 2 }])],
  Sapiren: ["Kethrani", (h) => h.system.abilityModifiers === "Int +1" && h.flags["trg-prime"].specialistChoice?.suffix === "Lore"],
  Serel: ["Kethrani", (h) => h.flags["trg-prime"].conditionals.some((c) => c.kind === "advantage" && c.when.traits.includes("illusion") && c.auto) && h.flags["trg-prime"].conditionals.some((c) => c.kind === "modifier" && c.value === 1 && c.when.actions.includes("detectDeception"))],
  Tharos: ["Kethrani", (h) => h.system.racialAbilities === "Warding Word"],
  Karuum: ["Myrathi", (h) => h.effects.some((e) => e.changes.some((c) => c.key === "system.combat.naturalArmourBase.natural" && c.value === "1"))],
  Lumeri: ["Myrathi", (h) => h.system.racialAbilities === "Bloom Light" && h.system.grantedSpells === "Guidance" && h.flags["trg-prime"].grantInnate === true],
  Morrai: ["Myrathi", (h) => h.effects.some((e) => e.changes.some((c) => c.key === "system.combat.resistances" && c.value === ", essence"))],
  Nethri: ["Myrathi", (h) => h.system.racialAbilities === "Silent Exchange" && h.effects.some((e) => e.changes.some((c) => c.key === "system.skills.senseMotive.racial" && c.value === "1"))],
  Vaelori: ["Myrathi", (h) => h.system.grantedSpells === "Purify" && h.flags["trg-prime"].grantInnate === true && h.effects.some((e) => e.changes.some((c) => c.key === "system.skills.medicine.racial"))],
  Arathi: ["Rhevani", (h) => h.system.abilityModifiers === "Str +1" && h.effects.some((e) => e.changes.some((c) => c.key === "system.combat.initiative.race" && c.value === "10"))],
  Dornai: ["Rhevani", (h) => h.effects.some((e) => e.changes.some((c) => c.key === "system.combat.deathState" && c.value === "2" && c.mode === 2))],
  Sevrai: ["Rhevani", (h) => h.system.languageChoices === "1 common|regional" && h.effects.some((e) => e.changes.some((c) => c.key === "system.combat.movement.land" && c.value === "5" && c.mode === 2))],
  Thaeli: ["Rhevani", (h) => h.system.grantedSpells === "Guidance" && h.flags["trg-prime"].grantInnate === true],
  Velori: ["Rhevani", (h) => h.system.abilityModifiers === "Int +1" && h.flags["trg-prime"].specialistChoice?.suffix === "Lore"]
};
for (const [name, [race, test]] of Object.entries(BOOK_HERITAGES)) {
  const h = heritages[name];
  ok(`A heritage ${name} exists`, Boolean(h)); if (!h) continue;
  equal(`A ${name} belongs to ${race}`, h.system.sourceRace, race);
  ok(`A ${name} carries its printed mechanic`, test(h));
  ok(`A ${name} description ends with its mechanic (book text carried whole)`, h.system.description.length > 200);
}
equal("A twenty heritages, five per race", JSON.stringify(Object.values(BOOK_HERITAGES).reduce((m, [r]) => ({ ...m, [r]: (m[r] ?? 0) + 1 }), {})), '{"Eshari":5,"Kethrani":5,"Myrathi":5,"Rhevani":5}');
equal("A no extra heritages", HERITAGES.length, 20);
ok("A Vaelori's text carries no stray editorial paragraph (Graham, 17 Sep)", !/These expansions preserve/.test(heritages.Vaelori.system.description));
if (haveSystemQuick()) ok("A the system honours inflictedFloors (3.561.0)", fs.existsSync(path.join(SYSTEM_ROOT, "module", "combat", "basic-action-conditions.mjs")) && /inflictedFloors/.test(fs.readFileSync(path.join(SYSTEM_ROOT, "module", "combat", "basic-action-conditions.mjs"), "utf8")));
function haveSystemQuick() { return fs.existsSync(path.join(SYSTEM_ROOT, "system.json")); }

// Backgrounds — feat, three skills, specialist skill. Typed from the book.
// Wealth column from Chapter 6's BACKGROUND WEALTH table (Graham, 17 Sep).
const BOOK_BACKGROUNDS = {
  "Battlefield Chaplain": ["Voice of Resolve", "Diplomacy, Medicine, Religion", "Chaplaincy Lore", "1"],
  "Doctrine Keeper": ["Doctrinal Recall", "Culture, Linguistics, Religion", "Canon Lore", "1"],
  "Excommunicate": ["Outcast's Resolve", "Culture, Religion, Sense Motive", "Heresy Lore", "-1"],
  "Funeral Cantor": ["Rite of Passing", "Culture, Perform, Religion", "Funerary Lore", "1"],
  "Grave Custodian": ["Grave Vigil", "Crafting, Perception, Religion", "Burial Lore", "0"],
  "Oath Witness": ["Sworn Testimony", "Culture, Diplomacy, Sense Motive", "Sacred Law", "1"],
  "Pilgrim Envoy": ["Pilgrim's Grace", "Culture, Diplomacy, Survival", "Pilgrimage Lore", "-1"],
  "Reliquary Seeker": ["Relic Appraiser", "Culture, Perception, Religion", "Relic Lore", "1"],
  "Sacred Chirurgeon": ["Sanctified Treatment", "Medicine, Religion, Sense Motive", "Chirurgery", "1"],
  "Shrine Mason": ["Consecrated Craft", "Crafting, Culture, Religion", "Sacred Architecture", "1"],
  "Spirit Medium": ["Veil Listener", "Occultism, Religion, Sense Motive", "Spirit Lore", "0"],
  "Temple Chronicler": ["Keeper of Records", "Culture, Linguistics, Religion", "Ecclesiastical History", "2"]
};
for (const [name, [feat, skills, specialist, wealth]] of Object.entries(BOOK_BACKGROUNDS)) {
  const b = backgrounds[name];
  ok(`A background ${name} exists`, Boolean(b)); if (!b) continue;
  equal(`A ${name} bonus feat`, b.system.grantedFeats, feat);
  equal(`A ${name} skill bonuses`, b.system.skillBonuses, skills);
  equal(`A ${name} specialist skill`, b.system.specialistSkill, specialist);
  equal(`A ${name} specialist skill flag matches`, b.flags["trg-prime"].grantedSpecialistSkills, specialist);
  equal(`A ${name} wealth (Chapter 6 table)`, b.system.wealth, wealth);
  const changes = b.effects[0]?.changes ?? [];
  equal(`A ${name} three +1 class skill changes (CUSTOM mode, like core backgrounds)`, changes.filter((c) => c.mode === 0 && c.value === "1" && /^system\.skills\.\w+\.class$/.test(c.key)).length, 3);
}
equal("A twelve backgrounds", BACKGROUNDS.length, 12);

// Sacred Toll's ladder, as printed.
const toll = spells["Sacred Toll"];
ok("A Sacred Toll exists", Boolean(toll));
if (toll) {
  equal("A Sacred Toll is a Will save, 30 ft, 1 AP, 0 PP", `${toll.system.defence}|${toll.system.range}|${toll.system.castAP}|${toll.system.ppCost}`, "Will|30 feet|1|0");
  equal("A Sacred Toll lasts until the end of its next turn", toll.system.duration, "until the end of its next turn");
  const ladder = toll.system.effects.filter((e) => e.kind === "condition").map((e) => `${e.value}:${e.onSave.join("+")}`).join(" ");
  equal("A Sacred Toll ladder: partial 1, failure/fumble 2, blunder 3", ladder, "1:partial 2:failure+fumble 3:blunder");
  ok("A Sacred Toll carries the Focus trait", /\bFocus\b/.test(toll.system.traits));
  equal("A Sacred Toll is one tracked use, arriving full (live finding 17 Sep)", `${toll.system.usesPerDay}|${toll.system.usesValue}`, "1|1");
  ok("A Sacred Toll never fires on a success", !toll.system.effects.some((e) => (e.onSave ?? []).includes("success")));
}

// Focus abilities: one use, the trait, as the system's Refocus expects.
for (const name of ["Ancestral Communion", "Past-Life Echo", "Warding Word"]) {
  const a = abilities[name];
  ok(`A ${name} is a one-use Focus ability`, a && a.system.usesPerDay === "1" && /\bFocus\b/.test(a.system.traits));
  equal(`A ${name} arrives with its use available`, a?.system.usesValue, 1);
}
equal("A Soul Warden is +1 race on Soul saves (auto) and offered otherwise", JSON.stringify(abilities["Soul Warden"].flags["trg-prime"].conditionals.map((c) => [c.value, c.type, c.auto])), "[[1,\"race\",true],[1,\"race\",false]]");
equal("A Fungal Physiology is +2 vs disease and poison", JSON.stringify(abilities["Fungal Physiology"].flags["trg-prime"].conditionals[0].when.traits), '["disease","poison"]');
ok("A Spirit Sense derives a tertiary sense at full range (not special)", abilities["Spirit Sense"].flags["trg-prime"].creatureAbility.derives.sense.category === "tertiary" && !abilities["Spirit Sense"].flags["trg-prime"].creatureAbility.derives.sense.special);
equal("A Velari's Spirit Sense is fixed at 60 feet", abilities["Spirit Sense (Velari)"].flags["trg-prime"].creatureAbility.derives.sense.fixedFeet, 60);

// Chapter 1 traits and Chapter 2 languages.
equal("A four new traits", TRAITS.join(","), "haunt,investigation,spirit,unliving");
equal("A three racial languages", Object.keys(LANGUAGES).join(","), "Vesperic,Rhevic,Mycelic");

/* ------------------------------------------------------------------ *
 * B. Resolution against the system
 * ------------------------------------------------------------------ */

async function packNames(pack) {
  const { ClassicLevel } = await import("classic-level");
  const db = new ClassicLevel(path.join(SYSTEM_ROOT, "packs", pack), { valueEncoding: "json" });
  const names = new Set();
  for await (const [key, value] of db.iterator()) if (key.startsWith("!items!")) names.add(String(value.name).trim().toLowerCase());
  await db.close();
  return names;
}
const haveSystem = fs.existsSync(path.join(SYSTEM_ROOT, "system.json"));
ok("B the TRG Prime system is beside this module (or TRG_PRIME_ROOT)", haveSystem, SYSTEM_ROOT);
if (haveSystem) {
  const coreAbilities = await packNames("abilities");
  const coreSpells = await packNames("spells");
  const coreFeats = await packNames("feats");
  const ours = (list) => new Set(list.map((d) => d.name.toLowerCase()));
  const abilityNames = new Set([...coreAbilities, ...ours(ABILITIES)]);
  const spellNames = new Set([...coreSpells, ...ours(SPELLS)]);
  const featNames = new Set([...coreFeats, ...ours(FEATS)]);
  const split = (s) => String(s ?? "").split(",").map((x) => x.trim()).filter(Boolean);

  for (const r of RACES) {
    for (const n of split(r.system.racialAbilities)) ok(`B ${r.name} ability "${n}" resolves`, abilityNames.has(n.toLowerCase()));
    for (const n of split(r.system.grantedSpells)) ok(`B ${r.name} spell "${n}" resolves`, spellNames.has(n.toLowerCase()));
  }
  for (const h of HERITAGES) {
    for (const n of split(h.system.racialAbilities)) ok(`B ${h.name} ability "${n}" resolves`, abilityNames.has(n.toLowerCase()));
    for (const n of split(h.system.grantedSpells)) ok(`B ${h.name} spell "${n}" resolves`, spellNames.has(n.toLowerCase()));
    ok(`B ${h.name} names no core ability twice`, !split(h.system.racialAbilities).some((n) => coreAbilities.has(n.toLowerCase()) && ours(ABILITIES).has(n.toLowerCase())));
  }
  for (const b of BACKGROUNDS) {
    for (const n of split(b.system.grantedFeats)) ok(`B ${b.name} feat "${n}" resolves`, featNames.has(n.toLowerCase()));
  }
  for (const a of ABILITIES) ok(`B module ability "${a.name}" does not shadow a core ability`, !coreAbilities.has(a.name.toLowerCase()));
  for (const f of FEATS) ok(`B module feat "${f.name}" does not shadow a core feat`, !coreFeats.has(f.name.toLowerCase()));
  for (const s of SPELLS) ok(`B module spell "${s.name}" does not shadow a core spell`, !coreSpells.has(s.name.toLowerCase()));

  // Action keys named by conditionals and substitutions: either a real
  // system skill action, or on the PENDING list for the next block.
  const { SKILL_ACTIONS } = await import(path.join(SYSTEM_ROOT, "module", "data", "skill-actions.mjs"));
  const actionKeys = new Set(SKILL_ACTIONS.map((a) => a.key));
  // Chapter 4 shipped (0.2.0): a module action counts as real, and nothing is pending any more.
  for (const a of POF_ACTIONS) actionKeys.add(a.key);
  const PENDING_ACTIONS = new Set();
  const everyItem = [...RACES, ...HERITAGES, ...BACKGROUNDS, ...ABILITIES, ...FEATS];
  let pendingRefs = 0;
  for (const item of everyItem) {
    for (const c of item.flags?.["trg-prime"]?.conditionals ?? []) {
      for (const key of c.when?.actions ?? []) {
        const known = actionKeys.has(key);
        const pending = PENDING_ACTIONS.has(key);
        if (pending && !known) pendingRefs += 1;
        ok(`B ${item.name} conditional names a real or declared-pending action "${key}"`, known || pending);
        if (pending && !known) ok(`B ${item.name} says PENDING in its text for "${key}"`, /PENDING|next block|next Pillars block/i.test(item.system.description));
      }
      for (const key of c.when?.subjects ?? []) {
        if (c.when.checkTypes?.includes("skill")) ok(`B ${item.name} conditional subject "${key}" is a skill`, SKILL_ACTIONS.some((a) => (a.skills ?? []).includes(key)));
      }
    }
  }
  for (const [featName, entries] of Object.entries(SKILL_SUBSTITUTIONS)) {
    // From 0.3.0 a class ability (Spirit Speaker, Seasoned Hands) may substitute too; verify-classes checks those.
    // From 0.4.0 three Chapter 5 feats do; verify-feats checks those.
    ok(`B substitution source "${featName}" is one of our feats or class abilities`, feats[featName] || ["Spirit Speaker", "Seasoned Hands", "Fey-Soul Listener", "Lay Exorcist", "Bloom-Tender's Spores", "Veil Tracker"].includes(featName));
    for (const e of Array.isArray(entries) ? entries : [entries]) {
      ok(`B ${featName} substitution action "${e.action}" is real or pending`, actionKeys.has(e.action) || PENDING_ACTIONS.has(e.action));
      // OR A SPECIALIST SKILL BY SLUG (0.11.0, TRG Prime 3.630.0): Veil Tracker's Spirit Lore.
      ok(`B ${featName} substitution skill "${e.skill}" is a skill`, SKILL_ACTIONS.some((a) => (a.skills ?? []).includes(e.skill)) || /^specialist:[a-z][A-Za-z]+$/.test(e.skill));
    }
  }
  equal("B nothing is pending any more — every named action exists", pendingRefs, 0);
  for (const f of FEATS) ok(`B ${f.name} no longer says PENDING`, !/PENDING/.test(f.system.description));

  // The system-side machinery each item leans on exists in this checkout.
  const read = (rel) => fs.readFileSync(path.join(SYSTEM_ROOT, rel), "utf8");
  ok("B system: race grantedSpells is a grant field (3.560.0)", /race: \[[\s\S]*?grantedSpells[\s\S]*?\],\s*heritage:/.test(read("module/grants-workflow.mjs")));
  ok("B system: grantInnate flag is honoured on the granting item", read("module/grants-workflow.mjs").includes("grantInnate"));
  ok("B system: untrainedActions waiver exists (Past-Life Echo)", read("module/combat/action-workflow.mjs").includes("untrainedActions"));
  ok("B system: pack federation exists", fs.existsSync(path.join(SYSTEM_ROOT, "module", "content-packs.mjs")));
  ok("B system: module API exists", fs.existsSync(path.join(SYSTEM_ROOT, "module", "module-api.mjs")));
  ok("B system: helpers include useBackground and addPendingModifier", /useBackground/.test(read("module/feats-workflow.mjs")) && /addPendingModifier/.test(read("module/module-api-workflow.mjs")));
  ok("B system: version is at least 3.561.0", Number(JSON.parse(read("system.json")).version.split(".")[1]) >= 561);
}

// Every automation key and passive hint names an item this module ships.
const shipped = new Set([...RACES, ...HERITAGES, ...BACKGROUNDS, ...ABILITIES, ...FEATS, ...SPELLS].map((d) => d.name.toLowerCase()));
for (const key of Object.keys(AUTOMATIONS)) ok(`B automation "${key}" names a shipped item`, shipped.has(key));
for (const key of Object.keys(PASSIVE_HINTS)) ok(`B passive hint "${key}" names a shipped item`, shipped.has(key));
for (const key of Object.keys(AUTOMATIONS)) ok(`B automation "${key}" is not also a passive hint`, !(key in PASSIVE_HINTS));
for (const [key, entry] of Object.entries(AUTOMATIONS)) ok(`B automation "${key}" has hint and use()`, typeof entry.hint === "string" && typeof entry.use === "function");
// Every ability with a Use in its text has an automation; every one without has a passive hint.
for (const a of ABILITIES) {
  const usable = /\nUse:|<p>Use:|Use:/.test(a.system.description);
  ok(`B ability "${a.name}" is ${usable ? "automated" : "hinted"}`, usable ? a.name.toLowerCase() in AUTOMATIONS : a.name.toLowerCase() in PASSIVE_HINTS);
}
for (const h of HERITAGES) ok(`B heritage "${h.name}" has a Use or a hint`, h.name.toLowerCase() in AUTOMATIONS || h.name.toLowerCase() in PASSIVE_HINTS);
for (const f of FEATS) ok(`B feat "${f.name}" has a Use or a hint`, f.name.toLowerCase() in AUTOMATIONS || f.name.toLowerCase() in PASSIVE_HINTS);

/* ------------------------------------------------------------------ *
 * E. Chapter 4 skill actions — transcription and shape
 * ------------------------------------------------------------------ */

// Typed from the book: key, skill, printed action time, rank, trait line, DC source.
const BOOK_ACTIONS = {
  observeSacredCustom:        ["culture",     "10 minutes", 1, "Concentrate",                    "none"],
  traceReligiousProvenance:   ["culture",     "10 minutes", 2, "Concentrate, Secret",            "none"],
  concealFaith:               ["deception",   "10 minutes", 1, "Concentrate, Mental, Secret",    "none"],
  analyseScripture:           ["linguistics", "10 minutes", 1, "Concentrate, Secret",            "none"],
  compareTestaments:          ["linguistics", "1 hour",     3, "Concentrate, Secret",            "none"],
  examineTheDead:             ["medicine",    "10 minutes", 1, "Concentrate, Manipulate, Secret","none"],
  performAutopsy:             ["medicine",    "1 hour",     3, "Concentrate, Manipulate, Secret","none"],
  preserveRemains:            ["medicine",    "1 hour",     1, "Manipulate",                     "fixed"],
  readSpiritSigns:            ["nature",      "1 minute",   1, "Concentrate, Secret",            "levelDC"],
  tracePossession:            ["occultism",   "1 minute",   2, "Concentrate, Secret",            "levelDC"],
  interpretHaunt:             ["occultism",   "10 minutes", 2, "Concentrate, Secret",            "levelDC"],
  recogniseDoctrine:          ["religion",    "1 minute",   1, "Concentrate, Secret",            "none"],
  performLastRites:           ["religion",    "10 minutes", 1, "Concentrate, Manipulate",        "levelDC"],
  identifySpiritualAffliction:["religion",    "1 minute",   2, "Concentrate, Secret",            "levelDC"],
  senseOutsideInfluence:      ["senseMotive", "1",          2, "Concentrate, Secret",            "levelDC"]
};
equal("E eighteen actions (fifteen of Chapter 4, two Folk Rites, Read the Room)", POF_ACTIONS.length, 18);
for (const [key, [skill, ap, rank, traits, against]] of Object.entries(BOOK_ACTIONS)) {
  const a = POF_ACTIONS.find((x) => x.key === key);
  ok(`E ${key} exists`, Boolean(a)); if (!a) continue;
  equal(`E ${key} skill`, a.skills.join(","), skill);
  equal(`E ${key} action time`, a.apCost, ap);
  equal(`E ${key} traits`, a.traits, traits);
  equal(`E ${key} DC source`, a.against, against);
  ok(`E ${key} is trained (Rank ≥ 1)`, a.trained === true);
  equal(`E ${key} minRank`, a.minRank ?? 1, rank);
  ok(`E ${key} declares checkType skill`, a.checkType === "skill");
  ok(`E ${key} has critical/success/partial/failure/fumble text`, ["critical", "success", "partial", "failure", "fumble"].every((d) => a.outcomes[d].length > 10));
  ok(`E ${key} never hyphenates a bonus (extractModifier grammar)`, !/[+-]\d+-(circumstance|status)/.test(Object.values(a.outcomes).join(" ")));
}
equal("E Preserve Remains is DC 20", POF_ACTIONS.find((a) => a.key === "preserveRemains").fixedDC, 20);
ok("E the Autopsy fumble and Preserve fumble carry their -2 penalties", /-2 circumstance penalty/.test(POF_ACTIONS.find((a) => a.key === "performAutopsy").outcomes.fumble) && /-2 circumstance penalty/.test(POF_ACTIONS.find((a) => a.key === "preserveRemains").outcomes.fumble));
ok("E Observe Sacred Custom's critical and success carry their bonuses", /\+2 circumstance bonus/.test(POF_ACTIONS.find((a) => a.key === "observeSacredCustom").outcomes.critical) && /\+1 circumstance bonus/.test(POF_ACTIONS.find((a) => a.key === "observeSacredCustom").outcomes.success));
ok("E keys are unique", new Set(POF_ACTIONS.map((a) => a.key)).size === 18);
if (haveSystem) {
  const { SKILL_ACTIONS: CORE } = await import(path.join(SYSTEM_ROOT, "module", "data", "skill-actions.mjs"));
  for (const a of POF_ACTIONS) ok(`E ${a.key} does not shadow a core action`, !CORE.some((c) => c.key === a.key || c.name.toLowerCase() === a.name.toLowerCase()));
  ok("E the system has the minRank gate (3.561.0)", /action\.minRank/.test(fs.readFileSync(path.join(SYSTEM_ROOT, "module", "combat", "action-workflow.mjs"), "utf8")));
  ok("E the system has the degree-upgrade registry (3.561.0)", /registeredDegreeUpgrades/.test(fs.readFileSync(path.join(SYSTEM_ROOT, "module", "skill-feats.mjs"), "utf8")));
}
equal("E Keeper of Records upgrades Compare Testaments partial → success", JSON.stringify(DEGREE_UPGRADES["Keeper of Records"]), JSON.stringify([{ actionKey: "compareTestaments", from: "partial", to: "success" }]));

/* ------------------------------------------------------------------ *
 * C. Registration, driven against a fake api
 * ------------------------------------------------------------------ */

const calls = [];
const fake = new Proxy({}, { get: (_, name) => (...args) => { calls.push([name, ...args]); return true; } });
registerContent(fake, "trg-pillars-of-faith");
const of = (fn) => calls.filter((c) => c[0] === fn);
equal("C registers the four traits", JSON.stringify(of("registerTraits")[0][1]), JSON.stringify(TRAITS));
equal("C registers three languages", of("registerLanguage").length, 3);
equal("C registers four racial PP rows", of("registerRacialPP").length, 4);
ok("C every racial PP row is 0", of("registerRacialPP").every((c) => c[2] === 0));
equal("C registers every automation (Chapters 2, 3, 5, 9 and 10)", of("registerFeatAutomation").length, Object.keys(AUTOMATIONS).length + 19 + 60 + 4 + 2);
equal("C registers every passive hint (Chapters 2, 3 and 5)", of("registerPassiveAutomation").length, Object.keys(PASSIVE_HINTS).length + 39 + 111);
equal("C registers ten skill substitutions (four background feats, two class abilities, four Chapter 5 feats — Veil Tracker since 0.11.0)", of("registerSkillSubstitution").length, 10);
equal("C registers the eighteen skill actions in one call", of("registerSkillActions")[0][1].length, 18);
equal("C registers five degree upgrades (Keeper of Records, Seasoned Hands, Close Reading, Expert Autopsist, Watch the Eyes)", of("registerDegreeUpgrades").length, 5);
ok("C every call carries the module id", calls.every((c) => c.at(-1) === "trg-pillars-of-faith"));

/* ------------------------------------------------------------------ *
 * D. Manifest and built packs
 * ------------------------------------------------------------------ */

const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "module.json"), "utf8"));
equal("D module id", manifest.id, "trg-pillars-of-faith");
equal("D requires TRG Prime 3.630.1+", manifest.relationships.systems[0].compatibility.minimum, "3.630.1");
for (const pack of PACKS) {
  const m = manifest.packs.find((p) => p.name === pack.name);
  // 0.10.0: an Actor pack (the haunts) and a JournalEntry pack (the GM's guide) extend nothing.
  ok(`D manifest declares ${pack.name} ${pack.extends ? `extending ${pack.extends}` : `as a ${pack.type} pack`}`, m && m.flags?.["trg-prime"]?.extends === pack.extends
    && m.type === (pack.type ?? "Item") && (m.type === "JournalEntry" || m.system === "trg-prime"));
  ok(`D packs-source/${pack.name} holds ${pack.docs.length} files`, fs.existsSync(path.join(ROOT, "packs-source", pack.name)) && fs.readdirSync(path.join(ROOT, "packs-source", pack.name)).length === pack.docs.length);
  ok(`D packs/${pack.name} is compiled`, fs.existsSync(path.join(ROOT, "packs", pack.name, "CURRENT")));
}
ok("D every pack in the folder list exists", manifest.packFolders[0].packs.every((n) => manifest.packs.some((p) => p.name === n)));
ok("D ids are 16 chars", [...RACES, ...HERITAGES, ...BACKGROUNDS, ...ABILITIES, ...FEATS, ...SPELLS].every((d) => /^[A-Za-z0-9]{16}$/.test(d._id)));
ok("D ids are unique", new Set([...RACES, ...HERITAGES, ...BACKGROUNDS, ...ABILITIES, ...FEATS, ...SPELLS].map((d) => d._id)).size === 62);

/* ------------------------------------------------------------------ */
const EXPECTED_CHECKS = 769;
if (EXPECTED_CHECKS) equal("Z the suite ran every check it is meant to", checks + 1, EXPECTED_CHECKS);

if (failures.length) {
  console.log(`verify-foundation: ${checks} checks — ${failures.length} FAILED\n`);
  for (const f of failures) console.log(`  ✗ ${f}`);
  process.exitCode = 1;
} else {
  console.log(`verify-foundation: ${checks} checks — all green.`);
}
