/**
 * Chapter 9 — The Unliving (0.9.0).
 *
 * Seven Unliving Archetype feats, fifty-five Unliving class feats (nine
 * generic, forty-six for one archetype each), the Shared Unliving Base Mods,
 * the abilities the archetypes and the Ability Reference hand over, eight
 * natural attacks, three diseases, Wail of the Departed and the Phylactery
 * of Eternal Resurgence.
 *
 * EVERY RULE WITH A NUMBER IN IT IS A DECLARATION the system reads. The
 * mechanisms are TRG Prime 3.627.0's (release-notes-3.627.0.md):
 *
 *   feat gates            the "Unliving" trait opens to any Unliving archetype,
 *                         "Unliving-Skeleton" to the Skeleton, …; the seven
 *                         archetypes are an exclusive group (registration.mjs)
 *   deathGuard            Unliving Fortitude, Zombie Fortitude, Gaseous Escape
 *   afterStrikes          Ghoulish Venom, Paralytic Touch, the three diseases
 *   onFell                Hunger Beyond Pain
 *   strikeTypeOption      Essence Attacks; a `whenDamageType` rider for Grave-Cold Touch
 *   saveConvert           Iron Will of the Tomb
 *   defensiveCasting      Faultless Casting
 *   naturalLeaper         Corpse Leaper
 *   grantedSpellUses      Poltergeist Hurling (at will)
 *   spellDCBonus          Soul-Magic Dominion
 *   doesNotBreathe        the Shared Unliving Base Mods
 *   drinkBloodBonus       Blood Renewal (Drink Blood is a core automation by name)
 *   rolled auras          Ghast Stench, Aura of Despair, Lich Aura
 *   suppressedInSunlight  Fast Healing (Sunlight Weakness reads the GM's scene/token mark)
 *   weapon strikeRiders   Bony Hand's 1d6 essence
 *
 * Already-existing machinery carries the rest: immunities, resistances and
 * weaknesses through the defences parser; traits on the traits line; Base DR;
 * racial ability bonuses; Life Sense as a tertiary sense; fly Speed equal to
 * land Speed (`derives.movement`); defence DCs against Shove and Trip (Dead
 * Weight); conditionals; innate spell grants; ability choosers.
 *
 * Text is the book's, from unliving-text.json (extracted by heading).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ability, feat, gear, spell, html, conditional, declaredEffect, changesEffect, stableId, SYSTEM_ID } from "./builders.mjs";
import { CHANGE } from "./feat-builder.mjs";
import { naturalAttack } from "./feats-weapons.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const UNLIVING_TEXT = JSON.parse(fs.readFileSync(path.join(HERE, "unliving-text.json"), "utf8"));

/** The seven archetypes, as named on the sheet, in the book's order. */
export const UNLIVING_ARCHETYPES = ["Unliving Skeleton", "Unliving Zombie", "Unliving Ghoul", "Unliving Mummy", "Unliving Vampire", "Unliving Ghost", "Unliving Lich"];
/** The type-specific trait each archetype opens ("UNLIVING VAMPIRE" printed without its hyphen — normalised). */
export const TYPE_TRAITS = Object.fromEntries(UNLIVING_ARCHETYPES.map((a) => [a, `Unliving-${a.split(" ")[1]}`]));

const SMALL = new Set(["OF", "THE", "A", "IN", "AT", "FOR", "TO"]);
function titleCase(heading) {
  return heading.split(" ").map((w, i) => (i > 0 && SMALL.has(w))
    ? w.toLowerCase()
    : w.split("-").map((p) => p ? p[0] + p.slice(1).toLowerCase() : p).join("-")).join(" ");
}

/** "CLASS SOUL UNLIVING", "MOVEMENT UNLIVING-SKELETON", "UNLIVING VAMPIRE" → the traits a feat carries. */
export function unlivingTraits(line, group) {
  const words = String(line ?? "").split(/\s+/).filter(Boolean);
  const out = [];
  for (let i = 0; i < words.length; i += 1) {
    const w = words[i];
    if (w === "CLASS" || w === "ARCHETYPE") continue;
    // The Vampire feats print "UNLIVING VAMPIRE" where every other type prints "UNLIVING-<TYPE>".
    if (w === "UNLIVING" && group === "vampire" && words[i + 1] === "VAMPIRE") { out.push("Unliving-Vampire"); i += 1; continue; }
    out.push(w.split("-").map((p) => p ? p[0] + p.slice(1).toLowerCase() : p).join("-"));
  }
  return out.join(", ");
}

function entryOf(group, heading) {
  const entry = UNLIVING_TEXT[group]?.[heading];
  if (!entry) throw new Error(`No Chapter 9 entry ${group}/${heading} in unliving-text.json`);
  return entry;
}

/** The book's entry as a description, plus the one sentence on what the sheet does. */
function bookText(entry, sheet = "") {
  return html([entry.traits, entry.prerequisites ? `Prerequisites ${entry.prerequisites}` : "", entry.body, sheet].filter(Boolean).join("\n\n"));
}

/**
 * A Chapter 9 feat.
 * @param {string} group archetype|generic|skeleton|…|lich
 * @param {string} heading as printed
 * @param {object} spec the declarations (flags, effects, grants, sheet)
 */
function unlivingFeat(group, heading, spec = {}) {
  const entry = entryOf(group, heading);
  const built = feat({
    name: spec.name ?? titleCase(heading),
    category: group === "archetype" ? "Archetype" : "Class",
    prerequisites: spec.prerequisites ?? entry.prerequisites,
    traits: spec.traits ?? unlivingTraits(entry.traits, group),
    usesPerDay: spec.usesPerDay ?? "",
    grantedSpells: spec.grantedSpells ?? "",
    grantedAbilities: spec.grantedAbilities ?? "",
    grantedFeats: spec.grantedFeats ?? "",
    description: bookText(entry, spec.sheet),
    flags: spec.flags ?? {},
    effects: spec.effects ?? []
  });
  if (spec.grantedWeapons) built.system.grantedWeapons = spec.grantedWeapons;
  built.flags[SYSTEM_ID] = { ...(built.flags[SYSTEM_ID] ?? {}), bookCategory: "unliving", unlivingGroup: group };
  return built;
}

/* ------------------------------------------------------------------ */
/* Shared helpers                                                       */
/* ------------------------------------------------------------------ */

const weakness = (type) => ({ key: "system.combat.weaknesses", mode: 2, value: `, ${type}`, priority: 20 });
const racialAbility = (ability, n) => ({ key: `system.attributes.${ability}.racial`, mode: 2, value: String(n), priority: 20 });
/** A transferred effect carrying changes. */
const changes = (label, list, description = "") => (id, name) => changesEffect(id, `${name}: ${label}`, list, description);
/** A transferred effect carrying a declaration. */
const declares = (label, description, flags) => declaredEffect(label, description, flags);

/** "Level-based saving throws using the Unliving character's level" — the save ladders, as condition rows. */
const FRIGHTFUL_LADDER = {
  outcomes: {
    heroic: "unaffected", critical: "unaffected", success: "frightened 1", partial: "frightened 2",
    failure: "frightened 3 and fleeing for 1 round", fumble: "frightened 4 and fleeing until the frightened condition is removed",
    blunder: "collapses from fear: reduced to 0 hit points and unconscious"
  },
  conditions: {
    heroic: [],
    critical: [],
    success: [{ key: "frightened", value: 1 }],
    partial: [{ key: "frightened", value: 2 }],
    failure: [{ key: "frightened", value: 3 }, { key: "fleeing", rounds: 1 }],
    fumble: [{ key: "frightened", value: 4 }, { key: "fleeing", endsWith: "frightened" }],
    blunder: [{ key: "zeroHP" }, { key: "unconscious" }]
  }
};

/* ------------------------------------------------------------------ */
/* Natural attacks (pof-companions)                                     */
/* ------------------------------------------------------------------ */

/** A natural attack whose "magical" trait makes it a magical source (`magicalStrike`). */
function unlivingAttack({ name, damage, damageType, traits, description, magical = true, riders = [] }) {
  const built = naturalAttack({ name, damage, damageType, traits, description, magical });
  if (magical) built.flags[SYSTEM_ID].magicalStrike = true;
  if (riders.length) built.flags[SYSTEM_ID].strikeRiders = riders;
  built._id = stableId(`companions:${name}`);
  return built;
}

export const UNLIVING_WEAPONS = [
  unlivingAttack({ name: "Bite (Unliving Ghoul)", damage: "1d8", damageType: "piercing", traits: "Finesse", magical: false,
    description: "Unliving Ghoul (Pillars of Faith, Chapter 9): \"a Bite Attack\" — no statistics are printed, so this is the core Bite (1d8 piercing, Finesse). Ghoulish Venom and Ghoul Fever ride its critical injuries." }),
  unlivingAttack({ name: "Claws (Unliving Skeleton)", damage: "1d6", damageType: "slashing", traits: "Agile, Finesse, Versatile (P)",
    description: "Bone Claws (Unliving Skeleton, Chapter 9): 1d6 slashing; agile, finesse, magical, versatile piercing." }),
  unlivingAttack({ name: "Bite (Unliving Zombie)", damage: "1d6", damageType: "piercing", traits: "Finesse",
    description: "Grave Bite (Unliving Zombie, Chapter 9): 1d6 piercing; finesse, magical." }),
  unlivingAttack({ name: "Slam (Unliving Zombie)", damage: "1d8", damageType: "bludgeoning", traits: "Agile, Finesse, Versatile (P)",
    description: "Corpse Slam (Unliving Zombie, Chapter 9): 1d8 bludgeoning; agile, finesse, magical, versatile piercing." }),
  unlivingAttack({ name: "Claws (Unliving Ghoul)", damage: "1d6", damageType: "slashing", traits: "Agile, Finesse, Versatile (P)",
    description: "Ghoul Claws (Unliving Ghoul, Chapter 9): 1d6 slashing; agile, finesse, magical, versatile piercing." }),
  unlivingAttack({ name: "Slam (Unliving Mummy)", damage: "1d8", damageType: "bludgeoning", traits: "Agile, Finesse",
    description: "Tomb Slam (Unliving Mummy, Chapter 9): 1d8 bludgeoning; agile, finesse, magical. Mummy Rot rides its critical injuries." }),
  unlivingAttack({ name: "Claws (Unliving Vampire)", damage: "1d6", damageType: "slashing", traits: "Agile, Finesse",
    description: "Vampire Claws (Unliving Vampire, Chapter 9): each claw 1d6 slashing; agile, finesse, magical." }),
  unlivingAttack({ name: "Bony Hand (Unliving Lich)", damage: "1d8", damageType: "bludgeoning", traits: "Agile, Finesse",
    riders: [{ label: "Bony Hand", dice: "1d6", damageType: "essence", scope: "any" }],
    description: "Bony Hand (Unliving Lich, Chapter 9): 1d8 bludgeoning plus 1d6 essence; agile, finesse, magical. The essence die is secondary damage and is not multiplied by a critical. Paralytic Touch rides its critical injuries." })
];

/* ------------------------------------------------------------------ */
/* Abilities (pof-abilities)                                            */
/* ------------------------------------------------------------------ */

function unlivingAbility({ name, description, traits = "", usesPerDay = "", flags = {}, effects = [] }) {
  const built = ability({ name, description, traits, usesPerDay, flags, effects, img: "icons/svg/skull.svg" });
  built.system.category = "Racial";
  built.system.prerequisites = "An Unliving Archetype";
  return built;
}

const SHARED_MODS = UNLIVING_TEXT.shared["SHARED UNLIVING BASE MODS"];

export const UNLIVING_ABILITIES = [
  unlivingAbility({
    name: "Shared Unliving Base Mods",
    description: html(`A character with any Unliving Archetype gains the following shared base modifications.\n\n${SHARED_MODS}\n\nOn the sheet: the Unliving trait (Requiem, Embalmer's Black Resin and every "Unliving trait" rule read it); immunity to disease (the Disease trait), Soul Drain, subdual damage and effects, and the Suffocating condition; no breath to hold (the drowning and suffocation rules pass the character over). Darkvision is a separate ability the archetype grants, and a second grant of it is skipped.`),
    effects: [
      changes("Unliving", [CHANGE.trait("Unliving"), CHANGE.immunity("disease"), CHANGE.immunity("soul drain"), CHANGE.immunity("subdual"), CHANGE.immunity("suffocating")],
        "The Unliving trait; immune to disease, Soul Drain, subdual damage and effects, and suffocation."),
      declares("No need to breathe", "Does not need to breathe and cannot suffocate from lack of air.", { doesNotBreathe: true })
    ]
  }),
  unlivingAbility({
    name: "Life Sense",
    description: html(`${entryOf("reference", "LIFE").traits}\n\nLife Sense (Pillars of Faith, Chapter 9). A tertiary sense at full range, as Graham ruled for the Codex's own Life Sense (11 Aug 2026): it finds living and undead creatures and tells the two apart.`),
    flags: { creatureAbility: { printedTraits: "", printedAction: "", printedArea: "", derives: { sense: { category: "tertiary", special: true, fullRange: true, name: "Life Sense", finds: "living and undead creatures (and tells them apart)" } } } }
  }),
  unlivingAbility({
    name: "Endless Hunger",
    traits: "Evil, Soul",
    description: bookText(entryOf("reference", "ENDLESS HUNGER"), "A rule for the table: the hunger is the character's to play. Nothing on the sheet changes.")
  }),
  unlivingAbility({
    name: "Carrion Feast",
    traits: "Manipulate",
    description: bookText(entryOf("reference", "CARRION FEAST"), "Use (1 AP): target an adjacent corpse that died within the last hour — regain 1d6 HP (3d6 with Greater Carrion Feast), once from each body; the body is marked so it cannot feed you twice.")
  }),
  unlivingAbility({
    name: "Drink Blood",
    traits: "Flourish, Soul",
    description: bookText(entryOf("reference", "DRINK BLOOD"), "Use (1 AP): target one creature in reach. The requirement is read from its conditions (willing is asked); a grabbed target needs your Athletics against its Fortitude DC. It takes Soul Drain 10 (+5 with Blood Renewal, +10 from 12th level) and you heal what landed. TRG Prime's own Drink Blood automation."),
    flags: { creatureAbility: { printedTraits: "FLOURISH SOUL", printedAction: "Action 1 AP; Requirement A target within reach is grabbed, immobilised, paralysed, unconscious, or willing.", printedArea: "", activation: { kind: "action", ap: 1, requirement: "A target within reach is grabbed, immobilised, paralysed, unconscious, or willing" } } }
  }),
  unlivingAbility({
    name: "Fast Healing",
    traits: "Healing",
    description: bookText(entryOf("reference", "FAST HEALING"), "Works automatically: 1 HP at the start of each of your turns (TRG Prime's turn-start healing), and none while you are under Sunlight Weakness or begin the turn in the sun as the GM has marked the scene or your token."),
    effects: [declares("Fast Healing 1", "Heals 1 HP at the beginning of each of your turns; suppressed in sunlight.", { fastHealing: 1, suppressedInSunlight: true })]
  }),
  unlivingAbility({
    name: "Sunlight Weakness",
    description: html(`${entryOf("reference", "SUNLIGHT WEAKNESS").traits}\n\nWorks automatically when the GM marks your scene Sunlit (or your token In sunlight): at the start of your turn you become injured 2 and slowed 2, lifted when the scene or token is marked out of the sun. A scene marked neither posts the reminder card, as for any creature.`),
    flags: { creatureAbility: { printedTraits: "", printedAction: "", printedArea: "", derives: { turnStart: { kind: "sunlight", severity: "weakness" } } } }
  }),
  unlivingAbility({
    name: "Phylactery of Eternal Resurgence",
    traits: "Soul",
    description: html(`${entryOf("item", "PHYLACTERY OF ETERNAL RESURGENCE").body}\n\nThe Unliving Lich's phylactery. The vessel itself is the wondrous item of the same name (Pillars of Faith: Wondrous Items & Relics) — keep it somewhere safe.\n\nUse while your essence rebuilds, once for each hour: you regain HP at Regeneration 1/hour (Regeneration 2/hour with Eternal Resurgence) — read, as the Codex reads Regeneration, as HP equal to your level for each step. Target the living creatures within 30 feet of the phylactery first: each rolls a Fortitude save against your Level DC, and if any fails the hour's regeneration is doubled and each failing creature suffers Soul Drain equal to your level.`)
  }),
  unlivingAbility({
    name: "Cold Immunity (Necromantic Resistances)",
    description: html("Necromantic Resistances (Unliving Lich, Chapter 9): \"choose Cold or Electricity. You gain Immunity to the chosen damage type.\" — Cold."),
    effects: [changes("Cold", [CHANGE.immunity("cold")], "Immune to cold damage.")]
  }),
  unlivingAbility({
    name: "Electricity Immunity (Necromantic Resistances)",
    description: html("Necromantic Resistances (Unliving Lich, Chapter 9): \"choose Cold or Electricity. You gain Immunity to the chosen damage type.\" — Electricity."),
    effects: [changes("Electricity", [CHANGE.immunity("electricity")], "Immune to electricity damage.")]
  })
];

/* ------------------------------------------------------------------ */
/* Archetype feats                                                      */
/* ------------------------------------------------------------------ */

const BASE = "Darkvision, Shared Unliving Base Mods";

export const UNLIVING_ARCHETYPE_FEATS = [
  unlivingFeat("archetype", "UNLIVING SKELETON", {
    grantedAbilities: BASE,
    sheet: "Grants Darkvision and the Shared Unliving Base Mods; Base DR +1 and immunity to Bleed. One Unliving archetype per character (the picker hides the others once one is taken, and a second is refused); it has no progression requirements and does not stop you taking a regular archetype.",
    effects: [changes("Skeleton", [CHANGE.baseDR(1), CHANGE.immunity("bleed")], "Base DR +1; immune to Bleed.")]
  }),
  unlivingFeat("archetype", "UNLIVING ZOMBIE", {
    grantedAbilities: `${BASE}, Endless Hunger, Life Sense`,
    sheet: "Grants Darkvision, the Shared Unliving Base Mods, Endless Hunger and Life Sense (tertiary, full range). One Unliving archetype per character."
  }),
  unlivingFeat("archetype", "UNLIVING GHOUL", {
    grantedAbilities: `${BASE}, Carrion Feast`,
    grantedWeapons: "Bite (Unliving Ghoul)",
    sheet: "Grants Darkvision, the Shared Unliving Base Mods, Carrion Feast (Use) and a Bite natural attack (the core Bite's 1d8 piercing, Finesse — the book prints no statistics). One Unliving archetype per character."
  }),
  unlivingFeat("archetype", "UNLIVING MUMMY", {
    grantedAbilities: BASE,
    sheet: "Grants Darkvision and the Shared Unliving Base Mods; resistance to physical damage (bludgeoning, piercing, slashing) and weakness to fire. One Unliving archetype per character.",
    effects: [changes("Mummy", [CHANGE.resistance("physical"), weakness("fire")], "Resistance to physical damage; weakness to fire.")]
  }),
  unlivingFeat("archetype", "UNLIVING VAMPIRE", {
    grantedAbilities: `${BASE}, Fast Healing, Drink Blood, Sunlight Weakness`,
    sheet: "Grants Darkvision, the Shared Unliving Base Mods, Fast Healing 1 (suppressed in sunlight), Drink Blood (Use) and Sunlight Weakness (applied by the GM's Sunlit scene or token mark). One Unliving archetype per character."
  }),
  unlivingFeat("archetype", "UNLIVING GHOST", {
    grantedAbilities: BASE,
    sheet: "Grants Darkvision and the Shared Unliving Base Mods; the Incorporeal trait (immune to non-magical and precision damage, as the core's Incorporeal rule reads it) and weakness to essence and force. One Unliving archetype per character.",
    effects: [changes("Ghost", [CHANGE.trait("Incorporeal"), weakness("essence"), weakness("force")], "Incorporeal; weakness to essence and force.")]
  }),
  unlivingFeat("archetype", "UNLIVING LICH", {
    grantedAbilities: `${BASE}, Phylactery of Eternal Resurgence`,
    sheet: "Level 12, as the entry prints (Graham's ruling of 7 Oct 2026; the chapter introduction's \"10th\" is the slip). Grants Darkvision, the Shared Unliving Base Mods, immunity to Bleed and the Phylactery of Eternal Resurgence (the ability; the vessel is a wondrous item). One Unliving archetype per character.",
    effects: [changes("Lich", [CHANGE.immunity("bleed")], "Immune to Bleed.")]
  })
];

/* ------------------------------------------------------------------ */
/* Class feats                                                          */
/* ------------------------------------------------------------------ */

const DEATH_GUARD = { label: "Unliving Fortitude", save: "fortitude", exceptDamageTypes: ["essence"], exceptWeakness: true };

export const UNLIVING_CLASS_FEATS = [
  /* ---------------- Generic ---------------- */
  unlivingFeat("generic", "BLOODLESS FRAME", {
    sheet: "Works automatically: immunity to Bleed (a second source adds nothing).",
    effects: [changes("Bleed", [CHANGE.immunity("bleed")], "Immune to Bleed.")]
  }),
  unlivingFeat("generic", "GRAVE-TOUCHED PRESENCE", {
    sheet: "+2 racial is offered on Intimidate and Sense Motive checks (tick it against undead). The attitude step worse is the GM's.",
    flags: { conditionals: [conditional({ kind: "modifier", value: 2, type: "race", label: "Grave-Touched Presence", scope: "Intimidate and Sense Motive checks against undead", auto: false, when: { checkTypes: ["skill"], subjects: ["intimidate", "senseMotive"] } })] }
  }),
  unlivingFeat("generic", "SENSE THE LIVING", {
    grantedAbilities: "Life Sense",
    sheet: "Grants Life Sense. If you already had it (an Unliving Zombie), +2 racial is offered on Perception checks to locate living or undead creatures with it — tick it then.",
    flags: { conditionals: [conditional({ kind: "modifier", value: 2, type: "race", label: "Sense the Living", scope: "Perception to locate living or undead creatures with Life Sense — only if you had Life Sense before this feat", auto: false, when: { checkTypes: ["skill"], subjects: ["perception"] } })] }
  }),
  unlivingFeat("generic", "POISONLESS FLESH", {
    sheet: "Works automatically: immunity to poison (damage, and the Poison trait).",
    effects: [changes("Poison", [CHANGE.immunity("poison")], "Immune to poison.")]
  }),
  unlivingFeat("generic", "STILL CORPSE", {
    sheet: "Works automatically: immunity to sleep effects and to the Fatigued condition. Not needing to eat or sleep is the table's.",
    effects: [changes("Sleep and fatigue", [CHANGE.immunity("sleep"), CHANGE.immunity("fatigued")], "Immune to sleep and Fatigued.")]
  }),
  unlivingFeat("generic", "DEAD NERVES", {
    sheet: "Works automatically: immunity to Paralyzed and Stunned.",
    effects: [changes("Paralysis and stunning", [CHANGE.immunity("paralyzed"), CHANGE.immunity("stunned")], "Immune to Paralyzed and Stunned.")]
  }),
  unlivingFeat("generic", "UNLIVING FORTITUDE", {
    sheet: "Works automatically: a blow that would take you to 0 HP asks a Fortitude save against the attacker's Level DC (your own when there is no attacker); a success leaves you at 1 HP. Not against essence damage or a type you are weak to.",
    effects: [declares("Unliving Fortitude", "If damage would reduce you to 0 HP, an opposed level-based Fortitude save; on a success, 1 HP instead.", { deathGuard: DEATH_GUARD })]
  }),
  unlivingFeat("generic", "NECROTIC CONSTITUTION", {
    sheet: "Works automatically: +1 racial Constitution. (Its no-stacking clause concerns the Undead creature type, which a player character does not have.)",
    effects: [changes("Constitution", [racialAbility("constitution", 1)], "+1 racial Constitution.")]
  }),
  unlivingFeat("generic", "COMPLETE UNDEAD PHYSIOLOGY", {
    sheet: "Works automatically: immunity to Bleed, poison, sleep, Paralyzed and Stunned (those you already have add nothing). Your Death State is unchanged.",
    effects: [
      changes("Undead immunities", ["bleed", "poison", "sleep", "paralyzed", "stunned"].map((w) => CHANGE.immunity(w)), "Immune to Bleed, poison, sleep, Paralyzed and Stunned."),
      declares("No need to breathe", "Does not need to breathe.", { doesNotBreathe: true })
    ]
  }),

  /* ---------------- Skeleton ---------------- */
  unlivingFeat("skeleton", "BONE CLAWS", { grantedWeapons: "Claws (Unliving Skeleton)", sheet: "Grants Bone Claws (1d6 slashing; agile, finesse, magical, versatile piercing)." }),
  unlivingFeat("skeleton", "BONE STRIDE", {
    sheet: "Works automatically: +5 feet land Speed.",
    effects: [changes("Speed", [CHANGE.speed(5)], "+5 feet land Speed.")]
  }),
  unlivingFeat("skeleton", "OSSIFIED FRAME", {
    sheet: "Works automatically: resistance to piercing and slashing damage.",
    effects: [changes("Resistances", [CHANGE.resistance("piercing"), CHANGE.resistance("slashing")], "Resistance to piercing and slashing.")]
  }),
  unlivingFeat("skeleton", "GRAVEBONE WARDS", {
    sheet: "Works automatically: resistance to electricity and fire damage.",
    effects: [changes("Resistances", [CHANGE.resistance("electricity"), CHANGE.resistance("fire")], "Resistance to electricity and fire.")]
  }),
  unlivingFeat("skeleton", "TOUGHENED BONES", {
    sheet: "Works automatically: Base DR +1.",
    effects: [changes("Base DR", [CHANGE.baseDR(1)], "Base DR +1.")]
  }),

  /* ---------------- Zombie ---------------- */
  unlivingFeat("zombie", "GRAVE BITE", { grantedWeapons: "Bite (Unliving Zombie)", sheet: "Grants Grave Bite (1d6 piercing; finesse, magical)." }),
  unlivingFeat("zombie", "CORPSE SLAM", { grantedWeapons: "Slam (Unliving Zombie)", sheet: "Grants Corpse Slam (1d8 bludgeoning; agile, finesse, magical, versatile piercing)." }),
  unlivingFeat("zombie", "DEAD WEIGHT", {
    sheet: "Works automatically: +2 racial to the Fortitude DC (and, for Trip, the Acrobatics DC) Shove, Trip and Reposition are rolled against. A save against forced movement offers +2 racial.",
    flags: {
      defenceDC: [
        { dc: "fortitudeDC", value: 2, label: "Dead Weight", scope: "Against Shove, Trip and attempts to move you", when: { actions: ["shoveAttack", "tripAttack", "reposition"] } },
        { dc: "skillDC:acrobatics", value: 2, label: "Dead Weight", scope: "Against Trip", when: { actions: ["tripAttack"] } }
      ],
      conditionals: [conditional({ kind: "modifier", value: 2, type: "race", label: "Dead Weight", scope: "Checks against forced movement, or being moved while grabbed or restrained", auto: false, when: { checkTypes: ["save", "skill"] } })]
    }
  }),
  unlivingFeat("zombie", "ZOMBIE FORTITUDE", {
    grantedFeats: "Unliving Fortitude",
    sheet: "Grants Unliving Fortitude, and its save takes +2 racial (it fires only when the damage is neither essence nor a type you are weak to, which is the condition the bonus prints).",
    flags: { conditionals: [conditional({ kind: "modifier", value: 2, type: "race", label: "Zombie Fortitude", scope: "The Unliving Fortitude save", auto: true, when: { checkTypes: ["save"], subjects: ["fortitude"], actions: ["deathGuard"] } })] }
  }),
  unlivingFeat("zombie", "PLAGUE CARRIER", {
    sheet: "Works automatically: a critical injury with Grave Bite or Corpse Slam exposes the target to Zombie Plague at your level (its own Fortitude exposure save), once a day per creature.",
    effects: [declares("Zombie Plague", "A critical injury with your Bite or Slam exposes the target to Zombie Plague (disease level = your level), once per day per creature.",
      { afterStrikes: [{ key: "plagueCarrier", label: "Plague Carrier", weaponNames: ["Bite (Unliving Zombie)", "Slam (Unliving Zombie)"], onCriticalInjury: true, expose: { affliction: "Zombie Plague", level: "actorLevel", oncePerDay: true } }] })]
  }),
  unlivingFeat("zombie", "HUNGER BEYOND PAIN", {
    sheet: "Works automatically: felling a living creature with Grave Bite or Corpse Slam heals you your level + Constitution modifier (minimum 1), once a round.",
    effects: [declares("Hunger Beyond Pain", "Reducing a living creature to 0 HP with your Bite or Slam heals level + Con (min 1), once per round.",
      { onFell: { label: "Hunger Beyond Pain", weaponNames: ["Bite (Unliving Zombie)", "Slam (Unliving Zombie)"], living: true, heal: { level: true, ability: "constitution", min: 1 }, oncePerRound: true } })]
  }),

  /* ---------------- Ghoul ---------------- */
  unlivingFeat("ghoul", "GHOUL CLAWS", { grantedWeapons: "Claws (Unliving Ghoul)", sheet: "Grants Ghoul Claws (1d6 slashing; agile, finesse, magical, versatile piercing)." }),
  unlivingFeat("ghoul", "CORPSE LEAPER", {
    sheet: "Works automatically (Natural Leaper): a High Jump up to half your land Speed needs no check; a Long Jump up to your land Speed needs no check and no action; never the run-up penalty.",
    effects: [declares("Natural Leaper", "High Jump to half Speed and Long Jump to Speed without a check; no running-start penalty.", { naturalLeaper: true })]
  }),
  unlivingFeat("ghoul", "GREATER CARRION FEAST", { sheet: "Works through Carrion Feast: it heals 3d6 instead of 1d6, still once from each body." }),
  unlivingFeat("ghoul", "GHOULISH VENOM", {
    sheet: "Works automatically: a critical injury with your Bite or Ghoul Claws makes the target save (Fortitude, your Level DC) — Partial slowed 1 for 1 round; Failure paralysed for 1 round; Fumble paralysed for 1 minute with a new save at the end of each of its turns.",
    effects: [declares("Ghoulish Venom", "On a critical injury with your Bite or Claws: Fortitude save ladder.",
      { afterStrikes: [{ key: "ghoulishVenom", label: "Ghoulish Venom", weaponNames: ["Bite (Unliving Ghoul)", "Claws (Unliving Ghoul)"], onCriticalInjury: true, save: "fortitude",
        outcomes: { success: "Unaffected.", partial: "Slowed 1 for 1 round.", failure: "Paralysed for 1 round.", fumble: "Paralysed for 1 minute; a new Fortitude save at the end of each of its turns ends it." },
        conditions: { heroic: [], critical: [], success: [], partial: [{ key: "slowed", value: 1, rounds: 1 }], failure: [{ key: "paralyzed", rounds: 1 }], fumble: [{ key: "paralyzed", minutes: 1, resave: true }] } }] })]
  }),
  unlivingFeat("ghoul", "GHAST STENCH", {
    sheet: "Works automatically: a 10-foot aura; a living creature starting its turn in it or entering it rolls Fortitude against your Level DC — Failure sickened 1; Fumble sickened 1 and slowed 1 while sickened. A creature that saves is immune for 1 minute.",
    flags: { auras: [{ id: "ghast-stench", kind: "save", name: "Ghast Stench", radius: 10, triggers: ["turnStart", "enter"], save: "fortitude", livingOnly: true, appliesTo: "Living creatures",
      traits: ["aura"], immunitySeconds: 60, immunityOn: "success",
      outcomes: { success: "unaffected", failure: "sickened 1", fumble: "sickened 1 and slowed 1 for as long as it remains sickened" },
      conditions: { heroic: [], critical: [], success: [], failure: [{ key: "sickened", value: 1 }], fumble: [{ key: "sickened", value: 1 }, { key: "slowed", value: 1, endsWith: "sickened" }] } }] }
  }),
  unlivingFeat("ghoul", "GHOUL FEVER", {
    sheet: "Works automatically: a critical injury with your Bite exposes the target to Ghoul Fever at your level (its own Fortitude exposure save), once a day per creature.",
    effects: [declares("Ghoul Fever", "A critical injury with your Bite exposes the target to Ghoul Fever (disease level = your level), once per day per creature.",
      { afterStrikes: [{ key: "ghoulFever", label: "Ghoul Fever", weaponNames: ["Bite (Unliving Ghoul)"], onCriticalInjury: true, expose: { affliction: "Ghoul Fever (Disease)", level: "actorLevel", oncePerDay: true } }] })]
  }),

  /* ---------------- Mummy ---------------- */
  unlivingFeat("mummy", "TOMB SLAM", { grantedWeapons: "Slam (Unliving Mummy)", sheet: "Grants Tomb Slam (1d8 bludgeoning; agile, finesse, magical)." }),
  unlivingFeat("mummy", "IRON WILL OF THE TOMB", {
    sheet: "Works automatically: +2 racial on Will saves against fear and mental effects (pre-ticked where the save's traits say so, offered otherwise); once a round a failed such save may become a Success at the cost of slowed 1 until the end of your next turn — asked after any reroll.",
    flags: { conditionals: [
      conditional({ kind: "modifier", value: 2, type: "race", label: "Iron Will of the Tomb", scope: "Will saves against fear and mind-controlling mental effects", auto: true, when: { checkTypes: ["save"], subjects: ["will"], traits: ["fear", "mental", "charm", "compulsion", "possession", "confusion"] } }),
      conditional({ kind: "modifier", value: 2, type: "race", label: "Iron Will of the Tomb", scope: "Will saves against fear and mind-controlling mental effects", auto: false, when: { checkTypes: ["save"], subjects: ["will"], not: { traits: ["fear", "mental", "charm", "compulsion", "possession", "confusion"] } } })
    ] },
    effects: [declares("Sepulchral stillness", "Once per round, a failed Will save against fear or mind control may be treated as a success; you become slowed 1 until the end of your next turn.",
      { saveConvert: { label: "Iron Will of the Tomb", saves: ["will"], traits: ["fear", "mental", "charm", "compulsion", "possession", "confusion"], from: ["failure", "fumble", "blunder"], cost: { condition: "slowed", value: 1 }, oncePerRound: true } })]
  }),
  unlivingFeat("mummy", "DESICCATED STRENGTH", {
    sheet: "Works automatically: +1 racial Strength.",
    effects: [changes("Strength", [racialAbility("strength", 1)], "+1 racial Strength.")]
  }),
  unlivingFeat("mummy", "TOMB GUARDIAN", {
    sheet: "+2 racial is offered on Search and Track — tick it in tombs, crypts, ruins, burial sites, sealed chambers and other funerary or ancient constructed spaces.",
    flags: { conditionals: [conditional({ kind: "modifier", value: 2, type: "race", label: "Tomb Guardian", scope: "Search and Track in tombs, crypts, ruins, burial sites, sealed chambers and other funerary or ancient constructed spaces", auto: false, when: { checkTypes: ["skill"], actions: ["search", "track"] } })] }
  }),
  unlivingFeat("mummy", "AURA OF DESPAIR", {
    sheet: "Works automatically: a 30-foot aura; a living creature starting its turn in it or entering it rolls Will against your Level DC and takes the ladder's fear (and paralysis). A creature that has saved is immune to the paralysis for 24 hours, not to the fear.",
    flags: { auras: [{ id: "aura-of-despair", kind: "save", name: "Aura of Despair", radius: 30, triggers: ["turnStart", "enter"], save: "will", livingOnly: true, appliesTo: "Living creatures",
      traits: ["aura", "divinity", "fear"], partialImmunity: { to: "paralyzed", seconds: 86400 },
      outcomes: { heroic: "unaffected", critical: "frightened 1", success: "frightened 2", partial: "frightened 3", failure: "frightened 3 and paralysed for 1 round", fumble: "frightened 4 and paralysed for 1 round", blunder: "collapses from fear: reduced to 0 hit points and unconscious" },
      conditions: {
        heroic: [], critical: [{ key: "frightened", value: 1 }], success: [{ key: "frightened", value: 2 }], partial: [{ key: "frightened", value: 3 }],
        failure: [{ key: "frightened", value: 3 }, { key: "paralyzed", rounds: 1 }], fumble: [{ key: "frightened", value: 4 }, { key: "paralyzed", rounds: 1 }],
        blunder: [{ key: "zeroHP" }, { key: "unconscious" }]
      } }] }
  }),
  unlivingFeat("mummy", "MUMMY ROT", {
    sheet: "Works automatically: a critical injury with Tomb Slam exposes the target to Mummy Rot at your level (its own Fortitude exposure save), once a day per creature.",
    effects: [declares("Mummy Rot", "A critical injury with your Slam exposes the target to Mummy Rot (disease level = your level), once per day per creature.",
      { afterStrikes: [{ key: "mummyRot", label: "Mummy Rot", weaponNames: ["Slam (Unliving Mummy)"], onCriticalInjury: true, expose: { affliction: "Mummy Rot (Disease)", level: "actorLevel", oncePerDay: true } }] })]
  }),

  /* ---------------- Vampire ---------------- */
  unlivingFeat("vampire", "CHARM OF THE NIGHT", { grantedSpells: "Charm Kind", flags: { grantInnate: true }, sheet: "Grants Charm Kind as an innate spell with the Focus trait (one use; Refocus restores it)." }),
  unlivingFeat("vampire", "VAMPIRE CLAWS", { grantedWeapons: "Claws (Unliving Vampire)", sheet: "Grants Vampire Claws (1d6 slashing; agile, finesse, magical)." }),
  unlivingFeat("vampire", "MIST VEIL", { grantedSpells: "Obscuring Mist", flags: { grantInnate: true }, sheet: "Grants Obscuring Mist as an innate spell with the Focus trait." }),
  unlivingFeat("vampire", "VAMPIRIC CLIMB", { grantedSpells: "Spider Climb", flags: { grantInnate: true }, sheet: "Grants Spider Climb as an innate spell with the Focus trait." }),
  unlivingFeat("vampire", "BLOOD RENEWAL", {
    sheet: "Works through Drink Blood: Soul Drain and healing +5, +10 from 12th level.",
    effects: [declares("Blood Renewal", "Drink Blood's Soul Drain and healing +5 (+10 from 12th level).", { drinkBloodBonus: { label: "Blood Renewal", value: 5, atLevel: { 12: 10 } } })]
  }),
  unlivingFeat("vampire", "SHAPE OF THE NIGHT", { grantedSpells: "Shape Of The Animal", flags: { grantInnate: true }, sheet: "Grants Shape of the Animal as an innate spell with the Focus trait; only bat or wolf forms, chosen each time." }),
  unlivingFeat("vampire", "GASEOUS ESCAPE", {
    usesPerDay: "1",
    sheet: "Works automatically: once a day, when a blow would take you to 0 HP, you are asked whether to escape — yes leaves you at 1 HP under Gaseous Form's own effects (10 minutes). Sunlight Weakness still applies.",
    effects: [declares("Gaseous Escape", "Once per day, when you would be reduced to 0 HP, become gaseous as Gaseous Form instead.", { deathGuard: { label: "Gaseous Escape", offer: true, frequency: "daily", spell: "Gaseous Form" } })]
  }),
  unlivingFeat("vampire", "DOMINATING GAZE", { grantedSpells: "Dominate", flags: { grantInnate: true }, sheet: "Grants Dominate as an innate spell with the Focus trait. The target must see or hear you; the effect is visibly vampiric." }),
  unlivingFeat("vampire", "VAMPIRIC SPAWN", { sheet: "A rule for the table: a living humanoid slain by Drink Blood or a Soul-Drain natural attack may rise as a Vampire spawn at dusk the following day (Fiends & Fables)." }),

  /* ---------------- Ghost ---------------- */
  unlivingFeat("ghost", "SPECTRAL DRIFT", {
    sheet: "Works automatically: a fly Speed equal to your land Speed (recomputed whenever your Speed changes).",
    flags: { creatureAbility: { printedTraits: "", printedAction: "", printedArea: "", derives: { movement: { key: "fly", feet: 0, orLand: true } } } }
  }),
  unlivingFeat("ghost", "ESSENCE ATTACKS", {
    sheet: "Works automatically: an unarmed or natural attack asks before the roll whether to deal essence instead (as Versatile does); an essence strike counts as magical.",
    effects: [declares("Essence Attacks", "Unarmed and natural attacks may deal essence damage instead; they count as magical.", { strikeTypeOption: { type: "essence", label: "Essence Attacks", scope: ["natural", "unarmed"], magical: true } })]
  }),
  unlivingFeat("ghost", "SUBTLE HAUNT", {
    sheet: "Works automatically: +2 racial Stealth. Being concealed in dim light, darkness, mist, smoke or supernatural gloom is the table's.",
    effects: [changes("Stealth", [CHANGE.skill("stealth", "racial", 2)], "+2 racial Stealth.")]
  }),
  unlivingFeat("ghost", "POLTERGEIST HURLING", {
    grantedSpells: "Hurling",
    flags: { grantInnate: true, grantedSpellUses: { Hurling: "unlimited" } },
    sheet: "Grants Hurling as an innate cantrip you cast at will (no Focus trait, no use to spend)."
  }),
  unlivingFeat("ghost", "GRAVE-COLD TOUCH", {
    sheet: "Works automatically: an unarmed or natural attack that deals essence damage (Essence Attacks) adds 1d6 cold — secondary, never multiplied by a critical.",
    effects: [declares("Grave-Cold Touch", "+1d6 cold on an essence unarmed or natural attack.", { strikeRider: { label: "Grave-Cold Touch", dice: "1d6", damageType: "cold", scope: "unarmed", whenDamageType: "essence", once: false } })]
  }),
  unlivingFeat("ghost", "WAIL OF THE DEPARTED", {
    grantedSpells: "Wail of the Departed (Spell-like)",
    flags: { grantInnate: true, grantedSpellUses: { "Wail of the Departed (Spell-like)": "unlimited" } },
    sheet: "Grants Wail of the Departed as an innate spell-like (2 AP, at will): creatures within 60 feet that can hear you roll Will against your Level DC — Failure frightened 2, Fumble frightened 4, Success immune to your Wail for 1 minute."
  }),

  /* ---------------- Lich ---------------- */
  unlivingFeat("lich", "BONY HAND", { grantedWeapons: "Bony Hand (Unliving Lich)", sheet: "Grants Bony Hand (1d8 bludgeoning + 1d6 essence; agile, finesse, magical)." }),
  unlivingFeat("lich", "INFLICT VITAE", { grantedSpells: "Inflict", flags: { grantInnate: true }, sheet: "Grants Inflict as an innate spell with the Focus trait." }),
  unlivingFeat("lich", "FAULTLESS CASTING", {
    sheet: "Works automatically: every spell you cast is cast defensively, at +0 to its Casting DC rather than +5.",
    effects: [declares("Faultless Casting", "All your spells are cast defensively; the Defensive Casting DC is +0.", { defensiveCasting: { label: "Faultless Casting", always: true, dcAdd: 0 } })]
  }),
  unlivingFeat("lich", "PARALYTIC TOUCH", {
    sheet: "Works automatically: a critical injury with Bony Hand makes the target save (Fortitude, your Level DC; +2 for a Serious injury, +5 for a Deadly one) — Failure paralysed 1 round; Fumble paralysed 1 minute and prone; Blunder paralysed permanently and prone.",
    effects: [declares("Paralytic Touch", "On a critical injury with Bony Hand: Fortitude save ladder.",
      { afterStrikes: [{ key: "paralyticTouch", label: "Paralytic Touch", weaponNames: ["Bony Hand (Unliving Lich)"], onCriticalInjury: true, save: "fortitude", dcBySeverity: { serious: 2, deadly: 5 },
        outcomes: { failure: "Paralysed for 1 round.", fumble: "Paralysed for 1 minute and falls prone.", blunder: "Paralysed permanently and falls prone." },
        conditions: { heroic: [], critical: [], success: [], failure: [{ key: "paralyzed", rounds: 1 }], fumble: [{ key: "paralyzed", minutes: 1 }, { key: "prone" }], blunder: [{ key: "paralyzed" }, { key: "prone" }] } }] })]
  }),
  unlivingFeat("lich", "NECROMANTIC RESISTANCES", {
    sheet: "Works automatically: resistance to piercing and slashing. Use to choose Cold or Electricity: the chosen immunity arrives as an ability.",
    flags: { abilityChoices: ["Cold Immunity (Necromantic Resistances)", "Electricity Immunity (Necromantic Resistances)"] },
    effects: [changes("Resistances", [CHANGE.resistance("piercing"), CHANGE.resistance("slashing")], "Resistance to piercing and slashing.")]
  }),
  unlivingFeat("lich", "LICH AURA", {
    sheet: "Works automatically: Frightful Aura — 5 feet × your level; a creature first entering it rolls Will against your Level DC and is then immune for 1 minute whatever the result. The ladder: frightened 1–4, fleeing on a Failure (1 round) or Fumble (while frightened), collapse to 0 HP on a Blunder.",
    flags: { auras: [{ id: "lich-aura", kind: "save", name: "Frightful Aura (Lich Aura)", radiusPerLevel: 5, triggers: ["enter"], save: "will",
      traits: ["aura", "fear"], immunitySeconds: 60, immunityOn: "always", ...FRIGHTFUL_LADDER }] }
  }),
  unlivingFeat("lich", "SOUL-MAGIC DOMINION", {
    sheet: "Works automatically: +1 racial to Spellcraft checks and spell save DCs for your own spells and innate spells with the Soul trait.",
    flags: { conditionals: [conditional({ kind: "modifier", value: 1, type: "race", label: "Soul-Magic Dominion", scope: "Spellcraft checks for spells with the Soul trait", auto: true, when: { checkTypes: ["cast", "spellcraft"], traits: ["soul"] } })] },
    effects: [declares("Soul-Magic Dominion", "+1 racial to the save DC of your spells with the Soul trait.", { spellDCBonus: { label: "Soul-Magic Dominion", value: 1, type: "race", traits: ["soul"] } })]
  }),
  unlivingFeat("lich", "ETERNAL RESURGENCE", { sheet: "Works through the Phylactery of Eternal Resurgence's Use: Regeneration 2/hour instead of 1/hour, doubled again by a successful siphon." })
];

/* ------------------------------------------------------------------ */
/* Wail of the Departed (pof-spells)                                    */
/* ------------------------------------------------------------------ */

export const UNLIVING_SPELLS = [
  spell({
    name: "Wail of the Departed (Spell-like)",
    tradition: "",
    category: "save",
    ppCost: 0,
    castAP: 2,
    range: "",
    area: "60-foot emanation",
    targets: "Creatures within 60 feet that can hear you",
    duration: "",
    defence: "Will",
    traits: "Auditory, Fear",
    usesPerDay: "unlimited",
    components: { somatic: false, verbal: true, material: false, focus: false },
    description: bookText(entryOf("ghost", "WAIL OF THE DEPARTED"), "An Unliving Ghost feat (Pillars of Faith, Chapter 9), granted as an innate spell-like at will: no PP, a level-based Will save. A creature that saves is immune to your Wail for 1 minute."),
    effects: [
      { kind: "condition", target: "targets", condition: "frightened", value: 2, onSave: ["failure"] },
      { kind: "condition", target: "targets", condition: "frightened", value: 4, onSave: ["fumble", "blunder"] },
      { kind: "tempImmunity", target: "targets", label: "Wail of the Departed", length: "1 minute", onSave: ["heroic", "critical", "success"] }
    ]
  })
];

/* ------------------------------------------------------------------ */
/* The diseases (pof-afflictions)                                       */
/* ------------------------------------------------------------------ */

function disease({ name, traits, incubation = "", maxStage, stages, description, afflictionType = "disease" }) {
  return {
    _id: stableId(`afflictions:${name}`),
    name, type: "affliction", img: "icons/svg/biohazard.svg",
    system: {
      afflictionType, traits, level: 0, savingThrow: "fortitude", rarity: "common", rarityModifier: 0,
      incubation, duration: "Until cured", maxStage,
      stages: stages.map((s) => ({ effect: s.effect, interval: s.interval ?? "1 day", conditions: s.conditions ?? [], conditionDuration: "", damage: s.damage ?? "", damageType: s.damageType ?? "", criticalOnFailure: false, criticalDamageType: "poison" })),
      incubating: Boolean(incubation), currentStage: 0, description: html(description), quantity: 1, weight: 0, price: 0
    },
    effects: [], folder: null, sort: 0, ownership: { default: 0 }, flags: { [SYSTEM_ID]: { pofDisease: true } },
    _stats: { systemId: SYSTEM_ID, systemVersion: "3.627.0", coreVersion: "14", createdTime: 1790000000000, modifiedTime: 1790000000000, lastModifiedBy: null, compendiumSource: null, duplicateSource: null }
  };
}

export const UNLIVING_AFFLICTIONS = [
  disease({
    name: "Zombie Plague",
    traits: "Disease, Evil, Soul",
    incubation: "1d4 days",
    maxStage: 5,
    description: "Zombie Plague is a terrifying magical disease spread by the bite or claws of the undead, infecting the living with a slow, agonizing transformation into mindless zombies. Victims experience a swift onset of fever and necrosis as the plague ravages their body, sapping their vitality and leaving them in a state of constant decay. If left untreated, the disease inevitably turns the afflicted into one of the walking dead, driven only by a relentless hunger for the flesh of the living. Only powerful magic or immediate intervention can save those stricken with this insidious curse.\n\nLevel (same as the infecting creature); Saving Throw Fortitude; Incubation 1d4 days; Duration Until cured.\n\nStatistics from Fiends & Fables (Graham, 7 Oct 2026). Spread by Plague Carrier (Unliving Zombie) at the zombie's level. The stage interval is not printed — one day is used, the disease's own rhythm; the soul damage at stages 3 and 4 and the rising as a zombie are the table's (the card says each).",
    stages: [
      { effect: "Fatigued 1.", conditions: [{ key: "fatigued", value: 1 }] },
      { effect: "Fatigued 2; infection shows around the wound. More susceptible to soul effects: disadvantage on such checks.", conditions: [{ key: "fatigued", value: 2 }] },
      { effect: "Fatigued 3; takes soul damage at a rate of 5 per day.", conditions: [{ key: "fatigued", value: 3 }] },
      { effect: "Fatigued 4; takes soul damage at a rate of 5 per hour. If it dies from this damage it rises 1d6 hours later as a zombie.", conditions: [{ key: "fatigued", value: 4 }] },
      { effect: "Dies, and rises 1d6 hours later as a zombie (applies the Zombie template and begins to feed).", conditions: [{ key: "dead", value: null }] }
    ]
  }),
  disease({
    name: "Ghoul Fever (Disease)",
    traits: "Disease, Soul",
    maxStage: 6,
    description: "Ghoul Fever (disease). Basic Fortitude; each stage 1 day. Stage 1 no effect; Stage 2 2d8 essence (all healing halves); Stage 4 2d8 essence (all healing fails); Stage 6 death, returning as a ghoul the following night.\n\nStatistics from Fiends & Fables (Graham, 7 Oct 2026). Spread by Ghoul Fever (Unliving Ghoul) at the ghoul's level, so the save is that level's DC rather than the printed DC 18. Stages 3 and 5 are not printed and carry the stage before them. The healing penalties are the table's (the card says so).",
    stages: [
      { effect: "No effect." },
      { effect: "2d8 essence damage; all healing is halved.", damage: "2d8", damageType: "essence" },
      { effect: "2d8 essence damage; all healing is halved. (Not printed — as stage 2.)", damage: "2d8", damageType: "essence" },
      { effect: "2d8 essence damage; all healing fails.", damage: "2d8", damageType: "essence" },
      { effect: "2d8 essence damage; all healing fails. (Not printed — as stage 4.)", damage: "2d8", damageType: "essence" },
      { effect: "Death; returns as a ghoul the following night.", conditions: [{ key: "dead", value: null }] }
    ]
  }),
  disease({
    name: "Mummy Rot (Disease)",
    traits: "Curse, Disease, Soul",
    maxStage: 2,
    description: `${entryOf("mummy", "MUMMY ROT").body}\n\nSpread by Mummy Rot (Unliving Mummy) at the mummy's level. Stage 1 lasts 1 minute; stage 2's interval is a day, as its Injured is. Damage it inflicts cannot be healed until the curse is removed and the disease cured — the table's.`,
    stages: [
      { effect: "Carrier with no visible effect.", interval: "1 minute" },
      { effect: "4d6 essence damage and Injured 1 for 1 day. This damage cannot be healed until the curse is removed and the disease cured.", damage: "4d6", damageType: "essence", conditions: [{ key: "injured", value: 1 }] }
    ]
  })
];

/* ------------------------------------------------------------------ */
/* The phylactery itself (pof-wondrous)                                 */
/* ------------------------------------------------------------------ */

const phylacteryEntry = entryOf("item", "PHYLACTERY OF ETERNAL RESURGENCE");
export const UNLIVING_ITEMS = [
  gear({
    name: "Phylactery of Eternal Resurgence (Vessel)",
    price: 0,
    weight: 2,
    traits: "Invested, Soul, Unique",
    img: "icons/svg/skull.svg",
    description: html(`${phylacteryEntry.traits}\n\n${phylacteryEntry.body}\n\nThe vessel an Unliving Lich's soul is bound to (Pillars of Faith, Chapter 9). 200 HP, Hardness 20, impervious to non-magical weapons, magic resistance; detecting it is Incredibly Hard (DC +10). The lich's own ability, Phylactery of Eternal Resurgence, carries the rebuilding.`),
    system: { slot: "phylactery", hp: { value: 200, max: 200 }, hardness: 20, itemLevel: 18 },
    flags: { wondrous: { base: "phylactery", tier: "", slotInferred: false, activate: "", frequency: "", abilities: [{ kind: "note", note: "The lich's soul vessel: 200 HP, Hardness 20, immune to non-magical weapons, magic resistance, Incredibly Hard (DC +10) to detect." }] } }
  })
];
