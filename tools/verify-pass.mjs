#!/usr/bin/env node
/**
 * verify-pass — the final automation pass (0.11.0) and the Undead Lords
 * campaign option, against the book and against the system that reads it
 * (TRG Prime 3.630.0).
 *
 *   A  Undead Lords: the setting, the pick, who gets it
 *   B  the pure rules of the offers (Martyr's Aegis, Soul Mirror, Grace
 *      beyond Need, Elemental Overflow, Last Rites)
 *   C  the content rewired onto the new rows, read through the system's
 *      own normalisers
 *   D  the wiring: registration, hooks, socket, versions
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
const sysImport = (p) => import(path.join(SYSTEM_ROOT, "module", p));
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const haveSystem = fs.existsSync(path.join(SYSTEM_ROOT, "system.json"));
ok("0 the TRG Prime system is beside this module (or TRG_PRIME_ROOT)", haveSystem, SYSTEM_ROOT);

/* A — Undead Lords */
const C = await import("../module/campaign-options.mjs");
const pc = (level, type = "character") => ({ type, system: { identity: { level } } });
equal("A1 ticked: a player character of 2nd level or higher gets one Archetype-only pick", [C.undeadLordsPicks(pc(2), true)?.archetype, C.undeadLordsPicks(pc(9), true)?.archetype], [1, 1]);
equal("A2 not at 1st, not for an NPC or companion, not when unticked", [C.undeadLordsPicks(pc(1), true), C.undeadLordsPicks(pc(5, "npc"), true), C.undeadLordsPicks(pc(5, "companion"), true), C.undeadLordsPicks(pc(5), false)], [null, null, null, null]);
const setting = C.campaignSettings()[C.UNDEAD_LORDS_SETTING];
equal("A3 a world checkbox in Configure Settings, off by default", [setting.scope, setting.config, setting.type === Boolean, setting.default, setting.name], ["world", true, true, false, "Undead Lords campaign"]);
ok("A4 the hint says what the book says: regular or eligible Unliving Archetype feat, prerequisites met", /regular Archetype feat or an eligible Unliving Archetype feat/.test(setting.hint) && /prerequisites/.test(setting.hint));
equal("A5 reading the setting never throws before it exists", [C.undeadLordsEnabled("x", { get: () => { throw new Error("not registered"); } }), C.undeadLordsEnabled("x", { get: () => true }), C.undeadLordsEnabled("x", null)], [false, true, false]);
if (haveSystem) {
  const F = await sysImport("feats.mjs");
  const budget = F.featBudget({ groups: { racialFeats: [], classFeats: [{}], archetypeFeats: [{}], generalFeats: [] }, level: 2, extraPicks: [C.undeadLordsPicks(pc(2), true)] });
  equal("A6 through the system's own budget: the Archetype feat spends the bonus, not a Class pick", [budget.archetype, budget.class.spent], [{ spent: 1, available: 1 }, 1]);
}

/* B — the pure rules */
const P = await import("../module/pass-automations.mjs");
equal("B1 Martyr's Aegis takes up to half, never the wearer below 1 HP", [P.aegisShareCap(21, 50), P.aegisShareCap(21, 4), P.aegisShareCap(1, 50), P.aegisShareCap(10, 1)], [10, 3, 0, 0]);
equal("B2 Soul Mirror's ladder", ["critical", "success", "failure", "fumble", "blunder", "partial"].map((d) => P.soulMirrorOutcome(d).frightened), [0, 1, 2, 3, 3, 2]);
equal("B3 only a possession save is mirrored", [P.isPossessionSave(["mental", "possession"]), P.isPossessionSave("Mental, Possession"), P.isPossessionSave(["fear"]), P.isPossessionSave("")], [true, true, false, false]);
equal("B3b Anchored Soul knows of a resisted possession only", [P.anchoredSoulAware({ type: "save", degree: "success", traits: ["possession"] }), P.anchoredSoulAware({ type: "save", degree: "failure", traits: ["possession"] }), P.anchoredSoulAware({ type: "save", degree: "critical", traits: ["fear"] }), P.anchoredSoulAware({ type: "skill", degree: "success", traits: ["possession"] })], [true, false, false, false]);
ok("B3c the awareness is asked on every resolved check", /await soulMirror\(ctx\);\s*await anchoredSoul\(ctx\);/.test(fs.readFileSync(path.join(ROOT, "module", "pass-automations.mjs"), "utf8")));
equal("B4 Grace beyond Need: the excess, capped at 10 + Wisdom, +5 a warp", [P.graceTempHp(30, 3), P.graceTempHp(8, 3), P.graceTempHp(30, 3, 2), P.graceTempHp(0, 3)], [13, 8, 23, 0]);
equal("B5 Elemental Overflow: Constitution + half the Shaman level", [P.overflowDamage(3, 9), P.overflowDamage(0, 1), P.overflowDamage(-1, 2)], [7, 0, 0]);
const DAY = 86400;
equal("B6 Last Rites: 7 days, 24 hours; with Guide the Last Road a month, 7 days, 24 hours", [P.lastRitesSpan("critical"), P.lastRitesSpan("success"), P.lastRitesSpan("partial"), P.lastRitesSpan("critical", true), P.lastRitesSpan("success", true), P.lastRitesSpan("partial", true), P.lastRitesSpan("failure", true)],
  [7 * DAY, DAY, 0, 30 * DAY, 7 * DAY, DAY, 0]);
const blocked = { effects: [{ disabled: false, getFlag: (m, k) => (k === "lastRitesBlocked" ? true : undefined) }], name: "Corpse" };
globalThis.ui = { notifications: { warn: () => {} } };
equal("B7 a botched rite refuses the next attempt on the same remains, and nothing else", [P.onActionAttempt({ action: { key: "performLastRites" }, targetActor: blocked }), P.onActionAttempt({ action: { key: "performLastRites" }, targetActor: { effects: [] } }), P.onActionAttempt({ action: { key: "recallKnowledge" }, targetActor: blocked })], [false, true, true]);

/* C — content */
const { CONSUMABLES } = await import("./content/consumables.mjs");
const { GRIMOIRE_SPELLS } = await import("./content/spells.mjs");
const herb = (n) => CONSUMABLES.find((c) => c.name === n).flags["trg-prime"].consumable.effect;
const spell = (n) => GRIMOIRE_SPELLS.find((s) => s.name === n);
if (haveSystem) {
  const DE = await sysImport("magic/declared-effect.mjs");
  const phoenix = DE.normaliseDeclaredEffect(herb("Phoenix Root").effects[0]);
  equal("C1 Phoenix Root: a one-use would-die guard back to 1 HP, for 24 hours", [phoenix.flags.deathGuard.trigger, phoenix.flags.deathGuard.heal, phoenix.flags.deathGuard.once, herb("Phoenix Root").duration], ["death", "1", true, "24 hours"]);
  const fate = DE.normaliseDeclaredEffect(herb("Prism Lotus").modes[0].effects[0]);
  const pres = DE.normaliseDeclaredEffect(herb("Prism Lotus").modes[1].effects[0]);
  equal("C2 Prism Lotus: Fate declares a Success; Preservation negates the death with half HP", [Boolean(fate.flags.fateDeclare), pres.flags.deathGuard.heal, pres.flags.deathGuard.trigger], [true, "half", "death"]);
  const root = DE.normaliseDeclaredEffect(herb("Worldroot Fragment").effects[0]);
  equal("C3 Worldroot Fragment: Death State +1, never stacking", [root.deathState, root.noStack], [1, true]);
  const ivy = DE.normaliseDeclaredEffect(herb("Blackfire Ivy").effects[0]);
  const ember = DE.normaliseDeclaredEffect(herb("Emberthistle").effects[0]);
  equal("C4 Blackfire Ivy: one more die, fire resistance ignored; Emberthistle: +1d4 on a fire spell or a fire Strike", [ivy.flags.nextSpellDamage.extraDie, ivy.flags.nextSpellDamage.ignoreResistance, ember.flags.nextSpellDamage.dice, ember.flags.strikeRider.whenDamageTypes, ember.flags.strikeRider.spendOnHit],
    [true, true, "1d4", ["fire"], true]);
  const SR = await sysImport("magic/strike-riders.mjs");
  const rose = SR.normaliseStrikeRider(herb("Rose of Thorns").effects[0]);
  const tangle = SR.normaliseStrikeRider(herb("Tangleweed").effects[0]);
  equal("C5 Rose of Thorns: Bleeding 2 until staunched; Tangleweed: Slowed 1 for a round, Reflex at the herb's level", [rose.condition, rose.conditionValue, rose.conditionRounds, tangle.condition, tangle.conditionRounds ?? 1, herb("Tangleweed").effects[0].conditionSave], ["bleeding", 2, null, "slowed", 1, { save: "reflex", dcLevel: 2 }]);
  const second = DE.normaliseDeclaredEffect(spell("Second Heart").system.effects[0]);
  equal("C6 Second Heart: a one-use 0-HP guard that does not answer massive damage or the Death-State-less", [second.flags.deathGuard.auto, second.flags.deathGuard.once, second.flags.deathGuard.notOutright, second.flags.deathGuard.needsDeathState], [true, true, true, true]);
  const litany = DE.normaliseDeclaredEffect(spell("Communal Litany").system.effects[0]);
  equal("C7 Communal Litany: one degree better, once, against Curse, Fear, Mental or Soul", [litany.flags.saveConvert.improve, litany.flags.saveConvert.uses, litany.flags.saveConvert.traits], [true, 1, ["curse", "fear", "mental", "soul"]]);
  const EC = await sysImport("magic/entry-check.mjs");
  const law = EC.normaliseEntryCheck(spell("Old Law of the Threshold").system.effects.find((e) => e.kind === "entryCheck"));
  const ward = EC.normaliseEntryCheck(spell("Threshold Ward").system.effects.find((e) => e.kind === "entryCheck"));
  equal("C8 the thresholds: Will on crossing; Old Law stops hostile undead, spirits and the incorporeal once a round; the Ward only spirits and incorporeal undead", [law.save, law.hostileOnly, law.oncePerRound, EC.entryGateHolds(law, { types: ["undead"] }), ward.save, EC.entryGateHolds(ward, { types: ["undead"] }), EC.entryGateHolds(ward, { types: ["undead"], incorporeal: true })],
    ["will", true, true, true, "will", false, true]);
  equal("C9 the rungs put a creature back and bar it: Old Law this turn / the spell; the Ward a minute / the spell", [law.degrees.failure.bar, law.degrees.fumble.bar, ward.degrees.failure.bar, ward.degrees.fumble.bar], ["turn", "spell", 60, "spell"]);
  const ST = await sysImport("magic/spell-template.mjs");
  ok("C10 Threshold Ward's opening places a line Region", ST.parseSpellArea(spell("Threshold Ward").system.area, "touch")?.shape === "line");
}
equal("C11 Writ of Restraint: no Reactions on a Success; Slowed with no Reactions, stepping 2 → 1 on a Fumble; the −2 re-save warp", [spell("Writ of Restraint").system.effects.map((e) => e.kind), spell("Writ of Restraint").system.effects[2].thenValue, spell("Writ of Restraint").system.warps[0].mods],
  [["declare", "condition", "condition"], 1, { resaveModifier: -2 }]);
equal("C12 the row kinds that replaced the notes", ["Analytical Glance", "Exorcise", "Nine-Herb Restorative", "Unfold the Future"].map((n) => spell(n).system.effects[0].kind), ["revealFact", "counteractRoll", "counteractAffliction", "pending"]);
equal("C13 Sporeglow grows by caster level, as printed", spell("Sporeglow").system.effects[0].byCasterLevel, [{ cl: 5, radiusFeet: 20 }, { cl: 10, steps: 2 }]);

/* D — wiring */
const reg = await import("../module/registration.mjs");
const calls = [];
const api = new Proxy({}, { get: (t, k) => (...args) => { calls.push([k, ...args]); return true; } });
reg.registerContent(api, "trg-pillars-of-faith");
equal("D1 registration hands over the Undead Lords pick and Martyr's Aegis's share", [calls.filter((c) => c[0] === "registerFeatPickBonus").map((c) => c[1]), calls.filter((c) => c[0] === "registerDamageShare").map((c) => c[1])], [["Undead Lords"], ["Martyr's Aegis"]]);
const script = read("scripts/pillars-of-faith.mjs");
ok("D2 the setting is registered at init", /Hooks\.once\("init", \(\) => \{\s*for \(const \[key, spec\] of Object\.entries\(campaignSettings\(\(\) => redrawActorSheets\(\)\)\)\) game\.settings\.register\(MODULE_ID, key, spec\);/.test(script));
ok("D3 the five hooks are answered", ["trgPrimeActionResolved\", (ctx) => { onActionResolved", "trgPrimeActionAttempt\", (ctx) => onActionAttempt", "trgPrimeCheckResolved\", (ctx) => { onCheckResolved", "trgPrimeOverheal\", (ctx) => { onOverheal", "trgPrimeSpellRiderLanded\", (ctx) => onSpellRiderLanded"].every((h) => script.includes(h)));
const manifest = JSON.parse(read("module.json"));
equal("D4 versions and the socket the GM writes temporary HP through", [manifest.version, manifest.relationships.systems[0].compatibility.minimum, manifest.socket, /const REQUIRED_SYSTEM = "3\.630\.1";/.test(script), /registerPassSocket\(\);/.test(script)], ["0.11.1", "3.630.1", true, true, true]);
const reg2 = read("module/registration.mjs");
ok("D5 Veil Tracker opens Track to Spirit Lore", /"Veil Tracker": \{ action: "track", skill: "specialist:spiritLore" \}/.test(reg2));
const classes = read("module/class-automations.mjs");
ok("D6 Elemental Mantle's secondary damage is a Verdant, once-a-round spell rider", /spellDamageRider: \{ label: "Elemental Mantle", dice, damageType: element, when: \{ damageTypes: \[element\], traditions: \["verdant"\] \}, oncePerRoundAny: true \}/.test(classes));
const items = read("module/magic-items.mjs");
ok("D7 the two runes the module answers declare what it reads", /declares: \{ damageShare: \{ radius: 10, frequency: "1\/minute" \} \}/.test(items) && /declares: \{ possessionMirror: \{ frequency: "1\/minute" \} \}/.test(items));

const EXPECTED_CHECKS = 37;
equal("Z the suite ran every check it is meant to", checks + 1, EXPECTED_CHECKS);
if (failures.length) { console.log(`verify-pass: ${checks} checks — ${failures.length} FAILED\n`); for (const f of failures) console.log(`  ✗ ${f}`); process.exitCode = 1; }
else console.log(`verify-pass: ${checks} checks — all green.`);
