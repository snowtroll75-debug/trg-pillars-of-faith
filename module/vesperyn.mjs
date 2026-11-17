/**
 * VESPERYN'S SIGHT (0.12.0, automation audit).
 *
 * "You gain Nightvision. If your race already grants Nightvision, you instead
 * gain Darkvision." The feat grants Nightvision through its
 * `grantedAbilities`; when the character already holds Nightvision from
 * elsewhere (an Eshari, say), the core's grant correctly refuses a second
 * copy, and until now the card asked the player to swap it by hand.
 *
 * Here: once the feat's own grants have settled, a character holding
 * Nightvision that this feat did not give them, and no Darkvision, receives
 * Darkvision from the system's abilities pack — stamped as granted by the
 * feat, so it leaves when the feat does (the core's grant cleanup).
 *
 * `decideVesperynSight` is pure, so the harness can drive it.
 */
import { SYSTEM_ID } from "./automations.mjs";

const lower = (v) => String(v ?? "").trim().toLowerCase();

/** "darkvision" when the swap is owed, otherwise null. */
export function decideVesperynSight(items, featId) {
  const list = Array.from(items ?? []);
  const has = (name) => list.some((i) => i?.type === "ability" && lower(i.name) === name);
  if (has("darkvision") || has("perfect darkvision")) return null;
  const otherNightvision = list.some((i) => i?.type === "ability" && lower(i.name) === "nightvision"
    && i.flags?.[SYSTEM_ID]?.grantedBy?.sourceId !== featId);
  return otherNightvision ? "darkvision" : null;
}

export async function grantVesperynSight(actor, feat) {
  if (!actor?.isOwner || lower(feat?.name) !== "vesperyn") return false;
  if (decideVesperynSight(actor.items, feat.id) !== "darkvision") return false;
  const pack = globalThis.game?.trgPrime?.modules?.contentPack?.("abilities");
  const index = await pack?.getIndex?.();
  const entry = Array.from(index?.values?.() ?? []).find((e) => lower(e.name) === "darkvision");
  if (!entry) return false;
  const data = (await pack.getDocument(entry._id)).toObject();
  delete data._id;
  foundry.utils.setProperty(data, `flags.${SYSTEM_ID}.grantedBy`, { sourceId: feat.id, sourceName: feat.name, requested: "Darkvision" });
  await actor.createEmbeddedDocuments("Item", [data]);
  const { line, postCard } = globalThis.game.trgPrime.modules.helpers;
  await postCard(actor, "Vesperyn", [line("Your race already sees in the dark, so the grave's hunger sharpens it: <strong>Darkvision</strong> instead of Nightvision.")]);
  return true;
}
