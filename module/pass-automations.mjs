/**
 * The final automation pass (0.11.0, on TRG Prime 3.630.0): the rules that
 * answer something happening elsewhere — a blow on an ally, a save, a heal
 * that overflows, a spell rider landing, an action resolved or attempted.
 *
 *   Martyr's Aegis        registerDamageShare
 *   Soul Mirror           trgPrimeCheckResolved (a save)
 *   Memory of Lost Masters trgPrimeCheckResolved (a Lost Scholarship Lore check)
 *   Grace beyond Need     trgPrimeOverheal
 *   Elemental Overflow    trgPrimeSpellRiderLanded
 *   Conceal Faith         trgPrimeActionResolved
 *   Perform Last Rites    trgPrimeActionResolved, trgPrimeActionAttempt
 *
 * The pure parts are exported for the harness; the rest run in Foundry.
 */
import { helpers, hasFeat, SYSTEM_ID, PAST_LIFE_LORE_FLAG } from "./automations.mjs";

const MODULE_ID = "trg-pillars-of-faith";
const SOCKET = `module.${MODULE_ID}`;
const esc = (v) => String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const lower = (v) => String(v ?? "").trim().toLowerCase();

/* ------------------------------------------------------------------ */
/* Pure rules                                                           */
/* ------------------------------------------------------------------ */

/** Martyr's Aegis: the most the wearer may take — half, never below 1 HP. */
export function aegisShareCap(amount, wearerHp) {
  const half = Math.floor(Math.max(0, Number(amount) || 0) / 2);
  return Math.max(0, Math.min(half, Math.max(0, (Number(wearerHp) || 0) - 1)));
}

/** Soul Mirror's ladder: what the possessor suffers for its Will degree. */
export function soulMirrorOutcome(degree) {
  const key = lower(degree);
  if (key === "critical" || key === "heroic") return { frightened: 0, text: "it shrugs off the reflection." };
  if (key === "success") return { frightened: 1, text: "Frightened 1 until the end of its next turn." };
  if (key === "partial" || key === "failure") return { frightened: 2, text: "Frightened 2, and it cannot attempt to possess you for 1 minute." };
  return { frightened: 3, text: "Frightened 3, and it cannot attempt to possess any creature for 1 minute." };
}

/** Did a save answer a possession? Traits as the check carries them. */
export function isPossessionSave(traits) {
  const list = Array.isArray(traits) ? traits : String(traits ?? "").split(/[,;]/);
  return list.map(lower).includes("possession");
}

/** Grace beyond Need: temporary HP from the excess, capped at 10 + Wisdom (+5 per warp). */
export function graceTempHp(excess, wisdom, warps = 0) {
  const cap = 10 + Math.trunc(Number(wisdom) || 0) + 5 * Math.max(0, Math.trunc(Number(warps) || 0));
  return Math.max(0, Math.min(Math.trunc(Number(excess) || 0), cap));
}

/** Elemental Overflow: Constitution + half the Shaman level. */
export function overflowDamage(constitution, shamanLevel) {
  return Math.max(0, Math.trunc(Number(constitution) || 0) + Math.floor(Math.max(0, Number(shamanLevel) || 0) / 2));
}

/** Perform Last Rites: how long the protection lasts, in seconds, or 0. */
export function lastRitesSpan(degree, guided = false) {
  const key = lower(degree);
  const DAY = 86400;
  if (guided) {
    if (key === "critical" || key === "heroic") return 30 * DAY;
    if (key === "success") return 7 * DAY;
    if (key === "partial") return DAY;
    return 0;
  }
  if (key === "critical" || key === "heroic") return 7 * DAY;
  if (key === "success") return DAY;
  return 0;
}

const SPAN_WORDS = { 86400: "24 hours", 604800: "7 days", 2592000: "1 month" };

/* ------------------------------------------------------------------ */
/* Martyr's Aegis                                                       */
/* ------------------------------------------------------------------ */

async function aegisOn(actor, h) {
  const items = Array.from(actor?.items ?? []);
  for (const item of items) {
    const runes = await h.activeRunesOn(item, items);
    if (runes.some((r) => r.key === "martyrsAegis" || r.name === "Martyr's Aegis")) return item;
  }
  return null;
}

/**
 * Asked by the system's damage path before the dying machinery. Returns
 * `{ taken }`, the part the wearer took, or null.
 */
export async function martyrsAegisShare(actor, amount) {
  if (!globalThis.canvas?.ready || !(amount > 1)) return null;
  const h = helpers();
  const victimToken = await h.activeToken(actor);
  if (!victimToken) return null;
  const side = Number(victimToken.document?.disposition ?? 0);
  const now = Number(game.time?.worldTime ?? 0);
  const able = [];
  for (const token of canvas.tokens?.placeables ?? []) {
    const wearer = token.actor;
    if (!wearer || token.id === victimToken.id || wearer === actor) continue;
    if (Number(token.document?.disposition ?? 0) !== side) continue;
    if (!wearer.isOwner) continue;
    if ((await h.distanceBetween(token, victimToken)) > 10) continue;
    const item = await aegisOn(wearer, h);
    if (!item) continue;
    const markers = await h.runeMarkersOf(item);
    if (!(await h.runeFrequencyAllows(markers, "martyrsAegis", "1/minute", now))) continue;
    if (game.combat?.started && Number(wearer.system?.resources?.reactions?.value ?? 0) <= 0) continue;
    const cap = aegisShareCap(amount, wearer.system?.resources?.hp?.value);
    if (cap <= 0) continue;
    able.push({ wearer, item, markers, cap });
  }
  if (!able.length) return null;

  const { DialogV2 } = foundry.applications.api;
  const options = able.map((a, i) => `<option value="${i}">${esc(a.wearer.name)} — up to ${a.cap}</option>`).join("");
  const picked = await DialogV2.wait({
    window: { title: `Martyr's Aegis — ${actor.name}`, icon: "fa-solid fa-shield-heart" },
    classes: ["trg-prime"],
    content: `<div class="trg-prime trg-check-dialog"><p><strong>${esc(actor.name)}</strong> is about to take <strong>${amount}</strong> HP damage after their defences. `
      + `A wearer of Martyr's Aegis within 10 feet may take up to half of it (a Reaction, once a minute; never below 1 HP).</p>`
      + `<div class="form-group"><label>Wearer</label><select name="who">${options}</select></div>`
      + `<div class="form-group"><label>Damage taken</label><input type="number" name="take" min="0" value="${able[0].cap}"></div></div>`,
    buttons: [
      { action: "take", label: "Take it", icon: "fa-solid fa-check", default: true,
        callback: (event, button) => ({ who: Number(button.form?.elements?.who?.value ?? 0), take: Number(button.form?.elements?.take?.value ?? 0) }) },
      { action: "decline", label: "Not now", icon: "fa-solid fa-xmark" }
    ],
    rejectClose: false
  });
  if (!picked || typeof picked !== "object") return null;
  const chosen = able[picked.who] ?? able[0];
  const taken = Math.max(0, Math.min(chosen.cap, Math.trunc(Number(picked.take) || 0)));
  if (!taken) return null;

  const hp = Number(chosen.wearer.system?.resources?.hp?.value ?? 0);
  const update = { "system.resources.hp.value": Math.max(1, hp - taken) };
  if (game.combat?.started) update["system.resources.reactions.value"] = Math.max(0, Number(chosen.wearer.system?.resources?.reactions?.value ?? 0) - 1);
  await chosen.wearer.update(update);
  for (const [flag, value] of Object.entries(await h.runeUseUpdates(chosen.markers, "martyrsAegis", "1/minute", now))) {
    await chosen.item.setFlag(SYSTEM_ID, flag, value);
  }
  await h.postCard(chosen.wearer, "Martyr's Aegis", [
    h.line(`<strong>${esc(chosen.wearer.name)}</strong> takes <strong>${taken}</strong> of the blow meant for ${esc(actor.name)} — not reduced by their own defences — and is now on ${Math.max(1, hp - taken)} HP.`),
    h.line(`${esc(actor.name)} takes the remaining ${amount - taken}.`)
  ]);
  return { taken };
}

/* ------------------------------------------------------------------ */
/* Soul Mirror, Memory of Lost Masters                                  */
/* ------------------------------------------------------------------ */

async function soulMirror({ actor, type, degree, traits, sourceUuid }) {
  if (type !== "save" || !["critical", "heroic"].includes(lower(degree)) || !isPossessionSave(traits)) return;
  if (!actor?.isOwner) return;
  const h = helpers();
  const items = Array.from(actor.items ?? []);
  let mirror = null;
  for (const item of items) {
    const runes = await h.activeRunesOn(item, items);
    if (runes.some((r) => r.key === "soulMirror" || r.name === "Soul Mirror")) { mirror = item; break; }
  }
  if (!mirror) return;
  const now = Number(game.time?.worldTime ?? 0);
  const markers = await h.runeMarkersOf(mirror);
  if (!(await h.runeFrequencyAllows(markers, "soulMirror", "1/minute", now))) return;
  for (const [flag, value] of Object.entries(await h.runeUseUpdates(markers, "soulMirror", "1/minute", now))) {
    await mirror.setFlag(SYSTEM_ID, flag, value);
  }
  const dc = h.levelDC(Number(actor.system?.identity?.level ?? 0));
  const source = sourceUuid ? await fromUuid(sourceUuid).catch(() => null) : null;
  const possessor = source?.documentName === "Actor" ? source : (source?.actor ?? null);
  if (!possessor) {
    await h.postCard(actor, "Soul Mirror", [h.line(`${esc(actor.name)}'s soul throws the intrusion back. The possessor rolls <strong>Will against DC ${dc}</strong> — Success: Frightened 1 until the end of its next turn; Failure: Frightened 2 and it cannot possess ${esc(actor.name)} for 1 minute; Fumble: Frightened 3 and it cannot possess anyone for 1 minute. <em>(The roll did not know the possessor; the GM rolls it.)</em>`)]);
    return;
  }
  const check = await h.rollCheck({ actor: possessor, label: `${possessor.name} — Will Save`, subtitle: `Soul Mirror — DC ${dc}`, type: "save", save: "will", dc });
  const outcome = soulMirrorOutcome(check?.outcome?.degree?.key ?? "failure");
  const lines = [h.line(`Soul Mirror — ${esc(possessor.name)}: <strong>${check?.outcome?.degree?.label ?? "Failure"}</strong>, ${outcome.text}`)];
  if (outcome.frightened) {
    const applied = await h.applyConditionTagsTo(possessor, [{ key: "frightened", label: "Frightened", value: outcome.frightened,
      ...(outcome.frightened === 1 && game.combat?.started ? { expiresRound: Number(game.combat.round ?? 0) + 1 } : {}) }], {});
    lines.push(h.line(`${esc(possessor.name)}: ${await h.formatAppliedTags(applied)}.`));
  }
  await h.postCard(actor, "Soul Mirror", lines);
}

async function memoryOfLostMasters({ actor, type, subject, degree }) {
  if (!actor?.isOwner || !hasFeat(actor, "Memory of Lost Masters")) return;
  const echo = Array.from(actor.effects ?? []).find((e) => !e.disabled && Array.isArray(e.getFlag?.(SYSTEM_ID, PAST_LIFE_LORE_FLAG)));
  if (!echo || echo.getFlag(MODULE_ID, "memoryFirstCheck")) return;
  const keys = echo.getFlag(SYSTEM_ID, PAST_LIFE_LORE_FLAG).map(lower);
  const said = lower(subject).replace(/^specialist:|^lore:/, "");
  if (!(type === "specialist" || type === "skill") || !keys.some((k) => said === k || said.endsWith(k))) return;
  await echo.setFlag(MODULE_ID, "memoryFirstCheck", true);
  if (!["critical", "heroic"].includes(lower(degree))) return;
  const feat = Array.from(actor.items ?? []).find((i) => (i.type === "feat" || i.type === "ability") && lower(i.name) === "past-life echo");
  if (!feat) return;
  const { itemUsesMax, itemUsesRemaining } = helpers();
  const max = itemUsesMax(feat);
  if (max === null || max === Infinity) return;
  const left = itemUsesRemaining(feat);
  if (left < max) await feat.update({ "system.usesValue": left + 1 });
  await helpers().postCard(actor, "Memory of Lost Masters", [helpers().line("A Critical with the remembered Lore: <strong>Past-Life Echo is not expended</strong> — its use is restored. The echo's duration still ends normally.")]);
}

/**
 * ANCHORED SOUL'S AWARENESS (0.11.1; found in the 0.11.0 live test): "you
 * know when a possession attempt was resisted". The rune's note promised a
 * card line and nothing wrote one — the +2 was the whole of it.
 */
export function anchoredSoulAware({ type, degree, traits }) {
  return type === "save" && isPossessionSave(traits) && ["success", "critical", "heroic"].includes(lower(degree));
}

async function anchoredSoul(ctx) {
  const { actor } = ctx;
  if (!anchoredSoulAware(ctx) || !actor?.isOwner) return;
  const h = helpers();
  const items = Array.from(actor.items ?? []);
  for (const item of items) {
    const runes = await h.activeRunesOn(item, items);
    if (!runes.some((r) => r.key === "anchoredSoul" || r.name === "Anchored Soul")) continue;
    await h.postCard(actor, "Anchored Soul", [h.line(`${esc(actor.name)} feels the attempt to possess them fail — they know a possession attempt was resisted.`)]);
    return;
  }
}

export async function onCheckResolved(ctx) {
  await soulMirror(ctx);
  await anchoredSoul(ctx);
  await memoryOfLostMasters(ctx);
}

/* ------------------------------------------------------------------ */
/* Grace beyond Need                                                    */
/* ------------------------------------------------------------------ */

/** Temporary HP on a creature this client may not own: the GM writes it. */
async function giveTempHp(target, amount) {
  const h = helpers();
  if (target.isOwner) return h.grantTempHP(target, amount);
  game.socket.emit(SOCKET, { action: "tempHP", targetUuid: target.uuid, amount });
  return null;
}

export async function onOverheal({ caster, target, excess, spell }) {
  if (!caster?.isOwner || !target || !(excess > 0)) return;
  // Not on its own temporary HP, and only once a cast — the reaction is a spell.
  if (lower(spell?.name) === "grace beyond need") return;
  const grace = Array.from(caster.items ?? []).find((i) => i.type === "spell" && lower(i.name) === "grace beyond need");
  if (!grace) return;
  const { isLivingCreature } = await import("/systems/trg-prime/module/kind-targeting.mjs");
  if (!isLivingCreature(target.system ?? {})) return;
  const pp = Number(caster.system?.resources?.pp?.value ?? 0);
  const base = Math.max(0, Number(grace.system?.ppCost ?? 1));
  if (pp < base) return;
  if (game.combat?.started && Number(caster.system?.resources?.reactions?.value ?? 0) <= 0) return;
  const wisdom = Number(caster.system?.attributes?.wisdom?.total ?? 0);
  const maxWarps = Math.floor((pp - base) / 2);
  const { DialogV2 } = foundry.applications.api;
  const answer = await DialogV2.wait({
    window: { title: `Grace beyond Need — ${caster.name}`, icon: "fa-solid fa-hand-holding-heart" },
    classes: ["trg-prime"],
    content: `<div class="trg-prime trg-check-dialog"><p>${esc(spell?.name ?? "Your healing")} would lose <strong>${excess}</strong> HP of healing on <strong>${esc(target.name)}</strong>. `
      + `Cast Grace beyond Need (Reaction, ${base} PP) to bind it as temporary HP, up to 10 + Wisdom (${10 + wisdom})?</p>`
      + (maxWarps > 0 ? `<div class="form-group"><label>+2 PP: maximum +5 (times)</label><input type="number" name="warps" min="0" max="${maxWarps}" value="0"></div>` : "")
      + `</div>`,
    buttons: [
      { action: "cast", label: "Cast it", icon: "fa-solid fa-check", default: true, callback: (event, button) => ({ warps: Number(button.form?.elements?.warps?.value ?? 0) }) },
      { action: "decline", label: "Not now", icon: "fa-solid fa-xmark" }
    ],
    rejectClose: false
  });
  if (!answer || typeof answer !== "object") return;
  const warps = Math.max(0, Math.min(maxWarps, Math.trunc(Number(answer.warps) || 0)));
  const cost = base + 2 * warps;
  const amount = graceTempHp(excess, wisdom, warps);
  const update = { "system.resources.pp.value": pp - cost };
  if (game.combat?.started) update["system.resources.reactions.value"] = Math.max(0, Number(caster.system?.resources?.reactions?.value ?? 0) - 1);
  await caster.update(update);
  const pool = await giveTempHp(target, amount);
  const h = helpers();
  await h.postCard(caster, "Grace beyond Need", [
    h.line(`${base} PP${warps ? ` + ${2 * warps} PP (maximum +${5 * warps})` : ""} — <strong>${esc(target.name)}</strong> gains <strong>${amount}</strong> temporary HP from the healing that would have been lost${pool !== null ? ` (pool now ${pool})` : " (written by the GM)"}.`),
    h.line("<em>It does not stack with itself: the larger pool stands. The temporary HP lasts 1 minute (10 with the warp) — remove what is left when it ends.</em>")
  ]);
}

/* ------------------------------------------------------------------ */
/* Elemental Overflow                                                   */
/* ------------------------------------------------------------------ */

export function onSpellRiderLanded({ caster, target, rider }) {
  if (rider?.label !== "Elemental Mantle" || !caster?.isOwner || !hasFeat(caster, "Elemental Overflow")) return;
  elementalOverflow(caster, target, rider).catch((err) => console.warn("Pillars of Faith | Elemental Overflow", err));
}

async function elementalOverflow(caster, target, rider) {
  const h = helpers();
  const targetToken = await h.activeToken(target);
  if (!targetToken || !canvas?.ready) return;
  const roundKey = game.combat?.started ? `${game.combat.id}:${game.combat.round}` : "";
  const used = caster.getFlag(MODULE_ID, "overflowUsed") ?? {};
  const near = [];
  for (const token of canvas.tokens?.placeables ?? []) {
    if (!token.actor || token.id === targetToken.id || token.actor === caster) continue;
    if ((await h.distanceBetween(token, targetToken)) > 10) continue;
    const key = String(token.actor.uuid).replace(/\./g, "|");
    if (roundKey && used[key] === roundKey) continue;
    near.push(token.actor);
  }
  if (!near.length) return;
  const shaman = Array.from(caster.items ?? []).find((i) => i.type === "class" && lower(i.name) === "shaman");
  const amount = overflowDamage(caster.system?.attributes?.constitution?.total, shaman?.system?.level ?? caster.system?.identity?.level);
  const { DialogV2 } = foundry.applications.api;
  const picked = await DialogV2.wait({
    window: { title: `Elemental Overflow — ${caster.name}` },
    classes: ["trg-prime"],
    content: `<div class="trg-prime trg-check-dialog"><p>Elemental Mantle's ${esc(rider.damageType)} spills over: choose a creature within 10 feet of ${esc(target.name)} to suffer <strong>${amount}</strong> ${esc(rider.damageType)} damage.</p>`
      + `<select name="who">${near.map((a, i) => `<option value="${i}">${esc(a.name)}</option>`).join("")}</select></div>`,
    buttons: [
      { action: "ok", label: "Overflow", default: true, callback: (event, button) => Number(button.form?.elements?.who?.value ?? 0) },
      { action: "none", label: "No one" }
    ],
    rejectClose: false
  });
  if (typeof picked !== "number") return;
  const victim = near[picked];
  if (!victim) return;
  const { packet } = await h.applyTypedDamage(victim, { amount, type: rider.damageType, sourceLevel: Number(caster.system?.identity?.level ?? 0), sourceName: caster.name });
  if (roundKey) await caster.setFlag(MODULE_ID, "overflowUsed", { ...used, [String(victim.uuid).replace(/\./g, "|")]: roundKey });
  await h.postCard(caster, "Elemental Overflow", [h.line(await h.describeDamage(packet, victim.name))]);
}

/* ------------------------------------------------------------------ */
/* Conceal Faith, Perform Last Rites                                    */
/* ------------------------------------------------------------------ */

export async function onActionResolved({ actor, action, degree, targetActor, total }) {
  if (action?.key === "concealFaith") return concealFaith(actor, degree, total);
  if (action?.key === "performLastRites") return lastRites(actor, action, degree, targetActor);
  return null;
}

async function concealFaith(actor, degree, total) {
  if (!actor?.isOwner || !Number.isFinite(Number(total))) return;
  const h = helpers();
  const old = Array.from(actor.effects ?? []).filter((e) => e.getFlag?.(MODULE_ID, "concealFaith"));
  if (old.length) await actor.deleteEmbeddedDocuments("ActiveEffect", old.map((e) => e.id));
  const crit = ["critical", "heroic"].includes(lower(degree));
  const partial = lower(degree) === "partial";
  const extra = crit ? " Detect Deception against it takes −2 circumstance without contradicting evidence."
    : partial ? " Someone actively investigating gains +2 circumstance to Detect Deception." : "";
  await h.createEffectsOn(actor, [{
    name: `Conceal Faith — DC ${total}`,
    img: "icons/svg/mystery-man.svg",
    description: `Your concealed faith is recognised only by beating DC ${total} with Detect Deception (Sense Motive); a creature closely familiar with your true or assumed faith gains +2 circumstance.${extra} It lasts until you abandon the deception or openly practise your faith — delete this effect then.`,
    changes: [],
    flags: { [MODULE_ID]: { concealFaith: { dc: Number(total), degree: lower(degree) } } }
  }]);
  await h.postCard(actor, "Conceal Faith", [h.line(`The result, <strong>${total}</strong>, is now the DC to see through ${esc(actor.name)}'s concealed faith — recorded on their effects.${extra}`)], { secret: true });
}

async function lastRites(actor, action, degree, corpse) {
  if (!corpse) return;
  const h = helpers();
  const key = lower(degree);
  if (key === "fumble" || key === "blunder") {
    await h.createEffectsOn(corpse, [{
      name: "Last Rites — performed incorrectly",
      img: "icons/svg/skull.svg",
      description: "No further Perform Last Rites on these remains until the error has been identified with a successful Religion check. Delete this effect once it has.",
      changes: [],
      flags: { [MODULE_ID]: { lastRitesBlocked: true } }
    }]);
    await h.postCard(actor, "Perform Last Rites", [h.line(`The rite on <strong>${esc(corpse.name)}</strong> was performed incorrectly: Last Rites on it are refused until a successful Religion check identifies the error (delete the effect then).`)]);
    return;
  }
  const span = lastRitesSpan(key, Boolean(action?.variantApplied));
  if (!span) return;
  const words = SPAN_WORDS[span] ?? `${Math.round(span / 86400)} days`;
  await h.createEffectsOn(corpse, [{
    name: `Last Rites (${words})`,
    img: "icons/svg/holy-symbol.svg",
    description: `For ${words}, a magical attempt to possess these remains, animate them as Undead or bind the soul to them increases its Casting DC or relevant check DC by 2. Resurrection and the soul's voluntary return are not prevented.`,
    changes: [],
    duration: { seconds: span, startTime: Number(game.time?.worldTime ?? 0) },
    flags: { [MODULE_ID]: { lastRites: { dcIncrease: 2, until: Number(game.time?.worldTime ?? 0) + span } } }
  }]);
  await h.postCard(actor, "Perform Last Rites", [h.line(`<strong>${esc(corpse.name)}</strong> is committed to death: +2 to the Casting DC or check DC of anything that would possess, animate or bind it, for ${words} — recorded on the remains.`)]);
}

/** A botched rite refuses the next attempt on the same remains. Sync: the system asks before rolling. */
export function onActionAttempt({ action, targetActor }) {
  if (action?.key !== "performLastRites" || !targetActor) return true;
  const blocked = Array.from(targetActor.effects ?? []).some((e) => !e.disabled && e.getFlag?.(MODULE_ID, "lastRitesBlocked"));
  if (!blocked) return true;
  globalThis.ui?.notifications?.warn(`Perform Last Rites: the rite on ${targetActor.name} was performed incorrectly — a successful Religion check must identify the error first (then delete its effect).`);
  return false;
}

/* ------------------------------------------------------------------ */
/* The GM's half                                                        */
/* ------------------------------------------------------------------ */

export function registerPassSocket() {
  game.socket.on(SOCKET, async (data) => {
    if (data?.action !== "tempHP" || !game.user?.isGM) return;
    const active = game.users?.activeGM ?? game.users?.find?.((u) => u.isGM && u.active);
    if (active && active.id !== game.user.id) return;
    const target = await fromUuid(data.targetUuid).catch(() => null);
    const actor = target?.documentName === "Actor" ? target : target?.actor;
    if (actor) await helpers().grantTempHP(actor, Number(data.amount) || 0);
  });
}
