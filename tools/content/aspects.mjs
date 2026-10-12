/**
 * Chapter 7 — the twenty-two Divine Aspects, in the exact shape the core
 * divine-aspects pack keeps its ten (Appendix 4). Text from
 * aspect-text.json, extracted from the book.
 *
 * The system does everything with these that it does with a core aspect:
 * the class skill and favoured weapon derive, `bonusSpells` is a
 * levelled grant, `specialistSpells` is the list the aspect's Use
 * chooser offers (PP 1 only for a class whose line says "PP 1 Specialist
 * Spell" — the Grimward's does), the Crusader's alignment feat follows
 * the traits, and the suggested ethics are the flag the card reads.
 *
 * BONUS SPELL LEVELS. The core pack's brackets are the CHARACTER LEVEL
 * at which each spell arrives (Graham, 3.209.0). The book prints
 * "Guidance (0)" for a cantrip's slot; a level-0 arrival is read as 1st.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stableId, SYSTEM_ID } from "./builders.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ASPECT_TEXT = JSON.parse(fs.readFileSync(path.join(HERE, "aspect-text.json"), "utf8"));

const STATS = { coreVersion: "14", systemId: SYSTEM_ID, systemVersion: "3.571.0", createdTime: 1789000000000, modifiedTime: 1789000000000, lastModifiedBy: null, compendiumSource: null, duplicateSource: null };

const titleCase = (s) => s.split(" ").map((w) => (w === "THE" ? "The" : w[0] + w.slice(1).toLowerCase())).join(" ");
const traitsOf = (line) => line.split(/\s+/).filter(Boolean).map((t) => t[0] + t.slice(1).toLowerCase()).join(", ");

/** "Banish Fatigue (1), Guiding Stone (1), ... Unity (7)" → the names, in print order. */
export function specialistNames(printed) {
  return printed.split(",").map((s) => s.replace(/\s*\(\d+\)\s*$/, "").trim()).filter(Boolean);
}
/** "Guidance (0); Dead Tongue (2); Speak with Dead (6); Death Ward (10)" → "1: Guidance, 2: Dead Tongue, ..." */
export function bonusSpellList(printed) {
  return printed.split(";").map((s) => s.trim()).filter(Boolean).map((s) => {
    const m = s.match(/^(.*?)\s*\((\d+)\)$/);
    if (!m) throw new Error(`bonus spell without a level: "${s}"`);
    return `${Math.max(1, Number(m[2]))}: ${m[1].trim()}`;
  }).join(", ");
}

export function divineAspect(heading, entry) {
  const name = titleCase(heading);
  const ethics = entry["Suggested Ethics"].split(",").map((s) => s.trim()).filter(Boolean);
  const description = [
    ...entry.description,
    "",
    `Edicts: ${entry.Edicts}`,
    "",
    `Anathema: ${entry.Anathema}`,
    "",
    `Suggested Ethics: ${entry["Suggested Ethics"]}`,
    "",
    `Class Skill: ${entry["Class Skill"]}`,
    "",
    `Specialist Spells: ${entry["Specialist Spells"]}`,
    "",
    `Bonus Spells: ${entry["Bonus Spells"]}`,
    "",
    `Favoured Weapon: ${entry["Favoured Weapon"]}`,
    "",
    "Pillars of Faith, Chapter 7. Add it from the sheet's Divine Aspect slot: the class skill and favoured weapon apply, the bonus spells arrive at their levels, and Use chooses the specialist spell (PP 1 for a Grimward or Cleric)."
  ].join("\n");
  return {
    _id: stableId(`divine-aspects:${name}`),
    name,
    img: "icons/svg/holy-symbol.svg",
    type: "divine-aspect",
    system: {
      source: "Pillars of Faith, Chapter 7",
      category: "",
      tier: "",
      level: 0,
      prerequisites: "",
      active: true,
      description,
      traits: traitsOf(entry.traits),
      edicts: entry.Edicts,
      anathema: entry.Anathema,
      suggestedEthics: ethics.join(", "),
      classSkill: entry["Class Skill"],
      favouredWeapon: entry["Favoured Weapon"],
      specialistSpells: specialistNames(entry["Specialist Spells"]).join(", "),
      bonusSpells: bonusSpellList(entry["Bonus Spells"])
    },
    effects: [],
    folder: null,
    sort: 0,
    ownership: { default: 0 },
    flags: { [SYSTEM_ID]: { suggestedEthics: ethics, bookChapter: 7 } },
    _stats: { ...STATS }
  };
}

export const DIVINE_ASPECTS = Object.entries(ASPECT_TEXT).map(([heading, entry]) => divineAspect(heading, entry));
