/**
 * LANTERN LIGHT (0.12.1): the Lantern of the Veil ("light in a 20-foot
 * radius") and the Lantern of the Last Road relic ("illuminates a 30-foot
 * radius") shed their light while held and invested.
 *
 * Found by the 0.12.0 follow-up sweep: both lights were "the table's".
 *
 * WHY AN ACTOR EFFECT. Core reads light sources off the actor's OWN effects
 * (light-sources.mjs `lightSourceKeysOn`) and off core gear by name; an
 * item's transferred effect is neither. So the lantern's light is an actor
 * effect carrying `flags.trg-prime.lightSource`, kept in step with the
 * item: created when the lantern is equipped and invested, removed when it
 * is not (or is deleted). Both items carry the Invested trait, and ruling 4
 * (16 Nov 2026) holds their benefits until Invest Item.
 *
 * MAGICAL: neither burns fuel ("No fuel burns within this lantern"), so
 * Supernatural Darkness does not simply negate them as it does a torch.
 */

const SYSTEM_ID = "trg-prime";
const MODULE_ID = "trg-pillars-of-faith";

/** Item name (normalised) → registered light key. */
export const ITEM_LIGHTS = Object.freeze({
  "lantern of the veil": "pof-lantern-of-the-veil",
  "lantern of the last road (relic)": "pof-lantern-of-the-last-road"
});

/** The light-source entries the module registers for them. */
export const ITEM_LIGHT_SOURCES = Object.freeze([
  { key: "pof-lantern-of-the-veil", label: "Lantern of the Veil", item: "Lantern of the Veil", radiusFeet: 20 },
  { key: "pof-lantern-of-the-last-road", label: "Lantern of the Last Road", item: "Lantern of the Last Road (Relic)", radiusFeet: 30 }
].map((s) => Object.freeze({ ...s, steps: 1, cap: 5, magical: true, dimFeet: s.radiusFeet, brightFeet: 0 })));

/** Is this item shedding its light now? Held (equipped) and invested. */
export function itemLightOn(item) {
  if (!item || !ITEM_LIGHTS[String(item.name ?? "").trim().toLowerCase()]) return false;
  return Boolean(item.system?.equipped) && Boolean(item.system?.invested);
}

/**
 * What to change on an actor: `create` is [{itemId, key}], `remove` is
 * effect ids. Pure, for the harness.
 */
export function itemLightPlan(items, effects) {
  const wanted = new Map();
  for (const item of items ?? []) {
    if (itemLightOn(item)) wanted.set(item.id, ITEM_LIGHTS[String(item.name).trim().toLowerCase()]);
  }
  const have = new Map();
  const remove = [];
  for (const effect of effects ?? []) {
    const itemId = effect?.flags?.[MODULE_ID]?.itemLight;
    if (!itemId) continue;
    if (wanted.has(itemId) && !have.has(itemId) && effect.flags?.[SYSTEM_ID]?.lightSource === wanted.get(itemId)) have.set(itemId, effect.id);
    else remove.push(effect.id);
  }
  const create = [...wanted].filter(([id]) => !have.has(id)).map(([itemId, key]) => ({ itemId, key }));
  return { create, remove };
}

async function syncItemLights(actor) {
  if (!actor || actor.documentName !== "Actor" || !actor.isOwner) return;
  const { create, remove } = itemLightPlan(actor.items, actor.effects);
  if (!create.length && !remove.length) return;
  if (remove.length) await actor.deleteEmbeddedDocuments("ActiveEffect", remove);
  if (create.length) {
    await actor.createEmbeddedDocuments("ActiveEffect", create.map(({ itemId, key }) => {
      const item = actor.items.get(itemId);
      const source = ITEM_LIGHT_SOURCES.find((s) => s.key === key);
      return {
        name: `${item?.name ?? source.label}: light (${source.radiusFeet} ft)`,
        img: item?.img ?? "icons/svg/light.svg",
        description: `The lantern sheds light in a ${source.radiusFeet}-foot radius while held and invested.`,
        flags: { [SYSTEM_ID]: { lightSource: key }, [MODULE_ID]: { itemLight: itemId } }
      };
    }));
    const refresh = game.trgPrime?.modules?.helpers?.refreshTokenLight;
    if (typeof refresh === "function") await refresh(actor).catch(() => 0);
  }
}

/** Keep each owned lantern's light in step with the item, on the client that changed it. */
export function registerItemLightHooks() {
  const onItem = (item, userId) => {
    if (userId !== game.user?.id) return;
    const actor = item?.parent;
    if (actor?.documentName !== "Actor") return;
    if (!ITEM_LIGHTS[String(item.name ?? "").trim().toLowerCase()]) return;
    syncItemLights(actor).catch((err) => console.warn("Pillars of Faith | lantern light", err));
  };
  Hooks.on("createItem", (item, _o, userId) => onItem(item, userId));
  Hooks.on("updateItem", (item, _c, _o, userId) => onItem(item, userId));
  Hooks.on("deleteItem", (item, _o, userId) => onItem(item, userId));
}
