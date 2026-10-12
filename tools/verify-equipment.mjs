#!/usr/bin/env node
/**
 * verify-equipment — Pillars of Faith, Chapter 6 (Gear): the armour,
 * shields, weapons, tools, herbs and consumables, checked against the
 * printed tables and against the system that will read them.
 *
 *   node tools/verify-equipment.mjs
 *
 * SECTIONS
 *   A  Transcription: every printed table row ships exactly once with
 *      the row's numbers, category, traits and description; every herb
 *      and consumable heading ships once with its level, price, usage,
 *      activation, terrain and body.
 *   B  Shape: each item carries the fields its core pack type carries,
 *      typed as the core types them; every conditional on a suit,
 *      shield or tool normalises through the system's own normaliser;
 *      every consumable effect row is a kind the applier handles with
 *      the fields that kind reads (conditions real, durations parse,
 *      slots land, riders and immunities normalise); tool actions are
 *      real action keys.
 *   C  Resolution: the system is at least 3.607.0 and its worn-and-
 *      standing gate for equipment conditionals is present; the core
 *      pack vocabularies (weapon groups, armour categories, shield
 *      categories, alchemical kinds) contain ours; tool requirements
 *      still name only core kits (so `toolFor` is a declaration, not a
 *      gate).
 *   D  Manifest and packs.
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
const key = (s) => String(s ?? "").replace(/[’‘']/g, "").trim().toLowerCase();
const split = (s) => String(s ?? "").split(",").map((x) => x.trim()).filter(Boolean);

const TEXT = JSON.parse(fs.readFileSync(path.join(ROOT, "tools", "content", "equipment-text.json"), "utf8"));
const { ARMOUR, SHIELDS, WEAPONS, TOOLS } = await import("./content/equipment.mjs");
const { CONSUMABLE_TEXT, HERBS, OTHER_CONSUMABLES, CONSUMABLES, HERB_RULES, OTHER_RULES } = await import("./content/consumables.mjs");
const { PACKS } = await import("./content/foundation.mjs");
const { SKILL_ACTIONS } = await import("../module/skill-actions.mjs");
const byName = (list) => Object.fromEntries(list.map((d) => [d.name, d]));
const armour = byName(ARMOUR), shields = byName(SHIELDS), weapons = byName(WEAPONS), tools = byName(TOOLS), consumables = byName(CONSUMABLES);

/* ------------------------------------------------------------------ *
 * A. Transcription
 * ------------------------------------------------------------------ */

equal("A the printed tables have 6 / 5 / 9 / 12 rows and we ship as many", [TEXT.armour.length, TEXT.shields.length, TEXT.weapons.length, TEXT.tools.length, ARMOUR.length, SHIELDS.length, WEAPONS.length, TOOLS.length], [6, 5, 9, 12, 6, 5, 9, 12]);
for (const list of [ARMOUR, SHIELDS, WEAPONS, TOOLS, CONSUMABLES]) {
  const names = list.map((d) => d.name);
  ok(`A no duplicate names in ${list[0].type} (${names.length})`, new Set(names).size === names.length);
}
for (const row of TEXT.armour) {
  const a = armour[row.name];
  ok(`A armour "${row.name}" ships`, Boolean(a));
  if (!a) continue;
  equal(`A ${row.name} numbers match the table`, [a.system.category, a.system.itemLevel, a.system.price, a.system.penalty, a.system.maxDexBonus, a.system.dr, a.system.hp.max, a.system.speedPenalty, a.system.weight, a.system.traits], [row.category, row.level, row.price, row.acp, row.maxDex, row.dr, row.hp, row.speed, row.weight, row.traits]);
  ok(`A ${row.name} carries its description paragraph`, a.system.description.includes(TEXT.descriptions[row.name]));
}
for (const row of TEXT.shields) {
  const s = shields[row.name];
  ok(`A shield "${row.name}" ships`, Boolean(s));
  if (!s) continue;
  equal(`A ${row.name} numbers match the table`, [s.system.price, s.system.itemLevel, s.system.defenceBonus, s.system.penalty, s.system.weight, s.system.dr, s.system.hp.max], [row.price, row.level, row.db, row.acp, row.weight, row.dr, row.hp]);
  ok(`A ${row.name} carries its description paragraph`, s.system.description.includes(TEXT.descriptions[row.name]));
}
const DAMAGE = { S: "slashing", P: "piercing", B: "bludgeoning" };
const SIZE = { S: "small", M: "medium", L: "large" };
for (const row of TEXT.weapons) {
  const w = weapons[row.name];
  ok(`A weapon "${row.name}" ships`, Boolean(w));
  if (!w) continue;
  const [dice, letter] = row.damage.split(" ");
  equal(`A ${row.name} numbers match the table`, [w.system.category, w.system.price, w.system.itemLevel, w.system.damage, w.system.damageType, w.system.size, w.system.fumbleDC, w.system.weight, w.system.group, w.system.traits], [row.category, row.price, row.level, dice, DAMAGE[letter], SIZE[row.size], row.fdc, row.weight, row.group, row.traits]);
  ok(`A ${row.name} carries its description paragraph`, w.system.description.includes(TEXT.descriptions[row.name]));
  const ar = Number((row.traits.match(/\bAR (\d+)/) ?? [])[1] ?? 0);
  equal(`A ${row.name} Armour Rending is the trait's number`, w.system.armourRending, ar);
}
for (const row of TEXT.tools) {
  const t = tools[row.name];
  ok(`A tool "${row.name}" ships`, Boolean(t));
  if (!t) continue;
  equal(`A ${row.name} numbers match the table`, [t.system.itemLevel, t.system.price, t.system.weight], [row.level, row.price, row.weight]);
  ok(`A ${row.name} carries its description paragraph`, t.system.description.includes(TEXT.descriptions[row.name]));
  const printsBonus = /^\+1/.test(row.effect);
  ok(`A ${row.name} ${printsBonus ? "declares the +1 the table prints" : "declares no bonus (the table prints none)"}`, printsBonus === Array.isArray(t.flags[SYS].goodsConditionals));
  if (printsBonus) ok(`A ${row.name} bonus is +1 item`, t.flags[SYS].goodsConditionals.every((c) => c.value === 1 && c.type === "item"));
}
equal("A 58 headings extracted, 50 herbs + 8 consumables shipped", [Object.keys(CONSUMABLE_TEXT).length, HERBS.length, OTHER_CONSUMABLES.length], [58, 50, 8]);
const price = (s) => Number(String(s).replace(/[^0-9.]/g, ""));
for (const [heading, entry] of Object.entries(CONSUMABLE_TEXT)) {
  const rule = entry.section === "herb" ? HERB_RULES[heading] : OTHER_RULES[heading];
  const item = CONSUMABLES.find((c) => key(c.name) === key(heading));
  ok(`A "${heading}" has a rule and ships once`, Boolean(rule) && Boolean(item) && CONSUMABLES.filter((c) => key(c.name) === key(heading)).length === 1);
  if (!item) continue;
  equal(`A ${item.name} level and price are the printed ones`, [item.system.itemLevel, item.system.price], [Number(entry.fields.Level), price(entry.fields.Price)]);
  equal(`A ${item.name} activation is printed`, item.system.activation, entry.fields.Activate);
  ok(`A ${item.name} description carries usage, terrain and every body paragraph`, item.system.description.includes(entry.fields.Usage) && (!entry.terrain || item.system.description.includes(entry.terrain)) && entry.body.every((p) => item.system.description.includes(p)));
  equal(`A ${item.name} traits are the printed line`, key(item.system.traits), key(entry.traits));
  equal(`A ${item.name} is held in the printed hands`, item.flags[SYS].consumable.hands, rule.hands ?? (/held in 1 hand/i.test(entry.fields.Usage) ? 1 : 0));
  ok(`A ${item.name} rarity is in the traits, not the name`, !/rare|uncommon|unique/i.test(item.name));
}
// The readings this block took, pinned so a retype cannot drift them.
equal("A Hospice Jack is the tool for Administer First Aid (core key firstAid)", armour["Hospice Jack"].flags[SYS].toolFor, ["firstAid"]);
equal("A Autopsy Roll is the tool for Perform Autopsy", tools["Autopsy Roll"].flags[SYS].toolFor, ["performAutopsy"]);
ok("A Ossuary Lamellar's +1 DR vs slashing is a note (DR is one number)", /\+1 DR against slashing/.test(armour["Ossuary Lamellar"].system.description) && !armour["Ossuary Lamellar"].flags[SYS].conditionals);
ok("A Ossuary Board's Shove on a Shield Bash is a note", /gains the Shove trait/.test(shields["Ossuary Board"].system.description) && !shields["Ossuary Board"].flags[SYS].conditionals);
equal("A Censer Buckler is a buckler with no bash die", [shields["Censer Buckler"].system.category, shields["Censer Buckler"].system.shieldBashDamage], ["buckler", ""]);
equal("A the light shields bash 1d4/6, the heavy 1d6/8", SHIELDS.map((s) => [s.system.category, s.system.shieldBashDamage, s.system.shieldBashFumbleDC]), [["buckler", "", 0], ["light", "1d4", 6], ["light", "1d4", 6], ["heavy", "1d6", 8], ["heavy", "1d6", 8]]);
ok("A Brace, Balanced and Nonlethal are printed traits kept with a note", /Brace is printed/.test(weapons["Last-Road Spear"].system.description) && /Balanced is printed/.test(weapons["Testament Blade"].system.description) && /Nonlethal is printed/.test(weapons["Penitent Chain"].system.description));
equal("A Silvermould is a silver material oil like Silversheen", consumables["Silvermould"].flags[SYS].consumable.oil, { kind: "material", material: "silver", weaponDuration: "1 hour", ammoDuration: "1 hour", ammoCount: 10 });
equal("A Dragon's Breath Reed is a 1d6 fire strike rider, once, spent on a hit (0.7.0)", consumables["Dragon's Breath Reed"].flags[SYS].consumable.effect.effects[0], { kind: "strikeRider", label: "Dragon's Breath Reed", dice: "1d6", damageType: "fire", scope: "any", once: true, spendOn: "hit" });
equal("A the healing herbs heal the printed dice", ["Black Sap", "Heartvine", "King's Blood", "Lifeblossom", "Godsblood Moss"].map((n) => consumables[n].flags[SYS].consumable.effect.effects.find((e) => e.kind === "heal")?.formula), ["1d6", "2d6+2", "2d6+6", "4d6+8", "6d6+15"]);
equal("A the resistance herbs name their type", ["Emberleaf", "Frostmint", "Greysap", "Storm Orchid", "Ophidian Flower"].map((n) => consumables[n].flags[SYS].consumable.effect.effects.find((e) => e.kind === "defence")?.value), ["fire", "cold", "acid", "electricity", "poison"]);
equal("A Heart of Ash is fire immunity for 10 minutes", [consumables["Heart of Ash"].flags[SYS].consumable.effect.duration, consumables["Heart of Ash"].flags[SYS].consumable.effect.effects[0].field], ["10 minutes", "immunity"]);
equal("A the save herbs land on the save slots", ["Ironbloom", "Nightspire", "Thunderleaf"].map((n) => consumables[n].flags[SYS].consumable.effect.effects[0].slot), ["fortitude", "will", "reflex"]);
equal("A Crystal Bark DR 1, Kingshield Moss DR 2 and DB 1, Swiftfern +5 Speed, Mindlace +1 Spellcraft", [["Crystal Bark"], ["Kingshield Moss"], ["Swiftfern"], ["Mindlace"]].map(([n]) => consumables[n].flags[SYS].consumable.effect.effects.filter((e) => e.kind === "bonus").map((e) => `${e.slot}+${e.value}`).join(",")), ["dr+1", "dr+2,defence+1", "speed+5", "spellcraft+1"]);
equal("A the relief herbs: Deepmire Lily Fatigued 1, Root of Stone Weakened 1, Godsblood Injured 2, King's Blood 3 bleed", [["Deepmire Lily", "fatigued"], ["Root of Stone", "weakened"], ["Godsblood Moss", "injured"], ["King's Blood", "bleeding"]].map(([n, c]) => consumables[n].flags[SYS].consumable.effect.effects.find((e) => e.kind === "conditionRelief" && e.condition === c)?.amount), [1, 1, 2, 3]);
ok("A Vigil Draught suppresses Fatigued 1 for an hour as an elixir", consumables["Vigil Draught"].flags[SYS].consumable.kind === "elixir" && consumables["Vigil Draught"].flags[SYS].consumable.effect.duration === "1 hour" && consumables["Vigil Draught"].flags[SYS].consumable.effect.effects[0].kind === "suppress" && consumables["Vigil Draught"].flags[SYS].consumable.effect.effects[0].amount === 1);
equal("A Embalming Salts and Evidence Powder are +2 pending bonuses", ["Embalming Salts", "Evidence Powder"].map((n) => consumables[n].flags[SYS].consumable.effect.pending?.value), [2, 2]);
equal("A Mistwraith Bloom is the Invisible condition for a minute", [consumables["Mistwraith Bloom"].flags[SYS].consumable.effect.effects[0].condition, consumables["Mistwraith Bloom"].flags[SYS].consumable.effect.duration], ["invisible", "1 minute"]);
equal("A Dreamthorn and Void Lily carry a week's immunity to themselves", ["Dreamthorn", "Void Lily"].map((n) => consumables[n].flags[SYS].consumable.effect.effects.find((e) => e.kind === "tempImmunity")?.length), ["7 days", "7 days"]);
ok("A the once-only save bonuses are one-shot rows (King's Blood, Lifeblossom, Moonpetal, Mourner's Incense)", ["King's Blood", "Lifeblossom", "Moonpetal", "Mourner's Incense"].every((n) => consumables[n].flags[SYS].consumable.effect.effects.find((e) => e.kind === "conditional").grants.some((g) => g.oneShot === true)));
ok("A the Full Rest limits and the no-stack DR are notes on the item", ["Deepmire Lily", "Root of Stone", "Vigil Draught"].every((n) => /Full Rest/.test(consumables[n].system.description)) && ["Crystal Bark", "Kingshield Moss"].every((n) => /does not stack/.test(consumables[n].flags[SYS].consumable.effect.note)));
// 0.11.0 (TRG Prime 3.630.0): the herbs that were notes are rows now.
const kindsOf = (n) => { const e = consumables[n].flags[SYS].consumable.effect; return [...(e.effects ?? []), ...(e.modes ?? []).flatMap((m) => m.effects ?? [])].map((r) => r.kind); };
equal("A the 0.11.0 herbs carry no by-hand note", ["Rose of Thorns", "Tangleweed", "Blackfire Ivy", "Emberthistle", "Soulvine", "Sunveil", "Phoenix Root", "Prism Lotus", "Worldroot Fragment", "Void Lily", "Greysap"].filter((n) => kindsOf(n).includes("note")), []);
equal("A the 0.11.0 herbs' rows", ["Rose of Thorns", "Tangleweed", "Blackfire Ivy", "Emberthistle", "Soulvine", "Sunveil", "Phoenix Root", "Prism Lotus", "Worldroot Fragment", "Void Lily", "Greysap"].map(kindsOf),
  [["strikeRider"], ["strikeRider"], ["declare"], ["declare"], ["conditionRelief"], ["conditionRemove"], ["declare"], ["declare", "declare"], ["declare"], ["tempImmunity", "restore"], ["defence", "conditionRemove"]]);
equal("A Divine Nectar: Dying to 0, all HP and PP, the six conditions and bleeding gone, a disease or poison re-save", [consumables["Divine Nectar"].flags[SYS].consumable.effect.resave, kindsOf("Divine Nectar")], ["disease|poison", ["conditionRelief", "restore", "restore", "conditionRemove", "note"]]);
equal("A Prism Lotus asks Fate or Preservation", (consumables["Prism Lotus"].flags[SYS].consumable.effect.modes ?? []).map((m) => m.key), ["fate", "preservation"]);
equal("A Funeral Resin fills the smoke, the burner included", consumables["Funeral Resin"].flags[SYS].consumable.effect.nearby, { radius: 10, includeSelf: true, label: "creature in the smoke" });

/* ------------------------------------------------------------------ *
 * B. Shape
 * ------------------------------------------------------------------ */

const haveSystem = fs.existsSync(path.join(SYSTEM_ROOT, "system.json"));
ok("B the TRG Prime system is beside this module (or TRG_PRIME_ROOT)", haveSystem, SYSTEM_ROOT);
const ARMOUR_FIELDS = ["quantity", "weight", "price", "equipped", "invested", "hp", "traits", "description", "category", "material", "isHelmet", "dr", "hardness", "penalty", "proficiency", "maxDexBonus", "speedPenalty", "itemLevel", "coversTorso", "coversArms", "coversLegs"];
const SHIELD_FIELDS = ["quantity", "weight", "price", "equipped", "invested", "hp", "traits", "description", "dr", "hardness", "brokenThreshold", "proficiency", "penalty", "defenceBonus", "category", "metal", "itemLevel", "shieldBashDamage", "shieldBashFumbleDC", "shieldBashDamageType"];
const WEAPON_FIELDS = ["quantity", "weight", "price", "equipped", "invested", "hp", "traits", "description", "attackBonus", "damage", "damageType", "baseDamage", "hands", "range", "armourRending", "proficiency", "fumbleDC", "attackMode", "rangeIncrement", "group", "category", "size", "itemLevel"];
const GEAR_FIELDS = ["quantity", "weight", "price", "equipped", "invested", "hp", "traits", "description", "slot", "uses", "itemSize", "itemLevel", "heldHands", "formulae", "gearCategory", "gearCategoryInferred"];
const CONSUMABLE_FIELDS = ["quantity", "weight", "price", "equipped", "invested", "hp", "traits", "description", "uses", "activation", "itemLevel"];
const shaped = (d, type, fields) => d.type === type && fields.every((k) => k in d.system) && Object.keys(d.system).every((k) => fields.includes(k)) && /^[A-Za-z0-9]{16}$/.test(d._id) && d.flags[SYS].bookChapter === 6;
for (const a of ARMOUR) {
  ok(`B ${a.name} is armour in the core shape`, shaped(a, "armour", ARMOUR_FIELDS));
  ok(`B ${a.name} category, numbers and helm/metal flags are typed as the core types them`, ["Light", "Medium", "Heavy"].includes(a.system.category) && [a.system.dr, a.system.penalty, a.system.maxDexBonus, a.system.speedPenalty, a.system.hp.max, a.system.weight, a.system.price, a.system.itemLevel].every(Number.isInteger) && a.system.penalty <= 0 && a.system.speedPenalty <= 0 && a.system.isHelmet === /\bHelm\b/.test(a.system.traits) && (a.system.material === "Metal") === /Metal/.test(a.system.traits) && a.system.coversTorso === true);
  ok(`B ${a.name} Full armour covers arms and legs; the coats and jacks the torso`, /\bFull\b/.test(a.system.traits) ? (a.system.coversArms && a.system.coversLegs) : true);
}
for (const s of SHIELDS) {
  ok(`B ${s.name} is a shield in the core shape`, shaped(s, "shield", SHIELD_FIELDS));
  ok(`B ${s.name} category is a core one and the bash matches it`, ["buckler", "light", "heavy", "tower"].includes(s.system.category) && typeof s.system.metal === "boolean" && s.system.shieldBashDamageType === "bludgeoning" && (s.system.category === "buckler" ? s.system.shieldBashDamage === "" : /^\dd\d+$/.test(s.system.shieldBashDamage)));
}
for (const w of WEAPONS) {
  ok(`B ${w.name} is a weapon in the core shape`, shaped(w, "weapon", WEAPON_FIELDS));
  ok(`B ${w.name} category, size, damage and mode are typed as the core types them`, ["Simple", "Martial", "Exotic"].includes(w.system.category) && ["tiny", "small", "medium", "large"].includes(w.system.size) && /^\dd\d+$/.test(w.system.damage) && ["slashing", "piercing", "bludgeoning"].includes(w.system.damageType) && w.system.attackMode === "melee" && w.system.hands === 1 && Number.isInteger(w.system.fumbleDC));
}
const ACTION_KEYS = new Set(SKILL_ACTIONS.map((a) => a.key));
const CORE_ACTION_KEYS = new Set(["search", "recallKnowledge", "firstAid", "treatWounds"]);
for (const t of TOOLS) {
  ok(`B ${t.name} is gear in the core shape`, shaped(t, "gear", GEAR_FIELDS));
  ok(`B ${t.name} category is Kits & Tools or Goods and its size a letter`, ["Kits & Tools", "Goods"].includes(t.system.gearCategory) && ["T", "S", "M"].includes(t.system.itemSize) && t.system.gearCategoryInferred === false);
  for (const c of t.flags[SYS].goodsConditionals ?? []) {
    ok(`B ${t.name} goods row has value/type/label/scope/when (goods.mjs shape)`, Number.isFinite(c.value) && c.value !== 0 && c.type && c.label && c.scope && c.when && typeof c.when === "object");
    // goods.mjs prints "<item> (<label>)" — a label that repeats the item name printed "Desk (Desk)" live (0.6.1).
    ok(`B ${t.name} goods row label is a context, not the item name`, c.label !== t.name && c.label.length < 40);
    for (const k of c.when.actions ?? []) ok(`B ${t.name} names a real action key "${k}"`, ACTION_KEYS.has(k) || CORE_ACTION_KEYS.has(k));
  }
  for (const k of t.flags[SYS].toolFor ?? []) ok(`B ${t.name} toolFor "${k}" is an action key`, ACTION_KEYS.has(k) || CORE_ACTION_KEYS.has(k));
}
for (const c of CONSUMABLES) {
  ok(`B ${c.name} is a consumable in the core alchemical shape`, shaped(c, "consumable", CONSUMABLE_FIELDS) && c.system.uses === 1 && c.flags[SYS].alchemical && c.flags[SYS].consumable);
  const f = c.flags[SYS].consumable;
  ok(`B ${c.name} consumable flag has kind/costColumn/hands and one of effect|oil`, ["herb", "other", "elixir", "oil"].includes(f.kind) && f.costColumn === "alchemical" && [0, 1].includes(f.hands) && ((f.effect && !f.oil) || (f.oil && !f.effect)));
  equal(`B ${c.name} alchemical section is Herb or Other with the printed level`, [c.flags[SYS].alchemical.section, c.flags[SYS].alchemical.baseLevel, c.flags[SYS].alchemical.printedPrice], [/herb/i.test(c.system.traits) ? "Herb" : "Other", c.system.itemLevel, c.system.price]);
  if (f.effect) ok(`B ${c.name} effect has a label and does something (rows, modes, pending or resave)`, f.effect.label === c.name && ((f.effect.effects?.length ?? 0) > 0 || (f.effect.modes?.length ?? 0) > 0 || f.effect.pending || f.effect.resave));
}
if (haveSystem) {
  const { HANDLED_EFFECT_KINDS } = await import(path.join(SYSTEM_ROOT, "module", "magic", "effect-kinds.mjs"));
  const { CONDITIONS } = await import(path.join(SYSTEM_ROOT, "module", "conditions", "registry.mjs"));
  const { normaliseConditional, collectConditionals } = await import(path.join(SYSTEM_ROOT, "module", "conditionals.mjs"));
  const { normaliseSpellConditional } = await import(path.join(SYSTEM_ROOT, "module", "magic", "spell-conditional.mjs"));
  const { parseSpellDuration } = await import(path.join(SYSTEM_ROOT, "module", "magic", "effect-duration.mjs"));
  const { bonusTargetFor, ALL_SPEEDS_SLOT } = await import(path.join(SYSTEM_ROOT, "module", "magic", "spell-effects.mjs")).catch(() => ({}));
  const { normaliseStrikeRider } = await import(path.join(SYSTEM_ROOT, "module", "magic", "strike-riders.mjs"));
  const { normaliseTempImmunity } = await import(path.join(SYSTEM_ROOT, "module", "magic", "temp-immunity-row.mjs"));
  const { normaliseConditionRelief, RELIEVABLE } = await import(path.join(SYSTEM_ROOT, "module", "magic", "condition-relief.mjs"));
  const { goodsConditionals } = await import(path.join(SYSTEM_ROOT, "module", "goods.mjs"));
  const { normaliseDeclaredEffect } = await import(path.join(SYSTEM_ROOT, "module", "magic", "declared-effect.mjs"));
  const { normaliseConditionRemove, normaliseRestore } = await import(path.join(SYSTEM_ROOT, "module", "magic", "restore-rows.mjs"));
  const { toolMatches } = await import(path.join(SYSTEM_ROOT, "module", "tools-requirement.mjs"));

  // Equipment conditionals: through the system's normaliser, and through
  // the collector both worn and packed (the 3.607.0 gate).
  const worn = (d) => ({ ...d, system: { ...d.system, equipped: true, hp: { value: d.system.hp.max, max: d.system.hp.max } } });
  let equipmentRows = 0;
  for (const d of [...ARMOUR, ...SHIELDS]) {
    const rows = d.flags[SYS].conditionals ?? [];
    for (const [i, c] of rows.entries()) {
      equipmentRows += 1;
      ok(`B ${d.name} conditional ${i} normalises`, normaliseConditional(c, { id: d._id, name: d.name, kind: "item" }, i) !== null);
      ok(`B ${d.name} conditional ${i} is a +1 item bonus with a scope`, c.kind === "modifier" && c.value === 1 && c.type === "item" && c.scope.length > 10);
    }
    if (rows.length) {
      equal(`B ${d.name} rows are collected only while worn and standing`, [collectConditionals([worn(d)]).length, collectConditionals([d]).length], [rows.length, 0]);
    }
  }
  equal("B seven equipment conditional rows (coat, two saves x2, plate, aegis)", equipmentRows, 7);
  for (const t of TOOLS) {
    const rows = t.flags[SYS].goodsConditionals ?? [];
    if (!rows.length) continue;
    equal(`B ${t.name} goods rows are harvested while equipped, none while packed`, [goodsConditionals([worn(t)]).length, goodsConditionals([t]).length], [rows.length, 0]);
    for (const [i, entry] of goodsConditionals([worn(t)]).entries()) ok(`B ${t.name} goods row ${i} normalises as offered (not auto)`, normaliseConditional(entry, { id: t._id, name: t.name, kind: "item" }, i) !== null && entry.auto === false);
  }
  ok("B the Hospice Jack matches a firstAid tool requirement by toolFor, and no other action", toolMatches(armour["Hospice Jack"], { tools: [] }, "firstAid") === true && toolMatches(armour["Hospice Jack"], { tools: [] }, "treatWounds") === false);
  ok("B the Autopsy Roll matches a performAutopsy tool requirement by toolFor", toolMatches(tools["Autopsy Roll"], { tools: [] }, "performAutopsy") === true);

  // Consumable effect rows: the spell-effect vocabulary.
  const TARGETS = new Set(["self", "targets", "allies", "area"]);
  let rowCount = 0;
  for (const c of CONSUMABLES) {
    const eff = c.flags[SYS].consumable.effect;
    if (!eff) continue;
    if (eff.duration) ok(`B ${c.name} duration "${eff.duration}" parses`, parseSpellDuration(eff.duration) !== null);
    if (eff.pending) ok(`B ${c.name} pending is {value,type,label,scope}`, Number.isInteger(eff.pending.value) && eff.pending.type && eff.pending.label && eff.pending.scope);
    for (const [i, e] of [...(eff.effects ?? []), ...(eff.modes ?? []).flatMap((md) => md.effects ?? [])].entries()) {
      rowCount += 1;
      ok(`B ${c.name} row ${i} "${e.kind}" is a kind the applier handles`, HANDLED_EFFECT_KINDS.includes(e.kind));
      if (!["note", "strikeRider"].includes(e.kind)) ok(`B ${c.name} row ${i} targets self`, e.target === "self" && TARGETS.has(e.target));
      switch (e.kind) {
        case "heal": ok(`B ${c.name} row ${i} heal formula`, /^\d+d\d+(\+\d+)?$/.test(e.formula)); break;
        case "condition": ok(`B ${c.name} row ${i} names a real condition`, e.condition in CONDITIONS); break;
        case "conditionRelief": ok(`B ${c.name} row ${i} relieves a relievable condition by an amount`, normaliseConditionRelief(e) !== null && e.condition in RELIEVABLE && (e.amount >= 1 || /^\d*d\d+$/.test(String(e.amount))) && e.label); break;
        // 0.11.0 (TRG Prime 3.630.0): the declared effect, a removal, a restore.
        case "declare": ok(`B ${c.name} row ${i} declared effect normalises`, normaliseDeclaredEffect(e) !== null); break;
        case "conditionRemove": ok(`B ${c.name} row ${i} removal names real conditions or a persistent type`, normaliseConditionRemove(e, CONDITIONS) !== null && (e.conditions ?? []).every((k) => k in CONDITIONS)); break;
        case "restore": ok(`B ${c.name} row ${i} restore names a resource and an amount`, normaliseRestore(e) !== null); break;
        case "suppress": ok(`B ${c.name} row ${i} suppresses a real condition by an amount`, e.condition in CONDITIONS && e.amount >= 1 && e.label); break;
        // A note is the effect's scope and supplies its own brackets (effectName in spell-effects.mjs) — "Emberleaf Emberleaf" live at 0.6.0.
        case "defence": ok(`B ${c.name} row ${i} defence names field and type, with a bracketed note`, ["resistance", "immunity", "weakness"].includes(e.field) && /^[a-z]+$/.test(e.value) && /^\(.+\)$/.test(e.note)); break;
        case "bonus": ok(`B ${c.name} row ${i} bonus slot "${e.slot}" lands`, (bonusTargetFor ? bonusTargetFor(e.slot) !== null : true) && Number.isInteger(e.value) && e.bonusType === "item"); break;
        case "strikeRider": ok(`B ${c.name} row ${i} rider normalises`, normaliseStrikeRider(e) !== null); break;
        case "tempImmunity": ok(`B ${c.name} row ${i} immunity normalises to a week`, normaliseTempImmunity(e)?.seconds === 7 * 86400); break;
        case "light": ok(`B ${c.name} row ${i} light source is the torch`, e.source === "torch"); break;
        case "note": ok(`B ${c.name} row ${i} note has text`, typeof e.text === "string" && e.text.length > 20); break;
        case "conditional": {
          ok(`B ${c.name} row ${i} conditional has label and grants`, e.label && Array.isArray(e.grants) && e.grants.length > 0);
          const spec = normaliseSpellConditional(e, normaliseConditional);
          equal(`B ${c.name} row ${i} every grant normalises`, spec?.grants.length, e.grants.length);
          for (const g of e.grants) ok(`B ${c.name} row ${i} grant has a scope and, if a modifier, an item value`, g.scope && (g.kind === "advantage" || (g.kind === "modifier" && g.bonusType === "item" && Number.isInteger(g.value))));
          break;
        }
        default: ok(`B ${c.name} row ${i} kind "${e.kind}" is one this suite knows how to check`, false);
      }
    }
  }
  equal("B 75 consumable effect rows (Prism Lotus's two modes and Divine Nectar's restores since 0.11.0)", rowCount, 75);
  ok("B no consumable has a damage row (a herb is not an attack)", CONSUMABLES.every((c) => !(c.flags[SYS].consumable.effect?.effects ?? []).some((e) => e.kind === "damage")));

  /* ---------------------------------------------------------------- *
   * C. Resolution
   * ---------------------------------------------------------------- */
  const read = (rel) => fs.readFileSync(path.join(SYSTEM_ROOT, rel), "utf8");
  ok("C system: version is at least 3.626.0", Number(JSON.parse(read("system.json")).version.split(".")[1]) >= 626);
  ok("C system: equipment conditionals are gated on worn-and-standing (3.607.0)", /function equipmentInUse/.test(read("module/conditionals.mjs")) && /if \(kind === "item" && !equipmentInUse\(document\)\) continue;/.test(read("module/conditionals.mjs")) && /import \{ wornAndStanding \} from "\.\/item-quality\.mjs"/.test(read("module/conditionals.mjs")));
  ok("C system: the pickers federate by logical name (armour, shields, weapons, alchemical)", /alchemical: \{ pack: "alchemical"/.test(read("module/picker-filters.mjs")) && /const declared = p\.metadata\?\.flags\?\.\[SYSTEM_ID\]\?\.extends;/.test(read("module/content-packs.mjs")));
  ok("C system: goods conditionals are offered while equipped and standing", /if \(item\?\.type !== "gear" \|\| !wornAndStanding\(item\)\) continue;/.test(read("module/goods.mjs")));
  ok("C system: toolFor is read by toolMatches", /flags\?\.\[SYSTEM_ID\]\?\.toolFor/.test(read("module/tools-requirement.mjs")));
  const { TOOL_REQUIREMENTS } = await import(path.join(SYSTEM_ROOT, "module", "tools-requirement.mjs"));
  ok("C the module's actions carry no core tool requirement (toolFor on the Autopsy Roll is a declaration for when one exists)", !Object.keys(TOOL_REQUIREMENTS).some((k) => ACTION_KEYS.has(k)));
  const { ClassicLevel } = await import("classic-level");
  async function packDocs(pack) {
    const db = new ClassicLevel(path.join(SYSTEM_ROOT, "packs", pack), { valueEncoding: "json" });
    const docs = [];
    for await (const [k, v] of db.iterator()) if (k.startsWith("!items!")) docs.push(v);
    await db.close();
    return docs;
  }
  const coreWeapons = await packDocs("weapons"), coreArmour = await packDocs("armour"), coreShields = await packDocs("shields"), coreAlchemical = await packDocs("alchemical"), coreGear = await packDocs("gear");
  const groups = new Set(coreWeapons.map((w) => w.system.group));
  for (const w of WEAPONS) ok(`C ${w.name} group "${w.system.group}" is a core weapon group`, groups.has(w.system.group));
  const coreTraits = new Set(coreWeapons.flatMap((w) => split(w.system.traits).map((t) => t.replace(/ .*$/, ""))));
  equal("C the weapon traits the core does not carry are Brace, Balanced, Nonlethal and the three racial words", [...new Set(WEAPONS.flatMap((w) => split(w.system.traits).map((t) => t.replace(/ .*$/, ""))))].filter((t) => !coreTraits.has(t)).sort(), ["Balanced", "Brace", "Eshari", "Kethrani", "Myrathi", "Nonlethal"]);
  ok("C the armour categories, shield categories and alchemical kinds are core vocab", ARMOUR.every((a) => new Set(coreArmour.map((x) => x.system.category)).has(a.system.category)) && SHIELDS.every((s) => new Set(coreShields.map((x) => x.system.category)).has(s.system.category)) && new Set(coreAlchemical.map((x) => x.flags[SYS].consumable.kind)).has("herb"));
  const coreNames = new Set([...coreWeapons, ...coreArmour, ...coreShields, ...coreAlchemical, ...coreGear].map((d) => key(d.name)));
  for (const d of [...ARMOUR, ...SHIELDS, ...WEAPONS, ...TOOLS, ...CONSUMABLES]) ok(`C "${d.name}" does not collide with a core item`, !coreNames.has(key(d.name)));
  const coreHerb = coreAlchemical.find((x) => x.name === "Limorsor");
  equal("C our herbs carry the same top-level flag keys as a core herb", Object.keys(consumables["Black Sap"].flags[SYS].consumable).sort(), Object.keys(coreHerb.flags[SYS].consumable).sort());
  equal("C our herbs carry the same alchemical keys as a core herb", Object.keys(consumables["Black Sap"].flags[SYS].alchemical).sort(), Object.keys(coreHerb.flags[SYS].alchemical).sort());
}

/* ------------------------------------------------------------------ *
 * D. Manifest and packs
 * ------------------------------------------------------------------ */

const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "module.json"), "utf8"));
equal("D module version", manifest.version, "0.11.1");
equal("D requires TRG Prime 3.630.1+", manifest.relationships.systems[0].compatibility.minimum, "3.630.1");
for (const [name, ext, count] of [["pof-armour", "armour", 6], ["pof-shields", "shields", 5], ["pof-weapons", "weapons", 9], ["pof-alchemical", "alchemical", 58]]) {
  ok(`D ${name} extends ${ext}, is in the folder and in PACKS`, manifest.packs.find((p) => p.name === name)?.flags[SYS].extends === ext && manifest.packFolders[0].packs.includes(name) && PACKS.find((p) => p.name === name)?.extends === ext);
  ok(`D packs-source/${name} is built with ${count} documents`, fs.existsSync(path.join(ROOT, "packs-source", name)) && fs.readdirSync(path.join(ROOT, "packs-source", name)).length === count);
}
ok("D the twelve tools ride in pof-gear", PACKS.find((p) => p.name === "pof-gear").docs.filter((d) => d.flags[SYS]?.bookChapter === 6).length === 12);
ok("D the loader requires 3.630.1", /REQUIRED_SYSTEM = "3\.630\.1"/.test(fs.readFileSync(path.join(ROOT, "scripts", "pillars-of-faith.mjs"), "utf8")));

/* ------------------------------------------------------------------ */
const EXPECTED_CHECKS = 1349;
if (EXPECTED_CHECKS) equal("Z the suite ran every check it is meant to", checks + 1, EXPECTED_CHECKS);
if (failures.length) { console.log(`verify-equipment: ${checks} checks — ${failures.length} FAILED\n`); for (const f of failures) console.log(`  ✗ ${f}`); process.exitCode = 1; }
else console.log(`verify-equipment: ${checks} checks — all green.`);
