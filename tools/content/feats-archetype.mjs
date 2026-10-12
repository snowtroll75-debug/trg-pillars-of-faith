/**
 * Chapter 5 — the thirteen archetype feats, and the abilities and gear
 * they hand over.
 *
 * Five are routes into the new classes (Hedge Witch, Inquisitor,
 * Lifebearer, Liturgist, Spirit Walker) and register class-feat access
 * through `registerArchetype`; the rest carry their own abilities:
 * Liturgy of Prayer, Share the Wound, Vowbound Resolve, Applied Insight
 * and Ward the Soul are ability items (pof-abilities) the feat grants,
 * each with its Use in module/feat-automations.mjs.
 */
import { bookFeat, saveBonus, offeredBonus } from "./feat-builder.mjs";
import { ability, gear, html, conditional } from "./builders.mjs";

const SPIRIT_FINDS = "disembodied spirits, incorporeal undead, haunts and active possession";

/** An archetype's own ability: category "Class" with sourceArchetype-style provenance in the description. */
function archetypeAbility({ name, archetype, traits = "", usesPerDay = "", description, flags = {} }) {
  const built = ability({ name, traits, usesPerDay, description, flags, img: "icons/svg/upgrade.svg" });
  built.system.category = "Class";
  built.system.prerequisites = `${archetype} archetype`;
  return built;
}

export const ARCHETYPE_ABILITIES = [
  archetypeAbility({
    name: "Inquisition (Inquisitor)", archetype: "Inquisitor", traits: "Concentrate",
    description: html("CONCENTRATE\n\nAction 1 AP\n\nYou designate one creature as the Subject of your Inquisition, following the normal Grimward rules, except that you gain a +1 class bonus to the appropriate investigative checks against your Subject rather than the Grimward's class bonus. A feat requiring Judgement cannot be used unless you gain that ability from another source.\n\nUse: spends 1 AP and names your Subject (the targeted token, or a name you type); +1 class is then offered in the dialog of Detect Deception, Identify Power, Recall Knowledge, Research, Search, Study Target, Track and Sense Motive checks. Use again to change or end.")
  }),
  archetypeAbility({
    name: "Liturgy of Prayer", archetype: "Liturgist", traits: "Concentrate", usesPerDay: "1",
    description: html("CONCENTRATE\n\nAction 1 AP; Frequency 1/day\n\nRequirements You have your Liturgical Book available and are able to read or otherwise consult it.\n\nYou rapidly locate a familiar passage, annotation or alternative formulation before invoking a prepared prayer. Select one Divinity spell that you do not currently have memorised, but which is recorded in your Liturgical Book. You may cast this spell immediately (using its normal AP cost). If the spell is not cast before the end of your turn, the ability is wasted.\n\nUse: spends 1 AP and the day's use, lets you pick a Liturgical Book spell that is not prepared, and marks it prepared so it can be cast now.")
  }),
  archetypeAbility({
    name: "Share the Wound", archetype: "Martyr", traits: "Focus, Healing, Soul", usesPerDay: "1",
    description: html("FOCUS HEALING SOUL\n\nAction R; Trigger An ally within 30 feet suffers HP damage.\n\nAfter the damage has been determined, reduce the HP damage suffered by the ally by an amount up to your level + your magical ability modifier. You lose the same number of Hit Points. This HP loss cannot be reduced by Resistance, Base DR, temporary HP or another effect and cannot itself be redirected to another creature. You cannot use Share the Wound if doing so would reduce you below 1 HP.\n\nUse as the Reaction (Focus): target the ally, enter the amount (capped at your level + magical ability modifier and at what would leave you at 1 HP); they regain it and you lose it.")
  }),
  archetypeAbility({
    name: "Vowbound Resolve", archetype: "Oathkeeper", traits: "Concentrate, Focus", usesPerDay: "1",
    description: html("CONCENTRATE FOCUS\n\nAction R; Trigger You fail a saving throw or skill check while directly attempting to fulfil your Solemn Vow.\n\nYour commitment steadies you when failure would place your promise in jeopardy. Reroll the triggering saving throw or skill check with Advantage and use the better result. Vowbound Resolve is then expended and must be restored using Refocus.\n\nUse as the Reaction (Focus): spends the use and the reaction; reroll from your sheet with advantage.")
  }),
  archetypeAbility({
    name: "Applied Insight", archetype: "Sage", traits: "Concentrate, Focus", usesPerDay: "1",
    description: html("CONCENTRATE FOCUS\n\nAction 1 AP\n\nYou may select any one Studied Target that you can see and gain one of the following modifiers until the beginning of your next turn:\n\nOpening You gain a +1-circumstance bonus to attack rolls against the Studied Target.\nWarning You gain a +1-circumstance bonus to DB and saving throws against the Studied Target's attacks, spells and abilities.\n\nUse (1 AP, Focus): target the Studied Target and choose Opening or Warning — the bonus lands as a one-round effect scoped to that creature (attacks against it pre-ticked; DB and saves from it).")
  }),
  archetypeAbility({
    name: "Ward the Soul", archetype: "Veil Warden", traits: "Focus, Soul", usesPerDay: "1",
    description: html("FOCUS SOUL\n\nAction R; Trigger An ally within 30 feet attempts a saving throw against possession, Soul Drain or an effect with the Soul trait.\n\nThe ally gains a +2-circumstance bonus to the triggering saving throw.\n\nUse as the Reaction (Focus): target the ally; +2 circumstance is queued for their save.")
  })
];

export const ARCHETYPE_GEAR = [
  gear({
    name: "Liturgical Book", price: 25, traits: "Stores Spells",
    description: html("Granted by the Liturgist archetype. Open this item's own sheet to record the four Divinity spells you can cast when the feat is taken, and further eligible Divinity spells learned from written sources. During daily preparation select one recorded spell: a learned caster treats it as memorised (it does not count against the memorised total); an instinctive caster adds it to the repertoire for the day. Liturgy of Prayer reaches one in the moment."),
    system: { spellbookContainer: true }
  })
];

export const ARCHETYPE_FEATS = [
  bookFeat("archetype", "HEDGE WITCH", {
    sheet: "Works automatically: +1 class to Spellcraft is offered with the book's wording (tick when casting a Folkwarden Specialist Spell); Hedge Witch class feats open to you. The extra Folkwarden Specialist Spell waits on the Grimoire block; Folk Lore for Identify Power is a rule for the table.",
    flags: { conditionals: [offeredBonus("Hedge Witch", 1, "class", { checkTypes: ["spellcraft"] }, "Spellcraft checks to cast Folkwarden Specialist Spells")] }
  }),
  bookFeat("archetype", "INQUISITOR", {
    sheet: "Works automatically: Inquisition (Inquisitor) arrives as an ability (Use it to name a Subject — +1 class offered on investigation checks); Use this feat to choose Occultism, Religion, Sense Motive or Survival as a class skill; Grimward class feats open to you.",
    grantedAbilities: "Inquisition (Inquisitor)"
  }),
  bookFeat("archetype", "LIFEBEARER", {
    sheet: "Works automatically: Healer's Touch arrives as a Focus ability; Use this feat to choose Medicine, Meditation or Religion as a class skill; Healer class feats open to you.",
    grantedAbilities: "Healer's Touch"
  }),
  bookFeat("archetype", "LITURGIST", {
    sheet: "Works automatically: the Liturgical Book arrives as a spellbook gear item (record four spells you can cast) and Liturgy of Prayer as a once-a-day ability; the daily selection is a rule for the table (prepare it, or add it to your repertoire, by hand); Archivist class feats open to you.",
    grantedAbilities: "Liturgy of Prayer"
  }),
  bookFeat("archetype", "MARTYR", {
    sheet: "Works automatically: Share the Wound arrives as a Focus reaction ability.",
    grantedAbilities: "Share the Wound"
  }),
  bookFeat("archetype", "OATHKEEPER", {
    sheet: "Works automatically: Sacred Law is added to your specialist skills and Vowbound Resolve arrives as a Focus reaction ability; Use this feat at daily preparation to record your Solemn Vow.",
    flags: { grantedSpecialistSkills: "Sacred Law" },
    grantedAbilities: "Vowbound Resolve"
  }),
  bookFeat("archetype", "PROPHET", {
    usesPerDay: "1",
    sheet: "Works automatically: Prophecy Lore is added to your specialist skills and Read Omen is granted as a specialist spell (it arrives with the Grimoire block); Use once per day after a Success or better on Read Omen to hold a Portent, and Use again as the Reaction to spend it — +1 status queued on the target's check.",
    flags: { grantedSpecialistSkills: "Prophecy Lore" },
    grantedSpells: "Read Omen"
  }),
  bookFeat("archetype", "RELIQUARIAN", {
    sheet: "Works automatically: Use Magic Device is granted and Relic Lore added to your specialist skills; the +1 circumstance to Use Magic Device with an identified item and to saves against its curse are offered with the book's wording.",
    grantedFeats: "Use Magic Device",
    flags: {
      grantedSpecialistSkills: "Relic Lore",
      conditionals: [
        offeredBonus("Reliquarian", 1, "circumstance", { checkTypes: ["skill"], subjects: ["arcana", "religion", "occultism", "nature", "powerManipulation"] }, "Activating (Use Magic Device) an item whose provenance and properties you have both identified"),
        offeredBonus("Reliquarian", 1, "circumstance", { checkTypes: ["save"] }, "Saving throws against the Curse or dangerous activation of an item you have completely identified")
      ]
    }
  }),
  bookFeat("archetype", "SAGE", {
    sheet: "Works automatically: Use this feat to name your Lore specialist skill; Applied Insight arrives as a Focus ability.",
    flags: { specialistChoice: { label: "A Specialist Lore skill", prompt: "The Lore your studies centre on", placeholder: "e.g. Monster Lore", suffix: "Lore" } },
    grantedAbilities: "Applied Insight"
  }),
  bookFeat("archetype", "SPIRIT WALKER", {
    sheet: "Works automatically: Use this feat to choose your Spirit Guide (Ancestor, Beast, Elemental, Land or Veil — its specialist skill and Spirit Boon arrive with it); Manifest Spirit arrives as a Focus ability and manifests that guide; Shaman class feats open to you.",
    flags: { abilityChoices: ["Ancestor Spirit", "Beast Spirit", "Elemental Spirit", "Land Spirit", "Veil Spirit"] },
    grantedAbilities: "Manifest Spirit"
  }),
  bookFeat("archetype", "VEIL WARDEN", {
    sheet: "Works automatically: Spirit Sense (30 ft, tertiary — the book prints no range; the Eshari's is assumed) is on your senses list; +1 class to saves is pre-ticked against Soul-trait and possession effects; Ward the Soul arrives as a Focus reaction ability.",
    flags: {
      creatureAbility: { printedTraits: "", printedAction: "", printedArea: "", derives: { sense: { category: "tertiary", modality: "spiritual", fixedFeet: 30, name: "Spirit Sense", finds: SPIRIT_FINDS } }, source: "Pillars of Faith, Chapter 5 (Veil Warden)" },
      conditionals: saveBonus("Veil Warden", 1, "class", ["soul", "possession"], "Saving throws against possession, Soul Drain and Soul-trait effects")
    },
    grantedAbilities: "Ward the Soul"
  }),
  bookFeat("archetype", "VOTARY", {
    sheet: "A rule for the table with one automation: add your Divine Aspect from the sheet's Divine Aspect slot (its Edicts, Anathema, deific skill and favoured weapon follow); Use this feat to choose the Aspect's PP 1 specialist spell as a Divinity innate spell with the Focus trait (Wisdom-based)."
  }),
  bookFeat("archetype", "WAYWARDEN", {
    sheet: "Works automatically: Warding Charm and Brew Remedy say they take 1 minute; Read the Signs' card says one direction, route, shelter, water or hazard question is free on a Success or better."
  })
];
