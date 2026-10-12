/**
 * Use-driven automations for Pillars of Faith's Chapter 3 classes.
 *
 * Same shape and same helpers as automations.mjs (the Chapter 2 set):
 * `{ hint, use(actor, item) }`, keyed by the item's lowercased name, read
 * off `game.trgPrime.modules.helpers` at call time. What lives here is
 * only what a player DOES — a Focus activation, a designation, a daily
 * choice, a reaction. Everything a class ability grants unconditionally
 * (a specialist skill, a scoped bonus, a specialist spell) is data on the
 * pack item and needs no code; the five sub-choice choosers are the
 * system's own `abilityChoices` mechanism (TRG Prime 3.563.0).
 */
import { SYSTEM_ID, FEAT_SOURCE_FLAG, helpers, spendAP, spendReaction, spendUse, firstTarget } from "./automations.mjs";

/** Every targeted token's actor, deduplicated; the actor itself when nothing is targeted. */
function targetsOrSelf(actor) {
  const found = Array.from(game.user?.targets ?? []).map((t) => t.actor).filter(Boolean);
  const unique = Array.from(new Map(found.map((a) => [a.uuid, a])).values());
  return unique.length ? unique : [actor];
}

function classBonus(actor) {
  return Math.max(0, Number(actor.system?.identity?.classBonus ?? 0) || 0);
}

function level(actor) {
  return Math.max(1, Number(actor.system?.identity?.level ?? 1) || 1);
}

function hasAbility(actor, name) {
  const wanted = String(name).toLowerCase();
  return Array.from(actor.items ?? []).some((i) => i.type === "ability" && String(i.name).toLowerCase() === wanted);
}

/** A Chapter 5 feat on the sheet (feat or ability item), by name. */
export function hasFeat(actor, name) {
  const wanted = String(name).toLowerCase();
  return Array.from(actor.items ?? []).some((i) => (i.type === "feat" || i.type === "ability") && String(i.name).toLowerCase() === wanted);
}

/** How many copies of a repeatable feat the sheet holds. */
function featCount(actor, name) {
  const wanted = String(name).toLowerCase();
  return Array.from(actor.items ?? []).filter((i) => i.type === "feat" && String(i.name).toLowerCase() === wanted).length;
}

/** Effects this automation left on an actor, by its source key. */
function ownEffects(target, key) {
  return Array.from(target.effects ?? []).filter((e) => e.getFlag?.(SYSTEM_ID, FEAT_SOURCE_FLAG) === key);
}

/** A ceil-half of the class bonus — the Folk Rites' shared number. */
function halfBonusUp(actor) {
  return Math.max(1, Math.ceil(classBonus(actor) / 2));
}

/* ================================================================== */
/* ARCHIVIST                                                            */
/* ================================================================== */

const reciteFromTheText = {
  hint: "1 AP (Focus): cast a Prayer Book spell you have not memorised today — it is marked prepared until you cast it.",
  async use(actor, item) {
    const { line, postCard, chooseFromList } = helpers();
    const unprepared = Array.from(actor.items ?? [])
      .filter((s) => s.type === "spell" && s.flags?.[SYSTEM_ID]?.spellBookPick && !s.system?.prepared)
      .sort((a, b) => a.name.localeCompare(b.name));
    if (!unprepared.length) {
      ui.notifications.warn("Recite from the Text: every spell in your Prayer Book is already memorised today (or the book is empty).");
      return;
    }
    const picked = await chooseFromList("Recite from the Text", "Prayer Book spell to invoke now", unprepared.map((s) => [s.id, `${s.name} (PP ${s.system?.ppCost ?? 0})`]));
    if (!picked) return;
    const spell = actor.items.get(picked);
    // Rapid Reference (Chapter 5): once a round, Free — for a spell of
    // base PP no more than half the Archivist's level.
    let free = false;
    if (hasFeat(actor, "Rapid Reference") && Number(spell.system?.ppCost ?? 0) <= Math.floor(level(actor) / 2)) {
      const mode = await chooseFromList("Rapid Reference", `${spell.name} is within half your level in PP`, [["free", "Free action (once per round)"], ["ap", "1 AP as usual"]]);
      if (!mode) return;
      free = mode === "free";
    }
    if (!free && !(await spendAP(actor, "Recite from the Text"))) return;
    if (!(await spendUse(item, "Recite from the Text"))) return;
    await spell.update({ "system.prepared": true, [`flags.${SYSTEM_ID}.recitedFromText`]: true });
    const exegesis = hasFeat(actor, "Perfect Exegesis");
    await postCard(actor, "Recite from the Text", [
      line(`You find the passage${free ? " almost before you need it (Free action)" : ""}: <strong>${spell.name}</strong> is on your spells table now — cast it before the end of your turn (its normal ${free ? "" : "AP and "}PP).`),
      ...(exegesis ? [line("<strong>Perfect Exegesis:</strong> this casting's Casting Difficulty is 2 lower and its Save DC 1 higher — apply both in the cast dialog.")] : []),
      line("<em>If it is not cast this turn the recitation is wasted; un-prepare it from the spell's row. Your next daily preparation rebuilds today's list regardless. Focus use spent — Refocus restores it.</em>")
    ]);
  }
};

const authoritativeInterpretation = {
  hint: "After a successful Recall Knowledge (Religion / Canon Lore): +1 status to saving throws for you, or a targeted ally within 30 feet, until the end of your next turn.",
  async use(actor, item) {
    const { line, postCard, createEffectsOn } = helpers();
    const target = firstTarget() ?? actor;
    await createEffectsOn(target, [{
      name: "Authoritative Interpretation: +1 status to saves",
      img: item.img,
      origin: item.uuid,
      description: `+1 status bonus to your next saving throw against the creature or effect ${actor.name} identified, before the end of ${actor.name}'s next turn.`,
      duration: { rounds: 2 },
      changes: ["fortitude", "reflex", "will"].map((save) => ({ key: `system.combat.saves.${save}.status`, mode: 2, value: "1", priority: 20 })),
      flags: { [SYSTEM_ID]: { [FEAT_SOURCE_FLAG]: `${item.id}:interpretation` } }
    }]);
    await postCard(actor, "Authoritative Interpretation", [
      line(`<strong>${target.name}</strong> gains a <strong>+1 status bonus to saving throws</strong> until the end of your next turn — against the creature or effect you identified; remove the effect once that save is made.`)
    ]);
  }
};

const revelator = {
  hint: "Calculated Portent: Use at daily preparation to select the save; Use again (Reaction) to grant advantage on it.",
  async use(actor, item) {
    const { line, postCard, chooseFromList } = helpers();
    const chosen = actor.getFlag(SYSTEM_ID, `calculatedPortent-${item.id}`);
    if (!chosen) {
      const save = await chooseFromList("Calculated Portent", "Saving throw the omens concern today", [["fortitude", "Fortitude"], ["reflex", "Reflex"], ["will", "Will"]]);
      if (!save) return;
      await actor.setFlag(SYSTEM_ID, `calculatedPortent-${item.id}`, save);
      await postCard(actor, "Calculated Portent", [
        line(`Today's portent concerns <strong>${save[0].toUpperCase()}${save.slice(1)}</strong> saving throws. Use again, as a Reaction, when you or an ally within 30 feet attempts one — before the result is resolved.`)
      ]);
      return;
    }
    const target = firstTarget() ?? actor;
    if (!(await spendReaction(actor, "Calculated Portent"))) return;
    if (!(await spendUse(item, "Calculated Portent"))) return;
    await actor.unsetFlag(SYSTEM_ID, `calculatedPortent-${item.id}`);
    await postCard(actor, "Calculated Portent", [
      line(`<strong>${target.name}</strong> rolls their <strong>${chosen[0].toUpperCase()}${chosen.slice(1)}</strong> save with <strong>advantage</strong> — select it in the dialog.`),
      line("<em>The portent is expended; select a new one at your next daily preparation (this also restores the use).</em>")
    ]);
  }
};

/* ================================================================== */
/* FOLKWARDEN — the Folk Rites                                          */
/* ================================================================== */

const CHARM_PROTECTIONS = {
  mind: { label: "Mind", scope: "Fear effects, Mental-trait effects and supernatural Sleep effects", traits: ["fear", "mental", "sleep"] },
  soul: { label: "Soul", scope: "Possession, Soul Drain and Soul-trait effects", traits: ["soul", "possession"] },
  hex: { label: "Hex", scope: "Effects with the Curse trait", traits: ["curse"] }
};

/** How many Preparations this Folkwarden currently has out, by the flag every rite stamps. */
function activePreparations(actor) {
  return Number(actor.getFlag(SYSTEM_ID, "folkPreparations") ?? 0);
}

async function notePreparation(actor, delta) {
  const now = Math.max(0, activePreparations(actor) + delta);
  await actor.setFlag(SYSTEM_ID, "folkPreparations", now);
  return now;
}

function preparationLine(actor, line) {
  const have = activePreparations(actor);
  const satchel = featCount(actor, "Full Satchel");
  const cap = classBonus(actor) + satchel;
  return line(`<em>Active Preparations: ${have} of ${cap} (your class bonus${satchel ? ` + ${satchel} Full Satchel` : ""})${have > cap ? " — over the limit: one existing Preparation becomes ineffective" : ""}. The counter is on your sheet's flags; Use Ward the Threshold again, or delete a charm or remedy effect, and adjust it with the effect.</em>`);
}

const wardingCharm = {
  hint: "10 minutes: fashion a charm (choose Mind, Soul or Hex; two for a Charmwright) for you or the targeted creature — a Reaction before an eligible save.",
  async use(actor, item) {
    const { line, postCard, chooseFromList, createEffectsOn } = helpers();
    const target = firstTarget() ?? actor;
    // Body Charm (Chapter 5) adds a fourth category; Charm of Many Perils
    // takes every available one at once.
    const available = { ...CHARM_PROTECTIONS, ...(hasFeat(actor, "Body Charm") ? { body: { label: "Body", scope: "Disease effects and Poison effects", traits: ["disease", "poison"] } } : {}) };
    const options = Object.entries(available).map(([k, v]) => [k, `${v.label} — ${v.scope}`]);
    let picks;
    if (hasFeat(actor, "Charm of Many Perils")) {
      picks = Object.keys(available);
    } else {
      const first = await chooseFromList("Warding Charm", "Protection", options);
      if (!first) return;
      picks = [first];
      if (hasAbility(actor, "Charmwright")) {
        const second = await chooseFromList("Warding Charm (Many-Layered)", "Second protection", options.filter(([k]) => k !== first));
        if (second) picks.push(second);
      }
    }
    const CHARM_PROTECTIONS_NOW = available;
    const bonus = halfBonusUp(actor);
    const activations = hasFeat(actor, "Old Ways Endure") ? 2 : 1;
    const traits = picks.flatMap((k) => CHARM_PROTECTIONS_NOW[k].traits);
    const scope = picks.map((k) => CHARM_PROTECTIONS_NOW[k].scope).join("; ");
    const label = picks.map((k) => CHARM_PROTECTIONS_NOW[k].label).join(" & ");
    await createEffectsOn(target, [{
      name: `Warding Charm (${label}): +${bonus} circumstance to saves`,
      img: item.img,
      origin: item.uuid,
      description: `A charm from ${actor.name}. Activate as a Reaction immediately before an eligible saving throw: +${bonus} circumstance bonus against ${scope}. Expended after ${activations === 2 ? "two activations (Old Ways Endure; never two on one save)" : "one activation"} — delete this effect then.`,
      flags: {
        [SYSTEM_ID]: {
          [FEAT_SOURCE_FLAG]: `${item.id}:charm:${foundry.utils.randomID()}`,
          conditionals: [
            { kind: "modifier", value: bonus, type: "circumstance", label: `Warding Charm (${label})`, auto: true, scope: `Reaction: ${scope}`, when: { checkTypes: ["save"], traits } },
            { kind: "modifier", value: bonus, type: "circumstance", label: `Warding Charm (${label})`, auto: false, scope: `Reaction: ${scope} — tick if this save qualifies`, when: { checkTypes: ["save"], not: { traits } } }
          ]
        }
      }
    }]);
    await notePreparation(actor, 1);
    await postCard(actor, "Warding Charm", [
      // WAYWARDEN (Chapter 5): the 10 minutes become 1 minute.
      line(hasFeat(actor, "Waywarden") ? "<em>Waywarden: fashioned in <strong>1 minute</strong> rather than 10.</em>" : "<em>Fashioned over 10 minutes.</em>"),
      line(`<strong>${target.name}</strong> carries a <strong>${label}</strong> charm: +${bonus} circumstance bonus to a matching saving throw, activated as a Reaction${activations === 2 ? " twice (Old Ways Endure)" : ""} and then expended (delete the effect).`),
      preparationLine(actor, line)
    ]);
  }
};

const brewRemedy = {
  hint: "10 minutes (healer's tools, herbs): a Disease or Poison remedy for the targeted creature — +bonus to those saves for 1 hour once taken (1 AP).",
  async use(actor, item) {
    const { line, postCard, chooseFromList, createEffectsOn } = helpers();
    const target = firstTarget() ?? actor;
    const kind = await chooseFromList("Brew Remedy", "Remedy against", [["disease", "Disease"], ["poison", "Poison"]]);
    if (!kind) return;
    const bonus = halfBonusUp(actor);
    // Deep Stores (Herbal) doubles the dose; Old Ways Endure (Chapter 5)
    // makes two, or three with the Herbalist Tradition.
    const doses = hasFeat(actor, "Old Ways Endure") ? (hasAbility(actor, "Herbal") ? 3 : 2) : (hasAbility(actor, "Herbal") ? 2 : 1);
    const label = kind[0].toUpperCase() + kind.slice(1);
    await createEffectsOn(target, [{
      name: `Brew Remedy (${label}): +${bonus} circumstance to saves${doses > 1 ? ` ×${doses} doses` : ""}`,
      img: item.img,
      origin: item.uuid,
      description: `A remedy from ${actor.name}. Consume or apply as an Interact action (1 AP): for 1 hour, +${bonus} circumstance bonus to saving throws against ${label} afflictions, including one already suffered.${doses > 1 ? ` ${doses === 3 ? "Three" : "Two"} doses — one Preparation until all are used.` : ""} Not magical healing; it removes nothing by itself.`,
      duration: { seconds: 3600 },
      flags: {
        [SYSTEM_ID]: {
          [FEAT_SOURCE_FLAG]: `${item.id}:remedy:${foundry.utils.randomID()}`,
          conditionals: [
            { kind: "modifier", value: bonus, type: "circumstance", label: `Brew Remedy (${label})`, auto: true, scope: `Saving throws against ${label} afflictions`, when: { checkTypes: ["save"], traits: [kind] } },
            { kind: "modifier", value: bonus, type: "circumstance", label: `Brew Remedy (${label})`, auto: false, scope: `Saving throws against a ${kind} that does not carry the trait — tick if this is one`, when: { checkTypes: ["save"], not: { traits: [kind] } } }
          ]
        }
      }
    }]);
    await notePreparation(actor, 1);
    await postCard(actor, "Brew Remedy", [
      line(hasFeat(actor, "Waywarden") ? "<em>Waywarden: brewed in <strong>1 minute</strong> rather than 10.</em>" : "<em>Brewed over 10 minutes.</em>"),
      line(`<strong>${target.name}</strong> holds a <strong>${label}</strong> remedy${doses > 1 ? ` (${doses === 3 ? "three" : "two"} doses)` : ""}: +${bonus} circumstance bonus to those saves for the hour after it is taken.`),
      preparationLine(actor, line)
    ]);
  }
};

const wardTheThreshold = {
  hint: "10 minutes: ward a place — every targeted willing creature (and you) gains the bonus vs Fear, possession, Soul Drain and Soul effects while within. Use again to end it.",
  async use(actor, item) {
    const { line, postCard, createEffectsOn } = helpers();
    const key = `${item.id}:threshold`;
    const standing = ownEffects(actor, key);
    if (standing.length) {
      await actor.deleteEmbeddedDocuments("ActiveEffect", standing.map((e) => e.id));
      await notePreparation(actor, -1);
      await postCard(actor, "Ward the Threshold", [
        line("The ward is <strong>ended</strong> — remove its effect from any ally who still carries it."),
        preparationLine(actor, line)
      ]);
      return;
    }
    const bonus = halfBonusUp(actor);
    const radius = hasAbility(actor, "Hearthkeeper") ? 20 : 10;
    const recipients = targetsOrSelf(actor);
    if (!recipients.some((a) => a.uuid === actor.uuid)) recipients.push(actor);
    const effect = {
      name: `Ward the Threshold: +${bonus} circumstance to saves`,
      img: item.img,
      origin: item.uuid,
      description: `Within ${actor.name}'s ${radius}-foot ward: +${bonus} circumstance bonus to saving throws against Fear, possession, Soul Drain and Soul-trait effects; while resting here, also against supernatural Sleep and effects influencing mind or soul. Ends at ${actor.name}'s next daily preparation, or when the ward's objects are moved or destroyed.`,
      flags: {
        [SYSTEM_ID]: {
          [FEAT_SOURCE_FLAG]: key,
          conditionals: [
            { kind: "modifier", value: bonus, type: "circumstance", label: "Ward the Threshold", auto: true, scope: "Saving throws against Fear, possession and Soul-trait effects while within the ward", when: { checkTypes: ["save"], traits: ["fear", "soul", "possession"] } },
            { kind: "modifier", value: bonus, type: "circumstance", label: "Ward the Threshold", auto: false, scope: "Saving throws against Soul Drain, possession, or (while resting) supernatural Sleep and mind/soul effects — tick if within the ward", when: { checkTypes: ["save"], not: { traits: ["fear", "soul", "possession"] } } }
          ]
        }
      }
    };
    for (const recipient of recipients) await createEffectsOn(recipient, [effect]);
    await notePreparation(actor, 1);
    await postCard(actor, "Ward the Threshold", [
      line(`A ${radius}-foot ward is laid: <strong>${recipients.map((a) => a.name).join(", ")}</strong> gain +${bonus} circumstance to saving throws against Fear, possession, Soul Drain and Soul effects while within it.`),
      line("<em>It does not stop anything entering, reveal hidden creatures or identify threats. Use again to end it.</em>"),
      preparationLine(actor, line)
    ]);
  }
};

/* ================================================================== */
/* GRIMWARD                                                             */
/* ================================================================== */

const INQUISITION_ACTIONS = ["detectDeception", "identifyPower", "recallKnowledge", "research", "search", "studyTarget", "track"];

// Both designations go through the system's replaceFeatEffect, which
// stamps featSource with the ITEM id (and replaces on re-Use), so the
// Inquisition effect is found by its own marker flag rather than a key.
function inquisitionEffect(actor) {
  return Array.from(actor.effects ?? []).find((e) => e.getFlag?.(SYSTEM_ID, "inquisitionSubject")) ?? null;
}
/** Every standing Inquisition — two with Twin Inquisition (Chapter 5). */
function inquisitionEffects(actor) {
  return Array.from(actor.effects ?? []).filter((e) => e.getFlag?.(SYSTEM_ID, "inquisitionSubject"));
}
function judgementEffects(actor) {
  return Array.from(actor.effects ?? []).filter((e) => e.getFlag?.(SYSTEM_ID, "judgedSubject"));
}

const inquisition = {
  hint: "1 AP: name your Subject (target a token, or type a name). Your class bonus is then offered on investigation checks about them. Use again to change or end.",
  async use(actor, item) {
    const { line, postCard, replaceFeatEffect, createEffectsOn, chooseFromList, enterText } = helpers();
    const standing = inquisitionEffects(actor);
    const twin = hasFeat(actor, "Twin Inquisition");
    const limit = twin ? 2 : 1;
    // A second slot (Twin Inquisition) is its own effect with its own
    // marker, so replaceFeatEffect on the first does not clobber it.
    let asSecond = false;
    if (standing.length) {
      const names = standing.map((e) => e.getFlag(SYSTEM_ID, "subjectName"));
      const options = [["keep", `Keep ${names.length === 1 ? "the Inquisition" : "both Inquisitions"}`]];
      if (standing.length < limit) options.push(["add", "Designate a second Subject (1 AP)"]);
      for (const e of standing) options.push([`end:${e.id}`, `End the Inquisition into ${e.getFlag(SYSTEM_ID, "subjectName")} (its Judgement ends too)`]);
      for (const e of standing) options.push([`change:${e.id}`, `Replace ${e.getFlag(SYSTEM_ID, "subjectName")} with a new Subject (1 AP)`]);
      const choice = await chooseFromList("Inquisition", `Your Subject${names.length === 1 ? " is" : "s are"} ${names.join(" and ")}`, options);
      if (!choice || choice === "keep") return;
      if (choice === "add") {
        asSecond = true;
      } else {
        const [verb, id] = choice.split(":");
        const ending = standing.find((e) => e.id === id);
        const endingName = ending.getFlag(SYSTEM_ID, "subjectName");
        await actor.deleteEmbeddedDocuments("ActiveEffect", [ending.id, ...judgementEffects(actor).filter((e) => e.getFlag(SYSTEM_ID, "subjectName") === endingName).map((e) => e.id)]);
        if (verb === "end") {
          await postCard(actor, "Inquisition", [line(`The Inquisition into <strong>${endingName}</strong> is <strong>ended</strong>.`)]);
          return;
        }
        asSecond = ending.getFlag(SYSTEM_ID, FEAT_SOURCE_FLAG) === `${item.id}:twin`;
      }
    }
    const target = firstTarget();
    let subjectName = target?.name ?? "";
    let subjectUuid = target?.uuid ?? "";
    if (!target) {
      subjectName = await enterText("Inquisition", "Name of the Subject (a creature you can see, hear, are tracking or have Studied — or, for a Relic Warden, an object or effect)", "e.g. the Abbot of Greyhaven");
      if (!subjectName) return;
    }
    if (!(await spendAP(actor, "Inquisition"))) return;
    // THE BONUS IS READ LIVE (0.3.1 / TRG Prime 3.564.0): `valueFrom:
    // "classBonus"` resolves at every roll, so a level-up needs no
    // re-Use — Graham: "remove that step (players will forget)".
    const conditionals = [
      { kind: "modifier", valueFrom: "classBonus", type: "class", label: `Inquisition: ${subjectName}`, auto: false, scope: `Investigating ${subjectName} — Detect Deception, Identify Power, Recall Knowledge, Research, Search, Study Target, Track, or identifying its curses, possession or abilities`, when: { checkTypes: ["skill"], actions: INQUISITION_ACTIONS } },
      { kind: "modifier", valueFrom: "classBonus", type: "class", label: `Inquisition: ${subjectName}`, auto: false, scope: `Sense Motive concerning ${subjectName}`, when: { checkTypes: ["skill"], subjects: ["senseMotive"], not: { actions: INQUISITION_ACTIONS } } }
    ];
    const effect = {
      name: `Inquisition: ${subjectName}`,
      img: item.img,
      description: `${subjectName} is the Subject of your Inquisition. Your class bonus applies to checks made specifically to investigate them; the GM decides whether a check is sufficiently connected.`,
      flags: { [SYSTEM_ID]: { inquisitionSubject: true, subjectName, subjectUuid, conditionals } }
    };
    if (asSecond) {
      await createEffectsOn(actor, [{ ...effect, origin: item.uuid, flags: { [SYSTEM_ID]: { ...effect.flags[SYSTEM_ID], [FEAT_SOURCE_FLAG]: `${item.id}:twin` } } }]);
    } else {
      await replaceFeatEffect(actor, item, effect);
    }
    await postCard(actor, "Inquisition", [
      line(`<strong>${subjectName}</strong> is ${asSecond ? "the second" : "the"} Subject of your Inquisition: your class bonus (+${classBonus(actor)} today, read live as you level) is offered in the dialog of investigation checks about them.`),
      line(twin ? "<em>Two Subjects at a time (Twin Inquisition), each Judged independently; a third replaces one.</em>" : "<em>One Subject at a time; it persists until you end it, choose another, or the creature dies.</em>")
    ]);
  }
};

const judgement = {
  hint: "After at least a Success identifying your Subject: place them under Judgement (+1 attack, +1 saves, secondary damage). Use again to withdraw.",
  async use(actor, item) {
    const { line, postCard, replaceFeatEffect, createEffectsOn, chooseFromList } = helpers();
    const standing = judgementEffects(actor);
    const inquisitions = inquisitionEffects(actor);
    const judgedNames = new Set(standing.map((e) => e.getFlag(SYSTEM_ID, "subjectName")));
    const unjudged = inquisitions.filter((e) => !judgedNames.has(e.getFlag(SYSTEM_ID, "subjectName")));
    if (standing.length && !unjudged.length) {
      await actor.deleteEmbeddedDocuments("ActiveEffect", standing.map((e) => e.id));
      await postCard(actor, "Judgement", [line("Judgement is <strong>withdrawn</strong>.")]);
      return;
    }
    if (!inquisitions.length) {
      ui.notifications.warn("Judgement: you have no Subject of Inquisition — Use Inquisition first.");
      return;
    }
    // Twin Inquisition: a second Subject may be Judged independently, or
    // the standing Judgement withdrawn.
    let inq = unjudged[0];
    if (standing.length || unjudged.length > 1) {
      const options = unjudged.map((e) => [`judge:${e.id}`, `Judge ${e.getFlag(SYSTEM_ID, "subjectName")}`]);
      if (standing.length) options.push(["withdraw", `Withdraw Judgement from ${Array.from(judgedNames).join(" and ")}`]);
      const choice = await chooseFromList("Judgement", "Which Subject", options);
      if (!choice) return;
      if (choice === "withdraw") {
        await actor.deleteEmbeddedDocuments("ActiveEffect", standing.map((e) => e.id));
        await postCard(actor, "Judgement", [line("Judgement is <strong>withdrawn</strong>.")]);
        return;
      }
      inq = unjudged.find((e) => e.id === choice.split(":")[1]);
    }
    const asSecond = standing.length > 0;
    const subjectName = inq.getFlag(SYSTEM_ID, "subjectName");
    const subjectUuid = inq.getFlag(SYSTEM_ID, "subjectUuid") || (firstTarget()?.uuid ?? "");
    const lvl = level(actor);
    const dice = lvl >= 17 ? "3d6" : lvl >= 9 ? "2d6" : "1d6";
    const attackWhen = subjectUuid ? { checkTypes: ["attack"], targetUuids: [subjectUuid] } : { checkTypes: ["attack"] };
    const saveWhen = subjectUuid ? { checkTypes: ["save"], sourceUuids: [subjectUuid] } : { checkTypes: ["save"] };
    const judgementEffect = {
      name: `Judgement: ${subjectName}`,
      img: item.img,
      description: `${subjectName} is Judged: +1 circumstance to attack rolls against them, +1 circumstance to saving throws against their effects, and once per round the first Strike or Grimward spell that damages them inflicts +${dice} secondary damage of the same type${hasAbility(actor, "Grave Warden") ? " (essence instead, against Undead or Unliving — Consecrated Judgement)" : ""}. Ends with the Inquisition.`,
      flags: {
        [SYSTEM_ID]: {
          judgedSubject: true,
          subjectName,
          // The secondary damage is a declared strike rider (TRG Prime
          // 3.564.0): the attack workflow adds the dice to the first
          // damaging Strike against the Subject each round, in the
          // weapon's own type — Graham: "should be automated".
          // FINAL SANCTION (3.625.0): "if that creature currently has half its
          // maximum Hit Points or fewer, increase the Judgement damage by 1d6"
          // — the rider itself grows, on the damage path that knows the HP.
          strikeDamageRider: { dice, label: "Judgement", targetUuids: subjectUuid ? [subjectUuid] : [], oncePerRound: true, ...(hasFeat(actor, "Final Sanction") ? { lowHalfExtraDice: "1d6" } : {}),
            // RESTLESS END (Grave Warden, Advanced Discipline; 0.11.0 on TRG
            // Prime 3.630.0): "+1d6 against Undead or Unliving creatures when you
            // choose to inflict it as Essence damage" — grown on the damage path
            // that knows what it hit.
            ...(hasAbility(actor, "Grave Warden") && hasFeat(actor, "Advanced Discipline") ? { extraVs: { dice: "1d6", label: "Restless End", targetTypes: ["undead"], targetTraits: ["undead", "unliving"] } } : {}) },
          // SANCTIONED STRIKE (Grimward 4th; 3.625.0): weapon and unarmed
          // attacks against the Subject count as magical for Resistance and
          // Immunity — read by the damage path off this declaration.
          ...(hasAbility(actor, "Sanctioned Strike") && subjectUuid ? { magicalAttacks: { label: "Sanctioned Strike", targetUuids: [subjectUuid] } } : {}),
          conditionals: [
            { kind: "modifier", value: 1, type: "circumstance", label: `Judgement: ${subjectName}`, auto: Boolean(subjectUuid), scope: `Attack rolls against ${subjectName}`, when: attackWhen },
            { kind: "modifier", value: 1, type: "circumstance", label: `Judgement: ${subjectName}`, auto: Boolean(subjectUuid), scope: `Saving throws against effects created by ${subjectName}`, when: saveWhen }
          ]
        }
      }
    };
    if (asSecond) {
      await createEffectsOn(actor, [{ ...judgementEffect, origin: item.uuid, flags: { [SYSTEM_ID]: { ...judgementEffect.flags[SYSTEM_ID], [FEAT_SOURCE_FLAG]: `${item.id}:twin` } } }]);
    } else {
      await replaceFeatEffect(actor, item, judgementEffect);
    }
    const graveWarden = hasAbility(actor, "Grave Warden") && hasFeat(actor, "Advanced Discipline");
    await postCard(actor, "Judgement", [
      line(`<strong>${subjectName}</strong> is under Judgement: +1 circumstance to attacks against them and to saves against their effects${subjectUuid ? " (pre-ticked when the roll knows the creature)" : " (offered — tick when the roll concerns them)"}.`),
      line(`Once per round, the first time you damage them with a Strike: <strong>+${dice} secondary damage</strong> of the same type, added to the damage roll automatically${subjectUuid ? "" : " (offered on every Strike, since the Subject was typed rather than targeted)"}. A Grimward spell's first damage: add it by hand.`),
      ...(lvl >= 4 ? [line("<em>Sanctioned Strike: your weapon and unarmed attacks against them count as magical for Resistance and Immunity.</em>")] : []),
      ...(hasFeat(actor, "Final Sanction") ? [line("<em>Final Sanction: when they are at half HP or fewer, the rider is 1d6 more (added on the damage card); after a Critical against them they take −1 status to DB until the beginning of your next turn — set by hand.</em>")] : []),
      ...(graveWarden ? [line("<em>Restless End (Advanced Discipline): against an Undead or Unliving Subject the Judgement damage is 1d6 more, added to the damage roll — it assumes you take it as Essence (Consecrated Judgement).</em>")] : [])
    ]);
  }
};

const preparedAdversary = {
  hint: "When Initiative is rolled with your Subject (also a Studied Target) present: +10 class to this Initiative check, and a free Recall Knowledge that can Judge them.",
  async use(actor, item) {
    const { line, postCard, replaceFeatEffect } = helpers();
    const inq = inquisitionEffect(actor);
    if (!inq) {
      ui.notifications.warn("Prepared Adversary: you have no Subject of Inquisition.");
      return;
    }
    await replaceFeatEffect(actor, item, {
      name: "Prepared Adversary: +10 class to Initiative",
      img: item.img,
      description: `+10 class bonus to the Initiative check of this encounter (${inq.getFlag(SYSTEM_ID, "subjectName")} is present). Remove once Initiative is rolled.`,
      duration: { rounds: 1 },
      changes: [{ key: "system.combat.initiative.class", mode: 2, value: "10", priority: 20 }]
    });
    await postCard(actor, "Prepared Adversary", [
      line(`<strong>+10 class bonus to Initiative</strong> is on your sheet for this roll — remove the effect once rolled.`),
      line("<em>Then make an appropriate Recall Knowledge check as a free action: at least a Success places the creature under Judgement (Use Judgement).</em>")
    ]);
  }
};

/* ================================================================== */
/* HEALER                                                               */
/* ================================================================== */

/** Add HP to a target, capped at its maximum, returning what was wasted. */
async function healActor(target, amount) {
  const hp = target.system?.resources?.hp ?? {};
  const value = Number(hp.value ?? 0);
  const max = Number(hp.max ?? 0);
  const room = Math.max(0, max - value);
  const applied = Math.min(room, amount);
  if (applied > 0) await target.update({ "system.resources.hp.value": value + applied });
  return { applied, wasted: amount - applied };
}

const giftOfHealing = {
  hint: "After a Healing spell restores HP to others: the targeted recipient regains your level + Wisdom more (Overflow → temp HP from 3rd; Sanctuary Keeper → +2 status DB).",
  async use(actor, item) {
    const { line, postCard, createEffectsOn } = helpers();
    const target = firstTarget();
    if (!target) {
      ui.notifications.warn("Gift of Healing: target the recipient (a creature other than yourself).");
      return;
    }
    if (target.uuid === actor.uuid) {
      ui.notifications.warn("Gift of Healing does not apply when you are the only target of the spell.");
      return;
    }
    const wis = Number(actor.system?.attributes?.wisdom?.total ?? 0);
    const amount = Math.max(0, level(actor) + wis);
    const lines = [];
    if (target.isOwner) {
      const { applied, wasted } = await healActor(target, amount);
      lines.push(line(`<strong>${target.name}</strong> regains <strong>${applied}</strong> additional HP (your level ${level(actor)} + Wisdom ${wis >= 0 ? "+" : ""}${wis}).`));
      if (wasted > 0 && hasAbility(actor, "Restorative Overflow")) {
        // Deep Reserves (Chapter 5): twice the level + Charisma, 10 minutes.
        const deep = hasFeat(actor, "Deep Reserves");
        const cha = Number(actor.system?.attributes?.charisma?.total ?? 0);
        const cap = deep ? Math.max(0, 2 * level(actor) + cha) : amount;
        const temp = Math.min(cap, wasted);
        const current = Number(target.system?.resources?.hp?.temp ?? 0);
        if (temp > current) await target.update({ "system.resources.hp.temp": temp });
        lines.push(line(`Restorative Overflow: ${temp} temporary HP for ${deep ? "10 minutes (Deep Reserves)" : "1 minute"} (the higher value kept${temp > current ? "" : " — their current temp HP is higher"}).`));
      } else if (wasted > 0) {
        lines.push(line(`<em>${wasted} of it was beyond their maximum.</em>`));
      }
    } else {
      lines.push(line(`<strong>${target.name}</strong> regains <strong>${amount}</strong> additional HP — apply it on their sheet (you do not own it).`));
    }
    if (hasAbility(actor, "Sanctuary Keeper")) {
      await createEffectsOn(target, [{
        name: "Sheltering Care: +2 status DB",
        img: item.img,
        origin: item.uuid,
        description: `+2 status bonus to DB until the beginning of ${actor.name}'s next turn.`,
        duration: { rounds: 1 },
        changes: [{ key: "system.combat.defence.status", mode: 2, value: "2", priority: 20 }],
        flags: { [SYSTEM_ID]: { [FEAT_SOURCE_FLAG]: `${item.id}:shelter` } }
      }]);
      lines.push(line("Sheltering Care: <strong>+2 status bonus to DB</strong> until the beginning of your next turn."));
    }
    if (hasAbility(actor, "Lifebinder")) lines.push(line("<em>Vital Surge: once this round you may maximise one healing die the spell rolled.</em>"));
    await postCard(actor, "Gift of Healing", lines);
  }
};

const healersTouch = {
  hint: "Reaction (Focus): all targets of your healing spell regain HP equal to its PP cost (your level for an innate spell).",
  async use(actor, item) {
    const { line, postCard, enterText } = helpers();
    const raw = await enterText("Healer's Touch", "PP the triggering spell cost (your level for an innate spell)", String(level(actor)));
    if (raw === null || raw === undefined || raw === "") return;
    const amount = Math.max(0, Math.floor(Number(raw)) || 0);
    if (!(await spendReaction(actor, "Healer's Touch"))) return;
    if (!(await spendUse(item, "Healer's Touch"))) return;
    const lines = [];
    for (const target of targetsOrSelf(actor)) {
      if (target.isOwner) {
        const { applied } = await healActor(target, amount);
        lines.push(line(`<strong>${target.name}</strong> regains <strong>${applied}</strong> additional HP.`));
      } else {
        lines.push(line(`<strong>${target.name}</strong> regains <strong>${amount}</strong> additional HP — apply it on their sheet.`));
      }
    }
    lines.push(line("<em>Focus use and reaction spent — Refocus restores the use.</em>"));
    await postCard(actor, "Healer's Touch", lines);
  }
};

const RESTORATIVE_BANDS = [
  { pp: 2, conditions: ["fatigued", "sickened"], by: 1 },
  { pp: 4, conditions: ["dazed", "weakened"], by: 1 },
  { pp: 6, conditions: ["injured"], by: 1 },
  { pp: 8, conditions: ["soulDrain"], by: 5 },
  { pp: 10, conditions: ["doomed"], by: 1 }
];

const restorativeHands = {
  hint: "Free, after your healing spell: reduce a condition on the targeted recipient by one, by the spell's PP band (2 fatigued/sickened; 4 dazed/weakened; 6 injured; 8 Soul Drain by 5; 10 doomed).",
  async use(actor) {
    const { line, postCard, chooseFromList, enterText } = helpers();
    const target = firstTarget() ?? actor;
    const options = RESTORATIVE_BANDS.flatMap((band) => band.conditions.map((c) => [`${band.pp}:${c}`, `PP ${band.pp} — ${c === "soulDrain" ? "Soul Drain" : c[0].toUpperCase() + c.slice(1)} by ${c === "soulDrain" ? band.by + (hasAbility(actor, "Soul Tender") ? 5 : 0) : band.by}`]));
    const picked = await chooseFromList("Restorative Hands", `Condition to reduce on ${target.name} (by the spell's PP)`, options);
    if (!picked) return;
    const [, key] = picked.split(":");
    const band = RESTORATIVE_BANDS.find((b) => b.conditions.includes(key));
    let by = band.by + (key === "soulDrain" && hasAbility(actor, "Soul Tender") ? 5 : 0);
    // Enhanced Vitality (Chapter 5): the reduction repeats per complete
    // multiple of the band's PP actually spent.
    if (hasFeat(actor, "Enhanced Vitality")) {
      const raw = await enterText("Enhanced Vitality", "PP the triggering spell cost", String(band.pp));
      const spent = Math.max(band.pp, Math.floor(Number(raw)) || band.pp);
      const times = Math.max(1, Math.floor(spent / band.pp));
      by = band.by * times + (key === "soulDrain" && hasAbility(actor, "Soul Tender") ? 5 : 0);
    }
    const current = Number(target.getConditionValue?.(key) ?? 0);
    if (!current) {
      ui.notifications.warn(`Restorative Hands: ${target.name} has no ${key} to reduce.`);
      return;
    }
    if (!target.isOwner) {
      await postCard(actor, "Restorative Hands", [line(`Reduce <strong>${target.name}</strong>'s ${key} by ${by} on their sheet.`)]);
      return;
    }
    const next = Math.max(0, current - by);
    if (next > 0) await target.toggleStatusEffect(key, { value: next });
    else await target.toggleStatusEffect(key, { active: false });
    await postCard(actor, "Restorative Hands", [
      line(`<strong>${target.name}</strong>'s ${key === "soulDrain" ? "Soul Drain" : key} reduced by ${by} (now ${next}).`),
      line("<em>A target may benefit from Restorative Hands once per day.</em>")
    ]);
  }
};

const lifeline = {
  hint: "Reaction (Focus): a living ally within 30 feet (60 with Distant Lifeline; 120 from 11th) reduced to 0 HP instead stays at 1 HP, not Dying, and gains Fatigued 1 (target them).",
  async use(actor, item) {
    const { line, postCard } = helpers();
    const target = firstTarget();
    if (!target) {
      ui.notifications.warn("Lifeline: target the ally whose life is slipping.");
      return;
    }
    if (!(await spendReaction(actor, "Lifeline"))) return;
    if (!(await spendUse(item, "Lifeline"))) return;
    if (target.isOwner) {
      await target.update({ "system.resources.hp.value": 1 });
      if (target.getConditionValue?.("dying")) await target.toggleStatusEffect("dying", { active: false });
      const fatigued = Number(target.getConditionValue?.("fatigued") ?? 0);
      await target.toggleStatusEffect("fatigued", { value: fatigued + 1 });
    }
    await postCard(actor, "Lifeline", [
      line(`You seize <strong>${target.name}</strong>'s fading life${hasFeat(actor, "Distant Lifeline") ? ` from up to ${level(actor) >= 11 ? 120 : 60} feet (Distant Lifeline)` : ""}: they remain at <strong>1 HP</strong> and do not gain Dying from the triggering damage; they gain <strong>Fatigued 1</strong>.${target.isOwner ? "" : " (Apply on their sheet.)"}`),
      line("<em>Persistent damage, Bleed and other ongoing effects of the attack remain. Lifeline cannot prevent an effect that kills outright. Focus use spent — Refocus restores it.</em>")
    ]);
  }
};

/* ================================================================== */
/* SHAMAN                                                               */
/* ================================================================== */

/** "one PP 2 at 1st; two to PP 4 at 6th; three to PP 10 at 12th; four to PP 14 at 18th." */
export function spiritCommunionAllowance(lvl) {
  if (lvl >= 18) return { count: 4, maxPP: 14 };
  if (lvl >= 12) return { count: 3, maxPP: 10 };
  if (lvl >= 6) return { count: 2, maxPP: 4 };
  return { count: 1, maxPP: 2 };
}

const spiritCommunion = {
  hint: "Daily preparation: add temporary Ethereal spell(s) to your list until your next communion.",
  async use(actor, item) {
    const { line, postCard, chooseFromList } = helpers();
    const { count, maxPP } = spiritCommunionAllowance(level(actor));
    const stale = Array.from(actor.items ?? []).filter((s) => s.type === "spell" && s.flags?.[SYSTEM_ID]?.spiritCommunion);
    if (stale.length) await actor.deleteEmbeddedDocuments("Item", stale.map((s) => s.id));
    const pack = game.trgPrime.modules.contentPack("spells");
    if (!pack) {
      ui.notifications.warn("Spirit Communion: the spells compendium is not available.");
      return;
    }
    const index = await pack.getIndex({ fields: ["system.tradition", "system.ppCost", "system.specialist", "system.traits"] });
    const held = new Set(Array.from(actor.items ?? []).filter((s) => s.type === "spell").map((s) => String(s.name).toLowerCase()));
    const eligible = Array.from(index.values()).filter((e) => {
      const traditions = String(e.system?.tradition ?? "").toLowerCase();
      const pp = Number(e.system?.ppCost ?? 0);
      return traditions.includes("ethereal") && !e.system?.specialist && pp > 0 && pp <= maxPP && !held.has(String(e.name).toLowerCase());
    }).sort((a, b) => a.name.localeCompare(b.name));
    const chosen = [];
    for (let i = 0; i < count; i += 1) {
      const options = eligible.filter((e) => !chosen.some((c) => c._id === e._id)).map((e) => [e._id, `${e.name} (PP ${e.system?.ppCost})`]);
      if (!options.length) break;
      const picked = await chooseFromList("Spirit Communion", `Ethereal spell ${i + 1} of ${count} (up to PP ${maxPP})`, options);
      if (!picked) break;
      chosen.push(eligible.find((e) => e._id === picked));
    }
    if (!chosen.length) return;
    const created = [];
    for (const entry of chosen) {
      const document = await pack.getDocument(entry._id);
      const data = document.toObject();
      delete data._id;
      data.flags = { ...(data.flags ?? {}), [SYSTEM_ID]: { ...(data.flags?.[SYSTEM_ID] ?? {}), spiritCommunion: true, grantedBy: { sourceId: item.id, sourceName: item.name, requested: entry.name } } };
      created.push(data);
    }
    await actor.createEmbeddedDocuments("Item", created);
    await postCard(actor, "Spirit Communion", [
      line(`Your Spirit Guide teaches <strong>${chosen.map((c) => c.name).join(", ")}</strong> for the day — on your spells table until your next communion.`),
      ...(stale.length ? [line(`<em>Yesterday's (${stale.map((s) => s.name).join(", ")}) faded.</em>`)] : [])
    ]);
  }
};

/** The one-minute manifestation for each guide: effect changes, conditionals and card lines. */
const MANIFESTATIONS = {
  "ancestor spirit": {
    name: "Chorus of the Past",
    changes: [],
    conditionals: [
      { kind: "advantage", label: "Chorus of the Past", auto: true, scope: "Recall Knowledge and Sense Motive checks", when: { checkTypes: ["skill"], actions: ["recallKnowledge", "detectDeception"] } },
      { kind: "advantage", label: "Chorus of the Past", auto: true, scope: "Sense Motive checks", when: { checkTypes: ["skill"], subjects: ["senseMotive"], not: { actions: ["recallKnowledge", "detectDeception"] } } },
      { kind: "modifier", value: 1, type: "circumstance", label: "Chorus of the Past", auto: true, scope: "Will saving throws", when: { checkTypes: ["save"], subjects: ["will"] } }
    ],
    lines: ["Advantage on Recall Knowledge and Sense Motive checks, and +1 circumstance to Will saves, for 1 minute."]
  },
  "beast spirit": {
    name: "Beast Within",
    // POOL SLOTS, not the pool (0.3.1). Live test 17 Sep 2026: an ADD on
    // `movement.land` itself and on a `defence.dodge` slot that the pool
    // does not have both reached the sheet and moved nothing. The speeds
    // and DB are typed pools; `other` is the untyped slot both read.
    changes: [
      { key: "system.combat.movement.land.other", mode: 2, value: "10", priority: 20 },
      { key: "system.combat.defence.other", mode: 2, value: "1", priority: 20 }
    ],
    conditionals: [],
    lines: ["+10 feet Speed and +1 dodge bonus to DB (carried as untyped — the DB pool has no dodge slot for an effect) for 1 minute; you have Scent as a tertiary sense meanwhile (note it on your senses)."]
  },
  "elemental spirit": {
    name: "Elemental Mantle",
    // "Once per round, when a Verdant spell of yours inflicts [your element]
    // damage, one damaged target suffers +1d6 secondary [element] damage"
    // (2d6 from 9th, 3d6 from 17th) — applied by the spell's damage path.
    flags: (actor) => {
      const element = String(actor.getFlag(SYSTEM_ID, "elementalSpirit") ?? "").toLowerCase();
      if (!element) return {};
      const lvl = level(actor);
      const dice = lvl >= 17 ? "3d6" : lvl >= 9 ? "2d6" : "1d6";
      return { spellDamageRider: { label: "Elemental Mantle", dice, damageType: element, when: { damageTypes: [element], traditions: ["verdant"] }, oncePerRoundAny: true } };
    },
    changes: (actor) => {
      const element = actor.getFlag(SYSTEM_ID, "elementalSpirit") ?? "";
      return element ? [{ key: "system.combat.resistances", mode: 2, value: `, ${element}`, priority: 20 }] : [];
    },
    conditionals: [],
    lines: (actor) => {
      const element = actor.getFlag(SYSTEM_ID, "elementalSpirit") ?? "your element";
      const lvl = level(actor);
      const dice = lvl >= 17 ? "3d6" : lvl >= 9 ? "2d6" : "1d6";
      return [`Resistance to ${element} for 1 minute; once per round, when a Verdant spell of yours inflicts ${element} damage, the first damaged target suffers +${dice} secondary ${element} damage, rolled on the spell's card.${hasFeat(actor, "Elemental Overflow") ? " Elemental Overflow: each time it does, you are asked for a second creature within 10 feet of that target." : ""}`];
    }
  },
  "land spirit": {
    name: "Rooted World",
    changes: [{ key: "system.combat.naturalArmourBase.natural", mode: 2, value: "1", priority: 20 }],
    conditionals: [
      { kind: "advantage", label: "Rooted World", auto: false, scope: "Checks and saving throws to resist being Shoved, Tripped or moved against your will", when: { checkTypes: ["save", "skill", "attribute"] } }
    ],
    lines: ["Base DR +1 for 1 minute; advantage against being Shoved, Tripped or moved (offered in those dialogs); you ignore ordinary natural difficult terrain."]
  },
  "veil spirit": {
    name: "Part the Veil",
    changes: [{ key: "system.combat.resistances", mode: 2, value: ", essence", priority: 20 }],
    conditionals: [],
    lines: ["Resistance to essence damage for 1 minute; Spirit Sense reaches 60 feet, spirits it detects can be targeted, and your spells treat incorporeal spirits as though you had the means to affect them."]
  }
};

/** The Predator's Manifestation natural attack this Shaman chose, from the companions pack. */
async function predatorWeapon(actor, item) {
  const type = actor.getFlag(SYSTEM_ID, `predatorsManifestation-${Array.from(actor.items ?? []).find((i) => i.type === "feat" && i.name === "Predator's Manifestation")?.id}`);
  if (!type) return null;
  const pack = game.trgPrime.modules.contentPack("companions");
  const index = await pack.getIndex();
  const entry = Array.from(index.values()).find((e) => e.name === `Predator's Manifestation (${type})`);
  if (!entry) return null;
  const data = (await pack.getDocument(entry._id)).toObject();
  delete data._id;
  if (level(actor) >= 11) data.system.damage = "1d8";
  foundry.utils.setProperty(data, `flags.${SYSTEM_ID}.grantedBy`, { sourceId: item.id, sourceName: item.name, requested: data.name });
  foundry.utils.setProperty(data, `flags.${SYSTEM_ID}.manifestedWeapon`, true);
  return data;
}

const manifestSpirit = {
  hint: "1 AP (Focus): your Spirit Guide's manifestation for 1 minute. Use again to dismiss.",
  async use(actor, item) {
    const { line, postCard, replaceFeatEffect, chooseFromList, createEffectsOn } = helpers();
    const standing = ownEffects(actor, item.id);
    if (standing.length) {
      await actor.deleteEmbeddedDocuments("ActiveEffect", standing.map((e) => e.id));
      // Predator's Manifestation's attack leaves with the manifestation.
      const manifested = Array.from(actor.items ?? []).filter((i) => i.type === "weapon" && i.flags?.[SYSTEM_ID]?.manifestedWeapon);
      if (manifested.length) await actor.deleteEmbeddedDocuments("Item", manifested.map((i) => i.id));
      await postCard(actor, "Manifest Spirit", [line("The manifestation is <strong>dismissed</strong>.")]);
      return;
    }
    const guides = Array.from(actor.items ?? []).filter((i) => i.type === "ability" && MANIFESTATIONS[String(i.name).toLowerCase()]);
    if (!guides.length) {
      ui.notifications.warn("Manifest Spirit: choose your Spirit Guide first (Use Spirit Guide).");
      return;
    }
    // Second Guide (Chapter 5): choose which guide manifests; Twin
    // Manifestation: both at once.
    let chosen = guides.slice(0, 1);
    if (guides.length > 1) {
      if (hasFeat(actor, "Twin Manifestation")) {
        chosen = guides;
      } else {
        const picked = await chooseFromList("Manifest Spirit", "Which guide manifests", guides.map((g) => [g.id, `${g.name} — ${MANIFESTATIONS[String(g.name).toLowerCase()].name}`]));
        if (!picked) return;
        chosen = guides.filter((g) => g.id === picked);
      }
    }
    // Voices of Experience (Ancestor): a skill treated as held at half
    // the Shaman's level in ranks — the trained gates read the waiver.
    let voices = null;
    if (hasFeat(actor, "Voices of Experience") && chosen.some((g) => String(g.name).toLowerCase() === "ancestor spirit")) {
      const skills = actor.system?.skills ?? {};
      const options = Object.entries(skills).map(([key, skill]) => [key, skill?.label ?? key]).sort((a, b) => a[1].localeCompare(b[1]));
      const key = await chooseFromList("Voices of Experience", `Skill your guide lends (treated as ${Math.floor(level(actor) / 2)} ranks)`, options);
      if (key) voices = { key, label: skills[key]?.label ?? key };
    }
    if (!(await spendAP(actor, "Manifest Spirit"))) return;
    if (!(await spendUse(item, "Manifest Spirit"))) return;
    const ms = chosen.map((g) => MANIFESTATIONS[String(g.name).toLowerCase()]);
    const changes = ms.flatMap((m) => (typeof m.changes === "function" ? m.changes(actor) : m.changes));
    const lines = ms.flatMap((m) => (typeof m.lines === "function" ? m.lines(actor) : m.lines));
    const conditionals = ms.flatMap((m) => m.conditionals);
    const flags = { conditionals };
    // A MANIFESTATION'S OWN FLAGS (0.11.0) — Elemental Mantle's secondary
    // damage is a caster spell-damage rider (TRG Prime 3.630.0's tradition
    // gate and once-a-round-overall marker).
    for (const m of ms) if (typeof m.flags === "function") Object.assign(flags, m.flags(actor) ?? {});
    if (voices) {
      const { skillActions } = helpers();
      flags.untrainedActions = skillActions.filter((a) => (a.skills ?? []).includes(voices.key)).map((a) => a.key);
      flags.choiceLabel = voices.label;
      lines.push(`Voices of Experience: you are treated as having ${Math.floor(level(actor) / 2)} ranks in ${voices.label} (its rank-gated actions open; note the ranks on the roll).`);
    }
    await replaceFeatEffect(actor, item, {
      name: `Manifest Spirit: ${ms.map((m) => m.name).join(" & ")}`,
      img: item.img,
      description: lines.join(" "),
      duration: { seconds: 60, rounds: 10 },
      changes,
      flags: { [SYSTEM_ID]: flags }
    });
    const cardLines = [line(`Your ${chosen.map((g) => g.name).join(" and ")} manifest${chosen.length === 1 ? "s" : ""} — <strong>${ms.map((m) => m.name).join(" & ")}</strong>: ${lines.join(" ")}`)];
    if (chosen.some((g) => String(g.name).toLowerCase() === "beast spirit") && hasFeat(actor, "Predator's Manifestation")) {
      const weapon = await predatorWeapon(actor, item);
      if (weapon) {
        await actor.createEmbeddedDocuments("Item", [weapon]);
        cardLines.push(line(`Predator's Manifestation: <strong>${weapon.name}</strong> (${weapon.system.damage}, Magical) is on your weapons until the manifestation ends.`));
      } else {
        cardLines.push(line("<em>Predator's Manifestation: Use the feat to choose its damage type first.</em>"));
      }
    }
    cardLines.push(line("<em>Dismiss it early with a Free action (Use again). Focus use spent — Refocus restores it.</em>"));
    await postCard(actor, "Manifest Spirit", cardLines);
  }
};

const spiritIntercession = {
  hint: "Reaction (Focus), when you (or from 7th an ally within 30 feet) fail a save: reroll it and keep the better result.",
  async use(actor, item) {
    const { line, postCard } = helpers();
    const target = firstTarget() ?? actor;
    if (target.uuid !== actor.uuid && level(actor) < 7) {
      ui.notifications.warn("Spirit Intercession: an ally's save can be interceded from 7th level.");
      return;
    }
    if (!(await spendReaction(actor, "Spirit Intercession"))) return;
    if (!(await spendUse(item, "Spirit Intercession"))) return;
    await postCard(actor, "Spirit Intercession", [
      line(`Your Spirit Guide intervenes: <strong>${target.name}</strong> rerolls the failed saving throw and keeps the better result.`),
      line("<em>Focus use and reaction spent — Refocus restores the use.</em>")
    ]);
  }
};

const elementalSpirit = {
  hint: "Choose your element (Acid, Cold, Electricity or Fire): +1 class to saves against it, and Elemental Mantle's resistance.",
  async use(actor, item) {
    const { line, postCard, chooseFromList, replaceFeatEffect } = helpers();
    const current = actor.getFlag(SYSTEM_ID, "elementalSpirit");
    if (current) {
      ui.notifications.info(`Elemental Spirit: your element is ${current}. This choice cannot normally be changed.`);
      return;
    }
    const element = await chooseFromList("Elemental Spirit", "The fundamental force that guides you", [["acid", "Acid"], ["cold", "Cold"], ["electricity", "Electricity"], ["fire", "Fire"]]);
    if (!element) return;
    await actor.setFlag(SYSTEM_ID, "elementalSpirit", element);
    await replaceFeatEffect(actor, item, {
      name: `Elemental Spirit: ${element}`,
      img: item.img,
      description: `+1 class bonus to saving throws against ${element}-trait effects.`,
      flags: {
        [SYSTEM_ID]: {
          choiceLabel: element,
          conditionals: [
            { kind: "modifier", value: 1, type: "class", label: "Elemental Spirit", auto: true, scope: `Saving throws against ${element} effects`, when: { checkTypes: ["save"], traits: [element] } }
          ]
        }
      }
    });
    await postCard(actor, "Elemental Spirit", [
      line(`Your guide is <strong>${element}</strong>: +1 class bonus to saving throws against ${element}-trait effects (pre-ticked), and Elemental Mantle grants ${element} resistance.`),
      line(`<em>Add a Verdant cantrip with the ${element} trait to your repertoire as your bonus cantrip.</em>`)
    ]);
  }
};

const landSpirit = {
  hint: "Name the Terrain Lore your guide grants.",
  async use(actor, item) {
    return helpers().useBackground(actor, item);
  }
};

const ancestorSpirit = {
  hint: "Borrowed Memory, once per day: Recall Knowledge with a skill you have no ranks in as though you had 1.",
  async use(actor, item) {
    const { line, postCard } = helpers();
    if (!(await spendUse(item, "Borrowed Memory"))) return;
    await postCard(actor, "Borrowed Memory", [
      line("For this Recall Knowledge check, treat yourself as having <strong>1 rank</strong> in a skill you have none in — roll it from the skill; the trained gate is yours to waive for this one roll."),
      line("<em>Once per day — Daily Preparation restores it. The ancestor knows nothing they could never have known.</em>")
    ]);
  }
};

/* ------------------------------------------------------------------ */
/* The tables                                                           */
/* ------------------------------------------------------------------ */

export const CLASS_AUTOMATIONS = Object.freeze({
  "recite from the text": reciteFromTheText,
  "canonist": authoritativeInterpretation,
  "revelator": revelator,
  "warding charm": wardingCharm,
  "brew remedy": brewRemedy,
  "ward the threshold": wardTheThreshold,
  "inquisition": inquisition,
  "judgement": judgement,
  "prepared adversary": preparedAdversary,
  "gift of healing": giftOfHealing,
  "healer's touch": healersTouch,
  "restorative hands": restorativeHands,
  "lifeline": lifeline,
  "spirit communion": spiritCommunion,
  "manifest spirit": manifestSpirit,
  "spirit intercession": spiritIntercession,
  "elemental spirit": elementalSpirit,
  "land spirit": landSpirit,
  "ancestor spirit": ancestorSpirit
});

export const CLASS_PASSIVE_HINTS = Object.freeze({
  "archivist's prayer book": "Works automatically: the Prayer Book is a gear item on your sheet — open it to record spells; memorise from it on the Magic tab.",
  "scholarly exegesis": "Works automatically: every Religion check offers Intelligence in place of Wisdom — tick it when the check is academic.",
  "deific aspects": "Nothing to do: an Archivist's casting needs no Divine Aspect; one granted by another rule works normally.",
  "apocryphist": "Works automatically: +2 circumstance is offered on Identify Power, Recall Knowledge and Research; +1 to Counteract is offered on Spellcraft rolls.",
  "eschatologist": "Works automatically: +1 class is pre-ticked on saves against Soul-trait effects and offered otherwise; advantage on Recall Knowledge is offered.",
  "hagiographer": "Works automatically: advantage on Recall Knowledge is offered with the book's wording.",
  "folk alchemy": "Works automatically: the Alchemist archetype is granted by the class, its Progression Requirements waived.",
  "keeper of the old ways": "Works automatically: Folk Lore is on your specialist skills.",
  "folk rites": "Works automatically: the five rites are abilities on your sheet; Read the Signs and Lay to Rest are offered from their skills.",
  "read the signs": "Works automatically: offered as an action from Nature and Survival.",
  "lay to rest": "Works automatically: offered as an action from Medicine, Nature and Religion against the deceased's Level DC.",
  "practical counsel": "Works automatically: a Success or better on your Aid grants 1 more (to +4); Aid from whichever class skill or lore row fits.",
  "seasoned hands": "Works automatically: a Fumble on Read the Signs, Lay to Rest, Treat Disease, Treat Toxin or Treat Wounds resolves as a Failure; Nature offers Treat Disease and Treat Toxin.",
  "charmwright": "Works automatically: Warding Charm offers two protections.",
  "gravetender": "Works automatically: +2 class is pre-ticked on Lay to Rest; read the duration one step up.",
  "hearthkeeper": "Works automatically: Ward the Threshold reaches 20 feet.",
  "herbal": "Works automatically: Brew Remedy makes two doses for one Preparation.",
  "omen reader": "Works automatically: +2 class is pre-ticked on Read the Signs; ask one more question on a Success.",
  "reconstruct target": "A rule for the table: Study Target from evidence, with the skill the evidence calls for.",
  "deific aspect (grimward)": "Pick your Divine Aspect from the sheet's Divine Aspect slot — its skill, spells and favoured weapon follow.",
  "grim resolve": "Works automatically: +2 class is pre-ticked on saves against Fear, Charm, Compulsion and Possession effects, offered otherwise.",
  "sanctioned strike": "Works automatically: your Judgement marks the Subject, and your attacks against it count as magical for Resistance and Immunity.",
  "exorcist": "Works automatically: +2 class is pre-ticked on saves against possession and offered against soul control.",
  "grave warden": "Works automatically: +1 class to Religion is offered on Identify Power and Recall Knowledge; Judgement's card notes essence damage.",
  "hexbreaker": "Works automatically: +2 class is offered on Identify Power and Recall Knowledge; +1 to Counteract is offered on Spellcraft rolls.",
  "relic warden": "Works automatically: Inquisition accepts a typed name, so an object or effect can be your Subject.",
  "truthseeker": "Works automatically: advantage on Detect Deception and +1 class vs illusion saves are offered with the book's wording.",
  "restorative overflow": "Works through Gift of Healing's Use: excess healing becomes temporary HP.",
  "chirurgeon": "Works automatically: +2 circumstance is pre-ticked on Administer First Aid and Treat Wounds; Treat Wounds takes 1 minute.",
  "lifebinder": "Works automatically: once a round one die of your healing spell is maximised on the card (Vital Surge).",
  "purifier": "Works automatically: +2 circumstance is offered on Spellcraft rolls for Counteracts against disease, poison or curses.",
  "soul tender": "Works automatically: Restorative Hands removes 5 more Soul Drain; +2 circumstance is offered on Spellcraft rolls for Counteracts against possession.",
  "sanctuary keeper": "Works through Gift of Healing's Use: +2 status to DB on the chosen creature.",
  "spirit speaker": "Works automatically: Spirit Lore is on your specialist skills; Nature offers Trace Possession and Interpret Haunt.",
  "spirit guide": "Use to choose your guide.",
  "spirit ward": "Works automatically: +2 class is pre-ticked on saves against Soul- and Possession-trait effects, offered otherwise.",
  "deepened bond": "Works automatically: a successful Refocus also restores Manifest Spirit or Spirit Intercession.",
  "beast spirit": "Works automatically: +2 class is offered on Handle Animal; Manifest Spirit applies Beast Within.",
  "veil spirit": "Works automatically: Spirit Sense (30 ft) is on your senses; Manifest Spirit applies Part the Veil."
});
