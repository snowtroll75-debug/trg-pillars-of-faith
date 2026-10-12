#!/usr/bin/env node
/**
 * verify-grimoire — Pillars of Faith, Chapter 7 (Divine Aspects) and
 * Chapter 10 (the Grimoire), checked against the book and against the
 * system that will read them.
 *
 *   node tools/verify-grimoire.mjs
 *
 * SECTIONS
 *   A  Transcription: every aspect heading and every spell heading in
 *      the extracted text ships exactly once; each item carries the
 *      printed traits, fields, body, warps and caster-level lines; the
 *      few readings this block took are the ones the notes say.
 *   B  Shape: the aspect fields the system derives from (class skill,
 *      favoured weapon, levelled bonus spells, the specialist list, the
 *      ethics flag) are in the core shape; every spell field the cast
 *      workflow reads is present and typed as the core pack types it;
 *      every effect row is a kind the applier handles with the fields
 *      that kind reads; every spell conditional normalises; every warp
 *      mod is a key the warp arithmetic knows; conditions exist.
 *   C  Resolution: every spell an aspect names is in the core pack (or
 *      ours); favoured weapons are weapon groups or names the pack
 *      has; the class abilities' specialist grants resolve now; the
 *      system machinery (3.572.0 group match, federation) is present.
 *   D  Registration and automation: the two PP 1 choosers and the two
 *      feats that moved here; the manifest and packs.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SYSTEM_ROOT = process.env.TRG_PRIME_ROOT ?? path.resolve(ROOT, "..", "..", "sys", "trg-prime");

let checks = 0;
const failures = [];
function ok(label, condition, detail = "") { checks += 1; if (!condition) failures.push(`${label}${detail ? ` — ${detail}` : ""}`); }
function equal(label, actual, expected) { ok(label, JSON.stringify(actual) === JSON.stringify(expected), `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`); }
const SYS = "trg-prime";
const split = (s) => String(s ?? "").split(",").map((x) => x.trim()).filter(Boolean);
const levelled = (s) => split(s).map((e) => { const at = e.indexOf(":"); return at < 0 ? { level: 1, name: e } : { level: Number(e.slice(0, at)), name: e.slice(at + 1).trim() }; });
const key = (s) => String(s ?? "").replace(/[’‘']/g, "").trim().toLowerCase();

const { ASPECT_TEXT, DIVINE_ASPECTS, specialistNames, bonusSpellList } = await import("./content/aspects.mjs");
const { SPELL_TEXT, GRIMOIRE_SPELLS, ORDINARY_SPELLS, SPECIALIST_SPELLS, BORROWED_SPELLS, parseCast, parseTraitLine } = await import("./content/spells.mjs");
const { PACKS, SPELLS: FOUNDATION_SPELLS } = await import("./content/foundation.mjs");
const { CLASSES, CLASS_ABILITIES } = await import("./content/classes.mjs");
const { registerContent } = await import("../module/registration.mjs");
const { GRIMOIRE_AUTOMATIONS, GRIMOIRE_PASSIVE_HINTS } = await import("../module/grimoire-automations.mjs");
const { FEAT_AUTOMATIONS, FEAT_PASSIVE_HINTS } = await import("../module/feat-automations.mjs");
const spells = Object.fromEntries(GRIMOIRE_SPELLS.map((s) => [s.name, s]));
const aspects = Object.fromEntries(DIVINE_ASPECTS.map((a) => [a.name, a]));

/* ------------------------------------------------------------------ *
 * A. Transcription
 * ------------------------------------------------------------------ */

equal("A twenty-two aspects extracted and shipped", [Object.keys(ASPECT_TEXT).length, DIVINE_ASPECTS.length], [22, 22]);
equal("A the aspects in print order", DIVINE_ASPECTS.map((a) => a.name), ["Ancestors", "Beauty", "Decadence", "Endurance", "Fellowship", "Harvest", "Knowledge", "Life", "Mercy", "Moon", "Oaths", "Oblivion", "Oceans", "Pain", "Pilgrimage", "Protection", "Purification", "Revelation", "Sacrifice", "Undeath", "The Veil", "Wrath"]);
for (const [heading, entry] of Object.entries(ASPECT_TEXT)) {
  const a = DIVINE_ASPECTS.find((x) => x.name.toUpperCase() === heading);
  ok(`A aspect "${heading}" ships`, Boolean(a));
  if (!a) continue;
  equal(`A ${a.name} edicts, anathema, ethics, skill and weapon are the book's`, [a.system.edicts, a.system.anathema, a.system.suggestedEthics, a.system.classSkill, a.system.favouredWeapon], [entry.Edicts, entry.Anathema, entry["Suggested Ethics"], entry["Class Skill"], entry["Favoured Weapon"]]);
  equal(`A ${a.name} traits are the printed alignment line`, a.system.traits.toUpperCase().replace(/, /g, " "), entry.traits);
  equal(`A ${a.name} specialist list is the eight printed names`, split(a.system.specialistSpells).length, 8);
  ok(`A ${a.name} bonus spells are the four printed, levelled`, levelled(a.system.bonusSpells).length === 4 && levelled(a.system.bonusSpells).every((b) => b.level >= 1 && b.name));
  ok(`A ${a.name} description opens with the book's first sentence`, a.system.description.startsWith(entry.description[0].slice(0, 40)));
}
equal("A a printed (0) bonus-spell level is read as 1st", bonusSpellList("Guidance (0); Dead Tongue (2)"), "1: Guidance, 2: Dead Tongue");
equal("A the specialist list drops its (1)/(7) markers", specialistNames("Banish Fatigue (1), Unity (7)"), ["Banish Fatigue", "Unity"]);

equal("A sixty-five spells extracted: 21 ordinary, 44 specialist", [Object.keys(SPELL_TEXT).length, Object.values(SPELL_TEXT).filter((s) => s.section === "specialist").length], [65, 44]);
equal("A sixty-five spells shipped: 21 ordinary, 44 specialist", [GRIMOIRE_SPELLS.length, ORDINARY_SPELLS.length, SPECIALIST_SPELLS.length], [65, 21, 44]);
equal("A the specialist spells by class", Object.fromEntries(Object.entries(SPECIALIST_SPELLS.reduce((m, s) => { m[s.system.specialistClass] = (m[s.system.specialistClass] ?? 0) + 1; return m; }, {})).sort()), { Archivist: 10, Cleric: 2, Druid: 1, Folkwarden: 10, Grimward: 6, Healer: 5, Shaman: 10 });
for (const [heading, entry] of Object.entries(SPELL_TEXT)) {
  const s = GRIMOIRE_SPELLS.find((x) => x.name.toUpperCase().replace(/’/g, "'") === heading);
  ok(`A spell "${heading}" ships once`, s && GRIMOIRE_SPELLS.filter((x) => x.name === s.name).length === 1);
  if (!s) continue;
  equal(`A ${s.name} PP is the book's`, s.system.ppCost, entry.pp);
  const tl = parseTraitLine(entry.traits);
  equal(`A ${s.name} traits are the printed line less category and class`, s.system.traits, tl.traits);
  equal(`A ${s.name} category is the printed one`, s.system.category, tl.category);
  const f = entry.fields;
  // ONE READING (0.11.0): Threshold Ward's opening is drawn as a 20-foot line
  // so the cast places a Region the crossing save can watch; the book's
  // words follow in brackets.
  const bookArea = s.name === "Threshold Ward" ? `20-foot line (${f.Area})` : (f.Area ?? "");
  equal(`A ${s.name} cast, range, area, targets, save are the book's`, [s.system.castAP, s.system.range, s.system.area, s.system.targets, s.system.defence], [parseCast(f.Cast).castAP, f.Range ?? "", bookArea, f.Targets ?? f.Target ?? "", f["Saving Throw"] ?? ""]);
  ok(`A ${s.name} duration is the book's`, /^sustained/i.test(f.Duration ?? "") ? s.system.sustained && /^Sustained/.test(s.system.duration) : s.system.duration === (f.Duration ?? ""));
  ok(`A ${s.name} components are the bracketed ones`, ["somatic", "verbal", "material"].every((c) => s.system.components[c] === new RegExp(c).test(f.Cast)));
  ok(`A ${s.name} tradition is the book's (none for a specialist)`, s.system.specialist ? s.system.tradition === "" && s.system.specialistClass === tl.specialistClass : s.system.tradition === f.Tradition);
  equal(`A ${s.name} warps are the printed ones, in order`, s.system.warps.map((w) => [w.ppCost, w.text]), entry.warps.map((w) => [w.pp, w.text.replace(/\.$/, "")]));
  equal(`A ${s.name} caster-level lines are the printed ones`, s.system.casterLevelMods.map((c) => [c.threshold, c.text]), entry.casterLevel.map((c) => [c.cl, c.text]));
  ok(`A ${s.name} description carries the body`, entry.body.every((b) => s.system.description.includes(b)));
  if (f.Trigger) ok(`A ${s.name} carries its trigger`, s.system.description.includes(`Trigger: ${f.Trigger}`) && s.system.castAP === "Reaction");
}
equal("A Spirit Rebuke: the text's 2d6 is shipped over the stat line's 1d6 (flagged)", [spells["Spirit Rebuke"].system.damage.formula, spells["Spirit Rebuke"].system.baseDamage, SPELL_TEXT["SPIRIT REBUKE"].fields["Base Damage"]], ["2d6", "2d6", "1d6"]);
ok("A the Healer's Touch of Healing is not in this chapter (it is Eldritch Arts', carried as a borrowed spell)", !spells["Touch of Healing"]);
// Borrowed from Eldritch Arts (0.5.1), text from Graham 18 Sep 2026.
equal("A two borrowed Eldritch Arts spells: Touch of Healing (Healer specialist, PP 1) and Symbol of Pain (PP 12 Fortitude save)", BORROWED_SPELLS.map((s) => [s.name, s.system.ppCost, s.system.specialist, s.system.specialistClass, s.system.defence, s.system.tradition]), [["Touch of Healing", 1, true, "Healer", "", ""], ["Symbol of Pain", 12, false, "", "Fortitude", "arcane, divinity"]]);
ok("A the borrowed spells are flagged with their source so they can leave when Eldritch Arts ships", BORROWED_SPELLS.every((s) => s.flags[SYS].borrowedFrom === "Eldritch Arts" && /Eldritch Arts/.test(s.system.description)));
equal("A Touch of Healing heals 2d6 with a +1d6 warp and asks for neither component (somatic OR verbal)", [BORROWED_SPELLS[0].system.effects[0], BORROWED_SPELLS[0].system.warps[0]?.mods, BORROWED_SPELLS[0].system.components.somatic, BORROWED_SPELLS[0].system.components.verbal], [{ kind: "heal", target: "targets", formula: "2d6" }, { healDice: "1d6" }, false, false]);
equal("A Symbol of Pain: Injured 2 on a Failure, 4 on a Fumble", BORROWED_SPELLS[1].system.effects.filter((e) => e.kind === "condition").map((e) => [e.value, e.onSave.join("+")]), [[2, "failure"], [4, "fumble+blunder"]]);

/* ------------------------------------------------------------------ *
 * B. Shape
 * ------------------------------------------------------------------ */

const CORE_ASPECT_FIELDS = ["source", "category", "tier", "level", "prerequisites", "active", "description", "traits", "edicts", "anathema", "suggestedEthics", "classSkill", "favouredWeapon", "specialistSpells", "bonusSpells"];
for (const a of DIVINE_ASPECTS) {
  ok(`B ${a.name} is a divine-aspect with the core fields`, a.type === "divine-aspect" && CORE_ASPECT_FIELDS.every((k) => k in a.system) && /^[A-Za-z0-9]{16}$/.test(a._id));
  equal(`B ${a.name} ethics flag is the list the card reads`, a.flags[SYS].suggestedEthics, split(a.system.suggestedEthics));
  ok(`B ${a.name} traits are alignment words`, split(a.system.traits).every((t) => ["Balance", "Chaos", "Evil", "Good", "Order"].includes(t)));
}
const CORE_SPELL_FIELDS = ["tradition", "category", "level", "ppCost", "castAP", "range", "area", "targets", "duration", "defence", "baseDamage", "damage", "casterLevelMods", "effects", "warps", "apOptions", "prepared", "sustained", "sustainType", "areaTargeting", "specialist", "specialistClass", "innate", "usesPerDay", "bonusUses", "usesValue", "components", "traits", "description"];
const haveSystem = fs.existsSync(path.join(SYSTEM_ROOT, "system.json"));
ok("B the TRG Prime system is beside this module (or TRG_PRIME_ROOT)", haveSystem, SYSTEM_ROOT);
const { HANDLED_EFFECT_KINDS } = haveSystem ? await import(path.join(SYSTEM_ROOT, "module", "magic", "effect-kinds.mjs")) : { HANDLED_EFFECT_KINDS: [] };
const { CONDITIONS } = haveSystem ? await import(path.join(SYSTEM_ROOT, "module", "conditions", "registry.mjs")) : { CONDITIONS: {} };
const { normaliseConditional } = haveSystem ? await import(path.join(SYSTEM_ROOT, "module", "conditionals.mjs")) : {};
const { normaliseSpellConditional } = haveSystem ? await import(path.join(SYSTEM_ROOT, "module", "magic", "spell-conditional.mjs")) : {};
const WARP_MODS = new Set(["damageDice", "persistent", "bonusValue", "bonusMax", "saveDC", "traitPicks", "durationText", "freezeMembership", "areaGrowth", "areaMax", "conjuredLevel", "conjuredBase", "areaOverride", "areaTargetingOverride", "weaponDamageBonus", "morphForms", "storedReleaseReaction", "storedReleaseFree", "absorbConditions", "reduceBleed", "terrainInAir", "allSlots", "bleedPoints", "bleedAndHeal", "reliefConditions", "reliefBump", "suppressConditions", "suppressBump", "suppressMax", "castApSet", "castApDelta", "rangeOverride", "targetCap", "rowExtra", "healDice", "healBonus", "endsSustain", "weaponCategories", "retargetSelfRows", "shareSelfRows", "potencyStep", "potencyMax", "targetCapPerLevel", "extraConditionals", "extraTraditions", "extraTargets", "weapons", "rerollDegrees", "rerollBonus", "once",
  // 3.629.0: a haunt's suppression, longer (Still the Haunt, Quarantine Working).
  "perilSuppress",
  // 3.630.0: one more pick, a counted benefit, one more Portent, a re-save
  // modifier — and the row a warp unlocks (Nine-Herb Restorative's second benefit).
  "choiceExtra", "declareUses", "heldUses", "resaveModifier", "unlocks"]);
const TARGETS = new Set(["self", "targets", "allies", "area"]);
let effectRows = 0, conditionalRows = 0, modded = 0;
for (const s of [...GRIMOIRE_SPELLS, ...BORROWED_SPELLS]) {
  ok(`B ${s.name} is a spell with the core fields`, s.type === "spell" && CORE_SPELL_FIELDS.every((k) => k in s.system) && /^[A-Za-z0-9]{16}$/.test(s._id));
  ok(`B ${s.name} castAP is a number, "Reaction" or a printed time`, typeof s.system.castAP === "number" || s.system.castAP === "Reaction" || /^\d+ (minute|minutes|hour)s?$/.test(s.system.castAP));
  ok(`B ${s.name} has at least one effect row (a note at least)`, s.system.effects.length >= 1);
  ok(`B ${s.name} save spells name a save; the rest name none`, s.system.category === "save" ? ["Will", "Fortitude", "Reflex"].includes(s.system.defence) : true);
  if (s.system.category === "attack") ok(`B ${s.name} attack spell carries damage on system.damage and NO damage row (it would apply twice)`, s.system.damage.formula && s.system.damage.type && !s.system.effects.some((e) => e.kind === "damage"));
  for (const [i, e] of s.system.effects.entries()) {
    effectRows += 1;
    if (haveSystem) ok(`B ${s.name} effect ${i} "${e.kind}" is a kind the applier handles`, HANDLED_EFFECT_KINDS.includes(e.kind));
    if (e.kind !== "note") ok(`B ${s.name} effect ${i} names a target`, TARGETS.has(e.target));
    if (e.kind === "condition") ok(`B ${s.name} effect ${i} names a real condition`, e.condition in CONDITIONS);
    // A ROLLED AMOUNT IS AN AMOUNT (0.11.0, TRG Prime 3.630.0): Nine-Herb Restorative's 1d6.
    if (e.kind === "suppress" || e.kind === "conditionRelief") ok(`B ${s.name} effect ${i} relieves a real condition by an amount`, e.condition in CONDITIONS && (Number(e.amount) > 0 || /^\d*d\d+$/.test(String(e.amount ?? ""))) && e.label);
    if (e.kind === "bonus") ok(`B ${s.name} effect ${i} bonus has a slot or a choice, a type and a value`, (e.slot || e.chooseFrom) && e.bonusType && Number.isInteger(e.value) && e.value !== 0);
    if (e.kind === "heal" || e.kind === "tempHP") ok(`B ${s.name} effect ${i} has a dice formula`, /^\d+d\d+/.test(e.formula));
    if (e.kind === "defence") ok(`B ${s.name} effect ${i} defence names a field and a value`, ["immunity", "resistance", "weakness"].includes(e.field) && e.value);
    if (e.kind === "damage") ok(`B ${s.name} effect ${i} damage has formula and type`, /^\d+d\d+/.test(e.formula) && e.damageType);
    if (e.kind === "sense") ok(`B ${s.name} effect ${i} sense is tertiary with what it detects`, e.category === "tertiary" && e.detects && e.rollWith);
    // 0.7.0 — the 3.625.0 rows: a save-reroll spell, a light-step circle, a relief with a choice, a condition saved out of each turn.
    if (e.kind === "saveReroll") ok(`B ${s.name} effect ${i} saveReroll names degrees and an immunity`, Array.isArray(e.degrees) && e.degrees.length > 0 && /^\d+ (minutes?|hours?|rounds?)$/.test(e.immunity));
    if (e.kind === "lightShift") ok(`B ${s.name} effect ${i} lightShift has steps and a radius`, Number.isInteger(e.steps) && e.steps !== 0 && Number(e.radiusFeet) > 0);
    if (e.kind === "conditionRelief" && e.choices) ok(`B ${s.name} effect ${i} relief choices are all real conditions and include the row's own`, e.choices.every((c) => c in CONDITIONS) && e.choices.includes(e.condition));
    if (e.kind === "condition" && e.conditionSave) ok(`B ${s.name} effect ${i} conditionSave names a save, an outcome and a label`, ["will", "fortitude", "reflex"].includes(e.conditionSave.save) && ["end", "shorten", "reduceValue"].includes(e.conditionSave.onSuccess) && e.conditionSave.label);
    if (e.onSave) ok(`B ${s.name} effect ${i} onSave names degrees`, e.onSave.every((d) => ["heroic", "critical", "success", "partial", "failure", "fumble", "blunder"].includes(d)));
    if (e.kind === "conditional" && haveSystem) {
      conditionalRows += 1;
      const spec = normaliseSpellConditional(e, normaliseConditional);
      ok(`B ${s.name} effect ${i} conditional normalises with every grant kept`, spec && spec.grants.length === e.grants.length, `${spec?.grants.length} of ${e.grants.length}`);
      for (const g of e.grants) ok(`B ${s.name} conditional grant "${g.scope.slice(0, 30)}…" has a scope and a type`, g.scope.length > 8 && (g.kind === "advantage" || ["status", "circumstance", "class"].includes(g.type)));
    }
  }
  for (const w of s.system.warps) {
    for (const k of Object.keys(w.mods)) { modded += 1; ok(`B ${s.name} warp "+${w.ppCost} PP" mod "${k}" is a key the warp arithmetic knows`, WARP_MODS.has(k)); }
    if (/increase the (bonus|bonuses|saving throw bonus) by 1/i.test(w.text)) ok(`B ${s.name} warp "${w.text}" carries bonusValue and its maximum`, w.mods.bonusValue === 1 && Number(w.mods.bonusMax) > 1);
    if (/increase (the )?healing by (\dd\d)/i.test(w.text)) ok(`B ${s.name} warp "${w.text}" carries healDice`, w.mods.healDice === w.text.match(/(\dd\d)/)[1]);
    if (/(affect|target) one additional/i.test(w.text) && !/category|category|question|spirit|creature within 30 feet/i.test(w.text)) ok(`B ${s.name} warp "${w.text}" carries extraTargets`, w.mods.extraTargets === 1);
    if (/increase the duration to (.+)/i.test(w.text)) ok(`B ${s.name} warp "${w.text}" carries durationText`, w.mods.durationText === w.text.match(/increase the duration to (.+)/i)[1].replace(/\.$/, ""));
  }
  for (const c of s.system.casterLevelMods) ok(`B ${s.name} caster-level line is in the core shape`, Number.isInteger(c.threshold) && c.threshold > 0 && typeof c.text === "string" && "recurring" in c && "damageDice" in c && "saveDC" in c && "attack" in c);
}
ok("B this block declares nearly a hundred effect rows", effectRows >= 95, String(effectRows));
// Eighteen since 0.11.0: Unfold the Future's Portents are a counted pending entry now.
ok("B ...eighteen of them scoped conditionals", conditionalRows >= 18, String(conditionalRows));
ok("B ...and fifty-odd warp mods the chooser can apply", modded >= 50, String(modded));
equal("B every emanation of allies targets allies", GRIMOIRE_SPELLS.filter((s) => /emanation/.test(s.system.area) && s.system.effects.some((e) => e.target === "allies")).map((s) => s.system.areaTargeting), GRIMOIRE_SPELLS.filter((s) => /emanation/.test(s.system.area) && s.system.effects.some((e) => e.target === "allies")).map(() => "allies"));
equal("B 0.7.0 — Saintly Intercession is a save-reroll row with the three warps' mods", [spells["Saintly Intercession"].system.effects.find((e) => e.kind === "saveReroll")?.degrees, spells["Saintly Intercession"].system.warps.map((w) => w.mods)], [["partial", "failure"], [{ rerollDegrees: ["fumble"] }, { rerollDegrees: ["blunder"] }, { rerollBonus: 2, once: true }]]);
equal("B 0.7.0 — Writ of Restraint's Slowed rows save out each turn; Bloom of Renewal and Share Burden offer their relief; Sporeglow is a light step", [spells["Writ of Restraint"].system.effects.filter((e) => e.kind === "condition").map((e) => e.conditionSave?.onSuccess), spells["Bloom of Renewal"].system.effects.find((e) => e.kind === "conditionRelief")?.choices, spells["Share Burden"].system.effects.find((e) => e.kind === "conditionRelief")?.choices?.length, spells["Sporeglow"].system.effects[0].kind], [["end", "end"], ["fatigued", "sickened"], 5, "lightShift"]);
equal("B 0.7.1 — Share Burden's caster takes the condition on (casterGains, 3.625.1); Saintly Intercession's +2 status warp is bought once", [spells["Share Burden"].system.effects.find((e) => e.kind === "conditionRelief")?.casterGains, spells["Saintly Intercession"].system.warps.map((w) => w.mods?.once ?? null)], [true, [null, null, true]]);
equal("B Word of Censure's ladder: Frightened 1 / 2 / 3 and Dazed on a Fumble", spells["Word of Censure"].system.effects.filter((e) => e.kind === "condition").map((e) => [e.condition, e.value, e.onSave.join("+")]), [["frightened", 1, "success"], ["frightened", 2, "failure"], ["frightened", 3, "fumble+blunder"], ["dazed", 1, "fumble+blunder"]]);
equal("B Binding Cord's Failure slows every speed", spells["Binding Cord"].system.effects.find((e) => e.value === -10).slot, "allSpeeds");
equal("B Exemplar's Grace chooses a save or a ranked skill at the cast", spells["Exemplar's Grace"].system.effects[0].chooseFrom, "savesOrRankedSkills");
equal("B Sacred Toll (0.1.0) still ships beside the Grimoire, the two borrowed spells and Wail of the Departed (0.9.0)", PACKS.find((p) => p.name === "pof-spells").docs.length, FOUNDATION_SPELLS.length + 65 + 2 + 1);
// Rooted Soul is BOTH a Myrathi racial feat (Chapter 5) and a Verdant
// spell (Chapter 10) in the book. Nothing grants the spell by name, so
// the by-name grant dedupe never meets the pair; kept as printed and
// flagged for Graham.
equal("B no name is used twice across the packs (Rooted Soul, the book's own pair, excepted)", PACKS.flatMap((p) => p.docs.map((d) => d.name)).filter((n, i, all) => all.indexOf(n) !== i), ["Rooted Soul"]);

/* ------------------------------------------------------------------ *
 * C. Resolution
 * ------------------------------------------------------------------ */

if (haveSystem) {
  const { ClassicLevel } = await import("classic-level");
  async function packDocs(pack) {
    const db = new ClassicLevel(path.join(SYSTEM_ROOT, "packs", pack), { valueEncoding: "json" });
    const docs = [];
    for await (const [k, v] of db.iterator()) if (k.startsWith("!items!")) docs.push(v);
    await db.close();
    return docs;
  }
  const coreSpells = await packDocs("spells");
  const coreSpellNames = new Set(coreSpells.map((s) => key(s.name)));
  const ourSpellNames = new Set([...GRIMOIRE_SPELLS, ...BORROWED_SPELLS].map((s) => key(s.name)));
  const coreWeapons = await packDocs("weapons");
  const weaponGroups = new Set(coreWeapons.map((w) => w.system.group));
  const weaponNames = new Set(coreWeapons.map((w) => key(w.name)));
  const coreAspects = await packDocs("divine-aspects");
  for (const a of DIVINE_ASPECTS) {
    ok(`C ${a.name} does not shadow a core aspect`, !coreAspects.some((c) => key(c.name) === key(a.name)));
    for (const n of split(a.system.specialistSpells)) ok(`C ${a.name} specialist spell "${n}" is a core Cleric specialist spell`, coreSpellNames.has(key(n)) && coreSpells.find((s) => key(s.name) === key(n)).system.specialist);
    for (const { name } of levelled(a.system.bonusSpells)) ok(`C ${a.name} bonus spell "${name}" is a core spell or a borrowed one`, coreSpellNames.has(key(name)) || ourSpellNames.has(key(name)));
    ok(`C ${a.name} favoured weapon "${a.system.favouredWeapon}" is a weapon group or name the pack has`, weaponGroups.has(a.system.favouredWeapon) || weaponNames.has(key(a.system.favouredWeapon)));
    equal(`C ${a.name} specialist list splits four PP 1 and four PP 7`, [1, 7].map((pp) => split(a.system.specialistSpells).filter((n) => Number(coreSpells.find((s) => key(s.name) === key(n))?.system.ppCost) === pp).length), [4, 4]);
  }
  equal("C the five group-named favoured weapons need the 3.572.0 group match", [...new Set(DIVINE_ASPECTS.map((a) => a.system.favouredWeapon))].filter((w) => !weaponNames.has(key(w))).sort(), ["Hammer", "Knife", "Polearm", "Sword"]);
  for (const s of [...GRIMOIRE_SPELLS, ...BORROWED_SPELLS]) ok(`C "${s.name}" does not shadow a core spell`, !coreSpellNames.has(key(s.name)));
  // The class abilities' specialist grants resolve now.
  const GRIMOIRE_PENDING = ["doctrinal ward", "word of censure", "hidden doctrine", "forbidden name", "last rite", "anchor the departing soul", "exemplar's grace", "saintly intercession", "read omen", "unfold the future"];
  for (const n of GRIMOIRE_PENDING) ok(`C the Archivist discipline spell "${n}" ships as an Archivist specialist spell`, ourSpellNames.has(key(n)) && spells[GRIMOIRE_SPELLS.find((s) => key(s.name) === key(n)).name].system.specialistClass === "Archivist");
  for (const item of [...CLASSES, ...CLASS_ABILITIES]) {
    for (const { name } of levelled(item.system.grantedSpells)) ok(`C ${item.name} granted spell "${name}" resolves (core, Grimoire or borrowed)`, coreSpellNames.has(key(name)) || ourSpellNames.has(key(name)));
  }
  equal("C the Folkwarden's and Shaman's PP 1 lists are six and five", ["Folkwarden", "Shaman"].map((c) => SPECIALIST_SPELLS.filter((s) => s.system.specialistClass === c && s.system.ppCost === 1).length), [6, 5]);
  equal("C the Grimward's PP 1 pick comes from its aspect: no Grimward spell is PP 1", SPECIALIST_SPELLS.filter((s) => s.system.specialistClass === "Grimward" && s.system.ppCost === 1).length, 0);
  ok("C the Grimward class description prints the 'PP 1 Specialist Spell' sentence the aspect chooser keys on", /\bPP 1 Specialist Spell\b/i.test(CLASSES.find((c) => c.name === "Grimward").system.description));
  const { SKILL_ACTIONS } = await import(path.join(SYSTEM_ROOT, "module", "data", "skill-actions.mjs"));
  const { SKILL_ACTIONS: POF_ACTIONS } = await import("../module/skill-actions.mjs");
  const actionKeys = new Set([...SKILL_ACTIONS, ...POF_ACTIONS].map((a) => a.key));
  const { SKILLS } = await import(path.join(SYSTEM_ROOT, "module", "config.mjs"));
  for (const s of GRIMOIRE_SPELLS) for (const e of s.system.effects) if (e.kind === "conditional") for (const g of e.grants) {
    for (const k of [...(g.when?.actions ?? []), ...(g.when?.not?.actions ?? [])]) ok(`C ${s.name} conditional names a real action "${k}"`, actionKeys.has(k));
    if (g.when?.checkTypes?.includes("skill")) for (const k of g.when?.subjects ?? []) ok(`C ${s.name} conditional subject "${k}" is a skill`, k in SKILLS);
    if (g.when?.checkTypes?.includes("save") && !g.when?.checkTypes?.includes("skill")) for (const k of g.when?.subjects ?? []) ok(`C ${s.name} conditional subject "${k}" is a save`, ["fortitude", "reflex", "will"].includes(k));
  }
  for (const a of DIVINE_ASPECTS) ok(`C ${a.name} class skill "${a.system.classSkill}" is a skill`, Object.values(SKILLS).some((sk) => sk.label === a.system.classSkill));
  const read = (rel) => fs.readFileSync(path.join(SYSTEM_ROOT, rel), "utf8");
  ok("C system: version is at least 3.626.0", Number(JSON.parse(read("system.json")).version.split(".")[1]) >= 626);
  ok("C system: the saveReroll kind, the reroll warps and the three relievable conditions are present", /"saveReroll"/.test(read("module/magic/effect-kinds.mjs")) && /rerollDegrees/.test(read("module/magic/spell-warp.mjs")) && /sickened: Object\.freeze/.test(read("module/magic/condition-relief.mjs")));
  ok("C system: a favoured weapon may be a group", /function favouredWeaponGroupMatches/.test(read("module/divine-aspect.mjs")) && /weapon\.system\?\.group/.test(read("module/combat/attack-workflow.mjs")));
  ok("C system: the aspect chooser filters PP 1 by the class sentence and allows specialist spells", /\\bPP 1 Specialist Spell\\b/.test(read("module/feats-workflow.mjs")) && /allowSpecialist: true,\s*filter: \(entry\) => wanted\.has\(key\(entry\.name\)\)/.test(read("module/feats-workflow.mjs")));
  ok("C system: a divine aspect's bonus spells are a levelled grant", /"divine-aspect": \[\s*\{ field: "bonusSpells", pack: "spells", levelled: true \}/.test(read("module/grants-workflow.mjs")));
  ok("C system: spell conditionals reach the collector", /case "conditional": \{[\s\S]*?normaliseSpellConditional\(effect, normaliseConditional\)/.test(read("module/magic/spell-effects.mjs")));
  ok("C system: onSave gates a row by degree", /declares `onSave` applies to the targets whose SAVE DEGREE/.test(read("module/magic/spell-effects.mjs")));
}

/* ------------------------------------------------------------------ *
 * D. Registration and automation
 * ------------------------------------------------------------------ */

const calls = [];
const fake = new Proxy({}, { get: (_, name) => (...args) => { calls.push([name, ...args]); return true; } });
registerContent(fake, "trg-pillars-of-faith");
const registered = new Set(calls.filter((c) => c[0] === "registerFeatAutomation").map((c) => c[1]));
equal("D four Grimoire automations", Object.keys(GRIMOIRE_AUTOMATIONS).sort(), ["folkwarden specialist spell", "hedge witch", "old secret", "shaman specialist spell"]);
for (const [k, entry] of Object.entries(GRIMOIRE_AUTOMATIONS)) {
  ok(`D "${k}" is registered with hint and use()`, registered.has(k) && typeof entry.hint === "string" && typeof entry.use === "function");
  ok(`D "${k}" is not also a feat automation or hint`, !(k in FEAT_AUTOMATIONS) && !(k in FEAT_PASSIVE_HINTS) && !(k in GRIMOIRE_PASSIVE_HINTS));
}
equal("D the two PP 1 pickers are 1st-level class abilities of their classes", ["Folkwarden Specialist Spell", "Shaman Specialist Spell"].map((n) => { const a = CLASS_ABILITIES.find((x) => x.name === n); return [a?.system.sourceClass, a?.flags[SYS].classAbility.level]; }), [["Folkwarden", 1], ["Shaman", 1]]);
ok("D the classes grant them at 1st", levelled(CLASSES.find((c) => c.name === "Folkwarden").system.classAbilities).some((e) => e.name === "Folkwarden Specialist Spell" && e.level === 1) && levelled(CLASSES.find((c) => c.name === "Shaman").system.classAbilities).some((e) => e.name === "Shaman Specialist Spell" && e.level === 1));
const auto = fs.readFileSync(path.join(ROOT, "module", "grimoire-automations.mjs"), "utf8");
ok("D the chooser reads the federated spells pack by specialist class and cost", /contentPack\("spells"\)/.test(auto) && /system\.specialistClass/.test(auto) && /Number\(e\.system\?\.ppCost\) === ppCost/.test(auto));
ok("D a second Use replaces the pick (grantedBy on the spell)", /grantedBy\?\.sourceId === item\.id/.test(auto) && /deleteEmbeddedDocuments\("Item", held/.test(auto));
ok("D the automations file has no static import of the system", !/from "\.\.\/\.\.\/sys|trg-prime\/module/.test(auto));

const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "module.json"), "utf8"));
equal("D module version", manifest.version, "0.11.1");
ok("D pof-aspects extends divine-aspects and is in the folder", manifest.packs.find((p) => p.name === "pof-aspects")?.flags[SYS].extends === "divine-aspects" && manifest.packFolders[0].packs.includes("pof-aspects"));
ok("D packs-source/pof-aspects and pof-spells are built", fs.existsSync(path.join(ROOT, "packs-source", "pof-aspects")) && fs.readdirSync(path.join(ROOT, "packs-source", "pof-aspects")).length === 22 && fs.readdirSync(path.join(ROOT, "packs-source", "pof-spells")).length === 69);

/* ------------------------------------------------------------------ */
// 2111 at 0.11.1: Exorcise's warp carries bonusValue and bonusMax (two mod-key checks).
const EXPECTED_CHECKS = 2111;
if (EXPECTED_CHECKS) equal("Z the suite ran every check it is meant to", checks + 1, EXPECTED_CHECKS);
if (failures.length) { console.log(`verify-grimoire: ${checks} checks — ${failures.length} FAILED\n`); for (const f of failures) console.log(`  ✗ ${f}`); process.exitCode = 1; }
else console.log(`verify-grimoire: ${checks} checks — all green.`);
