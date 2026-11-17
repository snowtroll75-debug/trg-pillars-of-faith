#!/usr/bin/env node
/**
 * verify-audit — the 0.12.0 automation audit's repairs.
 *
 *   node tools/verify-audit.mjs
 *
 * Each check below fails on the 0.11.4 data or code it replaced (run it
 * against a 0.11.4 tree to see them go red). Driven where the code is pure
 * enough to drive: relay.mjs runs against fake actors and a fake socket.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
let checks = 0;
const failures = [];
function ok(label, cond) { checks += 1; if (!cond) failures.push(label); }
function equal(label, got, want) { checks += 1; if (JSON.stringify(got) !== JSON.stringify(want)) failures.push(`${label} — expected ${JSON.stringify(want)}, got ${JSON.stringify(got)}`); }

const docs = [];
for (const pack of fs.readdirSync(path.join(ROOT, "packs-source"))) {
  for (const f of fs.readdirSync(path.join(ROOT, "packs-source", pack))) {
    if (f.endsWith(".json")) docs.push({ pack, ...JSON.parse(fs.readFileSync(path.join(ROOT, "packs-source", pack, f), "utf8")) });
  }
}
const byName = (name, pack) => docs.find((d) => d.name === name && (!pack || d.pack === pack));
const changesOf = (d) => (d?.effects ?? []).flatMap((e) => e.changes ?? []);

/* ------------------------------------------------------------------ *
 * A. Speeds write the pool's base (the prepareDerivedData crash)
 * ------------------------------------------------------------------ */
const SPEED_NODE = /^system\.combat\.movement\.(land|fly|swim|climb|burrow)$/;
const bare = docs.flatMap((d) => changesOf(d).filter((c) => SPEED_NODE.test(c.key)).map(() => d.name));
equal("A1 no change writes a bare speed node (it replaces the pool and the next `.other` throws)", bare, []);
for (const race of ["Eshari", "Kethrani", "Myrathi", "Rhevani"]) {
  const c = changesOf(byName(race, "pof-races")).find((x) => x.key.startsWith("system.combat.movement.land"));
  equal(`A2 ${race}: Speed 25 as an OVERRIDE of land.base`, c && [c.key, c.mode, c.value], ["system.combat.movement.land.base", 5, "25"]);
}
const sevrai = changesOf(byName("Sevrai", "pof-heritages")).find((x) => x.key.startsWith("system.combat.movement"));
equal("A3 Sevrai: +5 ft as an ADD to land.base", sevrai && [sevrai.key, sevrai.mode, sevrai.value], ["system.combat.movement.land.base", 2, "5"]);
ok("A4 the builder writes .base", /system\.combat\.movement\.land\.base", mode: 5/.test(read("tools/content/builders.mjs")));

/* ------------------------------------------------------------------ *
 * B. Counteract spells: the core rows that find and end the effect
 * ------------------------------------------------------------------ */
const rows = (name) => byName(name, "pof-spells")?.system?.effects ?? [];
const row = (name, kind) => rows(name).find((r) => r.kind === kind);
// Enchantment added at 0.12.1 (Graham's ruling U3: Charm and Compulsion automated).
equal("B1 Break the Evil Eye counteracts one Curse, possession, Fear or Enchantment effect", row("Break the Evil Eye", "counteract") && [row("Break the Evil Eye", "counteract").traits, row("Break the Evil Eye", "counteract").limit], [["curse", "possession", "fear", "enchantment"], 1]);
equal("B2 Sever Influence counteracts one Curse, possession or Enchantment effect", row("Sever Influence", "counteract") && [row("Sever Influence", "counteract").traits, row("Sever Influence", "counteract").limit], [["curse", "possession", "enchantment"], 1]);
equal("B3 Sever Soulchain counteracts one possession effect", row("Sever Soulchain", "counteract") && [row("Sever Soulchain", "counteract").traits, row("Sever Soulchain", "counteract").limit], [["possession"], 1]);
// ENCHANTMENT ONLY WHERE RULED (0.12.1): the two charm-and-compulsion spells,
// each telling the caster to cancel against a voluntarily accepted effect.
ok("B4 Enchantment only on the rows Graham ruled for, each with the voluntary-effect warning; never Mental, Soul or Emotion", docs.every((d) => (d.system?.effects ?? []).filter((r) => r.kind === "counteract").every((r) => !(r.traits ?? []).some((t) => ["mental", "soul", "emotion"].includes(t)) && (!(r.traits ?? []).includes("enchantment") || (["Break the Evil Eye", "Sever Influence"].includes(d.name) && (d.system.effects ?? []).some((n) => n.kind === "note" && /Voluntarily accepted/.test(n.text)))))));
const expel = row("Expel Possessor", "counteractRoll");
const exorcise = row("Exorcise", "counteractRoll");
ok("B5 Expel Possessor rolls its Counteract and prints the rung, as Exorcise does", Boolean(expel && exorcise) && Object.keys(expel.outcomes).join() === Object.keys(exorcise.outcomes).join());
equal("B6 Expel Possessor's +4 PP warp pre-fills +2 circumstance", byName("Expel Possessor", "pof-spells")?.system?.warps?.[0]?.mods, { bonusValue: 2, bonusMax: 2 });
for (const n of ["Break the Evil Eye", "Sever Influence", "Sever Soulchain", "Expel Possessor"]) {
  ok(`B7 ${n}: the rest of its rule is still on the card`, rows(n).some((r) => r.kind === "note" && r.text.length > 40));
}

/* ------------------------------------------------------------------ *
 * C. Healing and its writes go through the system and the GM relay
 * ------------------------------------------------------------------ */
const cls = read("module/class-automations.mjs");
const feats = read("module/feat-automations.mjs");
const healerBlock = cls.slice(cls.indexOf("/* HEALER"), cls.indexOf("/* SHAMAN"));
ok("C1 the Healer's abilities no longer write HP directly", !/system\.resources\.hp\.value/.test(healerBlock));
ok("C2 nor tell the player to apply it on the target's sheet", !/on their sheet/.test(healerBlock));
ok("C3b Not Yet Finished holds at 1 HP through holdAtOneHp (Dying cleared)", /holdAtOneHp\(actor\)/.test(feats.slice(feats.indexOf("const notYetFinished"), feats.indexOf("const pilgrimOfManyLives"))));
for (const n of ["Lifebound Ward", "Restorative Spores", "Share the Wound"]) {
  const start = feats.indexOf(`postCard(actor, "${n}"`);
  const body = feats.slice(Math.max(0, start - 900), start + 400);
  ok(`C3 ${n} heals through healTarget`, /healTarget\(target/.test(body) && !/target\.update\(\{ "system\.resources\.hp\.value"/.test(body));
}

// Drive relay.mjs with fakes.
const emitted = [];
const calls = [];
globalThis.game = {
  user: { id: "gm", isGM: true },
  users: { activeGM: { id: "gm" } },
  socket: { emit: (s, d) => emitted.push([s, d]), on: () => {} },
  trgPrime: { modules: { helpers: {
    healActor: async (a, amt, opts) => { calls.push(["heal", a.name, amt, opts?.magical]); const hp = a.system.resources.hp; if (a.dying) return 0; const before = hp.value; hp.value = Math.min(hp.max, hp.value + amt); return hp.value - before; },
    grantTempHP: async (a, amt) => { calls.push(["temp", a.name, amt]); a.system.resources.hp.temp = Math.max(a.system.resources.hp.temp, amt); return a.system.resources.hp.temp; }
  } } }
};
const relay = await import(path.join(ROOT, "module/relay.mjs"));
const fakeActor = (name, { value = 10, max = 30, owner = true, dying = false, conditions = {} } = {}) => ({
  name, uuid: `Actor.${name}`, documentName: "Actor", isOwner: owner, dying,
  system: { resources: { hp: { value, max, temp: 0 } } }, cond: { ...conditions }, hpWrites: [],
  hasCondition(k) { return k === "dying" ? this.dying : Boolean(this.cond[k]); },
  getConditionValue(k) { return k === "dying" ? (this.dying ? 2 : 0) : (this.cond[k] ?? 0); },
  async toggleStatusEffect(k, o) { if (o.active === false) delete this.cond[k]; else this.cond[k] = o.value; if (k === "dying" && o.active === false) this.dying = false; },
  async update(d) { this.hpWrites.push(d); if ("system.resources.hp.value" in d) this.system.resources.hp.value = d["system.resources.hp.value"]; }
});
{
  const a = fakeActor("Ally", { value: 25, max: 30 });
  const out = await relay.healTarget(a, 9);
  equal("C4 healTarget: through the system's healActor, magical, with what overflowed", [out, calls.at(-1)], [{ healed: 5, wasted: 4, dying: false }, ["heal", "Ally", 9, true]]);
  const d = fakeActor("Dying", { value: 0, dying: true });
  const outD = await relay.healTarget(d, 9);
  equal("C5 healTarget: a Dying creature wastes nothing into temporary HP", outD, { healed: 0, wasted: 0, dying: true });
  const other = fakeActor("Theirs", { owner: false });
  await relay.giveTempHp(other, 6);
  equal("C6 giveTempHp on another's creature asks the GM through the module socket", emitted.at(-1), ["module.trg-pillars-of-faith", { action: "tempHP", targetUuid: "Actor.Theirs", amount: 6 }]);
  const tired = fakeActor("Tired", { owner: false, conditions: { fatigued: 2 } });
  await relay.reduceCondition(tired, "fatigued", 1);
  equal("C7 reduceCondition on another's creature is relayed", emitted.at(-1)[1], { action: "conditionStep", targetUuid: "Actor.Tired", key: "fatigued", by: 1 });
  equal("C8 …and nothing is written on this client", tired.cond.fatigued, 2);
  // The GM's side.
  const gmSide = fakeActor("Tired", { conditions: { fatigued: 2 } });
  await relay.handleRelay({ action: "conditionStep", targetUuid: "Actor.Tired", key: "fatigued", by: 1 }, { resolve: () => gmSide });
  equal("C9 the GM's client steps the condition down", gmSide.cond.fatigued, 1);
  // Ruling U5 (0.12.1): Fatigued is set to AT LEAST 1, not raised by 1.
  const lifeline = async (fatigued) => { const f = fakeActor("Falling", { value: 0, dying: true, conditions: fatigued ? { fatigued } : {} }); await relay.handleRelay({ action: "lifeline", targetUuid: "Actor.Falling" }, { resolve: () => f }); return [f.system.resources.hp.value, f.dying, f.cond.fatigued ?? 0]; };
  equal("C10 Lifeline on the GM's client: 1 HP, not Dying, Fatigued at least 1 (from 0, 1 and 2)", [await lifeline(0), await lifeline(1), await lifeline(2)], [[1, false, 1], [1, false, 1], [1, false, 2]]);
  {
    // Ruling U1 (0.12.1): Gift of Healing's rider does nothing on a Dying recipient.
    const before = calls.length;
    const r = await relay.healTarget(fakeActor("DyingRider", { value: 0, dying: true }), 7, { rider: true });
    equal("C14 a rider heal on a Dying creature: no HP, no second Dying step, healActor not called", [r, calls.length - before], [{ healed: 0, wasted: 0, dying: true }, 0]);
    const r2 = await relay.healTarget(fakeActor("UpRider", { value: 10, max: 30 }), 7, { rider: true });
    equal("C15 …and on a creature that is not Dying it heals as before", r2, { healed: 7, wasted: 0, dying: false });
    const cl = read("module/class-automations.mjs");
    ok("C16 Gift of Healing and Healer's Touch heal in rider mode", (cl.match(/healTarget\(target, [^)]*\{ rider: true \}\)/g) ?? []).length >= 2);
  }
  game.user = { id: "p1", isGM: false };
  const untouched = fakeActor("Nope", { conditions: { fatigued: 3 } });
  equal("C11 a player's client ignores a relayed write", [await relay.handleRelay({ action: "conditionStep", targetUuid: "x", key: "fatigued", by: 1 }, { resolve: () => untouched }), untouched.cond.fatigued], [false, 3]);
  game.user = { id: "gm2", isGM: true };
  equal("C12 a second GM leaves it to the active one", await relay.handleRelay({ action: "tempHP", targetUuid: "x", amount: 3 }, { resolve: () => fakeActor("Two") }), false);
  ok("C13 one socket handler, registered at ready", /registerRelaySocket\(\);/.test(read("module/pass-automations.mjs")) && /registerPassSocket\(\);/.test(read("scripts/pillars-of-faith.mjs")));
}

/* ------------------------------------------------------------------ *
 * D. Racial light is a registered light source
 * ------------------------------------------------------------------ */
{
  const { LIGHT_SOURCES, lightSourceKeyFor } = await import(path.join(ROOT, "module/automations.mjs"));
  equal("D1 four light sources: Bloom Light and Lantern Glow, 10 and 30 feet", LIGHT_SOURCES.map((s) => [s.key, s.radiusFeet]), [["pof-bloom-light", 10], ["pof-bloom-light-30", 30], ["pof-lantern-glow", 10], ["pof-lantern-glow-30", 30]]);
  // Ruling U2 (0.12.1): the Lumeri's and Lumari's light is magical.
  ok("D2 dim light: one step, capped at dim, no bright ring, magical", LIGHT_SOURCES.every((s) => s.steps === 1 && s.cap === 5 && s.brightFeet === 0 && s.dimFeet === s.radiusFeet && s.magical === true));
  equal("D3 the toggle picks its key by radius", [lightSourceKeyFor("Bloom Light", 10), lightSourceKeyFor("Lantern Glow", 30)], ["pof-bloom-light", "pof-lantern-glow-30"]);
  const reg = [];
  const fake = new Proxy({}, { get: (_, n) => (...a) => { reg.push([n, ...a]); return true; } });
  (await import(path.join(ROOT, "module/registration.mjs"))).registerContent(fake, "trg-pillars-of-faith");
  const { ITEM_LIGHT_SOURCES } = await import(path.join(ROOT, "module/item-lights.mjs"));
  ok("D4 registered through registerLightSources (with the two lanterns')", reg.some(([n, list]) => n === "registerLightSources" && Array.isArray(list) && [...LIGHT_SOURCES, ...ITEM_LIGHT_SOURCES].every((x) => list.includes(x)) && list.length === LIGHT_SOURCES.length + ITEM_LIGHT_SOURCES.length));
  ok("D5 the effect carries the key, and the token is redrawn", /lightSource: lightSourceKeyFor\(title, radius\)/.test(read("module/automations.mjs")) && /refreshTokenLight\(actor\)/.test(read("module/automations.mjs")));
  ok("D6 the card no longer says the token is not lit", !/Token lighting isn't set automatically/.test(read("module/automations.mjs")));
}

/* ------------------------------------------------------------------ *
 * F. A "while worn" item effect switches off when the item is not equipped
 * ------------------------------------------------------------------ */
{
  const { wornEffectSuppressed } = await import(path.join(ROOT, "module/worn-effects.mjs"));
  const plate = byName("Plate of the Sealed Sepulchre", "pof-specific-items");
  const eff = plate.effects.find((e) => e.flags?.["trg-prime"]?.worn === true);
  ok("F1 the plate's essence resistance is flagged worn", Boolean(eff) && eff.changes.some((c) => c.key === "system.combat.resistances" && /essence/.test(c.value)));
  const on = (equipped, type = "armour") => ({ ...eff, parent: { documentName: "Item", type, system: { equipped } } });
  equal("F2 suppressed while the plate is carried, not while worn", [wornEffectSuppressed(on(false)), wornEffectSuppressed(on(true))], [true, false]);
  equal("F3 an effect without the flag, or on a feat, is never touched", [wornEffectSuppressed({ flags: {}, parent: { documentName: "Item", type: "armour", system: { equipped: false } } }), wornEffectSuppressed({ ...on(false, "feat") })], [false, false]);
  ok("F4 registered through registerEffectSuppressor", /registerEffectSuppressor\?\.\("pof-worn-effects", wornEffectSuppressed, moduleId\)/.test(read("module/registration.mjs")));
  // Every worn-flagged effect in the packs sits on equipment (so the gate can reach it).
  // Ruling U4 (0.12.1): an Invested-trait item's effects wait for Invest Item.
  const inv = (equipped, invested, worn = true) => ({ flags: { "trg-prime": worn ? { worn: true } : {} }, parent: { documentName: "Item", type: "gear", system: { equipped, invested, traits: "Invested, Soul" } } });
  equal("F6 Invested trait: suppressed until invested, and while worn-flagged until equipped too", [wornEffectSuppressed(inv(true, false)), wornEffectSuppressed(inv(false, true)), wornEffectSuppressed(inv(true, true)), wornEffectSuppressed(inv(true, false, false)), wornEffectSuppressed(inv(false, true, false))], [true, true, false, true, false]);
  ok("F7 the core half (Invested-trait conditionals) ships as a separate core patch", fs.existsSync(path.join(ROOT, "core-patches/core-invested-conditionals.diff")));
  ok("F5 every worn-flagged effect is on equipment", docs.every((d) => (d.effects ?? []).every((e) => e.flags?.["trg-prime"]?.worn !== true || ["armour", "shield", "weapon", "gear"].includes(d.type))));
}

/* ------------------------------------------------------------------ *
 * G. Fast Healing is declared, not noted
 * ------------------------------------------------------------------ */
{
  const featsSrc = read("module/feat-automations.mjs");
  for (const n of ["Blood Awakened", "Perfected Aberration"]) {
    const start = featsSrc.indexOf(`selfEffect("${n}"`);
    const body = featsSrc.slice(start, featsSrc.indexOf("});", start));
    ok(`G1 ${n} declares fastHealing 1 on its effect`, /extra: \(\) => \(\{ flags: \{ fastHealing: 1(, strikeDamageRider: BLOOD_AWAKENED_RIDER)? \} \}\)/.test(body) && !/Fast Healing 1 \(a note\)|— a note\)/.test(body));
  }
}

/* ------------------------------------------------------------------ *
 * H. Vesperyn: Darkvision when the race already gives Nightvision
 * ------------------------------------------------------------------ */
{
  const { decideVesperynSight } = await import(path.join(ROOT, "module/vesperyn.mjs"));
  const nv = (from) => ({ type: "ability", name: "Nightvision", flags: { "trg-prime": { grantedBy: { sourceId: from } } } });
  equal("H1 an Eshari (racial Nightvision) taking Vesperyn is owed Darkvision", decideVesperynSight([nv("race")], "feat"), "darkvision");
  equal("H2 a race without Nightvision keeps the feat's Nightvision", decideVesperynSight([nv("feat")], "feat"), null);
  equal("H3 a character who already has Darkvision gets nothing more", decideVesperynSight([nv("race"), { type: "ability", name: "Darkvision", flags: {} }], "feat"), null);
  ok("H4 the entry script runs it after the feat's grants, on the adding client", /grantVesperynSight\(item\.parent, item\)/.test(read("scripts/pillars-of-faith.mjs")) && /userId !== game\.user\?\.id/.test(read("scripts/pillars-of-faith.mjs")));
  ok("H5 and it is stamped as the feat's grant, so it leaves with the feat", /grantedBy`, \{ sourceId: feat\.id/.test(read("module/vesperyn.mjs")));
  ok("H6 the sheet text no longer asks for a hand swap", !/swap the ability by hand/.test(JSON.stringify(byName("Vesperyn", "pof-feats")?.system?.description ?? "")));
}

/* ------------------------------------------------------------------ *
 * I. First Age Theologian offers Intelligence for Wisdom
 * ------------------------------------------------------------------ */
{
  const rowsFAT = byName("First Age Theologian", "pof-feats")?.flags?.["trg-prime"]?.conditionals ?? [];
  ok("I1 an offered Intelligence-for-Wisdom row on the three named Religion actions", rowsFAT.some((r) => r.valueFrom === "intelligence-wisdom" && r.auto === false && (r.when?.actions ?? []).length === 3));
  ok("I2 and the +1 racial row is kept", rowsFAT.some((r) => r.value === 1 && r.type === "race"));
}

/* ------------------------------------------------------------------ *
 * J. Elemental Spirit grants its bonus Verdant cantrip (0.12.1)
 * ------------------------------------------------------------------ */
{
  const { elementalCantripEligible } = await import(path.join(ROOT, "module/class-automations.mjs"));
  const sp = (o) => ({ name: o.name ?? "x", system: { ppCost: 0, tradition: "verdant", traits: "Fire", specialist: false, ...o } });
  equal("J1 a PP 0 Verdant cantrip with the element's trait qualifies; others do not", [
    elementalCantripEligible(sp({}), "fire"), elementalCantripEligible(sp({ traits: "Cold" }), "fire"), elementalCantripEligible(sp({ ppCost: 1 }), "fire"),
    elementalCantripEligible(sp({ tradition: "arcane" }), "fire"), elementalCantripEligible(sp({ specialist: true }), "fire")
  ], [true, false, false, false, false]);
  const src = read("module/class-automations.mjs");
  ok("J3 the Use grants it, stamped as the ability's grant and outside cantrips known", /grantElementalCantrip\(actor, item, /.test(src) && /bonusCantrip`, true/.test(src) && /grantedBy`, \{ sourceId: item\.id/.test(src));
  ok("J4 a character who chose before 0.12.1 can Use again to take it", /if \(!hasCantrip\) \{ await grantElementalCantrip/.test(src));
}

/* ------------------------------------------------------------------ *
 * K. Second Discipline withholds the 7th-level Advanced spell (0.12.1)
 * ------------------------------------------------------------------ */
{
  const { firstLevelSpellsOnly, secondDisciplineUpdate } = await import(path.join(ROOT, "module/second-discipline.mjs"));
  equal("K1 the levelled list keeps level 1 and unlevelled entries", firstLevelSpellsOnly("1: Bless, 7: Holy Word, Light"), "1: Bless, Light");
  const ab = (by, gs = "1: Bless, 7: Holy Word") => ({ type: "ability", system: { grantedSpells: gs }, flags: { "trg-prime": { grantedBy: { sourceName: by } } } });
  equal("K2 only an ability granted by Second Discipline is trimmed", [secondDisciplineUpdate(ab("Second Discipline")), secondDisciplineUpdate(ab("Archivist")), secondDisciplineUpdate(ab("Second Discipline", "1: Bless"))], [{ "system.grantedSpells": "1: Bless" }, null, null]);
  ok("K3 hooked on preCreateItem", /Hooks\.on\("preCreateItem"[\s\S]{0,200}secondDisciplineUpdate/.test(read("scripts/pillars-of-faith.mjs")));
}

/* ------------------------------------------------------------------ *
 * L. Sacred Marginalia and the Liturgist (0.12.1)
 * ------------------------------------------------------------------ */
{
  const L = await import(path.join(ROOT, "module/liturgy.mjs"));
  const e = (pp, tradition = "divinity", specialist = false) => ({ system: { ppCost: pp, tradition, specialist } });
  equal("L1 a Divinity spell you can cast: PP 1 to caster level + 1, not specialist, not a cantrip", [L.divinityPickEligible(e(4), 3), L.divinityPickEligible(e(5), 3), L.divinityPickEligible(e(0), 3), L.divinityPickEligible(e(2, "arcane"), 3), L.divinityPickEligible(e(2, "divinity", true), 3), L.divinityPickEligible(e(2, "Arcane, Divinity"), 3)], [true, false, false, false, false, true]);
  const data = L.marginaliaSpellData({ name: "Bless", system: { prepared: true }, flags: {} }, { id: "F1", name: "Sacred Marginalia" });
  equal("L2 a Marginalia spell is a book spell outside the ladder, owned by the feat, unprepared", [data.system.prepared, data.flags["trg-prime"].spellBookPick, data.flags["trg-prime"].learnedExtra, data.flags["trg-prime"].grantedBy.sourceId], [false, true, true, "F1"]);
  const book = { flags: { "trg-pillars-of-faith": { recorded: [{ id: "a", name: "A", via: "free" }, { id: "b", name: "B", via: "free" }, { id: "c", name: "C", via: "learned" }] } } };
  equal("L3 the Liturgical Book owes four free records; learned ones are extra", [L.freeRecordsLeft({}), L.freeRecordsLeft(book), L.recordedSpells(book).length], [4, 2, 3]);
  const daily = L.liturgySpellData({ name: "Bless", system: { prepared: false }, flags: {} }, { id: "F2", name: "Liturgist" }, L.LITURGY_DAILY);
  equal("L4 the day's selection is a GRANTED spell (outside the memorised total and the repertoire), prepared, marked", [daily.system.prepared, daily.flags["trg-prime"].grantedBy.sourceId, daily.flags["trg-prime"].dailyMemorised, daily.flags["trg-prime"].repertoirePick, daily.flags["trg-pillars-of-faith"].liturgyDaily], [true, "F2", undefined, undefined, true]);
  const items = [{ type: "spell", flags: { "trg-pillars-of-faith": { liturgyDaily: true } } }, { type: "spell", flags: { "trg-pillars-of-faith": { liturgyMoment: true } } }, { type: "spell", flags: {} }];
  equal("L5 the sweeps: a new day takes both kinds, a turn's end only Liturgy of Prayer's", [L.liturgySweep(items).length, L.liturgySweep(items, [L.LITURGY_MOMENT]).length], [2, 1]);
  const scripts = read("scripts/pillars-of-faith.mjs");
  ok("L6 the sweeps run on TRG Prime's daily-preparation and turn-end hooks", /registerLiturgyHooks\(\)/.test(scripts) && /trgPrimeDailyPreparation/.test(read("module/liturgy.mjs")) && /trgPrimeTurnEnded/.test(read("module/liturgy.mjs")));
  const fa = read("module/feat-automations.mjs");
  ok("L7 Liturgist, Sacred Marginalia and Liturgy of Prayer Use the new code", /"liturgist": liturgist/.test(fa) && /"sacred marginalia": sacredMarginalia/.test(fa) && /useLiturgyOfPrayer\(actor, item/.test(fa) && /useSacredMarginalia\(actor, item\)/.test(fa));
  ok("L8 Liturgy of Prayer no longer reaches any unprepared spell", !/s\.type === "spell" && !s\.system\?\.prepared/.test(fa));
  ok("L9 the sheet texts no longer send the selection or the four spells to the table", !/daily selection is a rule for the table/.test(JSON.stringify(byName("Liturgist", "pof-feats") ?? {})) && !/four extra Prayer Book spells and the halved copying cost are for the table/.test(JSON.stringify(byName("Sacred Marginalia", "pof-feats") ?? {})));
}

/* ------------------------------------------------------------------ *
 * M. The two lanterns shed their light; the relic resists essence (0.12.1)
 * ------------------------------------------------------------------ */
{
  const M = await import(path.join(ROOT, "module/item-lights.mjs"));
  equal("M1 Lantern of the Veil 20 ft, the Last Road relic 30 ft, magical dim light", M.ITEM_LIGHT_SOURCES.map((x) => [x.item, x.radiusFeet, x.magical]), [["Lantern of the Veil", 20, true], ["Lantern of the Last Road (Relic)", 30, true]]);
  for (const x of M.ITEM_LIGHT_SOURCES) ok(`M2 ${x.item} is a real item in the packs`, Boolean(byName(x.item)));
  const it = (equipped, invested, name = "Lantern of the Veil") => ({ id: "L1", name, system: { equipped, invested } });
  equal("M3 lit only while held and invested", [M.itemLightOn(it(true, true)), M.itemLightOn(it(true, false)), M.itemLightOn(it(false, true)), M.itemLightOn(it(true, true, "Lantern"))], [true, false, false, false]);
  const fx = (id, itemId, key) => ({ id, flags: { "trg-prime": { lightSource: key }, "trg-pillars-of-faith": { itemLight: itemId } } });
  equal("M4 the plan creates the missing light", M.itemLightPlan([it(true, true)], []), { create: [{ itemId: "L1", key: "pof-lantern-of-the-veil" }], remove: [] });
  equal("M5 …keeps a correct one, removes a stale or duplicate one", M.itemLightPlan([it(true, true)], [fx("E1", "L1", "pof-lantern-of-the-veil"), fx("E2", "L1", "pof-lantern-of-the-veil"), fx("E3", "GONE", "pof-lantern-of-the-veil")]), { create: [], remove: ["E2", "E3"] });
  equal("M6 …and removes it when the lantern is stowed", M.itemLightPlan([it(false, true)], [fx("E1", "L1", "pof-lantern-of-the-veil")]), { create: [], remove: ["E1"] });
  ok("M7 hooked on the item's create, update and delete", /registerItemLightHooks\(\)/.test(read("scripts/pillars-of-faith.mjs")));
  const relic = byName("Lantern of the Last Road (Relic)");
  const res = (relic?.effects ?? []).find((x) => x.changes?.some((c) => c.key === "system.combat.resistances" && /essence/.test(c.value)));
  ok("M8 the relic's Resistance to essence is a worn-flagged effect (held, and the Invested gate)", Boolean(res) && res.flags?.["trg-prime"]?.worn === true && /invested/i.test(String(relic.system?.traits)));
  ok("M9 neither lantern's sheet says its light is the table's", !/light (are|is) the table's|30-foot light are the table's/.test(JSON.stringify([relic?.system?.description, byName("Lantern of the Veil")?.system?.description])));
}

/* ------------------------------------------------------------------ *
 * N. Final Toll lands its ladder (0.12.1)
 * ------------------------------------------------------------------ */
{
  const { FINAL_TOLL_LADDER } = await import(path.join(ROOT, "module/feat-automations.mjs"));
  equal("N1 the printed ladder", FINAL_TOLL_LADDER, { partial: { noReactions: true, attackPenalty: 0, slowed: 0 }, failure: { noReactions: true, attackPenalty: 1, slowed: 0 }, fumble: { noReactions: true, attackPenalty: 1, slowed: 1 }, blunder: { noReactions: true, attackPenalty: 1, slowed: 1 } });
  const fa = read("module/feat-automations.mjs");
  ok("N2 Slowed lands through the system's condition relay, the −1 as a target effect, Sacred Toll left expended", /applyConditionTagsTo\(target, \[\{ key: "slowed"/.test(fa) && /createEffectsOn\(target, \[\{ name: "Final Toll"/.test(fa) && /"system\.usesValue": 0/.test(fa) && /"final toll": finalToll/.test(fa));
}

/* ------------------------------------------------------------------ *
 * O. Rulings U6–U8 (Graham, 16 Nov 2026; 0.12.2)
 * ------------------------------------------------------------------ */
{
  const plate = byName("Plate of the Sealed Sepulchre", "pof-specific-items");
  ok("O1 U6: the plate's Resistance is plain essence, not scoped", (plate?.effects ?? []).some((e) => e.changes.some((c) => c.key === "system.combat.resistances" && c.value === ", essence")));
  // U7, as shipped in 0.12.3: declared rows the core reads on every cast (TRG Prime 3.695.0).
  const erFx = (byName("Eternal Resonance", "pof-feats")?.effects ?? []).flatMap((e) => [e.flags?.["trg-prime"]?.spellDCBonus, e.flags?.["trg-prime"]?.spellAttackBonus]).filter(Boolean);
  equal("O2 U7: Eternal Resonance declares +1 racial to the Save DC and the spell attack of every innate spell, an item's included", erFx.map((r) => [r.value, r.type, r.innateOnly, r.itemCasts]), [[1, "race", true, true], [1, "race", true, true]]);
  const reg = [];
  (await import(path.join(ROOT, "module/registration.mjs"))).registerContent(new Proxy({}, { get: (_, n) => (...a) => { reg.push([n, ...a]); return true; } }), "trg-pillars-of-faith");
  ok("O3 the 0.12.2 casting option is gone (it never reached an innate cast)", !reg.some(([n, k]) => n === "registerCastOption" && k === "pof-eternal-resonance"));
  ok("O4 and the manifest asks for the core that reads the attack row", JSON.parse(read("module.json")).relationships.systems[0].compatibility.minimum === "3.696.0");
  const R = await import(path.join(ROOT, "module/relay.mjs"));
  const fx = (id, traits, statuses = []) => ({ id, name: `E${id}`, flags: { "trg-prime": { sourceTraits: traits } }, statuses: new Set(statuses) });
  const actor = { hasCondition: (k) => ["frightened", "blinded"].includes(k), effects: [fx("1", "Fear, Mental"), fx("2", "Curse"), fx("3", "Fear", ["frightened"]), fx("4", "Disease")],
    items: [{ id: "a", name: "Ghoul Fever", type: "affliction", system: { afflictionType: "disease" }, flags: {} }, { id: "b", name: "Slime", type: "affliction", system: { afflictionType: "curse" }, flags: { "trg-prime": { counteredAs: ["disease"] } } }, { id: "c", name: "Venom", type: "affliction", system: { afflictionType: "poison" }, flags: {} }] };
  const plan = (k) => { const p = R.cleansePlan(actor, k); return [p.statuses, p.effectIds, p.itemIds]; };
  equal("O5 U8: Remove Fear ends Frightened and Fear-sourced effects (not the one carrying Frightened twice)", plan("fear"), [["frightened"], ["1"], []]);
  equal("O6 Restore Senses ends Blinded (Deafened absent)", plan("senses"), [["blinded"], [], []]);
  equal("O7 Remove Disease ends disease afflictions, those countered as disease, and Disease-sourced effects; not poison", plan("disease"), [[], ["4"], ["a", "b"]]);
  equal("O8 Remove Curse ends curse afflictions and Curse-sourced effects", plan("curse"), [[], ["2"], ["b"]]);
  // Removing Mummy Rot (Fiends & Fables): Remove Curse, then Remove Disease.
  const rot = (done, named = false) => ({ effects: [], hasCondition: () => false, items: [{ id: "m", name: named ? "Mummy Rot" : "Mummy Rot (Disease)", type: "affliction", system: { afflictionType: "disease" }, flags: { "trg-prime": { ...(named ? {} : { cureSequence: ["curse", "disease"] }), ...(done ? { cureSteps: Object.fromEntries(done.map((k) => [k, true])) } : {}) } } }] });
  const p1 = R.cleansePlan(rot(null), "disease"), p2 = R.cleansePlan(rot(null), "curse"), p3 = R.cleansePlan(rot(["curse"]), "disease"), p4 = R.cleansePlan(rot(null, true), "disease");
  equal("O10 Mummy Rot: Remove Disease first does nothing; Remove Curse marks the step; Remove Disease then cures it; Fiends & Fables' copy by name too", [p1.itemIds, /must come first/.test(p1.labels[0]), p2.itemIds, p2.steps, p3.itemIds, p4.itemIds], [[], true, [], [{ itemId: "m", steps: { curse: true } }], ["m"], []]);
  equal("O11 the pack's Mummy Rot declares the order, where TRG Prime 3.695.0 reads it too", [byName("Mummy Rot (Disease)", "pof-afflictions")?.flags?.["trg-pillars-of-faith"]?.cureSequence, byName("Mummy Rot (Disease)", "pof-afflictions")?.flags?.["trg-prime"]?.cureSequence], [["curse", "disease"], ["curse", "disease"]]);
  ok("O9 the Use applies it (relayed for another's creature) and no longer leaves it for the GM", /cleanseTarget\(target, picked\)/.test(read("module/feat-automations.mjs")) && /RELAY\.CLEANSE\) await applyCleanse/.test(read("module/relay.mjs")) && !/the GM resolves it/.test(read("module/feat-automations.mjs")));
}

/* ------------------------------------------------------------------ *
 * P. TRG Prime 3.696.0's seams adopted (0.12.4; Graham: "build CD1-CD9
 *    and Cd12"). Each declaration is read by the core's own reader where
 *    one is pure, so a shape the core cannot read fails here.
 * ------------------------------------------------------------------ */
{
  const SYSTEM_ROOT = process.env.TRG_PRIME_ROOT ?? path.resolve(ROOT, "..", "..", "sys", "trg-prime");
  const core = (rel) => import(path.join(SYSTEM_ROOT, "module", rel));
  const flagsOf = (d) => (d?.effects ?? []).map((e) => e.flags?.["trg-prime"] ?? {});
  const asEffects = (d) => (d?.effects ?? []).map((e) => ({ ...e, id: e._id }));
  const dr = await core("combat/damage-riders.mjs");
  // CD2: Hunter's Fangs — a critical-only rider: nothing on the blow, Bleed 1 on a critical with the Fangs against the living.
  const fangs = dr.declaredDamageRiders(asEffects(byName("Hunter's Fangs", "pof-feats")));
  equal("P1 CD2 Hunter's Fangs: a critical-only rider, read by the core", [fangs.length, dr.damageRidersFor(fangs, { weaponName: "Fangs (Vesperyn)", living: true }).length,
    dr.criticalRiders(fangs, { weaponName: "Fangs (Vesperyn)", living: true }).map((r) => r.onCritical.conditions.map((c) => [c.key, c.value])),
    dr.criticalRiders(fangs, { weaponName: "Fangs (Vesperyn)", living: false }).length, dr.criticalRiders(fangs, { weaponName: "Longsword", living: true }).length],
    [1, 0, [[["bleeding", 1]]], 0, 0]);
  // CD2: Blood Awakened's rider — Bite or Fangs, living, essence, once a round.
  const { BLOOD_AWAKENED_RIDER } = await import(path.join(ROOT, "module/feat-automations.mjs"));
  const ba = dr.declaredDamageRiders([{ id: "ba", flags: { "trg-prime": { strikeDamageRider: BLOOD_AWAKENED_RIDER } } }]);
  equal("P2 CD2 Blood Awakened: +1d6 essence, Bite or Fangs, against the living", [dr.typedRiderPackets(dr.damageRidersFor(ba, { weaponName: "Bite (Unliving Ghoul)", living: true })).map((p) => [p.dice, p.type]),
    dr.damageRidersFor(ba, { weaponName: "Fangs (Vesperyn)", living: false }).length, dr.damageRidersFor(ba, { weaponName: "Dagger", living: true }).length, dr.damageRidersFor(ba, { weaponName: "Bite", living: true, used: { ba: true } }).length],
    [[["1d6", "essence"]], 0, 0, 0]);
  ok("P3 CD2 Blood Awakened's Use puts the rider on its effect", /extra: \(\) => \(\{ flags: \{ fastHealing: 1, strikeDamageRider: BLOOD_AWAKENED_RIDER \} \}\)/.test(read("module/feat-automations.mjs")));
  // CD12: Judgement reaches a Grimward spell; Final Sanction's critical.
  const { finalSanctionCritical } = await import(path.join(ROOT, "module/class-automations.mjs"));
  const jd = dr.declaredDamageRiders([{ id: "jd", flags: { "trg-prime": { strikeDamageRider: { dice: "1d6", label: "Judgement", targetUuids: ["S"], oncePerRound: true, spells: true, spellClasses: ["Grimward"], lowHalfExtraDice: "1d6", onCritical: finalSanctionCritical({ name: "Vex" }, { img: "x.svg" }) } } } }]);
  equal("P4 CD12 Judgement: a Grimward spell yes, another class's no; Final Sanction's −1 status DB on a critical against the Subject",
    [dr.damageRidersFor(jd, { targetUuid: "S", spell: true, spellClass: "Grimward" }).length, dr.damageRidersFor(jd, { targetUuid: "S", spell: true, spellClass: "Healer" }).length,
      dr.criticalRiders(jd, { targetUuid: "S", weaponName: "Mace" })[0]?.onCritical.effect.changes, dr.criticalRiders(jd, { targetUuid: "X", weaponName: "Mace" }).length],
    [1, 0, [{ key: "system.combat.defence.status", mode: 2, value: "-1", priority: 20 }], 0]);
  // CD3: the counteract rows always ask; the warps raise the limit.
  const { normaliseCounteract, counteractLimit } = await core("magic/counteract-row.mjs");
  const row = (n) => (byName(n, "pof-spells")?.system?.effects ?? []).find((e) => e.kind === "counteract");
  const warpBonus = (n) => (byName(n, "pof-spells")?.system?.warps ?? []).reduce((a, w) => a + Number(w.mods?.counteractLimitBonus ?? 0), 0);
  equal("P5 CD3 Break the Evil Eye and Sever Influence always ask; each of the three takes one more with its warp",
    ["Break the Evil Eye", "Sever Influence", "Sever Soulchain"].map((n) => [Boolean(normaliseCounteract(row(n))?.confirm), counteractLimit(normaliseCounteract(row(n))?.limit, warpBonus(n))]),
    [[true, 2], [true, 2], [false, 2]]);
  // CD4: Ossuary Lamellar — DR against slashing, worn only.
  const { drVersusFor } = await core("combat/dr-versus.mjs");
  const lam = byName("Ossuary Lamellar", "pof-armour");
  equal("P6 CD4 Ossuary Lamellar: +1 DR against slashing only, on a worn-only effect", [drVersusFor(asEffects(lam), "slashing"), drVersusFor(asEffects(lam), "piercing"), flagsOf(lam).some((f) => f.worn === true && f.drVersus?.slashing === 1)], [1, 0, true]);
  // CD5: Deep-Rooted Ironcap — the core's forced-movement reduction.
  const { forcedMovementReduction } = await core("combat/forced-movement.mjs");
  equal("P7 CD5 Deep-Rooted Ironcap: forced movement 5 feet shorter, read by the core", forcedMovementReduction(asEffects(byName("Deep-Rooted Ironcap", "pof-feats"))), 5);
  // CD6: Ossuary Board — a Shove Attack made with its bash.
  const { maneuverWeapon } = await core("combat/attack.mjs");
  const board = byName("Ossuary Board", "pof-shields");
  const shoveWith = maneuverWeapon([{ ...board, system: { ...board.system, equipped: true } }], "shove");
  equal("P8 CD6 Ossuary Board: a Shove Attack is made with the board (equipped), not when it is stowed", [shoveWith?.name ?? null, maneuverWeapon([board], "shove")?.name ?? null], ["Ossuary Board", null]);
  // CD7: Expert Autopsist's Critical +4, by the core's own reader.
  const api = await core("module-api.mjs");
  const { DEGREE_UPGRADES } = await import(path.join(ROOT, "module/registration.mjs"));
  const quietReg = (fn) => { const e = console.error, w = console.warn; console.error = console.warn = () => {}; try { return fn(); } finally { console.error = e; console.warn = w; } };
  quietReg(() => api.registerDegreeUpgrades("Expert Autopsist", DEGREE_UPGRADES["Expert Autopsist"], "trg-pillars-of-faith"));
  const { degreeBonusFor } = await core("skill-feats.mjs");
  equal("P9 CD7 Expert Autopsist: Perform Autopsy's Critical bonus is +4; a Success is untouched", [degreeBonusFor("performAutopsy", "critical", ["Expert Autopsist"])?.value, degreeBonusFor("performAutopsy", "success", ["Expert Autopsist"])], [4, null]);
  // CD1 and CD8: the reactions.
  const R = await import(path.join(ROOT, "module/core-reactions.mjs"));
  const offer = (check, who) => R.rerollOffers(check, who).map((r) => r.name);
  equal("P10 CD1 a failed save offers the owner's rerolls; a success, a skill check (but Vowbound) and an ally out of reach do not",
    [offer({ type: "save", failed: true, traits: "" }, { owned: ["Continuity Unbroken", "Revelation in Crisis", "Spirit Intercession"] }),
      offer({ type: "save", failed: false }, { owned: ["Spirit Intercession"] }),
      offer({ type: "skill", failed: true }, { owned: ["Spirit Intercession", "Vowbound Resolve"] }),
      offer({ type: "save", failed: true, traits: "fire" }, { owned: ["Continuity Unbroken"] }),
      offer({ type: "save", failed: true }, { owned: ["Spirit Intercession"], self: false, level: 7, feet: 30 }),
      offer({ type: "save", failed: true }, { owned: ["Spirit Intercession"], self: false, level: 6, feet: 10 }),
      offer({ type: "save", failed: true }, { owned: ["Spirit Intercession"], self: false, level: 9, feet: 35 }),
      offer({ type: "save", failed: true }, { owned: ["Continuity Unbroken"], usable: () => false })],
    [["Continuity Unbroken", "Revelation in Crisis", "Spirit Intercession"], [], ["Vowbound Resolve"], [], ["Spirit Intercession"], [], [], []]);
  equal("P11 CD1 the answer the core reads: keep the better; advantage for all but Spirit Intercession",
    R.REROLL_REACTIONS.map((r) => [r.name, R.rerollAnswer(r, "A", "A").keepBetter, R.rerollAnswer(r, "A", "A").advantage]),
    [["Continuity Unbroken", true, true], ["Revelation in Crisis", true, true], ["Vowbound Resolve", true, true], ["Spirit Intercession", true, false]]);
  equal("P11b no second line for the reactor's own roll (the core's says it); an ally's names who interceded (found live)",
    [R.rerollAnswer(R.REROLL_REACTIONS[0], "A", "A").line, R.rerollAnswer(R.REROLL_REACTIONS[3], "Shaman", "Seer").line], [undefined, "<strong>Spirit Intercession</strong>: Shaman intercedes for Seer."]);
  equal("P12 CD8 Redundant Anatomy lowers by one step", [R.redundantAnatomyAnswer("deadly").severitySteps, /Serious/.test(R.redundantAnatomyAnswer("deadly").line), /no injury/.test(R.redundantAnatomyAnswer("minor").line)], [-1, true, true]);
  const reg = [];
  (await import(path.join(ROOT, "module/registration.mjs"))).registerContent(new Proxy({}, { get: (_, n) => (...a) => { reg.push([n, ...a]); return true; } }), "trg-pillars-of-faith");
  equal("P13 registered: the pay step, the reroll check reaction (after), Redundant Anatomy's critical reaction (after)",
    [reg.filter(([n]) => n === "registerReactionStep").map(([, k]) => k), reg.filter(([n]) => n === "registerCheckReaction").map(([, k, spec]) => [k, typeof spec.after]), reg.filter(([n]) => n === "registerCriticalReaction").map(([, k, spec]) => [k, typeof spec.after])],
    [["pof-reaction-pay"], [["pof-reroll-reactions", "function"]], [["pof-redundant-anatomy", "function"]]]);
  // No sheet line still sends a 0.12.4 adoption to the table.
  const stale = [["Ossuary Lamellar", /apply it by hand/], ["Ossuary Board", /resolve the Shove by hand/], ["Deep-Rooted Ironcap", /is a note/], ["Hunter's Fangs", /is a note on the attack/],
    ["Final Sanction", /by hand|is a note/], ["Expert Autopsist", /\+4 on a Critical .* notes/], ["Blood Awakened", /as notes on the card/], ["Redundant Anatomy", /apply the lesser result\.?"?$/], ["Spirit Intercession", /from your sheet/],
    ["Continuity Unbroken", /with advantage from your sheet/], ["Revelation in Crisis", /with advantage from your sheet/], ["Break the Evil Eye", /cancel the Counteract dialog|counteract it from Spellcraft\.?"?\)?$/], ["Sever Influence", /cancel the Counteract dialog/]]
    .filter(([n, re]) => docs.filter((d) => d.name === n).some((d) => re.test(String(d.system?.description?.value ?? d.system?.description ?? ""))));
  equal("P14 no adopted entry's sheet line still leaves the step to the table", stale.map(([n]) => n), []);
}

/* ------------------------------------------------------------------ *
 * E. Identity: nothing renamed, nothing re-keyed
 * ------------------------------------------------------------------ */
{
  const ids = docs.map((d) => d._id);
  equal("E1 661 documents, ids unique", [docs.length, new Set(ids).size], [661, 661]);
  equal("E2 Expel Possessor and Break the Evil Eye keep their ids", [byName("Expel Possessor")?._id, byName("Break the Evil Eye")?._id], ["niSzUFPtVMqpVAvc", "84YtcbNvDeYBAAUh"]);
  const manifest = JSON.parse(read("module.json"));
  equal("E3 version 0.12.5, TRG Prime 3.696.0+, verified on 3.696.1", [manifest.version, manifest.relationships.systems[0].compatibility.minimum, manifest.relationships.systems[0].compatibility.verified], ["0.12.5", "3.696.0", "3.696.1"]);
}

console.log(`verify-audit: ${checks} checks — ${failures.length ? `${failures.length} FAILED` : "all green."}`);
for (const f of failures) console.log(`  ✗ ${f}`);
process.exit(failures.length ? 1 : 0);
