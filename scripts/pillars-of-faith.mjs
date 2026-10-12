/**
 * Pillars of Faith — a companion module for TRG Prime (Foundry VTT).
 *
 * Everything this module adds to the game is DATA in its compendium
 * packs, each of which declares in module.json which system pack it
 * extends (`flags.trg-prime.extends`). TRG Prime 3.560.0+ federates
 * those packs into its own choosers and grants, so a Pillars race is
 * picked the way a core race is and a Pillars background grants its
 * feat the way a core one does.
 *
 * What is NOT data — the handful of Use-driven choices and reactions,
 * the three languages, the four traits, the racial Power Point rows —
 * is registered here through the system's module API, inside the hook
 * TRG Prime fires from its own `init`.
 */
import { registerContent } from "../module/registration.mjs";
import { removePastLifeLores, offerBattleRemembered, PAST_LIFE_LORE_FLAG } from "../module/automations.mjs";
import { answerInterpretHaunt } from "../module/haunt-automations.mjs";
import { campaignSettings, redrawActorSheets } from "../module/campaign-options.mjs";
import { onActionAttempt, onActionResolved, onCheckResolved, onOverheal, onSpellRiderLanded, registerPassSocket } from "../module/pass-automations.mjs";

const MODULE_ID = "trg-pillars-of-faith";
const MODULE_SYSTEM = "trg-prime";
const REQUIRED_SYSTEM = "3.630.1";

// Campaign options (0.11.0): the Undead Lords bonus Archetype feat, a
// checkbox in Configure Settings.
Hooks.once("init", () => {
  for (const [key, spec] of Object.entries(campaignSettings(() => redrawActorSheets()))) game.settings.register(MODULE_ID, key, spec);
});

Hooks.on("trgPrime.registerContent", (api) => {
  registerContent(api, MODULE_ID);
});

// Lost Scholarship (Chapter 5): the temporary Lore leaves with the echo.
Hooks.on("deleteActiveEffect", (effect) => {
  const actor = effect?.parent;
  if (!actor?.isOwner || actor.documentName !== "Actor") return;
  if (!effect.getFlag?.(MODULE_SYSTEM, PAST_LIFE_LORE_FLAG)) return;
  removePastLifeLores(actor).catch((err) => console.error("Pillars of Faith | Past-Life Echo lore cleanup failed", err));
});

// BATTLE REMEMBERED (TRG Prime 3.625.0's initiative hook): the owner of
// the rolled combatant is offered a free Past-Life Echo. Only the client
// that rolled sees the prompt — the hook fires where the roll was made.
Hooks.on("trgPrimeInitiativeRolled", ({ actor }) => { offerBattleRemembered(actor).catch((err) => console.warn("Pillars of Faith | Battle Remembered", err)); });

// INTERPRET HAUNT (Chapter 8, 0.10.0): TRG Prime 3.629.0 announces a resolved
// action; on a Success against a haunt the GM is whispered its Trigger, on a
// Critical its Anchor and Resolution too. The rolling client posts it.
Hooks.on("trgPrimeActionResolved", (ctx) => { answerInterpretHaunt(ctx).catch((err) => console.warn("Pillars of Faith | Interpret Haunt", err)); });

// THE AUTOMATION PASS (0.11.0, TRG Prime 3.630.0): Conceal Faith's DC and the
// Last Rites on the remains; Soul Mirror and Memory of Lost Masters after a
// check; Grace beyond Need when a heal overflows; Elemental Overflow when the
// Mantle's rider lands. A botched rite refuses the next attempt (sync).
Hooks.on("trgPrimeActionResolved", (ctx) => { onActionResolved(ctx).catch((err) => console.warn("Pillars of Faith | action", err)); });
Hooks.on("trgPrimeActionAttempt", (ctx) => onActionAttempt(ctx));
Hooks.on("trgPrimeCheckResolved", (ctx) => { onCheckResolved(ctx).catch((err) => console.warn("Pillars of Faith | check", err)); });
Hooks.on("trgPrimeOverheal", (ctx) => { onOverheal(ctx).catch((err) => console.warn("Pillars of Faith | Grace beyond Need", err)); });
Hooks.on("trgPrimeSpellRiderLanded", (ctx) => onSpellRiderLanded(ctx));

Hooks.once("ready", () => {
  const system = game.system?.version ?? "0";
  if (game.system?.id !== "trg-prime") {
    ui.notifications?.error("Pillars of Faith requires the TRG Prime system.");
    return;
  }
  if (!game.trgPrime?.modules) {
    ui.notifications?.error(`Pillars of Faith needs TRG Prime ${REQUIRED_SYSTEM} or later — this world is on ${system}, which has no companion-module API. The module's content will not be reachable from the sheet.`);
    return;
  }
  registerPassSocket();
  console.info(`Pillars of Faith | ${game.modules.get(MODULE_ID)?.version ?? "?"} ready on TRG Prime ${system}`);
});
