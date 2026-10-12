/**
 * Chapter 6 — fifty herbs and eight other consumables, in the shape the
 * core alchemical pack keeps its herbs (Limorsor, Winterbite, Firqueline,
 * Silversheen): `system {quantity, weight, price, traits, uses,
 * activation, itemLevel}`, `flags.trg-prime.consumable {kind, hands,
 * effect {label, duration, effects[], pending, resave, note}}` and
 * `flags.trg-prime.alchemical {section, terrain, baseLevel, …}`.
 *
 * The text is tools/content/consumable-text.json, extracted from the
 * book; this file adds what the Use does. The effect rows are the spell
 * rows the consumable path dresses as an innate spell (`syntheticSpellData`
 * in consumable-use-workflow.mjs), so a herb's heal, bonus, resistance,
 * relief or conditional lands exactly as a spell's would.
 *
 * READINGS (each also on the item):
 * - "does not stack with DR granted by another consumable" is a note;
 *   the rail adds item bonuses by type already, and a second herb's DR
 *   is the same item type, so the higher one wins as the rule wants.
 * - "cannot benefit again until you complete a Full Rest" is a note
 *   (Deepmire Lily, Root of Stone, Vigil Draught); the rest workflow has
 *   no per-item lock to set.
 * - Soulvine's Dying reduction and Godsblood Moss's Injury are the relief
 *   rail (Dying joined it at TRG Prime 3.630.0); Sunveil's Dazzled is a
 *   removal (`conditionRemove`, 3.630.0).
 * - Weapon coatings (Rose of Thorns, Tangleweed) are condition riders on
 *   the chosen weapon, spent on the first hit (3.630.0); Silvermould is a
 *   material oil like Silversheen.
 * - 0.11.0, the automation pass: Phoenix Root, Prism Lotus (both modes),
 *   Worldroot Fragment, Blackfire Ivy and Emberthistle are DECLARED effects
 *   (death guards, a declared Success, Death State, next-damage boosts);
 *   Divine Nectar and Void Lily restore what they print; Greysap ends one
 *   persistent acid source. Dreamthorn's notes stand.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stableId, SYSTEM_ID } from "./builders.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
export const CONSUMABLE_TEXT = JSON.parse(fs.readFileSync(path.join(here, "consumable-text.json"), "utf8"));

const STATS = { coreVersion: "14", systemId: SYSTEM_ID, systemVersion: "3.607.0", createdTime: 1789000000000, modifiedTime: 1789000000000, lastModifiedBy: null, compendiumSource: null, duplicateSource: null };
const SOURCE = "Pillars of Faith, Chapter 6.";

const SMALL = new Set(["of", "the", "and"]);
const titleCase = (s) => String(s).toLowerCase().split(" ").map((w, i) =>
  (i && SMALL.has(w)) ? w : w.replace(/^[a-z]|(?<=-)[a-z]/g, (c) => c.toUpperCase())).join(" ");
const price = (s) => Number(String(s).replace(/[^0-9.]/g, ""));

/* ---- row helpers (the spell-effect vocabulary) ---------------------- */
const heal = (formula) => ({ kind: "heal", target: "self", formula });
const relief = (label, condition, amount) => ({ kind: "conditionRelief", label, target: "self", condition, amount });
const suppress = (label, condition, amount) => ({ kind: "suppress", label, target: "self", condition, amount });
const resistance = (type) => ({ kind: "defence", target: "self", field: "resistance", value: type, note: `(resistance to ${type})` });
const immunity = (type) => ({ kind: "defence", target: "self", field: "immunity", value: type, note: `(immunity to ${type})` });
const slotBonus = (slot, value, bonusType = "item") => ({ kind: "bonus", target: "self", slot, bonusType, value });
const condition = (key, value) => ({ kind: "condition", target: "self", condition: key, ...(value ? { value } : {}) });
const note = (text) => ({ kind: "note", text });
const grant = (label, value, scope, when, { auto = true, oneShot = false, bonusType = "item" } = {}) => ({ kind: "modifier", value, bonusType, label, scope, when, auto, oneShot });
const advantage = (label, scope, when, { auto = true, oneShot = false } = {}) => ({ kind: "advantage", label, scope, when, auto, oneShot });
const scoped = (label, ...grants) => ({ kind: "conditional", label, target: "self", grants });
const rider = (label, dice, damageType, scope = "any") => ({ kind: "strikeRider", label, dice, damageType, scope, once: true });
const selfImmunity = (label, length) => ({ kind: "tempImmunity", target: "self", label, length });
// TRG Prime 3.630.0's rows: a declared effect (death guard, next-damage boost,
// declared Success, Death State), a condition removed outright, a resource
// given back. See module/magic/declared-effect.mjs and restore-rows.mjs there.
const declare = (label, body) => ({ kind: "declare", target: "self", label, ...body });
const remove = (conditions, extra = {}) => ({ kind: "conditionRemove", target: "self", conditions, ...extra });
const restore = (resource, amount) => ({ kind: "restore", target: "self", resource, amount });

const SAVES = (subject, traits) => ({ checkTypes: ["save"], ...(subject ? { subjects: [subject] } : {}), ...(traits ? { traits } : {}) });

/**
 * What each herb's Use does, keyed by heading. `duration` is the effect's
 * clock; `effects` the rows; `note` a card line; `pending`/`resave` the
 * consumable-only fields the core herbs use; `oil` a weapon coating;
 * `hands` overrides the printed "held in 1 hand" (it never does here).
 */
const HERB_RULES = {
  "BLACKFIRE IVY": { duration: "1 minute", effects: [declare("Blackfire Ivy", { flags: { nextSpellDamage: { label: "Blackfire Ivy", damageTypes: ["fire"], extraDie: true, ignoreResistance: true } }, text: "your next fire spell within 1 minute deals one additional damage die and ignores each target's fire resistance; the dose is spent at that cast" })] },
  "BLACK SAP": { effects: [heal("1d6")] },
  "BRIGHTROOT": { duration: "1 hour", effects: [scoped("Brightroot", grant("Brightroot", 2, "Medicine checks", { checkTypes: ["skill"], subjects: ["medicine"] }))] },
  "CRYSTAL BARK": { duration: "1 hour", effects: [slotBonus("dr", 1)], note: "Temporary DR from Crystal Bark does not stack with DR granted by another consumable." },
  "DEEPMIRE LILY": { effects: [relief("Deepmire Lily", "fatigued", 1)], note: "You cannot benefit from Deepmire Lily again until you complete a Full Rest." },
  "DIVINE NECTAR": { effects: [relief("Divine Nectar", "dying", 99), restore("hp", "all"), restore("pp", "all"), remove(["bleeding", "fatigued", "frightened", "sickened", "stunned", "weakened"]), note("Drained is not a condition the sheet tracks — clear it by hand if your table uses it. It cannot restore Conviction, reverse death, remove an Injury or end a permanent effect.")], resave: "disease|poison" },
  "DRAGON'S BREATH REED": { duration: "1 minute", effects: [{ ...rider("Dragon's Breath Reed", "1d6", "fire"), spendOn: "hit" }] },
  "DREAMCAP": { duration: "8 hours", effects: [scoped("Dreamcap", advantage("Dreamcap", "Saving throws against dream and nightmare effects", SAVES(null, ["dream", "nightmare"]), { auto: false })), note("Ordinary noise and uncomfortable surroundings do not prevent you from sleeping. Dreamcap does not protect against effects that prevent or magically interrupt sleep.")] },
  "DREAMTHORN": { effects: [selfImmunity("Dreamthorn", "7 days"), note("A 1-hour trance. Before it, ask one question concerning a goal, event or course of action likely to occur within the next week; the GM provides a truthful answer, possibly brief or symbolic.")] },
  "DUSTCAP": { duration: "30 minutes", effects: [scoped("Dustcap", grant("Dustcap", 2, "Fortitude saves against inhaled poisons and airborne diseases", SAVES("fortitude", ["poison", "disease"]), { auto: false }))] },
  "ECHO REED": { duration: "10 minutes", effects: [note("You can communicate telepathically with creatures within 30 feet that possess a language. This does not allow you to read thoughts or overcome a language barrier.")] },
  "EMBERLEAF": { duration: "1 hour", effects: [resistance("fire")] },
  "EMBERTHISTLE": { duration: "1 minute", effects: [declare("Emberthistle", { flags: { nextSpellDamage: { label: "Emberthistle", damageTypes: ["fire"], dice: "1d4" }, strikeRider: { label: "Emberthistle", dice: "1d4", damageType: "fire", whenDamageTypes: ["fire"], once: true, spendOnHit: true } }, text: "the next time you deal fire damage within 1 minute — a fire spell or a Strike that deals fire — that damage roll gains +1d4; the dose is then spent" })] },
  "ETERNIS BLOOM": { duration: "7 days", effects: [scoped("Eternis Bloom", grant("Eternis Bloom", 4, "Saving throws against magical ageing effects", SAVES(null, ["ageing"]), { auto: false })), note("You do not physically age for the week. It does not reverse existing ageing; a second dose does not extend the duration until this one ends.")] },
  "FROSTMINT": { duration: "1 hour", effects: [resistance("cold")] },
  "GHOSTPETAL": { duration: "10 minutes", effects: [scoped("Ghostpetal", grant("Ghostpetal", 2, "Stealth checks made in dim light or darkness", { checkTypes: ["skill"], subjects: ["stealth"] }, { auto: false }))] },
  "GLOWMOSS": { duration: "1 hour", hands: 0, effects: [{ kind: "light", target: "self", source: "torch" }], note: "The paste is on the surface it was applied to; covering it blocks the light, and water does not extinguish it." },
  "GODSBLOOD MOSS": { effects: [heal("6d6+15"), relief("Godsblood Moss", "bleeding", 99), relief("Godsblood Moss", "injured", 2)] },
  "GREYSAP": { duration: "1 minute", effects: [resistance("acid"), remove([], { recurringType: "acid", count: 1, note: "One source of persistent acid damage ends." })] },
  "HEART OF ASH": { duration: "10 minutes", effects: [immunity("fire"), note("Treat extreme environmental heat as one severity lower.")] },
  "HEARTVINE": { effects: [heal("2d6+2")] },
  "IRONBLOOM": { duration: "1 hour", effects: [slotBonus("fortitude", 1)] },
  "KING'S BLOOD": { duration: "10 minutes", effects: [heal("2d6+6"), relief("King's Blood", "bleeding", 3), scoped("King's Blood", grant("King's Blood", 2, "Your next saving throw against poison within 10 minutes", SAVES(null, ["poison"]), { oneShot: true }))] },
  "KINGSHIELD MOSS": { duration: "10 minutes", effects: [slotBonus("dr", 2), slotBonus("defence", 1)], note: "Temporary DR from Kingshield Moss does not stack with DR granted by another consumable." },
  "LIFEBLOSSOM": { duration: "24 hours", effects: [heal("4d6+8"), relief("Lifeblossom", "bleeding", 99), scoped("Lifeblossom", grant("Lifeblossom", 2, "The next saving throw you attempt against disease within 24 hours", SAVES(null, ["disease"]), { oneShot: true }))] },
  "MINDCROWN IVY": { duration: "1 hour", effects: [scoped("Mindcrown Ivy", grant("Mindcrown Ivy", 2, "Checks made as part of Concentrate or Mental actions", { checkTypes: ["skill", "attribute"] }, { auto: false }), grant("Mindcrown Ivy", 2, "Will saving throws against Mental effects", SAVES("will", ["mental"])))] },
  "MINDLACE": { duration: "1 hour", effects: [slotBonus("spellcraft", 1)] },
  "MINDSEED": { duration: "1 hour", effects: [scoped("Mindseed", grant("Mindseed", 2, "Recall Knowledge checks", { checkTypes: ["skill"], actions: ["recallKnowledge"] }))] },
  "MISTWRAITH BLOOM": { duration: "1 minute", effects: [condition("invisible"), note("You are undetected (creatures can Search to make you hidden). The effect ends after you use a hostile action.")] },
  "MOONPETAL": { duration: "1 hour", effects: [scoped("Moonpetal", advantage("Moonpetal", "The next saving throw you attempt against an Enchantment or Mental effect within 1 hour", SAVES(null, ["enchantment", "mental"]), { oneShot: true }))] },
  "NEEDLEBERRY": { duration: "3 rounds", effects: [scoped("Needleberry", grant("Needleberry", 1, "Ranged weapon attack rolls (tick on a ranged attack)", { checkTypes: ["attack"] }, { auto: false }))] },
  "NIGHTSPIRE": { duration: "1 hour", effects: [slotBonus("will", 1)] },
  "OPHIDIAN FLOWER": { duration: "1 hour", effects: [resistance("poison"), scoped("Ophidian Flower", grant("Ophidian Flower", 4, "Fortitude saving throws against poison", SAVES("fortitude", ["poison"])))] },
  "PHOENIX ROOT": { duration: "24 hours", effects: [declare("Phoenix Root", { flags: { deathGuard: { label: "Phoenix Root", auto: true, trigger: "death", heal: "1", once: true } }, text: "for 24 hours, the first time your Dying would exceed your Death State, Dying drops to 0 and you regain 1 HP (Fatigued +1, as for recovering from Dying); it then ends" })] },
  "PRISM LOTUS": { duration: "24 hours", modes: [
    { key: "fate", label: "Fate — once, before a d20 roll, declare a Success without rolling", duration: "24 hours", effects: [declare("Prism Lotus (Fate)", { flags: { fateDeclare: { label: "Prism Lotus (Fate)" } }, text: "once within 24 hours, before a d20 check, attack roll or saving throw, you may declare a Success without rolling (never a Critical or Heroic); it then ends" })] },
    { key: "preservation", label: "Preservation — the first time you would die, Dying 0 and half your HP", duration: "24 hours", effects: [declare("Prism Lotus (Preservation)", { flags: { deathGuard: { label: "Prism Lotus (Preservation)", auto: true, trigger: "death", heal: "half", once: true } }, text: "for 24 hours, the first time you would die, only the death is negated: Dying drops to 0 and you regain half your maximum HP; it then ends" })] }
  ] },
  "QUIETROOT": { duration: "10 minutes", effects: [scoped("Quietroot", grant("Quietroot", 2, "Stealth checks where the sound you make is relevant", { checkTypes: ["skill"], subjects: ["stealth"] }, { auto: false }))] },
  "ROOT OF STONE": { effects: [relief("Root of Stone", "weakened", 1)], note: "You cannot benefit from Root of Stone again until you complete a Full Rest." },
  "ROSE OF THORNS": { duration: "1 minute", effects: [{ kind: "strikeRider", target: "self", label: "Rose of Thorns", condition: "bleeding", conditionValue: 2, conditionRounds: 0, once: true, spendOnHit: true, weaponScoped: true }] },
  "SILVERMOULD": { oil: { kind: "material", material: "silver", weaponDuration: "1 hour", ammoDuration: "1 hour", ammoCount: 10 }, note: "The treated weapon counts as silver and deals 1 additional damage to creatures with a weakness to silver." },
  "SOULVINE": { effects: [relief("Soulvine", "dying", 1)], note: "Rubbed over the chest of an adjacent living creature with the Dying condition — feed it to them. No effect on a dead creature." },
  "STAR FERN": { duration: "until the start of your next turn", effects: [scoped("Star Fern", advantage("Star Fern", "All saving throws", SAVES(null)))] },
  "STORM ORCHID": { duration: "1 hour", effects: [resistance("electricity")] },
  "SWIFTFERN": { duration: "5 minutes", effects: [slotBonus("speed", 5)] },
  "SUNVEIL": { effects: [remove(["dazzled"], { note: "A Dazzled condition from a permanent effect returns — the GM puts it back." })] },
  "TANGLEWEED": { duration: "1 minute", effects: [{ kind: "strikeRider", target: "self", label: "Tangleweed", condition: "slowed", conditionValue: 1, conditionRounds: 1, conditionSave: { save: "reflex", dcLevel: 2 }, once: true, spendOnHit: true, weaponScoped: true }] },
  "THUNDERLEAF": { duration: "1 hour", effects: [slotBonus("reflex", 1)] },
  "VOID LILY": { effects: [selfImmunity("Void Lily", "7 days"), restore("conviction", 1)] },
  "VOIDPETAL": { duration: "10 minutes", effects: [scoped("Voidpetal", grant("Voidpetal", 2, "Saving throws against Darkness and Illusion effects", SAVES(null, ["darkness", "illusion"])))] },
  "WITCHGRASS": { duration: "1 hour", effects: [scoped("Witchgrass", grant("Witchgrass", 2, "Saving throws against curses", SAVES(null, ["curse"])))] },
  "WORLDROOT FRAGMENT": { duration: "24 hours", effects: [declare("Worldroot Fragment", { deathState: 1, noStack: true, text: "Death State +1 for 24 hours (it does not stack with another Worldroot Fragment); when it ends, Dying is cut back to your normal Death State rather than killing you" })] }
};

/** The eight non-herb consumables: kind, hands and what the Use does. */
const OTHER_RULES = {
  "ARCHIVE SEALANT": { kind: "other", effects: [note("Protects approximately twenty pages against ordinary water and damp for one week. Not against fire, acid or deliberate destruction.")] },
  "BLOOM CULTURE": { kind: "other", effects: [note("Established on an ordinary corpse over 10 minutes; after 24 hours the remains have decomposed about as much as they would in one month. No effect on an Undead or Unliving creature, magical preservation or a supernaturally protected corpse.")] },
  "EMBALMING SALTS": { kind: "other", pending: { value: 2, type: "item", label: "Embalming Salts", scope: "the Preserve Remains check the salts are used for" }, note: "One packet is consumed regardless of the result." },
  "EVIDENCE POWDER": { kind: "other", pending: { value: 2, type: "item", label: "Evidence Powder", scope: "the next Search, Examine the Dead or similar check to identify physical evidence in the treated area" }, note: "It cannot reveal magical, spiritual or incorporeal traces." },
  "FUNERAL RESIN": { kind: "other", duration: "1 hour", nearby: { radius: 10, includeSelf: true, label: "creature in the smoke" }, effects: [scoped("Funeral Resin", grant("Funeral Resin", 2, "Fortitude saves against becoming Sickened solely because of mundane foul odours", SAVES("fortitude"), { auto: false }))], note: "Burns for 1 hour and fills a 10-foot radius: the bonus is given to every creature in the smoke when it is lit." },
  "MOURNER'S INCENSE": { kind: "other", duration: "1 hour", effects: [scoped("Mourner's Incense", grant("Mourner's Incense", 1, "Your next saving throw against a Fear or Emotion effect within the hour (after 10 minutes resting in the smoke)", SAVES(null, ["fear", "emotion"]), { oneShot: true }))], note: "A creature may benefit from Mourner's Incense only once per day." },
  "PURIFYING LYE": { kind: "other", effects: [note("Cleans one set of medical tools or about a 5-foot square surface of ordinary blood, rot and biological contamination over 10 minutes. Not magical disease, poison, curses or supernatural contamination.")] },
  "VIGIL DRAUGHT": { kind: "elixir", duration: "1 hour", effects: [suppress("Vigil Draught", "fatigued", 1)], note: "The condition is not removed and its duration continues; when the effect ends any remaining Fatigued applies normally. You cannot benefit from another Vigil Draught until you have completed a Full Rest." }
};

function consumable(heading, entry, rule) {
  const name = titleCase(heading);
  const level = Number(entry.fields.Level);
  const gp = price(entry.fields.Price);
  const isHerb = entry.section === "herb";
  const kind = rule.kind ?? "herb";
  const traits = titleCase(entry.traits);
  const hands = rule.hands ?? (/held in 1 hand/i.test(entry.fields.Usage) ? 1 : 0);
  const usage = `Usage ${entry.fields.Usage}; Activate ${entry.fields.Activate}.`;
  const terrain = entry.terrain ? `Terrain: ${entry.terrain}` : "";
  const body = entry.body.join("\n\n");
  const parts = [`<strong>${usage}</strong>`, terrain, body];
  if (rule.note) parts.push(`On the sheet: ${rule.note}`);
  parts.push(SOURCE);

  const consumableFlag = { kind, costColumn: "alchemical", hands, traitOmitsConsumable: false };
  if (rule.oil) consumableFlag.oil = rule.oil;
  else {
    const effect = { label: name };
    if (rule.duration) effect.duration = rule.duration;
    if (rule.effects) effect.effects = rule.effects;
    if (rule.pending) effect.pending = rule.pending;
    if (rule.resave) effect.resave = rule.resave;
    // 0.11.0: Prism Lotus's two modes, Funeral Resin's smoke.
    if (rule.modes) effect.modes = rule.modes;
    if (rule.nearby) effect.nearby = rule.nearby;
    if (rule.note) effect.note = rule.note;
    consumableFlag.effect = effect;
  }

  return {
    _id: stableId(`alchemical:${name}`),
    name,
    img: isHerb ? "icons/svg/oak.svg" : "icons/svg/item-bag.svg",
    type: "consumable",
    system: {
      quantity: 1, weight: isHerb ? 0 : 1, price: gp, equipped: false, invested: false,
      hp: { value: 0, max: 0 },
      traits,
      description: parts.filter(Boolean).join("\n\n"),
      uses: 1,
      activation: entry.fields.Activate,
      itemLevel: level
    },
    effects: [],
    folder: null,
    sort: 0,
    ownership: { default: 0 },
    flags: {
      [SYSTEM_ID]: {
        bookChapter: 6,
        consumable: consumableFlag,
        alchemical: {
          section: isHerb ? "Herb" : "Other",
          higherLevel: "", reagent: "", terrain, stages: "", delivery: "",
          baseLevel: level, bomb: null, rangeIncrement: 0, scaling: null,
          printedPrice: gp, tablePrice: gp, offTable: false, priceRuling: null
        }
      }
    },
    _stats: { ...STATS }
  };
}

export const HERBS = Object.entries(CONSUMABLE_TEXT)
  .filter(([, e]) => e.section === "herb")
  .map(([heading, e]) => {
    const rule = HERB_RULES[heading];
    if (!rule) throw new Error(`No rule for herb ${heading}`);
    return consumable(heading, e, rule);
  });

export const OTHER_CONSUMABLES = Object.entries(CONSUMABLE_TEXT)
  .filter(([, e]) => e.section !== "herb")
  .map(([heading, e]) => {
    const rule = OTHER_RULES[heading];
    if (!rule) throw new Error(`No rule for consumable ${heading}`);
    return consumable(heading, e, rule);
  });

export const CONSUMABLES = [...HERBS, ...OTHER_CONSUMABLES];
export { HERB_RULES, OTHER_RULES };
