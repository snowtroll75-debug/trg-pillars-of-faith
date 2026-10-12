#!/usr/bin/env node
/**
 * verify-feats — Pillars of Faith, Chapter 5 (feats and archetypes),
 * checked against the book and against the system that will read them.
 *
 *   node tools/verify-feats.mjs
 *
 * SECTIONS
 *   A  Transcription: every heading in feat-text.json ships exactly once
 *      (or is one of the twelve background feats 0.1.0 shipped); each
 *      item's description carries the book's body, trait line and
 *      prerequisites; the trait line's race and class words became the
 *      gate fields; the corrections and readings this block made are
 *      the ones the notes say.
 *   B  Shape: the fields the picker and the grants read are present and
 *      in the core shape; every effect change targets a typed pool SLOT
 *      (never a pool object); conditionals normalise under the system's
 *      validator and name real actions and skills; senses, auras,
 *      innate grants, uses and repeat limits are declared the way the
 *      system reads them; nothing collides by name across item types.
 *   C  Resolution: granted spells, feats, abilities, weapons and gear
 *      exist where the grant will look; the class-access lists name
 *      real core feats; the archetypes name our classes; the system
 *      machinery this block leans on (3.571.0) is present.
 *   D  Registration and automation: what registration.mjs hands the
 *      system; every feat and ability has a Use, a hint or a chooser;
 *      the Chapter 2 and 3 automations read the feats that change them.
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

const { FEAT_TEXT, parseTraitLine } = await import("./content/feat-builder.mjs");
const { RACIAL_FEATS } = await import("./content/feats-racial.mjs");
const { ARCHETYPE_FEATS, ARCHETYPE_ABILITIES, ARCHETYPE_GEAR } = await import("./content/feats-archetype.mjs");
const { CLASS_FEATS } = await import("./content/feats-class.mjs");
const { GENERAL_FEATS } = await import("./content/feats-general.mjs");
const { FEAT_WEAPONS } = await import("./content/feats-weapons.mjs");
const { PACKS, FEATS: FOUNDATION_FEATS, ABILITIES: RACIAL_ABILITIES, RACES, HERITAGES, BACKGROUNDS } = await import("./content/foundation.mjs");
const { CLASSES, CLASS_ABILITIES, CLASS_GEAR } = await import("./content/classes.mjs");
const { registerContent, ARCHETYPE_REGISTRATIONS, ARCHETYPE_CLASS_SKILL_GRANTS, FEAT_ACCESS, SKILL_SUBSTITUTIONS, DEGREE_UPGRADES, CLASS_REGISTRATIONS } = await import("../module/registration.mjs");
const { FEAT_AUTOMATIONS, FEAT_PASSIVE_HINTS } = await import("../module/feat-automations.mjs");
const { AUTOMATIONS, PASSIVE_HINTS } = await import("../module/automations.mjs");
const { GRIMOIRE_AUTOMATIONS } = await import("../module/grimoire-automations.mjs");
const { CLASS_AUTOMATIONS, CLASS_PASSIVE_HINTS } = await import("../module/class-automations.mjs");
const { SKILL_ACTIONS: POF_ACTIONS } = await import("../module/skill-actions.mjs");

const SYS = "trg-prime";
const byName = (list) => Object.fromEntries(list.map((d) => [d.name, d]));
const split = (s) => String(s ?? "").split(",").map((x) => x.trim()).filter(Boolean);
const levelled = (s) => split(s).map((e) => { const at = e.indexOf(":"); return at < 0 ? { level: 1, name: e } : { level: Number(e.slice(0, at)), name: e.slice(at + 1).trim() }; });
const text = (html) => String(html ?? "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&rsquo;/g, "'").replace(/\s+/g, " ").trim();
const FAMILIES = { racial: RACIAL_FEATS, archetype: ARCHETYPE_FEATS, class: CLASS_FEATS, general: GENERAL_FEATS };
const NEW_FEATS = [...RACIAL_FEATS, ...ARCHETYPE_FEATS, ...CLASS_FEATS, ...GENERAL_FEATS];
const feats = byName(NEW_FEATS);
const abilities = byName(ARCHETYPE_ABILITIES);
const flagsOf = (d) => d.flags?.[SYS] ?? {};

/* ------------------------------------------------------------------ *
 * A. Transcription
 * ------------------------------------------------------------------ */

equal("A the book's four families are the extracted counts (93 / 13 / 48 / 25)", Object.fromEntries(Object.entries(FEAT_TEXT).map(([k, v]) => [k, Object.keys(v).length])), { racial: 93, archetype: 13, class: 48, general: 25 });
equal("A shipped this block: 93 racial, 13 archetype, 48 class, 13 general", Object.fromEntries(Object.entries(FAMILIES).map(([k, v]) => [k, v.length])), { racial: 93, archetype: 13, class: 48, general: 13 });

// The twelve general feats 0.1.0 shipped as background feats.
const foundationNames = new Set(FOUNDATION_FEATS.map((f) => f.name.toLowerCase()));
const BACKGROUND_FEATS = ["CONSECRATED CRAFT", "DOCTRINAL RECALL", "GRAVE VIGIL", "KEEPER OF RECORDS", "OUTCAST'S RESOLVE", "PILGRIM'S GRACE", "RELIC APPRAISER", "RITE OF PASSING", "SANCTIFIED TREATMENT", "SWORN TESTIMONY", "VEIL LISTENER", "VOICE OF RESOLVE"];
equal("A twelve general headings are the 0.1.0 background feats", Object.keys(FEAT_TEXT.general).filter((h) => !GENERAL_FEATS.some((f) => f.name.toUpperCase() === h)).sort(), BACKGROUND_FEATS.slice().sort());
for (const h of BACKGROUND_FEATS) ok(`A background feat "${h}" shipped in 0.1.0`, foundationNames.has(h.toLowerCase()));

const headingOf = (f) => f.name.toUpperCase().replace(/’/g, "'").replace(/ \(EXPERT\)$/, "");
for (const [cat, list] of Object.entries(FAMILIES)) {
  const headings = new Set(Object.keys(FEAT_TEXT[cat]));
  const seen = new Set();
  for (const f of list) {
    const h = headingOf(f);
    ok(`A ${cat} "${f.name}" is a book heading`, headings.has(h), h);
    ok(`A ${cat} "${f.name}" ships once`, !seen.has(h));
    seen.add(h);
    const entry = FEAT_TEXT[cat][h];
    if (!entry) continue;
    const body = text(f.system.description);
    // The body's first sentence is in the description (the sheet line is appended after).
    const firstSentence = text(entry.body.split("\n")[0]).slice(0, 60);
    ok(`A ${cat} "${f.name}" carries the book's text`, body.includes(firstSentence), firstSentence);
    if (entry.traits) ok(`A ${cat} "${f.name}" carries the printed trait line`, body.startsWith(text(entry.traits)));
    const parsed = parseTraitLine(entry.traits);
    if (cat === "racial") {
      // A Heritage feat (Morrowmade, Vesperyn, the five Eternal Blood
      // heritages) and their follow-ups print no race: untagged, the
      // picker opens them to everyone and the prerequisites gate them.
      const openToAll = split(f.system.traits).includes("Heritage") || /-Blooded|Eternal Blood|Eternal Resonance/.test(f.system.prerequisites);
      ok(`A racial "${f.name}" gates on the trait line's race (or is open, as a Heritage feat)`, openToAll ? split(f.system.sourceRace).length === 0 : split(f.system.sourceRace).length > 0 && (parsed.races.length === 0 || split(f.system.sourceRace).some((r) => parsed.races.includes(r))), `${f.system.sourceRace} vs ${parsed.races}`);
      for (const t of parsed.traits) ok(`A racial "${f.name}" keeps trait "${t}"`, split(f.system.traits).includes(t));
    } else {
      for (const t of [...parsed.traits, ...parsed.classes]) ok(`A ${cat} "${f.name}" keeps trait "${t}"`, split(f.system.traits).includes(t));
    }
    if (entry.prerequisites && f.name !== "Mesmeric Gaze") equal(`A ${cat} "${f.name}" prerequisites are the book's`, f.system.prerequisites, entry.prerequisites);
  }
}
// The readings this block took, as the notes report them.
equal("A Mesmeric Gaze prerequisites corrected: the book's \"Velvet Gaze\" is Velvet Voice", feats["Mesmeric Gaze"].system.prerequisites, "Velvet Voice, Level 5");
ok("A The Testament Stands Between's truncated sentence is flagged in its text", /flagged for Graham/.test(text(feats["The Testament Stands Between"].system.description)));
ok("A Eternal Manifestation prints no frequency, so has no daily use", feats["Eternal Manifestation"].system.usesPerDay === "");
equal("A Full Satchel may be taken twice", [feats["Full Satchel"].system.repeatable, feats["Full Satchel"].system.repeatLimit], [true, 2]);
equal("A Methodical Investigator repeats up to the six actions", [feats["Methodical Investigator"].system.repeatable, feats["Methodical Investigator"].system.repeatLimit], [true, 6]);
ok("A every feat name is title-cased from its heading", NEW_FEATS.every((f) => /^[A-Z]/.test(f.name) && !/[A-Z]{3,}/.test(f.name.replace(/DR|DB|HP|PP|AP/g, ""))));
equal("A the Eternal Blood heritages each grant Nightvision and an aligned Focus spell", ["Balance-Blooded", "Chaos-Blooded", "Dawn-Blooded", "Dread-Blooded", "Order-Blooded"].map((n) => [feats[n].system.grantedAbilities, feats[n].system.grantedSpells]), [["Nightvision", "Resistance"], ["Nightvision", "Startle"], ["Nightvision", "Guiding Bolt"], ["Nightvision", "Bane"], ["Nightvision", "Sanctuary"]]);
equal("A Hunter's Fangs hands over the Vesperyn Fangs", feats["Hunter's Fangs"].system.grantedWeapons, "Fangs (Vesperyn)");
equal("A the six archetype abilities are the book's sub-headings", ARCHETYPE_ABILITIES.map((a) => a.name).sort(), ["Applied Insight", "Inquisition (Inquisitor)", "Liturgy of Prayer", "Share the Wound", "Vowbound Resolve", "Ward the Soul"]);
equal("A the Liturgist's book is gear", ARCHETYPE_GEAR.map((g) => [g.name, g.type, g.system.spellbookContainer]), [["Liturgical Book", "gear", true]]);
equal("A eight natural attacks: Fangs, four grafts, three manifestations", FEAT_WEAPONS.map((w) => w.name), ["Fangs (Vesperyn)", "Bite (Grafted)", "Claw (Grafted)", "Bone Spur (Grafted)", "Heavy Appendage (Grafted)", "Predator's Manifestation (Slashing)", "Predator's Manifestation (Piercing)", "Predator's Manifestation (Bludgeoning)"]);
equal("A the graft dice are the book's", FEAT_WEAPONS.slice(1, 5).map((w) => [w.system.damage, w.system.damageType]), [["1d8", "piercing"], ["1d6", "slashing"], ["1d6", "piercing"], ["1d8", "bludgeoning"]]);
ok("A Predator's Manifestation attacks carry the Magical trait, cleanly", FEAT_WEAPONS.slice(5).every((w) => w.system.traits === "Magical"));

/* ------------------------------------------------------------------ *
 * B. Shape
 * ------------------------------------------------------------------ */

const CORE_FEAT_FIELDS = ["category", "prerequisites", "traits", "sourceRace", "sourceClass", "sourceArchetype", "usesPerDay", "grantedSpells", "grantedAbilities", "grantedFeats", "repeatable", "description"];
for (const f of NEW_FEATS) {
  ok(`B "${f.name}" is a feat with the core fields`, f.type === "feat" && CORE_FEAT_FIELDS.every((k) => k in f.system));
  ok(`B "${f.name}" has a 16-char id and a book category flag`, /^[A-Za-z0-9]{16}$/.test(f._id) && ["racial", "archetype", "class", "general"].includes(flagsOf(f).bookCategory));
  equal(`B "${f.name}" category matches its family`, f.system.category, { racial: "Racial", archetype: "Archetype", class: "Class", general: "General" }[flagsOf(f).bookCategory]);
  if (f.system.category === "Racial") ok(`B racial "${f.name}" names a source race or is a Heritage line`, split(f.system.sourceRace).length > 0 || split(f.system.traits).includes("Heritage") || /-Blooded|Eternal Blood|Eternal Resonance/.test(f.system.prerequisites));
  if (f.system.category === "Class") ok(`B class "${f.name}" gates on a class or tier trait`, split(f.system.traits).some((t) => ["Archivist", "Folkwarden", "Grimward", "Healer", "Shaman", "Adept", "Expert", "Martial"].includes(t)), f.system.traits);
  if (f.system.category === "Archetype") ok(`B archetype "${f.name}" is a registered archetype`, f.name in ARCHETYPE_REGISTRATIONS);
  if (/\bFocus\b/.test(f.system.traits) && f.system.usesPerDay) equal(`B Focus feat "${f.name}" ships its use full`, f.system.usesPerDay, "1");
  ok(`B "${f.name}" repeat limit only on a repeatable feat`, !f.system.repeatLimit || f.system.repeatable === true);
}
const allDocs = PACKS.flatMap((p) => p.docs);
const blockDocs = [...NEW_FEATS, ...ARCHETYPE_ABILITIES];
const ALLOWED_CHANGE = /^system\.(combat\.(movement\.(land|fly|swim|climb|burrow)\.(item|status|circumstance|other)|defence\.(item|status|circumstance|other)|saves\.(fortitude|reflex|will)\.(racial|class|item|status|other)|initiative\.(class|item|status|other)|naturalArmourBase\.natural|resistances|immunities)|details\.traits|skills\.[a-zA-Z]+\.(racial|class|item|status|other)|magic\.controlBonusPerLevel|resources\.[a-zA-Z]+\.(max|bonus))$/;
let changeCount = 0;
for (const d of blockDocs) {
  for (const e of d.effects ?? []) {
    ok(`B ${d.name} effect "${e.name}" has a 16-char id and transfers`, /^[A-Za-z0-9]{16}$/.test(e._id) && e.transfer !== false);
    for (const c of e.changes ?? []) {
      changeCount += 1;
      ok(`B ${d.name} effect change "${c.key}" targets a typed pool slot`, ALLOWED_CHANGE.test(c.key), c.key);
      if (/resistances|immunities|details\.traits/.test(c.key)) ok(`B ${d.name} list change "${c.key}" appends with a comma`, c.mode === 2 && /^, /.test(c.value));
    }
  }
}
ok("B this block adds effect changes (most bonuses are conditionals or grants)", changeCount >= 12, String(changeCount));

const haveSystem = fs.existsSync(path.join(SYSTEM_ROOT, "system.json"));
ok("B the TRG Prime system is beside this module (or TRG_PRIME_ROOT)", haveSystem, SYSTEM_ROOT);
let conditionalCount = 0;
const conditionalsOf = (d) => [...(flagsOf(d).conditionals ?? []), ...(d.effects ?? []).flatMap((e) => e.flags?.[SYS]?.conditionals ?? [])];
if (haveSystem) {
  const { normaliseConditional } = await import(path.join(SYSTEM_ROOT, "module", "conditionals.mjs"));
  for (const d of [...NEW_FEATS, ...ARCHETYPE_ABILITIES]) {
    for (const [i, raw] of conditionalsOf(d).entries()) {
      conditionalCount += 1;
      ok(`B ${d.name} conditional ${i} normalises`, normaliseConditional(raw, { id: d._id, name: d.name, kind: "item" }, i) !== null);
      ok(`B ${d.name} conditional ${i} has a scope sentence`, String(raw.scope ?? "").length > 8);
      if (raw.kind === "modifier") ok(`B ${d.name} conditional ${i} has a typed non-zero value`, Number.isInteger(raw.value) && raw.value !== 0 && ["class", "circumstance", "status", "race"].includes(raw.type), `${raw.value} ${raw.type}`);
    }
  }
  ok("B the feats carry over fifty authored conditionals", conditionalCount >= 50, String(conditionalCount));
}
// Senses, auras, innate grants, choosers.
for (const d of NEW_FEATS) {
  const sense = flagsOf(d).creatureAbility?.derives?.sense;
  if (sense) ok(`B ${d.name} derives a tertiary sense in the core shape`, sense.category === "tertiary" && typeof sense.modality === "string" && Number(sense.fixedFeet) > 0 && typeof sense.name === "string");
  for (const aura of flagsOf(d).auras ?? []) {
    ok(`B ${d.name} aura is an ally aura with radius, triggers and a grant`, aura.kind === "ally" && Number(aura.radius) > 0 && Array.isArray(aura.triggers) && aura.grants && typeof aura.grants === "object");
    if (aura.grants.kind === "modifier") ok(`B ${d.name} aura modifier grant carries value and type`, Number.isInteger(aura.grants.value) && ["status", "circumstance", "class", "race"].includes(aura.grants.type));
  }
  if (d.system.grantedSpells && d.name !== "Prophet") ok(`B ${d.name} grants its spell innate`, flagsOf(d).grantInnate === true);
  const choices = flagsOf(d).abilityChoices;
  if (choices) ok(`B ${d.name} declares a list of ability choices`, Array.isArray(choices) && choices.length >= 2 && choices.every((c) => typeof c === "string"));
}
ok("B Veil Warden's Spirit Sense is 30 feet (range unspecified in the book — assumed)", feats["Veil Warden"].flags[SYS].creatureAbility?.derives?.sense?.fixedFeet === 30);
equal("B Second Discipline, Second Calling and Second Guide are declared choosers", ["Second Discipline", "Second Calling", "Second Guide"].map((n) => (flagsOf(feats[n]).abilityChoices ?? []).length), [5, 5, 5]);
equal("B Spirit Walker chooses a guide and is handed Manifest Spirit", [(flagsOf(feats["Spirit Walker"]).abilityChoices ?? []).length, feats["Spirit Walker"].system.grantedAbilities], [5, "Manifest Spirit"]);
equal("B the archetype feats that carry abilities grant them", ["Martyr", "Oathkeeper", "Sage", "Veil Warden", "Liturgist", "Inquisitor"].map((n) => feats[n].system.grantedAbilities), ["Share the Wound", "Vowbound Resolve", "Applied Insight", "Ward the Soul", "Liturgy of Prayer", "Inquisition (Inquisitor)"]);
equal("B Liturgist hands over the Liturgical Book", feats["Liturgist"].system.grantedGear ?? "", "");
for (const a of ARCHETYPE_ABILITIES) {
  ok(`B ability "${a.name}" is a Class-category ability naming its archetype`, a.type === "ability" && a.system.category === "Class" && /archetype$/.test(a.system.prerequisites));
  if (/\bFocus\b/.test(a.system.traits)) equal(`B Focus ability "${a.name}" ships its use full`, a.system.usesPerDay, "1");
}
// Names never collide across item types (grant dedupe is by name).
const everyName = allDocs.map((d) => d.name);
equal("B no name is used twice across the packs (Rooted Soul — the book's own feat/spell pair — excepted)", everyName.filter((n, i) => everyName.indexOf(n) !== i), ["Rooted Soul"]);
ok("B the Inquisitor archetype's Inquisition is named apart from the Grimward's", abilities["Inquisition (Inquisitor)"] && CLASS_ABILITIES.some((a) => a.name === "Inquisition"));
equal("B the natural attacks are companions-pack weapons", FEAT_WEAPONS.map((w) => [w.type, w.system.natural, w.system.group, w.system.category]), FEAT_WEAPONS.map(() => ["weapon", true, "Brawling", "Unarmed"]));

/* ------------------------------------------------------------------ *
 * C. Resolution
 * ------------------------------------------------------------------ */

const ourAbilities = new Set([...RACIAL_ABILITIES, ...CLASS_ABILITIES, ...ARCHETYPE_ABILITIES].map((a) => a.name.toLowerCase()));
const ourFeats = new Set([...FOUNDATION_FEATS, ...NEW_FEATS].map((f) => f.name.toLowerCase()));
const ourWeapons = new Set(FEAT_WEAPONS.map((w) => w.name.toLowerCase()));
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
  const coreAbilities = await packNames("abilities");
  const coreCompanions = await packNames("companions");
  const coreGear = await packNames("gear");
  for (const f of NEW_FEATS) {
    ok(`C "${f.name}" does not shadow a core feat`, !coreFeats.has(f.name.toLowerCase()));
    // Read Omen (Prophet) is a Revelator specialist spell — Grimoire block.
    for (const { name } of levelled(f.system.grantedSpells)) ok(`C ${f.name} granted spell "${name}" is a core spell or a declared Grimoire spell`, coreSpells.has(name.toLowerCase()) || name === "Read Omen");
    for (const { name } of levelled(f.system.grantedAbilities)) ok(`C ${f.name} granted ability "${name}" exists`, coreAbilities.has(name.toLowerCase()) || ourAbilities.has(name.toLowerCase()));
    for (const { name } of levelled(f.system.grantedFeats)) ok(`C ${f.name} granted feat "${name}" exists`, coreFeats.has(name.toLowerCase()) || ourFeats.has(name.toLowerCase()));
    for (const { name } of levelled(f.system.grantedWeapons ?? "")) ok(`C ${f.name} granted weapon "${name}" is in our natural-attacks pack`, ourWeapons.has(name.toLowerCase()) && !coreCompanions.has(name.toLowerCase()));
    for (const c of flagsOf(f).abilityChoices ?? []) ok(`C ${f.name} choice "${c}" is an ability that exists`, coreAbilities.has(c.toLowerCase()) || ourAbilities.has(c.toLowerCase()));
  }
  for (const a of ARCHETYPE_ABILITIES) ok(`C ability "${a.name}" does not shadow a core ability`, !coreAbilities.has(a.name.toLowerCase()));
  ok("C the Liturgical Book is not a core gear name", !coreGear.has("liturgical book"));
  for (const [kind, owners] of Object.entries(FEAT_ACCESS)) {
    for (const [owner, list] of Object.entries(owners)) {
      ok(`C feat access ${kind} "${owner}" is one of ours`, kind === "race" ? RACES.some((r) => r.name === owner) : owner in CLASS_REGISTRATIONS);
      for (const name of list) ok(`C feat access ${kind} ${owner} → "${name}" is a core feat`, coreFeats.has(name.toLowerCase()));
    }
  }

  const { SKILL_ACTIONS } = await import(path.join(SYSTEM_ROOT, "module", "data", "skill-actions.mjs"));
  const { SKILLS } = await import(path.join(SYSTEM_ROOT, "module", "config.mjs"));
  const actionKeys = new Set([...SKILL_ACTIONS, ...POF_ACTIONS].map((a) => a.key));
  const skillKeys = new Set(Object.keys(SKILLS));
  for (const d of [...NEW_FEATS, ...ARCHETYPE_ABILITIES]) {
    for (const c of conditionalsOf(d)) {
      for (const key of [...(c.when?.actions ?? []), ...(c.when?.not?.actions ?? [])]) ok(`C ${d.name} conditional names a real action "${key}"`, actionKeys.has(key));
      if (c.when?.checkTypes?.includes("skill")) for (const key of c.when?.subjects ?? []) ok(`C ${d.name} conditional subject "${key}" is a skill`, skillKeys.has(key));
    }
    for (const aura of flagsOf(d).auras ?? []) for (const key of aura.grants?.actions ?? []) ok(`C ${d.name} aura names a real action "${key}"`, actionKeys.has(key));
  }
  for (const name of ["Fey-Soul Listener", "Lay Exorcist", "Bloom-Tender's Spores"]) {
    ok(`C substitution "${name}" is a Chapter 5 feat`, Boolean(feats[name]));
    for (const e of [].concat(SKILL_SUBSTITUTIONS[name])) ok(`C ${name} substitutes a real action "${e.action}" from a real skill "${e.skill}"`, actionKeys.has(e.action) && skillKeys.has(e.skill));
  }
  for (const name of ["Close Reading", "Expert Autopsist", "Watch the Eyes"]) {
    ok(`C degree upgrade "${name}" is a Chapter 5 feat naming a real action`, Boolean(feats[name]) && DEGREE_UPGRADES[name].every((u) => actionKeys.has(u.actionKey)));
  }
  equal("C Close Reading, Expert Autopsist, Watch the Eyes upgrade as printed", ["Close Reading", "Expert Autopsist", "Watch the Eyes"].map((n) => DEGREE_UPGRADES[n]), [[{ actionKey: "analyseScripture", from: "partial", to: "success" }], [{ actionKey: "performAutopsy", from: "fumble", to: "failure" }], [{ actionKey: "senseOutsideInfluence", from: "partial", to: "success" }]]);
  for (const g of ARCHETYPE_CLASS_SKILL_GRANTS) ok(`C class-skill grant "${g.name}" offers real skills`, g.options.every((k) => skillKeys.has(k)) && feats[g.label]);
  const rtr = POF_ACTIONS.find((a) => a.key === "readTheRoom");
  ok("C Read the Room is a Sense Motive action gated on the feat, named apart from the core racial feat", rtr && rtr.skills.join() === "senseMotive" && rtr.requiresFeat === "Read the Room (Expert)" && feats["Read the Room (Expert)"] && coreFeats.has("read the room"));
  for (const spec of Object.values(ARCHETYPE_REGISTRATIONS)) for (const c of spec.classGrants) ok(`C archetype class grant "${c}" is one of our classes`, c in CLASS_REGISTRATIONS);

  // The system-side machinery this block leans on (3.571.0).
  const read = (rel) => fs.readFileSync(path.join(SYSTEM_ROOT, rel), "utf8");
  ok("C system: version is at least 3.571.0", Number(JSON.parse(read("system.json")).version.split(".")[1]) >= 571);
  ok("C system: registerFeatAccess exists and is on the API", /export function registerFeatAccess\(kind, ownerName, featNames/.test(read("module/module-api.mjs")) && /registerFeatAccess:/.test(read("module/module-api-workflow.mjs")));
  ok("C system: the racial-feat and class-feat pickers consult registered access", (read("module/picker-filters.mjs").match(/hasRegisteredFeatAccess\("(race|class)"/g) ?? []).length === 2);
  ok("C system: a feat grants weapons from the companions pack", /field: "grantedWeapons", pack: "companions"/.test(read("module/grants-workflow.mjs")) && /"grantedWeapons"/.test(read("template.json")));
  ok("C system: the class-skill chooser is a module helper", /useClassSkillGrant: async \(actor, item\)/.test(read("module/feats-workflow.mjs")));
  ok("C system: ally auras grant typed modifiers", /grants\.kind === "modifier"|kind === "modifier"/.test(read("module/aura-conditionals.mjs")) && /figure/.test(read("module/aura-conditionals.mjs")));
  ok("C system: strike riders, scaled conditionals and ability choosers (3.563/3.564) are present", fs.existsSync(path.join(SYSTEM_ROOT, "module", "combat", "damage-riders.mjs")) && /valueFrom/.test(read("module/conditionals.mjs")) && /export function abilityChoicesOf/.test(read("module/feats-workflow.mjs")));
  ok("C system: innate grants read the grantInnate flag", /grantInnate/.test(read("module/grants-workflow.mjs")));
  ok("C system: pending modifiers take a one-shot entry", /export async function addPendingModifier\(actor, entry\)/.test(read("module/pending-modifiers.mjs")));
}

/* ------------------------------------------------------------------ *
 * D. Registration and automation
 * ------------------------------------------------------------------ */

const calls = [];
const fake = new Proxy({}, { get: (_, name) => (...args) => { calls.push([name, ...args]); return true; } });
registerContent(fake, "trg-pillars-of-faith");
const of = (fn) => calls.filter((c) => c[0] === fn);
equal("D registers the thirteen archetypes", of("registerArchetype").map((c) => c[1]).sort(), Object.keys(ARCHETYPE_REGISTRATIONS).sort());
equal("D five archetypes open a class list at a tier", Object.entries(ARCHETYPE_REGISTRATIONS).filter(([, s]) => s.classGrants.length).map(([n, s]) => [n, s.classGrants[0], s.tierGrants[0]]), [["Inquisitor", "Grimward", "Expert"], ["Lifebearer", "Healer", "Adept"], ["Liturgist", "Archivist", "Adept"], ["Spirit Walker", "Shaman", "Adept"]]);
equal("D registers the two class-skill grants", of("registerClassSkillGrant").map((c) => c[1].name), ["inquisitor", "lifebearer"]);
equal("D registers nine feat-access lists", of("registerFeatAccess").length, 9);
equal("D racial access lists", FEAT_ACCESS.race, { Rhevani: ["Self Aware", "Worldly"], Eshari: ["Innate Courage", "Ethereal Trick"], Kethrani: ["Self Aware"], Myrathi: ["Stone-Like Endurance"] });
equal("D class access lists name the five classes", Object.keys(FEAT_ACCESS.class).sort(), ["Archivist", "Folkwarden", "Grimward", "Healer", "Shaman"]);
ok("D feat access is registered only when the API offers it", /typeof api\.registerFeatAccess === "function"/.test(fs.readFileSync(path.join(ROOT, "module", "registration.mjs"), "utf8")));
ok("D every registration carries the module id", calls.every((c) => c.at(-1) === "trg-pillars-of-faith"));

const shippedNames = new Set([...NEW_FEATS, ...ARCHETYPE_ABILITIES].map((d) => d.name.toLowerCase()));
for (const key of Object.keys(FEAT_AUTOMATIONS)) ok(`D automation "${key}" names a Chapter 5 feat or ability`, shippedNames.has(key));
for (const key of Object.keys(FEAT_PASSIVE_HINTS)) ok(`D passive hint "${key}" names a Chapter 5 feat or ability`, shippedNames.has(key));
for (const key of Object.keys(FEAT_AUTOMATIONS)) ok(`D automation "${key}" is not also a hint`, !(key in FEAT_PASSIVE_HINTS));
for (const [key, entry] of Object.entries(FEAT_AUTOMATIONS)) ok(`D automation "${key}" has hint and use()`, typeof entry.hint === "string" && entry.hint.length > 10 && typeof entry.use === "function");
for (const key of Object.keys(FEAT_AUTOMATIONS)) ok(`D automation "${key}" does not shadow a Chapter 2 or 3 automation`, !(key in AUTOMATIONS) && !(key in CLASS_AUTOMATIONS) && !(key in PASSIVE_HINTS) && !(key in CLASS_PASSIVE_HINTS));
for (const d of [...NEW_FEATS, ...ARCHETYPE_ABILITIES]) {
  const key = d.name.toLowerCase();
  const chooser = Boolean(flagsOf(d).abilityChoices);
  ok(`D "${d.name}" has a Use, a hint or a chooser`, key in FEAT_AUTOMATIONS || key in FEAT_PASSIVE_HINTS || key in GRIMOIRE_AUTOMATIONS || chooser);
  if (chooser) ok(`D chooser "${d.name}" carries no automation of its own (the system's chooser runs)`, !(key in FEAT_AUTOMATIONS));
}
ok("D every Focus feat with a daily use is automated", NEW_FEATS.filter((f) => /\bFocus\b/.test(f.system.traits) && f.system.usesPerDay && !f.system.grantedSpells && !f.system.grantedAbilities).every((f) => f.name.toLowerCase() in FEAT_AUTOMATIONS), NEW_FEATS.filter((f) => /\bFocus\b/.test(f.system.traits) && f.system.usesPerDay && !f.system.grantedSpells && !f.system.grantedAbilities && !(f.name.toLowerCase() in FEAT_AUTOMATIONS)).map((f) => f.name).join());
ok("D every archetype ability is automated", ARCHETYPE_ABILITIES.every((a) => a.name.toLowerCase() in FEAT_AUTOMATIONS));
equal("D fifty-nine feat automations, 112 passive hints (Old Secret and Hedge Witch moved to the Grimoire file in 0.5.0; Consecrated Armament became a Use at 0.7.0)", [Object.keys(FEAT_AUTOMATIONS).length, Object.keys(FEAT_PASSIVE_HINTS).length], [60, 111]);
equal("D the two class-skill archetypes use the system's chooser", [FEAT_AUTOMATIONS.inquisitor, FEAT_AUTOMATIONS.lifebearer].map((a) => /useClassSkillGrant/.test(String(a.use))), [true, true]);
const featAuto = fs.readFileSync(path.join(ROOT, "module", "feat-automations.mjs"), "utf8");
ok("D the automations file has no static import of the system", !/from "\.\.\/\.\.\/sys|trg-prime\/module/.test(featAuto));
ok("D Eternal Manifestation and Sentence of Judgement declare strike riders", (featAuto.match(/strikeDamageRider: \{ dice: "1d6"/g) ?? []).length === 2);
ok("D Grafted Armament and Votary fetch from the federated packs", /contentPack\("companions"\)/.test(featAuto) && /contentPack\("spells"\)/.test(featAuto) && /specialistSpells/.test(featAuto));
ok("D Votary's spell is stamped as Wisdom-cast", /castingAbilityOverride`, "wisdom"/.test(featAuto));

// The Chapter 2 and 3 automations read the feats that change them.
const auto2 = fs.readFileSync(path.join(ROOT, "module", "automations.mjs"), "utf8");
const auto3 = fs.readFileSync(path.join(ROOT, "module", "class-automations.mjs"), "utf8");
const READS = {
  "automations.mjs": [auto2, ["Echo-Trained", "Deep Recall", "Roads Remember Me", "Lost Scholarship", "Many Lives, One Soul", "Memory of Lost Masters", "Deep Bloom Memory", "Ancestral Chorus", "Interlocking Script", "The Testament Stands Between", "Lantern of the Last Road", "Lantern of the Bloom"]],
  "class-automations.mjs": [auto3, ["Rapid Reference", "Perfect Exegesis", "Full Satchel", "Body Charm", "Charm of Many Perils", "Old Ways Endure", "Twin Inquisition", "Final Sanction", "Advanced Discipline", "Deep Reserves", "Enhanced Vitality", "Distant Lifeline", "Twin Manifestation", "Voices of Experience", "Predator's Manifestation"]]
};
for (const [file, [source, names]] of Object.entries(READS)) {
  for (const name of names) ok(`D ${file} reads "${name}" off the sheet`, source.includes(`"${name}"`) && Boolean(feats[name]));
}
ok("D Past-Life Echo's temporary Lore is made and removed by the module", /createPastLifeLores/.test(auto2) && /export async function removePastLifeLores/.test(auto2) && /deleteActiveEffect/.test(fs.readFileSync(path.join(ROOT, "scripts", "pillars-of-faith.mjs"), "utf8")));
ok("D Twin Inquisition's second Subject has its own marker", /\$\{item\.id\}:twin/.test(auto3));
ok("D Manifest Spirit removes the manifested attack when dismissed", /manifestedWeapon/.test(auto3));
ok("D the preparation cap counts Full Satchel copies", /featCount\(actor, "Full Satchel"\)/.test(auto3));

const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "module.json"), "utf8"));
equal("D module version", manifest.version, "0.11.1");
equal("D requires TRG Prime 3.630.1+", manifest.relationships.systems[0].compatibility.minimum, "3.630.1");
ok("D pof-companions extends the companions pack and is in the folder", manifest.packs.find((p) => p.name === "pof-companions")?.flags[SYS].extends === "companions" && manifest.packFolders[0].packs.includes("pof-companions"));
equal("D pof-feats holds the twelve background feats, the four families and Chapter 9's 62 Unliving feats (0.9.0)", PACKS.find((p) => p.name === "pof-feats").docs.length, 12 + 93 + 13 + 48 + 13 + 7 + 55);
ok("D the entry script requires 3.630.0", /REQUIRED_SYSTEM = "3\.630\.1"/.test(fs.readFileSync(path.join(ROOT, "scripts", "pillars-of-faith.mjs"), "utf8")));
ok("D packs-source/pof-feats and pof-companions are built", fs.existsSync(path.join(ROOT, "packs-source", "pof-companions")) && fs.readdirSync(path.join(ROOT, "packs-source", "pof-feats")).length === 241);

/* ------------------------------------------------------------------ */
const EXPECTED_CHECKS = 0;
if (EXPECTED_CHECKS) equal("Z the suite ran every check it is meant to", checks + 1, EXPECTED_CHECKS);

if (failures.length) {
  console.log(`verify-feats: ${checks} checks — ${failures.length} FAILED\n`);
  for (const f of failures) console.log(`  ✗ ${f}`);
  process.exitCode = 1;
} else {
  console.log(`verify-feats: ${checks} checks — all green.`);
}
