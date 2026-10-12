#!/usr/bin/env node
/**
 * verify-magic-items — Chapter 11 (0.8.0): the fifteen runes registered
 * and shipped, the specific items built on their Chapter 6 bases with
 * runes the system parses, the wondrous items' abilities in shapes the
 * system reads, the charged items' powers, the magical consumables'
 * effects — every figure checked against the chapter's own text, and
 * every declaration driven through TRG Prime 3.626.0's own readers.
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
const sysImport = (p) => import(path.join(SYSTEM_ROOT, "module", p));

const TEXT = JSON.parse(fs.readFileSync(path.join(ROOT, "tools", "content", "magic-item-text.json"), "utf8"));
const { RUNE_ITEMS, SPECIFIC_ARMOUR, SPECIFIC_WEAPONS, WONDROUS_ITEMS, RELICS, CHARGED_ITEMS, MAGIC_CONSUMABLES } = await import("./content/magic-items.mjs");
const { RUNES, ITEM_AUTOMATIONS, registerMagicItems } = await import("../module/magic-items.mjs");
const { ARMOUR, SHIELDS, WEAPONS } = await import("./content/equipment.mjs");
const { ALL_GRIMOIRE_SPELLS } = await import("./content/spells.mjs");
const { PACKS, SPELLS } = await import("./content/foundation.mjs");
const api = await sysImport("module-api.mjs");
const cat = await sysImport("rune-catalogue.mjs");
const decl = await sysImport("rune-declarations.mjs");
const weff = await sysImport("wondrous-effects.mjs");
const wuse = await sysImport("wondrous-use.mjs");
const cons = await sysImport("consumable-use.mjs");
const heal = await sysImport("magic/healing-riders.mjs");
const rods = await sysImport("rod-powers.mjs");
const riders = await sysImport("magic/strike-riders.mjs");
const senses = await sysImport("senses.mjs");

/* A. Counts and packs */
equal("A1 seventeen rune items (fifteen runes, Requiem in three tiers)", RUNE_ITEMS.length, 17);
equal("A2 six specific armour and shields, seven specific weapons", [SPECIFIC_ARMOUR.length, SPECIFIC_WEAPONS.length], [6, 7]);
equal("A3 twenty wondrous items (the Stole in four) and two relics", [WONDROUS_ITEMS.length, RELICS.length], [20, 2]);
equal("A4 three rods and five staves; twelve consumables", [CHARGED_ITEMS.length, MAGIC_CONSUMABLES.length], [8, 12]);
const packOf = (name) => PACKS.find((p) => p.name === name);
equal("A5 five Chapter 11 packs, each extending its core pack", ["pof-runes", "pof-specific-items", "pof-wondrous", "pof-charged-items", "pof-consumables"].map((n) => packOf(n)?.extends), ["runes", "specific-items", "wondrous", "charged-items", "consumables"]);
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "module.json"), "utf8"));
ok("A6 module.json declares the five packs with the same extends", ["pof-runes", "pof-specific-items", "pof-wondrous", "pof-charged-items", "pof-consumables"].every((n) => manifest.packs.find((p) => p.name === n)?.flags?.[SYS]?.extends === packOf(n).extends));
const ids = new Set();
for (const d of [...RUNE_ITEMS, ...SPECIFIC_ARMOUR, ...SPECIFIC_WEAPONS, ...WONDROUS_ITEMS, ...RELICS, ...CHARGED_ITEMS, ...MAGIC_CONSUMABLES]) {
  ok(`A7 ${d.name}: a 16-character id, unique, with the chapter flag`, /^[A-Za-z0-9]{16}$/.test(d._id) && !ids.has(d._id) && d.flags?.[SYS]?.bookChapter === 11);
  ids.add(d._id);
}

/* B. The runes: registered, catalogued, each figure the chapter's */
api.resetModuleRegistry();
registerMagicItems({ registerRunes: api.registerRunes, registerItemAutomation: api.registerItemAutomation }, "trg-pillars-of-faith");
equal("B1 fifteen runes register without a problem; eight automations", [api.registeredRunes().length, api.registrationProblems(), Object.keys(ITEM_AUTOMATIONS).length], [15, [], 8]);
const headingOf = { martyrsAegis: "MARTYR'S AEGIS" };
for (const rune of RUNES) {
  const section = rune.on.includes("weapon") ? "weaponRunes" : "armourRunes";
  const entry = TEXT[section][headingOf[rune.key] ?? rune.name.toUpperCase()];
  ok(`B2 ${rune.name}: the chapter has it`, Boolean(entry));
  if (!entry) continue;
  if (rune.tiers) {
    equal(`B3 ${rune.name}: the tiers' levels and prices are the chapter's`, rune.tiers.map((t) => [t.level, t.price]), ["I", "II", "III"].map((n) => [TEXT[section][`${rune.name.toUpperCase()} ${n}`].level, TEXT[section][`${rune.name.toUpperCase()} ${n}`].price]));
  } else if (entry.armourPrice) {
    equal(`B3 ${rune.name}: level and the two prices are the chapter's`, [rune.level, rune.armourPrice, rune.shieldPrice], [entry.level, entry.armourPrice, entry.shieldPrice]);
  } else {
    equal(`B3 ${rune.name}: level and price are the chapter's`, [rune.level, rune.price], [entry.level, entry.price]);
  }
  equal(`B4 ${rune.name}: its traits are the chapter's`, rune.traits.split(", ").map((t) => t.toUpperCase()).sort(), entry.traits.split(" ").sort());
  const usage = (entry.lines.find((l) => /^Usage /.test(l)) ?? "");
  const on = rune.on.slice().sort();
  const printedOn = [/armour/.test(usage) ? "armour" : null, /shield/.test(usage) ? "shield" : null, /weapon/.test(usage) ? "weapon" : null].filter(Boolean).sort();
  equal(`B5 ${rune.name}: goes on what the Usage line says`, on, printedOn.length ? printedOn : on);
  ok(`B6 ${rune.name}: a note the sheet shows`, typeof rune.note === "string" && rune.note.length > 20);
}
const catalogueKeys = (kind) => cat.runesFor(kind).map((r) => r.key);
ok("B7 the catalogue lists the armour, shield and weapon runes on their kinds", ["anchoredSoul", "lastVigil", "martyrsAegis", "sanctuary", "soulWard", "veilwatch"].every((k) => catalogueKeys("armour").includes(k)) && ["intercession", "martyrsAegis", "sanctuary", "soulMirror"].every((k) => catalogueKeys("shield").includes(k)) && ["banishing", "exorcist", "merciful", "remembrance", "requiem", "soulchain", "vowkeeper"].every((k) => catalogueKeys("weapon").includes(k)) && !catalogueKeys("armour").includes("intercession"));
equal("B8 Requiem prices by tier through the catalogue", [1, 2, 3].map((t) => cat.runePrice("weapon", "requiem", t)), [1400, 8000, 60000]);
const DECLARED_KEYS = new Set(["bonuses", "conditionals", "sense", "strikeRider", "ghostTouch", "afterStrike", "onCritical", "saveReroll", "onHealed", "soulDrainReduce", "action", "stabiliseAtZero", "healingRider"]);
// AND TWO THIS MODULE READS ITSELF (0.11.0): Martyr's Aegis's share of a blow
// (TRG Prime 3.630.0's registerDamageShare) and Soul Mirror's answer to a save.
const MODULE_READ_KEYS = new Set(["damageShare", "possessionMirror"]);
for (const rune of RUNES) ok(`B9 ${rune.name}: declares only keys the system or this module reads`, Object.keys(rune.declares ?? {}).every((k) => DECLARED_KEYS.has(k) || MODULE_READ_KEYS.has(k)));
equal("B10 every rune declares what it does — none is left to the table", RUNES.filter((r) => !Object.keys(r.declares ?? {}).length).map((r) => r.name), []);
ok("B11 …and the two the module answers say they are offered automatically", ["Martyr's Aegis", "Soul Mirror"].every((n) => /^Offered automatically/.test(RUNES.find((r) => r.name === n)?.note ?? "")));

/* C. The rune items */
for (const item of RUNE_ITEMS) {
  const flag = item.flags[SYS].rune;
  const rune = RUNES.find((r) => r.key === flag.key);
  ok(`C0 ${item.name}: named for its rune (the Exorcist item says "(Rune)" — the archetype feat has the bare name)`, item.name.startsWith(rune.name) && (rune.key !== "exorcist" || / \(Rune\)$/.test(item.name)));
  ok(`C1 ${item.name}: gear carrying its rune flag in the core's shape`, item.type === "gear" && rune && Array.isArray(flag.on) && flag.tier >= 1 && typeof flag.automation === "string");
  const tierRow = rune.tiers ? rune.tiers[flag.tier - 1] : null;
  equal(`C2 ${item.name}: level and price are the rune's`, [item.system.itemLevel, item.system.price], [tierRow ? tierRow.level : rune.level, tierRow ? tierRow.price : (rune.price ?? rune.armourPrice)]);
  ok(`C3 ${item.name}: the description says where it is inscribed and what the sheet does`, /Inscribed onto/.test(item.system.description) && /On the sheet:/.test(item.system.description));
}

/* D. Specific items on their bases */
const baseOf = { "Aegis of the Pilgrim Choir": "Processional Aegis", "Bulwark of the Sworn Gate": "Oathguard Plate", "Gravewarden's Vigil Coat": "Gravewarden Coat", "Hospice Vestment of the Last Lamp": "Hospice Jack", "Plate of the Sealed Sepulchre": "Sepulchral Plate", "Reliquary Shield of the First Witness": "Reliquary Shield", "Ashen Censer": "Censer Flail", "Bloom of the Ancestral Grove": "Bloom Scythe", "Chain of Contrition": "Penitent Chain", "Hook of the Last Passage": "Grave Hook", "Testament of the Unbroken Line": "Testament Blade", "Waykeeper": "Last-Road Spear", "Witness": "Oath Hammer" };
const bases = [...ARMOUR, ...SHIELDS, ...WEAPONS];
for (const item of [...SPECIFIC_ARMOUR, ...SPECIFIC_WEAPONS]) {
  const section = item.type === "weapon" ? "specificWeapons" : "specificArmour";
  const entry = TEXT[section][item.name.toUpperCase().replace("'S", "'S")] ?? TEXT[section][Object.keys(TEXT[section]).find((h) => h.replace(/[’']/g, "") === item.name.toUpperCase().replace(/[’']/g, ""))];
  ok(`D1 ${item.name}: the chapter has it`, Boolean(entry));
  if (!entry) continue;
  equal(`D2 ${item.name}: level and price are the chapter's`, [item.system.itemLevel, item.system.price], [entry.level, entry.price]);
  const base = bases.find((b) => b.name === baseOf[item.name]);
  ok(`D3 ${item.name}: built on its Chapter 6 base (${baseOf[item.name]}), same type and category/group`, base && base.type === item.type && (item.type === "weapon" ? item.system.group === base.system.group && item.system.damage === base.system.damage : item.type === "shield" ? item.system.category === base.system.category : item.system.category === base.system.category));
  const printedTraits = (entry.lines.find((l) => /^Traits /.test(l)) ?? "").replace(/^Traits /, "");
  equal(`D4 ${item.name}: the traits line is the chapter's`, item.system.traits, printedTraits);
  const parsed = cat.fieldToRunes(item.type === "shield" ? "shield" : item.type, item.system.runes);
  equal(`D5 ${item.name}: every printed rune parses through the catalogue`, parsed.length, item.flags[SYS].specificItem.runes.length);
  ok(`D6 ${item.name}: Potency leads the runes field, and its tier is the printed item bonus`, /^Potency (I{1,3})/.test(item.system.runes) && parsed.find((r) => r.key === "potency")?.tier === item.flags[SYS].specificItem.printedItemBonus);
  ok(`D7 ${item.name}: quality is the printed one`, (/Master/.test(printedTraits) && item.system.quality === "master") || (/Expert/.test(printedTraits) && item.system.quality === "expert"));
  if (item.type !== "weapon") {
    const stats = entry.lines.find((l) => /^ACP /.test(l)) ?? "";
    const n = (k) => { const m = new RegExp(`${k} ([+-]?\\d+)`).exec(stats); return m ? Number(m[1]) : null; };
    equal(`D8 ${item.name}: ACP, HP and DR are the printed statistics`, [item.system.penalty, item.system.hp.max, item.system.dr], [n("ACP"), n("HP"), n("DR")]);
    if (item.type === "armour") equal(`D9 ${item.name}: Max Dex and Speed are printed`, [item.system.maxDexBonus, item.system.speedPenalty], [n("MAX DEX"), n("Speed")]);
    else equal(`D9 ${item.name}: the shield's base DB plus its potency is the printed DB`, item.system.defenceBonus + item.flags[SYS].specificItem.printedItemBonus, n("DB"));
  } else {
    const stats = entry.lines.find((l) => /^AB /.test(l)) ?? "";
    equal(`D8 ${item.name}: the fumble DC is printed`, item.system.fumbleDC, Number(/FDC (\d+)/.exec(stats)?.[1]));
  }
}
const vestment = SPECIFIC_ARMOUR.find((i) => /Hospice Vestment/.test(i.name));
equal("D10 the Hospice Vestment grants Light at will and Cure 3/day as innate spells, and is the First Aid kit", [vestment.flags[SYS].wondrous.abilities.map((a) => [a.spell, a.frequency]), vestment.flags[SYS].toolFor], [[["Light", "atWill"], ["Cure", "thrice"]], ["firstAid"]]);
const plate = SPECIFIC_ARMOUR.find((i) => /Sealed Sepulchre/.test(i.name));
ok("D11 the Plate of the Sealed Sepulchre carries resistance to essence as a worn effect, and keeps the base plate's Fortitude offer", plate.effects.some((e) => e.changes.some((c) => c.key === "system.combat.resistances" && /essence/.test(c.value))) && Array.isArray(plate.flags[SYS].conditionals));
const coat = SPECIFIC_ARMOUR.find((i) => /Vigil Coat/.test(i.name));
const worn = { ...coat, id: coat._id, system: { ...coat.system, equipped: true } };
equal("D12 the Vigil Coat's Veilwatch gives Spirit Sense at 30 feet through the system's own senses, while worn", senses.sensesOf([worn], 0).map((s) => [s.name, s.rangeFeet]), [["Spirit Sense (Veilwatch)", 30]]);
ok("D13 …and Anchored Soul's +2 is among them: pre-ticked where the save's traits say Soul or possession, offered with the traits excluded otherwise (0.8.1)", (() => { const rows = decl.runeDeclaredBonuses(worn, [worn]).conditionals.filter((c) => /Anchored Soul/.test(c.label) && c.value === 2); return rows.length === 2 && rows[0].auto === true && JSON.stringify(rows[0].when.traits) === JSON.stringify(["soul", "possession"]) && !rows[1].auto && JSON.stringify(rows[1].when.not?.traits) === JSON.stringify(["soul", "possession"]); })());
ok("D13b the wondrous spell grants that print an activation carry it as castAP (0.8.1): Voice of the Dead, Open the Lantern, Walk the Road, Read Vital Traces", [["Grave-Memory Beads", 1], ["Lantern of the Veil", 1], ["Pilgrim's Waystone", 1], ["Boneglass Monocle", 2]].every(([name, ap]) => WONDROUS_ITEMS.find((w) => w.name === name)?.flags["trg-prime"].wondrous.abilities.find((a) => a.kind === "spell")?.castAP === ap) && WONDROUS_ITEMS.find((w) => w.name === "Bell of the Last Road").flags["trg-prime"].wondrous.abilities[0].castAP === undefined);
const scythe = SPECIFIC_WEAPONS.find((i) => /Ancestral Grove/.test(i.name));
const held = { ...scythe, id: scythe._id, system: { ...scythe.system, equipped: true } };
equal("D14 the Bloom of the Ancestral Grove's Requiem I is a 1d6 essence rider bound to it, gated on the Undead or Unliving trait", decl.runeStrikeRiderSpecs(held).map((s) => [s.dice, s.damageType, s.weaponNames, s.targetTraits]), [["1d6", "essence", ["Bloom of the Ancestral Grove"], ["undead", "unliving"]]]);
const waykeeper = SPECIFIC_WEAPONS.find((i) => i.name === "Waykeeper");
const spear = { ...waykeeper, id: waykeeper._id, system: { ...waykeeper.system, equipped: true } };
ok("D15 Waykeeper is ghost touch (Exorcist), with Banishing's 2d6 critical rider and its after-strike save", decl.runeGhostTouch(spear) && decl.runeStrikeRiderSpecs(spear).some((s) => s.dice === "2d6" && s.onCritical) && decl.runeAfterStrikes(spear).some((a) => a.key === "banishing"));
const hook = SPECIFIC_WEAPONS.find((i) => /Hook of the Last Passage/.test(i.name));
ok("D16 the Hook of the Last Passage is cold iron with Soulchain's save", hook.system.material === "coldIron" && decl.runeAfterStrikes({ ...hook, id: hook._id }).some((a) => a.key === "soulchain"));
ok("D17 Witness carries its Recall an Oath use", SPECIFIC_WEAPONS.find((i) => i.name === "Witness").flags[SYS].wondrous.abilities[0].automation === "recallOath");

/* E. Wondrous items and relics */
const ABILITY_KINDS = new Set(["use", "spell", "skillBonus", "stat", "note"]);
for (const item of [...WONDROUS_ITEMS, ...RELICS]) {
  const section = RELICS.includes(item) ? "relics" : "wondrous";
  const heading = Object.keys(TEXT[section]).find((h) => h.replace(/[’']/g, "") === item.name.toUpperCase().replace(/ \(RELIC\)$/, "").replace(/ (I{1,3}|IV)$/, "").replace(/[’']/g, ""));
  const entry = TEXT[section][heading];
  ok(`E1 ${item.name}: the chapter has it`, Boolean(entry));
  if (!entry) continue;
  const tiered = /Stole of Divine Insight/.test(item.name) ? TEXT.wondrous[item.name.toUpperCase()] : null;
  equal(`E2 ${item.name}: level and price are the chapter's`, [item.system.itemLevel, item.system.price], [(tiered ?? entry).level, (tiered ?? entry).price]);
  const w = item.flags[SYS].wondrous;
  ok(`E3 ${item.name}: the wondrous flag with abilities the system reads`, w && Array.isArray(w.abilities) && w.abilities.every((a) => ABILITY_KINDS.has(a.kind)));
  for (const a of w.abilities.filter((x) => x.kind === "use")) ok(`E4 ${item.name}: its use "${a.automation}" is registered`, Boolean(api.registeredItemAutomation(a.automation)) && a.activation && a.frequency);
  for (const a of w.abilities.filter((x) => x.kind === "spell")) {
    const known = [...ALL_GRIMOIRE_SPELLS, ...SPELLS].some((s) => s.name === a.spell) || ["Light", "Cure", "Dead Tongue", "Long Stride", "Restoration"].includes(a.spell);
    ok(`E5 ${item.name}: grants "${a.spell}" (a spell this module or the core ships) at ${a.frequency}`, known && ["daily", "thrice", "atWill", "focus"].includes(a.frequency));
  }
  ok(`E6 ${item.name}: says what the sheet does`, /On the sheet:/.test(item.system.description));
  for (const c of item.flags[SYS].conditionals ?? []) ok(`E7 ${item.name}: offer "${c.scope.slice(0, 40)}…" has a value, a type, a scope and a when`, Number(c.value) > 0 && ["status", "item"].includes(c.type) && c.scope.length > 10 && c.when && typeof c.when === "object");
}
const locket = WONDROUS_ITEMS.find((i) => /Locket/.test(i.name));
const investedLocket = { ...locket, system: { ...locket.system, invested: true, equipped: true } };
equal("E8 the Locket's Past-Life Insight is its use, read by the system", [wuse.wondrousUseOf(investedLocket)?.automation, wuse.wondrousUseLabel(investedLocket)], ["pastLifeInsight", "Past-Life Insight (Free (0 AP), 1/day)"]);
const gloves = WONDROUS_ITEMS.find((i) => /Hands of Mercy/.test(i.name));
const investedGloves = { ...gloves, id: gloves._id, system: { ...gloves.system, invested: true, equipped: true } };
equal("E9 Hands of Mercy: +2 status Medicine, and Steady Gift as an item healing rider (two dice with Lifebinder)", [weff.wondrousBonusesFor(investedGloves).bonuses.map((b) => [b.target, b.entry.value, b.entry.type]), heal.itemHealingRiders([investedGloves]).map((r) => r.maximiseDice), heal.itemHealingRiders([investedGloves], { featNames: ["Lifebinder"] }).map((r) => r.maximiseDice)], [[["system.skills.medicine", 2, "status"]], [1], [2]]);
const stoles = WONDROUS_ITEMS.filter((i) => /Stole of Divine Insight/.test(i.name));
equal("E10 the four Stoles: +1 to +4 status Wisdom with the removal penalty", stoles.map((s) => [s.flags[SYS].wondrous.abilities[0].value, s.flags[SYS].wondrous.abilities[0].removalPenalty, s.flags[SYS].wondrous.tier]), [[1, true, "I"], [2, true, "II"], [3, true, "III"], [4, true, "IV"]]);
const shroud = WONDROUS_ITEMS.find((i) => /Shroud/.test(i.name));
ok("E11 the Shroud requires the Unliving trait, and the restriction is read", shroud.flags[SYS].wondrous.abilities[0].requiresTrait === "unliving" && !weff.abilityApplies(shroud.flags[SYS].wondrous.abilities[0], { traits: "humanoid" }) && weff.abilityApplies(shroud.flags[SYS].wondrous.abilities[0], { traits: "unliving" }));
const concordance = WONDROUS_ITEMS.find((i) => /Concordance/.test(i.name));
ok("E12 the Concordance's Perfect Reference requires Recite from the Text", concordance.flags[SYS].wondrous.abilities[0].requiresFeat === "Recite from the Text");
const lantern = RELICS.find((i) => /Lantern of the Last Road/.test(i.name));
ok("E13 the Lantern of the Last Road: Spirit Sense 60 feet, a 30-foot ally aura, one use for both abilities", senses.sensesOf([lantern], 0).some((s) => s.rangeFeet === 60) && lantern.flags[SYS].auras[0].radius === 30 && lantern.flags[SYS].wondrous.abilities[0].automation === "lanternOfTheLastRoad");
const censer = WONDROUS_ITEMS.find((i) => /Censer of Quiet/.test(i.name));
equal("E14 the Censer's aura: +1 status to allies within 20 feet against possession and Soul effects", [censer.flags[SYS].auras[0].radius, censer.flags[SYS].auras[0].grants.value, censer.flags[SYS].auras[0].grants.traits], [20, 1, ["possession", "soul"]]);
const veilLantern = WONDROUS_ITEMS.find((i) => /Lantern of the Veil/.test(i.name));
equal("E15 the Lantern of the Veil's Open the Lantern is a Focus innate grant of Veil Sight for 10 minutes", veilLantern.flags[SYS].wondrous.abilities.map((a) => [a.spell, a.frequency, a.duration]), [["Veil Sight", "focus", "10 minutes"]]);

/* F. Charged items */
for (const item of CHARGED_ITEMS) {
  const entry = TEXT.charged[item.name.toUpperCase()];
  ok(`F1 ${item.name}: the chapter has it`, Boolean(entry));
  if (!entry) continue;
  const c = item.flags[SYS].chargedItem;
  equal(`F2 ${item.name}: level, price, PP and recharge are the chapter's`, [item.system.itemLevel, item.system.price, c.maximumPP, c.recharge, item.system.uses], [entry.level, entry.price, entry.pp, entry.recharge, entry.pp]);
  if (entry.spells) {
    equal(`F3 ${item.name}: its spell list is the printed one`, c.spells.map((s) => `${s.name} (${s.pp})`).join(", "), entry.spells);
    for (const s of c.spells) ok(`F4 ${item.name}: "${s.name}" is a spell this module or the core ships`, [...ALL_GRIMOIRE_SPELLS, ...SPELLS].some((x) => x.name === s.name) || ["Cure", "Restoration"].includes(s.name));
    ok(`F5 ${item.name}: a staff with the weapon form`, c.kind === "staff" && c.weaponForm?.base === "Staff");
  } else {
    ok(`F5 ${item.name}: a rod with a power the system reads`, c.kind === "rod" && (c.checkAdvantage || c.checkBonus || item.flags[SYS].healingRider));
  }
}
const recall = CHARGED_ITEMS.find((i) => /Scholarly Recall/.test(i.name));
const heldRecall = { ...recall, id: recall._id, system: { ...recall.system, equipped: true } };
ok("F6 the Rod of Scholarly Recall answers its five actions for 2 PP, and nothing else", rods.advantageRodFor([heldRecall], "religion", { actionKey: "analyseScripture" })?.cost === 2 && rods.advantageRodFor([heldRecall], "religion", { actionKey: "recallKnowledge" }) && rods.advantageRodFor([heldRecall], "perception", { actionKey: "search" }) === null);
const intercession = CHARGED_ITEMS.find((i) => /Rod of Intercession/.test(i.name));
equal("F7 the Rod of Intercession buys +2 item on a Spellcraft (Counteract) check for 2 PP", rods.bonusRodFor([{ ...intercession, id: intercession._id, system: { ...intercession.system, equipped: true } }], { checkType: "spellcraft" })?.value, 2);
const merciful = CHARGED_ITEMS.find((i) => /Merciful Channeling/.test(i.name));
equal("F8 the Rod of Merciful Channeling is a held healing rider: +1d8 to one creature for 1 PP", heal.itemHealingRiders([{ ...merciful, id: merciful._id, system: { ...merciful.system, equipped: true } }]).map((r) => [r.extraDice, r.ppCost, r.oneTarget]), [["1d8", 1, true]]);

/* G. Magical consumables */
for (const item of MAGIC_CONSUMABLES) {
  const heading = Object.keys(TEXT.consumables).find((h) => h.replace(/[’']/g, "") === item.name.toUpperCase().replace(/[’']/g, ""));
  const entry = TEXT.consumables[heading];
  ok(`G1 ${item.name}: the chapter has it`, Boolean(entry));
  if (!entry) continue;
  equal(`G2 ${item.name}: level and price are the chapter's`, [item.system.itemLevel, item.system.price], [entry.level, entry.price]);
  ok(`G3 ${item.name}: a consumable with the printed activation and one use`, item.type === "consumable" && item.system.uses === 1 && item.system.activation.length > 0 && item.flags[SYS].consumable.kind === "other");
  ok(`G4 ${item.name}: says what the sheet does`, /On the sheet:/.test(item.system.description));
}
const vial = MAGIC_CONSUMABLES.find((i) => /Vial of Sanctified Dew/.test(i.name));
const vialRef = cons.consumableEffectRef(vial);
equal("G5 the Vial offers its four choices through the system's reader, and the Full Rest note rides them all", [vialRef.choose.length, cons.chosenConsumableEffects(vialRef, 0).map((e) => e.kind), cons.chosenConsumableEffects(vialRef, 3).map((e) => e.kind)], [4, ["note", "conditionRelief"], ["note", "conditional"]]);
const resin = MAGIC_CONSUMABLES.find((i) => /Embalmer/.test(i.name));
ok("G6 the Resin requires the Unliving trait and heals 3d8", cons.consumableEffectRef(resin).requiresTrait === "unliving" && cons.consumableEffectRef(resin).effects.some((e) => e.kind === "heal" && e.formula === "3d8") && cons.consumableTraitRefusal(cons.consumableEffectRef(resin), "humanoid", "Tebb").length > 0);
const talisman = MAGIC_CONSUMABLES.find((i) => /Soulguard/.test(i.name));
equal("G7 the Soulguard Talisman is a worn save reroll, destroyed by use", decl.itemSaveRerolls({ ...talisman, system: { ...talisman.system, equipped: true } }).map((r) => [r.source, r.destroy, r.traits]), [["consumable", true, ["possession", "soul drain", "soul"]]]);
const spores = MAGIC_CONSUMABLES.find((i) => /Memory Spores/.test(i.name));
ok("G8 Memory Spores: a one-shot advantage on Recall Knowledge for 10 minutes", cons.consumableEffectRef(spores).duration === "10 minutes" && cons.consumableEffectRef(spores).effects.some((e) => e.kind === "conditional" && e.grants.some((g) => g.kind === "advantage" && g.oneShot && g.when.actions.includes("recallKnowledge"))));

/* H. The requirement and the loader */
equal("H1 module version", manifest.version, "0.11.1");
equal("H2 requires TRG Prime 3.630.1+", manifest.relationships.systems[0].compatibility.minimum, "3.630.1");
ok("H3 the loader requires 3.630.1 and registration hands the runes over", /REQUIRED_SYSTEM = "3\.630\.1"/.test(fs.readFileSync(path.join(ROOT, "scripts", "pillars-of-faith.mjs"), "utf8")) && /registerMagicItems\(api, moduleId\);/.test(fs.readFileSync(path.join(ROOT, "module", "registration.mjs"), "utf8")));
ok("H4 the system is at least 3.626.0", Number(JSON.parse(fs.readFileSync(path.join(SYSTEM_ROOT, "system.json"), "utf8")).version.split(".")[1]) >= 626);

api.resetModuleRegistry();
const EXPECTED_CHECKS = 592;
if (EXPECTED_CHECKS) equal("Z the suite ran every check it is meant to", checks + 1, EXPECTED_CHECKS);
if (failures.length) { console.log(`verify-magic-items: ${checks} checks — ${failures.length} FAILED\n`); for (const f of failures) console.log(`  ✗ ${f}`); process.exitCode = 1; }
else console.log(`verify-magic-items: ${checks} checks — all green.`);
