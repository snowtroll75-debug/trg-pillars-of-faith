/**
 * REACTIONS THE CORE NOW OFFERS AT THE MOMENT THEY TRIGGER (0.12.4, on TRG
 * Prime 3.696.0; the Pillars of Faith audit's CD1 and CD8).
 *
 * Until 0.12.4 these were Use presses: the Use spent the Focus use and the
 * reaction, and the reroll itself was made from the sheet ("the core's check
 * reactions keep the second result only"). TRG Prime 3.696.0 lets an
 * after-reaction answer `{ reroll, advantage, keepBetter }`, so the failed
 * save is offered to the reactor as it fails, rerolled by the system, and the
 * better result stands.
 *
 *   Spirit Intercession   "Reroll the triggering saving throw and use the
 *                         better result." From 7th level, also an ally within
 *                         30 feet (Line of Effect: the reactor's call).
 *   Continuity Unbroken   a failed save against possession or a Mental effect
 *                         on memory or identity; with Advantage.
 *   Revelation in Crisis  a failed save against a spell or magical effect,
 *                         while Revelatory Script is not expended; with
 *                         Advantage; expends Revelatory Script.
 *   Vowbound Resolve      a failed save or skill check "while directly
 *                         attempting to fulfil your Solemn Vow"; with
 *                         Advantage.
 *   Redundant Anatomy     once a day, after a critical injury is determined:
 *                         one step less severe (a critical reaction's
 *                         `severitySteps: -1`, TRG Prime 3.685.0).
 *
 * The trigger's narrower words (which Mental effect, which check fulfils the
 * Vow, a magical source) are the reactor's to judge: the question quotes them,
 * and "No" costs nothing. The spending runs on the reactor's own client
 * (`registerReactionStep`), so the use and the reaction come off the sheet of
 * whoever said yes.
 *
 * The pure halves are exported for the harness.
 */
/** The reroll reactions, in the order a failed check offers them. */
export const REROLL_REACTIONS = [
  {
    name: "Continuity Unbroken", advantage: true, checkTypes: ["save"],
    traits: ["possession", "mental"],
    trigger: "a saving throw against possession, or a Mental effect that would alter, erase or suppress your memories, personality or identity"
  },
  {
    name: "Revelation in Crisis", advantage: true, checkTypes: ["save"], spends: "readAura",
    trigger: "a saving throw against a spell or magical effect (expends Revelatory Script)"
  },
  {
    name: "Vowbound Resolve", advantage: true, checkTypes: ["save", "skill"],
    trigger: "a saving throw or skill check made while directly attempting to fulfil your Solemn Vow"
  },
  {
    name: "Spirit Intercession", advantage: false, checkTypes: ["save"], allyFeet: 30, allyLevel: 7,
    trigger: "a saving throw (yours, or from 7th level an ally's within 30 feet you have Line of Effect to)"
  }
];

const lower = (v) => String(v ?? "").trim().toLowerCase();
const traitList = (traits) => (Array.isArray(traits) ? traits : String(traits ?? "").split(/[,;]/)).map(lower).filter(Boolean);

/**
 * Which reroll reactions a failed check could offer this reactor. Pure.
 *
 * @param {object} check  `{ type, failed, traits }` off the reaction's ctx
 * @param {object} reactor `{ owned: string[] (feat/ability names), usable:
 *   (name) => boolean, self: boolean, level: number, feet: number }`
 * @returns {object[]} rows of REROLL_REACTIONS
 */
export function rerollOffers(check, { owned = [], usable = () => true, self = true, level = 0, feet = 0 } = {}) {
  if (!check?.failed) return [];
  const type = lower(check.type);
  const traits = traitList(check.traits);
  const have = new Set((owned ?? []).map(lower));
  return REROLL_REACTIONS.filter((r) => {
    if (!have.has(lower(r.name)) || !r.checkTypes.includes(type)) return false;
    if (!self && !(r.allyFeet && level >= r.allyLevel && feet <= r.allyFeet)) return false;
    // A save that names its traits must name one of these; an unnamed one is
    // offered, and the question says what qualifies.
    if (r.traits && traits.length && !r.traits.some((t) => traits.includes(t))) return false;
    return usable(r.name);
  });
}

/**
 * The answer the core's after-reaction reads. Pure. The core's own line names
 * the reaction, both totals and which stands, so the module adds a line only
 * to say WHO answered when it was an ally (found live, 0.12.4: the same
 * sentence twice on the card).
 */
export function rerollAnswer(row, reactorName, rollerName) {
  const ally = Boolean(reactorName && rollerName && reactorName !== rollerName);
  return {
    reroll: true, keepBetter: true, advantage: Boolean(row.advantage), label: row.name,
    ...(ally ? { line: `<strong>${row.name}</strong>: ${reactorName} intercedes for ${rollerName}.` } : {})
  };
}

/** The critical reaction's answer: one step less severe. Pure. */
export function redundantAnatomyAnswer(severity) {
  const next = { deadly: "Serious", serious: "Minor", minor: "no injury" }[lower(severity)] ?? "one step less severe";
  return { severitySteps: -1, line: `<strong>Redundant Anatomy</strong>: the critical injury is one step less severe — ${next}.` };
}

/* ------------------------------------------------------------------ */
/* Foundry-side                                                         */
/* ------------------------------------------------------------------ */

const itemNamed = (actor, name) => Array.from(actor?.items ?? []).find((i) => (i.type === "feat" || i.type === "ability") && lower(i.name) === lower(name));
const readAuraOf = (actor) => Array.from(actor?.items ?? []).find((s) => s.type === "spell" && s.name === "Read Aura" && s.system?.innate);

/** Can this reactor pay for this row now (use left, Revelatory Script up, a reaction in combat)? */
function canPay(actor, name, h) {
  const item = itemNamed(actor, name);
  if (!item) return false;
  if (globalThis.game?.combat?.started && Number(actor.system?.resources?.reactions?.value ?? 0) <= 0) return false;
  if (name === "Revelation in Crisis") {
    const script = readAuraOf(actor);
    return Boolean(script) && h.itemUsesRemaining(script) > 0;
  }
  const max = h.itemUsesMax(item);
  return max === null || max === Infinity || h.itemUsesRemaining(item) > 0;
}

/**
 * The step that pays, on the reactor's client. Resolves true when paid. The
 * use is checked before the reaction is spent; Redundant Anatomy is not a
 * reaction ("when you suffer a critical injury"), so it spends its daily use only.
 */
async function payStep(actor, _answer, data) {
  const h = globalThis.game?.trgPrime?.modules?.helpers;
  const name = String(data?.name ?? "");
  const item = itemNamed(actor, name);
  if (!h || !item) return false;
  const script = name === "Revelation in Crisis" ? readAuraOf(actor) : null;
  const pool = name === "Revelation in Crisis" ? script : item;
  if (!pool) return false;
  const tracked = h.itemUsesMax(pool) !== null && h.itemUsesMax(pool) !== Infinity;
  const left = tracked ? h.itemUsesRemaining(pool) : Infinity;
  if (tracked && left <= 0) { globalThis.ui?.notifications?.warn?.(`${name}: no uses remain.`); return false; }
  if (name !== "Redundant Anatomy" && !(await h.spendReaction(actor, name))) return false;
  if (tracked) await pool.update({ "system.usesValue": left - 1 });
  return true;
}

/** The tokens on the scene whose actors might answer for this roll: the roller first, then allies near it. */
async function reactorsFor(ctx, h) {
  const roller = ctx.actor;
  const out = roller ? [{ actor: roller, self: true, feet: 0 }] : [];
  const from = ctx.token?.object ?? ctx.token ?? null;
  const tokens = Array.from(globalThis.canvas?.tokens?.placeables ?? []);
  if (!from || !tokens.length) return out;
  for (const t of tokens) {
    const a = t.actor;
    if (!a || a.uuid === roller?.uuid || !itemNamed(a, "Spirit Intercession")) continue;
    // AN ALLY: the same disposition as the roller's token.
    if ((t.document?.disposition ?? 0) !== (from.document?.disposition ?? 1)) continue;
    const feet = Number(await h.distanceBetween(t, from));
    if (Number.isFinite(feet)) out.push({ actor: a, self: false, feet });
  }
  return out;
}

const levelOf = (actor) => Math.max(1, Number(actor?.system?.identity?.level ?? 1) || 1);

/** Register the reroll reactions and Redundant Anatomy with TRG Prime (3.696.0). */
export function registerCoreReactions(api, moduleId) {
  if (typeof api?.registerCheckReaction !== "function" || typeof api?.registerReactionStep !== "function") return false;
  api.registerReactionStep("pof-reaction-pay", payStep, moduleId);
  api.registerCheckReaction("pof-reroll-reactions", {
    async after(ctx) {
      if (!ctx?.failed) return null;
      const h = globalThis.game?.trgPrime?.modules?.helpers;
      if (!h?.askReactor) return null;
      for (const reactor of await reactorsFor(ctx, h)) {
        const owned = Array.from(reactor.actor.items ?? []).map((i) => i.name);
        const rows = rerollOffers({ type: ctx.type, failed: ctx.failed, traits: ctx.traits }, {
          owned, self: reactor.self, level: levelOf(reactor.actor), feet: reactor.feet,
          usable: (name) => canPay(reactor.actor, name, h)
        });
        for (const row of rows) {
          const who = reactor.self ? "You" : (ctx.actor?.name ?? "An ally");
          const { answer, result } = await h.askReactor(reactor.actor, {
            title: row.name,
            content: `<p>${who} failed ${ctx.label ? `<strong>${ctx.label}</strong>` : `a ${ctx.type === "skill" ? "skill check" : "saving throw"}`} (${ctx.total ?? "?"}).</p>`
              + `<p><strong>${row.name}</strong> (Reaction): reroll it${row.advantage ? " with advantage" : ""} and use the better result.</p>`
              + `<p><em>Trigger: ${row.trigger}.</em></p>`,
            step: "pof-reaction-pay", data: { name: row.name }
          });
          if (answer && answer !== "no" && result === true) return rerollAnswer(row, reactor.actor.name, ctx.actor?.name);
        }
      }
      return null;
    }
  }, moduleId);
  if (typeof api.registerCriticalReaction === "function") {
    api.registerCriticalReaction("pof-redundant-anatomy", {
      async after(ctx) {
        const target = ctx?.target;
        const h = globalThis.game?.trgPrime?.modules?.helpers;
        const item = itemNamed(target, "Redundant Anatomy");
        if (!item || !h?.askReactor) return null;
        if (h.itemUsesMax(item) !== null && h.itemUsesRemaining(item) <= 0) return null;
        const { answer, result } = await h.askReactor(target, {
          title: "Redundant Anatomy",
          content: `<p>${target.name} suffers a <strong>${ctx.severity ?? ""}</strong> critical injury${ctx.row?.effect ? `: ${ctx.row.effect}` : ""}.</p><p><strong>Redundant Anatomy</strong> (once a day): make it one step less severe — Deadly becomes Serious, Serious becomes Minor, a Minor injury is negated.</p>`,
          step: "pof-reaction-pay", data: { name: "Redundant Anatomy" }
        });
        return answer && answer !== "no" && result === true ? redundantAnatomyAnswer(ctx.severity) : null;
      }
    }, moduleId);
  }
  return true;
}

