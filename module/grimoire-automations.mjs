/**
 * Chapter 10 — what a Grimoire spell needs pressing.
 *
 * The spells themselves are data (the cast workflow runs them). What is
 * here is the CHOOSING: the Folkwarden's and Shaman's "one PP 1
 * Specialist Spell of your choice" at 1st level, Old Secret's borrowed
 * spell for the day and Hedge Witch's extra one — each a pick from the
 * federated spells pack filtered by specialist class and cost, landing
 * on the sheet stamped with its source so it leaves with it, replacing
 * the previous pick on a second Use (the way every system chooser does).
 */
import { SYSTEM_ID, helpers } from "./automations.mjs";

const level = (actor) => Math.max(1, Number(actor.system?.identity?.level ?? 1) || 1);
const casterLevel = (actor) => Math.max(0, Number(actor.system?.magic?.casterLevelValue ?? actor.system?.magic?.casterLevel ?? level(actor)) || 0);

/**
 * Choose one specialist spell of a class from the federated spells pack.
 *
 * @param {object} opts
 * @param {string} opts.title card and dialog title
 * @param {string} opts.specialistClass "Folkwarden" | "Shaman" | ...
 * @param {number|null} opts.ppCost exact cost, or null for any the caster can cast
 * @param {string} opts.prompt
 * @param {string} opts.grantNote appended to the card
 * @param {boolean} [opts.excludeKnown] leave out spells already on the sheet
 */
function specialistChooser({ title, specialistClass, ppCost, prompt, grantNote, excludeKnown = true }) {
  return async (actor, item) => {
    const { line, postCard, chooseFromList } = helpers();
    const pack = game.trgPrime.modules.contentPack("spells");
    const index = await pack.getIndex({ fields: ["system.ppCost", "system.specialist", "system.specialistClass"] });
    const known = new Set(Array.from(actor.items ?? []).filter((s) => s.type === "spell" && s.flags?.[SYSTEM_ID]?.grantedBy?.sourceId !== item.id).map((s) => String(s.name).toLowerCase()));
    // "capable of casting": within the caster's level in PP is the
    // repertoire rule of thumb the system's own choosers use.
    const cap = ppCost ?? Math.max(1, casterLevel(actor));
    const eligible = Array.from(index.values())
      .filter((e) => e.system?.specialist && String(e.system?.specialistClass ?? "").toLowerCase() === specialistClass.toLowerCase())
      .filter((e) => (ppCost != null ? Number(e.system?.ppCost) === ppCost : Number(e.system?.ppCost) <= cap))
      .filter((e) => !excludeKnown || !known.has(String(e.name).toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
    if (!eligible.length) {
      ui.notifications.warn(`${title}: no ${specialistClass} specialist spell${ppCost != null ? ` at PP ${ppCost}` : ""} is in the spells compendium (Pillars of Faith 0.5.0 adds them).`);
      return false;
    }
    const held = Array.from(actor.items ?? []).filter((s) => s.type === "spell" && s.flags?.[SYSTEM_ID]?.grantedBy?.sourceId === item.id);
    const picked = await chooseFromList(title, held.length ? `${prompt} (currently ${held.map((s) => s.name).join(", ")})` : prompt, eligible.map((e) => [e._id, `${e.name} (PP ${e.system?.ppCost ?? 0})`]));
    if (!picked) return false;
    if (held.length) await actor.deleteEmbeddedDocuments("Item", held.map((s) => s.id));
    const data = (await pack.getDocument(picked)).toObject();
    delete data._id;
    foundry.utils.setProperty(data, `flags.${SYSTEM_ID}.grantedBy`, { sourceId: item.id, sourceName: item.name, requested: data.name });
    await actor.createEmbeddedDocuments("Item", [data]);
    await postCard(actor, title, [line(`<strong>${data.name}</strong> is on your spells table${held.length ? ` (${held.map((s) => s.name).join(", ")} replaced)` : ""}. ${grantNote}`)]);
    return true;
  };
}

const folkwardenSpecialist = {
  hint: "Use to choose your PP 1 Folkwarden Specialist Spell; Use again to change it.",
  use: specialistChooser({ title: "Folkwarden Specialist Spell", specialistClass: "Folkwarden", ppCost: 1, prompt: "Your PP 1 Folkwarden Specialist Spell", grantNote: "Your 1st-level Folkwarden Specialist Spell — Use again to change it." })
};
const shamanSpecialist = {
  hint: "Use to choose your PP 1 Shaman Specialist Spell; Use again to change it.",
  use: specialistChooser({ title: "Shaman Specialist Spell", specialistClass: "Shaman", ppCost: 1, prompt: "Your PP 1 Shaman Specialist Spell", grantNote: "Your 1st-level Shaman Specialist Spell — Use again to change it." })
};
const oldSecret = {
  hint: "Daily preparation: borrow one Folkwarden Specialist Spell you do not know until your next preparation.",
  use: specialistChooser({ title: "Old Secret", specialistClass: "Folkwarden", ppCost: null, prompt: "Folkwarden Specialist Spell borrowed for the day (one you do not know, within your casting)", grantNote: "In your repertoire until your next daily preparation; it teaches nothing and meets no prerequisite." })
};
const hedgeWitch = {
  hint: "Use to choose your additional Folkwarden Specialist Spell; the +1 class to Spellcraft on Folkwarden spells is offered automatically.",
  use: specialistChooser({ title: "Hedge Witch", specialistClass: "Folkwarden", ppCost: null, prompt: "Your additional Folkwarden Specialist Spell", grantNote: "Hedge Witch's additional Folkwarden Specialist Spell." })
};

export const GRIMOIRE_AUTOMATIONS = Object.freeze({
  "folkwarden specialist spell": folkwardenSpecialist,
  "shaman specialist spell": shamanSpecialist,
  "old secret": oldSecret,
  "hedge witch": hedgeWitch
});

/** The card-only hints this block adds (nothing to press). */
export const GRIMOIRE_PASSIVE_HINTS = Object.freeze({});
