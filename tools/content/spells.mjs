/**
 * Chapter 10 — the Grimoire: 21 ordinary Divinity/Verdant/Arcane spells
 * and 44 Specialist Spells (Archivist 10, Folkwarden 10, Grimward 6,
 * Healer 5, Shaman 10, Cleric 2, Druid 1), in the exact shape the core
 * spells pack keeps its 692. Text from spell-text.json (extracted from
 * the book).
 *
 * WHAT THE SYSTEM DOES WITH THEM FOR FREE: the cast dialog (PP, AP,
 * components, range, targets, area, duration), the warp chooser
 * (`warps[].mods` where the option is a number the applier knows —
 * bonusValue/bonusMax, healDice, durationText, extraTargets, areaGrowth,
 * rangeOverride, suppressBump, damageDice; text-only otherwise), the
 * caster-level ladder, the save and its degree ladder on the card, and
 * every declared effect: `condition` (with onSave), `bonus` (typed, by
 * slot), `conditional` (scoped bonuses and advantage, through the same
 * collector a feat's use), `heal`, `tempHP`, `suppress`, `conditionRelief`,
 * `strikeRider`, `damage`, `sense`, `note`.
 *
 * WHAT IS PROSE: Counteract attempts (the spellcraft roll is the
 * system's; the ladder is on the card), information the GM gives, and
 * anything the roll cannot see — each a `note` row so the card says so.
 *
 * Specialist spells carry `specialist: true`, `specialistClass` and no
 * tradition, as the core Cleric/Wizard/Druid ones do; the module's class
 * abilities (the Archivist disciplines, the Grimward's aspect, the Healer
 * line, the Folkwarden's and Shaman's PP 1 pick) resolve against them.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spell } from "./builders.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const SPELL_TEXT = JSON.parse(fs.readFileSync(path.join(HERE, "spell-text.json"), "utf8"));

const CATEGORY_WORDS = ["UTILITY", "SAVE", "ATTACK"];
const CLASS_WORDS = { ARCHIVIST: "Archivist", FOLKWARDEN: "Folkwarden", GRIMWARD: "Grimward", HEALER: "Healer", SHAMAN: "Shaman", CLERIC: "Cleric", DRUID: "Druid" };
const titleWord = (w) => w.split("-").map((p) => p ? p[0] + p.slice(1).toLowerCase() : p).join("-");
const SMALL = new Set(["OF", "THE", "TO", "A", "AN", "AND", "BEYOND"]);
const titleCase = (h) => h.split(" ").map((w, i) => (i && SMALL.has(w) ? w.toLowerCase() : titleWord(w))).join(" ").replace(/'S\b/g, "'s");

/** "2 AP (somatic, verbal)" / "R (verbal)" / "10 minutes (material, somatic, verbal)" → castAP + components. */
export function parseCast(text) {
  const m = String(text ?? "").match(/^(.*?)\s*(?:\(([^)]*)\))?$/);
  const head = (m?.[1] ?? "").trim();
  const parts = (m?.[2] ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const components = { somatic: parts.includes("somatic"), verbal: parts.includes("verbal"), material: parts.includes("material"), focus: parts.includes("focus") };
  let castAP;
  if (/^R$/i.test(head)) castAP = "Reaction";
  else if (/^(\d+)\s*AP$/i.test(head)) castAP = Number(head.match(/^(\d+)/)[1]);
  else castAP = head;
  return { castAP, components };
}

/** "SOUL UTILITY WARDING" → { traits: "Soul, Warding", category: "utility", specialistClass: "" }. */
export function parseTraitLine(line) {
  const words = String(line ?? "").split(/\s+/).filter(Boolean);
  const traits = [];
  let category = "utility";
  let specialistClass = "";
  for (const w of words) {
    if (CATEGORY_WORDS.includes(w)) category = w.toLowerCase();
    else if (CLASS_WORDS[w]) specialistClass = CLASS_WORDS[w];
    else traits.push(titleWord(w));
  }
  return { traits: traits.join(", "), category, specialistClass };
}

const clm = (threshold, text) => ({ threshold, recurring: false, damageDice: "", saveDC: 0, attack: 0, text });

/**
 * A spell from its book heading.
 * @param {string} heading Exactly as printed, upper case.
 * @param {object} spec
 * @param {object[]} [spec.effects]
 * @param {object[]} [spec.warpMods] one per printed warp, in order (`{}` for text-only)
 * @param {string} [spec.sheet] one sentence on what the card does, appended
 * @param {object} [spec.system] overrides
 */
export function bookSpell(heading, spec = {}) {
  const entry = SPELL_TEXT[heading];
  if (!entry) throw new Error(`No spell "${heading}" in spell-text.json`);
  const name = spec.name ?? titleCase(heading);
  const tl = parseTraitLine(entry.traits);
  const f = entry.fields;
  const { castAP, components } = parseCast(f.Cast);
  const specialist = entry.section === "specialist";
  const warps = entry.warps.map((w, i) => ({ ppCost: w.pp, text: w.text.replace(/\.$/, ""), mods: spec.warpMods?.[i] ?? {} }));
  const casterLevelMods = entry.casterLevel.map((c) => clm(c.cl, c.text));
  const duration = f.Duration ?? "";
  const sustained = /^sustained/i.test(duration);
  const statLines = [
    f.Trigger ? `Trigger: ${f.Trigger}` : "",
    f.Range ? `Range ${f.Range}` : "", f.Area ? `Area ${f.Area}` : "", (f.Targets ?? f.Target) ? `Targets ${f.Targets ?? f.Target}` : "",
    f["Saving Throw"] ? `Saving Throw ${f["Saving Throw"]}` : "", f["Base Damage"] ? `Base Damage ${f["Base Damage"]}` : "",
    duration ? `Duration ${duration}` : ""
  ].filter(Boolean);
  const description = [
    entry.traits,
    ...(f.Tradition ? [`Tradition ${f.Tradition}`] : specialist ? [`${tl.specialistClass} Specialist Spell`] : []),
    `Cast ${f.Cast}`,
    ...statLines,
    "",
    ...entry.body,
    ...(entry.warps.length ? ["", "Warping Options:", ...entry.warps.map((w) => `+${w.pp} PP: ${w.text}`)] : []),
    ...(entry.casterLevel.length ? ["", "Caster Level Modifications:", ...entry.casterLevel.map((c) => `CL ${c.cl}: ${c.text}`)] : []),
    "",
    `Pillars of Faith, Chapter 10.${spec.sheet ? ` ${spec.sheet}` : ""}`
  ].join("\n");
  const built = spell({
    name,
    tradition: specialist ? "" : (f.Tradition ?? ""),
    category: tl.category,
    ppCost: entry.pp,
    castAP,
    range: f.Range ?? "",
    area: f.Area ?? "",
    targets: f.Targets ?? f.Target ?? "",
    duration: sustained ? `Sustained (${duration.replace(/^sustained,?\s*(up to\s*)?/i, "")})` : duration,
    defence: f["Saving Throw"] ?? "",
    traits: tl.traits,
    effects: spec.effects ?? [],
    components,
    description,
    img: specialist ? "icons/svg/book.svg" : "icons/svg/holy-symbol.svg"
  });
  built.system.baseDamage = f["Base Damage"] ?? "";
  built.system.warps = warps;
  built.system.casterLevelMods = casterLevelMods;
  built.system.specialist = specialist;
  built.system.specialistClass = specialist ? tl.specialistClass : "";
  built.system.sustained = sustained;
  built.system.sustainType = sustained ? "duration" : "";
  Object.assign(built.system, spec.system ?? {});
  built.flags["trg-prime"] = { ...(built.flags["trg-prime"] ?? {}), bookChapter: 10 };
  return built;
}

/* ------------------------------------------------------------------ */
/* Shared rows                                                          */
/* ------------------------------------------------------------------ */

const note = (text) => ({ kind: "note", text });
const bonus = (slot, value, target = "targets", bonusType = "status") => ({ kind: "bonus", target, slot, bonusType, value });
const condition = (cond, value, onSave, target = "targets") => ({ kind: "condition", target, condition: cond, value, ...(onSave ? { onSave } : {}) });
/** A scoped bonus/advantage as a conditional effect on the target (the same rows a feat declares). */
const scoped = (label, grants, target = "targets") => ({ kind: "conditional", label, target, grants });
const saveBonus = (label, value, traits, scope) => [
  { kind: "modifier", value, type: "status", label, scope, auto: true, when: { checkTypes: ["save"], traits } },
  { kind: "modifier", value, type: "status", label, scope: `${scope} — tick if this save qualifies`, auto: false, when: { checkTypes: ["save"], not: { traits } } }
];
const saveAdvantage = (label, traits, scope) => [
  { kind: "advantage", label, scope, auto: true, when: { checkTypes: ["save"], traits } },
  { kind: "advantage", label, scope: `${scope} — tick if this save qualifies`, auto: false, when: { checkTypes: ["save"], not: { traits } } }
];
const SOUL = ["soul", "possession"];
const MIND_SOUL = ["curse", "fear", "mental", "soul", "possession"];

/* ------------------------------------------------------------------ */
/* Ordinary spells                                                      */
/* ------------------------------------------------------------------ */

export const ORDINARY_SPELLS = [
  bookSpell("ANALYTICAL GLANCE", { sheet: "Choose a category: Defences, Resilience, Mobility and Senses are read off the target's sheet and whispered to you and the GM; Capability is the GM's.", effects: [{ kind: "revealFact", target: "targets" }], warpMods: [{ choiceExtra: 1 }] }),
  bookSpell("ANCESTRAL GROVE", { sheet: "The +2 status to Will against Fear, possession and Soul effects is a scoped bonus on each willing creature in the grove; the rest is the GM's.", effects: [scoped("Ancestral Grove", saveBonus("Ancestral Grove", 2, ["fear", ...SOUL], "Will saving throws against Fear, possession and Soul effects while within the grove"), "allies"), note("Corpses in the grove do not decay; a willing connected spirit may manifest to be seen, heard and spoken with; hostile possession effects arising inside suffer −2 status to their Counteract or Spellcraft checks.")], warpMods: [{ areaGrowth: 10 }, { durationText: "1 day" }, {}] }),
  bookSpell("BLOOM OF RENEWAL", { sheet: "Heals every willing living creature in the area; the relief row offers Fatigued or Sickened per creature (both with the +4 PP warp).", effects: [{ kind: "heal", target: "allies", formula: "3d8" }, { kind: "conditionRelief", label: "Bloom of Renewal", target: "allies", condition: "fatigued", amount: 1, choices: ["fatigued", "sickened"] }], warpMods: [{ healDice: "1d8" }, { areaGrowth: 5 }, { reliefConditions: ["fatigued", "sickened"] }], system: { areaTargeting: "allies" } }),
  bookSpell("BREATH OF THE LAND", { sheet: "The two +2 status save bonuses are scoped rows on you and your allies in the emanation; the terrain relief is a note.", effects: [scoped("Breath of the Land", [
    { kind: "modifier", value: 2, type: "status", label: "Breath of the Land", scope: "Fortitude saves against environmental hazards", auto: false, when: { checkTypes: ["save"], subjects: ["fortitude"] } },
    ...saveBonus("Breath of the Land", 2, ["poison", "disease"], "Saving throws against inhaled Poison, airborne Disease and harmful natural spores")
  ], "allies"), note("Ordinary natural difficult terrain costs 5 feet less additional movement (minimum the normal cost). No Resistance and no breathing where there is no air.")], warpMods: [{ areaGrowth: 10 }, { durationText: "1 hour" }], system: { areaTargeting: "allies" } }),
  bookSpell("EXORCISE", { sheet: "The Counteract is rolled (enter the possessor's level) and its rung printed; ending the possession is the GM's.", effects: [{ kind: "counteractRoll", target: "targets", label: "the possession", outcomes: { critical: "The possession ends, and the entity cannot attempt to possess the same creature again for 24 hours.", success: "The possession ends, and the entity cannot attempt to possess the same creature again for 1 minute.", failure: "The possession remains.", fumble: "The possession remains, and you cannot Exorcise it again until the beginning of your next turn." } }, note("Ending the possession does not destroy the entity; if it can manifest outside the host, resolve its separation by the possession effect. Warped: +1 circumstance to the Counteract check per +1 PP (max +12) — pre-filled in the Counteract dialog's circumstance box. Left blank, the DC is the Level DC of the possessor's level.")], warpMods: [{ bonusValue: 1, bonusMax: 12 }] }),
  bookSpell("FINAL WHISPER", { sheet: "A Reaction cantrip: the card says how many words.", effects: [note("The Dying creature may immediately speak up to twenty words (fifty from CL 10) in a language it knows — no spells, abilities or actions. It is not Stabilised.")] }),
  bookSpell("FUNGAL WARD", { effects: [scoped("Fungal Ward", saveBonus("Fungal Ward", 2, ["disease", "poison"], "Saving throws against Disease, Poison and harmful fungal or spore effects"))], warpMods: [{ extraTargets: 1 }, { durationText: "8 hours" }, { bonusValue: 1, bonusMax: 4 }] }),
  bookSpell("HALLOWED REST", { effects: [scoped("Hallowed Rest", saveBonus("Hallowed Rest", 2, ["fear", "mental", ...SOUL], "While sleeping: saving throws against Fear, possession, dream effects and outside Mental effects")), note("Ordinary discomfort, nightmares and noise cannot by themselves spoil the rest; real danger works normally.")], warpMods: [{ extraTargets: 1 }, { bonusValue: 1, bonusMax: 4 }] }),
  bookSpell("LITANY OF ENDURANCE", { sheet: "The +2 status to Fortitude is a scoped row on you and your allies; Fatigued is suppressed by 1 for its penalties.", effects: [scoped("Litany of Endurance", [{ kind: "modifier", value: 2, type: "status", label: "Litany of Endurance", scope: "Fortitude saves against effects that cause Fatigued or arise from environmental hardship", auto: false, when: { checkTypes: ["save"], subjects: ["fortitude"] } }], "allies"), { kind: "suppress", target: "allies", condition: "fatigued", amount: 1, label: "Litany of Endurance" }, note("The suppression is for penalties only; Fatigued is not reduced, and the penalties return on leaving the area.")], warpMods: [{ areaGrowth: 10 }, {}], system: { areaTargeting: "allies" } }),
  bookSpell("LITANY OF REMEMBRANCE", { effects: [scoped("Litany of Remembrance", [
    { kind: "modifier", value: 2, type: "status", label: "Litany of Remembrance", scope: "Recall Knowledge concerning history, religion, ancestry or culture", auto: false, when: { checkTypes: ["skill"], actions: ["recallKnowledge"] } },
    { kind: "modifier", value: 2, type: "status", label: "Litany of Remembrance", scope: "Saving throws against effects that would alter, suppress, erase or replace memories or identity", auto: false, when: { checkTypes: ["save"] } }
  ])], warpMods: [{ durationText: "1 hour" }, { bonusValue: 1, bonusMax: 4 }] }),
  bookSpell("MEMORY OF STONE", { effects: [note("The GM gives a brief sensory impression of the most significant disturbance at or within 10 feet of the stone in the previous 24 hours.")], warpMods: [{}, {}, {}] }),
  bookSpell("MYCELIAL MESSAGE", { effects: [note("A message of up to twenty-five words to a creature you have met, within range, in contact with soil, roots or fungus; it may reply in twenty-five. It fails silently if the target cannot be reached.")], warpMods: [{ rangeOverride: "10 miles" }, { rangeOverride: "100 miles" }, {}] }),
  bookSpell("OATHSEAL", { effects: [note("Each target swears an oath of no more than twenty-five words; for the duration each knows if another knowingly violates it. Nothing is compelled, located or punished.")], warpMods: [{ extraTargets: 1 }, { durationText: "1 week" }, { durationText: "1 month" }] }),
  bookSpell("RESTORE MEMORY", { effects: [note("Attempt a separate Counteract against each magical effect suppressing, erasing, replacing or altering the target's memories or identity — roll each from Spellcraft.")], warpMods: [{ extraTargets: 1 }] }),
  bookSpell("ROOTED SOUL", { sheet: "Advantage against possession and against being moved, and +4 status against soul-moving Teleportation, are scoped rows on the target — while it stands on natural ground.", effects: [scoped("Rooted Soul", [
    ...saveAdvantage("Rooted Soul", ["possession"], "Saving throws against possession (while standing on natural earth, stone or living vegetation)"),
    { kind: "modifier", value: 4, type: "status", label: "Rooted Soul", scope: "Saving throws against unwanted Teleportation or effects that would forcibly move your soul", auto: false, when: { checkTypes: ["save"] } },
    { kind: "advantage", label: "Rooted Soul", scope: "Checks and saving throws to resist being Shoved, Tripped or physically moved against your will", auto: false, when: { checkTypes: ["save", "skill", "attribute"] } }
  ]), note("An effect that would teleport or possess the target without a save must first Counteract Rooted Soul. No benefit while flying, swimming off the ground or otherwise off the natural world.")], warpMods: [{ extraTargets: 1 }, {}] }),
  bookSpell("SEVER SOULCHAIN", { effects: [note("Select one soul-binding effect on the target and attempt to Counteract it. Critical: it ends; a living creature reduces Soul Drain by 10 and gains +4 status against the same source for 24 hours. Success: it ends. Failure: intact. Fumble: intact, and you cannot target it again for 24 hours.")], warpMods: [{}] }),
  bookSpell("SHARE BURDEN", { sheet: "The relief row offers which of the target's conditions to take down by 1; you then gain or increase the same condition by 1 yourself, on the card (an immunity refuses it).", effects: [{ kind: "conditionRelief", label: "Share Burden", target: "targets", condition: "fatigued", amount: 1, choices: ["dazed", "fatigued", "frightened", "sickened", "weakened"], casterGains: true }, note("Never Dying, Doomed, Injured or Soul Drain.")], warpMods: [{}, { rangeOverride: "30 feet" }] }),
  bookSpell("SOUL SANCTUARY", { sheet: "The +4 status against possession, Soul Drain and Soul effects are scoped rows; essence resistance is applied.", effects: [scoped("Soul Sanctuary", saveBonus("Soul Sanctuary", 4, SOUL, "Saving throws against possession, Soul Drain and effects with the Soul trait")), { kind: "defence", target: "targets", field: "resistance", value: "essence", note: "Soul Sanctuary" }], warpMods: [{ extraTargets: 1 }, { durationText: "1 hour" }] }),
  bookSpell("SPOREGLOW", { sheet: "A light-step circle on the target: one step brighter within 10 feet — 20 feet from CL 5, two steps from CL 10.", effects: [{ kind: "lightShift", target: "targets", steps: 1, radiusFeet: 10, byCasterLevel: [{ cl: 5, radiusFeet: 20 }, { cl: 10, steps: 2 }] }] }),
  bookSpell("THRESHOLD WARD", { sheet: "The ward is a line Region across the opening: a disembodied spirit or incorporeal Undead crossing it rolls the Will save, and Failure or Fumble puts it back outside.", effects: [{ kind: "entryCheck", target: "area", label: "Threshold Ward", save: "will", crossingOnly: true, gate: [{ traits: ["spirit"] }, { types: ["undead"], incorporeal: true }], degrees: { critical: { text: "crosses normally", unaffected: true }, success: { text: "crosses, but becomes Weakened 1 until the end of its next turn", rows: [{ kind: "condition", target: "targets", condition: "weakened", value: 1, duration: "1 round" }] }, failure: { text: "cannot cross the ward for 1 minute", pushBack: true, bar: 60 }, fumble: { text: "cannot voluntarily cross the ward for the duration", pushBack: true, bar: "spell" } } }, note("An effect establishing possession through the ward, or moving a disembodied spirit across it by Teleportation or similar magic, must first Counteract Threshold Ward. Ordinary corporeal creatures, corporeal Undead and Unliving characters cross freely.")], warpMods: [{ areaOverride: "40-foot line (an opening up to 40 feet across)" }, { durationText: "1 day" }, { durationText: "1 week" }], system: { area: "20-foot line (one doorway, gate, arch or other opening no more than 20 feet across)" } }),
  bookSpell("VEIL SIGHT", { effects: [{ kind: "sense", target: "self", category: "tertiary", detects: "disembodied spirits, incorporeal Undead, manifested haunts and active possessing entities", rollWith: "Perception" }, note("Entities perceived can be targeted if within Line of Effect. Incorporeal is not removed and identity is not revealed.")], warpMods: [{ durationText: "1 hour" }, {}] })
];

/* ------------------------------------------------------------------ */
/* Specialist spells                                                    */
/* ------------------------------------------------------------------ */

export const SPECIALIST_SPELLS = [
  // Archivist
  bookSpell("ANCHOR THE DEPARTING SOUL", { effects: [note("The soul cannot be removed, destroyed, possessed or bound and the corpse cannot be soul-animated unless the effect first Counteracts this; the creature remains a valid target for returning to life; time under the anchor does not count against minutes/hours/days-since-death limits.")], warpMods: [{ durationText: "1 hour" }, { durationText: "24 hours" }] }),
  bookSpell("DOCTRINAL WARD", { sheet: "Advantage on the target's first save against a Divinity spell or Aspect-granted effect — a scoped row that you remove once used.", effects: [scoped("Doctrinal Ward", [
    { kind: "advantage", label: "Doctrinal Ward", scope: "The first saving throw against a Divinity spell or an effect granted by a Deific Aspect (once; then the ward ends)", auto: true, when: { checkTypes: ["save"], traditions: ["divinity"] } },
    { kind: "advantage", label: "Doctrinal Ward", scope: "The first saving throw against an effect granted by a Deific Aspect — tick if this is one", auto: false, when: { checkTypes: ["save"], not: { traditions: ["divinity"] } } }
  ])], warpMods: [{ extraTargets: 1 }, {}] }),
  bookSpell("EXEMPLAR'S GRACE", { sheet: "Choose Fortitude, Reflex, Will or a skill you have a rank in: +1 status on it, chosen at the cast.", effects: [{ kind: "bonus", target: "targets", chooseFrom: "savesOrRankedSkills", label: "Exemplar's Grace", bonusType: "status", value: 1 }], warpMods: [{ choiceExtra: 1 }, { extraTargets: 1 }] }),
  bookSpell("FORBIDDEN NAME", { effects: [condition("weakened", 1, ["success"]), condition("weakened", 2, ["failure"]), condition("weakened", 3, ["fumble", "blunder"]), note("Requires: the target identified through Recall Knowledge, or its true name or sacred title. On a Fumble it also cannot become Invisible or Incorporeal or use Teleportation until the end of its next turn. Warped (+4 PP): Frightened 2 on a Failure or Fumble.")], warpMods: [{}] }),
  bookSpell("HIDDEN DOCTRINE", { effects: [note("The pages show your substituted text to everyone but up to six designated readers; Sense Magic shows the document is affected; Counteracting it exposes the original.")], warpMods: [{}, { durationText: "1 week" }, { durationText: "unlimited, until Counteracted or dismissed" }] }),
  bookSpell("LAST RITE", { effects: [note("Any effect that would possess the corpse, animate it as Undead or bind its soul to the remains must first Counteract Last Rite. Resurrection, reincarnation, willing communion, examination and preservation are unaffected.")], warpMods: [{ durationText: "7 days" }, { durationText: "1 month" }] }),
  bookSpell("READ OMEN", { effects: [note("Name a course of action you will begin within 10 minutes; the GM answers Auspicious, Dangerous, Divided or Obscured for its most significant likely consequence in the following 10 minutes. Symbolic and imprecise by design.")], warpMods: [{}, {}] }),
  bookSpell("SAINTLY INTERCESSION", { sheet: "Offered the moment an ally within range fails a save: cast it as the reaction and the save is rerolled; the ally is then immune for 10 minutes.", effects: [{ kind: "saveReroll", target: "targets", degrees: ["partial", "failure"], immunity: "10 minutes" }], warpMods: [{ rerollDegrees: ["fumble"] }, { rerollDegrees: ["blunder"] }, { rerollBonus: 2, once: true }] }),
  bookSpell("UNFOLD THE FUTURE", { sheet: "Three Portents on the target: one offered advantage, ticked before a roll and counted down as it is spent.", effects: [{ kind: "pending", target: "targets", label: "Portent (Unfold the Future)", swing: "advantage", scope: "Spend a Portent before an attack roll, saving throw or skill check — one per check", uses: 3, turns: 10 }, note("Unused Portents vanish when the spell ends (ten of the target's turns). A second target with the +4 PP warp holds its own three rather than sharing the pool.")], warpMods: [{ heldUses: 1 }, { extraTargets: 1 }] }),
  bookSpell("WORD OF CENSURE", { effects: [condition("frightened", 1, ["success"]), condition("frightened", 2, ["failure"]), condition("frightened", 3, ["fumble", "blunder"]), condition("dazed", 1, ["fumble", "blunder"]), note("On a Failure or worse the target also cannot use Reactions until the end of its next turn.")], warpMods: [{ extraTargets: 1 }] }),
  // Folkwarden
  bookSpell("BINDING CORD", { effects: [
    { kind: "bonus", target: "targets", slot: "speed", bonusType: "status", value: -5, onSave: ["success"] },
    { kind: "bonus", target: "targets", slot: "allSpeeds", bonusType: "status", value: -10, onSave: ["failure", "fumble", "blunder"] },
    condition("immobilised", 1, ["fumble", "blunder"]),
    note("Success: −5 ft until the end of its next turn. Failure: −10 ft to all Speeds for 1 minute and no Teleportation. Fumble: as Failure and Immobilised until the end of its next turn. No tether; forced movement works normally.")
  ], warpMods: [{ rangeOverride: "90 feet" }, { extraTargets: 1 }] }),
  bookSpell("BITTER CHARM", { effects: [scoped("Bitter Charm", saveBonus("Bitter Charm", 2, ["disease", "poison"], "The first saving throw against a Disease or Poison effect (once; then the charm ends)"))], warpMods: [{ extraTargets: 1 }, {}] }),
  bookSpell("BLACKTHORN WARNING", { effects: [note("You learn when an undesignated creature crosses the boundary (within 1 mile, same plane) — nothing more. Ends after one alert (three with the +2 PP warp).")], warpMods: [{}, {}, { durationText: "24 hours" }] }),
  bookSpell("BREAK THE EVIL EYE", { effects: [note("Select one Curse, Charm, Compulsion, possession, magical Fear, or controlling Mental/Soul effect on the target and attempt to Counteract it. Critical: it ends and the target gains +2 status against that source for 1 hour. Success: it ends. Failure: it remains. Fumble: it remains and you cannot try again against it until your next daily preparation.")], warpMods: [{ rangeOverride: "30 feet" }, {}] }),
  bookSpell("HEARTHSIGN", { effects: [scoped("Hearthsign", [
    { kind: "modifier", value: 1, type: "status", label: "Hearthsign", scope: "Will saving throws against Fear, Mental effects, possession and Soul effects", auto: true, when: { checkTypes: ["save"], subjects: ["will"], traits: ["fear", "mental", ...SOUL] } },
    { kind: "modifier", value: 1, type: "status", label: "Hearthsign", scope: "Will saving throws against Fear, Mental effects, possession and Soul effects — tick if this save qualifies", auto: false, when: { checkTypes: ["save"], subjects: ["will"], not: { traits: ["fear", "mental", ...SOUL] } } }
  ])], warpMods: [{ extraTargets: 1 }, { bonusValue: 1, bonusMax: 3 }] }),
  bookSpell("HEDGEWARD", { effects: [scoped("Hedgeward", saveBonus("Hedgeward", 1, MIND_SOUL, "Saving throws against Curse, Fear, Mental effects, possession and Soul effects while within the emanation"), "allies"), note("Lost outside the emanation, regained on return; status bonuses of the same type do not stack with Ward the Threshold.")], warpMods: [{ areaGrowth: 10 }, { bonusValue: 1, bonusMax: 3 }, { durationText: "10 minutes" }], system: { areaTargeting: "allies" } }),
  bookSpell("NINE-HERB RESTORATIVE", { sheet: "The Counteract is rolled against a disease or poison on the target; then the target chooses its reduction, rolled and applied.", effects: [{ kind: "counteractAffliction", target: "targets" }, { kind: "conditionRelief", target: "targets", label: "Nine-Herb Restorative", condition: "fatigued", amount: "1d6", choices: ["fatigued", "sickened", "weakened", "injured"], choiceAmounts: { injured: "1d4" } }, { kind: "conditionRelief", target: "targets", label: "Nine-Herb Restorative (second benefit)", condition: "sickened", amount: "1d6", choices: ["fatigued", "sickened", "weakened", "injured"], choiceAmounts: { injured: "1d4" }, unlockedBy: "secondBenefit" }, { ...note("The two benefits must differ — choose another condition for the second."), unlockedBy: "secondBenefit" }], warpMods: [{ unlocks: ["secondBenefit"] }, { extraTargets: 1 }] }),
  bookSpell("OLD LAW OF THE THRESHOLD", { sheet: "The +2 status is a scoped row on willing creatures inside; a hostile Undead, spirit or incorporeal creature crossing in rolls the Will save, and Failure or Fumble puts it back outside.", effects: [scoped("Old Law of the Threshold", saveBonus("Old Law of the Threshold", 2, MIND_SOUL, "Saving throws against Curse, Fear, Mental effects, possession, Soul Drain and Soul effects while within the boundary"), "allies"), { kind: "entryCheck", target: "area", label: "Old Law of the Threshold", save: "will", crossingOnly: true, oncePerRound: true, hostileOnly: true, gate: [{ types: ["undead"] }, { traits: ["spirit"] }, { incorporeal: true }], degrees: { critical: { text: "crosses normally", unaffected: true }, success: { text: "crosses, but the first square it enters within the area counts as difficult terrain" }, failure: { text: "cannot cross the boundary during the current turn — the movement spent reaching it is still expended", pushBack: true, bar: "turn" }, fumble: { text: "cannot voluntarily cross the boundary for the remainder of the spell", pushBack: true, bar: "spell" } } }, note("A creature already inside when the spell is cast is not expelled and may leave; it saves only if it tries to re-enter. Ranged attacks, spells and ordinary hostile creatures are not stopped. A possessing entity the sheet cannot see is the GM's.")], warpMods: [{ areaGrowth: 10 }, { durationText: "10 minutes" }, { durationText: "1 hour" }], system: { areaTargeting: "allies" } }),
  bookSpell("RED THREAD", { effects: [note("Each of the two creatures always knows the other's general direction while within 1 mile on the same plane.")], warpMods: [{}, { durationText: "24 hours" }, {}] }),
  bookSpell("STEADY HANDS", { sheet: "Choose Crafting, Medicine, Nature or Survival: +2 status on the target's next check with it — an offered row, removed once used.", effects: [scoped("Steady Hands", [{ kind: "modifier", value: 2, type: "status", label: "Steady Hands", scope: "The next Crafting, Medicine, Nature or Survival check (the skill chosen at the cast) before the end of the target's next turn", auto: false, when: { checkTypes: ["skill"], subjects: ["crafting", "medicine", "nature", "survival"] } }])], warpMods: [{ extraTargets: 1 }, {}] }),
  // Grimward
  bookSpell("FORENSIC LIGHT", { effects: [scoped("Forensic Light", [{ kind: "modifier", value: 2, type: "status", label: "Forensic Light", scope: "Within the lit area: Search for physical evidence, Identify Magic, Trace Possession, Identify Spiritual Affliction, or recognising evidence of a curse, haunt or transformation", auto: false, when: { checkTypes: ["skill"], actions: ["search", "identifyPower", "tracePossession", "identifySpiritualAffliction"] } }], "self")], warpMods: [{ areaGrowth: 10 }, {}] }),
  bookSpell("PURSUIT MARK", { effects: [note("Success: for 1 minute you know your Subject's general direction within 300 feet. Failure: for 1 hour, and whether it is within 300 feet, 1,000 feet or 1 mile. Fumble: 8 hours, 10 miles. Not across planes.")], warpMods: [{}] }),
  // A haunt or a magical trap (a peril) is counteracted and suppressed by the
  // core (3.629.0 `counteractPeril`); an item, ward or effect stays the note.
  bookSpell("QUARANTINE WORKING", { sheet: "Against a haunt or magical trap (target its token): the core rolls the Counteract and suppresses it — Critical 10 minutes (1 hour with the +4 PP warp), Success 1 minute; a Fumble or Blunder triggers it. Against an item, ward or effect, resolve the check from the note.", effects: [{ kind: "counteractPeril", target: "targets", suppress: { critical: "10 minutes", success: "1 minute" } }, note("Make a Counteract check against the item, haunt, ward, trap or effect. Critical: suppressed 10 minutes (1 hour with the +4 PP warp). Success: 1 minute. Failure: active. Fumble: active and not targetable again until the beginning of your next turn.")], warpMods: [{ rangeOverride: "60 feet" }, { perilSuppress: { critical: "1 hour" } }] }),
  bookSpell("SEVER INFLUENCE", { effects: [note("Select one Curse, Charm, Compulsion, possession or controlling/transforming effect on the target and attempt to Counteract it; +2 circumstance if your Judged Subject created it (enter it in the Counteract dialog's circumstance box).")], warpMods: [{}] }),
  bookSpell("UNMASK THE SUBJECT", { effects: [scoped("Unmask the Subject", [{ kind: "modifier", value: 2, type: "status", label: "Unmask the Subject", scope: "Recognising or penetrating the Subject's disguise, Illusion or transformed appearance (Success: until the end of your next turn)", auto: false, when: { checkTypes: ["skill"] } }], "self"), note("Failure: for the duration, mundane disguises and Illusions hiding the Subject's identity give it no benefit against you. Fumble: allies within 30 feet who hear you gain +2 status to recognise the same deception.")], warpMods: [{}] }),
  bookSpell("WRIT OF RESTRAINT", { sheet: "Every rung is applied: no Reactions on a Success; Slowed with no Reactions on a Failure or Fumble (the Fumble's Slowed 2 steps down to 1 after a round), saved out of at the end of each of its turns.", effects: [{ kind: "declare", target: "targets", label: "Writ of Restraint", onSave: ["success"], flags: { fumbleNoReactions: true }, rounds: 1 }, { ...condition("slowed", 1, ["failure"]), noReactions: true, conditionSave: { save: "will", onSuccess: "end", label: "Writ of Restraint" } }, { ...condition("slowed", 2, ["fumble", "blunder"]), thenValue: 1, firstRounds: 1, noReactions: true, conditionSave: { save: "will", onSuccess: "end", label: "Writ of Restraint" } }], warpMods: [{ resaveModifier: -2 }] }),
  // Healer
  bookSpell("DISTANT REMEDY", { effects: [{ kind: "heal", target: "targets", formula: "3d6" }], warpMods: [{ healDice: "1d6" }, { rangeOverride: "60 feet" }] }),
  bookSpell("RESTORATIVE WAVE", { effects: [{ kind: "heal", target: "allies", formula: "5d8" }, note("Gift of Healing applies once to the spell, as normal.")], warpMods: [{ healDice: "1d8" }, { areaGrowth: 5 }], system: { areaTargeting: "allies" } }),
  bookSpell("SECOND HEART", { sheet: "A death guard on the target: the first blow that would drop it to 0 HP leaves it on 1 HP, and the spell ends.", effects: [{ kind: "declare", target: "targets", label: "Second Heart", flags: { deathGuard: { label: "Second Heart", auto: true, once: true, notOutright: true, needsDeathState: true } } }, note("Persistent damage and other ongoing effects stay. Not against an effect that kills outright, Death State, old age, or an effect that forbids healing or intervention.")], warpMods: [{ extraTargets: 1 }] }),
  bookSpell("SOUL REBINDING", { effects: [{ kind: "conditionRelief", label: "Soul Rebinding", target: "targets", condition: "soulDrain", amount: 5 }, note("Or instead: attempt to Counteract one possession or soul-displacing effect (Reassert the Self). Both, with the +4 PP warp; +5 more Soul Drain removed with the other.")], warpMods: [{}, { reliefBump: 5 }] }),
  bookSpell("VITAL DIAGNOSIS", { effects: [note("You learn the target's current and maximum HP, Dying, Injured and Soul Drain, whether Disease, Poison, a Curse or possession affects it, and whether something blocks healing."), scoped("Vital Diagnosis", [{ kind: "modifier", value: 2, type: "status", label: "Vital Diagnosis", scope: "The next Medicine, Identify Spiritual Affliction or Counteract check against one detected affliction, within 10 minutes", auto: false, when: { checkTypes: ["skill", "spellcraft"] } }], "self")], warpMods: [{}] }),
  // Shaman
  bookSpell("CALL MINOR SPIRIT", { effects: [note("A willing minor spirit connected to the place, object, feature or recent event may manifest enough to communicate with you and those you designate. Nothing is summoned, compelled or made tangible.")], warpMods: [{ areaOverride: "100-foot emanation" }, { durationText: "10 minutes" }] }),
  bookSpell("EXPEL POSSESSOR", { effects: [note("Attempt to Counteract the possession. Critical: it ends; the entity cannot possess the same host for 24 hours. Success: it ends; 1 minute. Failure: it remains. Fumble: it remains and this spell cannot target it again until the beginning of your next turn. +2 circumstance to the check with the +4 PP warp.")], warpMods: [{}] }),
  bookSpell("OFFERING TO THE UNSEEN", { effects: [scoped("Offering to the Unseen", [{ kind: "modifier", value: 2, type: "status", label: "Offering to the Unseen", scope: "Diplomacy to Make an Impression, Request or otherwise negotiate with the spirit", auto: false, when: { checkTypes: ["skill"], subjects: ["diplomacy"] } }], "self")], warpMods: [{}] }),
  bookSpell("OPEN THE VEIL", { effects: [{ kind: "sense", target: "allies", category: "tertiary", detects: "disembodied spirits, incorporeal Undead, manifested haunts and separately targetable possessing entities", rollWith: "Perception" }, note("Spells and magical attacks by affected creatures treat incorporeal spirits as though the attacker had the means to affect them. Incorporeal is not removed; mundane weapons gain nothing.")], warpMods: [{ areaGrowth: 10 }, { endsSustain: true, durationText: "1 minute" }], system: { areaTargeting: "allies" } }),
  bookSpell("SPIRIT REBUKE", { sheet: "A spell attack for essence damage; the book's Base Damage line (1d6) and text (2d6) disagree — 2d6 is shipped, flagged for Graham.", // THE DAMAGE IS THE ATTACK'S OWN (`system.damage`), as Eldritch Touch
    // carries it — a `damage` effect row beside it applied the dice twice
    // (live test 18 Sep 2026: "5 essence (2d6) … 11 essence (2d6)").
    effects: [note("If the target is possessing another creature, the damage lands on the possessor, not the host.")], warpMods: [{ damageDice: "1d6" }], system: { baseDamage: "2d6", damage: { formula: "2d6", type: "essence", persistent: "" } } }),
  bookSpell("SPIRIT ROAD", { effects: [note("Requires: you perceived the spirit or a trace of it within 24 hours. You learn its general direction within 1 mile on the same plane — or the direction of the anchor it is bound to.")], warpMods: [{}, {}] }),
  bookSpell("SPIRIT SHELTER", { effects: [{ kind: "defence", target: "targets", field: "resistance", value: "essence", note: "Spirit Shelter" }, note("The first time the target would gain Soul Drain during the duration, reduce the amount by 5 (minimum 0); that protection is then spent (twice with the +4 PP warp). The essence resistance stays.")], warpMods: [{ extraTargets: 1 }, {}] }),
  bookSpell("SPIRIT TRACE", { effects: [note("You learn whether spiritual residue from the previous hour (24 hours with the +2 PP warp) is present in the emanation and the direction of its strongest concentration or trail.")], warpMods: [{}, {}] }),
  // CHAPTER 8 (0.10.0): a Counteract the core rolls against the targeted
  // haunt (TRG Prime 3.629.0 `counteractPeril`) — its Level and Level DC —
  // and the suppression its ladder gives, doubled by the warp.
  bookSpell("STILL THE HAUNT", { sheet: "Target the haunt's token and cast: the Counteract check opens on its level and Level DC, and the haunt is suppressed for the rung's span (Critical 24 hours, Success 1 hour, Failure until the beginning of your next turn; the +4 PP warp doubles the first two). A Fumble or Blunder triggers it (Chapter 12).", effects: [{ kind: "counteractPeril", target: "targets", suppress: { critical: "24 hours", success: "1 hour", failure: "until the beginning of your next turn" } }, note("A suppressed haunt cannot trigger, attack or produce its supernatural effects, but it still exists and resumes normally when the suppression ends. Still the Haunt does not resolve the events, emotions or spiritual circumstances responsible for creating the haunt.")], warpMods: [{ perilSuppress: { critical: "48 hours", success: "2 hours" } }] }),
  bookSpell("VEIL LANTERN", { effects: [note("Disembodied spirits and incorporeal Undead in the burst are outlined: creatures observing the area perceive their location. Nothing else changes (no identification, no bypassing Incorporeal, no Counteract of unrelated Concealment).")], warpMods: [{ areaGrowth: 5 }, {}] }),
  // Cleric and Druid (core classes, printed here)
  bookSpell("COMMUNAL LITANY", { sheet: "Each ally in the emanation may improve one saving throw against a Curse, Fear, Mental or Soul effect by one degree — offered after the roll.", effects: [{ kind: "declare", target: "targets", label: "Communal Litany", flags: { saveConvert: { label: "Communal Litany", saves: ["fortitude", "reflex", "will"], traits: ["curse", "fear", "mental", "soul"], improve: true, uses: 1 } } }, note("The benefit is lost while outside the emanation and returns on re-entry if unused — the GM declines the offer for a creature outside it. With the +2 PP warp it may be used twice, never twice against the same effect.")], warpMods: [{ areaGrowth: 10 }, { declareUses: 1 }], system: { areaTargeting: "allies" } }),
  bookSpell("GRACE BEYOND NEED", { sheet: "A Reaction offered automatically when one of your healing spells overflows a target's maximum: temporary HP from the excess.", effects: [note("Offered when your healing spell restores more than the target's maximum: temporary HP equal to the excess, up to 10 + your Wisdom modifier (+5 per +2 PP warp). It does not stack with itself — the larger pool stands.")], warpMods: [{}, { durationText: "10 minutes" }] }),
  bookSpell("GREEN WITNESS", { effects: [note("Ask one of the six printed questions about events within 30 feet of the plant in the previous hour (8 or 24 hours with a warp); the answer is truthful but limited to what rooted growth could retain.")], warpMods: [{}, {}, {}] })
];

export const GRIMOIRE_SPELLS = [...ORDINARY_SPELLS, ...SPECIALIST_SPELLS];
// BORROWED_SPELLS is appended below and joins the pack via ALL_GRIMOIRE_SPELLS.

/* ------------------------------------------------------------------ */
/* Borrowed from Eldritch Arts (0.5.1)                                  */
/* ------------------------------------------------------------------ */

/**
 * Two spells this book names that live in the Eldritch Arts sourcebook
 * (not yet a module): the Healer's 1st-level Touch of Healing and the
 * Pain aspect's 12th-level Symbol of Pain. Graham supplied the text
 * (18 Sep 2026). Carried here, flagged `borrowedFrom`, so the grants
 * resolve; when Eldritch Arts ships they leave this pack.
 */
const borrowed = (built, extra = "") => {
  built.flags["trg-prime"] = { ...(built.flags["trg-prime"] ?? {}), borrowedFrom: "Eldritch Arts", bookChapter: 10 };
  built.system.description = `${built.system.description}\n\nFrom the Eldritch Arts sourcebook, carried by Pillars of Faith until that module ships.${extra ? ` ${extra}` : ""}`;
  return built;
};

export const BORROWED_SPELLS = [
  borrowed(spell({
    name: "Touch of Healing",
    tradition: "",
    category: "utility",
    ppCost: 1,
    castAP: 2,
    range: "touch",
    targets: "1 willing creature",
    traits: "Healing, Soul",
    // "somatic OR verbal": neither is required on its own, so the gate
    // asks for neither; the card says which the caster used.
    components: { somatic: false, verbal: false, material: false, focus: false },
    description: "HEALING SOUL UTILITY\nBirthright Eternity\nCast 2 AP (somatic or verbal)\nRange touch; Targets 1 willing creature\n\nYou touch channels healing energy into your target. The target is restored of 2d6 hit points.\nWhen targeting yourself with this spell, the casting component becomes verbal and the AP is 1.\n\nWarping Options:\n+1 PP: The amount of healing increases by 1d6.",
    effects: [
      { kind: "heal", target: "targets", formula: "2d6" },
      { kind: "note", text: "Cast with a somatic OR a verbal component (either satisfies it). On yourself: 1 AP, verbal only." }
    ]
  }), "The Healer's 1st-level Specialist Spell."),
  borrowed(spell({
    name: "Symbol of Pain",
    tradition: "arcane, divinity",
    category: "save",
    ppCost: 12,
    castAP: "10 minutes",
    range: "touch",
    duration: "varies",
    defence: "Fortitude",
    traits: "Curse, Essence, Rune, Soul",
    components: { somatic: true, verbal: true, material: true, focus: false },
    description: "CURSE ESSENCE RUNE SAVE SOUL\nTradition arcane, divinity\nCast 10 minutes (material, somatic, verbal)\nRange touch\nDuration varies; Saving Throw Fortitude\n\nYou carve a magical symbol into a surface, which is activated if any character moves within line of sight and the GM determines he looks in its direction. When activated, the symbol flashes and each character with line of sight to it must make a Fortitude save.\nSuccess The target is unaffected.\nFailure The creature is injured 2 for 1 hour.\nFumble The creature is injured 4 for 1 hour.\nThese effects last for 1 hour after the creature moves farther than 60 feet from the symbol and can only be removed with a Remove Curse spell.\nThe active symbol continues to glow until the spell ends or no characters remain with line of sight to it for 10 minutes.",
    effects: [
      { kind: "condition", target: "targets", condition: "injured", value: 2, onSave: ["failure"] },
      { kind: "condition", target: "targets", condition: "injured", value: 4, onSave: ["fumble", "blunder"] },
      { kind: "note", text: "The symbol is a Rune: cast it on the surface, then roll the Fortitude save for each creature that looks at it when it activates. Injured lasts 1 hour after the creature moves beyond 60 feet, and only Remove Curse ends it early." }
    ]
  }), "The Pain aspect's 12th-level bonus spell.")
];

// Touch of Healing is the Healer's Specialist Spell: marked so, as the core Cleric ones are.
BORROWED_SPELLS[0].system.specialist = true;
BORROWED_SPELLS[0].system.specialistClass = "Healer";
BORROWED_SPELLS[0].system.warps = [{ ppCost: 1, text: "The amount of healing increases by 1d6", mods: { healDice: "1d6" } }];

export const ALL_GRIMOIRE_SPELLS = [...GRIMOIRE_SPELLS, ...BORROWED_SPELLS];
