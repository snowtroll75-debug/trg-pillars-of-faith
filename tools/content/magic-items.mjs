/**
 * Chapter 11 — Magic Items (0.8.0): the fifteen runes as pack items, six
 * specific armour and shields, seven specific weapons, seventeen wondrous
 * items and two relics, three rods and five staves, twelve magical
 * consumables. Every entry in the shape the matching core pack uses, so
 * the system's own readers apply it:
 *
 *   runes          gear + `flags.trg-prime.rune {key, tier, on, automation}`; the
 *                  behaviour is the registered rune's (module/magic-items.mjs)
 *   specific items armour/shield/weapon built from the Chapter 6 base, with
 *                  quality, runes and `specificItem` (core specific-items shape)
 *   wondrous       gear + `wondrous {base, tier, abilities[]}` (core wondrous-data
 *                  shape, carried on the item), `conditionals`, `healingRider`
 *   charged        gear + `chargedItem {kind, maximumPP, spells[], checkAdvantage|
 *                  checkBonus}` (core charged-items shape) + `uses`
 *   consumables    consumable + `consumable {kind, effect {effects, choose, …}}`
 *                  (the Chapter 6 shape, with 3.626.0's `choose`/`requiresTrait`)
 *
 * Text: magic-item-text.json (extracted from the chapter). The rune data
 * is read from module/magic-items.mjs so the pack and the registration
 * cannot disagree.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SYSTEM_ID, stableId } from "./builders.mjs";
import { ARMOUR, SHIELDS, WEAPONS } from "./equipment.mjs";
import { RUNES } from "../../module/magic-items.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
export const MAGIC_TEXT = JSON.parse(fs.readFileSync(path.join(here, "magic-item-text.json"), "utf8"));

const STATS = { coreVersion: "14", systemId: SYSTEM_ID, systemVersion: "3.626.0", createdTime: 1789000000000, modifiedTime: 1789000000000, lastModifiedBy: null, compendiumSource: null, duplicateSource: null };
const SOURCE = "Pillars of Faith, Chapter 11.";
const SMALL = new Set(["of", "the", "and", "a", "for"]);
const titleCase = (s) => String(s).toLowerCase().split(" ").map((w, i) => (i > 0 && SMALL.has(w) ? w : w.replace(/(^|-)([a-z])/g, (m, p, c) => p + c.toUpperCase()))).join(" ");
const traitsOf = (line) => String(line ?? "").split(/\s+/).filter(Boolean).map(titleCase).join(", ");
const text = (section, heading) => {
  const entry = MAGIC_TEXT[section]?.[heading];
  if (!entry) throw new Error(`magic-item-text.json has no ${section} / ${heading}`);
  return entry;
};
const body = (entry, extra = []) => [...entry.lines, ...extra, SOURCE].filter(Boolean).join("\n\n");
const base = (id, name, type, img, system, flags = {}) => ({
  _id: id, name, img, type, system, effects: [], folder: null, sort: 0, ownership: { default: 0 },
  flags: { [SYSTEM_ID]: { bookChapter: 11, ...flags } }, _stats: { ...STATS }
});
const offered = (label, value, scope, when, type = "status") => ({ kind: "modifier", value, type, label, scope, auto: false, when });
const auto = (label, value, scope, when, type = "status") => ({ kind: "modifier", value, type, label, scope, auto: true, when });
const SAVE = (traits) => ({ checkTypes: ["save"], traits });

/* ------------------------------------------------------------------ */
/* Runes as pack items                                                  */
/* ------------------------------------------------------------------ */

const RUNE_AUTOMATION = {
  anchoredSoul: "conditional", intercession: "event", lastVigil: "event", martyrsAegis: "event", sanctuary: "action",
  soulMirror: "event", soulWard: "event", veilwatch: "applied", banishing: "damage", exorcist: "event", merciful: "event",
  remembrance: "event", requiem: "damage", soulchain: "event", vowkeeper: "conditional"
};
const RUNE_HEADING = { martyrsAegis: "MARTYR'S AEGIS" };
const ROMAN = ["I", "II", "III", "IV", "V", "VI"];

function runeItem(rune, tierIndex = 0) {
  const section = rune.on.includes("weapon") ? "weaponRunes" : "armourRunes";
  const heading = RUNE_HEADING[rune.key] ?? rune.name.toUpperCase();
  const entry = text(section, heading);
  const tier = rune.tiers ? rune.tiers[tierIndex] : null;
  // NAMES NEVER COLLIDE ACROSS ITEM TYPES (module convention): the Exorcist
  // archetype feat already exists, so the rune ITEM says what it is.
  const name = (tier && rune.tiers.length > 1 ? `${rune.name} ${ROMAN[tierIndex]}` : rune.name) + (rune.key === "exorcist" ? " (Rune)" : "");
  const tierEntry = tier && rune.tiers.length > 1 ? MAGIC_TEXT[section]?.[`${heading} ${ROMAN[tierIndex]}`] : null;
  const level = tier ? tier.level : rune.level;
  const price = tier ? tier.price : (rune.price ?? rune.armourPrice);
  const where = rune.on.map((k) => (k === "armour" ? "armour" : k === "shield" ? "a shield" : "a weapon")).join(" or ");
  const lines = [
    ...entry.lines,
    ...(tierEntry ? tierEntry.lines : []),
    rune.armourPrice != null ? `Armour price ${rune.armourPrice.toLocaleString("en-GB")} gp; shield price ${rune.shieldPrice.toLocaleString("en-GB")} gp.` : "",
    `Inscribed onto ${where}.`,
    rune.note ? `On the sheet: ${rune.note}` : ""
  ];
  return base(stableId(`rune:${name}`), name, "gear", "icons/svg/book.svg", {
    quantity: 1, weight: 0, price, equipped: false, invested: false,
    hp: { value: 0, max: 0 },
    traits: rune.traits,
    description: body({ lines }),
    slot: "", uses: 0, itemSize: "medium", itemLevel: level, heldHands: 0, formulae: "", spellbookContainer: false
  }, { rune: { key: rune.key, tier: tierIndex + 1, on: rune.on, automation: RUNE_AUTOMATION[rune.key] ?? "event" } });
}

export const RUNE_ITEMS = RUNES.flatMap((rune) => (rune.tiers ? rune.tiers.map((_, i) => runeItem(rune, i)) : [runeItem(rune)]));

/* ------------------------------------------------------------------ */
/* Specific armour, shields and weapons                                 */
/* ------------------------------------------------------------------ */

const RUNE_KEY = { Potency: "potency", Sanctuary: "sanctuary", "Anchored Soul": "anchoredSoul", Veilwatch: "veilwatch", "Soul Ward": "soulWard", Intercession: "intercession", Exorcist: "exorcist", Remembrance: "remembrance", Requiem: "requiem", Merciful: "merciful", Soulchain: "soulchain", Banishing: "banishing", Vowkeeper: "vowkeeper" };
const QUALITY = { Expert: "expert", Master: "master" };
const MATERIAL = { "Cold Iron": "coldIron" };

/** The printed Traits line split into quality, material, runes and plain traits. */
function specificTraits(line) {
  const all = line.split(",").map((t) => t.trim()).filter(Boolean);
  const runes = [];
  let quality = "standard";
  let material = "";
  const plain = [];
  for (const t of all) {
    const m = /^([A-Za-z' ]+?)(?: (I{1,3}|IV|V|VI))?$/.exec(t);
    const name = m ? m[1].trim() : t;
    if (QUALITY[t]) { quality = QUALITY[t]; continue; }
    if (MATERIAL[t]) { material = MATERIAL[t]; plain.push(t); continue; }
    if (RUNE_KEY[name]) {
      const tier = m?.[2] ? ROMAN.indexOf(m[2]) + 1 : 1;
      runes.push({ key: RUNE_KEY[name], label: name, tier, printed: t });
      continue;
    }
    plain.push(t);
  }
  // Potency leads, as the core writes every runes field.
  runes.sort((a, b) => (a.key === "potency" ? -1 : b.key === "potency" ? 1 : 0));
  const runeText = runes.map((r) => r.printed).join(", ");
  return { runes, runeText, quality, material, plain, traitsList: all };
}

function printedLine(entry, re) {
  const line = entry.lines.find((l) => re.test(l));
  return line ?? "";
}
function stat(line, key) {
  const m = new RegExp(`${key} ([+-]?\\d+)`).exec(line);
  return m ? Number(m[1]) : null;
}
function flavourOf(entry) {
  return entry.lines.filter((l) => !/^(This .* has the following statistics:|The weapon has the following statistics:|ACP|AB |Traits )/.test(l));
}

function specificArmour(heading, baseName, { usage } = {}) {
  const entry = text("specificArmour", heading);
  const source = [...ARMOUR, ...SHIELDS].find((i) => i.name === baseName);
  if (!source) throw new Error(`no Chapter 6 base for ${heading}: ${baseName}`);
  const name = titleCase(heading);
  const traitLine = printedLine(entry, /^Traits /).replace(/^Traits /, "");
  const stats = printedLine(entry, /^ACP /);
  const t = specificTraits(traitLine);
  const printedBonus = t.runes.find((r) => r.key === "potency")?.tier ?? 0;
  const isShield = source.type === "shield";
  const system = structuredClone(source.system);
  system.price = entry.price;
  system.itemLevel = entry.level;
  system.weight = Number(String(entry.weight ?? "").replace(/[^0-9.]/g, "")) || system.weight;
  system.quality = t.quality;
  system.runes = t.runeText;
  system.superiorTraits = "";
  const hp = stat(stats, "HP");
  if (hp !== null) system.hp = { value: hp, max: hp };
  const dr = stat(stats, "DR");
  if (dr !== null) system.dr = dr;
  const acp = stat(stats, "ACP");
  if (acp !== null) system.penalty = acp;
  if (!isShield) {
    const maxDex = stat(stats, "MAX DEX");
    if (maxDex !== null) system.maxDexBonus = maxDex;
    const speed = stat(stats, "Speed");
    if (speed !== null) system.speedPenalty = speed;
    system.material = /Metal/.test(traitLine) ? "Metal" : system.material;
  } else {
    const db = stat(stats, "DB");
    // A shield's printed DB includes the potency rune's raise; the base
    // bonus is what the rune then raises (core specific-items shape).
    if (db !== null) system.defenceBonus = Math.max(1, db - printedBonus);
  }
  system.traits = t.traitsList.join(", ");
  system.description = body({ lines: [...flavourOf(entry), `Statistics: ${stats}.`, `Traits ${traitLine}.`, ...(usage ? [`On the sheet: ${usage}`] : [])] });
  const flags = { ...(source.flags?.[SYSTEM_ID] ?? {}) };
  delete flags.bookChapter;
  return base(stableId(`specific:${name}`), name, source.type, source.img, system, {
    ...flags,
    specificItem: { runes: t.runes, runeText: t.runeText, traits: t.traitsList, quality: t.quality, material: isShield ? "" : (system.material === "Metal" ? "metal" : ""), printedItemBonus: printedBonus }
  });
}

function specificWeapon(heading, baseName, { usage, extraFlags = {} } = {}) {
  const entry = text("specificWeapons", heading);
  const source = WEAPONS.find((i) => i.name === baseName);
  if (!source) throw new Error(`no Chapter 6 base for ${heading}: ${baseName}`);
  const name = titleCase(heading);
  const traitLine = printedLine(entry, /^Traits /).replace(/^Traits /, "");
  const stats = printedLine(entry, /^AB /);
  const t = specificTraits(traitLine);
  const printedBonus = t.runes.find((r) => r.key === "potency")?.tier ?? 0;
  const system = structuredClone(source.system);
  system.price = entry.price;
  system.itemLevel = entry.level;
  system.weight = Number(String(entry.weight ?? "").replace(/[^0-9.]/g, "")) || system.weight;
  system.quality = t.quality;
  system.material = t.material;
  system.runes = t.runeText;
  system.superiorTraits = "";
  system.traits = t.traitsList.join(", ");
  const fdc = stat(stats, "FDC");
  if (fdc !== null) system.fumbleDC = fdc;
  system.description = body({ lines: [...flavourOf(entry), `Statistics: ${stats}.`, `Traits ${traitLine}.`, ...(usage ? [`On the sheet: ${usage}`] : [])] });
  return base(stableId(`specific:${name}`), name, "weapon", source.img, system, {
    ...extraFlags,
    specificItem: { runes: t.runes, runeText: t.runeText, traits: t.traitsList, quality: t.quality, material: t.material, printedItemBonus: printedBonus }
  });
}

export const SPECIFIC_ARMOUR = [
  specificArmour("AEGIS OF THE PILGRIM CHOIR", "Processional Aegis", { usage: "an Expert Processional Aegis with Potency II and Sanctuary (press Sanctuary on it: Engage 1 AP, a minute's +2 status aura against Fear, possession, Soul Drain and Soul effects; Refocus restores it). Planting it as a shrine is the base shield's note." }),
  specificArmour("BULWARK OF THE SWORN GATE", "Oathguard Plate", { usage: "a Master Oathguard Plate with Potency III, Anchored Soul (+2 item against possession and soul displacement) and Sanctuary. The Oathguard's +1 item against Shove, Trip and forced movement is still offered." }),
  specificArmour("GRAVEWARDEN'S VIGIL COAT", "Gravewarden Coat", { usage: "an Expert Gravewarden Coat with Potency II, Anchored Soul and Veilwatch (Spirit Sense 30 feet, tertiary, on your senses). The coat's +1 item against airborne disease and inhaled poison stands." }),
  specificArmour("HOSPICE VESTMENT OF THE LAST LAMP", "Hospice Jack", { usage: "an Expert Hospice Jack with Potency II; invested, it grants Light at will and Cure three times a day as innate spells (Command, 2 AP). The integrated kit counts as an Expert healer's kit for Administer First Aid — the +1 of an Expert kit is the table's." }),
  specificArmour("PLATE OF THE SEALED SEPULCHRE", "Sepulchral Plate", { usage: "a Master Sepulchral Plate with Potency III, Anchored Soul and Soul Ward (Soul Drain you gain is reduced by 10 under Potency III). The plate's +1 item against contact or inhaled disease and poison stands. Resistance to essence from Soul Warding is a note." }),
  specificArmour("RELIQUARY SHIELD OF THE FIRST WITNESS", "Reliquary Shield", { usage: "an Expert Reliquary Shield with Potency II and Intercession (an ally within 10 feet who fails a save against Fear, possession or a Soul effect is offered the reroll, once a day)." })
];

// HOSPICE VESTMENT: the two innate spells, as a wondrous grant on the armour
// (wondrous-effects reads the flag on any invested item). Light at will;
// Cure 3/day ("as a PP 4 innate spell").
{
  const vestment = SPECIFIC_ARMOUR.find((i) => /Hospice Vestment/.test(i.name));
  vestment.flags[SYSTEM_ID].wondrous = {
    base: "", tier: "", slotInferred: false, activate: "Command (2 AP)", frequency: "",
    abilities: [
      { kind: "spell", spell: "Light", frequency: "atWill", label: "Hospice Vestment of the Last Lamp", castAP: 2, note: "Command (2 AP), at will" },
      { kind: "spell", spell: "Cure", frequency: "thrice", label: "Hospice Vestment of the Last Lamp", castAP: 2, note: "Command (2 AP), 3/day, as a PP 4 innate spell" }
    ]
  };
  vestment.flags[SYSTEM_ID].toolFor = ["firstAid"];
}
// PLATE OF THE SEALED SEPULCHRE: "You possess Resistance to essence damage from Soul Warding."
{
  const plate = SPECIFIC_ARMOUR.find((i) => /Sealed Sepulchre/.test(i.name));
  plate.effects.push({
    _id: stableId("effect:sepulchre-essence").slice(0, 16), name: "Plate of the Sealed Sepulchre: resistance to essence", img: "icons/svg/shield.svg",
    changes: [{ key: "system.combat.resistances", mode: 2, value: ", essence" }], disabled: false, transfer: true, origin: "", duration: {}, tint: "#ffffff", statuses: [],
    description: "Resistance to essence damage from Soul Warding, while the plate is worn.", flags: { [SYSTEM_ID]: { featPassive: true, worn: true } }
  });
}

export const SPECIFIC_WEAPONS = [
  specificWeapon("ASHEN CENSER", "Censer Flail", { usage: "an Expert Censer Flail with Potency II and Exorcist (strikes incorporeal spirits and incorporeal Undead normally). The outline of spirits within 10 feet of its burning incense is a note." }),
  specificWeapon("BLOOM OF THE ANCESTRAL GROVE", "Bloom Scythe", { usage: "a Master Bloom Scythe with Potency III, Remembrance (a Critical's card offers the free Recall Knowledge) and Requiem I (1d6 essence on the first hit each round against an Undead or Unliving creature)." }),
  specificWeapon("CHAIN OF CONTRITION", "Penitent Chain", { usage: "an Expert Penitent Chain with Potency II and Merciful (a felled living creature may be left Stable)." }),
  specificWeapon("HOOK OF THE LAST PASSAGE", "Grave Hook", { usage: "a Master cold-iron Grave Hook with Potency III, Requiem I and Soulchain (after a hit, once a round, the creature's Will save against your Level DC)." }),
  specificWeapon("TESTAMENT OF THE UNBROKEN LINE", "Testament Blade", { usage: "a Master Testament Blade with Potency III, Remembrance, Requiem I and Vowkeeper (your class bonus to damage is offered while you pursue the day's vow; the once-a-day 1d6 essence on a Critical under the vow is added by hand)." }),
  specificWeapon("WAYKEEPER", "Last-Road Spear", { usage: "a Master Last-Road Spear with Potency III, Banishing, Exorcist and Requiem I." }),
  specificWeapon("WITNESS", "Oath Hammer", { usage: "an Expert Oath Hammer with Potency II, Remembrance and Vowkeeper. Its recorded oaths are recalled from the item's Use (1 AP, Concentrate); the hammer holds as many as its item level.", extraFlags: { wondrous: { base: "", tier: "", slotInferred: false, activate: "1 AP (Concentrate)", frequency: "", abilities: [{ kind: "use", automation: "recallOath", activation: "Concentrate (1 AP)", frequency: "atWill", label: "Recall an Oath" }] } } })
];

/* ------------------------------------------------------------------ */
/* Wondrous items and relics                                            */
/* ------------------------------------------------------------------ */

const SLOT = { worn: "", neck: "neck", hands: "hands", waist: "waist", cloak: "shoulders", head: "head", wrist: "wrists", eyes: "eyes" };

function wondrous(heading, { section = "wondrous", slot = "", base: baseName = "", tier = "", abilities = [], conditionals = [], extraFlags = {}, sheet = "", subHeadings = [], weight = null, price = null, level = null, img = "icons/svg/item-bag.svg", name: nameOverride = "" }) {
  const entry = text(section, heading);
  const name = nameOverride || titleCase(heading);
  const subs = subHeadings.map((h) => text(section, h));
  const lines = [
    `Usage ${entry.usage ?? "worn"}${entry.weight && entry.weight !== "-" ? `; Weight ${entry.weight}` : ""}.`,
    ...entry.lines,
    ...subs.flatMap((s, i) => [`${titleCase(subHeadings[i])}:`, ...s.lines]),
    sheet ? `On the sheet: ${sheet}` : ""
  ];
  const held = /held/i.test(String(entry.usage ?? ""));
  return base(stableId(`wondrous:${name}`), name, "gear", img, {
    quantity: 1, weight: weight ?? (Number(String(entry.weight ?? "").replace(/[^0-9.]/g, "")) || 0),
    price: price ?? entry.price ?? 0, equipped: false, invested: false,
    hp: { value: 0, max: 0 },
    traits: traitsOf(entry.traits),
    description: body({ lines }),
    slot, uses: 0, itemSize: "medium", itemLevel: level ?? entry.level ?? 0, heldHands: held ? 1 : 0, formulae: "", spellbookContainer: false
  }, {
    wondrous: { base: baseName, tier, slotInferred: Boolean(slot), activate: "", frequency: "", abilities },
    ...(conditionals.length ? { conditionals } : {}),
    ...extraFlags
  });
}

const use = (automation, label, activation, frequency = "daily") => ({ kind: "use", automation, activation, frequency, label });
const spellGrant = (spell, label, frequency = "daily", extra = {}) => ({ kind: "spell", spell, frequency, label, ...extra });
const skillBonus = (skill, value, label, bonusType = "status") => ({ kind: "skillBonus", value, bonusType, skill, target: `system.skills.${skill}`, label });
const statBonus = (stat, value, label) => ({ kind: "stat", value, bonusType: "status", stat, target: `system.attributes.${stat}`, label, removalPenalty: true });
const allyAura = (id, name, radius, grants, textLine) => [{ id, name, kind: "ally", radius, triggers: ["turnStart", "enter"], save: "", appliesTo: "Allies", outcomes: {}, immunitySeconds: 0, text: textLine, grants }];

export const WONDROUS_ITEMS = [
  wondrous("ANCESTOR'S LOCKET", { slot: "neck", abilities: [use("pastLifeInsight", "Past-Life Insight", "Free (0 AP)")],
    conditionals: [offered("Ancestor's Locket", 1, "Saving throws against effects that alter, erase, suppress or replace your memories or identity", { checkTypes: ["save"] })],
    sheet: "+1 status is offered on saves against memory or identity effects; Use queues Advantage on your next Recall Knowledge (1/day)." }),
  wondrous("ARCHIVIST'S CONCORDANCE", { abilities: [{ ...use("perfectReference", "Perfect Reference", "Free (0 AP)"), requiresFeat: "Recite from the Text" }], subHeadings: ["PERFECT REFERENCE"],
    conditionals: [offered("Archivist's Concordance", 2, "Religion and Linguistics checks involving sacred texts, doctrine, liturgy or the comparison of religious writings", { checkTypes: ["skill"], subjects: ["religion", "linguistics"] })],
    sheet: "+2 status is offered on Religion and Linguistics about sacred texts; Use (with Recite from the Text) makes the next Recite a Free action (1/day). An Archivist may carry it as their Prayer Book — name it so on the Archivist's Prayer Book ability." }),
  wondrous("BELL OF THE LAST ROAD", { abilities: [spellGrant("Last Rite", "Final Toll", "daily", { note: "1 minute; one corpse within 10 feet; no PP" })], subHeadings: ["FINAL TOLL"],
    conditionals: [auto("Bell of the Last Road", 2, "Perform Last Rites, with the bell as part of the rite", { checkTypes: ["skill"], actions: ["performLastRites"] })],
    sheet: "+2 status is pre-ticked on Perform Last Rites; Final Toll is Last Rite as an innate spell, 1/day, for no PP." }),
  wondrous("BONEGLASS MONOCLE", { slot: "eyes", abilities: [spellGrant("Vital Diagnosis", "Read Vital Traces", "daily", { castAP: 2, note: "Interact (2 AP); a creature or corpse examined through the lens" })], subHeadings: ["READ VITAL TRACES"],
    conditionals: [auto("Boneglass Monocle", 2, "Examine the Dead and Perform Autopsy", { checkTypes: ["skill"], actions: ["examineTheDead", "performAutopsy"] }), offered("Boneglass Monocle", 2, "Checks to identify evidence of disease, poison, possession, magical transformation or supernatural interference with a corpse", { checkTypes: ["skill"] })],
    sheet: "+2 status is pre-ticked on Examine the Dead and Perform Autopsy and offered on other checks over a corpse; Read Vital Traces is Vital Diagnosis as an innate spell, 1/day." }),
  wondrous("CENSER OF QUIET THRESHOLDS", { abilities: [use("revealTheUnseen", "Reveal the Unseen", "Command (1 AP)")], subHeadings: ["REVEAL THE UNSEEN"],
    extraFlags: { auras: allyAura("censer-of-quiet-thresholds", "Censer of Quiet Thresholds", 20, { kind: "modifier", value: 1, type: "status", checkTypes: ["save"], traits: ["possession", "soul"], scope: "Saving throws against possession and Soul effects while the censer's incense burns" }, "AURA — while incense burns, willing creatures within 20 feet gain +1 status to saves against possession and Soul effects. A possessor gains nothing through its host.") },
    sheet: "an ally aura (20 feet): +1 status to saves against possession and Soul effects — meant for while the incense burns. Use is Reveal the Unseen (1/day): a minute's outline of spirits in the smoke." }),
  wondrous("CORD OF THE SWORN WORD", { slot: "neck", abilities: [spellGrant("Oathseal", "Seal the Word", "daily", { note: "1 minute; up to two willing creatures" })], subHeadings: ["SEAL THE WORD"],
    conditionals: [offered("Cord of the Sworn Word", 2, "Saving throws against magical effects compelling you to knowingly violate a solemn oath you freely undertook", { checkTypes: ["save"] })],
    sheet: "+2 status is offered on saves against compulsion to break an oath; Seal the Word is Oathseal as an innate spell, 1/day." }),
  wondrous("GRAVE-MEMORY BEADS", { slot: "neck", abilities: [spellGrant("Dead Tongue", "Voice of the Dead", "daily", { castAP: 1, duration: "10 minutes", note: "Command (1 AP); 10 minutes" })], subHeadings: ["VOICE OF THE DEAD"],
    conditionals: [offered("Grave-Memory Beads", 1, "Religion and Occultism Recall Knowledge concerning Undead, Unliving creatures, funerary practices, necromancy and the passage of souls", { checkTypes: ["skill"], subjects: ["religion", "occultism"], actions: ["recallKnowledge"] })],
    sheet: "+1 status is offered on Religion and Occultism Recall Knowledge about the dead; Voice of the Dead is Dead Tongue as an innate spell, 1/day, for 10 minutes." }),
  wondrous("HANDS OF MERCY", { slot: "hands", abilities: [skillBonus("medicine", 2, "Hands of Mercy")], subHeadings: ["STEADY GIFT"],
    extraFlags: { healingRider: { label: "Steady Gift", maximiseDice: 1, frequency: "daily", maximiseDiceWith: { feat: "Lifebinder", dice: 2 } } },
    sheet: "+2 status to Medicine while invested; Steady Gift is offered on your Healing spells (1/day): one healing die maximised — two with the Lifebinder Calling." }),
  wondrous("LANTERN OF THE VEIL", { abilities: [spellGrant("Veil Sight", "Open the Lantern", "focus", { castAP: 1, duration: "10 minutes", note: "Engage (1 AP); 10 minutes; expended until Refocus" })], subHeadings: ["OPEN THE LANTERN"],
    extraFlags: { light: { source: "torch", radiusFeet: 20 } },
    sheet: "Open the Lantern is Veil Sight as an innate Focus spell (Refocus restores it). Its 20-foot light and the outline of spirits within it are the table's." }),
  wondrous("MANTLE OF MANY LIVES", { slot: "shoulders", abilities: [use("borrowedExperience", "Borrowed Experience", "Concentrate (1 AP)")], subHeadings: ["BORROWED EXPERIENCE"],
    conditionals: [offered("Mantle of Many Lives", 2, "Saving throws against magical memory alteration and effects that suppress or alter personal identity", { checkTypes: ["save"] })],
    sheet: "+2 status is offered on saves against memory and identity effects; Use grants 1 rank (a Rhevani: 2) in a skill you have none in, for 10 minutes (1/day)." }),
  wondrous("PILGRIM'S WAYSTONE", { abilities: [spellGrant("Long Stride", "Walk the Road", "daily", { castAP: 1, note: "Command (1 AP)" })], subHeadings: ["WALK THE ROAD"],
    conditionals: [offered("Pilgrim's Waystone", 2, "Survival checks to navigate, avoid becoming lost or follow a recognised pilgrimage route", { checkTypes: ["skill"], subjects: ["survival"] })],
    sheet: "+2 status is offered on Survival to navigate; Walk the Road is Long Stride as an innate spell, 1/day. The designated place and its direction are the table's." }),
  wondrous("RELIQUARY OF THE FIRST INSCRIPTION", { conditionals: [offered("Reliquary of the First Inscription", 2, "Religion and Linguistics checks to identify, translate or interpret prayers, sacred symbols, religious doctrine and ritual formulae", { checkTypes: ["skill"], subjects: ["religion", "linguistics"] })],
    sheet: "+2 status is offered on Religion and Linguistics about prayers, symbols, doctrine and ritual." }),
  wondrous("SHROUD OF BORROWED WARMTH", { slot: "shoulders", abilities: [{ kind: "note", value: 0, reported: true, requiresTrait: "unliving", label: "Shroud of Borrowed Warmth", note: "Requires the Unliving trait: you feel warm, appear to breathe, show a pulse where your form can, and ordinary signs of death are concealed (not impossible anatomy, nor magical detection of the Unliving trait)." }],
    conditionals: [offered("Shroud of Borrowed Warmth", 2, "Deception checks to conceal that you are Unliving", { checkTypes: ["skill"], subjects: ["deception"] })],
    sheet: "+2 status is offered on Deception to conceal that you are Unliving; the concealed signs of death are the card's words. Requires the Unliving trait." }),
  wondrous("SPIRIT-SPEAKER'S MASK", { slot: "head", conditionals: [offered("Spirit-Speaker's Mask", 2, "Diplomacy, Nature or Occultism checks to communicate or negotiate with spirits (one skill per check)", { checkTypes: ["skill"], subjects: ["diplomacy", "nature", "occultism"] })],
    sheet: "+2 status is offered on Diplomacy, Nature and Occultism to communicate with spirits." }),
  ...["I", "II", "III", "IV"].map((tier, i) => wondrous("STOLE OF DIVINE INSIGHT", { name: `Stole of Divine Insight ${tier}`, base: "Stole of Divine Insight", tier, slot: "shoulders", subHeadings: [`STOLE OF DIVINE INSIGHT ${tier}`],
    level: text("wondrous", `STOLE OF DIVINE INSIGHT ${tier}`).level, price: text("wondrous", `STOLE OF DIVINE INSIGHT ${tier}`).price,
    abilities: [statBonus("wisdom", i + 1, "Stole of Divine Insight")],
    sheet: `+${i + 1} status to Wisdom while invested; worn for 24 hours and then removed, the same penalty follows for 24 hours (the Agile Sash's rail).` })),
  wondrous("THREAD OF THE RETURNING SOUL", { slot: "neck", abilities: [spellGrant("Anchor the Departing Soul", "Thread of the Returning Soul", "daily", { duration: "24 hours", note: "cast on you the moment you die — the thread's reaction, 1/day" })],
    sheet: "Anchor the Departing Soul is held as an innate spell (1/day, 24 hours): the thread casts it on you when you die — cast it then. The trigger is the table's." }),
  wondrous("WREATH OF LIVING SPORES", { slot: "head", conditionals: [auto("Wreath of Living Spores", 2, "Saving throws against Disease, Poison and harmful fungal or spore effects", SAVE(["disease", "poison"])), offered("Wreath of Living Spores", 2, "Saving throws against harmful fungal or spore effects", { checkTypes: ["save"], not: { traits: ["disease", "poison"] } })],
    sheet: "+2 status is pre-ticked on saves against Disease and Poison effects and offered against fungal or spore effects." })
];

export const RELICS = [
  // "(Relic)": the Eshari racial feat already carries the name.
  wondrous("LANTERN OF THE LAST ROAD", { section: "relics", name: "Lantern of the Last Road (Relic)", subHeadings: ["OPEN THE LAST ROAD", "CLOSE THE GATE"],
    abilities: [use("lanternOfTheLastRoad", "Open the Last Road / Close the Gate", "Varies", "atWill")],
    extraFlags: {
      auras: allyAura("lantern-of-the-last-road", "Lantern of the Last Road", 30, { kind: "modifier", value: 2, type: "status", checkTypes: ["save"], traits: ["possession", "soul"], scope: "Saving throws against possession and Soul effects within the lantern's light" }, "AURA — willing allies within the lantern's light gain +2 status to saves against possession and Soul effects."),
      creatureAbility: { printedTraits: "", printedAction: "", printedArea: "", derives: { sense: { category: "tertiary", modality: "spiritual", fixedFeet: 60, name: "Spirit Sense (Lantern of the Last Road)", finds: "disembodied spirits, incorporeal undead, haunts and active possession" } }, source: "Pillars of Faith, Chapter 11" },
      light: { source: "torch", radiusFeet: 30 }
    },
    sheet: "Spirit Sense 60 feet joins your senses; allies within 30 feet carry +2 status against possession and Soul effects as an aura; Use offers Open the Last Road (3 AP, 1/day, 10 minutes) or Close the Gate (2 AP, target the possessed creature). Resistance to essence and the 30-foot light are the table's." }),
  wondrous("TABLET OF THE FIRST TESTAMENT", { section: "relics",
    conditionals: [offered("Tablet of the First Testament", 4, "Religion and Linguistics checks concerning doctrine, sacred writing, prophecy or religious symbolism", { checkTypes: ["skill"], subjects: ["religion", "linguistics"] })],
    sheet: "+4 status is offered on Religion and Linguistics about doctrine, sacred writing, prophecy and symbolism. Reading any sacred or liturgical language is the card's words." })
];

/* ------------------------------------------------------------------ */
/* Charged items                                                        */
/* ------------------------------------------------------------------ */

function charged(heading, { kind, spells = [], extra = {}, conditionals = [], healingRider = null, sheet = "" }) {
  const entry = text("charged", heading);
  const name = titleCase(heading);
  const spellList = entry.spells ? entry.spells.split(",").map((s) => s.trim()).map((s) => { const m = /^(.+?) \((\d+)\)$/.exec(s); return m ? { name: m[1], pp: Number(m[2]) } : null; }).filter(Boolean) : spells;
  const lines = [
    `Usage ${entry.usage ?? "held in 1 hand"}${entry.weight && entry.weight !== "-" ? `; Weight ${entry.weight}` : ""}. Power Points ${entry.pp}; Recharge ${entry.recharge} per day.`,
    ...entry.lines,
    ...(spellList.length ? [`Spells: ${spellList.map((s) => `${s.name} (${s.pp} PP)`).join(", ")}.`] : []),
    sheet ? `On the sheet: ${sheet}` : ""
  ];
  return base(stableId(`charged:${name}`), name, "gear", kind === "rod" ? "icons/svg/wing.svg" : "icons/svg/oak.svg", {
    quantity: 1, weight: Number(String(entry.weight ?? "").replace(/[^0-9.]/g, "")) || 2, price: entry.price, equipped: false, invested: false,
    hp: { value: 0, max: 0 },
    traits: traitsOf(entry.traits),
    description: body({ lines }),
    slot: "", uses: entry.pp, itemSize: "medium", itemLevel: entry.level, heldHands: 1, formulae: "", spellbookContainer: false
  }, {
    chargedItem: { kind, maximumPP: entry.pp, flexible: false, recharge: entry.recharge, printedRecharge: entry.recharge, printedPowerPoints: entry.pp, correctedFromPrinted: false, spells: spellList, ...(kind === "staff" ? { weaponForm: { base: "Staff", quality: "standard", material: "", runes: "" } } : {}), ...extra },
    ...(conditionals.length ? { conditionals } : {}),
    ...(healingRider ? { healingRider } : {})
  });
}

export const CHARGED_ITEMS = [
  charged("ROD OF INTERCESSION", { kind: "rod", extra: { checkBonus: { checkTypes: ["spellcraft"], cost: 2, value: 2, type: "item", scope: "a Counteract check against possession, a Soul-trait effect or an effect binding, controlling or displacing a soul" } },
    sheet: "held, the rod offers +2 item for 2 PP on a Spellcraft check — take it on a Counteract against possession or a Soul effect. Its vibration near a possessed creature is a note." }),
  charged("ROD OF MERCIFUL CHANNELING", { kind: "rod", healingRider: { label: "Rod of Merciful Channeling", extraDice: "1d8", oneTarget: true, ppCost: 1 },
    sheet: "held, after a Healing spell restores HP the rod offers 1 PP for +1d8 to one creature it healed." }),
  charged("ROD OF SCHOLARLY RECALL", { kind: "rod", extra: { checkAdvantage: { actions: ["recallKnowledge", "identifyPower", "analyseScripture", "recogniseDoctrine", "traceReligiousProvenance"], cost: 2 } },
    sheet: "held, the rod offers Advantage for 2 PP on Recall Knowledge, Identify Power, Analyse Scripture, Recognise Doctrine and Trace Religious Provenance." }),
  charged("STAFF OF QUIET GRAVES", { kind: "staff", sheet: "a staff: its four spells are cast from the item's PP." }),
  charged("STAFF OF RETURNING MEMORY", { kind: "staff", conditionals: [offered("Staff of Returning Memory", 2, "Saving throws against magical effects that alter, suppress, erase or replace memory", { checkTypes: ["save"] }, "item")],
    sheet: "a staff: its three spells are cast from the item's PP; +2 item is offered on saves against memory effects while it is held." }),
  charged("STAFF OF SACRED CONCORDANCE", { kind: "staff", conditionals: [auto("Staff of Sacred Concordance", 1, "Analyse Scripture, Compare Testaments and Recognise Doctrine", { checkTypes: ["skill"], actions: ["analyseScripture", "compareTestaments", "recogniseDoctrine"] }, "item")],
    sheet: "a staff: its four spells are cast from the item's PP; +1 item is pre-ticked on Analyse Scripture, Compare Testaments and Recognise Doctrine while it is held." }),
  charged("STAFF OF SPIRIT ROADS", { kind: "staff", conditionals: [offered("Staff of Spirit Roads", 1, "Nature checks involving spirits, fungi or natural spiritual phenomena", { checkTypes: ["skill"], subjects: ["nature"] }, "item")],
    sheet: "a staff: its five spells are cast from the item's PP; +1 item is offered on Nature about spirits and fungi while it is held." }),
  charged("STAFF OF THE HOSPICE", { kind: "staff", sheet: "a staff: its four spells are cast from the item's PP." })
];

/* ------------------------------------------------------------------ */
/* Magical consumables                                                  */
/* ------------------------------------------------------------------ */

const grant = (label, value, scope, when, { auto: pre = true, oneShot = false, bonusType = "status" } = {}) => ({ kind: "modifier", value, bonusType, label, scope, when, auto: pre, oneShot });
const advantage = (label, scope, when, { auto: pre = true, oneShot = false } = {}) => ({ kind: "advantage", label, scope, when, auto: pre, oneShot });
const scoped = (label, ...grants) => ({ kind: "conditional", label, target: "self", grants });
const note = (textLine) => ({ kind: "note", text: textLine });
const relief = (label, condition, amount) => ({ kind: "conditionRelief", label, target: "self", condition, amount });

function magicConsumable(heading, { effect = null, usage = "", hands = 0, weightOverride = null, img = "icons/svg/item-bag.svg", extraConsumable = {} }) {
  const entry = text("consumables", heading);
  const name = titleCase(heading);
  const activate = entry.lines.find((l) => /^Activate /.test(l))?.replace(/^Activate /, "") ?? "Interact (2 AP)";
  const lines = [
    `Usage ${entry.usage ?? "held"}${entry.weight && entry.weight !== "-" ? `; Weight ${entry.weight}` : ""}. Activate ${activate}.`,
    ...entry.lines.filter((l) => !/^Activate /.test(l)),
    usage ? `On the sheet: ${usage}` : ""
  ];
  const consumableFlag = { kind: "other", costColumn: "consumable", hands, traitOmitsConsumable: false, ...extraConsumable };
  if (effect) consumableFlag.effect = { label: name, ...effect };
  return base(stableId(`magic-consumable:${name}`), name, "consumable", img, {
    quantity: 1, weight: weightOverride ?? (Number(String(entry.weight ?? "").replace(/[^0-9.]/g, "")) || 0), price: entry.price, equipped: false, invested: false,
    hp: { value: 0, max: 0 },
    traits: traitsOf(entry.traits),
    description: body({ lines }),
    uses: 1,
    activation: activate,
    itemLevel: entry.level
  }, { consumable: consumableFlag });
}

export const MAGIC_CONSUMABLES = [
  magicConsumable("ASHES OF FINAL PASSAGE", { effect: { effects: [note("Scattered over a corpse while speaking its name: for 24 hours, a magical effect that would possess the corpse, animate it as Undead or bind the soul to the remains must first Counteract the ashes at level 3. Resurrection, reincarnation and speaking with a willing dead creature are not prevented.")] },
    usage: "used, the card records the 24-hour ward; a Counteract against it is rolled from the card at level 3." }),
  magicConsumable("CANDLE OF THE QUIET VIGIL", { effect: { duration: "24 hours", effects: [scoped("Candle of the Quiet Vigil", grant("Candle of the Quiet Vigil", 2, "Saving throws against Fear, possession and harmful dream effects (after an hour's rest in its light, until your next Full Rest)", SAVE(["fear", "possession", "dream"]), { auto: true }), grant("Candle of the Quiet Vigil", 2, "Saving throws against Fear, possession and harmful dream effects — tick if this is one", { checkTypes: ["save"], not: { traits: ["fear", "possession", "dream"] } }, { auto: false })), note("Burns for 8 hours with dim light to 10 feet. One candle's benefit between Full Rests.")] },
    usage: "used by the creature that rested an hour in its light: the +2 status rides their saves (pre-ticked against Fear, possession and dream effects) until their next Full Rest — the effect is written for 24 hours; end it at the Full Rest." }),
  magicConsumable("CONSECRATED GRAVE SALT", { effect: { effects: [note("Scattered across a 10-foot line or around one 5-foot square, active for 10 minutes: a disembodied spirit or incorporeal Undead crossing it makes a Will save against DC " + "(the item's Level DC, level 6) — Critical: crosses; Success: crosses, Weakened 1 until the end of its next turn; Failure: cannot cross until the beginning of its next turn; Fumble: cannot voluntarily cross for 1 minute. Corporeal creatures cross freely; disturbing the salt ends it.")] },
    usage: "used, the card prints the ward and its ladder; the spirit's save is rolled from the card against the item's Level DC." }),
  magicConsumable("EMBALMER'S BLACK RESIN", { effect: { requiresTrait: "unliving", effects: [{ kind: "heal", target: "self", formula: "3d8" }, { kind: "conditionRelief", target: "self", label: "Embalmer's Black Resin", condition: "bleeding", amount: "1d4", targetItems: ["Unliving Skeleton", "Unliving Zombie", "Unliving Ghoul", "Unliving Mummy"] }] },
    usage: "applied to an Unliving creature (target it to apply it to another): 3d8 HP. Refused on a creature without the Unliving trait." }),
  magicConsumable("INCENSE OF THE OPEN VEIL", { effect: { duration: "10 minutes", effects: [note("Burning for 10 minutes in a 20-foot radius: disembodied spirits and incorporeal Undead within the smoke are faintly outlined and their location can be determined. Not identity or allegiance; Incorporeal stands; mundane attacks still cannot reach them.")] },
    usage: "used, the 10-minute effect and its card record the outline." }),
  magicConsumable("MEMORY SPORES", { effect: { duration: "10 minutes", effects: [scoped("Memory Spores", advantage("Memory Spores", "One Recall Knowledge check within 10 minutes (untrained: counts as 1 rank for that check)", { checkTypes: ["skill"], actions: ["recallKnowledge"] }, { auto: true, oneShot: true })), note("If you have no ranks in the skill, treat yourself as possessing 1 rank for that check only.")] },
    usage: "inhaled: Advantage is pre-ticked on your next Recall Knowledge within 10 minutes and spent by it." }),
  magicConsumable("OATH-WAX SEAL", { effect: { effects: [note("Applied to a closed object, letter or document: up to six designated creatures know for 1 week if the seal is broken; the breaker carries a faint glowing mark for 1 hour, visible through clothing. It prevents nothing and tells nothing more.")] },
    usage: "used, the card records the seal and its week." }),
  magicConsumable("PILGRIM'S WAYBREAD", { effect: { duration: "8 hours", effects: [scoped("Pilgrim's Waybread", grant("Pilgrim's Waybread", 2, "Checks and saving throws against Exhaustion from travel, forced marching, hunger, thirst or ordinary hardship (8 hours)", { checkTypes: ["save", "skill", "attribute", "flat"] }, { auto: false })), note("A full meal and a day's water. No benefit against magically inflicted Fatigue or Exhaustion unless it represents physical deprivation.")] },
    usage: "eaten: the +2 status is offered on checks and saves against exhaustion for 8 hours." }),
  magicConsumable("SOULGUARD TALISMAN", { usage: "worn (equipped): the moment you fail a save against possession, Soul Drain or a Soul effect you are offered the reroll; the talisman breaks whatever the second result.",
    extraConsumable: { saveReroll: { degrees: ["partial", "failure", "fumble", "blunder"], traits: ["possession", "soul drain", "soul"] } } }),
  magicConsumable("SPIRIT OFFERING TOKEN", { effect: { duration: "10 minutes", effects: [scoped("Spirit Offering Token", grant("Spirit Offering Token", 2, "Diplomacy checks to Make an Impression, Request or negotiate with the one spirit the token was offered to (10 minutes)", { checkTypes: ["skill"], subjects: ["diplomacy"] }, { auto: false })), note("A willing spirit normally unable to manifest may do so enough to communicate for the duration. The token summons nothing and compels nothing.")] },
    usage: "offered to a spirit within 30 feet: +2 status is offered on Diplomacy with that spirit for 10 minutes." }),
  magicConsumable("THREAD OF CONTINUITY", { effect: { duration: "24 hours", effects: [scoped("Thread of Continuity", advantage("Thread of Continuity", "The saving throw against the first magic that would erase, replace or suppress your memories or identity (24 hours)", { checkTypes: ["save"] }, { auto: false, oneShot: true })), note("An effect that allows no save must instead Counteract the thread (level 8) before affecting you. The thread burns away when it activates.")] },
    usage: "tied on by another: Advantage is offered on saves for 24 hours and spent by the first memory or identity effect; the Counteract clause is a note." }),
  magicConsumable("VIAL OF SANCTIFIED DEW", { hands: 1, effect: {
    choose: [
      { label: "Reduce Soul Drain by 5", effects: [relief("Vial of Sanctified Dew", "soulDrain", 5)] },
      { label: "Reduce Dazed by 1", effects: [relief("Vial of Sanctified Dew", "dazed", 1)] },
      { label: "Reduce Weakened by 1", effects: [relief("Vial of Sanctified Dew", "weakened", 1)] },
      { label: "+4 status to the next saving throw against possession (1 hour)", effects: [scoped("Vial of Sanctified Dew", grant("Vial of Sanctified Dew", 4, "The next saving throw against possession within 1 hour", SAVE(["possession"]), { auto: true, oneShot: true }))] }
    ],
    effects: [note("The same creature cannot benefit from another Vial of Sanctified Dew until after a Full Rest.")]
  }, usage: "drunk or administered (target an adjacent creature to feed it): choose one of the four effects at the Use; the Full Rest limit is a note." })
];

// The lantern's one Use offers both abilities; registered in module/magic-items.mjs.
