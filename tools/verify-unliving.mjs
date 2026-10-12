#!/usr/bin/env node
/**
 * verify-unliving — Chapter 9, The Unliving (0.9.0), against the book and
 * against the system that reads it.
 *
 * Every Chapter 9 feat is checked against its printed entry (name, category,
 * prerequisites, traits, text), and every declaration is handed to TRG
 * Prime's OWN pure reader for it — the death guards to `declaredDeathGuards`,
 * the after-strikes to `declaredAfterStrikes`, the auras to `normaliseAura`,
 * and so on — so a declaration the system would read as nothing fails here
 * rather than silently at the table. Names a declaration points at (a weapon,
 * an affliction, a spell, an ability) must exist.
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

const TEXT = JSON.parse(read("tools/content/unliving-text.json"));
const U = await import("./content/unliving.mjs");
const { PACKS } = await import("./content/foundation.mjs");
const REG = await import("../module/registration.mjs");
const { UNLIVING_AUTOMATIONS, carrionRefusal, phylacteryHour } = await import("../module/unliving-automations.mjs");
const pack = (name) => PACKS.find((p) => p.name === name)?.docs ?? [];
const byName = (list, name) => list.find((d) => d.name === name);
const tf = (doc) => doc?.flags?.["trg-prime"] ?? {};
/** Declarations a document carries on its transferred effects, by flag. */
const effectFlags = (doc, key) => (doc?.effects ?? []).map((e) => e.flags?.["trg-prime"]?.[key]).filter(Boolean);
const effectsOf = (doc) => (doc?.effects ?? []).map((e) => ({ ...e, disabled: false }));

/* ================================================================== */
/* A. The seven archetypes and fifty-five class feats, against the book */
/* ================================================================== */

const FEATS = [...U.UNLIVING_ARCHETYPE_FEATS, ...U.UNLIVING_CLASS_FEATS];
const TYPE_GROUPS = ["skeleton", "zombie", "ghoul", "mummy", "vampire", "ghost", "lich"];
equal("A1 seven archetypes, fifty-five class feats (9 generic + 5 + 6 + 6 + 6 + 9 + 6 + 8)", [U.UNLIVING_ARCHETYPE_FEATS.length, U.UNLIVING_CLASS_FEATS.length], [7, 55]);
const headings = ["archetype", "generic", ...TYPE_GROUPS].flatMap((g) => Object.keys(TEXT[g]).map((h) => [g, h]));
equal("A2 one feat for every printed heading", headings.length, FEATS.length);
const pofFeats = pack("pof-feats");
for (const [group, heading] of headings) {
  const entry = TEXT[group][heading];
  const doc = FEATS.find((f) => f.name.toUpperCase() === heading);
  ok(`A3 ${heading} exists under the book's name`, Boolean(doc));
  if (!doc) continue;
  ok(`A4 ${doc.name} ships in pof-feats`, pofFeats.includes(doc));
  equal(`A5 ${doc.name} category`, doc.system.category, group === "archetype" ? "Archetype" : "Class");
  equal(`A6 ${doc.name} prerequisites as printed`, doc.system.prerequisites, entry.prerequisites);
  const traits = doc.system.traits.split(", ");
  if (group === "archetype" || group === "generic") ok(`A7 ${doc.name} carries the Unliving trait`, traits.includes("Unliving"), doc.system.traits);
  else ok(`A7 ${doc.name} carries its archetype's trait`, traits.includes(`Unliving-${group[0].toUpperCase()}${group.slice(1)}`), doc.system.traits);
  ok(`A8 ${doc.name} carries the printed text`, entry.body.split("\n\n").every((p) => doc.system.description.includes(p.replace(/\n/g, "<br>").slice(0, 40))));
  ok(`A9 ${doc.name} says what the sheet does`, /<p>(Works|Grants|A rule for the table|\+\d|Level 12)/.test(doc.system.description));
}
const lich = byName(FEATS, "Unliving Lich");
equal("A10 the Lich is Level 12 — Graham's ruling of 7 Oct 2026", lich.system.prerequisites, "Level 12");
ok("A11 every other archetype is Level 2", U.UNLIVING_ARCHETYPE_FEATS.filter((f) => f !== lich).every((f) => f.system.prerequisites === "Level 2"));
equal("A12 the Vampire's unhyphenated trait line is normalised", U.unlivingTraits("HEALING SOUL UNLIVING VAMPIRE", "vampire"), "Healing, Soul, Unliving-Vampire");
ok("A13 no archetype carries progression requirements (they never block a regular archetype)", U.UNLIVING_ARCHETYPE_FEATS.every((f) => !f.system.progressionRequirements));

/* ================================================================== */
/* B. Registration: the gates, the one-archetype rule, the traits, Uses */
/* ================================================================== */

const calls = [];
const fake = new Proxy({}, { get: (_t, name) => (...args) => { calls.push([name, ...args]); return true; } });
REG.registerContent(fake, "test");
const of = (name) => calls.filter((c) => c[0] === name);
equal("B1 a gate for Unliving and one for each type", of("registerFeatGate").map((c) => c[1]).sort(), ["Unliving", ...U.UNLIVING_ARCHETYPES.map((a) => `Unliving-${a.split(" ")[1]}`)].sort());
equal("B2 the Unliving gate opens to all seven archetypes", of("registerFeatGate").find((c) => c[1] === "Unliving")[2], U.UNLIVING_ARCHETYPES);
ok("B3 each type gate opens to its own archetype only", U.UNLIVING_ARCHETYPES.every((a) => JSON.stringify(of("registerFeatGate").find((c) => c[1] === `Unliving-${a.split(" ")[1]}`)[2]) === JSON.stringify([a])));
equal("B4 one exclusive group of the seven", of("registerExclusiveFeats").map((c) => [c[1], c[2]]), [["Unliving Archetype", U.UNLIVING_ARCHETYPES]]);
ok("B5 the type traits are registered", of("registerTraits").some((c) => U.UNLIVING_ARCHETYPES.every((a) => c[1].includes(`unliving-${a.split(" ")[1].toLowerCase()}`))));
ok("B6 Carrion Feast and the phylactery's Use are registered", ["Carrion Feast", "Phylactery of Eternal Resurgence"].every((n) => of("registerFeatAutomation").some((c) => c[1] === n)));
equal("B7 the registered names match the content's", REG.UNLIVING_ARCHETYPES, U.UNLIVING_ARCHETYPES);

/* ================================================================== */
/* C. The gates, run in the system's own picker filter                  */
/* ================================================================== */

const api = await sysImport("module-api.mjs");
const pf = await sysImport("picker-filters.mjs");
api.resetModuleRegistry();
const real = { registerFeatGate: api.registerFeatGate, registerExclusiveFeats: api.registerExclusiveFeats };
const proxied = new Proxy({}, { get: (_t, n) => real[n] ?? (() => true) });
REG.registerContent(proxied, "test");
const actorWith = (...names) => ({ items: names.map((n) => ({ type: "feat", name: n })) });
const classPick = (actor) => pf.withFeatGates(null, actor, "classFeat");
const archetypePick = (actor) => pf.withFeatGates(null, actor, "archetypeFeat");
const generic = byName(FEATS, "Bloodless Frame"), boneStride = byName(FEATS, "Bone Stride"), charm = byName(FEATS, "Charm of the Night");
equal("C1 nobody: no Unliving class feat, every archetype offered", [classPick(actorWith())(generic), classPick(actorWith())(boneStride), U.UNLIVING_ARCHETYPE_FEATS.every(archetypePick(actorWith()))], [false, false, true]);
equal("C2 a Skeleton: the generic feats and the Skeleton's, not the Vampire's, and no second archetype", [classPick(actorWith("Unliving Skeleton"))(generic), classPick(actorWith("Unliving Skeleton"))(boneStride), classPick(actorWith("Unliving Skeleton"))(charm), archetypePick(actorWith("Unliving Skeleton"))(lich)], [true, true, false, false]);
equal("C3 a Vampire's feats open to the Vampire", classPick(actorWith("Unliving Vampire"))(charm), true);
ok("C4 a second archetype is refused on creation", /already holds Unliving Vampire/.test(api.exclusiveFeatRefusal("Unliving Lich", ["Unliving Vampire"], "Mara") ?? ""));
api.resetModuleRegistry();

/* ================================================================== */
/* D. Every declaration, read by the system's own reader                */
/* ================================================================== */

const F = (name) => byName(FEATS, name);
const weapons = pack("pof-companions");
const weaponNames = new Set(weapons.map((w) => w.name.toLowerCase()));
const dg = await sysImport("combat/death-guard.mjs");
equal("D1 Unliving Fortitude is a save guard, not against essence or a weakness", dg.declaredDeathGuards(effectsOf(F("Unliving Fortitude"))).map((g) => [g.label, g.save, g.exceptDamageTypes, g.exceptWeakness]), [["Unliving Fortitude", "fortitude", ["essence"], true]]);
equal("D2 Gaseous Escape is a daily offer that applies Gaseous Form", dg.declaredDeathGuards(effectsOf(F("Gaseous Escape"))).map((g) => [g.offer, g.frequency, g.spell]), [[true, "daily", "Gaseous Form"]]);
equal("D3 Zombie Fortitude grants Unliving Fortitude and adds +2 racial to its save only", [F("Zombie Fortitude").system.grantedFeats, tf(F("Zombie Fortitude")).conditionals[0].when], ["Unliving Fortitude", { checkTypes: ["save"], subjects: ["fortitude"], actions: ["deathGuard"] }]);
const da = await sysImport("combat/declared-after-strikes.mjs");
for (const [feat, key, weaponsWanted, exposes] of [
  ["Ghoulish Venom", "ghoulishVenom", ["bite (unliving ghoul)", "claws (unliving ghoul)"], null],
  ["Paralytic Touch", "paralyticTouch", ["bony hand (unliving lich)"], null],
  ["Plague Carrier", "plagueCarrier", ["bite (unliving zombie)", "slam (unliving zombie)"], "Zombie Plague"],
  ["Ghoul Fever", "ghoulFever", ["bite (unliving ghoul)"], "Ghoul Fever (Disease)"],
  ["Mummy Rot", "mummyRot", ["slam (unliving mummy)"], "Mummy Rot (Disease)"]
]) {
  const spec = da.declaredAfterStrikes(effectsOf(F(feat)))[0];
  ok(`D4 ${feat} is read as an after-strike on a critical injury`, spec?.key === key && spec.onCriticalInjury === true);
  equal(`D5 ${feat} names its weapons, and they exist`, [spec?.weaponNames, spec?.weaponNames.every((w) => weaponNames.has(w))], [weaponsWanted, true]);
  if (exposes) ok(`D6 ${feat} exposes to ${exposes} at the attacker's level, once a day, and the affliction ships`, spec?.expose?.affliction === exposes && spec.expose.level === "actorLevel" && spec.expose.oncePerDay && Boolean(byName(pack("pof-afflictions"), exposes)));
}
const venom = da.declaredAfterStrikes(effectsOf(F("Ghoulish Venom")))[0];
const rd = await sysImport("rune-declarations.mjs");
equal("D7 Ghoulish Venom's ladder: Partial slowed 1 a round, Failure paralysed a round, Fumble a minute with escape saves", ["partial", "failure", "fumble"].map((d) => rd.afterStrikeOutcome(venom, d).conditions), [[{ key: "slowed", value: 1, rounds: 1 }], [{ key: "paralyzed", rounds: 1 }], [{ key: "paralyzed", minutes: 1, resave: true }]]);
const touch = da.declaredAfterStrikes(effectsOf(F("Paralytic Touch")))[0];
equal("D8 Paralytic Touch: +2 Serious, +5 Deadly; Blunder paralysed permanently and prone", [da.declaredAfterStrikeDC(touch, 30, "serious"), da.declaredAfterStrikeDC(touch, 30, "deadly"), rd.afterStrikeOutcome(touch, "blunder").conditions], [32, 35, [{ key: "paralyzed" }, { key: "prone" }]]);
const of2 = await sysImport("combat/on-fell.mjs");
equal("D9 Hunger Beyond Pain: living, Bite or Slam, level + Con, once a round", of2.declaredOnFell(effectsOf(F("Hunger Beyond Pain"))).map((s) => [s.weaponNames, s.living, s.heal.level, s.heal.ability, s.heal.min, s.oncePerRound]), [[["bite (unliving zombie)", "slam (unliving zombie)"], true, true, "constitution", 1, true]]);
const so = await sysImport("combat/strike-type-options.mjs");
equal("D10 Essence Attacks: an essence option on natural and unarmed strikes, magical", so.declaredStrikeTypeOptions(effectsOf(F("Essence Attacks"))).map((o) => [o.type, o.scope, o.magical]), [["essence", ["natural", "unarmed"], true]]);
const sr = await sysImport("magic/strike-riders.mjs");
const cold = sr.normaliseStrikeRider(effectFlags(F("Grave-Cold Touch"), "strikeRider")[0]);
equal("D11 Grave-Cold Touch: 1d6 cold on an essence unarmed or natural strike, never spent", [cold?.dice, cold?.damageType, cold?.scope, cold?.whenDamageTypes, cold?.once], ["1d6", "cold", "unarmed", ["essence"], false]);
const sc = await sysImport("magic/save-convert.mjs");
equal("D12 Iron Will of the Tomb: a failed Will save against fear or mind control, slowed 1, once a round", sc.declaredSaveConverts(effectsOf(F("Iron Will of the Tomb"))).map((s) => [s.saves, s.from, s.cost, s.oncePerRound]), [[["will"], ["failure", "fumble", "blunder"], { condition: "slowed", value: 1 }, true]]);
equal("D13 …and +2 racial on those saves: pre-ticked on the traits, offered otherwise", tf(F("Iron Will of the Tomb")).conditionals.map((c) => [c.value, c.type, c.auto]), [[2, "race", true], [2, "race", false]]);
const dfc = await sysImport("magic/defensive-casting.mjs");
equal("D14 Faultless Casting: always defensive, at +0", dfc.declaredDefensiveCasting(effectsOf(F("Faultless Casting"))), { label: "Faultless Casting", always: true, dcAdd: 0 });
const jp = await sysImport("jumping.mjs");
ok("D15 Corpse Leaper makes a Natural Leaper", jp.isNaturalLeaper([], effectsOf(F("Corpse Leaper"))));
const sd = await sysImport("magic/spell-dc-bonus.mjs");
equal("D16 Soul-Magic Dominion: +1 racial to a soul spell's DC, none to another", [sd.declaredSpellDCBonuses(effectsOf(F("Soul-Magic Dominion")), "Soul").map((b) => b.value), sd.declaredSpellDCBonuses(effectsOf(F("Soul-Magic Dominion")), "Fire").length], [[1], 0]);
const db = await sysImport("drink-blood.mjs");
equal("D17 Blood Renewal: Drink Blood 15, 20 from 12th level", [db.drinkBloodAmount(effectsOf(F("Blood Renewal")), 6).amount, db.drinkBloodAmount(effectsOf(F("Blood Renewal")), 12).amount], [15, 20]);
const ca = await sysImport("creature-auras.mjs");
const stench = ca.aurasOf([F("Ghast Stench")], 10)[0];
equal("D18 Ghast Stench: a rolled 10-ft Fortitude aura on the living; immune only after a save", [stench?.radius, stench?.save, ca.auraRolls(stench), stench?.livingOnly, stench?.immunityOn, stench?.immunitySeconds], [10, "fortitude", true, true, "success", 60]);
const despair = ca.aurasOf([F("Aura of Despair")], 8)[0];
equal("D19 Aura of Despair: rolled 30-ft Will, 24 hours' immunity to the paralysis but not the fear", [despair?.radius, ca.auraRolls(despair), despair?.partialImmunity, ca.auraOutcomeTags(despair, "failure", { immuneToPartial: true }).tags.map((t) => t.key)], [30, true, { to: "paralyzed", seconds: 86400 }, ["frightened"]]);
const lichAura = ca.aurasOf([F("Lich Aura")], 14)[0];
equal("D20 Lich Aura: Frightful Aura at 5 ft × level, rolled on entering, immune 1 minute whatever the result", [lichAura?.radius, lichAura?.triggers, ca.auraRolls(lichAura), ca.auraImmunityOpens(lichAura, false)], [70, ["enter"], true, true]);
equal("D21 …its Blunder collapses the creature to 0 HP and unconscious", ca.auraOutcomeTags(lichAura, "blunder").tags.map((t) => [t.key, Boolean(t.zeroHP)]), [["zeroHP", true], ["unconscious", false]]);
const gs = await sysImport("combat/granted-speeds.mjs");
equal("D22 Spectral Drift: fly equal to land Speed", gs.grantedSpeeds([F("Spectral Drift")], ["land", "fly", "swim", "climb", "burrow"]).map((g) => [g.key, g.orLand, gs.grantedSpeedBase(g, 30)]), [["fly", true, 30]]);
const ddc = await sysImport("combat/defence-dc.mjs");
equal("D23 Dead Weight raises the DCs Shove and Trip are rolled against", tf(F("Dead Weight")).defenceDC.map((r) => ddc.normaliseDefenceDC(r, { id: "x", name: "Dead Weight" }) && [r.dc, r.value, r.when.actions]), [["fortitudeDC", 2, ["shoveAttack", "tripAttack", "reposition"]], ["skillDC:acrobatics", 2, ["tripAttack"]]]);
equal("D24 Poltergeist Hurling hands Hurling over at will", [F("Poltergeist Hurling").system.grantedSpells, tf(F("Poltergeist Hurling")).grantedSpellUses], ["Hurling", { Hurling: "unlimited" }]);

/* ================================================================== */
/* E. Abilities, weapons, the spell, the diseases, the vessel           */
/* ================================================================== */

const abilities = pack("pof-abilities");
const A = (name) => byName(abilities, name);
const shared = A("Shared Unliving Base Mods");
const sharedChanges = shared.effects.flatMap((e) => e.changes ?? []).map((c) => c.value.trim());
equal("E1 the Shared Base Mods: the Unliving trait; immunity to disease, Soul Drain, subdual and suffocation; no breath", [sharedChanges, effectFlags(shared, "doesNotBreathe")], [[", Unliving", ", disease", ", soul drain", ", subdual", ", suffocating"], [true]]);
const defences = await sysImport("defences.mjs");
const words = [...new Set([...abilities, ...FEATS].flatMap((d) => (d.effects ?? []).flatMap((e) => e.changes ?? []))
  .filter((c) => /combat\.(immunities|resistances|weaknesses)$/.test(c.key)).map((c) => c.value.replace(/^,\s*/, "")))];
ok("E2 every immunity, resistance and weakness word the chapter writes is one the defences parser recognises", words.length > 10 && words.every((w) => { const parsed = defences.parseDefenceList(w); return parsed.length > 0 && parsed.every((e) => defences.classifyDefence(e)?.matched === true); }), words.join(", "));
const fast = A("Fast Healing");
equal("E3 Fast Healing 1, suppressed in sunlight", effectFlags(fast, "fastHealing").concat(effectFlags(fast, "suppressedInSunlight")), [1, true]);
const ts = await sysImport("creature-turn-start.mjs");
equal("E4 Sunlight Weakness is read at turn start as the weakness", ts.turnStartAnnouncements([A("Sunlight Weakness")], 6).map((a) => [a.kind, a.severity]), [["sunlight", "weakness"]]);
const senses = await sysImport("senses.mjs");
equal("E5 Life Sense is a tertiary sense at full range", [senses.senseOf(A("Life Sense"))?.category, senses.senseOf(A("Life Sense"))?.fullRange], ["tertiary", true]);
ok("E6 every ability an Unliving feat grants exists (Darkvision is the core's)", FEATS.every((f) => String(f.system.grantedAbilities ?? "").split(",").map((s) => s.trim()).filter(Boolean).every((n) => n === "Darkvision" || A(n))));
ok("E7 Necromantic Resistances' two choices exist and carry the immunity", tf(F("Necromantic Resistances")).abilityChoices.every((n) => A(n)?.effects?.[0]?.changes?.[0]?.key === "system.combat.immunities"));
ok("E8 every natural attack a feat grants ships in pof-companions, natural, and magical where printed", FEATS.filter((f) => f.system.grantedWeapons).every((f) => {
  const w = byName(weapons, f.system.grantedWeapons);
  return w && w.system.natural === true && (f.name === "Unliving Ghoul" ? !tf(w).magicalStrike : tf(w).magicalStrike === true);
}));
const bony = byName(weapons, "Bony Hand (Unliving Lich)");
equal("E9 Bony Hand: 1d8 bludgeoning and a declared 1d6 essence rider", [bony.system.damage, bony.system.damageType, tf(bony).strikeRiders.map((r) => sr.normaliseStrikeRider(r)).map((r) => [r.dice, r.damageType])], ["1d8", "bludgeoning", [["1d6", "essence"]]]);
equal("E10 eight natural attacks for Chapter 9", U.UNLIVING_WEAPONS.length, 8);
const wail = byName(pack("pof-spells"), "Wail of the Departed (Spell-like)");
equal("E11 Wail of the Departed: 2 AP, 60-ft emanation, Will, frightened 2 / 4, a minute's immunity on a save, at will", [wail.system.castAP, wail.system.area, wail.system.defence, wail.system.effects.map((e) => [e.kind, e.value ?? e.length, e.onSave]), wail.system.usesPerDay], [2, "60-foot emanation", "Will", [["condition", 2, ["failure"]], ["condition", 4, ["fumble", "blunder"]], ["tempImmunity", "1 minute", ["heroic", "critical", "success"]]], "unlimited"]);
ok("E12 Wail of the Departed's grant names the spell and its at-will uses", F("Wail of the Departed").system.grantedSpells === wail.name && tf(F("Wail of the Departed")).grantedSpellUses[wail.name] === "unlimited");
const afflictions = pack("pof-afflictions");
for (const d of afflictions) ok(`E13 ${d.name}: maxStage is its stage count, a disease, Fortitude`, d.system.maxStage === d.system.stages.length && d.system.afflictionType === "disease" && d.system.savingThrow === "fortitude" && /Disease/.test(d.system.traits));
equal("E14 Ghoul Fever deals 2d8 essence at stages 2–5 and kills at 6", byName(afflictions, "Ghoul Fever (Disease)").system.stages.map((s) => [s.damage, s.damageType, s.conditions.map((c) => c.key)]), [["", "", []], ["2d8", "essence", []], ["2d8", "essence", []], ["2d8", "essence", []], ["2d8", "essence", []], ["", "", ["dead"]]]);
equal("E15 Mummy Rot: a minute as a carrier, then 4d6 essence and Injured 1", byName(afflictions, "Mummy Rot (Disease)").system.stages.map((s) => [s.interval, s.damage, s.damageType, s.conditions]), [["1 minute", "", "", []], ["1 day", "4d6", "essence", [{ key: "injured", value: 1 }]]]);
equal("E16 Zombie Plague: fatigued 1–4, then death; incubation 1d4 days", [byName(afflictions, "Zombie Plague").system.incubation, byName(afflictions, "Zombie Plague").system.stages.map((s) => s.conditions.map((c) => `${c.key}${c.value ?? ""}`).join())], ["1d4 days", ["fatigued1", "fatigued2", "fatigued3", "fatigued4", "dead"]]);
const vessel = byName(pack("pof-wondrous"), "Phylactery of Eternal Resurgence (Vessel)");
equal("E17 the vessel: 200 HP, Hardness 20, invested soul unique", [vessel?.system.hp.max, vessel?.system.hardness, vessel?.system.traits], [200, 20, "Invested, Soul, Unique"]);

/* ================================================================== */
/* F. The two Uses, pure                                                */
/* ================================================================== */

equal("F1 Carrion Feast: a dead, adjacent, unfed body that died within the hour", carrionRefusal({ dead: true, feet: 5, fedOn: [], body: "B", died: 1000, now: 2000 }), null);
equal("F2 …and refuses the living, the distant, the twice-fed and the stale", [
  carrionRefusal({ dead: false, feet: 5 }), carrionRefusal({ dead: true, feet: 10 }), carrionRefusal({ dead: true, feet: 5, fedOn: ["B"], body: "B" }), carrionRefusal({ dead: true, feet: 5, died: 0, now: 4000 })
].map(Boolean), [true, true, true, true]);
equal("F3 the phylactery's hour: 1 step, 2 with Eternal Resurgence, doubled by the siphon; each a level's HP", [phylacteryHour({ lichLevel: 12 }), phylacteryHour({ lichLevel: 12, eternalResurgence: true, siphoned: true })], [{ steps: 1, heal: 12 }, { steps: 4, heal: 48 }]);
ok("F4 the Uses are the module's own", typeof UNLIVING_AUTOMATIONS["Carrion Feast"].use === "function" && typeof UNLIVING_AUTOMATIONS["Phylactery of Eternal Resurgence"].use === "function");

/* ================================================================== */
/* G. Manifest                                                          */
/* ================================================================== */

const manifest = JSON.parse(read("module.json"));
equal("G1 module version", manifest.version, "0.11.1");
equal("G2 requires TRG Prime 3.630.1+", manifest.relationships.systems[0].compatibility.minimum, "3.630.1");
ok("G3 pof-afflictions extends afflictions", manifest.packs.some((p) => p.name === "pof-afflictions" && p.flags?.["trg-prime"]?.extends === "afflictions"));
ok("G4 the loader requires 3.630.1", /REQUIRED_SYSTEM = "3\.630\.1"/.test(read("scripts/pillars-of-faith.mjs")));
equal("G5 the manifest names its sourcebook for TRG Prime 3.628.0's Sourcebook menu", manifest.flags?.["trg-prime"]?.sourcebook, "Pillars of Faith");

/* ================================================================== */
/* H. Bonus types (0.9.1, found live 7 Oct 2026)                        */
/* ================================================================== */

const { BONUS_TYPES } = await sysImport("dice/resolution.mjs");
const condsOf = (d) => [...(tf(d).conditionals ?? []), ...(d.effects ?? []).flatMap((e) => e.flags?.["trg-prime"]?.conditionals ?? [])];
const modifierTypes = [...new Set(PACKS.flatMap((p) => p.docs).flatMap(condsOf).filter((c) => c?.kind === "modifier").map((c) => c.type))];
equal("H1 every modifier conditional the module ships is typed with a key TRG Prime knows — \"racial\" is shown and stacked as Untyped", modifierTypes.filter((t) => !(t in BONUS_TYPES)), []);
const ch9Race = U.UNLIVING_CLASS_FEATS.flatMap(condsOf).filter((c) => c.kind === "modifier");
equal("H2 Chapter 9's eight racial conditionals are typed race", [ch9Race.length, ch9Race.every((c) => c.type === "race")], [8, true]);
equal("H3 and Soul-Magic Dominion's spell DC bonus too", effectFlags(byName(U.UNLIVING_CLASS_FEATS, "Soul-Magic Dominion"), "spellDCBonus").map((b) => b.type), ["race"]);
const { conditional } = await import("./content/builders.mjs");
equal("H4 the builder maps the book's word to the core's key", conditional({ kind: "modifier", value: 1, type: "racial", label: "x" }).type, "race");

// THE CARD AND THE CONDITIONS READ THE SAME ROW (0.9.2, found live 7 Oct
// 2026). TRG Prime's ladder reader (rune-declarations.mjs afterStrikeOutcome)
// takes a degree's own row when it is declared and otherwise its fallback —
// Partial reads Failure, Heroic Critical, Blunder Fumble. Ghast Stench and
// Paralytic Touch declared `partial: []` beside no Partial text, so a Partial
// printed the Failure's words and applied nothing. Same table as the core's.
const FALLBACK = { heroic: "critical", partial: "failure", blunder: "fumble" };
const rowKey = (table, k) => (table?.[k] !== undefined ? k : (FALLBACK[k] && table?.[FALLBACK[k]] !== undefined ? FALLBACK[k] : null));
const ladders = PACKS.flatMap((p) => p.docs).flatMap((d) => [
  ...effectFlags(d, "afterStrikes").flat().map((l) => [d.name, l]),
  ...(tf(d).auras ?? []).map((l) => [d.name, l])
]).filter(([, l]) => l?.outcomes && l?.conditions);
const mismatched = ladders.flatMap(([name, l]) => ["heroic", "critical", "success", "partial", "failure", "fumble", "blunder"]
  .filter((k) => rowKey(l.outcomes, k) && rowKey(l.conditions, k) && rowKey(l.outcomes, k) !== rowKey(l.conditions, k))
  .map((k) => `${name} ${k}: text from ${rowKey(l.outcomes, k)}, conditions from ${rowKey(l.conditions, k)}`));
equal("H5 every declared ladder's card text and conditions come from the same degree row", mismatched, []);
ok("H6 the check sees the ladders it is meant to (Ghoulish Venom, Paralytic Touch, the three auras among them)", ladders.length >= 5, `${ladders.length}`);

const EXPECTED_CHECKS = 520;
equal("Z the suite ran every check it is meant to", checks + 1, EXPECTED_CHECKS);
if (failures.length) { console.log(`verify-unliving: ${checks} checks — ${failures.length} FAILED\n`); for (const f of failures) console.log(`  ✗ ${f}`); process.exitCode = 1; }
else console.log(`verify-unliving: ${checks} checks — all green.`);
