#!/usr/bin/env node
/**
 * verify-haunts — Chapter 8, Spirits & Haunts (0.10.0), against the book and
 * against the system that reads it (TRG Prime 3.629.0).
 *
 * Every sample haunt is checked against its printed entry, and every printed
 * line is handed to TRG Prime's OWN pure readers — `perilDetectionEntries`,
 * `perilDisableSkillAllowed`, `perilCounteract`, `perilEffectSpec` — so a line
 * the system would read wrongly fails here rather than at the table. What
 * each Effect and routine action will apply is pinned rung by rung.
 *
 *   A  the nine haunts, as printed
 *   B  Detection, Disable, Counteract, as the core reads them
 *   C  what Trigger and each routine action will apply
 *   D  the Spirit Presence template and the GM's guide
 *   E  Still the Haunt and Quarantine Working
 *   F  registration, packs and versions
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

const TEXT = JSON.parse(read("tools/content/haunt-text.json"));
const H = await import("./content/haunts.mjs");
const { PACKS } = await import("./content/foundation.mjs");
const P = await sysImport("peril.mjs");
const E = await sysImport("peril-effect.mjs");
const pack = (name) => PACKS.find((p) => p.name === name);
const tf = (doc) => doc?.flags?.["trg-prime"] ?? {};
const join = (list) => (list ?? []).join("\n");

/* A — the nine haunts, as printed */
const NAMES = ["The Unfinished Farewell", "The Empty Chair", "The Bell That Calls No One", "The Drowned Procession", "The False Confession", "The Oathbound Door", "The Last Watchman", "The Choir Beneath the Floor", "The Hungry Reliquary"];
equal("A1 nine haunts, by the book's names, in its order", H.HAUNTS.map((h) => h.name), NAMES);
const LEVELS = { "The Unfinished Farewell": [1, 0], "The Empty Chair": [3, 0], "The Bell That Calls No One": [4, 0], "The Drowned Procession": [6, 30], "The False Confession": [7, 0], "The Oathbound Door": [9, 0], "The Last Watchman": [10, 0], "The Choir Beneath the Floor": [12, 60], "The Hungry Reliquary": [15, 75] };
for (const [key, entry] of Object.entries(TEXT)) {
  const doc = H.HAUNTS.find((h) => h.name.toUpperCase() === key);
  ok(`A2 ${key} exists`, Boolean(doc));
  if (!doc) continue;
  const p = doc.system.gm.peril;
  equal(`A3 ${doc.name}: level and Initiative as printed`, [doc.system.identity.level, doc.system.combat.initiative.other], LEVELS[doc.name]);
  equal(`A4 ${doc.name}: every printed line, as printed`, [p.detection, p.disable, p.trigger, p.effectText, p.anchor, p.resolution, p.reset],
    [join(entry.fields.Detection), join(entry.fields.Disable), join(entry.fields.Trigger), join(entry.fields.Effect), join(entry.fields.Anchor), join(entry.fields.Resolution), join(entry.fields.Reset)]);
  equal(`A5 ${doc.name}: a haunt — suppressed by Disable, no body, Spirit Sense finds it, a peril of the NPC's own`,
    [doc.type, p.enabled, p.onDisable, p.noBody, p.spiritPresence, P.isPeril(doc), P.perilHasNoBody({ ...doc, system: { ...doc.system, resources: { hp: { max: 30 } } } })],
    ["npc", true, "suppressed", true, true, true, true]);
  ok(`A6 ${doc.name}: the printed traits, the Haunt trait among them`, doc.system.details.traits.split(", ").includes("Haunt") && doc.system.details.traits.split(", ").length === entry.traits.split(/\s+/).length, doc.system.details.traits);
  ok(`A7 ${doc.name}: its description`, doc.system.details.biography.includes(String(entry.fields.Description?.[0] ?? "").slice(0, 40)));
  equal(`A8 ${doc.name}: a routine action for each printed one, with its AP and its text`,
    doc.items.map((i) => [i.name.toUpperCase(), tf(i).creatureAbility?.activation?.ap, tf(i).perilEffect]),
    entry.routine.map((a) => [a.name, a.ap, join(a.text)]));
}
const COMPLEX = ["The Drowned Procession", "The Choir Beneath the Floor", "The Hungry Reliquary"];
equal("A9 the three with a Routine are complex; the rest react", H.HAUNTS.map((h) => h.system.gm.peril.actionType === "complex"), NAMES.map((n) => COMPLEX.includes(n)));
equal("A10 the spans the Disable lines print: 24 hours, 1 hour; 'until sunrise' and none until Reset",
  H.HAUNTS.map((h) => h.system.gm.peril.suppressFor), ["24 hours", "", "", "", "1 hour", "", "", "", ""]);
equal("A11 the situational bonuses two Disable entries print",
  H.HAUNTS.map((h) => P.normalisePeril(h.system.gm.peril).disableBonuses.map((b) => `${b.value} ${b.type}`)).filter((l) => l.length),
  [["2 circumstance"], ["2 circumstance"]]);

/* B — as the core reads them */
const DETECT = {
  "The Unfinished Farewell": "perception:15 occultism:15",
  "The Empty Chair": "perception:17 occultism:17 religion:17",
  "The Bell That Calls No One": "perception:18 religion:18r1",
  "The Drowned Procession": "perception:20 nature:20 occultism:20 lore:spiritLore:20",
  "The False Confession": "occultism:21 religion:21 senseMotive:23",
  "The Oathbound Door": "religion:23 occultism:25",
  "The Last Watchman": "perception:24 religion:24 lore:spiritLore:24",
  "The Choir Beneath the Floor": "perception:26 occultism:26r3 religion:26r3",
  "The Hungry Reliquary": "religion:29r4 lore:spiritLore:29r4"
};
const DISABLE = {
  "The Unfinished Farewell": [["occultism", 15], ["religion", 15]],
  "The Empty Chair": [["occultism", 17], ["religion", 17]],
  "The Bell That Calls No One": [["religion", 18], ["occultism", 20]],
  "The Drowned Procession": [["occultism", 20], ["religion", 20], ["nature", 20]],
  "The False Confession": [["occultism", 21], ["religion", 21]],
  "The Oathbound Door": [["religion", 23], ["linguistics", 25]],
  "The Last Watchman": [["diplomacy", 24], ["religion", 24], ["specialist:spiritLore", 24]],
  "The Choir Beneath the Floor": [["religion", 26], ["occultism", 26], ["perform", 28]],
  "The Hungry Reliquary": [["religion", 29], ["specialist:spiritLore", 29], ["occultism", 31]]
};
const SUCCESSES = { "The Drowned Procession": 3, "The Last Watchman": 3, "The Choir Beneath the Floor": 4, "The Hungry Reliquary": 5 };
for (const doc of H.HAUNTS) {
  const p = doc.system.gm.peril;
  const level = doc.system.identity.level;
  equal(`B1 ${doc.name}: Detection read as printed`, P.perilDetectionEntries(p).map((e) => `${e.skill}:${e.dc}${e.minRank ? `r${e.minRank}` : ""}`).join(" "), DETECT[doc.name]);
  equal(`B2 ${doc.name}: each Disable skill at its own DC`, DISABLE[doc.name].map(([skill]) => [skill, P.perilDisableSkillAllowed(p, skill, { level }).dc]), DISABLE[doc.name]);
  ok(`B3 ${doc.name}: a skill it does not print is refused`, !P.perilDisableSkillAllowed(p, "thievery", { level }).ok);
  equal(`B4 ${doc.name}: the successes it asks for`, P.normalisePeril(p).successes, SUCCESSES[doc.name] ?? 1);
  equal(`B5 ${doc.name}: Counteract at its level and Level DC; Dispel at that DC`, [P.perilCounteract(p, level), P.perilDisableSkillAllowed(p, "powerManipulation", { level }).dc], [{ level, dc: level + 14 }, level + 14]);
}

/* C — what Trigger and each routine action will apply */
const sum = (text, dc) => E.perilEffectSummary(E.perilEffectSpec(text), { dc });
const EFFECTS = {
  "The Unfinished Farewell": "Will DC 15 · the GM's targets; Partial: Frightened 1; Failure: Frightened 2; Fumble: Frightened 2; Blunder: Frightened 2",
  "The Empty Chair": "Will DC 17 · everyone within 20 ft; Partial: Frightened 1; Failure: Frightened 2, Weakened 1 (1 min); Fumble: Frightened 3, Weakened 1 (1 min)",
  "The Bell That Calls No One": "Will DC 18 · everyone within 30 ft (living) · immune if deafened; Success: Frightened 1 (2 rd); Partial: Frightened 2; Failure: Frightened 3; Fumble: Frightened 3, Dazed 1 (2 rd); Blunder: Frightened 4, Dazed 1 (1 rd)",
  "The Drowned Procession": "Will DC 20 · everyone within 30 ft; Failure: Frightened 2; Fumble: Frightened 2; Blunder: Frightened 2",
  "The False Confession": "Will DC 21 · the GM's targets; Success: Frightened 1; Partial: Frightened 2; Failure: Frightened 2; Fumble: Frightened 2; Blunder: Frightened 2",
  "The Oathbound Door": "Will DC 23 · the GM's targets; Success: Frightened 1; Partial: Weakened 1 (1 min); Failure: Weakened 2 (1 min), Slowed 1 (1 min); Fumble: Weakened 3 (1 min), Slowed 1 (1 min); Blunder: Weakened 3 (1 min), Slowed 1 (1 min)",
  "The Last Watchman": "Will DC 24 · the GM's targets; Partial: Frightened 1; Failure: Frightened 2; Fumble: Frightened 3; Blunder: Frightened 3",
  "The Choir Beneath the Floor": "Will DC 26 · the GM's targets (living); Failure: Frightened 2; Fumble: Frightened 2; Blunder: Frightened 2",
  "The Hungry Reliquary": "the GM's targets (living)"
};
const ROUTINES = {
  "Surging Crowd": "Reflex DC 20 · the GM's targets; Failure: Prone; Fumble: Prone, Frightened 1",
  "Drowning Memory": "Basic Will DC 20 · 3d6 cold · the GM's targets",
  "Rising Verse": "Will DC 26 · the GM's targets; Failure: Frightened +1; Fumble: Frightened +2; Blunder: Frightened +2",
  "Borrowed Voice": "Will DC 26 · the GM's targets",
  "Final Note": "Basic Fortitude DC 26 · 3d6 force · the GM's targets",
  "Redistribute Suffering": "Basic Will DC 29 · the GM's targets (living)",
  "Borrowed Memory": "Will DC 29 · the GM's targets; Partial: Dazed 1 (2 rd)"
};
for (const doc of H.HAUNTS) {
  equal(`C1 ${doc.name}: what Trigger applies`, sum(doc.system.gm.peril.effectText, doc.system.identity.level + 14), EFFECTS[doc.name]);
  const spec = E.perilEffectSpec(doc.system.gm.peril.effectText);
  if (spec.save) equal(`C2 ${doc.name}: its printed DC is its Level DC`, spec.dc, doc.system.identity.level + 14);
  for (const item of doc.items) equal(`C3 ${doc.name} — ${item.name}: what Use applies`, sum(tf(item).perilEffect, doc.system.identity.level + 14), ROUTINES[item.name]);
}
const verse = E.perilEffectSpec(tf(H.HAUNTS[7].items[0]).perilEffect);
equal("C4 Rising Verse: past Frightened 4, Dazed 1 a point until the end of the next turn", verse.overflow, { key: "frightened", cap: 4, into: "dazed", per: 1, rounds: 2 });
equal("C5 the three complex haunts' Effects say they roll Initiative", H.HAUNTS.map((h) => E.perilEffectSpec(h.system.gm.peril.effectText).initiative), NAMES.map((n) => COMPLEX.includes(n)));
equal("C6 the Hungry Reliquary's Effect and Redistribute Suffering are the module's automations",
  [H.HAUNTS[8].system.gm.peril.automation, tf(H.HAUNTS[8].items[0]).perilAutomation, tf(H.HAUNTS[8].items[1]).perilAutomation ?? ""], ["hungry reliquary", "redistribute suffering", ""]);
const HA = await import("../module/haunt-automations.mjs");
equal("C7 those automations exist, each with the hook the core calls", [typeof HA.PERIL_AUTOMATIONS["hungry reliquary"]?.trigger, typeof HA.PERIL_AUTOMATIONS["redistribute suffering"]?.use], ["function", "function"]);
const HAS = read("module/haunt-automations.mjs");
ok("C8 the Reliquary's opening drain stops at 1 HP; Redistribute Suffering's is a Basic Will save at DC 29",
  /const capped = Math\.max\(0, Math\.min\(amount, hp - 1\)\);/.test(HAS) && /save: "will", basic: true, dc: 29, damage: \{ formula: String\(amount\), type: "essence" \}/.test(HAS)
  && /h\.runPerilEffect\(peril, spec, \{ title: item\.name, targets: \[victim\] \}\)/.test(HAS));
ok("C9 Interpret Haunt whispers the Trigger on a Success, the Anchor and Resolution on a Critical, to the GM only",
  /if \(action\?\.key !== "interpretHaunt" \|\| !isPerilActor\(targetActor\)\) return;/.test(HAS) && /row\("Likely trigger", p\.trigger\)/.test(HAS)
  && /\(critical \? row\("Sustained by \(Anchor\)", p\.anchor\) \+ row\("What could end it \(Resolution\)", p\.resolution\) : ""\)/.test(HAS)
  && /whisper: gm,/.test(HAS) && /Hooks\.on\("trgPrimeActionResolved"/.test(read("scripts/pillars-of-faith.mjs")));

/* D — the Spirit Presence and the guide */
const sp = H.SPIRIT_ACTORS[0];
equal("D1 the Spirit Presence template: an NPC with the Spirit trait, a level, and the ten lines", [sp.type, sp.system.details.traits, sp.system.identity.level,
  ["Level", "Nature", "Awareness", "Manifestation", "Communication", "Anchor", "Disposition", "Desire", "Influence", "Resolution"].every((l) => sp.system.gm.notes.includes(`<strong>${l}</strong>`))], ["npc", "Spirit", 1, true]);
equal("D2 the GM's guide: Spirits, Haunts, and what stays at the table", H.HAUNT_JOURNAL[0].pages.map((p) => p.name), ["Spirits", "Haunts", "What stays at the table"]);

/* E — the two haunt spells */
const { ALL_GRIMOIRE_SPELLS } = await import("./content/spells.mjs");
const still = ALL_GRIMOIRE_SPELLS.find((s) => s.name === "Still the Haunt");
const quarantine = ALL_GRIMOIRE_SPELLS.find((s) => s.name === "Quarantine Working");
const kinds = (await sysImport("magic/effect-kinds.mjs")).HANDLED_EFFECT_KINDS;
const rowOf = (spell) => (spell?.system?.effects ?? []).find((e) => e.kind === "counteractPeril");
equal("E1 Still the Haunt suppresses as its ladder reads; the warp doubles Critical and Success",
  [rowOf(still)?.suppress, still?.system?.warps?.[0]?.mods?.perilSuppress, kinds.includes("counteractPeril")],
  [{ critical: "24 hours", success: "1 hour", failure: "until the beginning of your next turn" }, { critical: "48 hours", success: "2 hours" }, true]);
equal("E2 Quarantine Working: 10 minutes, 1 minute; an hour on a Critical with its +4 PP warp",
  [rowOf(quarantine)?.suppress, quarantine?.system?.warps?.[1]?.mods?.perilSuppress, quarantine?.system?.warps?.[0]?.mods?.rangeOverride], [{ critical: "10 minutes", success: "1 minute" }, { critical: "1 hour" }, "60 feet"]);
const { parseSpellDuration } = await sysImport("magic/effect-duration.mjs");
ok("E3 every span the two spells give is one the core can count", [...Object.values(rowOf(still).suppress), ...Object.values(rowOf(quarantine).suppress), "48 hours", "2 hours", "1 hour"].every((t) => parseSpellDuration(t)?.seconds > 0));

/* F — registration, packs, versions */
const REG = await import("../module/registration.mjs");
const seen = [];
REG.registerContent(new Proxy({}, { get: (t, k) => (k === "registerPerilAutomation" ? (name) => seen.push(name) : () => {}) }), "trg-pillars-of-faith");
equal("F1 the two peril automations are registered", seen, ["hungry reliquary", "redistribute suffering"]);
const manifest = JSON.parse(read("module.json"));
const decl = (name) => manifest.packs.find((p) => p.name === name);
equal("F2 the two new packs: an Actor pack and a JournalEntry pack, extending nothing",
  [decl("pof-haunts")?.type, decl("pof-journals")?.type, decl("pof-haunts")?.flags?.["trg-prime"]?.extends ?? null, pack("pof-haunts")?.docs.length, pack("pof-journals")?.docs.length], ["Actor", "JournalEntry", null, 10, 1]);
const src = fs.readdirSync(path.join(ROOT, "packs-source", "pof-haunts")).map((f) => JSON.parse(fs.readFileSync(path.join(ROOT, "packs-source", "pof-haunts", f), "utf8")));
const reliquary = src.find((d) => d.name === "The Hungry Reliquary");
equal("F3 the actors are keyed as actors, their abilities as the actor's items",
  [reliquary?._key?.startsWith("!actors!"), reliquary?.items?.[0]?._key?.startsWith(`!actors.items!${reliquary?._id}.`)], [true, true]);
const journal = JSON.parse(fs.readFileSync(path.join(ROOT, "packs-source", "pof-journals", fs.readdirSync(path.join(ROOT, "packs-source", "pof-journals"))[0]), "utf8"));
equal("F4 the guide is keyed as a journal, its pages as its pages", [journal._key.startsWith("!journal!"), journal.pages.every((pg) => pg._key.startsWith(`!journal.pages!${journal._id}.`))], [true, true]);
equal("F5 versions: module 0.11.1, requiring TRG Prime 3.630.1", [manifest.version, manifest.relationships.systems[0].compatibility.minimum, /const REQUIRED_SYSTEM = "3\.630\.1";/.test(read("scripts/pillars-of-faith.mjs"))], ["0.11.1", "3.630.1", true]);

const EXPECTED_CHECKS = 153;
equal("Z the suite ran every check it is meant to", checks + 1, EXPECTED_CHECKS);
if (failures.length) { console.log(`verify-haunts: ${checks} checks — ${failures.length} FAILED\n`); for (const f of failures) console.log(`  ✗ ${f}`); process.exitCode = 1; }
else console.log(`verify-haunts: ${checks} checks — all green.`);
