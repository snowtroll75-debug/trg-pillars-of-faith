/**
 * Chapter 6 — the mundane equipment: six suits of armour, five shields,
 * nine weapons and twelve tools, in the exact shape the core armour,
 * shields, weapons and gear packs keep theirs. Typed from the printed
 * tables and description paragraphs (pages of Chapter 6).
 *
 * WHAT THE SYSTEM DOES WITH THEM FOR FREE: the armour numbers (DR, ACP,
 * Max Dex, Speed, HP, Helm/Full Helm perception penalties off the trait
 * line), the shield numbers (DB, ACP, DR, HP, the Shield Bash die), the
 * weapon numbers and the traits the attack workflow reads (Agile,
 * Finesse, Reach, Sweep, Trip, Shove, Disarm, Versatile, AR), the gear
 * `goodsConditionals` (offered while the tool is equipped), and — from
 * TRG Prime 3.607.0 — a suit's or shield's own `conditionals`, in force
 * only while it is worn and standing.
 *
 * WHAT IS PROSE (each on the item): a shield bash that gains Shove
 * (Ossuary Board), a shield that can be planted (Processional Aegis —
 * its +1 is a conditional), Reach on a chain that is Nonlethal (the
 * trait is printed and carried, not enforced), Brace and Balanced
 * (printed traits the core weapons pack does not carry), and the
 * Hospice Jack's "counts as a basic healer's kit for Administer First
 * Aid" (declared with `toolFor`; the action has no tool requirement in
 * the core table today, so nothing is asked of it).
 */
import { stableId, SYSTEM_ID } from "./builders.mjs";

const STATS = { coreVersion: "14", systemId: SYSTEM_ID, systemVersion: "3.607.0", createdTime: 1789000000000, modifiedTime: 1789000000000, lastModifiedBy: null, compendiumSource: null, duplicateSource: null };
const SOURCE = "Pillars of Faith, Chapter 6.";
const base = (id, name, type, img, system, flags = {}) => ({
  _id: id, name, img, type, system, effects: [], folder: null, sort: 0, ownership: { default: 0 },
  flags: { [SYSTEM_ID]: { bookChapter: 6, ...flags } }, _stats: { ...STATS }
});
const offered = (label, value, scope, when) => ({ kind: "modifier", value, type: "item", label, scope, auto: false, when });

/* ------------------------------------------------------------------ */
/* Armour                                                               */
/* ------------------------------------------------------------------ */

function armour({ name, category, level, price, acp, maxDex, dr, hp, speed, weight, traits, description, covers = [true, false, false], flags = {} }) {
  return base(stableId(`armour:${name}`), name, "armour", "icons/svg/shield.svg", {
    quantity: 1, weight, price, equipped: false, invested: false,
    hp: { value: hp, max: hp },
    traits, category, material: /Metal/.test(traits) ? "Metal" : "", isHelmet: /\bHelm\b/.test(traits),
    dr, hardness: 0, penalty: acp, proficiency: "", maxDexBonus: maxDex, speedPenalty: speed,
    itemLevel: level,
    coversTorso: covers[0], coversArms: covers[1], coversLegs: covers[2],
    description: `${description}\n\n${SOURCE}`
  }, flags);
}

export const ARMOUR = [
  armour({ name: "Hospice Jack", category: "Light", level: 1, price: 130, acp: 0, maxDex: 7, dr: 2, hp: 20, speed: 0, weight: 8, traits: "",
    description: "This reinforced quilted coat was developed by battlefield chirurgeons and temple hospices. Narrow pockets contain splints, bandages and basic instruments where they can be reached quickly. A properly stocked Hospice Jack counts as a basic healer's kit for the purpose of Administer First Aid, although not for Treat Wounds, surgery or other more involved Medicine actions.\n\nOn the sheet: declared as the tool for Administer First Aid (that action asks for no tool in the core table, so the jack is simply on hand).",
    flags: { toolFor: ["firstAid"] } }),
  armour({ name: "Pilgrim's Coat", category: "Light", level: 1, price: 90, acp: 0, maxDex: 8, dr: 1, hp: 15, speed: 0, weight: 6, traits: "",
    description: "A long reversible travelling coat with concealed pockets, removable insignia and hidden loops for religious jewellery. When the wearer uses Conceal Faith, they gain a +1-item bonus provided that any physical evidence of their actual faith is small enough to be hidden within the coat. It cannot conceal supernatural evidence or an object too large to hide.\n\nOn the sheet: +1 item is offered on Conceal Faith while the coat is worn.",
    flags: { conditionals: [offered("Pilgrim's Coat", 1, "Conceal Faith, when the evidence of your faith is small enough to hide in the coat", { checkTypes: ["skill"], actions: ["concealFaith"] })] } }),
  armour({ name: "Gravewarden Coat", category: "Medium", level: 2, price: 280, acp: -2, maxDex: 4, dr: 4, hp: 45, speed: 0, weight: 24, traits: "Full, Metal", covers: [true, true, true],
    description: "A mail-lined leather coat with close-fitting gloves, a high collar and a replaceable cloth breathing veil. Originally designed for crypt custodians and corpse collectors, it grants a +1-item bonus to Fortitude saves against airborne disease and inhaled poison while all of its protective components are worn.\n\nOn the sheet: +1 item is pre-ticked on Fortitude saves against Disease and Poison effects while the coat is worn (tick off if the vector was not airborne or inhaled).",
    flags: { conditionals: [
      { kind: "modifier", value: 1, type: "item", label: "Gravewarden Coat", scope: "Fortitude saves against airborne disease and inhaled poison (all components worn)", auto: true, when: { checkTypes: ["save"], subjects: ["fortitude"], traits: ["disease", "poison"] } },
      offered("Gravewarden Coat", 1, "Fortitude saves against airborne disease and inhaled poison — tick if this is one", { checkTypes: ["save"], subjects: ["fortitude"], not: { traits: ["disease", "poison"] } })
    ] } }),
  armour({ name: "Ossuary Lamellar", category: "Medium", level: 2, price: 300, acp: -2, maxDex: 4, dr: 4, hp: 50, speed: 0, weight: 22, traits: "Rigid",
    description: "Lacquered bone, horn and dense leather plates overlap across the chest and limbs. The design developed among cultures where good metal was scarce but large burial grounds were not. Ossuary Lamellar grants +1 DR against slashing damage. Despite its appearance, it possesses no connection to the souls of those from whose remains it may have been fashioned.\n\nOn the sheet: the +1 DR against slashing is a note — DR on the sheet is one number; apply it by hand when the damage is slashing." }),
  armour({ name: "Sepulchral Plate", category: "Heavy", level: 3, price: 650, acp: -6, maxDex: 2, dr: 6, hp: 90, speed: -5, weight: 48, traits: "Full, Helm, Metal, Rigid", covers: [true, true, true],
    description: "Designed for expeditions into sealed tombs, the faceplate, neck and joints can be closed with leather gaskets and waxed cloth. You gain a +1-item bonus to Fortitude saves against disease and poison transmitted by contact or inhalation. The armour provides no protection against magical effects merely because they originate within a tomb.\n\nOn the sheet: +1 item is pre-ticked on Fortitude saves against Disease and Poison effects while the plate is worn; the Helm's −1 to Perception applies as the core rule.",
    flags: { conditionals: [
      { kind: "modifier", value: 1, type: "item", label: "Sepulchral Plate", scope: "Fortitude saves against disease and poison transmitted by contact or inhalation", auto: true, when: { checkTypes: ["save"], subjects: ["fortitude"], traits: ["disease", "poison"] } },
      offered("Sepulchral Plate", 1, "Fortitude saves against disease and poison by contact or inhalation — tick if this is one", { checkTypes: ["save"], subjects: ["fortitude"], not: { traits: ["disease", "poison"] } })
    ] } }),
  armour({ name: "Oathguard Plate", category: "Heavy", level: 4, price: 850, acp: -7, maxDex: 2, dr: 7, hp: 100, speed: -10, weight: 55, traits: "Full, Helm, Metal, Rigid", covers: [true, true, true],
    description: "Temple guards traditionally spend long hours motionless before doorways, thrones and sacred precincts. The wide sabatons and carefully weighted plates of this armour reflect that practice. If you have not moved since the beginning of your current turn, you gain a +1-item bonus on checks and saving throws made to resist Shove, Trip or forced physical movement.\n\nOn the sheet: +1 item is offered on checks and saves to resist being Shoved, Tripped or moved — tick when you have not moved this turn.",
    flags: { conditionals: [offered("Oathguard Plate", 1, "Checks and saving throws to resist Shove, Trip or forced movement, if you have not moved since the beginning of your turn", { checkTypes: ["save", "skill", "attribute"] })] } })
];

/* ------------------------------------------------------------------ */
/* Shields                                                              */
/* ------------------------------------------------------------------ */

function shield({ name, category, level, price, db, acp, weight, dr, hp, metal, bash, bashFumble, description, flags = {} }) {
  return base(stableId(`shields:${name}`), name, "shield", "icons/svg/shield.svg", {
    quantity: 1, weight, price, equipped: false, invested: false,
    hp: { value: hp, max: hp },
    traits: "", dr, hardness: 0, brokenThreshold: 0, proficiency: "", penalty: acp, defenceBonus: db,
    category, metal, itemLevel: level,
    shieldBashDamage: bash, shieldBashFumbleDC: bashFumble, shieldBashDamageType: "bludgeoning",
    description: `${description}\n\n${SOURCE}`
  }, flags);
}

export const SHIELDS = [
  shield({ name: "Censer Buckler", category: "buckler", level: 1, price: 70, db: 1, acp: 0, weight: 4, dr: 0, hp: 10, metal: true, bash: "", bashFumble: 0,
    description: "A small metal buckler with a perforated incense chamber behind its central boss. One dose of incense may be placed within it and lit normally. While wielding the shield, the incense can continue burning without occupying another hand. The buckler does not itself modify the effects of the incense.\n\nOn the sheet: a buckler (no Shield Bash); the burning incense is a note." }),
  shield({ name: "Reliquary Shield", category: "light", level: 1, price: 100, db: 2, acp: -1, weight: 8, dr: 1, hp: 15, metal: true, bash: "1d4", bashFumble: 6,
    description: "A reinforced compartment inside the shield can hold one Tiny item such as a holy symbol, document, vial, bone fragment or small relic. The compartment is waterproof. An object inside cannot normally be separately targeted until the compartment is opened or the shield is Broken." }),
  shield({ name: "Vigil Shield", category: "light", level: 1, price: 120, db: 2, acp: -1, weight: 9, dr: 1, hp: 15, metal: true, bash: "1d4", bashFumble: 6,
    description: "The inner face contains a folding brace upon which a small book, ledger or prayer text can be secured. You can consult the secured book while wielding the shield without requiring an additional hand to hold it. Turning pages or exchanging books still requires the normal Interact action." }),
  shield({ name: "Ossuary Board", category: "heavy", level: 2, price: 180, db: 3, acp: -3, weight: 18, dr: 1, hp: 25, metal: false, bash: "1d6", bashFumble: 8,
    description: "A brutal rectangular shield traditionally constructed from layered timber, hide and ornamental bone. A Shield Bash made with an Ossuary Board gains the Shove trait.\n\nOn the sheet: the Shove on a Shield Bash is a note — resolve the Shove by hand after a hit." }),
  shield({ name: "Processional Aegis", category: "heavy", level: 2, price: 230, db: 3, acp: -4, weight: 22, dr: 1, hp: 25, metal: true, bash: "1d6", bashFumble: 8,
    description: "These tall icon-bearing shields accompany religious processions but are equally capable of stopping arrows. You may spend 2 AP to plant the shield securely. While planted, it cannot provide you with its normal shield benefits, but it functions as a small portable shrine or ceremonial surface. Appropriate use grants a +1-item bonus to Perform Last Rites or Observe Sacred Custom.\n\nOn the sheet: +1 item is offered on Perform Last Rites and Observe Sacred Custom — tick while the shield is planted (its DB is yours to unequip meanwhile).",
    flags: { conditionals: [offered("Processional Aegis", 1, "Perform Last Rites or Observe Sacred Custom while the shield is planted (2 AP; no shield benefits meanwhile)", { checkTypes: ["skill"], actions: ["performLastRites", "observeSacredCustom"] })] } })
];

/* ------------------------------------------------------------------ */
/* Weapons                                                              */
/* ------------------------------------------------------------------ */

const DAMAGE_TYPES = { S: "slashing", P: "piercing", B: "bludgeoning" };
const SIZES = { S: "small", M: "medium", L: "large" };

function weapon({ name, category, price, damage, size, fdc, weight, group, traits, description, level = 0 }) {
  const [dice, letter] = damage.split(" ");
  const ar = Number((traits.match(/\bAR (\d+)/) ?? [])[1] ?? 0);
  return base(stableId(`weapons:${name}`), name, "weapon", "icons/svg/sword.svg", {
    quantity: 1, weight, price, equipped: false, invested: false,
    hp: { value: 0, max: 0 },
    traits,
    attackBonus: 0, damage: dice, damageType: DAMAGE_TYPES[letter], baseDamage: 0,
    hands: 1, range: "", armourRending: ar, proficiency: "", fumbleDC: fdc,
    attackMode: "melee", rangeIncrement: 0, group, category, size: SIZES[size], itemLevel: level,
    description: `${description}\n\n${SOURCE}`
  });
}

export const WEAPONS = [
  weapon({ name: "Bloom Scythe", category: "Exotic", price: 45, damage: "1d8 S", size: "L", fdc: 20, weight: 8, group: "Polearm", traits: "Reach, Sweep, Trip, Myrathi",
    description: "Developed from Myrathi cultivation tools used to harvest fungal growth without damaging the underlying mycelium. The long crescent blade makes it particularly effective at sweeping attacks and hooking limbs." }),
  weapon({ name: "Censer Flail", category: "Martial", price: 40, damage: "1d8 B", size: "M", fdc: 18, weight: 6, group: "Flail", traits: "Disarm, Sweep",
    description: "Its perforated metal head serves both as a functional censer and a weapon. Incense can be burned inside it outside combat or while wielded. Attacking with a burning Censer Flail does not inflict fire damage - the hot coals are protected inside the chamber." }),
  weapon({ name: "Crozier", category: "Simple", price: 15, damage: "1d6 B", size: "M", fdc: 16, weight: 4, group: "Club", traits: "Shove, Trip",
    description: "A reinforced shepherd's crook used by travelling priests, mendicants and rural spirit-speakers. Its hooked end makes it unexpectedly effective at pulling a foe from their footing." }),
  weapon({ name: "Funeral Sickle", category: "Simple", price: 12, damage: "1d4 S", size: "S", fdc: 16, weight: 2, group: "Knife", traits: "Agile, Finesse, Trip, Versatile P",
    description: "Originally intended for cutting shrouds, grave flowers and ritual cords, this compact sickle has developed into a favoured defensive weapon of funeral attendants." }),
  weapon({ name: "Grave Hook", category: "Martial", price: 35, damage: "1d8 P", size: "L", fdc: 18, weight: 8, group: "Polearm", traits: "Disarm, Reach, Trip",
    description: "A long-shafted iron hook developed for moving bodies, pulling coffins and retrieving objects from unsafe crypts. Grave Wardens rapidly discovered that the same design was effective at dragging hostile creatures off balance." }),
  weapon({ name: "Last-Road Spear", category: "Exotic", price: 40, damage: "1d8 P", size: "L", fdc: 18, weight: 7, group: "Spear", traits: "Brace, Reach, Versatile S, Eshari",
    description: "Traditionally carried by Eshari funerary escorts, the broad blade and rear-facing hook allow it to be used against charging opponents or to control a corpse without approaching too closely.\n\nBrace is printed as a trait; the core weapons carry no Brace rule, so it is a note for the table." }),
  weapon({ name: "Oath Hammer", category: "Martial", price: 30, damage: "1d8 B", size: "M", fdc: 16, weight: 6, group: "Hammer", traits: "AR 2, Shove",
    description: "Part ceremonial gavel, part military hammer. Its compact flanged head can deform armour, while its broad reverse face is traditionally struck against stone when witnessing a formal oath." }),
  weapon({ name: "Penitent Chain", category: "Martial", price: 30, damage: "1d6 B", size: "M", fdc: 18, weight: 6, group: "Flail", traits: "Disarm, Nonlethal, Reach, Trip",
    description: "A length of heavy chain terminating in padded or iron weights. Some ascetic orders use lighter versions during ritual discipline; Grimwards and temple guards developed the considerably less symbolic battlefield form.\n\nNonlethal is printed as a trait; mark the damage nonlethal on the damage card." }),
  weapon({ name: "Testament Blade", category: "Exotic", price: 35, damage: "1d8 S", size: "M", fdc: 16, weight: 4, group: "Sword", traits: "Balanced, Versatile P, Kethrani",
    description: "A straight, broad-sided sword particularly associated with Kethrani guardians. The flat blade provides ample space for inscriptions and records of oaths, although those markings confer no supernatural properties.\n\nBalanced is printed as a weapon trait here; in the core it is a superior trait (Fumble DC −1), which the printed FDC 16 already reflects." })
];

/* ------------------------------------------------------------------ */
/* Gear & tools                                                         */
/* ------------------------------------------------------------------ */

function tool({ name, level, price, weight, description, category = "Kits & Tools", size = "S", hands = 0, conditionals = [], flags = {}, uses = 0 }) {
  return base(stableId(`gear:${name}`), name, "gear", "icons/svg/chest.svg", {
    quantity: 1, weight, price, equipped: false, invested: false,
    hp: { value: 0, max: 0 }, traits: "",
    description: `${description}\n\n${SOURCE}`,
    slot: "", uses: { value: uses, max: uses }, itemSize: size, itemLevel: level, heldHands: hands, formulae: "",
    gearCategory: category, gearCategoryInferred: false
  }, { ...(conditionals.length ? { goodsConditionals: conditionals } : {}), ...flags });
}
// A Goods conditional row (goods.mjs): value/type/label/scope/when, offered while equipped.
const goods = (label, value, scope, when) => ({ value, type: "item", label, scope, when });

export const TOOLS = [
  tool({ name: "Archivist's Travel Desk", level: 1, price: 45, weight: 12, size: "M", description: "A folding writing surface containing magnifying lenses, page weights, rulers, reference marks and spaces for inks. It takes 1 minute to deploy. While seated or standing at the deployed desk, you gain a +1-item bonus to Analyse Scripture and Compare Testaments.",
    conditionals: [goods("at the deployed desk", 1, "Analyse Scripture and Compare Testaments at the deployed desk (1 minute to deploy)", { actions: ["analyseScripture", "compareTestaments"] })] }),
  tool({ name: "Autopsy Roll", level: 1, price: 35, weight: 5, description: "Fine knives, probes, shears, measuring cord, bone saw and labelled evidence containers. It counts as appropriate tools for Perform Autopsy and grants a +1-item bonus to Examine the Dead and Perform Autopsy.",
    conditionals: [goods("examining or opening a body", 1, "Examine the Dead and Perform Autopsy", { actions: ["examineTheDead", "performAutopsy"] })], flags: { toolFor: ["performAutopsy"] } }),
  tool({ name: "Doctrine Folio", level: 1, price: 30, weight: 3, description: "When purchased, select one religion, Divine Aspect or defined religious tradition. The folio contains symbols, terminology, recognised rites, historical variants and notes on vestments. It grants a +1-item bonus to Recognise Doctrine and Trace Religious Provenance involving that tradition. A different folio is required for another tradition.\n\nRename the folio for its tradition (\"Doctrine Folio: the Chapel of the Open Hand\").",
    conditionals: [goods("the folio's tradition", 1, "Recognise Doctrine and Trace Religious Provenance involving the folio's tradition", { actions: ["recogniseDoctrine", "traceReligiousProvenance"] })] }),
  tool({ name: "Funerary Kit", level: 1, price: 25, weight: 8, description: "Shroud cloth, cord, needles, scented oils, basic preservative compounds and the mundane ceremonial implements required by several common burial traditions. It grants a +1-item bonus to Preserve Remains and Perform Last Rites.",
    conditionals: [goods("preparing or laying out remains", 1, "Preserve Remains and Perform Last Rites", { actions: ["preserveRemains", "performLastRites"] })] }),
  tool({ name: "Grave Surveyor's Kit", level: 1, price: 25, weight: 6, description: "Measuring line, soil probes, sounding hammer, narrow shovel and marker pegs. You gain a +1-item bonus to Search checks specifically made to locate disturbed graves, concealed burial chambers, recently opened tombs or physical tampering with burial sites.",
    conditionals: [goods("searching burial sites", 1, "Search for disturbed graves, concealed burial chambers, opened tombs or tampering with burial sites", { actions: ["search"] })] }),
  tool({ name: "Listening Chimes", level: 1, price: 20, weight: 2, description: "A collapsible stand bearing extremely fine bells, suspended threads and weighted needles. It does not detect spirits. Instead, it reveals tiny movements of air, vibration or surfaces. It grants a +1-item bonus to Interpret Haunt only when the haunt produces a physical manifestation capable of disturbing the apparatus.",
    conditionals: [goods("a physical manifestation", 1, "Interpret Haunt when the haunt produces a physical manifestation", { actions: ["interpretHaunt"] })] }),
  tool({ name: "Reliquary Case", level: 0, price: 20, weight: 4, category: "Goods", description: "A padded, lockable, waterproof box. It has Hardness 5 and 10 HP. Its contents cannot normally be damaged without first opening, bypassing or destroying the case." }),
  tool({ name: "Ritual Vestment Roll", level: 1, price: 30, weight: 5, description: "Select one religion when purchasing the kit. It contains mundane symbols, garments, cords and accessories typical of that tradition. When using Conceal Faith to impersonate a member of that religion, you gain a +1-item bonus. It provides no actual theological knowledge; Chapter 4's normal provision for Religion, Culture or Lore checks still applies.\n\nRename the roll for its religion.",
    conditionals: [goods("impersonating the roll's religion", 1, "Conceal Faith to impersonate a member of the roll's religion", { actions: ["concealFaith"] })] }),
  tool({ name: "Shrine Mason's Kit", level: 1, price: 40, weight: 10, size: "M", description: "Fine chisels, plumb lines, measuring cords and carving tools. It grants a +1-item bonus to Crafting checks involving the construction, repair or examination of shrines, tombs, crypt seals, memorials and religious stonework.",
    conditionals: [goods("religious stonework", 1, "Crafting involving shrines, tombs, crypt seals, memorials and religious stonework", { checkTypes: ["skill"], subjects: ["crafting"] })] }),
  tool({ name: "Testimony Kit", level: 0, price: 10, weight: 2, description: "Wax tablets, numbered seals, cords, writing implements and impression wax used by Oath Witnesses and Grimwards. It allows testimony and physical evidence to be systematically labelled. At the GM's discretion, properly recorded evidence prevents mundane details such as wording, measurements or the order in which items were found from being forgotten later." }),
  tool({ name: "Vigil Censer", level: 0, price: 8, weight: 2, category: "Goods", description: "A sturdy covered censer with a sand-filled base. It can safely burn one incense consumable for up to 1 hour and can be set down without extinguishing it." }),
  tool({ name: "Waterproof Bookcase", level: 0, price: 12, weight: 2, category: "Goods", description: "Particularly popular with Archivists. A waxed-leather and thin-metal case capable of holding one large book or several scrolls. Its contents are protected from ordinary rain, immersion of less than 1 minute and routine travel damage." })
];
