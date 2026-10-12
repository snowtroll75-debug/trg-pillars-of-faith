#!/usr/bin/env node
/**
 * verify-automation — Pillars of Faith 0.7.0, the automation pass: every
 * rule that was "a rule for the table" and is now a declaration TRG Prime
 * 3.625.0 reads, checked at both ends — the data this module ships, and
 * the system mechanism that consumes it.
 *
 *   node tools/verify-automation.mjs
 *
 * SECTIONS
 *   A  Declarations on items: the healing riders, the spell-damage rider,
 *      the Power Recovery extra, the Aid boost, the refocus companion, the
 *      ability-swap conditional — each on the right feat or ability with
 *      the right fields, and each a flag the system's reader accepts.
 *   B  Registrations: the Archivist and Healer decline the aspect; the
 *      three granted warps; the two action variants; the hook listener.
 *   C  Uses and workflow: Consecrated Armament's Use writes the two
 *      declarations; Judgement writes Sanctioned Strike's and Final
 *      Sanction's; Battle Remembered's offer; Waywarden's minute; the
 *      Dragon's Breath Reed waits for a hit.
 *   D  The hints: no automated rule still says it is for the table.
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
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const sysRead = (p) => fs.readFileSync(path.join(SYSTEM_ROOT, p), "utf8");

const { RACIAL_FEATS } = await import("./content/feats-racial.mjs");
const { CLASS_FEATS } = await import("./content/feats-class.mjs");
const { CLASS_ABILITIES } = await import("./content/classes.mjs");
const { CONSUMABLES } = await import("./content/consumables.mjs");
const { ALL_GRIMOIRE_SPELLS } = await import("./content/spells.mjs");
const { CLASS_REGISTRATIONS, SPELL_WARPS, registerContent } = await import("../module/registration.mjs");
const { SKILL_ACTIONS } = await import("../module/skill-actions.mjs");
const { FEAT_AUTOMATIONS, FEAT_PASSIVE_HINTS } = await import("../module/feat-automations.mjs");
const { CLASS_PASSIVE_HINTS } = await import("../module/class-automations.mjs");
const { PASSIVE_HINTS, BATTLE_REMEMBERED_SKILLS } = await import("../module/automations.mjs");
const byName = (list) => Object.fromEntries(list.map((d) => [d.name, d]));
const feats = byName([...RACIAL_FEATS, ...CLASS_FEATS]);
const abilities = byName(CLASS_ABILITIES);
const flagOf = (doc, key) => (doc?.effects ?? []).map((e) => e.flags?.[SYS]?.[key]).find(Boolean) ?? null;

/* A. Declarations */
equal("A1 No Life Abandoned: a healing rider of half the level", flagOf(feats["No Life Abandoned"], "healingRider"), { label: "No Life Abandoned", lowHalfBonus: "halfLevel" });
equal("A2 Resurgent Healing: a Dying creature regains half", flagOf(feats["Resurgent Healing"], "healingRider"), { label: "Resurgent Healing", dyingHalf: true });
equal("A3 Lifebinder: Vital Surge maximises one die once a round", flagOf(abilities["Lifebinder"], "healingRider"), { label: "Vital Surge", maximiseOneDie: true, oncePerRound: true });
equal("A4 Consecrated Flame: 1d6 essence on fire damage against undead, once a round", flagOf(feats["Consecrated Flame"], "spellDamageRider"), { label: "Consecrated Flame", dice: "1d6", damageType: "essence", when: { damageTypes: ["fire"], targetTypes: ["undead"] }, oncePerRound: true });
equal("A5 Spiritual Reserve: +1 PP per caster level on a Critical or Heroic", flagOf(feats["Spiritual Reserve"], "powerRecoveryExtra"), { label: "Spiritual Reserve", degrees: ["critical", "heroic"], perCasterLevel: 1 });
equal("A6 Practical Counsel: +1 to a successful Aid, to +4", flagOf(abilities["Practical Counsel"], "aidBoost"), { label: "Practical Counsel", value: 1, max: 4 });
equal("A7 Deepened Bond: Manifest Spirit or Spirit Intercession returns too", flagOf(abilities["Deepened Bond"], "refocusAlsoRestores"), { label: "Deepened Bond", names: ["Manifest Spirit", "Spirit Intercession"] });
equal("A8 Scholarly Exegesis: Intelligence in place of Wisdom, offered on Religion", abilities["Scholarly Exegesis"].flags[SYS].conditionals.map((c) => [c.valueFrom, c.type, c.auto, c.when]), [["intelligence-wisdom", "untyped", false, { checkTypes: ["skill"], subjects: ["religion"] }]]);
const haveSystem = fs.existsSync(path.join(SYSTEM_ROOT, "system.json"));
ok("A9 the TRG Prime system is beside this module (or TRG_PRIME_ROOT)", haveSystem, SYSTEM_ROOT);
if (haveSystem) {
  const { declaredHealingRiders } = await import(path.join(SYSTEM_ROOT, "module", "magic", "healing-riders.mjs"));
  const { declaredSpellDamageRiders } = await import(path.join(SYSTEM_ROOT, "module", "magic", "caster-damage-riders.mjs"));
  const { powerRecoveryExtras } = await import(path.join(SYSTEM_ROOT, "module", "rest", "recovery.mjs"));
  const { aidBoosts } = await import(path.join(SYSTEM_ROOT, "module", "skill-aid.mjs"));
  const { refocusCompanions } = await import(path.join(SYSTEM_ROOT, "module", "combat", "refocus.mjs"));
  const { normaliseConditional, scalingFor } = await import(path.join(SYSTEM_ROOT, "module", "conditionals.mjs"));
  const effs = (doc) => (doc.effects ?? []).map((e) => ({ id: e._id, name: e.name, flags: e.flags }));
  equal("A10 the system reads the three healing riders", [feats["No Life Abandoned"], feats["Resurgent Healing"], abilities["Lifebinder"]].map((d) => declaredHealingRiders(effs(d)).length), [1, 1, 1]);
  equal("A11 …and the spell-damage rider, the recovery extra, the Aid boost, the companion", [declaredSpellDamageRiders(effs(feats["Consecrated Flame"])).length, powerRecoveryExtras(effs(feats["Spiritual Reserve"])).length, aidBoosts(effs(abilities["Practical Counsel"]))?.value, refocusCompanions(effs(abilities["Deepened Bond"])).length], [1, 1, 1, 1]);
  const scaled = normaliseConditional(abilities["Scholarly Exegesis"].flags[SYS].conditionals[0], { id: "x", name: "x", kind: "item" }, 0, scalingFor({ system: { identity: { level: 1 }, attributes: { intelligence: { total: 3 }, wisdom: { total: 1 } } } }));
  equal("A12 the swap normalises to the difference", scaled?.value, 2);
}

/* B. Registrations */
equal("B1 the Archivist and the Healer decline the Divine Aspect; the Grimward needs one", [CLASS_REGISTRATIONS.Archivist.needsDivineAspect, CLASS_REGISTRATIONS.Healer.needsDivineAspect, CLASS_REGISTRATIONS.Grimward.needsDivineAspect, "needsDivineAspect" in CLASS_REGISTRATIONS.Folkwarden], [false, false, true, false]);
equal("B2 the three granted warps", Object.fromEntries(Object.entries(SPELL_WARPS).map(([k, v]) => [k, v.map((e) => [e.match, e.warp.ppCost, e.warp.mods])])), { "Swift Mender": [[{ traits: ["healing"] }, 4, { castApDelta: -1, once: true }]], "Renewed Restoration": [[{ name: "Restoration" }, 4, { ignoreDailyLimit: true }]], "Guiding Luminescence": [[{ name: "Guidance", innate: true }, 0, { extraTargets: 1, once: true }]] });
ok("B2b the one-shot warps are checkboxes, not counts (0.7.1 — live: a number box for \"two creatures\")", SPELL_WARPS["Swift Mender"][0].warp.mods.once === true && SPELL_WARPS["Guiding Luminescence"][0].warp.mods.once === true && SPELL_WARPS["Renewed Restoration"][0].warp.mods.once === undefined);
const calls = [];
const fake = new Proxy({}, { get: (_, name) => (...args) => { calls.push([name, ...args]); return true; } });
registerContent(fake, "trg-pillars-of-faith");
equal("B3 registerContent registers the three through registerSpellWarps", calls.filter((c) => c[0] === "registerSpellWarps").map((c) => c[1]).sort(), ["Guiding Luminescence", "Renewed Restoration", "Swift Mender"]);
const rites = SKILL_ACTIONS.find((a) => a.key === "performLastRites");
equal("B4 Guide the Last Road is a variant of Perform Last Rites: 1 minute, 1 month / 7 days / 24 hours", [rites.variants[0].feat, rites.variants[0].apCost, /1 month/.test(rites.variants[0].outcomes.critical), /7 days/.test(rites.variants[0].outcomes.success), /24 hours/.test(rites.variants[0].outcomes.partial)], ["Guide the Last Road", "1 minute", true, true, true]);
const signs = SKILL_ACTIONS.find((a) => a.key === "readTheSigns");
equal("B5 Waywarden is a variant of Read the Signs on Success and better", [signs.variants[0].feat, Object.keys(signs.variants[0].outcomes).sort()], ["Waywarden", ["critical", "heroic", "success"]]);
ok("B6 the loader listens to the initiative hook and requires 3.630.0", /Hooks\.on\("trgPrimeInitiativeRolled", \(\{ actor \}\) => \{ offerBattleRemembered\(actor\)/.test(read("scripts/pillars-of-faith.mjs")) && /REQUIRED_SYSTEM = "3\.630\.1"/.test(read("scripts/pillars-of-faith.mjs")));

/* C. Uses and workflow */
const fa = read("module/feat-automations.mjs");
ok("C1 Consecrated Armament's Use writes magicalAttacks and a gated once-per-round essence rider on the chosen weapon", "consecrated armament" in FEAT_AUTOMATIONS && /magicalAttacks: \{ label: "Consecrated Armament", weaponNames: \[weapon\.name\] \}/.test(fa) && /strikeRider: \{ label: "Consecrated Armament", dice: "1d6", damageType: "essence", scope: "any", onCritical: true, targetTypes: \["undead"\], weaponNames: \[weapon\.name\], oncePerRound: true \}/.test(fa));
const ca = read("module/class-automations.mjs");
ok("C2 Judgement writes Sanctioned Strike's magical attacks against the Subject when the 4th-level ability is held", /hasAbility\(actor, "Sanctioned Strike"\) && subjectUuid \? \{ magicalAttacks: \{ label: "Sanctioned Strike", targetUuids: \[subjectUuid\] \} \} : \{\}/.test(ca));
ok("C3 Judgement's rider grows by 1d6 at half HP with Final Sanction", /hasFeat\(actor, "Final Sanction"\) \? \{ lowHalfExtraDice: "1d6" \} : \{\}/.test(ca));
ok("C4 Waywarden's minute is said on both Uses", (ca.match(/hasFeat\(actor, "Waywarden"\) \? "<em>Waywarden: (fashioned|brewed) in <strong>1 minute<\/strong> rather than 10\.<\/em>"/g) ?? []).length === 2);
const au = read("module/automations.mjs");
equal("C5 Battle Remembered's five skills", [...BATTLE_REMEMBERED_SKILLS], ["acrobatics", "athletics", "intimidate", "perception", "survival"]);
ok("C6 the offer asks, then runs Past-Life Echo free and restricted; a spent echo is not offered", /if \(max !== null && max !== Infinity && itemUsesRemaining\(echo\) <= 0\) return false;/.test(au) && /await pastLifeEcho\.use\(actor, echo, \{ free: true, skillKeys: \[\.\.\.BATTLE_REMEMBERED_SKILLS\] \}\);/.test(au) && /if \(!free && !\(await spendAP\(actor, "Past-Life Echo"\)\)\) return;/.test(au));
ok("C7 Reflexes of a Hundred Battles' free Step is said on the echo's card", /Reflexes of a Hundred Battles:<\/strong> you may immediately Step 5 feet/.test(au));
const reed = CONSUMABLES.find((c) => c.name === "Dragon's Breath Reed").flags[SYS].consumable.effect.effects[0];
equal("C8 Dragon's Breath Reed waits for a hit", [reed.kind, reed.spendOn], ["strikeRider", "hit"]);
ok("C9 Sunveil removes Dazzled outright (TRG Prime 3.630.0's conditionRemove)", CONSUMABLES.find((c) => c.name === "Sunveil").flags[SYS].consumable.effect.effects[0].kind === "conditionRemove");
if (haveSystem) {
  const { normaliseStrikeRider, ridersSpentBy } = await import(path.join(SYSTEM_ROOT, "module", "magic", "strike-riders.mjs"));
  const spec = normaliseStrikeRider(reed);
  equal("C10 the system keeps the reed through a miss", [ridersSpentBy([spec], { attackMode: "melee" }, { hit: false }).length, ridersSpentBy([spec], { attackMode: "melee" }, { hit: true }).length], [0, 1]);
  const { RELIEVABLE } = await import(path.join(SYSTEM_ROOT, "module", "magic", "condition-relief.mjs"));
  ok("C11 the relief rail reaches Sickened and Frightened", ["sickened", "frightened"].every((c) => c in RELIEVABLE));
  ok("C12 the system fires the initiative hook, applies action variants and reads magical attacks", /Hooks\.callAll\("trgPrimeInitiativeRolled"/.test(sysRead("module/documents/combat.mjs")) && /applyActionVariant\(action, actorFeatNames\)/.test(sysRead("module/combat/action-workflow.mjs")) && /magicalAttackSource\(declaredMagicalAttacks/.test(sysRead("module/combat/attack-workflow.mjs")));
}

/* D. The hints */
const automated = ["battle remembered", "consecrated flame", "guide the last road", "no life abandoned", "guiding luminescence", "renewed restoration", "resurgent healing", "swift mender", "spiritual reserve", "waywarden", "reflexes of a hundred battles"];
for (const k of automated) ok(`D "${k}" no longer says it is a rule for the table`, k in FEAT_PASSIVE_HINTS && /^Works automatically/.test(FEAT_PASSIVE_HINTS[k]), FEAT_PASSIVE_HINTS[k]);
for (const k of ["scholarly exegesis", "practical counsel", "sanctioned strike", "lifebinder", "deepened bond"]) ok(`D "${k}" no longer says it is a rule for the table`, k in CLASS_PASSIVE_HINTS && !/A rule for the table/.test(CLASS_PASSIVE_HINTS[k]), CLASS_PASSIVE_HINTS[k]);
ok("D Consecrated Armament is a Use now, not a hint", "consecrated armament" in FEAT_AUTOMATIONS && !("consecrated armament" in FEAT_PASSIVE_HINTS));
ok("D the feats' sheet text agrees", [feats["Swift Mender"], feats["Renewed Restoration"], feats["Guiding Luminescence"], feats["No Life Abandoned"], feats["Consecrated Flame"], feats["Spiritual Reserve"], feats["Guide the Last Road"]].every((f) => /Works automatically/.test(f.system.description)));
ok("D the racial hints agree", /Works automatically/.test(PASSIVE_HINTS["battle remembered"] ?? "Works automatically"));

const EXPECTED_CHECKS = 51;
if (EXPECTED_CHECKS) equal("Z the suite ran every check it is meant to", checks + 1, EXPECTED_CHECKS);
if (failures.length) { console.log(`verify-automation: ${checks} checks — ${failures.length} FAILED\n`); for (const f of failures) console.log(`  ✗ ${f}`); process.exitCode = 1; }
else console.log(`verify-automation: ${checks} checks — all green.`);
