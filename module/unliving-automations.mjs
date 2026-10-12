/**
 * Use-driven automations for Chapter 9 (The Unliving), 0.9.0.
 *
 * Almost everything the Unliving feats do is a declaration TRG Prime 3.627.0
 * reads by itself (see tools/content/unliving.mjs). Drink Blood is the
 * system's own automation by name. What a player PRESSES is here:
 *
 *   Carrion Feast — "The ghoul consumes the flesh of an adjacent creature
 *     that has died within the last hour regaining 1d6 HP. The ghoul may only
 *     gain this benefit once from each body." Greater Carrion Feast: 3d6.
 *   Phylactery of Eternal Resurgence — an hour of rebuilding: Regeneration
 *     1/hour (2/hour with Eternal Resurgence), doubled by a successful siphon
 *     of the living within 30 feet, "the excess hits inflicting soul drain to
 *     the targets".
 */
import { SYSTEM_ID, helpers, spendAP } from "./automations.mjs";

const hasNamed = (actor, name) => Array.from(actor?.items ?? []).some((i) => String(i.name).trim().toLowerCase() === name.toLowerCase());
const level = (actor) => Math.max(1, Math.floor(Number(actor?.system?.identity?.level ?? 1) || 1));

/**
 * The flag the GHOUL carries: the uuids of every body it has fed on. Kept on
 * the eater, not the corpse, because the eater is always the user's own actor
 * and a corpse usually is not — a player cannot write to the GM's NPC.
 */
export const CARRION_FED_FLAG = "carrionFedOn";
const HOUR = 3600;

/**
 * When did this creature die, in world time — the Dead condition's own start —
 * or null when that is not recorded.
 */
function diedAt(actor) {
  const dead = Array.from(actor?.effects ?? []).find((e) => e.statuses?.has?.("dead"));
  const start = Number(dead?.duration?.startTime);
  return Number.isFinite(start) && start > 0 ? start : null;
}

/** Pure: may this ghoul feed on this body? @returns {string|null} why not */
export function carrionRefusal({ dead, feet, fedOn = [], body = "", died = null, now = 0 }) {
  if (!dead) return "the creature is not dead";
  if (Number.isFinite(feet) && feet > 5) return `it is ${feet} feet away — not adjacent`;
  if (fedOn.includes(body)) return "you have already fed on this body";
  if (died !== null && now - died > HOUR) return "it died more than an hour ago";
  return null;
}

async function carrionFeast(actor, item) {
  const { line, postCard, healActor } = helpers();
  const token = Array.from(game.user?.targets ?? [])[0];
  const body = token?.actor;
  if (!body) { ui.notifications.warn("Carrion Feast: target the corpse first."); return; }
  const own = canvas?.tokens?.placeables?.find((t) => t.actor === actor) ?? actor.getActiveTokens?.()[0] ?? null;
  const feet = own && canvas?.grid?.measurePath ? canvas.grid.measurePath([own.center, token.center]).distance : NaN;
  const died = diedAt(body);
  const now = Number(game.time?.worldTime ?? 0);
  const refusal = carrionRefusal({
    dead: Boolean(body.statuses?.has?.("dead")),
    feet,
    fedOn: actor.getFlag?.(SYSTEM_ID, CARRION_FED_FLAG) ?? [],
    body: body.uuid,
    died,
    now
  });
  if (refusal) { ui.notifications.warn(`Carrion Feast: ${refusal}.`); return; }
  if (died === null) {
    const { DialogV2 } = foundry.applications.api;
    const recent = await DialogV2.confirm({ window: { title: "Carrion Feast" }, content: `<p>Did <strong>${body.name}</strong> die within the last hour?</p>`, rejectClose: false });
    if (!recent) { ui.notifications.warn("Carrion Feast: the body must have died within the last hour."); return; }
  }
  if (!(await spendAP(actor, "Carrion Feast", 1))) return;
  const greater = hasNamed(actor, "Greater Carrion Feast");
  const formula = greater ? "3d6" : "1d6";
  const roll = await new Roll(formula).evaluate();
  const healed = await healActor(actor, roll.total, { magical: false });
  await actor.setFlag(SYSTEM_ID, CARRION_FED_FLAG, [...(actor.getFlag(SYSTEM_ID, CARRION_FED_FLAG) ?? []), body.uuid]);
  await postCard(actor, "Carrion Feast", [
    line(`${actor.name} feeds on <strong>${body.name}</strong>${greater ? " (Greater Carrion Feast)" : ""}: ${formula} = ${roll.total}, <strong>${Number(healed) || 0}</strong> HP regained.`),
    line("<em>This body cannot feed you again.</em>")
  ]);
}

/** Pure: an hour's rebuilding. */
export function phylacteryHour({ lichLevel = 1, eternalResurgence = false, siphoned = false } = {}) {
  const steps = (eternalResurgence ? 2 : 1) * (siphoned ? 2 : 1);
  return { steps, heal: steps * Math.max(1, Math.floor(Number(lichLevel) || 1)) };
}

async function phylactery(actor) {
  const { line, postCard, healActor, rollCheck, levelDC } = helpers();
  const lvl = level(actor);
  const eternal = hasNamed(actor, "Eternal Resurgence");
  const targets = Array.from(game.user?.targets ?? []).map((t) => t.actor).filter((a) => a && a !== actor);
  const dc = levelDC(lvl);
  const lines = [];
  const failed = [];
  for (const target of targets) {
    const check = await rollCheck({ actor: target, label: `${target.name} — Fortitude Save`, subtitle: `Phylactery siphon — ${actor.name}'s Level DC ${dc}`, type: "save", save: "fortitude", dc });
    const ok = Boolean(check?.outcome?.degree?.success);
    lines.push(line(`${target.name}: Fortitude <strong>${check?.outcome?.degree?.label ?? "?"}</strong>${ok ? " — resists the siphon." : " — siphoned."}`));
    if (!ok) failed.push(target);
  }
  const hour = phylacteryHour({ lichLevel: lvl, eternalResurgence: eternal, siphoned: failed.length > 0 });
  const healed = await healActor(actor, hour.heal, { magical: true });
  lines.unshift(line(`An hour of rebuilding: Regeneration ${hour.steps}/hour${eternal ? " (Eternal Resurgence)" : ""}${failed.length ? ", doubled by the siphon" : ""} — <strong>${Number(healed) || 0}</strong> HP (${hour.heal}: ${hour.steps} × level ${lvl}).`));
  if (failed.length) {
    // Through the GM relay when the lich's player does not own the creature (TRG Prime 3.627.0).
    const { applyConditionTagsTo, formatAppliedTags } = helpers();
    for (const target of failed) {
      const applied = await applyConditionTagsTo(target, [{ key: "soulDrain", label: "Soul Drain", value: lvl }], {});
      lines.push(line(`${target.name}: ${await formatAppliedTags(applied)} — the excess drawn from it.`));
    }
  }
  if (!targets.length) lines.push(line("<em>No living creatures targeted near the phylactery — no siphon this hour.</em>"));
  await postCard(actor, "Phylactery of Eternal Resurgence", lines);
}

export const UNLIVING_AUTOMATIONS = Object.freeze({
  "Carrion Feast": {
    hint: "1 AP: feed on an adjacent corpse that died within the hour — 1d6 HP (3d6 with Greater Carrion Feast), once per body.",
    use: carrionFeast
  },
  "Phylactery of Eternal Resurgence": {
    hint: "An hour of rebuilding: Regeneration 1/hour (2 with Eternal Resurgence), doubled if a targeted living creature within 30 ft fails its Fortitude save (it suffers Soul Drain).",
    use: phylactery
  }
});
