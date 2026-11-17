/**
 * SECOND DISCIPLINE (0.12.1, automation audit follow-up).
 *
 * "You gain that discipline's Specialist Skill, 1st-level Specialist Spell
 * and Discipline Ability. You do not gain its 7th-level Advanced Specialist
 * Spell." The feat's chooser creates the discipline ability through the
 * system's abilityChoices path, and the discipline's own `grantedSpells`
 * ("1: Doctrinal Ward, 7: Word of Censure") then granted the advanced spell
 * too — at 9th level, at once. The sheet asked the player to delete it.
 *
 * Here, before the ability is created: a discipline granted by Second
 * Discipline keeps only its level-1 spell lines. Its skill and ability are
 * untouched, and the primary discipline is not affected.
 *
 * Pure, so the harness can drive it.
 */
const SYSTEM_ID = "trg-prime";

/** "1: A, 7: B" → "1: A" (an unlevelled entry counts as 1st). */
export function firstLevelSpellsOnly(grantedSpells) {
  return String(grantedSpells ?? "").split(",").map((s) => s.trim()).filter(Boolean)
    .filter((entry) => { const m = entry.match(/^(\d+)\s*:/); return !m || Number(m[1]) <= 1; })
    .join(", ");
}

/** The source update for a discipline arriving through Second Discipline, or null. */
export function secondDisciplineUpdate(data) {
  if (data?.type !== "ability") return null;
  const by = data.flags?.[SYSTEM_ID]?.grantedBy;
  if (String(by?.sourceName ?? "").trim().toLowerCase() !== "second discipline") return null;
  const before = String(data.system?.grantedSpells ?? "");
  const after = firstLevelSpellsOnly(before);
  return after === before.trim() ? null : { "system.grantedSpells": after };
}
