/**
 * Campaign options Pillars of Faith offers as world settings (0.11.0).
 *
 * UNDEAD LORDS (Chapter 9): "In the Undead Lords campaign, each player
 * character gains one bonus Archetype feat at 2nd level. This bonus feat
 * may be used to select a regular Archetype feat or an eligible Unliving
 * Archetype feat, provided the character meets the selected feat's
 * prerequisites."
 *
 * A checkbox in Configure Settings. When ticked, every player character of
 * 2nd level or higher gets one Archetype-only pick in the feat banner
 * (TRG Prime 3.630.0 `registerFeatPickBonus`); the first Archetype feat
 * they hold spends it rather than a Class pick. Prerequisites are the
 * feat's own, checked as for any other Archetype feat.
 *
 * Pure apart from `undeadLordsEnabled`, so the harness can drive it.
 */
export const UNDEAD_LORDS_SETTING = "undeadLordsCampaign";
export const UNDEAD_LORDS_LABEL = "Undead Lords — one bonus Archetype feat at 2nd level";

/** The extra pick this actor gets, or null. */
export function undeadLordsPicks(actor, enabled) {
  if (!enabled) return null;
  if (actor?.type !== "character") return null;
  const level = Number(actor?.system?.identity?.level) || 0;
  if (level < 2) return null;
  return { label: UNDEAD_LORDS_LABEL, archetype: 1 };
}

/** Whether the world has the option ticked. False before the setting exists. */
export function undeadLordsEnabled(moduleId, settings = globalThis.game?.settings) {
  try {
    return settings?.get?.(moduleId, UNDEAD_LORDS_SETTING) === true;
  } catch {
    return false;
  }
}

/** The settings this module registers, in game.settings.register shape. */
export function campaignSettings(onChange = () => {}) {
  return {
    [UNDEAD_LORDS_SETTING]: {
      name: "Undead Lords campaign",
      hint: "Each player character gains one bonus Archetype feat at 2nd level — a regular Archetype feat or an eligible Unliving Archetype feat, if they meet its prerequisites (Chapter 9). Shown as a Bonus Archetype pick in the sheet's feat banner.",
      scope: "world",
      config: true,
      type: Boolean,
      default: false,
      onChange
    }
  };
}

/** Redraw every open actor sheet, so the banner follows the checkbox. */
export function redrawActorSheets(actors = globalThis.game?.actors) {
  for (const actor of Array.from(actors ?? [])) {
    if (actor?.sheet?.rendered) actor.sheet.render(false);
  }
}
