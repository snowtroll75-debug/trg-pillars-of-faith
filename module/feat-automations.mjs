/**
 * Use-driven automations for Pillars of Faith's Chapter 5 feats and the
 * abilities the archetypes hand over.
 *
 * Same shape and helpers as automations.mjs and class-automations.mjs.
 * Only what a player DOES is here — a Focus activation, a daily choice,
 * a reaction, a designation. Everything a feat grants unconditionally
 * (a bonus, a sense, an innate spell, a lore skill, a natural attack) is
 * data on the pack item.
 */
import { SYSTEM_ID, FEAT_SOURCE_FLAG, helpers, spendAP, spendReaction, spendUse, firstTarget } from "./automations.mjs";

const level = (actor) => Math.max(1, Number(actor.system?.identity?.level ?? 1) || 1);
const hasFeat = (actor, name) => Array.from(actor.items ?? []).some((i) => (i.type === "feat" || i.type === "ability") && String(i.name).toLowerCase() === String(name).toLowerCase());
const cap = (s) => s ? s[0].toUpperCase() + s.slice(1) : s;

function ownEffects(target, key) {
  return Array.from(target.effects ?? []).filter((e) => e.getFlag?.(SYSTEM_ID, FEAT_SOURCE_FLAG) === key);
}

/** The commonest shape: spend the use (and reaction), say what happens. */
function focusCard(title, lines, { reaction = false, ap = 0, keepUse = false } = {}) {
  return {
    async use(actor, item) {
      const { line, postCard } = helpers();
      if (ap && !(await spendAP(actor, title, ap))) return;
      if (reaction && !(await spendReaction(actor, title))) return;
      if (!keepUse && !(await spendUse(item, title))) return;
      const text = typeof lines === "function" ? lines(actor, item) : lines;
      await postCard(actor, title, [...text.map((t) => line(t)), ...(reaction && game.combat?.started ? [line("Reaction spent.")] : []), ...(keepUse ? [] : [line("<em>Use spent — Refocus or Daily Preparation restores it.</em>")])]);
    }
  };
}

/** A one-shot pending modifier on the target (or self), with a card. */
function queueOn(title, { value, type = "circumstance", scope, needsTarget = false, selfIfNone = true }) {
  return {
    async use(actor) {
      const { line, postCard, addPendingModifier } = helpers();
      const target = firstTarget() ?? (selfIfNone ? actor : null);
      if (!target || (needsTarget && !firstTarget())) {
        ui.notifications.warn(`${title}: target the creature first.`);
        return;
      }
      await addPendingModifier(target, { value, type, label: title, scope, oneShot: true });
      await postCard(actor, title, [line(`<strong>${target.name}</strong> has a ${value > 0 ? "+" : ""}${value} ${type} bonus queued: ${scope}.`)]);
    }
  };
}

/** A timed effect on self carrying changes and/or conditionals, toggled by Use. */
function selfEffect(title, { changes = [], conditionals = [], seconds = 60, rounds = 10, description, ap = 1, focus = true, extra = () => ({}) }) {
  return {
    async use(actor, item) {
      const { line, postCard, replaceFeatEffect } = helpers();
      const standing = ownEffects(actor, item.id);
      if (standing.length) {
        await actor.deleteEmbeddedDocuments("ActiveEffect", standing.map((e) => e.id));
        await postCard(actor, title, [line("<strong>Ended.</strong>")]);
        return;
      }
      if (ap && !(await spendAP(actor, title, ap))) return;
      if (focus && !(await spendUse(item, title))) return;
      const more = extra(actor, item);
      await replaceFeatEffect(actor, item, {
        name: title, img: item.img,
        description: typeof description === "function" ? description(actor) : description,
        duration: { seconds, rounds },
        changes: [...changes, ...(more.changes ?? [])],
        flags: { [SYSTEM_ID]: { conditionals: [...conditionals, ...(more.conditionals ?? [])], ...(more.flags ?? {}) } }
      });
      await postCard(actor, title, [line(typeof description === "function" ? description(actor) : description), line(`<em>${rounds ? "Lasts 1 minute; " : ""}Use again to end it early.${focus ? " Focus use spent — Refocus restores it." : ""}</em>`)]);
    }
  };
}

/* ================================================================== */
/* Racial — Morrowmade and Vesperyn                                     */
/* ================================================================== */

const adaptiveTissue = {
  hint: "Reaction (Focus): Resistance to the acid, cold, electricity, fire or poison damage you just suffered until the end of your next turn.",
  async use(actor, item) {
    const { line, postCard, chooseFromList, replaceFeatEffect } = helpers();
    const type = await chooseFromList("Adaptive Tissue", "The damage type just suffered", ["acid", "cold", "electricity", "fire", "poison"].map((t) => [t, cap(t)]));
    if (!type) return;
    if (!(await spendReaction(actor, "Adaptive Tissue"))) return;
    if (!(await spendUse(item, "Adaptive Tissue"))) return;
    await replaceFeatEffect(actor, item, { name: `Adaptive Tissue: ${type} resistance`, img: item.img, description: `Resistance to ${type} until the end of your next turn.`, duration: { rounds: 2 }, changes: [{ key: "system.combat.resistances", mode: 2, value: `, ${type}`, priority: 20 }] });
    await postCard(actor, "Adaptive Tissue", [line(`Your flesh adapts: <strong>Resistance to ${type}</strong> until the end of your next turn.`), line("<em>Focus use spent — Refocus restores it.</em>")]);
  }
};

const graftedArmament = {
  hint: "Choose Bite, Claw, Bone Spur or Heavy Appendage: the natural attack joins your weapons.",
  async use(actor, item) {
    const { line, postCard, chooseFromList } = helpers();
    const held = Array.from(actor.items ?? []).find((i) => i.type === "weapon" && i.flags?.[SYSTEM_ID]?.grantedBy?.sourceId === item.id);
    if (held) { ui.notifications.info(`Grafted Armament: your ${held.name} is already grafted. Delete it to choose again.`); return; }
    const picked = await chooseFromList("Grafted Armament", "The natural attack", [["Bite (Grafted)", "Bite — 1d8 P, Finesse"], ["Claw (Grafted)", "Claw — 1d6 S, Agile, Finesse, Versatile (P)"], ["Bone Spur (Grafted)", "Bone Spur — 1d6 P, Deadly"], ["Heavy Appendage (Grafted)", "Heavy Appendage — 1d8 B, Shove"]]);
    if (!picked) return;
    const pack = game.trgPrime.modules.contentPack("companions");
    const idx = await pack.getIndex();
    const entry = Array.from(idx.values()).find((e) => e.name === picked);
    if (!entry) { ui.notifications.warn(`Grafted Armament: "${picked}" is not in the natural-attacks pack.`); return; }
    const data = (await pack.getDocument(entry._id)).toObject(); delete data._id;
    foundry.utils.setProperty(data, `flags.${SYSTEM_ID}.grantedBy`, { sourceId: item.id, sourceName: item.name, requested: picked });
    await actor.createEmbeddedDocuments("Item", [data]);
    await postCard(actor, "Grafted Armament", [line(`<strong>${picked}</strong> is part of your anatomy now — on your weapons, and it cannot normally be disarmed.`)]);
  }
};

const perfectedAberration = selfEffect("Perfected Aberration", {
  changes: [{ key: "system.combat.naturalArmourBase.natural", mode: 2, value: "1", priority: 20 }, { key: "system.combat.immunities", mode: 2, value: ", bleed", priority: 20 }],
  conditionals: [
    { kind: "advantage", label: "Perfected Aberration", auto: true, scope: "Saving throws against Disease and Poison", when: { checkTypes: ["save"], traits: ["disease", "poison"] } },
    { kind: "advantage", label: "Perfected Aberration", auto: false, scope: "Saving throws and flat checks to resist, reduce or recover from critical injuries and body-altering magic", when: { checkTypes: ["save", "flat"], not: { traits: ["disease", "poison"] } } }
  ],
  description: "Violent adaptation for 1 minute: Fast Healing 1 (heal 1 at the start of each of your turns — a note), Immunity to Bleed, Base DR +1, advantage against Disease, Poison, critical-injury recovery and body-altering effects."
});

const redundantAnatomy = { hint: "Once per day, after a critical injury is determined: one step less severe.", ...focusCard("Redundant Anatomy", ["The critical injury is <strong>one step less severe</strong>: Deadly becomes Serious, Serious becomes Minor, Minor is negated — apply the lesser result."]) };

const bloodAwakened = selfEffect("Blood Awakened", {
  changes: [{ key: "system.combat.movement.land.other", mode: 2, value: "5", priority: 20 }],
  conditionals: [
    { kind: "advantage", label: "Blood Awakened", auto: false, scope: "Diplomacy, Bluff and Demoralise checks against living humanoids", when: { checkTypes: ["skill"], subjects: ["diplomacy", "deception", "intimidate"] } }
  ],
  description: "Your vampiric inheritance awakens for 1 minute: Fast Healing 1 (a note), +5 ft Speed, advantage on Diplomacy, Bluff and Demoralise against living humanoids; a Bite or Fangs attack counts as Magical and adds 1d6 essence once a round on a hit against a living creature (add it to the roll)."
});

const eternalManifestation = {
  hint: "1 AP: manifest your Eternal ancestry for 1 minute — Magical aligned attacks, +1d6 secondary aligned damage once a round, and your heritage's immunity.",
  async use(actor, item) {
    const { line, postCard, replaceFeatEffect } = helpers();
    const standing = ownEffects(actor, item.id);
    if (standing.length) { await actor.deleteEmbeddedDocuments("ActiveEffect", standing.map((e) => e.id)); await postCard(actor, "Eternal Manifestation", [line("<strong>Ended.</strong>")]); return; }
    const heritage = ["Balance-Blooded", "Chaos-Blooded", "Dawn-Blooded", "Dread-Blooded", "Order-Blooded"].find((h) => hasFeat(actor, h))
      ?? (["Lightwoven", "Seraphel"].some((h) => hasFeat(actor, h)) ? "Dawn-Blooded" : null);
    if (!heritage) { ui.notifications.warn("Eternal Manifestation: no Eternal Blood Heritage feat on the sheet."); return; }
    if (!(await spendAP(actor, "Eternal Manifestation"))) return;
    const IMMUNITY = { "Balance-Blooded": ", mental", "Chaos-Blooded": ", stunned", "Dread-Blooded": ", poison, sleep", "Dawn-Blooded": ", disease, poison", "Order-Blooded": ", confusion, fear" };
    const damageType = heritage === "Balance-Blooded" ? "Essence" : heritage.replace("-Blooded", "").replace("Dawn", "Good").replace("Dread", "Evil");
    await replaceFeatEffect(actor, item, {
      name: `Eternal Manifestation (${heritage})`, img: item.img,
      description: `Attacks are Magical and carry your aligned trait; +1d6 secondary ${damageType} damage once a round on your first damaging Strike; immunity per your heritage. 1 minute.`,
      duration: { seconds: 60, rounds: 10 },
      changes: [{ key: "system.combat.immunities", mode: 2, value: IMMUNITY[heritage], priority: 20 }],
      flags: { [SYSTEM_ID]: { strikeDamageRider: { dice: "1d6", label: `Eternal Manifestation (${damageType})`, oncePerRound: true } } }
    });
    await postCard(actor, "Eternal Manifestation", [line(`Something older shows through: for 1 minute your attacks are <strong>Magical</strong> and aligned, the first damaging Strike each round adds <strong>+1d6 ${damageType}</strong> (automatic), and you are immune to ${IMMUNITY[heritage].slice(2)}.`), line("<em>Use again to end it.</em>")]);
  }
};

const unboundImpulse = { hint: "Once per day: reduce the Stunned you would gain by 1.", ...focusCard("Unbound Impulse", ["Reduce the <strong>Stunned</strong> value you would gain by 1 (to a minimum of 0) — apply the lesser value."]) };

/* ================================================================== */
/* Racial — Rhevani, Eshari, Kethrani, Myrathi, core races             */
/* ================================================================== */

const continuityUnbroken = { hint: "Reaction (Focus): reroll a failed save against possession or identity-altering Mental effects, with advantage.", ...focusCard("Continuity Unbroken", ["<strong>Reroll the failed saving throw with advantage</strong> from your sheet and keep the better result."], { reaction: true }) };
const notYetFinished = {
  hint: "Reaction (Focus): stay at 1 HP instead of 0; Fatigued 1.",
  async use(actor, item) {
    const { line, postCard } = helpers();
    if (!(await spendReaction(actor, "Not Yet Finished"))) return;
    if (!(await spendUse(item, "Not Yet Finished"))) return;
    await actor.update({ "system.resources.hp.value": Math.max(1, Number(actor.system.resources?.hp?.value ?? 0)) });
    const fatigued = Number(actor.getConditionValue?.("fatigued") ?? 0);
    await actor.toggleStatusEffect("fatigued", { value: fatigued + 1 });
    await postCard(actor, "Not Yet Finished", [line("You refuse: you remain at <strong>1 HP</strong> and gain <strong>Fatigued 1</strong>."), line("<em>Cannot prevent death from exceeding your Death State or an effect that kills outright. Focus use spent.</em>")]);
  }
};
const pilgrimOfManyLives = { hint: "Once per day: a Fumble on Sense Direction counts as a Failure.", ...focusCard("Pilgrim of Many Lives", ["The Fumble on Sense Direction is a <strong>Failure</strong> instead."]) };
const unfinishedDuty = { hint: "Once per day: Dying does not increase at the end of this turn.", ...focusCard("Unfinished Duty", ["Your <strong>Dying does not increase</strong> at the end of this turn — the GM leaves it as it stands."]) };

/** A daily innate spell choice: fetch from the federated spells pack, land it innate with Focus, replace yesterday's. */
function dailyInnateSpell(title, { prompt, filter, usesPerDay = "1", cantrip = false }) {
  return {
    hint: `Daily preparation: choose the day's spell — it lands as an innate Focus ${cantrip ? "cantrip" : "spell"} until your next choice.`,
    async use(actor, item) {
      const { line, postCard, chooseFromList } = helpers();
      const pack = game.trgPrime.modules.contentPack("spells");
      const index = await pack.getIndex({ fields: ["system.tradition", "system.ppCost", "system.specialist", "system.traits"] });
      const eligible = Array.from(index.values()).filter((e) => filter(e, actor)).sort((a, b) => a.name.localeCompare(b.name));
      const picked = await chooseFromList(title, prompt, eligible.map((e) => [e._id, `${e.name} (PP ${e.system?.ppCost ?? 0})`]));
      if (!picked) return;
      const stale = Array.from(actor.items ?? []).filter((s) => s.type === "spell" && s.flags?.[SYSTEM_ID]?.grantedBy?.sourceId === item.id);
      if (stale.length) await actor.deleteEmbeddedDocuments("Item", stale.map((s) => s.id));
      const data = (await pack.getDocument(picked)).toObject(); delete data._id;
      data.system.innate = true;
      data.system.usesPerDay = usesPerDay;
      data.system.usesValue = Number(usesPerDay) || 0;
      if (!/\bFocus\b/.test(data.system.traits ?? "")) data.system.traits = [data.system.traits, "Focus"].filter(Boolean).join(", ");
      foundry.utils.setProperty(data, `flags.${SYSTEM_ID}.grantedBy`, { sourceId: item.id, sourceName: item.name, requested: data.name });
      await actor.createEmbeddedDocuments("Item", [data]);
      await postCard(actor, title, [line(`<strong>${data.name}</strong> is yours today as an innate ${cantrip ? "cantrip" : "spell"} with the Focus trait${stale.length ? ` (${stale.map((s) => s.name).join(", ")} fades)` : ""}.`)]);
    }
  };
}
const divinity = (e) => String(e.system?.tradition ?? "").toLowerCase().includes("divinity") && !e.system?.specialist;
const prayerFromAnotherLife = dailyInnateSpell("Prayer from Another Life", { prompt: "Divinity cantrip (not Guidance)", cantrip: true, filter: (e) => divinity(e) && /\bCantrip\b/i.test(e.system?.traits ?? "") && e.name !== "Guidance" });
const rememberedLiturgy = dailyInnateSpell("Remembered Liturgy", { prompt: "PP 2 Divinity spell", filter: (e) => divinity(e) && Number(e.system?.ppCost) === 2 });
const livingGospel = dailyInnateSpell("Living Gospel", { prompt: "Non-specialist Divinity spell, base PP 4 or less", filter: (e) => divinity(e) && Number(e.system?.ppCost) > 0 && Number(e.system?.ppCost) <= 4 });

const standOverTheDead = {
  hint: "Name what you guard: +1 circumstance to DB while adjacent to it. Use again to stand down.",
  async use(actor, item) {
    const { line, postCard, replaceFeatEffect, enterText } = helpers();
    const standing = ownEffects(actor, item.id);
    if (standing.length) { await actor.deleteEmbeddedDocuments("ActiveEffect", standing.map((e) => e.id)); await postCard(actor, "Stand Over the Dead", [line("You <strong>stand down</strong>.")]); return; }
    const what = firstTarget()?.name ?? await enterText("Stand Over the Dead", "What you guard (a corpse, reliquary or helpless creature)", "e.g. the reliquary");
    if (!what) return;
    await replaceFeatEffect(actor, item, { name: `Stand Over the Dead: ${what}`, img: item.img, description: `+1 circumstance bonus to DB while adjacent to ${what}.`, changes: [{ key: "system.combat.defence.circumstance", mode: 2, value: "1", priority: 20 }] });
    await postCard(actor, "Stand Over the Dead", [line(`You guard <strong>${what}</strong>: +1 circumstance to DB while adjacent. Use again to stand down.`)]);
  }
};
const standOverTheFallen = {
  hint: "Mark that you stand over a Dying ally: +1 circumstance to DB. Use again to stand down.",
  async use(actor, item) {
    const { line, postCard, replaceFeatEffect } = helpers();
    const standing = ownEffects(actor, item.id);
    if (standing.length) { await actor.deleteEmbeddedDocuments("ActiveEffect", standing.map((e) => e.id)); await postCard(actor, "Stand Over the Fallen", [line("You <strong>stand down</strong>.")]); return; }
    await replaceFeatEffect(actor, item, { name: "Stand Over the Fallen: +1 circumstance DB", img: item.img, description: "+1 circumstance to DB while adjacent to a living Dying ally; enemies leaving your reach beside them provoke.", changes: [{ key: "system.combat.defence.circumstance", mode: 2, value: "1", priority: 20 }] });
    await postCard(actor, "Stand Over the Fallen", [line("You stand over the fallen: <strong>+1 circumstance to DB</strong> while adjacent to a Dying ally; enemies moving out of your reach beside them provoke an Attack of Opportunity. Use again to stand down.")]);
  }
};

const tollOfPassage = { hint: "After a possessing entity fails Sacred Toll: target its host — +2 status queued for their next save against the possession.", ...queueOn("Toll of Passage", { value: 2, type: "status", scope: "The host's next saving throw to resist or end the possession, before the end of its next turn", needsTarget: true }) };
const mercyWrittenDeep = { hint: "After your racial Stabilise: target the creature — +2 status queued for their next Dying recovery check.", ...queueOn("Mercy Written Deep", { value: 2, type: "status", scope: "Next Dying recovery check before the end of its next turn", needsTarget: true }) };
const bloomTendersSpores = { hint: "After your Purify Counteracts an affliction: target the creature — +1 status queued for their next Fortitude save within a minute.", ...queueOn("Bloom-Tender's Spores", { value: 1, type: "status", scope: "Next Fortitude saving throw within the next minute", needsTarget: true }) };
const memoryGatherer = { hint: "After a Success or better on a Recall Knowledge under Ancestral Communion: target the ally — +1 circumstance queued for the related check.", ...queueOn("Memory Gatherer", { value: 1, type: "circumstance", scope: "The next skill check before the end of their next turn that directly relates to what you discovered", needsTarget: true }) };
const hauntwise = { hint: "After a successful Interpret Haunt: +2 circumstance queued for your next save or check against that haunt (target an ally to give it to them on a Critical).", ...queueOn("Hauntwise", { value: 2, type: "circumstance", scope: "The next saving throw or skill check against that haunt within the hour" }) };
const layExorcist = { hint: "After a Success or better on Trace Possession against a possessed creature: target them — +1 circumstance queued for their next save against the possession.", ...queueOn("Lay Exorcist", { value: 1, type: "circumstance", scope: "Next saving throw to resist or end the possession, before the end of its next turn", needsTarget: true }) };
const watchTheEyes = { hint: "After a Critical Sense Outside Influence: +2 circumstance queued for your next Trace Possession or Identify Spiritual Affliction against that creature.", ...queueOn("Watch the Eyes", { value: 2, type: "circumstance", scope: "The next Trace Possession or Identify Spiritual Affliction against that creature within 10 minutes" }) };
const measuredInvocation = { hint: "1 AP: +1 circumstance queued for your next Spellcraft check this turn (−5 to a resulting Spell Fumble roll).", async use(actor) { const { line, postCard, addPendingModifier } = helpers(); if (!(await spendAP(actor, "Measured Invocation"))) return; await addPendingModifier(actor, { value: 1, type: "circumstance", label: "Measured Invocation", scope: "The next spell you begin casting before the end of your turn", oneShot: true }); await postCard(actor, "Measured Invocation", [line("<strong>+1 circumstance</strong> is queued for your next Spellcraft check this turn; a Fumble's Spell Fumble roll takes −5.")]); } };

const consequenceWritten = {
  hint: "After a successful Demoralise: target the creature — marked until the end of your next turn; its first damage costs it Essence equal to your level.",
  async use(actor, item) {
    const { line, postCard, createEffectsOn } = helpers();
    const target = firstTarget();
    if (!target) { ui.notifications.warn("Consequence Written: target the Demoralised creature."); return; }
    await createEffectsOn(target, [{ name: `Consequence Written (${actor.name})`, img: item.img, origin: item.uuid, description: `Marked by ${actor.name}'s Testament until the end of ${actor.name}'s next turn: the first time it inflicts HP damage on ${actor.name} or an ally, it suffers ${level(actor)} Essence damage.`, duration: { rounds: 2 }, flags: { [SYSTEM_ID]: { [FEAT_SOURCE_FLAG]: `${item.id}:mark` } } }]);
    await postCard(actor, "Consequence Written", [line(`<strong>${target.name}</strong> is marked: the first time it damages you or an ally before the end of your next turn, it suffers <strong>${level(actor)} Essence damage</strong>.`)]);
  }
};
const sentenceOfJudgement = {
  hint: "After a successful Demoralise: target the creature — your first damaging Strike against it before the end of your next turn adds +1d6 Essence (automatic).",
  async use(actor, item) {
    const { line, postCard, replaceFeatEffect } = helpers();
    const target = firstTarget();
    if (!target) { ui.notifications.warn("Sentence of Judgement: target the Demoralised creature."); return; }
    await replaceFeatEffect(actor, item, { name: `Sentence of Judgement: ${target.name}`, img: item.img, description: `+1d6 secondary Essence damage on your first damaging Strike against ${target.name} before the end of your next turn.`, duration: { rounds: 2 }, flags: { [SYSTEM_ID]: { strikeDamageRider: { dice: "1d6", label: "Sentence of Judgement (Essence)", targetUuids: [target.uuid], oncePerRound: true } } } });
    await postCard(actor, "Sentence of Judgement", [line(`Judgement invoked on <strong>${target.name}</strong>: your first damaging Strike against it before the end of your next turn adds <strong>+1d6 Essence</strong>, added to the damage roll automatically.`)]);
  }
};
const revelationInCrisis = {
  hint: "Reaction (Focus): spend Revelatory Script's use to reroll a failed save against a spell, with advantage.",
  async use(actor, item) {
    const { line, postCard, itemUsesRemaining } = helpers();
    const readAura = Array.from(actor.items ?? []).find((s) => s.type === "spell" && s.name === "Read Aura" && s.system?.innate);
    if (!readAura || itemUsesRemaining(readAura) <= 0) { ui.notifications.warn("Revelation in Crisis: Revelatory Script (your innate Read Aura) is expended."); return; }
    if (!(await spendReaction(actor, "Revelation in Crisis"))) return;
    await readAura.update({ "system.usesValue": itemUsesRemaining(readAura) - 1 });
    await postCard(actor, "Revelation in Crisis", [line("<strong>Reroll the failed saving throw with advantage</strong> from your sheet and keep the better result."), line("<em>Revelatory Script is expended — Refocus restores it before Read Aura or this can be used again.</em>")]);
  }
};
const testamentOfAnswers = { hint: "Once per day: reroll a failed Recall Knowledge and keep the second result.", ...focusCard("Testament of Answers", ["<strong>Reroll the failed Recall Knowledge</strong> from your sheet — the second result stands."]) };
const unwrittenLie = {
  hint: "After a successful Detect Deception: target the creature — advantage on your next save or Sense Motive against its deceptions for a minute.",
  async use(actor, item) {
    const { line, postCard, replaceFeatEffect } = helpers();
    const target = firstTarget();
    if (!target) { ui.notifications.warn("Unwritten Lie: target the creature you saw through."); return; }
    await replaceFeatEffect(actor, item, { name: `Unwritten Lie: ${target.name}`, img: item.img, description: `Advantage on the next saving throw or Sense Motive check against an Illusion, Charm, Compulsion or deceptive supernatural effect created by ${target.name}, within a minute.`, duration: { seconds: 60, rounds: 10 }, flags: { [SYSTEM_ID]: { conditionals: [
      { kind: "advantage", label: "Unwritten Lie", auto: true, scope: `Saving throws against ${target.name}'s Illusion, Charm, Compulsion or deceptive effects`, when: { checkTypes: ["save"], sourceUuids: [target.uuid] } },
      { kind: "advantage", label: "Unwritten Lie", auto: false, scope: `Sense Motive against ${target.name}'s deceptions`, when: { checkTypes: ["skill"], subjects: ["senseMotive"] } }
    ] } } });
    await postCard(actor, "Unwritten Lie", [line(`The gaps show: <strong>advantage</strong> on your next save or Sense Motive against <strong>${target.name}</strong>'s deceptions within the minute (pre-ticked on a save it provokes).`)]);
  }
};
const restorativeSpores = {
  hint: "After your Vaelori Purify Counteracts an affliction: target the creature — they regain HP equal to your level.",
  async use(actor) {
    const { line, postCard } = helpers();
    const target = firstTarget();
    if (!target) { ui.notifications.warn("Restorative Spores: target the creature Purify cleansed."); return; }
    const amount = level(actor);
    if (target.isOwner) { const hp = target.system.resources.hp; await target.update({ "system.resources.hp.value": Math.min(Number(hp.max), Number(hp.value) + amount) }); }
    await postCard(actor, "Restorative Spores", [line(`<strong>${target.name}</strong> regains <strong>${amount}</strong> HP as flesh grows around what was cleansed${target.isOwner ? "" : " — apply on their sheet"}.`)]);
  }
};
const whisperNetwork = {
  hint: "Daily preparation: name the creatures attuned (up to your Wisdom, minimum 1).",
  async use(actor, item) {
    const { line, postCard, enterText } = helpers();
    const max = Math.max(1, Number(actor.system?.attributes?.wisdom?.total ?? 0));
    const names = await enterText("Whisper Network", `Up to ${max} willing creatures attuned for the day`, "e.g. Sera, Dagan");
    if (!names) return;
    await actor.setFlag(SYSTEM_ID, `whisperNetwork-${item.id}`, names);
    await postCard(actor, "Whisper Network", [line(`Attuned until your next daily preparation: <strong>${names}</strong> — they share your Nethri silent speech within 60 feet (a shared language still needed).`)]);
  }
};
const deathChant = {
  hint: "Reaction (target the fallen ally, and the attacker if you can): their +1 status to Dying recovery queued; +1 status to your attacks against the attacker until your next turn.",
  async use(actor, item) {
    const { line, postCard, addPendingModifier, replaceFeatEffect } = helpers();
    const targets = Array.from(game.user?.targets ?? []).map((t) => t.actor).filter(Boolean);
    const ally = targets[0];
    if (!ally) { ui.notifications.warn("Death Chant: target the ally who fell (and the attacker second, if known)."); return; }
    const attacker = targets[1] ?? null;
    if (!(await spendReaction(actor, "Death Chant"))) return;
    await addPendingModifier(ally, { value: 1, type: "status", label: "Death Chant", scope: "Next Dying recovery check before the end of your next turn", oneShot: true });
    const when = attacker ? { checkTypes: ["attack"], targetUuids: [attacker.uuid] } : { checkTypes: ["attack"] };
    await replaceFeatEffect(actor, item, { name: `Death Chant${attacker ? `: ${attacker.name}` : ""}`, img: item.img, description: "+1 status to attack rolls against the creature that felled your companion until the end of your next turn.", duration: { rounds: 2 }, flags: { [SYSTEM_ID]: { conditionals: [{ kind: "modifier", value: 1, type: "status", label: "Death Chant", auto: Boolean(attacker), scope: `Attack rolls against ${attacker?.name ?? "the creature that caused the damage"}`, when }] } } });
    const lines = [line(`You roar <strong>${ally.name}</strong>'s name: +1 status queued on their next Dying recovery check; +1 status to your attacks against ${attacker?.name ?? "the attacker"} until the end of your next turn.`)];
    if (hasFeat(actor, "Chorus of the Fallen") && attacker) {
      const others = targets.slice(2, 4);
      const { createEffectsOn } = helpers();
      for (const o of others) await createEffectsOn(o, [{ name: `Chorus of the Fallen: ${attacker.name}`, img: item.img, origin: item.uuid, description: `+1 status to attack rolls against ${attacker.name} until the end of your next turn.`, duration: { rounds: 2 }, flags: { [SYSTEM_ID]: { [FEAT_SOURCE_FLAG]: `${item.id}:chorus`, conditionals: [{ kind: "modifier", value: 1, type: "status", label: "Chorus of the Fallen", auto: true, scope: `Attacks against ${attacker.name}`, when: { checkTypes: ["attack"], targetUuids: [attacker.uuid] } }] } } }]);
      lines.push(line(others.length ? `Chorus of the Fallen: <strong>${others.map((o) => o.name).join(", ")}</strong> share the bonus.` : "<em>Chorus of the Fallen: target up to two more allies (third and fourth) to share the bonus.</em>"));
    }
    await postCard(actor, "Death Chant", lines);
  }
};
const faithThroughExperience = {
  hint: "Once per day after a Critical or Heroic on one of the six actions: regain 1 Conviction Point.",
  async use(actor, item) {
    const { line, postCard } = helpers();
    if (!(await spendUse(item, "Faith Through Experience"))) return;
    const conviction = actor.system?.resources?.conviction;
    if (conviction && Number(conviction.value) < Number(conviction.max)) await actor.update({ "system.resources.conviction.value": Number(conviction.value) + 1 });
    await postCard(actor, "Faith Through Experience", [line("Belief proves meaningful: you regain <strong>1 Conviction Point</strong> (to your maximum)."), line("<em>Once per day.</em>")]);
  }
};
const manyRoadsManyGods = {
  hint: "Daily preparation: name the tradition — +2 racial pre-ticked on Observe Sacred Custom and Recognise Doctrine, with its name beside the tick.",
  async use(actor, item) {
    const { line, postCard, enterText, replaceFeatEffect } = helpers();
    const two = hasFeat(actor, "Crossroads of Faith");
    const first = await enterText("Many Roads, Many Gods", "The religion, Divine Aspect or tradition selected today", "e.g. the Chapel of the Open Hand");
    if (!first) return;
    const second = two ? await enterText("Crossroads of Faith", "A second tradition", "") : "";
    const names = [first, second].filter(Boolean);
    await replaceFeatEffect(actor, item, { name: `Many Roads, Many Gods: ${names.join(" & ")}`, img: item.img, description: `+2 racial to Observe Sacred Custom and Recognise Doctrine concerning ${names.join(" or ")}; 1 rank treated as held for those actions against it.`, flags: { [SYSTEM_ID]: { untrainedActions: ["observeSacredCustom", "recogniseDoctrine"], conditionals: [{ kind: "modifier", value: 2, type: "racial", label: "Many Roads, Many Gods", auto: false, scope: `Observe Sacred Custom or Recognise Doctrine concerning ${names.join(" or ")}`, when: { checkTypes: ["skill"], actions: ["observeSacredCustom", "recogniseDoctrine"] } }] } } }, { dailyPrep: true });
    await postCard(actor, "Many Roads, Many Gods", [line(`Today you follow <strong>${names.join(" and ")}</strong>: +2 racial is offered on Observe Sacred Custom and Recognise Doctrine about it, and the trained gate is waived for those actions.`)]);
  }
};
const livingIndex = { hint: "Name your extra Lore specialist skill.", async use(actor, item) { return helpers().useBackground(actor, item); } };

/* ================================================================== */
/* Archetype feats and their abilities                                  */
/* ================================================================== */

const classSkillChooser = { hint: "Choose the skill that becomes a class skill.", async use(actor, item) { return helpers().useClassSkillGrant(actor, item); } };
const liturgist = {
  hint: "Hands over the Liturgical Book if it is not on your sheet yet.",
  async use(actor, item) {
    const { line, postCard } = helpers();
    if (Array.from(actor.items ?? []).some((i) => i.type === "gear" && i.name === "Liturgical Book")) { ui.notifications.info("Liturgist: your Liturgical Book is on your sheet — open it to record spells."); return; }
    const pack = game.trgPrime.modules.contentPack("gear");
    const idx = await pack.getIndex();
    const entry = Array.from(idx.values()).find((e) => e.name === "Liturgical Book");
    const data = (await pack.getDocument(entry._id)).toObject(); delete data._id;
    foundry.utils.setProperty(data, `flags.${SYSTEM_ID}.grantedBy`, { sourceId: item.id, sourceName: item.name, requested: "Liturgical Book" });
    await actor.createEmbeddedDocuments("Item", [data]);
    await postCard(actor, "Liturgist", [line("Your <strong>Liturgical Book</strong> is on your sheet: record four Divinity spells you can cast, and select one each daily preparation (prepare it, or add it to your repertoire, by hand).")]);
  }
};
const oathkeeper = {
  hint: "Daily preparation: record your Solemn Vow.",
  async use(actor, item) {
    const { line, postCard, enterText } = helpers();
    const vow = await enterText("Oathkeeper", "Your Solemn Vow for the day (a specific, meaningful obligation)", "e.g. I will see the child returned to her mother before dusk", actor.getFlag(SYSTEM_ID, `solemnVow-${item.id}`) ?? "");
    if (!vow) return;
    await actor.setFlag(SYSTEM_ID, `solemnVow-${item.id}`, vow);
    await postCard(actor, "Oathkeeper", [line(`Solemn Vow: <strong>${vow}</strong>. Vowbound Resolve steadies a check made in its fulfilment.`)]);
  }
};
const prophet = {
  hint: "Portent: Use after a Success on Read Omen to hold it (once a day); Use again as a Reaction to grant +1 status.",
  async use(actor, item) {
    const { line, postCard, addPendingModifier } = helpers();
    const held = actor.getFlag(SYSTEM_ID, `portent-${item.id}`);
    if (!held) {
      if (!(await spendUse(item, "Prophet"))) return;
      await actor.setFlag(SYSTEM_ID, `portent-${item.id}`, true);
      await postCard(actor, "Portent", [line("You hold a <strong>Portent</strong> from the revelation. Use again, as a Reaction, before a save or skill check by you or an ally within 30 feet is resolved.")]);
      return;
    }
    const target = firstTarget() ?? actor;
    if (!(await spendReaction(actor, "Portent"))) return;
    await actor.unsetFlag(SYSTEM_ID, `portent-${item.id}`);
    await addPendingModifier(target, { value: 1, type: "status", label: "Portent", scope: "The triggering saving throw or skill check", oneShot: true });
    await postCard(actor, "Portent", [line(`The fragment lands: <strong>${target.name}</strong> has +1 status queued for the check.`)]);
  }
};
const sage = { hint: "Name your Specialist Lore skill.", async use(actor, item) { return helpers().useBackground(actor, item); } };
const votary = {
  hint: "Choose your Aspect's PP 1 specialist spell: it lands as a Divinity innate spell with the Focus trait.",
  async use(actor, item) {
    const { line, postCard, chooseFromList } = helpers();
    const aspect = Array.from(actor.items ?? []).find((i) => i.type === "divine-aspect");
    if (!aspect) { ui.notifications.warn("Votary: add your Divine Aspect from the sheet's Divine Aspect slot first."); return; }
    const held = Array.from(actor.items ?? []).find((s) => s.type === "spell" && s.flags?.[SYSTEM_ID]?.grantedBy?.sourceId === item.id);
    if (held) { ui.notifications.info(`Votary: ${held.name} is your Aspect's spell.`); return; }
    const names = String(aspect.system?.specialistSpells ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    const pack = game.trgPrime.modules.contentPack("spells");
    const index = await pack.getIndex({ fields: ["system.ppCost"] });
    const options = names.map((n) => Array.from(index.values()).find((e) => e.name.toLowerCase() === n.toLowerCase())).filter((e) => e && Number(e.system?.ppCost) === 1);
    if (!options.length) { ui.notifications.warn(`Votary: none of ${aspect.name}'s specialist spells at PP 1 is in the spells compendium.`); return; }
    const picked = await chooseFromList("Votary", `${aspect.name}'s PP 1 specialist spell`, options.map((e) => [e._id, e.name]));
    if (!picked) return;
    const data = (await pack.getDocument(picked)).toObject(); delete data._id;
    data.system.innate = true; data.system.usesPerDay = "1"; data.system.usesValue = 1;
    if (!/\bFocus\b/.test(data.system.traits ?? "")) data.system.traits = [data.system.traits, "Focus"].filter(Boolean).join(", ");
    foundry.utils.setProperty(data, `flags.${SYSTEM_ID}.grantedBy`, { sourceId: item.id, sourceName: item.name, requested: data.name });
    foundry.utils.setProperty(data, `flags.${SYSTEM_ID}.castingAbilityOverride`, "wisdom");
    await actor.createEmbeddedDocuments("Item", [data]);
    await postCard(actor, "Votary", [line(`<strong>${data.name}</strong> is yours as a Divinity innate spell with the Focus trait (Wisdom-based — a note on the cast where the sheet's ability differs).`)]);
  }
};

const inquisitionInquisitor = {
  hint: "1 AP: name your Subject (target a token, or type a name) — +1 class offered on investigation checks about them. Use again to change or end.",
  async use(actor, item) {
    const { line, postCard, replaceFeatEffect, chooseFromList, enterText } = helpers();
    const current = ownEffects(actor, item.id)[0];
    if (current) {
      const choice = await chooseFromList("Inquisition", `Your Subject is ${current.getFlag(SYSTEM_ID, "subjectName")}`, [["keep", "Keep"], ["end", "End the Inquisition"], ["change", "Designate a new Subject (1 AP)"]]);
      if (!choice || choice === "keep") return;
      await current.delete();
      if (choice === "end") { await postCard(actor, "Inquisition", [line("The Inquisition is <strong>ended</strong>.")]); return; }
    }
    const target = firstTarget();
    const subjectName = target?.name ?? await enterText("Inquisition", "Name of the Subject", "e.g. the Abbot of Greyhaven");
    if (!subjectName) return;
    if (!(await spendAP(actor, "Inquisition"))) return;
    const ACTIONS = ["detectDeception", "identifyPower", "recallKnowledge", "research", "search", "studyTarget", "track"];
    await replaceFeatEffect(actor, item, { name: `Inquisition: ${subjectName}`, img: item.img, description: `${subjectName} is the Subject of your Inquisition: +1 class to checks made specifically to investigate them.`, flags: { [SYSTEM_ID]: { subjectName, subjectUuid: target?.uuid ?? "", conditionals: [
      { kind: "modifier", value: 1, type: "class", label: `Inquisition: ${subjectName}`, auto: false, scope: `Investigating ${subjectName}`, when: { checkTypes: ["skill"], actions: ACTIONS } },
      { kind: "modifier", value: 1, type: "class", label: `Inquisition: ${subjectName}`, auto: false, scope: `Sense Motive concerning ${subjectName}`, when: { checkTypes: ["skill"], subjects: ["senseMotive"], not: { actions: ACTIONS } } }
    ] } } });
    await postCard(actor, "Inquisition", [line(`<strong>${subjectName}</strong> is the Subject of your Inquisition: +1 class is offered on investigation checks about them.`)]);
  }
};
const liturgyOfPrayer = {
  hint: "1 AP, once a day: mark an unprepared spell of yours prepared so it can be cast now.",
  async use(actor, item) {
    const { line, postCard, chooseFromList } = helpers();
    const unprepared = Array.from(actor.items ?? []).filter((s) => s.type === "spell" && !s.system?.prepared && !s.system?.innate && !/\bCantrip\b/i.test(s.system?.traits ?? "")).sort((a, b) => a.name.localeCompare(b.name));
    if (!unprepared.length) { ui.notifications.warn("Liturgy of Prayer: no unprepared spell to reach for."); return; }
    const picked = await chooseFromList("Liturgy of Prayer", "Liturgical Book spell to invoke now", unprepared.map((s) => [s.id, `${s.name} (PP ${s.system?.ppCost ?? 0})`]));
    if (!picked) return;
    if (!(await spendAP(actor, "Liturgy of Prayer"))) return;
    if (!(await spendUse(item, "Liturgy of Prayer"))) return;
    const spell = actor.items.get(picked);
    await spell.update({ "system.prepared": true });
    await postCard(actor, "Liturgy of Prayer", [line(`<strong>${spell.name}</strong> is on your spells table — cast it before the end of your turn.`), line("<em>Once per day.</em>")]);
  }
};
const shareTheWound = {
  hint: "Reaction (Focus): target the ally — enter the damage you take on; they regain it, you lose it (never below 1 HP).",
  async use(actor, item) {
    const { line, postCard, enterText } = helpers();
    const target = firstTarget();
    if (!target) { ui.notifications.warn("Share the Wound: target the wounded ally."); return; }
    const abilityKey = actor.system?.magic?.castingAbility ?? "wisdom";
    const maxShare = level(actor) + Number(actor.system?.attributes?.[abilityKey]?.total ?? 0);
    const room = Math.max(0, Number(actor.system.resources.hp.value) - 1);
    const raw = await enterText("Share the Wound", `HP damage to take on (up to ${Math.min(maxShare, room)})`, String(Math.min(maxShare, room)));
    const amount = Math.min(maxShare, room, Math.max(0, Math.floor(Number(raw)) || 0));
    if (!amount) return;
    if (!(await spendReaction(actor, "Share the Wound"))) return;
    if (!(await spendUse(item, "Share the Wound"))) return;
    await actor.update({ "system.resources.hp.value": Number(actor.system.resources.hp.value) - amount });
    if (target.isOwner) { const hp = target.system.resources.hp; await target.update({ "system.resources.hp.value": Math.min(Number(hp.max), Number(hp.value) + amount) }); }
    await postCard(actor, "Share the Wound", [line(`You take <strong>${amount}</strong> of <strong>${target.name}</strong>'s wound upon yourself${target.isOwner ? "" : " — restore it on their sheet"}. This loss cannot be reduced or redirected.`), line("<em>Focus use spent — Refocus restores it.</em>")]);
  }
};
const vowboundResolve = { hint: "Reaction (Focus): reroll a failed save or skill check made in your Vow's fulfilment, with advantage.", ...focusCard("Vowbound Resolve", ["<strong>Reroll the failed check with advantage</strong> from your sheet and keep the better result."], { reaction: true }) };
const appliedInsight = {
  hint: "1 AP (Focus): target a Studied Target — Opening (+1 circumstance to attacks against it) or Warning (+1 circumstance to DB and saves against it) until your next turn.",
  async use(actor, item) {
    const { line, postCard, chooseFromList, replaceFeatEffect } = helpers();
    const target = firstTarget();
    if (!target) { ui.notifications.warn("Applied Insight: target the Studied Target."); return; }
    const mode = await chooseFromList("Applied Insight", `Against ${target.name}`, [["opening", "Opening — +1 circumstance to attack rolls against it"], ["warning", "Warning — +1 circumstance to DB and saves against its attacks, spells and abilities"]]);
    if (!mode) return;
    if (!(await spendAP(actor, "Applied Insight"))) return;
    if (!(await spendUse(item, "Applied Insight"))) return;
    const conditionals = mode === "opening"
      ? [{ kind: "modifier", value: 1, type: "circumstance", label: "Applied Insight (Opening)", auto: true, scope: `Attack rolls against ${target.name}`, when: { checkTypes: ["attack"], targetUuids: [target.uuid] } }]
      : [{ kind: "modifier", value: 1, type: "circumstance", label: "Applied Insight (Warning)", auto: true, scope: `Saving throws against ${target.name}'s effects`, when: { checkTypes: ["save"], sourceUuids: [target.uuid] } }];
    await replaceFeatEffect(actor, item, { name: `Applied Insight (${cap(mode)}): ${target.name}`, img: item.img, description: mode === "opening" ? `+1 circumstance to attack rolls against ${target.name} until the beginning of your next turn.` : `+1 circumstance to DB and saving throws against ${target.name} until the beginning of your next turn (DB: applied as untyped on your sheet).`, duration: { rounds: 1 }, changes: mode === "warning" ? [{ key: "system.combat.defence.circumstance", mode: 2, value: "1", priority: 20 }] : [], flags: { [SYSTEM_ID]: { conditionals } } });
    await postCard(actor, "Applied Insight", [line(`<strong>${cap(mode)}</strong> against <strong>${target.name}</strong> until the beginning of your next turn — pre-ticked when the roll names the creature.`), line("<em>Focus use spent — Refocus restores it.</em>")]);
  }
};
const wardTheSoul = { hint: "Reaction (Focus): target the ally — +2 circumstance queued for their save against possession, Soul Drain or a Soul effect.", async use(actor, item) { const { line, postCard, addPendingModifier } = helpers(); const target = firstTarget(); if (!target) { ui.notifications.warn("Ward the Soul: target the ally."); return; } if (!(await spendReaction(actor, "Ward the Soul"))) return; if (!(await spendUse(item, "Ward the Soul"))) return; await addPendingModifier(target, { value: 2, type: "circumstance", label: "Ward the Soul", scope: "The triggering saving throw against possession, Soul Drain or a Soul-trait effect", oneShot: true }); await postCard(actor, "Ward the Soul", [line(`You stand between: <strong>${target.name}</strong> has +2 circumstance queued for the save.`), line("<em>Focus use spent — Refocus restores it.</em>")]); } };

/* ================================================================== */
/* Class feats                                                          */
/* ================================================================== */

const burnTheWard = {
  hint: "Reaction: end your Ward the Threshold — the triggering creature rerolls with advantage.",
  async use(actor) {
    const { line, postCard } = helpers();
    const ward = Array.from(actor.items ?? []).find((i) => i.type === "ability" && i.name === "Ward the Threshold");
    const key = ward ? `${ward.id}:threshold` : null;
    if (!key || !ownEffects(actor, key).length) { ui.notifications.warn("Burn the Ward: no Ward the Threshold is standing."); return; }
    if (!(await spendReaction(actor, "Burn the Ward"))) return;
    await actor.deleteEmbeddedDocuments("ActiveEffect", ownEffects(actor, key).map((e) => e.id));
    for (const t of Array.from(game.user?.targets ?? []).map((x) => x.actor).filter(Boolean)) {
      const theirs = ownEffects(t, key);
      if (theirs.length && t.isOwner) await t.deleteEmbeddedDocuments("ActiveEffect", theirs.map((e) => e.id));
    }
    await actor.setFlag(SYSTEM_ID, "folkPreparations", Math.max(0, Number(actor.getFlag(SYSTEM_ID, "folkPreparations") ?? 0) - 1));
    await postCard(actor, "Burn the Ward", [line("The circle burns out: the ward ends (remove its effect from any ally still carrying it) and the triggering creature <strong>rerolls the saving throw with advantage</strong>.")]);
  }
};
const fieldPractice = {
  hint: "Choose the two Folk Rites that take 1 minute.",
  async use(actor, item) {
    const { line, postCard, chooseFromList } = helpers();
    const rites = ["Warding Charm", "Brew Remedy", "Ward the Threshold", "Read the Signs"];
    const a = await chooseFromList("Field Practice", "First rite", rites.map((r) => [r, r])); if (!a) return;
    const b = await chooseFromList("Field Practice", "Second rite", rites.filter((r) => r !== a).map((r) => [r, r])); if (!b) return;
    await actor.setFlag(SYSTEM_ID, `fieldPractice-${item.id}`, [a, b]);
    await postCard(actor, "Field Practice", [line(`<strong>${a}</strong> and <strong>${b}</strong> take 1 minute rather than 10.`)]);
  }
};
// Old Secret and Hedge Witch moved to grimoire-automations.mjs (0.5.0):
// they choose real spells now that the Grimoire ships.
const exposeTheSubject = {
  hint: "1 AP: target your Judged Subject, then your allies — +1 circumstance to their saves against it until your next turn (from 12th, +1 to their first attack on it).",
  async use(actor, item) {
    const { line, postCard, createEffectsOn } = helpers();
    const targets = Array.from(game.user?.targets ?? []).map((t) => t.actor).filter(Boolean);
    const subject = targets[0];
    if (!subject) { ui.notifications.warn("Expose the Subject: target your Judged Subject first, then the allies."); return; }
    if (!(await spendAP(actor, "Expose the Subject"))) return;
    const twelve = level(actor) >= 12;
    for (const ally of targets.slice(1)) {
      await createEffectsOn(ally, [{ name: `Expose the Subject: ${subject.name}`, img: item.img, origin: item.uuid, description: `+1 circumstance to saving throws against ${subject.name}'s effects${twelve ? ` and to the first attack roll against ${subject.name}` : ""} until the beginning of ${actor.name}'s next turn.`, duration: { rounds: 1 }, flags: { [SYSTEM_ID]: { [FEAT_SOURCE_FLAG]: `${item.id}:expose`, conditionals: [
        { kind: "modifier", value: 1, type: "circumstance", label: "Expose the Subject", auto: true, scope: `Saves against ${subject.name}`, when: { checkTypes: ["save"], sourceUuids: [subject.uuid] } },
        ...(twelve ? [{ kind: "modifier", value: 1, type: "circumstance", label: "Expose the Subject", auto: true, scope: `First attack against ${subject.name}`, when: { checkTypes: ["attack"], targetUuids: [subject.uuid] } }] : [])
      ] } } }]);
    }
    await postCard(actor, "Expose the Subject", [line(`You name the tell: <strong>${targets.slice(1).map((a) => a.name).join(", ") || "your allies (target them next time)"}</strong> gain +1 circumstance to saves against ${subject.name}${twelve ? " and to their first attack on it" : ""} until your next turn.`)]);
  }
};
const cleansingRadiance = {
  hint: "After a Healing spell restores HP: target the creature — choose the effect the spell's PP allows.",
  async use(actor) {
    const { line, postCard, chooseFromList } = helpers();
    const target = firstTarget() ?? actor;
    const picked = await chooseFromList("Cleansing Radiance", `Effect on ${target.name} (by the spell's PP)`, [["fear", "PP 8 — Remove Fear"], ["paralysis", "PP 8 — Remove Paralysis"], ["senses", "PP 8 — Restore Senses"], ["disease", "PP 10 — Remove Disease"], ["curse", "PP 12 — Remove Curse"]]);
    if (!picked) return;
    await postCard(actor, "Cleansing Radiance", [line(`Corruption burns away: <strong>${target.name}</strong> — ${{ fear: "Remove Fear", paralysis: "Remove Paralysis", senses: "Restore Senses", disease: "Remove Disease", curse: "Remove Curse" }[picked]} applies as the spell of that name would (the GM resolves it).`)]);
  }
};
const lifeboundWard = {
  hint: "After a Healing spell: target the second ally, enter what the first regained — they regain half.",
  async use(actor) {
    const { line, postCard, enterText } = helpers();
    const target = firstTarget();
    if (!target) { ui.notifications.warn("Lifebound Ward: target the second ally."); return; }
    const raw = await enterText("Lifebound Ward", "HP the original target regained", "");
    const half = Math.floor((Math.max(0, Number(raw)) || 0) / 2);
    if (!half) return;
    if (target.isOwner) { const hp = target.system.resources.hp; await target.update({ "system.resources.hp.value": Math.min(Number(hp.max), Number(hp.value) + half) }); }
    await postCard(actor, "Lifebound Ward", [line(`<strong>${target.name}</strong> regains <strong>${half}</strong> HP through the bond${target.isOwner ? "" : " — apply on their sheet"}.`)]);
  }
};
const miraculousRecovery = { hint: "Focus metamagic (+4 PP): a creature dead within the round returns at half the spell's healing.", ...focusCard("Miraculous Recovery", ["Cast the Healing spell at <strong>+4 PP</strong>: the creature <strong>returns to life with HP equal to half</strong> what the spell would restore — set it on their sheet. Body present, soul willing; not old age."]) };
const undyingRestoration = { hint: "Focus metamagic (+8 PP): a Dying or just-dead creature returns at half the healing; Dazed/Weakened removed, Injured halved.", ...focusCard("Undying Restoration", ["Cast the Healing spell at <strong>+8 PP</strong>: the creature returns to life or consciousness with HP equal to half what the spell would restore; Dazed and Weakened are removed and Injured is halved (round down) — apply on their sheet."]) };
const rejuvenatingSurge = {
  hint: "After a Healing spell: target the creature, enter the PP — +1 status to attacks and damage for a round (+2 at 6 PP; +5 ft Speed at 10 PP).",
  async use(actor, item) {
    const { line, postCard, enterText, createEffectsOn } = helpers();
    const target = firstTarget() ?? actor;
    const pp = Math.max(0, Number(await enterText("Rejuvenating Surge", "PP the healing spell cost", "2")) || 0);
    const bonus = pp >= 6 ? 2 : 1;
    const speed = pp >= 10;
    await createEffectsOn(target, [{ name: `Rejuvenating Surge: +${bonus} status`, img: item.img, origin: item.uuid, description: `+${bonus} status to attack and damage rolls${speed ? " and +5 ft Speed" : ""} for 1 round.`, duration: { rounds: 1 }, changes: speed ? [{ key: "system.combat.movement.land.status", mode: 2, value: "5", priority: 20 }] : [], flags: { [SYSTEM_ID]: { [FEAT_SOURCE_FLAG]: `${item.id}:surge`, conditionals: [{ kind: "modifier", value: bonus, type: "status", label: "Rejuvenating Surge", auto: true, scope: "Attack and damage rolls this round", when: { checkTypes: ["attack", "damage"] } }] } } }]);
    await postCard(actor, "Rejuvenating Surge", [line(`<strong>${target.name}</strong>: +${bonus} status to attacks and damage${speed ? " and +5 ft Speed" : ""} for 1 round — pre-ticked.`)]);
  }
};
const predatorsManifestation = {
  hint: "Choose the damage type of your manifested natural attack.",
  async use(actor, item) {
    const { line, postCard, chooseFromList } = helpers();
    const type = await chooseFromList("Predator's Manifestation", "Base damage of the spectral attack", [["Slashing", "Slashing (claws)"], ["Piercing", "Piercing (bite, horn)"], ["Bludgeoning", "Bludgeoning (hoof, tail)"]]);
    if (!type) return;
    await actor.setFlag(SYSTEM_ID, `predatorsManifestation-${item.id}`, type);
    await postCard(actor, "Predator's Manifestation", [line(`Your manifested attack is <strong>${type}</strong>: Manifest Spirit (Beast) adds it to your weapons for the duration.`)]);
  }
};
const sharedManifestation = {
  hint: "1 AP while Manifest Spirit is active: target the ally — one benefit of your manifestation for a round.",
  async use(actor, item) {
    const { line, postCard, createEffectsOn } = helpers();
    const target = firstTarget();
    if (!target) { ui.notifications.warn("Shared Manifestation: target the willing ally."); return; }
    const manifest = Array.from(actor.effects ?? []).find((e) => /^Manifest Spirit:/.test(e.name));
    if (!manifest) { ui.notifications.warn("Shared Manifestation: Manifest Spirit is not active."); return; }
    if (!(await spendAP(actor, "Shared Manifestation"))) return;
    const SHARE = {
      "Chorus of the Past": { desc: "Advantage on Recall Knowledge or Sense Motive checks", conditionals: [{ kind: "advantage", label: "Shared Manifestation", auto: true, scope: "Recall Knowledge and Sense Motive", when: { checkTypes: ["skill"], actions: ["recallKnowledge", "detectDeception"] } }, { kind: "advantage", label: "Shared Manifestation", auto: true, scope: "Sense Motive", when: { checkTypes: ["skill"], subjects: ["senseMotive"], not: { actions: ["recallKnowledge", "detectDeception"] } } }] },
      "Beast Within": { desc: "+10 feet Speed", changes: [{ key: "system.combat.movement.land.other", mode: 2, value: "10", priority: 20 }] },
      "Elemental Mantle": { desc: `Resistance to ${actor.getFlag(SYSTEM_ID, "elementalSpirit") ?? "your element"}`, changes: actor.getFlag(SYSTEM_ID, "elementalSpirit") ? [{ key: "system.combat.resistances", mode: 2, value: `, ${actor.getFlag(SYSTEM_ID, "elementalSpirit")}`, priority: 20 }] : [] },
      "Rooted World": { desc: "+1 Base DR", changes: [{ key: "system.combat.naturalArmourBase.natural", mode: 2, value: "1", priority: 20 }] },
      "Part the Veil": { desc: "Resistance to Essence damage", changes: [{ key: "system.combat.resistances", mode: 2, value: ", essence", priority: 20 }] }
    };
    const key = Object.keys(SHARE).find((k) => manifest.name.includes(k));
    const share = SHARE[key] ?? { desc: "one benefit of your manifestation (see the card)" };
    await createEffectsOn(target, [{ name: `Shared Manifestation: ${key ?? "manifestation"}`, img: item.img, origin: item.uuid, description: `${share.desc} until the beginning of ${actor.name}'s next turn.`, duration: { rounds: 1 }, changes: share.changes ?? [], flags: { [SYSTEM_ID]: { [FEAT_SOURCE_FLAG]: `${item.id}:share`, conditionals: share.conditionals ?? [] } } }]);
    await postCard(actor, "Shared Manifestation", [line(`Your guide reaches around <strong>${target.name}</strong>: ${share.desc} until the beginning of your next turn.`)]);
  }
};
const methodicalInvestigator = {
  hint: "Choose the action that becomes your speciality: +2 class pre-ticked on it.",
  async use(actor, item) {
    const { line, postCard, chooseFromList, replaceFeatEffect } = helpers();
    const options = [["examineTheDead", "Examine the Dead"], ["interpretHaunt", "Interpret Haunt"], ["recogniseDoctrine", "Recognise Doctrine"], ["senseOutsideInfluence", "Sense Outside Influence"], ["tracePossession", "Trace Possession"], ["traceReligiousProvenance", "Trace Religious Provenance"]];
    const taken = new Set(Array.from(actor.effects ?? []).map((e) => e.getFlag?.(SYSTEM_ID, "methodicalAction")).filter(Boolean));
    const picked = await chooseFromList("Methodical Investigator", "Your speciality", options.filter(([k]) => !taken.has(k) || ownEffects(actor, item.id).some((e) => e.getFlag(SYSTEM_ID, "methodicalAction") === k)));
    if (!picked) return;
    const label = options.find(([k]) => k === picked)[1];
    await replaceFeatEffect(actor, item, { name: `Methodical Investigator: ${label}`, img: item.img, description: `+2 class bonus to ${label} checks.`, flags: { [SYSTEM_ID]: { methodicalAction: picked, choiceLabel: label, conditionals: [{ kind: "modifier", value: 2, type: "class", label: "Methodical Investigator", auto: true, scope: `${label} checks`, when: { checkTypes: ["skill"], actions: [picked] } }] } } });
    await postCard(actor, "Methodical Investigator", [line(`<strong>${label}</strong> is your speciality: +2 class, pre-ticked.`)]);
  }
};

/* ------------------------------------------------------------------ */
/* The tables                                                           */
/* ------------------------------------------------------------------ */

/**
 * CONSECRATED ARMAMENT (Chapter 5): "Select the favoured weapon of your
 * Divine Aspect. Attacks you make with that weapon are treated as Magical
 * for the purpose of overcoming Resistance and Immunity. Once per round,
 * when you score a Critical hit with that weapon against an Undead
 * creature, an Eternal creature of an opposing aligned trait, or a
 * creature directly responsible for desecrating a site sacred to your
 * Aspect, you inflict an additional 1d6 Essence damage."
 *
 * Use binds it to one of your weapons that is the aspect's favoured
 * weapon (by name, or by group when the aspect prints a group — TRG
 * Prime 3.572.0). The effect carries two declarations the system reads:
 * `magicalAttacks` on that weapon's name, and a once-per-round essence
 * strike rider gated on a Critical against an Undead target. The Eternal
 * and desecrator cases are the GM's — the rider's card line says the die
 * did not fire, and the table adds it where the GM rules it does.
 */
const consecratedArmament = {
  hint: "Use to bind it to your Aspect's favoured weapon: Magical for Resistance, and 1d6 Essence on a Critical against Undead once a round (the GM adds it against an opposing Eternal or a desecrator).",
  async use(actor, item) {
    const { line, postCard, chooseFromList, replaceFeatEffect } = helpers();
    const aspect = Array.from(actor.items ?? []).find((i) => i.type === "divine-aspect");
    if (!aspect) { ui.notifications.warn("Consecrated Armament: add your Divine Aspect first."); return; }
    const favoured = String(aspect.system?.favouredWeapon ?? "").trim();
    const letters = (t) => String(t ?? "").toLowerCase().replace(/[^a-z]/g, "");
    const weapons = Array.from(actor.items ?? []).filter((i) => i.type === "weapon");
    const matches = weapons.filter((w) => letters(w.name).endsWith(letters(favoured)) || letters(w.system?.group) === letters(favoured));
    const pool = matches.length ? matches : weapons;
    if (!pool.length) { ui.notifications.warn(`Consecrated Armament: you carry no weapon — add your ${favoured || "favoured weapon"} first.`); return; }
    const picked = pool.length === 1 ? pool[0].id : await chooseFromList("Consecrated Armament", `${aspect.name}'s favoured weapon is ${favoured || "unlisted"} — bind the feat to`, pool.map((w) => [w.id, w.name]));
    if (!picked) return;
    const weapon = pool.find((w) => w.id === picked);
    await replaceFeatEffect(actor, item, {
      name: `Consecrated Armament: ${weapon.name}`,
      img: item.img,
      description: `Attacks with ${weapon.name} are Magical for Resistance and Immunity; once per round a Critical hit with it against an Undead creature adds 1d6 Essence.`,
      flags: { [SYSTEM_ID]: {
        magicalAttacks: { label: "Consecrated Armament", weaponNames: [weapon.name] },
        strikeRider: { label: "Consecrated Armament", dice: "1d6", damageType: "essence", scope: "any", onCritical: true, targetTypes: ["undead"], weaponNames: [weapon.name], oncePerRound: true }
      } }
    });
    await postCard(actor, "Consecrated Armament", [
      line(`Bound to <strong>${weapon.name}</strong>${matches.length ? "" : ` <em>(not obviously ${favoured} — your call)</em>`}: its attacks count as <strong>Magical</strong> for Resistance and Immunity.`),
      line("Once per round, a <strong>Critical hit</strong> with it against an <strong>Undead</strong> creature adds <strong>1d6 Essence</strong> on the damage card. Against an Eternal of an opposing aligned trait or a desecrator, the card says the die did not fire — add it where the GM rules it applies."),
      line("<em>Use again to rebind it to another weapon.</em>")
    ]);
  }
};

export const FEAT_AUTOMATIONS = Object.freeze({
  "adaptive tissue": adaptiveTissue,
  "grafted armament": graftedArmament,
  "perfected aberration": { hint: "1 AP (Focus): violent adaptation for 1 minute.", ...perfectedAberration },
  "redundant anatomy": redundantAnatomy,
  "blood awakened": { hint: "1 AP (Focus): your vampiric inheritance awakens for 1 minute.", ...bloodAwakened },
  "eternal manifestation": eternalManifestation,
  "unbound impulse": unboundImpulse,
  "continuity unbroken": continuityUnbroken,
  "not yet finished": notYetFinished,
  "pilgrim of many lives": pilgrimOfManyLives,
  "prayer from another life": prayerFromAnotherLife,
  "remembered liturgy": rememberedLiturgy,
  "unfinished duty": unfinishedDuty,
  "stand over the dead": standOverTheDead,
  "toll of passage": tollOfPassage,
  "consequence written": consequenceWritten,
  "living gospel": livingGospel,
  "living index": livingIndex,
  "mercy written deep": mercyWrittenDeep,
  "revelation in crisis": revelationInCrisis,
  "sentence of judgement": sentenceOfJudgement,
  "testament of answers": testamentOfAnswers,
  "unwritten lie": unwrittenLie,
  "bloom-tender's spores": bloomTendersSpores,
  "memory gatherer": memoryGatherer,
  "restorative spores": restorativeSpores,
  "whisper network": whisperNetwork,
  "death chant": deathChant,
  "faith through experience": faithThroughExperience,
  "many roads, many gods": manyRoadsManyGods,
  "inquisitor": classSkillChooser,
  "lifebearer": classSkillChooser,
  "liturgist": liturgist,
  "oathkeeper": oathkeeper,
  "prophet": prophet,
  "sage": sage,
  "votary": votary,
  "inquisition (inquisitor)": inquisitionInquisitor,
  "liturgy of prayer": liturgyOfPrayer,
  "share the wound": shareTheWound,
  "vowbound resolve": vowboundResolve,
  "applied insight": appliedInsight,
  "ward the soul": wardTheSoul,
  "burn the ward": burnTheWard,
  "field practice": fieldPractice,
  "expose the subject": exposeTheSubject,
  "cleansing radiance": cleansingRadiance,
  "lifebound ward": lifeboundWard,
  "miraculous recovery": miraculousRecovery,
  "undying restoration": undyingRestoration,
  "rejuvenating surge": rejuvenatingSurge,
  "predator's manifestation": predatorsManifestation,
  "shared manifestation": sharedManifestation,
  "measured invocation": measuredInvocation,
  "stand over the fallen": standOverTheFallen,
  "methodical investigator": methodicalInvestigator,
  "hauntwise": hauntwise,
  "lay exorcist": layExorcist,
  "watch the eyes": watchTheEyes,
  "consecrated armament": consecratedArmament
});

/** Feats with nothing to press: what the sheet says under the wand's absence. */
export const FEAT_PASSIVE_HINTS = Object.freeze({
  "morrowmade": "Works automatically: the trait, +1 racial Fortitude, and the offered +1 more on the named checks.",
  "impossible anatomy": "Works automatically: +2 racial on Escape (pre-ticked) and offered against a Grapple.",
  "vesperyn": "Works automatically: the trait and Nightvision.",
  "blood-scent": "Works automatically: Blood Sense on your senses; +2 racial offered on Track.",
  "hunter's fangs": "Works automatically: Fangs on your weapons.",
  "mesmeric gaze": "Works automatically: Charm Kind is an innate Focus spell on your list.",
  "velvet voice": "Works automatically: +1 racial offered on Diplomacy and Bluff.",
  "balance-blooded": "Works automatically: the aligned trait, Nightvision and Resistance as an innate Focus spell.",
  "chaos-blooded": "Works automatically: the aligned trait, Nightvision and Startle as an innate Focus spell.",
  "dawn-blooded": "Works automatically: the aligned trait, Nightvision and Guiding Bolt as an innate Focus spell.",
  "dread-blooded": "Works automatically: the aligned trait, Nightvision and Bane as an innate Focus spell.",
  "order-blooded": "Works automatically: the aligned trait, Nightvision and Sanctuary as an innate Focus spell.",
  "eternal resonance": "Works automatically: Eternal Lore on your specialist skills; the +1 to innate-spell attacks and DCs is a note.",
  "ordered mind": "Works automatically: advantage against Confusion and Fear, pre-ticked by trait.",
  "profane constitution": "Works automatically: Poison Resistance; advantage against Sleep pre-ticked.",
  "radiant constitution": "Works automatically: Poison Resistance; +2 racial against Disease and Poison pre-ticked.",
  "still centre": "Works automatically: Mental Resistance on your defences.",
  "battle remembered": "Works automatically: when your Initiative is rolled, a prompt offers Past-Life Echo as a Free action (five skills).",
  "deep recall": "Works through Past-Life Echo: its effect lasts 1 minute.",
  "echo-trained": "Works through Past-Life Echo: +3 racial on a skill you have a rank in.",
  "lost scholarship": "Works through Past-Life Echo: a typed Lore may be chosen.",
  "many lives, one soul": "Works through Past-Life Echo: two skills.",
  "memory of lost masters": "Works through Lost Scholarship: advantage on the Lore's first check, and a Critical or Heroic on it gives Past-Life Echo's use back.",
  "reflexes of a hundred battles": "Works automatically: +2 racial offered on the encounter's first save; Past-Life Echo's card says when the free Step is yours.",
  "roads remember me": "Works through Past-Life Echo (Survival): 10 minutes, advantage on Sense Direction and Track.",
  "beacon for the departing": "A rule for the table; the +1 status on a Dying ally's recovery is offered.",
  "bell-warden's ear": "A rule for the table: finer Spirit Sense.",
  "consecrated flame": "Works automatically: +1d6 Essence rides your first Fire damage against an Undead creature each round (spell cards). Cremation as a Partial Last Rites is a note.",
  "eyes beyond the veil": "A rule for the table: Recall Knowledge on a sensed presence; exact location on a Search.",
  "final toll": "Works through Sacred Toll: declare it before the save and apply the card's ladder.",
  "guide the last road": "Works automatically: Perform Last Rites takes 1 minute and prints the longer protections.",
  "keeper at the threshold": "Works automatically as an aura: +1 status to allies' saves within 10 feet.",
  "lantern of the last road": "Works automatically: Lantern Glow reaches 30 feet; +1 status to allies' saves against Fear within 10 feet (aura).",
  "purifying ash": "Works automatically: Purify is an innate Focus spell on your list.",
  "sepulchral endurance": "Works automatically: Base DR +1.",
  "soul-hardened": "Works automatically: the second +1 beside Soul Warden's.",
  "veil tracker": "Works automatically: rolling Spirit Lore from the sheet offers Track with it.",
  "expanded testament": "Works automatically: the second +1 beside Living Testament's.",
  "interlocking script": "Works through Warding Word: 30 feet and +2 status.",
  "no life abandoned": "Works automatically: half your level more healing to another creature at half HP or fewer (spells); Medicine by hand.",
  "script against corruption": "Works automatically: the second +1 beside Sacred Inscription's against curses.",
  "the testament stands between": "Works through Warding Word: Resistance on the ally for the round.",
  "truth burns through": "A rule for the table: ask about one statement after a Critical Detect Deception.",
  "ancestral chorus": "Works through Ancestral Communion: a Success resolves as a Critical (the card says so).",
  "bloom at the veil": "Works automatically: Spirit Sense (15 ft) on your senses; +1 racial offered on Recall Knowledge.",
  "chorus without words": "A rule for the table: speech through you and emotional impressions across a language gap.",
  "deep bloom memory": "Works through Ancestral Communion: the trained gate is waived once.",
  "deep-rooted ironcap": "Works automatically: Base DR +1 more; the forced-movement reduction is a note.",
  "gravecap resonance": "Works automatically: +2 racial against Soul Drain, possession and Soul effects.",
  "guiding luminescence": "Works automatically: your innate Guidance offers a free second-target warp.",
  "ironcap plating": "Works automatically: Base DR +1.",
  "lantern of the bloom": "Works automatically: Bloom Light reaches 30 feet; +1 status to allies' Sense Direction and saves against Fear within 10 feet (aura).",
  "rooted soul": "Works automatically: advantage against possession and soul displacement.",
  "ancestral stone": "Works automatically: Burial Lore on your specialist skills; +2 racial offered on Perform Last Rites in a stone tomb.",
  "grave-seal mason": "A rule for the table: a Grave Seal on a Success.",
  "chorus of the fallen": "Works through Death Chant: target two more allies to share the bonus.",
  "crossroads of faith": "Works through Many Roads, Many Gods: two traditions.",
  "fey-soul listener": "Works automatically: Spirit Lore on your specialist skills; Nature offers Trace Possession and Interpret Haunt; +1 racial offered.",
  "hearthward": "Works automatically: +1 racial offered on saves — tick when an ally is within 10 feet.",
  "first age theologian": "Works automatically: +1 racial offered on the named Religion checks.",
  "grasp the unseen": "Works automatically: your Strikes are Ghost Touch while Shadow Stance is up.",
  "shadowed soul": "Works automatically: Spirit Sense (15 ft) on your senses; +1 racial against possession offered.",
  "soul of the long years": "Works automatically: +1 racial against Soul, possession and Soul Drain; +2 on lifetime Recall Knowledge offered.",
  "martyr": "Works automatically: Share the Wound is an ability on your sheet.",
  "reliquarian": "Works automatically: Use Magic Device and Relic Lore; the two +1s are offered.",
  "spirit walker": "Use to choose your guide; Manifest Spirit is an ability on your sheet.",
  "veil warden": "Works automatically: Spirit Sense on your senses, +1 class on soul saves, Ward the Soul on your sheet.",
  "waywarden": "Works automatically: Warding Charm and Brew Remedy take 1 minute; Read the Signs' card notes the free question.",
  "liturgical revision": "Works automatically: +2 class offered on the substitution's Meditation check.",
  "living concordance": "Works automatically: Spell Substitution swaps two spells on one Meditation check.",
  "perfect exegesis": "Works through Recite from the Text: −2 Casting Difficulty, +1 Save DC on the card.",
  "rapid reference": "Works through Recite from the Text: once a round it may be Free.",
  "sacred marginalia": "Works automatically: +2 class offered on Learn a Spell; the four extra spells are added from the book's sheet.",
  "second discipline": "Use to choose your second discipline.",
  "a word at the right time": "A rule for the table: Aid as a Reaction.",
  "body charm": "Works through Warding Charm: Body is offered.",
  "charm of many perils": "Works through Warding Charm: every protection at once.",
  "full satchel": "Works automatically: your Preparation limit is one higher per copy.",
  "old ways endure": "Works through Warding Charm and Brew Remedy: two activations; more doses.",
  "advanced discipline": "Works through Judgement's card.",
  "chain of evidence": "A rule for the table: one time step less.",
  "final sanction": "Works through Judgement: its rider grows by 1d6 against a Subject at half HP or fewer; the −1 DB after a Critical is a note on the card.",
  "twin inquisition": "Works through Inquisition: two Subjects.",
  "unbroken pursuit": "Works automatically: +2 circumstance offered against disguises.",
  "deep reserves": "Works through Gift of Healing: twice your level + Charisma, 10 minutes.",
  "distant lifeline": "Works through Lifeline: 60 feet (120 from 11th).",
  "enhanced vitality": "Works through Restorative Hands: the reduction scales with PP.",
  "renewed restoration": "Works automatically: Restoration offers you a +4 PP warp that ignores the daily limit.",
  "resurgent healing": "Works automatically: a Dying creature you heal regains half the healing.",
  "second calling": "Use to choose your second calling.",
  "swift mender": "Works automatically: Healing spells offer you a +4 PP warp for 1 AP less.",
  "domain of the land": "Works automatically as an aura while Rooted World is active.",
  "elemental overflow": "Works automatically: when Elemental Mantle's secondary damage lands, you choose a second creature within 10 feet to take Con + half your Shaman level.",
  "second guide": "Use to choose your second guide; Manifest Spirit asks which manifests.",
  "twin manifestation": "Works through Manifest Spirit: both guides.",
  "voices of experience": "Works through Manifest Spirit (Ancestor): the skill is asked for.",
  "walk between worlds": "A rule for the table while Part the Veil is active.",
  "prepared for trouble": "Works automatically: +10 circumstance offered on Initiative.",
  "read the room (expert)": "Rolled from Sense Motive's action list.",
  "soulguard": "Works automatically: +1 class on the named saves.",
  "spell-wise defence": "Works automatically: advantage offered on saves after identifying the spell.",
  "spiritual reserve": "Works automatically: a Critical or Heroic Power Recovery recovers 1 more PP per caster level.",
  "close reading": "Works automatically: a Partial on Analyse Scripture resolves as a Success.",
  "convincing devotion": "Works automatically: +1 circumstance offered on Conceal Faith.",
  "cultural theologian": "Works automatically: +2 circumstance offered on Observe Sacred Custom.",
  "death investigator": "Works automatically: +1 circumstance offered on the follow-up checks.",
  "expert autopsist": "Works automatically: a Fumble on Perform Autopsy resolves as a Failure.",
  "perfect preservation": "Works automatically: −2 offered for improvised materials; read the ladder one step longer.",
  "sacred polyglot": "Works automatically: +2 circumstance offered on liturgical Linguistics.",
  "soul anchor": "Works automatically: +1 circumstance on soul saves.",
  "spiritual forensics": "Works automatically: +2 circumstance offered on the follow-up check."
});
