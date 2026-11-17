/**
 * WRITES TO A CREATURE THIS CLIENT MAY NOT OWN (0.12.0, automation audit).
 *
 * THE DEFECT. The Healer's abilities and the healing feats wrote straight to
 * their target — `target.update({ "system.resources.hp.value": … })` — and,
 * when the client did not own the target, printed "apply it on their sheet"
 * instead. Every earlier live test ran as the GM, who owns everything, so the
 * branch never showed. At a real table the Healer is a player and the people
 * they heal are other players' characters: Gift of Healing, Healer's Touch,
 * Restorative Hands, Lifeline, Lifebound Ward, Restorative Spores and Share
 * the Wound all fell back to hand bookkeeping in exactly the case they exist
 * for. The local heal also ignored the Dying rule ("a magical effect that
 * heals HP while they have the Dying condition reduces Dying by 1" and heals
 * nothing), and the Unconscious clear that goes with it.
 *
 * THE FIX, ONE PLACE. Healing goes through the system's own `healActor`
 * helper, which applies the Dying rule and relays to the GM itself.
 * Temporary HP, a condition step and Lifeline's save go through this
 * module's socket (`module.trg-pillars-of-faith`, already declared for Grace
 * beyond Need), handled by the active GM only. Owned targets are written
 * directly, exactly as before.
 *
 * Pure apart from `game`, `fromUuid` and the helpers, so the harness can
 * drive it with fakes.
 */
import { helpers } from "./automations.mjs";

export const MODULE_ID = "trg-pillars-of-faith";
export const SOCKET = `module.${MODULE_ID}`;

/** The actions the GM's client carries out for another client. */
export const RELAY = Object.freeze({
  TEMP_HP: "tempHP",
  CONDITION: "conditionStep",
  LIFELINE: "lifeline",
  CLEANSE: "cleanse"
});

/**
 * CLEANSING RADIANCE, APPLIED DIRECTLY (0.12.1; Graham's ruling U8, 16 Nov
 * 2026). Each of the feat's five effects ends what its name says, with no
 * Counteract roll:
 *   fear      Frightened, and effects whose source carried the Fear trait
 *   paralysis Paralysed, and effects of a Paralysis-trait source
 *   senses    Blinded and Deafened
 *   disease   disease afflictions (and those declared counteredAs disease),
 *             and effects of a Disease-trait source
 *   curse     curse afflictions (and counteredAs curse), and effects of a
 *             Curse-trait source
 */
export const CLEANSE = Object.freeze({
  fear: { label: "Remove Fear", statuses: ["frightened"], traits: ["fear"], afflictions: [] },
  paralysis: { label: "Remove Paralysis", statuses: ["paralyzed"], traits: ["paralysis"], afflictions: [] },
  senses: { label: "Restore Senses", statuses: ["blinded", "deafened"], traits: [], afflictions: [] },
  disease: { label: "Remove Disease", statuses: [], traits: ["disease"], afflictions: ["disease"] },
  curse: { label: "Remove Curse", statuses: [], traits: ["curse"], afflictions: ["curse"] }
});

const lowerList = (v) => (Array.isArray(v) ? v : String(v ?? "").split(/[,;]/)).map((t) => String(t).trim().toLowerCase()).filter(Boolean);

/** Does an affliction item answer to one of these kinds? (core affliction-countered.mjs's rule) */
export function afflictionMatches(item, kinds) {
  if (item?.type !== "affliction") return false;
  const own = [String(item.system?.afflictionType ?? "").trim().toLowerCase(), ...lowerList(item.flags?.["trg-prime"]?.counteredAs)];
  return own.some((k) => kinds.includes(k));
}

/**
 * AN AFFLICTION CURED IN ORDER (0.12.2; Graham, 16 Nov 2026, from Fiends &
 * Fables' "Removing Mummy Rot"): "the casting of a Remove Curse spell …
 * Following the successful casting of Remove Curse … A Remove Disease spell
 * must be invoked". The order is declared on the affliction
 * (`flags.trg-pillars-of-faith.cureSequence`); Fiends & Fables' own copy of
 * Mummy Rot, which carries no such flag, is recognised by name.
 */
export const CURE_STEP_FLAG = "cureSteps";
// 0.12.3: the steps are kept where TRG Prime 3.695.0 keeps them —
// `flags.trg-prime.cureSteps = { curse: true }` — so a Cleansing Radiance step
// and a cast Remove Disease count towards the same cure.
export function cureSequenceOf(item) {
  if (item?.type !== "affliction") return null;
  for (const declared of [item.flags?.["trg-prime"]?.cureSequence, item.flags?.[MODULE_ID]?.cureSequence]) {
    if (Array.isArray(declared) && declared.length > 1) return declared.map((k) => String(k).toLowerCase());
  }
  return /mummy rot/i.test(String(item.name ?? "")) ? ["curse", "disease"] : null;
}

/** What a cleanse would do to this actor: { statuses, effectIds, itemIds, steps, labels }. Pure. */
export function cleansePlan(actor, kind) {
  const spec = CLEANSE[kind];
  const out = { statuses: [], effectIds: [], itemIds: [], steps: [], labels: [] };
  if (!spec || !actor) return out;
  for (const key of spec.statuses) {
    if (actor.hasCondition?.(key) || actor.statuses?.has?.(key)) { out.statuses.push(key); out.labels.push(key[0].toUpperCase() + key.slice(1)); }
  }
  if (spec.traits.length) {
    for (const effect of actor.effects ?? []) {
      if (effect?.disabled) continue;
      const traits = lowerList(effect.flags?.["trg-prime"]?.sourceTraits);
      if (!traits.some((t) => spec.traits.includes(t))) continue;
      if ((effect.statuses ? Array.from(effect.statuses) : []).some((st) => out.statuses.includes(st))) continue;
      out.effectIds.push(effect.id); out.labels.push(effect.name);
    }
  }
  for (const item of actor.items ?? []) {
    const sequence = cureSequenceOf(item);
    if (sequence) {
      // Cured in order: each step must follow the ones before it.
      const record = item.flags?.["trg-prime"]?.[CURE_STEP_FLAG];
      const steps = record && typeof record === "object" && !Array.isArray(record) ? record : {};
      const done = Object.keys(steps).filter((k) => steps[k] === true);
      const at = sequence.indexOf(kind);
      if (at < 0) continue;
      if (done.includes(kind)) continue;
      const owed = sequence.slice(0, at).filter((k) => !done.includes(k));
      if (owed.length) { out.labels.push(`${item.name} resists — ${owed.map((k) => CLEANSE[k]?.label ?? k).join(" and ")} must come first`); continue; }
      if (at === sequence.length - 1) { out.itemIds.push(item.id); out.labels.push(item.name); }
      else { out.steps.push({ itemId: item.id, steps: { ...steps, [kind]: true } }); out.labels.push(`${item.name}: ${spec.label} takes hold — ${sequence.slice(at + 1).map((k) => CLEANSE[k]?.label ?? k).join(", then ")} must follow`); }
      continue;
    }
    if (spec.afflictions.length && afflictionMatches(item, spec.afflictions)) { out.itemIds.push(item.id); out.labels.push(item.name); }
  }
  return out;
}

/** Remove what the plan names, on a client that owns the actor. */
export async function applyCleanse(actor, kind) {
  const plan = cleansePlan(actor, kind);
  for (const key of plan.statuses) await actor.toggleStatusEffect(key, { active: false });
  const effects = plan.effectIds.filter((id) => actor.effects?.get?.(id));
  if (effects.length) await actor.deleteEmbeddedDocuments("ActiveEffect", effects);
  if (plan.itemIds.length) await actor.deleteEmbeddedDocuments("Item", plan.itemIds);
  for (const step of plan.steps) await actor.items.get(step.itemId)?.setFlag("trg-prime", CURE_STEP_FLAG, step.steps);
  return plan.labels;
}

/** Cleanse a creature wherever it is owned: the labels removed, or null when the GM was asked. */
export async function cleanseTarget(target, kind) {
  if (!target || !CLEANSE[kind]) return [];
  if (!target.isOwner) {
    emit({ action: RELAY.CLEANSE, targetUuid: target.uuid, kind });
    return null;
  }
  return applyCleanse(target, kind);
}

/**
 * Heal a creature by the system's rules, wherever it is owned.
 *
 * @returns {Promise<{healed: number, wasted: number, dying: boolean}>}
 *   `healed` what the HP rose by; `wasted` what lay beyond the maximum (zero
 *   for a Dying creature, whose heal buys back a step of Dying instead);
 *   `dying` whether it was Dying when the heal arrived.
 */
export async function healTarget(target, amount, { magical = true, rider = false } = {}) {
  const want = Math.max(0, Math.round(Number(amount) || 0));
  if (!target || !want) return { healed: 0, wasted: 0, dying: false };
  const dying = Boolean(target.hasCondition?.("dying"));
  // A RIDER ON A SPELL'S OWN HEALING (Graham's ruling, 16 Nov 2026, U1): the
  // "additional HP" of Gift of Healing or Healer's Touch is part of the
  // triggering spell's healing, which has already reduced Dying by 1 — so on
  // a Dying recipient it does nothing more: no second Dying step, no HP.
  if (dying && rider) return { healed: 0, wasted: 0, dying: true };
  const hp = target.system?.resources?.hp ?? {};
  const room = Math.max(0, Number(hp.max ?? 0) - Number(hp.value ?? 0));
  const healed = Math.max(0, Number(await helpers().healActor(target, want, { magical })) || 0);
  // Read from the numbers before the heal rather than after it: a relayed
  // heal lands on the GM's client and this one may not have the update yet.
  const wasted = dying ? 0 : Math.max(0, want - Math.min(room, want));
  return { healed, wasted, dying };
}

/** Temporary HP that keeps the larger pool (no stacking), wherever it is owned. */
export async function giveTempHp(target, amount) {
  const value = Math.max(0, Math.round(Number(amount) || 0));
  if (!target || !value) return null;
  if (target.isOwner) return helpers().grantTempHP(target, value);
  emit({ action: RELAY.TEMP_HP, targetUuid: target.uuid, amount: value });
  return null;
}

/**
 * Lower a numbered condition by `by` (to nothing at 0), wherever it is owned.
 * @returns {Promise<number|null>} the new value when written here, null when relayed.
 */
export async function reduceCondition(target, key, by) {
  if (!target || !key) return null;
  const step = Math.max(0, Math.trunc(Number(by) || 0));
  if (!target.isOwner) {
    emit({ action: RELAY.CONDITION, targetUuid: target.uuid, key, by: step });
    return null;
  }
  return applyConditionStep(target, key, step);
}

/** The step itself, on the client that owns the creature. */
export async function applyConditionStep(actor, key, by) {
  const current = Number(actor.getConditionValue?.(key) ?? 0);
  if (!current) return 0;
  const next = Math.max(0, current - by);
  if (next > 0) await actor.toggleStatusEffect(key, { value: next });
  else await actor.toggleStatusEffect(key, { active: false });
  return next;
}

/**
 * Lifeline: "the triggering creature instead remains at 1 HP and does not
 * gain the Dying condition from the triggering damage. The creature gains
 * Fatigued 1" (at least Fatigued 1). Wherever it is owned.
 */
export async function holdAtOneHp(target) {
  if (!target) return false;
  if (!target.isOwner) {
    emit({ action: RELAY.LIFELINE, targetUuid: target.uuid });
    return null;
  }
  return applyLifeline(target);
}

export async function applyLifeline(actor) {
  await actor.update({ "system.resources.hp.value": 1 });
  if (actor.getConditionValue?.("dying")) await actor.toggleStatusEffect("dying", { active: false });
  // "Gains Fatigued 1": at least Fatigued 1 — a creature already Fatigued 2
  // stays at 2 (Graham's ruling, 16 Nov 2026, U5; it used to add 1).
  const fatigued = Number(actor.getConditionValue?.("fatigued") ?? 0);
  if (fatigued < 1) await actor.toggleStatusEffect("fatigued", { value: 1 });
  return true;
}

function emit(payload) {
  globalThis.game?.socket?.emit?.(SOCKET, payload);
}

/** Whether this client is the one GM that carries relayed writes out. */
function isRelayGM() {
  const user = globalThis.game?.user;
  if (!user?.isGM) return false;
  const active = globalThis.game.users?.activeGM ?? globalThis.game.users?.find?.((u) => u.isGM && u.active);
  return !active || active.id === user.id;
}

/** The GM's side: one handler for every relayed write. Registered at `ready`. */
export async function handleRelay(data, { resolve = (uuid) => fromUuid(uuid) } = {}) {
  if (!data || !Object.values(RELAY).includes(data.action) || !isRelayGM()) return false;
  const doc = await Promise.resolve(resolve(data.targetUuid)).catch(() => null);
  const actor = doc?.documentName === "Actor" ? doc : doc?.actor;
  if (!actor) return false;
  if (data.action === RELAY.TEMP_HP) await helpers().grantTempHP(actor, Number(data.amount) || 0);
  else if (data.action === RELAY.CONDITION) await applyConditionStep(actor, String(data.key ?? ""), Math.max(0, Math.trunc(Number(data.by) || 0)));
  else if (data.action === RELAY.LIFELINE) await applyLifeline(actor);
  else if (data.action === RELAY.CLEANSE) await applyCleanse(actor, String(data.kind ?? ""));
  return true;
}

export function registerRelaySocket() {
  globalThis.game?.socket?.on?.(SOCKET, (data) => { handleRelay(data).catch((err) => console.warn("Pillars of Faith | relayed write", err)); });
}
