/**
 * AN ITEM'S EFFECT THAT HOLDS ONLY WHILE THE ITEM IS WORN (0.12.0, automation
 * audit).
 *
 * The Plate of the Sealed Sepulchre carries "Resistance to essence damage
 * from Soul Warding, while the plate is worn" as a transferred Active Effect
 * flagged `flags.trg-prime.worn`. Nothing read the flag: Foundry transfers an
 * item's effects whether or not it is equipped, and TRG Prime's own
 * suppression asks only whether the item is broken. Found live on the 0.12.0
 * equipment pass — the resistance stayed on a character carrying the plate in
 * a pack. No core equipment carries a transferred effect, which is why the
 * system never needed the gate.
 *
 * Registered through `registerEffectSuppressor` (TRG Prime 3.678.0): asked,
 * never written, so the resistance is back the moment the plate is equipped
 * again, and only effects that opt in with the flag are touched.
 *
 * Pure, so the harness can drive it.
 */
const SYSTEM_ID = "trg-prime";
const EQUIPMENT = new Set(["armour", "shield", "weapon", "gear"]);

/** Does this item carry the Invested trait? */
export function hasInvestedTrait(item) {
  return String(item?.system?.traits ?? "").toLowerCase().split(/[,;]/).map((t) => t.trim()).includes("invested");
}

/*
 * …AND INVESTED, WHEN THE ITEM SAYS SO (0.12.1; Graham's ruling, 16 Nov
 * 2026, U4: an item with the Invested trait gives nothing until it is
 * invested). Any transferred effect on a Pillars of Faith item with the
 * Invested trait is switched off while the item is not invested, whether or
 * not it is flagged `worn`. The item's declared conditionals are the core's
 * to gate (PILLARS_OF_FAITH_CORE_DEPENDENCIES.md, CD10, with a patch).
 */
export function wornEffectSuppressed(effect) {
  const item = effect?.parent;
  if (item?.documentName !== "Item" || !EQUIPMENT.has(String(item.type ?? ""))) return false;
  if (hasInvestedTrait(item) && !item.system?.invested) return true;
  if (effect?.flags?.[SYSTEM_ID]?.worn !== true) return false;
  return !item.system?.equipped;
}
