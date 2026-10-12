/**
 * Chapter 11 at runtime (0.8.0): the fifteen runes, declared to TRG Prime
 * 3.626.0's `registerRunes` as data the system reads, and the wondrous
 * items' `use` abilities, registered through `registerItemAutomation`.
 *
 * Everything with a number is a declaration — a bonus, an offer, a sense,
 * a weapon's own strike rider, an after-strike save ladder, a reroll, a
 * relief after healing, a Soul Drain ward, an aura for a minute — and the
 * few clauses no rail carries (Martyr's Aegis' transfer, Soul Mirror's
 * reaction, Banishing's Counteract on a Fumble) are said on the card.
 *
 * Same shape and helpers as feat-automations.mjs.
 */

import { helpers } from "./automations.mjs";

const SOUL_TRAITS = ["soul", "possession"];
const SAVE_VS = (traits, scope) => ({ checkTypes: ["save"], traits });

/** The fifteen runes, in `registerRunes`' shape. */
export const RUNES = [
  /* ───────────── Armour & shield runes ───────────── */
  {
    key: "anchoredSoul", name: "Anchored Soul", traits: "Invested, Soul, Warding", on: ["armour"], level: 7, price: 3000,
    effect: "+2 item bonus to saves against possession and soul displacement; you know when a possession attempt was resisted.",
    note: "Applied automatically: the +2 is pre-ticked on a save against a Soul or possession effect, offered otherwise. The awareness clause is a card line when a save against possession succeeds.",
    // PRE-TICKED WHERE THE SAVE'S TRAITS SETTLE IT, offered where they do not (0.8.1 — found live on 0.8.0: the +2 was offered-only, and a forced save opens no dialog). The two rows are the ally auras' own shape (aura-conditionals.mjs).
    declares: { conditionals: [
      { kind: "modifier", value: 2, type: "item", label: "against possession and soul displacement", scope: "Saving throws against possession and effects that forcibly remove, control or displace your soul", auto: true, when: SAVE_VS(SOUL_TRAITS) },
      { kind: "modifier", value: 2, type: "item", label: "against possession and soul displacement (the table decides)", scope: "Saving throws against possession and effects that forcibly remove, control or displace your soul", when: { checkTypes: ["save"], not: { traits: SOUL_TRAITS } } }
    ] }
  },
  {
    key: "intercession", name: "Intercession", traits: "Chance, Invested, Soul, Warding", on: ["shield"], level: 9, price: 4200,
    activate: "Reaction", effect: "An ally within 10 feet who fails a save against Fear, possession or a Soul effect may reroll it. 1/day.",
    note: "Offered the moment an ally within 10 feet fails such a save (once a day; the shield's reaction): the save is rerolled and the second result stands.",
    declares: { saveReroll: { degrees: ["partial", "failure", "fumble", "blunder"], traits: ["fear", "possession", "soul"], radius: 10, ally: true, frequency: "daily" } }
  },
  {
    key: "lastVigil", name: "Last Vigil", traits: "Healing, Invested, Soul", on: ["armour"], level: 6, price: 2000,
    activate: "Reaction", effect: "After a Healing spell heals you: reduce Fatigued or Sickened by 1 (a 4 PP spell: Dazed or Weakened; 6 PP: Injured). 1/day.",
    note: "Offered after a Healing-trait spell heals you, once a day: which condition to reduce, from those the spell's PP reached and you hold.",
    declares: { onHealed: { frequency: "daily", steps: [{ minPP: 0, conditions: ["fatigued", "sickened"] }, { minPP: 4, conditions: ["dazed", "weakened"] }, { minPP: 6, conditions: ["injured"] }] } }
  },
  {
    key: "martyrsAegis", name: "Martyr's Aegis", traits: "Healing, Invested, Warding", on: ["armour", "shield"], level: 11, armourPrice: 11000, shieldPrice: 7700,
    activate: "Reaction", effect: "Transfer up to half an ally's remaining HP damage (within 10 feet) to yourself, after their DR and Resistance. 1/minute.",
    note: "Offered automatically, once a minute: when an ally within 10 feet takes HP damage, the wearer may take up to half of what remains after the ally's defences — not reduced by the wearer's own, not passed on, never below 1 HP. The prompt appears to whoever applies the damage (usually the GM).",
    declares: { damageShare: { radius: 10, frequency: "1/minute" } }
  },
  {
    key: "sanctuary", name: "Sanctuary", traits: "Focus, Invested, Soul, Warding", on: ["armour", "shield"], level: 11, armourPrice: 11000, shieldPrice: 7700,
    activate: "Engage (1 AP)", effect: "For 1 minute, a 10-foot sanctuary: you and willing allies within it gain +2 status to saves against Fear, possession, Soul Drain and Soul effects. Then expended until Refocus.",
    note: "Press Sanctuary on the item (Engage, 1 AP): for 1 minute allies within 10 feet carry the +2 status against Fear, possession, Soul Drain and Soul effects as an aura, and so do you. The rune is then expended; Refocus restores it.",
    declares: {
      action: {
        verb: "Engage", apCost: 1, frequency: "focus", durationSeconds: 60,
        describe: "For <strong>1 minute</strong> you emanate a 10-foot spiritual sanctuary: you and willing allies within it gain a +2 status bonus to saving throws against Fear, possession, Soul Drain and effects with the Soul trait.",
        effect: {
          auras: [{ id: "sanctuary", name: "Sanctuary", kind: "ally", radius: 10, triggers: ["turnStart", "enter"], save: "", appliesTo: "Allies", outcomes: {}, immunitySeconds: 0, text: "Sanctuary — +2 status to saving throws against Fear, possession, Soul Drain and Soul effects.", grants: { kind: "modifier", value: 2, type: "status", checkTypes: ["save"], traits: ["fear", "possession", "soul", "soul drain"], scope: "Saving throws against Fear, possession, Soul Drain and Soul effects (Sanctuary)" } }],
          conditionals: [{ kind: "modifier", value: 2, type: "status", label: "Sanctuary", scope: "Saving throws against Fear, possession, Soul Drain and Soul effects", when: { checkTypes: ["save"], traits: ["fear", "possession", "soul", "soul drain"] } }]
        }
      }
    }
  },
  {
    key: "soulMirror", name: "Soul Mirror", traits: "Invested, Soul, Warding", on: ["shield"], level: 12, price: 11200,
    activate: "Reaction", effect: "On a Critical or Heroic save against possession, the possessor makes a Will save against your Level DC: Frightened 1–3 and barred from possessing. 1/minute.",
    note: "Offered automatically, once a minute: after a Critical or Heroic save against a possession-trait effect, the possessor (when the roll knows it) rolls Will against your Level DC — Success: Frightened 1 until the end of its next turn; Failure: Frightened 2 and it cannot possess you for 1 minute; Fumble: Frightened 3 and it cannot possess anyone for 1 minute. Without a known possessor the card asks the GM to roll it.",
    declares: { possessionMirror: { frequency: "1/minute" } }
  },
  {
    key: "soulWard", name: "Soul Ward", traits: "Invested, Soul, Warding", on: ["armour"], level: 11, price: 11000,
    activate: "Reaction", effect: "Soul Drain you would gain is reduced by 5 (10 with Potency III or better). 1/minute.",
    note: "Applied automatically: Soul Drain you gain is reduced by 5 — by 10 while the armour bears Potency III or better — once a minute. Never Soul Drain you already carry.",
    declares: { soulDrainReduce: { amount: 5, potencyIII: 10, frequency: "1/minute" } }
  },
  {
    key: "veilwatch", name: "Veilwatch", traits: "Insight, Invested, Soul", on: ["armour"], level: 7, price: 3000,
    effect: "Spirit Sense as a tertiary sense (30 feet): presence and general direction of spirits, incorporeal Undead, haunts and possession when Searching.",
    note: "Applied automatically: Spirit Sense (30 feet, tertiary) joins your senses while the armour is worn. It gives presence and direction, never identity or a target.",
    declares: { sense: { category: "tertiary", modality: "spiritual", fixedFeet: 30, name: "Spirit Sense (Veilwatch)", finds: "disembodied spirits, incorporeal undead, haunts and active possession" } }
  },

  /* ───────────── Weapon runes ───────────── */
  {
    key: "banishing", name: "Banishing", traits: "Essence, Invested, Invocation, Soul", on: ["weapon"], level: 12, price: 11000,
    activate: "Free (0 AP)", effect: "Once a round, a Critical hit on a spirit, incorporeal Undead or possessor: 2d6 secondary essence, and a Will save against your Level DC that bars possession.",
    note: "Applied on a Critical against an Undead creature, once a round: 2d6 essence on the damage card, then the creature's Will save against your Level DC with the printed ladder. Against a disembodied spirit or a possessor the system cannot see, the GM adds it. A Fumble's Counteract of a possession is the table's.",
    declares: {
      strikeRider: { dice: "2d6", damageType: "essence", onCritical: true, targetTypes: ["undead"], oncePerRound: true },
      afterStrike: { save: "will", onCritical: true, oncePerRound: true, targetTypes: ["undead"], outcomes: { critical: "Unaffected beyond the damage.", success: "It cannot attempt possession until the beginning of your next turn.", failure: "It cannot attempt possession for 1 minute.", fumble: "As Failure; if it is possessing a creature, attempt to Counteract the possession at your level (the table resolves it)." } }
    }
  },
  {
    key: "exorcist", name: "Exorcist", traits: "Essence, Invested, Soul", on: ["weapon"], level: 10, price: 8000,
    effect: "The weapon strikes incorporeal spirits and incorporeal Undead normally, and a possessor you can target without harming its host.",
    note: "Applied automatically: an incorporeal creature's immunity to non-magical attacks and its resistance do not apply to this weapon (Ghost Touch's rail). Striking a possessor without its host is the table's.",
    declares: { ghostTouch: true }
  },
  {
    key: "merciful", name: "Merciful", traits: "Healing, Invested, Soul", on: ["weapon"], level: 5, price: 1250,
    effect: "An attack that would reduce a living creature to 0 HP may leave it Stable instead; the Strike cannot kill through excess damage.",
    note: "Offered the moment a blow with the weapon reduces a living creature to 0 HP: a yes leaves it Stable (Dying 1, the next Dying Check cannot worsen it). The damage and any injury stand.",
    declares: { stabiliseAtZero: true }
  },
  {
    key: "remembrance", name: "Remembrance", traits: "Insight, Invested", on: ["weapon"], level: 7, price: 3000,
    activate: "Free (0 AP)", effect: "Once a round on a Critical hit: a free Recall Knowledge against the creature struck (+2 item if it is a Studied Target or Subject of Inquisition).",
    note: "The damage card of a Critical says it: Recall Knowledge against the creature as a Free action now. The +2 item against a Studied Target or Subject is offered on Recall Knowledge while the weapon is wielded.",
    declares: {
      onCritical: { text: "you may attempt a Recall Knowledge check against the creature struck as a Free (0 AP) action now (+2 item if it is your Studied Target or Subject of Inquisition)." },
      conditionals: [{ kind: "modifier", value: 2, type: "item", label: "a Studied Target or Subject of Inquisition", scope: "Recall Knowledge against a creature that is your Studied Target or Subject of Inquisition, after a Critical hit with the weapon", when: { checkTypes: ["skill"], actions: ["recallKnowledge"] } }]
    }
  },
  {
    key: "requiem", name: "Requiem", traits: "Essence, Invested, Invocation", on: ["weapon"],
    tiers: [{ tier: "I", level: 6, price: 1400, dice: "1d6" }, { tier: "II", level: 11, price: 8000, dice: "2d6" }, { tier: "III", level: 16, price: 60000, dice: "3d6" }],
    effect: "The first successful Strike each round against an Undead or Unliving creature inflicts 1d6 / 2d6 / 3d6 secondary essence damage.",
    note: "Applied automatically on the damage card: the tier's essence on the first hit each round against a creature with the Undead or Unliving trait.",
    declares: { strikeRider: { damageType: "essence", targetTraits: ["undead", "unliving"], oncePerRound: true } }
  },
  {
    key: "soulchain", name: "Soulchain", traits: "Invested, Save, Soul, Warding", on: ["weapon"], level: 12, price: 11000,
    activate: "Free (0 AP)", effect: "Once a round after a successful Strike: a Will save against your Level DC, or the target cannot become Incorporeal, leave or begin a possession, or transfer its soul until your next turn.",
    note: "Applied automatically after a hit, once a round: the creature's Will save against your Level DC and the printed ladder on the damage card. A Fumble's second save is the table's.",
    declares: { afterStrike: { save: "will", oncePerRound: true, outcomes: { critical: "Unaffected.", success: "It cannot voluntarily use possession until the beginning of your next turn.", failure: "Until the beginning of your next turn it cannot voluntarily become Incorporeal, leave its host through possession, begin a new possession or transfer its soul into another vessel.", fumble: "As Failure; if it is possessing a creature, it must immediately attempt a new save against the possession-ending conditions of the effect that created the possession (the table resolves it)." } } }
  },
  {
    key: "vowkeeper", name: "Vowkeeper", traits: "Divinity, Invested, Soul", on: ["weapon"], level: 9, price: 6000,
    effect: "Requires a Deific Aspect. While acting in furtherance of the day's spoken vow, the weapon adds your class bonus to damage rolls.",
    note: "Offered on the weapon's damage rolls: your class bonus, ticked while you act in furtherance of the vow you spoke at daily preparation. The vow itself, and whether it was kept, is the table's.",
    declares: { conditionals: [{ kind: "modifier", valueFrom: "classBonus", type: "untyped", label: "pursuing the day's vow", scope: "Damage rolls with the weapon while actively acting in furtherance of the vow spoken at daily preparation (requires a Deific Aspect)", when: { checkTypes: ["damage"] } }] }
  }
];

/* ───────────── Wondrous `use` abilities ───────────── */

const ITEM_AUTOMATIONS = {
  // ANCESTOR'S LOCKET — Past-Life Insight: "Trigger You attempt a Recall
  // Knowledge check … You gain Advantage on the triggering check." 1/day.
  pastLifeInsight: {
    hint: "Queue advantage on your next Recall Knowledge check (1/day).",
    async use(actor, item) {
      const { line, postCard, addPendingModifier } = helpers();
      await addPendingModifier(actor, { kind: "advantage", label: `${item.name} — Past-Life Insight`, scope: "Your next Recall Knowledge check", oneShot: true });
      await postCard(actor, `${item.name} — Past-Life Insight`, [line("<strong>Advantage</strong> is queued for your next Recall Knowledge check — tick it in that roll's dialog.")]);
      return true;
    }
  },
  // ARCHIVIST'S CONCORDANCE — Perfect Reference: Recite from the Text as a
  // Free action instead of its normal cost (1/day; requires the feat).
  perfectReference: {
    hint: "Recite from the Text as a Free (0 AP) action this once (1/day).",
    async use(actor, item) {
      const { line, postCard } = helpers();
      const recite = Array.from(actor.items ?? []).find((i) => /^recite from the text$/i.test(i.name));
      if (!recite) { ui.notifications.warn(`${item.name}: Perfect Reference requires Recite from the Text.`); return false; }
      await postCard(actor, `${item.name} — Perfect Reference`, [line("<strong>Recite from the Text</strong> is a <strong>Free (0 AP)</strong> action this once — press Use on the feat now and put the AP it asks for back."), line("<em>All its other requirements stand.</em>")]);
      return true;
    }
  },
  // MANTLE OF MANY LIVES — Borrowed Experience: one rank in a skill you
  // have none in, for 10 minutes (two for a Rhevani, within their maximum).
  borrowedExperience: {
    hint: "Treat yourself as having 1 rank (a Rhevani: 2) in a skill you have none in, for 10 minutes (1/day).",
    async use(actor, item) {
      const { line, postCard, chooseFromList, createEffectsOn } = helpers();
      const skills = Object.entries(actor.system?.skills ?? {}).filter(([, s]) => Number(s?.ranks ?? 0) <= 0).map(([key, s]) => [key, s.label ?? key]);
      if (!skills.length) { ui.notifications.warn(`${item.name}: you have ranks in every skill.`); return false; }
      const key = await chooseFromList(`${item.name} — Borrowed Experience`, "A skill you have no ranks in", skills);
      if (!key) return false;
      const rhevani = /\brhevani\b/i.test(String(actor.system?.details?.traits ?? "")) || Array.from(actor.items ?? []).some((i) => i.type === "race" && /rhevani/i.test(i.name));
      const ranks = rhevani ? 2 : 1;
      const label = skills.find(([k]) => k === key)?.[1] ?? key;
      await createEffectsOn(actor, [{
        name: `${item.name} — Borrowed Experience: ${label}`,
        img: item.img,
        origin: item.uuid,
        changes: [{ key: `system.skills.${key}.ranks`, mode: 2, value: String(ranks) }],
        duration: { seconds: 600, startTime: Number(game.time?.worldTime ?? 0) },
        description: `Treated as possessing ${ranks} rank${ranks > 1 ? "s" : ""} in ${label} for 10 minutes. Opens skill actions requiring the rank; satisfies no prerequisite for a permanent option.`,
        flags: { "trg-prime": { spellEffect: true, spellEffectEnd: Number(game.time?.worldTime ?? 0) + 600, featSource: `${item.id}:borrowed` } }
      }]);
      await postCard(actor, `${item.name} — Borrowed Experience`, [line(`<strong>${label}</strong>: ${ranks} rank${ranks > 1 ? "s" : ""} for 10 minutes${rhevani ? " (Rhevani)" : ""}. Actions requiring the rank are open; no permanent prerequisite is met.`)]);
      return true;
    }
  },
  // CENSER OF QUIET THRESHOLDS — Reveal the Unseen: a minute's outline of
  // spirits within the smoke. INCENSE OF THE OPEN VEIL and the ASHEN
  // CENSER print the same perception; each is a card and a 1-minute effect.
  revealTheUnseen: {
    hint: "While incense burns: for 1 minute spirits and incorporeal Undead in the smoke are outlined — their location is known (1/day).",
    async use(actor, item) {
      const { line, postCard, createEffectsOn } = helpers();
      await createEffectsOn(actor, [{
        name: `${item.name} — Reveal the Unseen`, img: item.img, origin: item.uuid, changes: [],
        duration: { seconds: 60, startTime: Number(game.time?.worldTime ?? 0) },
        description: "Disembodied spirits and incorporeal Undead within the smoke are faintly outlined: their location can be determined. Not their identity or allegiance; Incorporeal stands; mundane weapons still cannot harm them.",
        flags: { "trg-prime": { spellEffect: true, spellEffectEnd: Number(game.time?.worldTime ?? 0) + 60, featSource: `${item.id}:reveal` } }
      }]);
      await postCard(actor, `${item.name} — Reveal the Unseen`, [line("For <strong>1 minute</strong>, disembodied spirits and incorporeal Undead within the incense smoke are outlined — their <strong>location</strong> can be determined."), line("<em>Requires incense burning in the censer. Not identity or allegiance; Incorporeal stands; mundane attacks still cannot reach them.</em>")]);
      return true;
    }
  },
  // WITNESS — recall a recorded oath (1 AP, Concentrate). The oaths
  // themselves are the table's record; the card says the rule.
  recallOath: {
    hint: "1 AP (Concentrate): recall an oath the hammer recorded, word for word.",
    async use(actor, item) {
      const { line, postCard, enterText } = helpers();
      const which = await enterText(`${item.name} — Recall an Oath`, "Which recorded oath? (the hammer holds up to its item level; the oldest is forgotten beyond that)");
      if (which === null) return false;
      await postCard(actor, `${item.name} — Recall an Oath`, [line(`<strong>${which || "The oath"}</strong> is recalled exactly as it was spoken — the hammer remembers an oath's significant wording for 1 year.`)]);
      return true;
    }
  },
  // LANTERN OF THE LAST ROAD — one Use, two abilities: Open the Last Road
  // (3 AP, 1/day, 10 minutes) or Close the Gate (2 AP). The day's Open is
  // marked on the item's own day map (cleared at daily preparation).
  lanternOfTheLastRoad: {
    hint: "Open the Last Road (3 AP, 1/day: spirits may manifest for 10 minutes) or Close the Gate (2 AP: banish a possessor from the targeted creature).",
    async use(actor, item) {
      const { chooseFromList } = helpers();
      const opened = Boolean(item.flags?.["trg-prime"]?.runeUsedToday?.openTheLastRoad);
      const pick = await chooseFromList(item.name, "Which ability?", [
        ["open", `Open the Last Road — 3 AP, 1/day${opened ? " (used today)" : ""}`],
        ["close", "Close the Gate — 2 AP, target the possessed creature"]
      ]);
      if (!pick) return false;
      if (pick === "open") {
        if (opened) { ui.notifications.warn(`${item.name}: Open the Last Road has been used today.`); return false; }
        const { spendAP } = await import("./automations.mjs");
        if (!await spendAP(actor, "Open the Last Road", 3)) return false;
        const ran = await ITEM_AUTOMATIONS.openTheLastRoad.use(actor, item);
        if (ran) await item.setFlag("trg-prime", "runeUsedToday", { ...(item.flags?.["trg-prime"]?.runeUsedToday ?? {}), openTheLastRoad: true });
        return ran;
      }
      const { spendAP } = await import("./automations.mjs");
      if (!await spendAP(actor, "Close the Gate", 2)) return false;
      return ITEM_AUTOMATIONS.closeTheGate.use(actor, item);
    }
  },
  openTheLastRoad: {
    hint: "3 AP, 1/day: for 10 minutes willing spirits within 60 feet may manifest; hostile possession within the area is at −2 status.",
    async use(actor, item) {
      const { line, postCard, createEffectsOn } = helpers();
      await createEffectsOn(actor, [{
        name: `${item.name} — Open the Last Road`, img: item.img, origin: item.uuid, changes: [],
        duration: { seconds: 600, startTime: Number(game.time?.worldTime ?? 0) },
        description: "Willing disembodied spirits within 60 feet may manifest enough to be seen and heard; hostile possession attempts originating within the area suffer −2 status to their check or save DC.",
        flags: { "trg-prime": { spellEffect: true, spellEffectEnd: Number(game.time?.worldTime ?? 0) + 600, featSource: `${item.id}:road` } }
      }]);
      await postCard(actor, `${item.name} — Open the Last Road`, [line("For <strong>10 minutes</strong>, willing disembodied spirits within 60 feet may manifest sufficiently to be seen and heard by everyone present; a spirit may end its own manifestation at any time."), line("<em>Hostile possession attempts originating within the area suffer a −2 status penalty to the relevant check or save DC — the table applies it to the possessor's roll.</em>")]);
      return true;
    }
  },
  closeTheGate: {
    hint: "2 AP: remove a possessing spirit from the targeted creature; it is banished and may not possess that target again.",
    async use(actor, item) {
      const { line, postCard } = helpers();
      const target = Array.from(game.user?.targets ?? [])[0]?.actor ?? null;
      if (!target) { ui.notifications.warn(`${item.name}: target the possessed creature first.`); return false; }
      await postCard(actor, `${item.name} — Close the Gate`, [line(`The possessing spirit is removed from <strong>${target.name}</strong>: it is <strong>banished</strong> and may not possess ${target.name} again.`), line("<em>End the possession's effect on the sheet; the spirit's own fate is the table's.</em>")]);
      return true;
    }
  }
};

/** Hand the runes and the automations to the system. */
export function registerMagicItems(api, moduleId) {
  if (typeof api.registerRunes === "function") api.registerRunes(RUNES, moduleId);
  if (typeof api.registerItemAutomation === "function") {
    for (const [name, spec] of Object.entries(ITEM_AUTOMATIONS)) api.registerItemAutomation(name, spec, moduleId);
  }
}

export { ITEM_AUTOMATIONS };
