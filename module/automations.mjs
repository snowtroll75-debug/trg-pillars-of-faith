/**
 * Use-driven automations for Pillars of Faith's Chapter 2 content.
 *
 * Each entry is the same `{ hint, use(actor, item) }` shape TRG Prime's
 * own FEAT_AUTOMATION holds, keyed by the item's lowercased name, and is
 * pushed into that table by the system at `ready`. The helpers — card
 * lines, effect replacement, choosers, pending modifiers, use maths —
 * come from `game.trgPrime.modules.helpers` at call time, so this file
 * has no static import of system internals and the harness can load it
 * without Foundry.
 *
 * WHAT IS AND IS NOT DONE HERE. Anything a race or heritage grants
 * unconditionally (an ability modifier, a resistance, a skill bonus, a
 * scoped conditional) lives on the pack item's effects and flags and
 * needs no code — the same rule the core heritages follow. Only genuine
 * player choices and in-play activations are here.
 */

export const SYSTEM_ID = "trg-prime";
export const FEAT_SOURCE_FLAG = "featSource";

export function helpers() {
  const h = globalThis.game?.trgPrime?.modules?.helpers;
  if (!h) throw new Error("Pillars of Faith: TRG Prime's module helpers are not available.");
  return h;
}

/** Spend 1 AP in combat, refusing if there is none. */
export async function spendAP(actor, label, ap = 1) {
  if (!game.combat?.started) return true;
  const have = Number(actor.system.resources?.ap?.value ?? 0);
  if (have < ap) {
    ui.notifications.warn(`${label}: ${ap} AP required.`);
    return false;
  }
  await actor.update({ "system.resources.ap.value": have - ap });
  return true;
}

/** Spend the reaction in combat, refusing if none remains this round. */
export async function spendReaction(actor, label) {
  if (!game.combat?.started) return true;
  const have = Number(actor.system.resources?.reactions?.value ?? 0);
  if (have <= 0) {
    ui.notifications.warn(`${label}: no reaction available this round.`);
    return false;
  }
  await actor.update({ "system.resources.reactions.value": have - 1 });
  return true;
}

/**
 * Spend one tracked use (a Focus ability's single use, restored by
 * Refocus; a once-per-day feat's, restored by Daily Preparation).
 * Returns false and warns when none remain.
 */
export async function spendUse(item, label) {
  const { itemUsesMax, itemUsesRemaining } = helpers();
  const max = itemUsesMax(item);
  if (max === null || max === Infinity) return true;
  const remaining = itemUsesRemaining(item);
  if (remaining <= 0) {
    ui.notifications.warn(`${label}: no uses remain — Refocus or Daily Preparation restores it.`);
    return false;
  }
  await item.update({ "system.usesValue": remaining - 1 });
  return true;
}

/** The first targeted token's actor, or null. */
/** A Chapter 5 feat on the sheet, by name. */
export function hasFeat(actor, name) {
  const wanted = String(name).toLowerCase();
  return Array.from(actor.items ?? []).some((i) => (i.type === "feat" || i.type === "ability") && String(i.name).toLowerCase() === wanted);
}

/**
 * Lost Scholarship's temporary Lore (Chapter 5). A specialist skill is
 * actor data rather than an item, so the system's item-driven grants
 * cannot own it; the echo makes it here, keyed `pastLifeLore`, and the
 * `deleteActiveEffect` hook in scripts/pillars-of-faith.mjs removes it
 * when the echo's effect goes (expiry, dismissal, or the next echo).
 */
export const PAST_LIFE_LORE_FLAG = "pastLifeLore";

export async function removePastLifeLores(actor) {
  const keys = actor.getFlag(SYSTEM_ID, PAST_LIFE_LORE_FLAG) ?? [];
  if (!keys.length) return;
  const update = {};
  for (const key of keys) update[`system.specialistSkills.-=${key}`] = null;
  await actor.update(update);
  await actor.unsetFlag(SYSTEM_ID, PAST_LIFE_LORE_FLAG);
}

async function createPastLifeLores(actor, labels) {
  const existing = actor.system?.specialistSkills ?? {};
  const taken = new Set(Object.keys(existing));
  const update = {};
  const keys = [];
  for (const label of labels) {
    let key = label.replace(/[^A-Za-z0-9]+/g, " ").trim().split(" ").map((w, i) => (i ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w.toLowerCase())).join("") || "pastLifeLore";
    let n = 1;
    while (taken.has(key + (n > 1 ? n : ""))) n += 1;
    key = key + (n > 1 ? n : "");
    taken.add(key);
    update[`system.specialistSkills.${key}`] = { label, ability: "intelligence", class: 0, racial: 0, item: 0, status: 0, other: 0, total: 0, dc: 10 };
    keys.push(key);
  }
  await actor.update(update);
  await actor.setFlag(SYSTEM_ID, PAST_LIFE_LORE_FLAG, keys);
  return keys;
}

export function firstTarget() {
  const token = Array.from(game.user?.targets ?? [])[0];
  return token?.actor ?? null;
}

/* ------------------------------------------------------------------ */
/* Racial Focus abilities                                               */
/* ------------------------------------------------------------------ */

/**
 * BATTLE REMEMBERED (Chapter 5): "When you roll Initiative and your
 * Past-Life Echo is available, you may activate Past-Life Echo as a Free
 * (0 AP) action. When activated in this way, you must select Acrobatics,
 * Athletics, Intimidate, Perception or Survival." The Use takes the two
 * options — no AP, and the skills it may choose from — and TRG Prime
 * 3.625.0's `trgPrimeInitiativeRolled` hook (scripts/pillars-of-faith.mjs)
 * offers it the moment Initiative lands.
 */
export const BATTLE_REMEMBERED_SKILLS = Object.freeze(["acrobatics", "athletics", "intimidate", "perception", "survival"]);

const pastLifeEcho = {
  hint: "1 AP (Focus): choose a skill — +2 racial and its trained actions unlocked until the end of your next turn.",
  async use(actor, item, { free = false, skillKeys = null } = {}) {
    const { line, postCard, replaceFeatEffect, chooseFromList, enterText, skillActions } = helpers();
    const skills = actor.system?.skills ?? {};
    const options = Object.entries(skills)
      .filter(([key]) => !skillKeys || skillKeys.includes(key))
      .map(([key, skill]) => [key, skill?.label ?? key])
      .sort((a, b) => a[1].localeCompare(b[1]));
    if (!options.length) {
      ui.notifications.warn("Past-Life Echo: this character has no skills to echo.");
      return;
    }
    // Chapter 5 reshapes the echo: Lost Scholarship offers a Lore
    // instead of a skill; Many Lives, One Soul asks for a second.
    const lostScholarship = hasFeat(actor, "Lost Scholarship");
    const manyLives = hasFeat(actor, "Many Lives, One Soul");
    const choices = [];
    const askOne = async (ordinal) => {
      const menu = [...options.filter(([k]) => !choices.some((c) => c.key === k)), ...(lostScholarship && !choices.some((c) => c.lore) ? [["__lore", "A Lore specialist skill you do not possess (Lost Scholarship)"]] : [])];
      const pick = await chooseFromList("Past-Life Echo", `${ordinal} skill remembered from an earlier life`, menu);
      if (!pick) return false;
      if (pick === "__lore") {
        const lore = await enterText("Lost Scholarship", "The Lore (e.g. Lore: Vanished Kingdoms)", "Lore: ");
        if (!lore) return false;
        choices.push({ lore: lore.trim(), label: lore.trim() });
      } else {
        choices.push({ key: pick, label: skills[pick]?.label ?? pick });
      }
      return true;
    };
    if (!(await askOne("First"))) return;
    if (manyLives && !(await askOne("Second"))) return;
    if (!free && !(await spendAP(actor, "Past-Life Echo"))) return;
    if (!(await spendUse(item, "Past-Life Echo"))) return;
    await removePastLifeLores(actor);
    // Duration: Deep Recall makes it 1 minute; Roads Remember Me makes
    // a Survival echo 10 minutes with advantage on Sense Direction and Track.
    const survival = choices.some((c) => c.key === "survival");
    const roads = survival && hasFeat(actor, "Roads Remember Me");
    const duration = roads ? { seconds: 600, rounds: 100 } : hasFeat(actor, "Deep Recall") ? { seconds: 60, rounds: 10 } : { rounds: 2 };
    const durationText = roads ? "for 10 minutes (Roads Remember Me)" : hasFeat(actor, "Deep Recall") ? "for 1 minute (Deep Recall)" : "until the end of your next turn";
    const echoTrained = hasFeat(actor, "Echo-Trained");
    const changes = [];
    const untrained = [];
    const conditionals = [];
    const cardLines = [];
    for (const c of choices) {
      if (c.key) {
        // "may use actions that normally require at least 1 rank in that
        // skill as though you possessed 1 rank" — declared as the same
        // untrainedActions waiver the Gnome's Detect Magic uses, listing the
        // skill's trained actions by key so the gate reads it unchanged.
        const ranks = Number(skills[c.key]?.ranks ?? 0);
        const bonus = echoTrained && ranks >= 1 ? 3 : 2;
        const trained = skillActions.filter((a) => a.proficiency === "trained" && (a.skills ?? []).includes(c.key)).map((a) => a.key);
        changes.push({ key: `system.skills.${c.key}.racial`, mode: 2, value: String(bonus), priority: 20 });
        untrained.push(...trained);
        cardLines.push(line(`A former life remembers <strong>${c.label}</strong>: +${bonus} racial bonus${bonus === 3 ? " (Echo-Trained)" : ""} ${durationText}, applied automatically.`));
        cardLines.push(trained.length ? line(`Trained ${c.label} actions are open to you meanwhile: ${trained.length} action${trained.length === 1 ? "" : "s"}.`) : line(`<em>${c.label} has no trained-only actions to unlock.</em>`));
      } else {
        // Lost Scholarship: a temporary specialist skill on the sheet,
        // removed with the effect (see removePastLifeLores).
        conditionals.push({ kind: "modifier", value: 2, type: "racial", label: "Past-Life Echo", auto: false, scope: `${c.lore} checks`, when: { checkTypes: ["skill"] } });
        cardLines.push(line(`A vanished scholar remembers <strong>${c.lore}</strong>: it is on your specialist skills ${durationText} (level, class bonus, ability and the +2 specialist bonus as usual); the +2 racial is offered on its checks.`));
        if (hasFeat(actor, "Memory of Lost Masters")) {
          conditionals.push({ kind: "advantage", label: "Memory of Lost Masters", auto: false, scope: `The first ${c.lore} check before the echo ends`, when: { checkTypes: ["skill"] } });
          cardLines.push(line("<em>Memory of Lost Masters: advantage on its first check (tick it); on a Critical or Heroic with it, this use of Past-Life Echo is restored automatically — the duration still ends normally.</em>"));
        }
      }
    }
    if (roads) {
      conditionals.push({ kind: "advantage", label: "Roads Remember Me", auto: true, scope: "Sense Direction and Track", when: { checkTypes: ["skill"], actions: ["senseDirection", "track"] } });
      cardLines.push(line("Roads Remember Me: <strong>advantage</strong> on Sense Direction and Track for the duration, pre-ticked."));
    }
    if (free) cardLines.push(line("<em>Battle Remembered: activated as a Free action on your Initiative — no AP spent.</em>"));
    if (hasFeat(actor, "Reflexes of a Hundred Battles") && choices.some((c) => ["athletics", "acrobatics", "perception"].includes(c.key))) {
      cardLines.push(line("<strong>Reflexes of a Hundred Battles:</strong> you may immediately Step 5 feet as a Free action — this movement does not trigger reactions caused by ordinary movement."));
    }
    const lores = choices.filter((c) => c.lore).map((c) => c.lore);
    const loreKeys = lores.length ? await createPastLifeLores(actor, lores) : [];
    await replaceFeatEffect(actor, item, {
      name: `Past-Life Echo: ${choices.map((c) => c.label).join(" & ")}`,
      img: item.img,
      description: `${choices.map((c) => c.label).join(" and ")} remembered from an earlier life: the racial bonus, and trained actions as though you had 1 rank, ${durationText}.`,
      duration,
      changes,
      flags: { [SYSTEM_ID]: { untrainedActions: untrained, choiceLabel: choices.map((c) => c.label).join(" & "), conditionals, ...(loreKeys.length ? { [PAST_LIFE_LORE_FLAG]: loreKeys } : {}) } }
    });
    cardLines.push(line("<em>Focus use spent — Refocus restores it.</em>"));
    await postCard(actor, "Past-Life Echo", cardLines);
  }
};

const ancestralCommunion = {
  hint: "1 AP (Focus): advantage on your next Recall Knowledge check before the end of your next turn.",
  async use(actor, item) {
    const { line, postCard, replaceFeatEffect } = helpers();
    if (!(await spendAP(actor, "Ancestral Communion"))) return;
    if (!(await spendUse(item, "Ancestral Communion"))) return;
    // Deep Bloom Memory (Chapter 5): the trained gate is waived for the
    // one Recall Knowledge; Ancestral Chorus: a Success is a Critical.
    const deepBloom = hasFeat(actor, "Deep Bloom Memory");
    const chorus = hasFeat(actor, "Ancestral Chorus");
    await replaceFeatEffect(actor, item, {
      name: "Ancestral Communion: Recall Knowledge advantage",
      img: item.img,
      description: `Advantage on the next Recall Knowledge check before the end of your next turn.${deepBloom ? " Made as though you had 1 rank in a non-specialist skill." : ""}${chorus ? " A Success is a Critical (Ancestral Chorus)." : ""}`,
      duration: { rounds: 2 },
      flags: {
        [SYSTEM_ID]: {
          ...(deepBloom ? { untrainedActions: ["recallKnowledge"] } : {}),
          conditionals: [{
            kind: "advantage",
            label: "Ancestral Communion",
            scope: "Your next Recall Knowledge check",
            auto: true,
            when: { actions: ["recallKnowledge"] }
          }]
        }
      }
    });
    await postCard(actor, "Ancestral Communion", [
      line("Inherited memory surfaces: <strong>advantage</strong> on your next Recall Knowledge check before the end of your next turn — pre-ticked in that dialog."),
      ...(deepBloom ? [line("Deep Bloom Memory: the check may use a non-specialist skill you have no ranks in, as though you had 1 rank.")] : []),
      ...(chorus ? [line("<strong>Ancestral Chorus:</strong> a Success on that check is a <strong>Critical</strong> — read the card's Critical line.")] : []),
      line("<em>It grants no knowledge the Myrathi or their ancestors could never have held. Focus use spent — Refocus restores it.</em>")
    ]);
  }
};

const wardingWord = {
  hint: "Reaction (Focus): +1 status bonus to DB for the ally targeted by an attack within 10 feet (target them first; 30 feet and +2 with Interlocking Script).",
  async use(actor, item) {
    const { line, postCard, createEffectsOn, chooseFromList } = helpers();
    const target = firstTarget() ?? actor;
    // Interlocking Script (Chapter 5): 30 feet, +2; The Testament Stands
    // Between: Resistance to the triggering attack's damage type too.
    const interlocking = hasFeat(actor, "Interlocking Script");
    const bonus = interlocking ? 2 : 1;
    const range = interlocking ? 30 : 10;
    let resist = "";
    if (hasFeat(actor, "The Testament Stands Between") && target.uuid !== actor.uuid) {
      resist = await chooseFromList("The Testament Stands Between", "Damage type of the triggering attack", ["slashing", "piercing", "bludgeoning", "fire", "cold", "acid", "electricity", "essence", "sonic", "poison"].map((t) => [t, t[0].toUpperCase() + t.slice(1)])) ?? "";
    }
    if (!(await spendReaction(actor, "Warding Word"))) return;
    if (!(await spendUse(item, "Warding Word"))) return;
    // A one-turn status bonus on the protected creature's DB. Attached to
    // THEM, because it is their Defence Bonus the attack is rolled against
    // — through the GM relay when this client does not own them.
    await createEffectsOn(target, [{
      name: `Warding Word: +${bonus} status DB${resist ? `, ${resist} resistance` : ""}`,
      img: item.img,
      origin: item.uuid,
      description: `+${bonus} status bonus to DB against the triggering attack (from ${actor.name}'s Warding Word, ${range} feet)${resist ? `, and Resistance to ${resist} for the round (The Testament Stands Between)` : ""}.`,
      duration: { rounds: 1 },
      changes: [{ key: "system.combat.defence.status", mode: 0, value: String(bonus), priority: 20 }, ...(resist ? [{ key: "system.combat.resistances", mode: 2, value: `, ${resist}`, priority: 20 }] : [])],
      flags: { [SYSTEM_ID]: { [FEAT_SOURCE_FLAG]: `${item.id}:ward` } }
    }]);
    await postCard(actor, "Warding Word", [
      line(`The script flares: <strong>${target.name}</strong> gains a <strong>+${bonus} status bonus to DB</strong> against the triggering attack${resist ? ` and <strong>Resistance to ${resist}</strong> for the round` : ""} (a one-round effect on their sheet — remove it once the attack resolves if the round is not over).`),
      ...(game.combat?.started ? [line("Reaction spent.")] : []),
      line("<em>Focus use spent — Refocus restores it.</em>")
    ]);
  }
};

/* ------------------------------------------------------------------ */
/* Heritage light toggles (Lumari, Lumeri)                              */
/* ------------------------------------------------------------------ */

function lightToggle(title, baseRadius, widening) {
  return {
    hint: `Activate or suppress your dim light (${baseRadius} ft; 1 AP, Concentrate).`,
    async use(actor, item) {
      const { line, postCard, replaceFeatEffect } = helpers();
      // Lantern of the Last Road / Lantern of the Bloom (Chapter 5): 30 feet.
      const radius = widening && hasFeat(actor, widening) ? 30 : baseRadius;
      const lit = Array.from(actor.effects ?? [])
        .filter((e) => e.getFlag?.(SYSTEM_ID, FEAT_SOURCE_FLAG) === item.id)
        .map((e) => e.id);
      if (lit.length) {
        if (!(await spendAP(actor, title))) return;
        await actor.deleteEmbeddedDocuments("ActiveEffect", lit);
        await postCard(actor, title, [line("Your light is <strong>suppressed</strong>.")]);
        return;
      }
      if (!(await spendAP(actor, title))) return;
      await replaceFeatEffect(actor, item, {
        name: `${title}: dim light (${radius} ft)`,
        img: item.img,
        description: `You emit dim light within ${radius} feet. Use the ability again to suppress it.`
      });
      await postCard(actor, title, [
        line(`You emit <strong>dim light within ${radius} feet</strong> — use it again to suppress.`),
        line("<em>Token lighting isn't set automatically; adjust the token's light source to match if your table uses it.</em>")
      ]);
    }
  };
}

/* ------------------------------------------------------------------ */
/* Heritage choosers (Sapiren, Velori) — "select any one Lore"          */
/* ------------------------------------------------------------------ */

const loreChooser = {
  hint: "Name your Lore specialist skill.",
  async use(actor, item) {
    return helpers().useBackground(actor, item);
  }
};

/* ------------------------------------------------------------------ */
/* Background feats                                                     */
/* ------------------------------------------------------------------ */

const voiceOfResolve = {
  hint: "After Encouraging a frightened ally: queue their +2 circumstance bonus to the new save (target them first).",
  async use(actor) {
    const { line, postCard, addPendingModifier, chooseFromList } = helpers();
    const target = firstTarget();
    if (!target) {
      ui.notifications.warn("Voice of Resolve: target the ally you Encouraged first.");
      return;
    }
    const critical = await chooseFromList("Voice of Resolve", "Your Encourage result", [
      ["success", "Success — +2 circumstance to the new save"],
      ["critical", "Critical — +2 circumstance, and Frightened reduced by 1 after the save"]
    ]);
    if (!critical) return;
    await addPendingModifier(target, {
      value: 2, type: "circumstance", label: "Voice of Resolve",
      scope: "The new saving throw against the fear effect that Encourage granted", oneShot: true
    });
    await postCard(actor, "Voice of Resolve", [
      line(`<strong>${target.name}</strong> has a +2 circumstance bonus queued for the saving throw Encourage granted them.`),
      ...(critical === "critical"
        ? [line(`<em>Critical:</em> after resolving that save, reduce ${target.name}'s Frightened by 1.`)]
        : [])
    ]);
  }
};

const outcastsResolve = {
  hint: "Reaction, once per day: reroll a failed Will save against Fear, Charm or Compulsion (+1 if the source condemned you).",
  async use(actor, item) {
    const { line, postCard, addPendingModifier, chooseFromList } = helpers();
    if (!(await spendReaction(actor, "Outcast's Resolve"))) return;
    if (!(await spendUse(item, "Outcast's Resolve"))) return;
    const fromCondemner = await chooseFromList("Outcast's Resolve", "Does the effect come from whoever cast you out?", [
      ["no", "No — plain reroll"],
      ["yes", "Yes — +1 circumstance bonus to the reroll"]
    ]);
    if (fromCondemner === "yes") {
      await addPendingModifier(actor, {
        value: 1, type: "circumstance", label: "Outcast's Resolve",
        scope: "The Will save reroll against an effect from the creature, institution, Aspect or tradition that rejected you", oneShot: true
      });
    }
    await postCard(actor, "Outcast's Resolve", [
      line("<strong>Reroll the failed Will save</strong> from your sheet — the second result stands."),
      ...(fromCondemner === "yes" ? [line("A +1 circumstance bonus is queued for that reroll.")] : []),
      ...(game.combat?.started ? [line("Reaction spent.")] : []),
      line("<em>Once per day — restored by Daily Preparation.</em>")
    ]);
  }
};

const sanctifiedTreatment = {
  hint: "After a successful First Aid / Treat Injury / Treat Wounds: queue the patient's +1 (or +2 on a Critical) to their next save vs disease, poison or a Soul effect.",
  async use(actor) {
    const { line, postCard, addPendingModifier, chooseFromList } = helpers();
    const target = firstTarget() ?? actor;
    const result = await chooseFromList("Sanctified Treatment", "Your Medicine result", [
      ["success", "Success — +1 circumstance"],
      ["critical", "Critical — +2 circumstance"]
    ]);
    if (!result) return;
    const value = result === "critical" ? 2 : 1;
    await addPendingModifier(target, {
      value, type: "circumstance", label: "Sanctified Treatment",
      scope: "Next saving throw against a Disease, Poison or Soul-trait effect within the hour (one at a time)", oneShot: true
    });
    await postCard(actor, "Sanctified Treatment", [
      line(`<strong>${target.name}</strong> has a +${value} circumstance bonus queued for their next save against a disease, poison or Soul effect within the hour.`)
    ]);
  }
};

const doctrinalRecall = {
  hint: "After a Success or better on Recognise Doctrine: queue +1 circumstance for your next Recall Knowledge or Analyse Scripture on that doctrine (within the hour).",
  async use(actor) {
    const { line, postCard, addPendingModifier } = helpers();
    await addPendingModifier(actor, {
      value: 1, type: "circumstance", label: "Doctrinal Recall",
      scope: "Next Recall Knowledge or Analyse Scripture check concerning the doctrine you just recognised, within the hour", oneShot: true
    });
    await postCard(actor, "Doctrinal Recall", [
      line("A <strong>+1 circumstance bonus</strong> is queued for your next Recall Knowledge or Analyse Scripture check on that doctrine.")
    ]);
  }
};

const riteOfPassing = {
  hint: "After a Success or better on Perform Last Rites: target the mourner — +1 status to saves vs Fear for 24 hours.",
  async use(actor, item) {
    const { line, postCard, createEffectsOn } = helpers();
    const target = firstTarget();
    if (!target) {
      ui.notifications.warn("Rite of Passing: target the willing mourner who knew the deceased first.");
      return;
    }
    // "A creature may benefit from Rite of Passing only once per day" —
    // a standing effect is replaced, never stacked.
    const stale = Array.from(target.effects ?? [])
      .filter((e) => e.getFlag?.(SYSTEM_ID, FEAT_SOURCE_FLAG) === `${item.id}:rite`)
      .map((e) => e.id);
    if (stale.length && target.isOwner) await target.deleteEmbeddedDocuments("ActiveEffect", stale);
    await createEffectsOn(target, [{
      name: "Rite of Passing: +1 status vs Fear",
      img: item.img,
      origin: item.uuid,
      description: `+1 status bonus to saving throws against Fear effects for 24 hours (from ${actor.name}'s Rite of Passing).`,
      duration: { seconds: 86400 },
      changes: [],
      flags: {
        [SYSTEM_ID]: {
          [FEAT_SOURCE_FLAG]: `${item.id}:rite`,
          conditionals: [{
            kind: "modifier", value: 1, type: "status", label: "Rite of Passing", auto: true,
            scope: "Saving throws against Fear effects", when: { checkTypes: ["save"], traits: ["fear"] }
          }, {
            kind: "modifier", value: 1, type: "status", label: "Rite of Passing", auto: false,
            scope: "Saving throws against a fear effect that does not carry the Fear trait — tick if this roll is one", when: { checkTypes: ["save"], not: { traits: ["fear"] } }
          }]
        }
      }
    }]);
    await postCard(actor, "Rite of Passing", [
      line(`<strong>${target.name}</strong> has a +1 status bonus to saving throws against Fear for 24 hours — pre-ticked when the effect carries the trait.`)
    ]);
  }
};

/* ------------------------------------------------------------------ */
/* The tables                                                           */
/* ------------------------------------------------------------------ */

export const AUTOMATIONS = Object.freeze({
  "past-life echo": pastLifeEcho,
  "ancestral communion": ancestralCommunion,
  "warding word": wardingWord,
  "lantern glow": lightToggle("Lantern Glow", 10, "Lantern of the Last Road"),
  "bloom light": lightToggle("Bloom Light", 10, "Lantern of the Bloom"),
  "sapiren": loreChooser,
  "velori": loreChooser,
  "voice of resolve": voiceOfResolve,
  "outcast's resolve": outcastsResolve,
  "sanctified treatment": sanctifiedTreatment,
  "doctrinal recall": doctrinalRecall,
  "rite of passing": riteOfPassing
});

/**
 * Wired passives: what to say when Use is pressed on something that
 * needs no Use. Every line here names a mechanism that exists.
 */
export const PASSIVE_HINTS = Object.freeze({
  "soul warden": "Works automatically: +1 racial to saves against Soul-trait effects is pre-ticked; against Soul Drain or possession it is offered in the save dialog.",
  "sacred inscription": "Works automatically: +1 racial to saves against Curse-trait effects is pre-ticked; against other curses it is offered in the save dialog.",
  "living testament": "Works automatically: the +1 racial bonus is offered in every Religion and Linguistics check dialog with the book's wording — tick it when the check concerns sacred writing or doctrine.",
  "fungal physiology": "Works automatically: +2 racial to saves against disease and poison is pre-ticked when the effect carries the trait, offered otherwise.",
  "continuity of self": "Works automatically: the +1 racial bonus is offered in every save dialog with the book's wording — tick it against possession or memory/identity effects.",
  "spirit sense": "Works automatically: a tertiary sense (30 + Wis x 5 ft) derived on your senses list.",
  "spirit sense (velari)": "Works automatically: Spirit Sense at a fixed 60 feet on your senses list, replacing the race's.",
  "silent exchange": "Nothing to roll — silent communication with willing Myrathi within 60 feet.",
  "ashen": "Works automatically: fire resistance is on your defences; smoke immunity is a note.",
  "morrin": "Works automatically: +1 Constitution is on your attributes.",
  "velari": "Works automatically: Spirit Sense (Velari) at 60 feet replaces the race's; the +1 racial Perception bonus is offered in the Perception dialog — tick it when locating spirits, haunts, possession or undead.",
  "avenor": "Works automatically: +1 racial Medicine is on your skills; Stabilise is an innate cantrip (Focus) on your spell list.",
  "korath": "Works automatically: +1 racial Intimidate and Sense Motive are on your skills; a successful Demoralise puts a floor on the target — its frightened cannot drop below 1 until the end of your next turn — and Rally, recovery saves and Medicine all honour it.",
  "serel": "Works automatically: advantage against Illusion-trait saves is pre-ticked; +1 racial to Detect Deception applies in that action's dialog.",
  "tharos": "Works automatically: Warding Word is an ability on your sheet — use it from there.",
  "karuum": "Works automatically: Base DR 1 (natural armour) is on your defences.",
  "lumeri": "Works automatically: Bloom Light is an ability on your sheet — use it to toggle the light; Guidance is an innate cantrip (Focus).",
  "lumari": "Works automatically: Lantern Glow is an ability on your sheet — use it to toggle the light; Guidance is an innate cantrip (Focus).",
  "kelvan": "Works automatically: Sacred Toll is an innate spell-like (Focus) on your spell list — cast it from there; the target rolls a level-based Will save.",
  "morrai": "Works automatically: essence resistance is on your defences.",
  "nethri": "Works automatically: +1 racial Sense Motive is on your skills; Silent Exchange is an ability on your sheet.",
  "vaelori": "Works automatically: +1 racial Medicine is on your skills; Purify is an innate spell (Focus) on your spell list.",
  "arathi": "Works automatically: +1 Strength and +10 racial Initiative are on your sheet.",
  "dornai": "Works automatically: Death State +2 is on your sheet.",
  "sevrai": "Works automatically: +5 ft land Speed is on your sheet; the extra language is chosen from the Languages button.",
  "thaeli": "Works automatically: Guidance is an innate cantrip (Focus) on your spell list.",
  "grave vigil": "Works automatically: +2 on Search and +10 on Initiative are offered in those dialogs with the book's wording — tick when the scene is a burial site.",
  "sworn testimony": "Works automatically: the +4 is offered in every Detect Deception dialog — tick when the conversation concerns a promise you witnessed.",
  "relic appraiser": "Works automatically: +2 circumstance is pre-ticked on Trace Religious Provenance checks.",
  "veil listener": "Works automatically: +1 circumstance is pre-ticked on Trace Possession, Interpret Haunt and Identify Spiritual Affliction checks.",
  "consecrated craft": "Works automatically: the +2 is offered on Create and Repair checks — tick when the object is religious or ritual; Trace Religious Provenance is offered from your Crafting skill.",
  "pilgrim's grace": "Works automatically: Make an Impression is offered from your Culture skill; the hour-long custom bonus is a note on the feat.",
  "keeper of records": "Works automatically: a Partial on Compare Testaments is resolved as a Success for you; Research at half time is a note."
});

/**
 * The Initiative offer (TRG Prime 3.625.0's `trgPrimeInitiativeRolled`):
 * a Rhevani with Battle Remembered and a spent-able Past-Life Echo is asked,
 * on the roll, whether to activate it free. Nothing happens for anyone
 * else, and declining costs nothing.
 */
export async function offerBattleRemembered(actor) {
  if (!actor || !hasFeat(actor, "Battle Remembered")) return false;
  const echo = Array.from(actor.items ?? []).find((i) => i.type === "ability" && String(i.name).trim().toLowerCase() === "past-life echo");
  if (!echo) return false;
  const { itemUsesMax, itemUsesRemaining } = helpers();
  const max = itemUsesMax(echo);
  if (max !== null && max !== Infinity && itemUsesRemaining(echo) <= 0) return false;
  const { DialogV2 } = foundry.applications.api;
  const yes = await DialogV2.confirm({
    window: { title: "Battle Remembered", icon: "fa-solid fa-bolt" },
    classes: ["trg-prime"],
    content: `<div class="trg-prime trg-check-dialog"><p>Your body remembers violence. Activate <strong>Past-Life Echo</strong> as a <strong>Free action</strong> now?</p><p class="hint">Acrobatics, Athletics, Intimidate, Perception or Survival; the Use is spent as normal.</p></div>`,
    rejectClose: false
  });
  if (!yes) return false;
  await pastLifeEcho.use(actor, echo, { free: true, skillKeys: [...BATTLE_REMEMBERED_SKILLS] });
  return true;
}
