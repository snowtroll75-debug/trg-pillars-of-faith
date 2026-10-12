/**
 * Chapter 8 — Spirits & Haunts (0.10.0): what the core's peril machinery
 * (TRG Prime 3.629.0) does not already do from a haunt's printed lines.
 *
 *   The Hungry Reliquary's Effect — "The requesting creature immediately
 *     regains 5d6 HP. Another random living creature within 60 feet loses the
 *     same amount of HP. This loss is essence damage and cannot reduce the
 *     victim below 1 HP during the initial trigger."
 *   Redistribute Suffering — "The haunt selects the most visibly injured
 *     living creature within 60 feet. That creature heals 4d6 HP. A different
 *     random living creature within range suffers the same amount as essence
 *     damage with a Basic Will save against DC 29."
 *   Interpret Haunt (Chapter 4) — on a Success the GM is whispered the
 *     haunt's Trigger ("you identify the general nature of the haunt and its
 *     likely trigger"); on a Critical its Anchor and Resolution too, from
 *     which "the GM may also reveal one method that could placate, avoid or
 *     weaken it". The table hears what the GM chooses to say.
 *
 * Everything else a haunt does — detection, disabling, suppression, the
 * Trigger's saves and conditions, every other routine action — is the core
 * reading the haunt's own sheet.
 */
import { helpers } from "./automations.mjs";

const FEET = 60;
const isPerilActor = (actor) => Boolean(actor?.system?.gm?.peril?.enabled);

/** Living creatures within `feet` of a token, never a peril. */
async function livingNear(token, feet, { except = [] } = {}) {
  const { isLivingCreature } = await import("/systems/trg-prime/module/kind-targeting.mjs");
  if (!token) return [];
  const origin = token.object?.center ?? null;
  const out = [];
  for (const t of token.parent?.tokens ?? []) {
    const actor = t.actor;
    if (!actor || t.id === token.id || isPerilActor(actor) || except.includes(actor)) continue;
    if (!isLivingCreature(actor.system ?? {})) continue;
    const centre = t.object?.center ?? null;
    const distance = origin && centre ? canvas?.grid?.measurePath?.([origin, centre])?.distance ?? null : null;
    if (distance !== null && distance > feet) continue;
    out.push(actor);
  }
  return out;
}

const pick = (list) => list[Math.floor(Math.random() * list.length)] ?? null;

/** Roll a formula to chat as the haunt, and its total. */
async function rolled(peril, formula, flavor) {
  const roll = await new Roll(formula).evaluate();
  await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor: peril }), flavor });
  return roll.total;
}

export const PERIL_AUTOMATIONS = {
  "hungry reliquary": {
    async trigger(peril, { helpers: h }) {
      const { healActor, applyTypedDamage, describeDamage } = helpers();
      const line = h.line;
      const requester = Array.from(game.user?.targets ?? []).map((t) => t.actor).find((a) => a && !isPerilActor(a)) ?? null;
      if (!requester) return [line("<strong>Target the creature that asked for aid</strong>, then press Trigger again.")];
      const amount = await rolled(peril, "5d6", `${peril.name} — the reliquary answers`);
      await healActor(requester, amount);
      const lines = [line(`<strong>${requester.name}</strong> regains <strong>${amount}</strong> HP.`)];
      const near = await livingNear(h.perilToken(peril) ?? requester.getActiveTokens?.(true, true)?.[0] ?? null, FEET, { except: [requester] });
      const victim = pick(near);
      if (!victim) {
        lines.push(line("No other living creature is within 60 feet — nobody pays for it."));
        return lines;
      }
      // "Cannot reduce the victim below 1 HP during the initial trigger."
      const hp = Number(victim.system?.resources?.hp?.value ?? 0);
      const capped = Math.max(0, Math.min(amount, hp - 1));
      if (capped <= 0) {
        lines.push(line(`<strong>${victim.name}</strong>, chosen at random, is already at 1 HP — the opening trigger cannot take them lower.`));
        return lines;
      }
      const dealt = await applyTypedDamage(victim, { amount: capped, type: "essence", sourceLevel: h.levelOf(peril), sourceName: peril.name });
      lines.push(line(`<strong>${victim.name}</strong>, chosen at random, loses the same as essence damage${capped < amount ? ` (held at 1 HP: ${capped})` : ""}. ${await describeDamage(dealt.packet, victim.name)}`));
      return lines;
    }
  },
  "redistribute suffering": {
    async use(peril, item, { helpers: h }) {
      const { healActor } = helpers();
      const line = h.line;
      const token = h.perilToken(peril);
      const near = token ? await livingNear(token, FEET) : Array.from(game.user?.targets ?? []).map((t) => t.actor).filter((a) => a && !isPerilActor(a));
      if (!near.length) return [line(`No living creature is within 60 feet of ${peril.name}.`)];
      // "The most visibly injured": the lowest share of its maximum.
      const share = (a) => Number(a.system?.resources?.hp?.value ?? 0) / Math.max(1, Number(a.system?.resources?.hp?.max ?? 1));
      const healed = [...near].sort((a, b) => share(a) - share(b))[0];
      const amount = await rolled(peril, "4d6", `${item.name} — healing`);
      await healActor(healed, amount);
      const lines = [line(`<strong>${healed.name}</strong>, the most visibly injured, heals <strong>${amount}</strong> HP.`)];
      const victim = pick(near.filter((a) => a !== healed));
      if (!victim) {
        lines.push(line("No different living creature is within range to pay for it."));
        return lines;
      }
      lines.push(line(`<strong>${victim.name}</strong>, chosen at random, suffers the same as essence damage (Basic Will DC 29).`));
      const spec = {
        save: "will", basic: true, dc: 29, damage: { formula: String(amount), type: "essence" },
        scope: "targets", radiusFeet: 0, livingOnly: true, immuneIf: [], initiative: false,
        intro: "", notes: [], outcomes: {}, conditions: {}, overflow: null
      };
      lines.push(...await h.runPerilEffect(peril, spec, { title: item.name, targets: [victim] }));
      return lines;
    }
  }
};

/** Interpret Haunt, answered: the GM's whisper (see the file comment). */
export async function answerInterpretHaunt({ actor, action, degree, targetActor }) {
  if (action?.key !== "interpretHaunt" || !isPerilActor(targetActor)) return;
  if (!["success", "critical", "heroic"].includes(String(degree ?? ""))) return;
  const p = targetActor.system.gm.peril;
  const gm = ChatMessage.getWhisperRecipients("GM").map((u) => u.id);
  const row = (label, text) => (text ? `<p style="margin:2px 0"><strong>${label}</strong> ${text}</p>` : "");
  const critical = degree === "critical" || degree === "heroic";
  const content = `<div class="trg-prime trg-check-card"><header class="check-header"><div class="check-heading"><span class="check-actor">${actor?.name ?? ""}</span><h3>Interpret Haunt — for the GM</h3></div></header>`
    + `<p style="margin:2px 0"><em>${actor?.name ?? "They"} ${critical ? "understands" : "has read"} ${targetActor.name}. Read out what you choose.</em></p>`
    + row("Nature", targetActor.system?.details?.traits ?? "")
    + row("Likely trigger", p.trigger)
    + (critical ? row("Sustained by (Anchor)", p.anchor) + row("What could end it (Resolution)", p.resolution) : "")
    + `</div>`;
  await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), whisper: gm, content });
}
