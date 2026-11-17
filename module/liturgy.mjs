/**
 * PRAYER BOOKS (0.12.1): Sacred Marginalia's four free Prayer Book spells,
 * the Liturgist's Liturgical Book, its daily selection and Liturgy of
 * Prayer.
 *
 * Found by the 0.12.0 follow-up sweep: all three were "for the table".
 *
 * SACRED MARGINALIA — "immediately add four Divinity spells that you are
 * capable of casting to your Prayer Book." The Archivist's Prayer Book is
 * the core book-style spellbook, so each pick is created exactly as core's
 * Learn a Spell creates one: `spellBookPick` (it lives in the book and is
 * memorised like any book spell) plus `learnedExtra` (it does not use up a
 * level's free ladder picks), granted by the feat so it leaves with it.
 *
 * THE LITURGICAL BOOK — a non-Archivist's book. Its spells are RECORDED on
 * the gear item (`flags.trg-pillars-of-faith.recorded`), not created as
 * spell items: a Cleric owns no book in core, and a spell item on the sheet
 * would read as a memorised or repertoire spell it is not. Only the day's
 * selection and Liturgy of Prayer's pick become spell items, created as
 * GRANTED spells (core's spell-availability: castable, counted against
 * neither the memorised total nor the repertoire — "does not count against
 * your normal number of memorised spells"; "temporarily add that spell to
 * your repertoire"). Both are swept at the next daily preparation; Liturgy
 * of Prayer's pick is also swept at the end of the caster's turn ("If the
 * spell is not cast before the end of your turn, the ability is wasted").
 *
 * Pure functions are exported for the harness.
 */

export const MODULE_ID = "trg-pillars-of-faith";
const SYSTEM_ID = "trg-prime";

/** The flags a Liturgical Book spell item carries. */
export const LITURGY_DAILY = "liturgyDaily";
export const LITURGY_MOMENT = "liturgyMoment";

/** "you are capable of casting": PP 1 to caster level + 1 (core maxPPPerCast). */
export function divinityPickEligible(entry, casterLevel) {
  const sys = entry?.system ?? {};
  const pp = Number(sys.ppCost ?? -1);
  if (!Number.isFinite(pp) || pp < 1) return false;
  if (pp > Math.max(0, Math.floor(Number(casterLevel) || 0)) + 1) return false;
  if (sys.specialist) return false;
  return String(sys.tradition ?? "").toLowerCase().split(/[,;/]/).map((t) => t.trim()).includes("divinity");
}

/** The spells recorded in a Liturgical Book: [{id, name, pp}]. */
export function recordedSpells(book) {
  const list = book?.flags?.[MODULE_ID]?.recorded;
  return Array.isArray(list) ? list.filter((e) => e && e.id && e.name) : [];
}

/** How many of the four free records the feat still owes. */
export function freeRecordsLeft(book) {
  return Math.max(0, 4 - recordedSpells(book).filter((e) => e.via !== "learned").length);
}

/** The data for a spell item going into an Archivist's Prayer Book. */
export function marginaliaSpellData(data, feat) {
  return {
    ...data,
    system: { ...data?.system, prepared: false },
    flags: {
      ...data?.flags,
      [SYSTEM_ID]: {
        ...data?.flags?.[SYSTEM_ID],
        spellBookPick: true,
        learnedExtra: true,
        grantedBy: { sourceId: feat?.id ?? null, sourceName: feat?.name ?? "Sacred Marginalia", requested: data?.name ?? "" }
      }
    }
  };
}

/** The data for a Liturgical Book spell made castable (the day's selection or Liturgy of Prayer). */
export function liturgySpellData(data, feat, kind) {
  return {
    ...data,
    system: { ...data?.system, prepared: true },
    flags: {
      ...data?.flags,
      [SYSTEM_ID]: {
        ...data?.flags?.[SYSTEM_ID],
        grantedBy: { sourceId: feat?.id ?? null, sourceName: feat?.name ?? "", requested: data?.name ?? "" }
      },
      [MODULE_ID]: { ...data?.flags?.[MODULE_ID], [kind]: true }
    }
  };
}

/** The spell items the sweep at a daily preparation (or turn end) removes. */
export function liturgySweep(items, kinds = [LITURGY_DAILY, LITURGY_MOMENT]) {
  return Array.from(items ?? []).filter((i) => i?.type === "spell" && kinds.some((k) => i.flags?.[MODULE_ID]?.[k]));
}

/* ------------------------------------------------------------------ */
/* Foundry side                                                         */
/* ------------------------------------------------------------------ */

const api = () => game.trgPrime.modules;
const casterLevel = (actor) => {
  const m = actor?.system?.magic ?? {};
  return Math.max(0, Math.floor(Number(m.casterLevelValue ?? m.casterLevel ?? actor?.system?.identity?.level ?? 0) || 0));
};
const ownedSpellNames = (actor) => new Set(Array.from(actor.items ?? []).filter((s) => s.type === "spell").map((s) => String(s.name).trim().toLowerCase()));

async function eligibleDivinity(actor, exclude) {
  const pack = api().contentPack("spells");
  const index = await pack?.getIndex?.({ fields: ["system.ppCost", "system.tradition", "system.specialist"] });
  const cl = casterLevel(actor);
  return {
    pack,
    entries: Array.from(index?.values?.() ?? [])
      .filter((e) => divinityPickEligible(e, cl) && !exclude.has(String(e.name).trim().toLowerCase()))
      .sort((a, b) => (Number(a.system?.ppCost) - Number(b.system?.ppCost)) || a.name.localeCompare(b.name))
  };
}
const label = (e) => `${e.name} (PP ${e.system?.ppCost ?? e.pp ?? 0})`;

/** Sacred Marginalia's Use: add the four Divinity spells it owes to the Prayer Book. */
export async function useSacredMarginalia(actor, feat) {
  const { line, postCard, chooseFromList } = api().helpers;
  const owed = 4 - Array.from(actor.items ?? []).filter((s) => s.type === "spell" && s.flags?.[SYSTEM_ID]?.grantedBy?.sourceId === feat.id).length;
  if (owed <= 0) { ui.notifications.info("Sacred Marginalia: your four extra Prayer Book spells are already in your book."); return; }
  const added = [];
  for (let n = 0; n < owed; n++) {
    const { pack, entries } = await eligibleDivinity(actor, ownedSpellNames(actor));
    if (!entries.length) { ui.notifications.warn("Sacred Marginalia: no further Divinity spell you can cast is in the spells compendium."); break; }
    const picked = await chooseFromList("Sacred Marginalia", `Prayer Book spell ${4 - owed + n + 1} of 4 (a Divinity spell you can cast)`, entries.map((e) => [e._id, label(e)]));
    if (!picked) break;
    const data = (await pack.getDocument(picked)).toObject(); delete data._id;
    await actor.createEmbeddedDocuments("Item", [marginaliaSpellData(data, feat)]);
    added.push(data.name);
  }
  if (added.length) await postCard(actor, "Sacred Marginalia", [line(`Added to your Prayer Book: <strong>${added.join(", ")}</strong>. They do not use up your levels' free picks, and leave with the feat.`)]);
}

function liturgicalBook(actor) {
  return Array.from(actor.items ?? []).find((i) => i.type === "gear" && i.name === "Liturgical Book") ?? null;
}

async function recordSpell(actor, book, via) {
  const { chooseFromList } = api().helpers;
  const exclude = new Set(recordedSpells(book).map((e) => String(e.name).trim().toLowerCase()));
  const { entries } = await eligibleDivinity(actor, exclude);
  if (!entries.length) { ui.notifications.warn("Liturgical Book: no further Divinity spell you can cast is in the spells compendium."); return null; }
  const picked = await chooseFromList("Liturgical Book", via === "learned" ? "Spell learned from a written source (after a successful Learn a Spell)" : "Divinity spell you can cast, to record", entries.map((e) => [e._id, label(e)]));
  const entry = entries.find((e) => e._id === picked);
  if (!entry) return null;
  await book.setFlag(MODULE_ID, "recorded", [...recordedSpells(book), { id: entry._id, name: entry.name, pp: Number(entry.system?.ppCost ?? 0), via }]);
  return entry.name;
}

async function makeCastable(actor, feat, record, kind) {
  const pack = api().contentPack("spells");
  const doc = await pack?.getDocument?.(record.id);
  if (!doc) { ui.notifications.warn(`Liturgical Book: ${record.name} is no longer in the spells compendium.`); return null; }
  const data = doc.toObject(); delete data._id;
  const [created] = await actor.createEmbeddedDocuments("Item", [liturgySpellData(data, feat, kind)]);
  return created ?? null;
}

/** The Liturgist feat's Use: the book, its four records, further records, and the day's selection. */
export async function useLiturgist(actor, feat) {
  const { line, postCard, chooseFromList } = api().helpers;
  let book = liturgicalBook(actor);
  if (!book) {
    const pack = api().contentPack("gear");
    const idx = await pack.getIndex();
    const entry = Array.from(idx.values()).find((e) => e.name === "Liturgical Book");
    const data = (await pack.getDocument(entry._id)).toObject(); delete data._id;
    foundry.utils.setProperty(data, `flags.${SYSTEM_ID}.grantedBy`, { sourceId: feat.id, sourceName: feat.name, requested: "Liturgical Book" });
    [book] = await actor.createEmbeddedDocuments("Item", [data]);
  }
  // The four the feat owes come first, one after another.
  const recordedNow = [];
  while (freeRecordsLeft(book) > 0) {
    const name = await recordSpell(actor, book, "free");
    if (!name) break;
    recordedNow.push(name);
    book = actor.items.get(book.id);
  }
  if (recordedNow.length) {
    await postCard(actor, "Liturgist", [line(`Recorded in your <strong>Liturgical Book</strong>: ${recordedNow.join(", ")}.`), line("Use Liturgist again for your daily selection.")]);
    return;
  }
  if (freeRecordsLeft(book) > 0) return;
  const options = [["daily", "Daily selection: make one recorded spell castable until your next daily preparation"], ["learned", "Record a spell learned from a written source"], ["list", "Show the book's contents"]];
  const choice = await chooseFromList("Liturgist", "Liturgical Book", options);
  if (choice === "learned") {
    const name = await recordSpell(actor, book, "learned");
    if (name) await postCard(actor, "Liturgist", [line(`<strong>${name}</strong> is recorded in your Liturgical Book.`)]);
    return;
  }
  const records = recordedSpells(book);
  if (choice === "list") {
    await postCard(actor, "Liturgical Book", [line(records.map((r) => `${r.name} (PP ${r.pp})`).join(", ") || "Nothing recorded yet.")]);
    return;
  }
  if (choice !== "daily") return;
  const current = liturgySweep(actor.items, [LITURGY_DAILY]);
  const owned = ownedSpellNames(actor);
  const pickable = records.filter((r) => !owned.has(String(r.name).trim().toLowerCase()) || current.some((c) => c.name === r.name));
  if (!pickable.length) { ui.notifications.warn("Liturgist: every recorded spell is already on your spells table."); return; }
  const picked = await chooseFromList("Liturgist", "Today's selection from your Liturgical Book", pickable.map((r) => [r.id, `${r.name} (PP ${r.pp})`]));
  const record = pickable.find((r) => r.id === picked);
  if (!record) return;
  if (current.length) await actor.deleteEmbeddedDocuments("Item", current.map((c) => c.id));
  const made = await makeCastable(actor, feat, record, LITURGY_DAILY);
  if (made) await postCard(actor, "Liturgist", [line(`<strong>${made.name}</strong> is on your spells table until your next daily preparation — memorised without counting against your total (learned caster), or in your repertoire for the day (instinctive caster).`)]);
}

/** Liturgy of Prayer's Use: one recorded spell, castable for the rest of this turn. */
export async function useLiturgyOfPrayer(actor, ability, { spendAP, spendUse }) {
  const { line, postCard, chooseFromList } = api().helpers;
  const book = liturgicalBook(actor);
  if (!book) { ui.notifications.warn("Liturgy of Prayer: you need your Liturgical Book — Use the Liturgist feat to take it."); return; }
  const owned = ownedSpellNames(actor);
  const pickable = recordedSpells(book).filter((r) => !owned.has(String(r.name).trim().toLowerCase()));
  if (!pickable.length) { ui.notifications.warn("Liturgy of Prayer: no spell recorded in your Liturgical Book is outside your memorised spells."); return; }
  const picked = await chooseFromList("Liturgy of Prayer", "Liturgical Book spell to invoke now", pickable.map((r) => [r.id, `${r.name} (PP ${r.pp})`]));
  const record = pickable.find((r) => r.id === picked);
  if (!record) return;
  if (!(await spendAP(actor, "Liturgy of Prayer"))) return;
  if (!(await spendUse(ability, "Liturgy of Prayer"))) return;
  const made = await makeCastable(actor, ability, record, LITURGY_MOMENT);
  if (made) await postCard(actor, "Liturgy of Prayer", [line(`<strong>${made.name}</strong> is on your spells table — cast it before the end of your turn (normal AP cost). It leaves at the end of your turn.`), line("<em>Once per day.</em>")]);
}

/** The hooks: a new day clears both kinds; a turn's end clears Liturgy of Prayer's. */
export function registerLiturgyHooks() {
  const sweep = async (actor, kinds) => {
    if (!actor?.isOwner) return;
    // Only what is still there: a turn's end and a new day can overlap
    // (found live, 16 Nov 2026), and a delete naming a gone item fails whole.
    const gone = liturgySweep(actor.items, kinds).map((i) => i.id).filter((id) => actor.items.has(id));
    if (gone.length) await actor.deleteEmbeddedDocuments("Item", gone).catch((err) => console.warn("Pillars of Faith | Liturgical Book sweep", err));
  };
  Hooks.on("trgPrimeDailyPreparation", ({ actor } = {}) => sweep(actor, [LITURGY_DAILY, LITURGY_MOMENT]));
  Hooks.on("trgPrimeTurnEnded", ({ actor } = {}) => sweep(actor, [LITURGY_MOMENT]));
}
