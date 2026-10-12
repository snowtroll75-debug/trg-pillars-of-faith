/**
 * Pillars of Faith — Chapter 4, Skills & Actions. Seventeen additions (and, from 0.4.0, Read the Room) to
 * existing skills, in the exact shape TRG Prime's own SKILL_ACTIONS
 * holds, registered through `api.registerSkillActions` and appended to
 * the live table at `ready`.
 *
 * WHAT THE GENERIC PATH GIVES THEM FOR FREE: the roll from the skill's
 * own action chooser, the Secret trait's roll mode, the trained gate
 * (every one prints "Requirements Rank 1" or higher), the `minRank` gate
 * (3.561.0) for Rank 2 and Rank 3, the Level-DC target for the actions
 * that name one, the outcome ladder on the card, and the circumstance
 * bonuses and penalties an outcome states — written here as
 * "+2 circumstance bonus" (the book hyphenates; the system's
 * `extractModifier` grammar does not) so they are queued on whoever the
 * row names and offered in that character's next roll dialog.
 *
 * `against`: "levelDC" where the book says "against the Level DC of" a
 * target (a token must be targeted, or the dialog asks); "none" where
 * the GM sets the DC; "fixed" for Preserve Remains' printed 20.
 */

const ladder = (o) => ({ heroic: "", critical: "", success: "", partial: "", failure: "", fumble: "", blunder: "", ...o });

export const SKILL_ACTIONS = [
  /* ---------------------------------------------------------------- */
  /* CULTURE                                                            */
  /* ---------------------------------------------------------------- */
  {
    key: "observeSacredCustom",
    name: "Observe Sacred Custom",
    skills: ["culture"],
    traits: "Concentrate",
    apCost: "10 minutes",
    requirements: "Rank 1.",
    trained: true,
    checkType: "skill",
    against: "none",
    outcomes: ladder({
      critical: "You understand the expected behaviour and recognise subtle differences in rank, ceremony and etiquette. You gain a +2 circumstance bonus to your next Diplomacy, Religion or Sense Motive check involving members of that tradition within the next hour.",
      success: "You understand the expected behaviour and avoid accidentally breaching an important custom. You gain a +1 circumstance bonus to the next applicable check.",
      partial: "You understand the most obvious customs but remain uncertain about finer details.",
      failure: "You recall nothing particularly useful.",
      fumble: "You confidently remember an incorrect or inappropriate custom. The GM may apply a -2 circumstance penalty to the first relevant social check you attempt."
    }),
    description: "Study or recall the customs of a particular temple, religious order, funeral tradition or community before participating in one of its ceremonies or social practices. Make a Culture check against a DC determined by the obscurity of the tradition (Pillars of Faith, Chapter 4)."
  },
  {
    key: "traceReligiousProvenance",
    name: "Trace Religious Provenance",
    skills: ["culture"],
    traits: "Concentrate, Secret",
    apCost: "10 minutes",
    requirements: "Rank 2.",
    trained: true,
    minRank: 2,
    checkType: "skill",
    against: "none",
    outcomes: ladder({
      critical: "You identify its culture, approximate period, religious tradition and likely original purpose. You also recognise whether something about the object is historically unusual or inconsistent.",
      success: "You identify its culture, general age and religious tradition.",
      partial: "You identify either its broad culture or religion.",
      failure: "You cannot determine its provenance.",
      fumble: "You incorrectly attribute the object to another plausible tradition."
    }),
    description: "Examine a religious object, vestment, symbol, burial good, architectural feature or other cultural artefact and attempt to determine where it originated. This action does not identify magical properties; use Identify Power where appropriate (Pillars of Faith, Chapter 4)."
  },

  /* ---------------------------------------------------------------- */
  /* DECEPTION                                                          */
  /* ---------------------------------------------------------------- */
  {
    key: "concealFaith",
    name: "Conceal Faith",
    skills: ["deception"],
    traits: "Concentrate, Mental, Secret",
    apCost: "10 minutes",
    requirements: "Rank 1. Choose whether you appear non-religious, or present yourself as a follower of another faith or Divine Aspect.",
    trained: true,
    checkType: "skill",
    against: "none",
    outcomes: ladder({
      critical: "You conceal your faith completely and naturally. Creatures attempting to Detect Deception suffer a -2 circumstance penalty unless they possess direct evidence contradicting your assumed identity.",
      success: "You convincingly conceal your religious allegiance.",
      partial: "Your behaviour is generally convincing, but small inconsistencies remain. Creatures actively investigating your religious identity gain a +2 circumstance bonus to Detect Deception.",
      failure: "You fail to conceal important signs of your faith. Anyone interacting with you for more than a brief period can recognise that you are hiding something, although they do not automatically learn your actual faith.",
      fumble: "You inadvertently reveal a distinctive practice, expression or belief associated with your true faith. A knowledgeable observer may immediately recognise your religious allegiance."
    }),
    description: "Deliberately conceal the religious beliefs, Divine Aspect or spiritual tradition you follow. The result becomes the DC for attempts to recognise your true allegiance: a creature with reason to question your faith may attempt Detect Deception (Sense Motive) against it, and one closely familiar with your actual faith, or the faith you pretend to follow, gains a +2 circumstance bonus. The GM may also require a Religion, Culture or Lore check for complex ceremonies or detailed theology. The effect lasts until you abandon the deception, openly practise your true faith or circumstances make the pretence impossible; it cannot hide supernatural evidence of allegiance or an uncovered physical symbol (Pillars of Faith, Chapter 4)."
  },

  /* ---------------------------------------------------------------- */
  /* LINGUISTICS                                                        */
  /* ---------------------------------------------------------------- */
  {
    key: "analyseScripture",
    name: "Analyse Scripture",
    skills: ["linguistics"],
    traits: "Concentrate, Secret",
    apCost: "10 minutes",
    requirements: "Rank 1.",
    trained: true,
    checkType: "skill",
    against: "none",
    outcomes: ladder({
      critical: "You identify its language, approximate age, likely authorship or tradition and intended meaning. You also recognise later alterations, interpolations, mistranslations or deliberate omissions.",
      success: "You determine its general origin, meaning and whether it appears substantially complete.",
      partial: "You understand the broad meaning but cannot confidently separate the original text from later additions.",
      failure: "You cannot draw any reliable conclusions.",
      fumble: "You misinterpret an important part of the text."
    }),
    description: "Carefully examine a religious, philosophical or ritual text rather than merely reading its literal words. Make a Linguistics check against a DC determined by the age, obscurity and condition of the text. This action does not reveal information absent from the surviving text (Pillars of Faith, Chapter 4)."
  },
  {
    key: "compareTestaments",
    name: "Compare Testaments",
    skills: ["linguistics"],
    traits: "Concentrate, Secret",
    apCost: "1 hour",
    requirements: "Rank 3; you possess at least two versions of substantially the same text.",
    trained: true,
    minRank: 3,
    checkType: "skill",
    against: "none",
    outcomes: ladder({
      critical: "You identify all significant differences and can usually determine which passages are older, later additions or deliberate changes.",
      success: "You identify the major differences between the texts and can determine whether one has been altered.",
      partial: "You identify that the texts differ but cannot reliably establish which version is older or more accurate.",
      failure: "You find no meaningful distinction.",
      fumble: "You incorrectly identify one version as authoritative."
    }),
    description: "Compare manuscripts line by line, looking for copying errors, deliberate alteration and doctrinal revision. Particularly useful when investigating forged scripture, revised burial records and doctrinal disputes (Pillars of Faith, Chapter 4)."
  },

  /* ---------------------------------------------------------------- */
  /* MEDICINE                                                           */
  /* ---------------------------------------------------------------- */
  {
    key: "examineTheDead",
    name: "Examine the Dead",
    skills: ["medicine"],
    traits: "Concentrate, Manipulate, Secret",
    apCost: "10 minutes",
    requirements: "Rank 1. Target: one corpse.",
    trained: true,
    checkType: "skill",
    against: "none",
    outcomes: ladder({
      critical: "You determine the approximate time and primary cause of death, identify significant injuries and recognise whether disease, poison or another unusual condition probably contributed. You also recognise injuries inflicted after death.",
      success: "You determine the approximate cause and time of death and identify obvious unusual injuries.",
      partial: "You determine either the likely cause or approximate time of death.",
      failure: "You learn nothing beyond what casual inspection reveals.",
      fumble: "You reach an incorrect conclusion concerning the cause of death."
    }),
    description: "Perform an external examination of a body to establish what happened to it. The GM determines the DC according to the condition and age of the remains. This cannot identify a specific poison, disease, spell or supernatural creature unless there is sufficient physical evidence; other knowledge skills may follow up (Pillars of Faith, Chapter 4)."
  },
  {
    key: "performAutopsy",
    name: "Perform Autopsy",
    skills: ["medicine"],
    traits: "Concentrate, Manipulate, Secret",
    apCost: "1 hour",
    requirements: "Rank 3; appropriate tools and access to the corpse.",
    trained: true,
    minRank: 3,
    checkType: "skill",
    against: "none",
    outcomes: ladder({
      critical: "As Examine the Dead's Critical result, but you also discover concealed internal injuries, foreign material and physical evidence of disease, poison or unusual biological changes. If another skill can identify the cause, you gain a +2 circumstance bonus to that subsequent check.",
      success: "As a Critical result from Examine the Dead.",
      partial: "As a Success from Examine the Dead.",
      failure: "The examination produces no additional useful information.",
      fumble: "You damage important evidence. Future attempts to examine this corpse suffer a -2 circumstance penalty."
    }),
    description: "Conduct a detailed internal examination of a corpse. Uses the same general DC as Examine the Dead, reduced by 2 because of the more invasive examination — set the DC accordingly. An autopsy may be culturally or religiously unacceptable in some societies (Pillars of Faith, Chapter 4)."
  },
  {
    key: "preserveRemains",
    name: "Preserve Remains",
    skills: ["medicine"],
    traits: "Manipulate",
    apCost: "1 hour",
    requirements: "Rank 1; a healer's kit or equivalent materials.",
    trained: true,
    checkType: "skill",
    against: "fixed",
    fixedDC: 20,
    outcomes: ladder({
      critical: "The corpse suffers no ordinary decomposition for 1 month.",
      success: "The corpse suffers no ordinary decomposition for 1 week.",
      partial: "The corpse suffers no ordinary decomposition for 24 hours.",
      failure: "Your efforts provide no significant preservation.",
      fumble: "Your treatment accelerates deterioration; checks made to examine the corpse suffer a -2 circumstance penalty until it is properly treated."
    }),
    description: "Clean, prepare and preserve a corpse against ordinary decay. The normal DC is 20, modified by environmental conditions and the condition of the body. Preserve Remains does not prevent magical decay, undeath or destruction (Pillars of Faith, Chapter 4)."
  },

  /* ---------------------------------------------------------------- */
  /* NATURE                                                             */
  /* ---------------------------------------------------------------- */
  {
    key: "readSpiritSigns",
    name: "Read Spirit Signs",
    skills: ["nature"],
    traits: "Concentrate, Secret",
    apCost: "1 minute",
    requirements: "Rank 1. Target: one natural location or feature within 30 feet.",
    trained: true,
    checkType: "skill",
    against: "levelDC",
    outcomes: ladder({
      critical: "You determine whether a spiritual presence has recently affected the area, its approximate strength, whether its influence appears hostile or disruptive, and the general direction in which it moved or is concentrated.",
      success: "You recognise the presence of unusual spiritual influence and determine whether it is recent or longstanding.",
      partial: "You recognise that something unnatural or spiritually unusual has occurred but learn nothing more.",
      failure: "You detect nothing unusual.",
      fumble: "You mistake an ordinary natural phenomenon for spiritual activity or overlook genuine activity entirely."
    }),
    description: "Examine subtle disturbances in animals, vegetation, weather, soil and other natural signs for evidence of spiritual influence. Make a Nature check against the Level DC of the spirit or effect responsible — target its token if it has one; otherwise the GM sets the DC. This does not identify the spirit itself (Pillars of Faith, Chapter 4)."
  },

  /* ---------------------------------------------------------------- */
  /* OCCULTISM                                                          */
  /* ---------------------------------------------------------------- */
  {
    key: "tracePossession",
    name: "Trace Possession",
    skills: ["occultism"],
    traits: "Concentrate, Secret",
    apCost: "1 minute",
    requirements: "Rank 2. Target: one creature, corpse, object or location associated with a suspected possession.",
    trained: true,
    minRank: 2,
    checkType: "skill",
    against: "levelDC",
    outcomes: ladder({
      critical: "You determine whether possession has occurred, whether it is currently active, the broad nature of the possessing influence and whether it appears to have entered or departed willingly.",
      success: "You determine whether possession is currently or was recently present.",
      partial: "You recognise signs consistent with spiritual or mental interference but cannot confirm possession.",
      failure: "You find no reliable evidence.",
      fumble: "You misinterpret the evidence and reach an incorrect conclusion."
    }),
    description: "Search for the lingering signs left when one consciousness intrudes upon another. Make an Occultism check against the Level DC of the possessing creature or effect. Trace Possession does not reveal the identity of the possessing creature unless other evidence would reasonably allow it (Pillars of Faith, Chapter 4)."
  },
  {
    key: "interpretHaunt",
    name: "Interpret Haunt",
    skills: ["occultism"],
    traits: "Concentrate, Secret",
    apCost: "10 minutes",
    requirements: "Rank 2. Target: a haunt or location affected by one.",
    trained: true,
    minRank: 2,
    checkType: "skill",
    against: "levelDC",
    outcomes: ladder({
      critical: "You identify the haunt's nature, likely trigger and the event or emotion sustaining it. The GM may also reveal one method that could placate, avoid or weaken it.",
      success: "You identify the general nature of the haunt and its likely trigger.",
      partial: "You determine that the location contains a repeating supernatural phenomenon but not what activates it.",
      failure: "You learn nothing useful.",
      fumble: "You draw a dangerously incorrect conclusion about the haunt's trigger."
    }),
    description: "Study repeated manifestations, emotional residue and supernatural patterns to understand what drives a haunt. Make an Occultism check against the haunt's Level DC. This does not automatically disable or Counteract a haunt (Pillars of Faith, Chapter 4)."
  },

  /* ---------------------------------------------------------------- */
  /* RELIGION                                                           */
  /* ---------------------------------------------------------------- */
  {
    key: "recogniseDoctrine",
    name: "Recognise Doctrine",
    skills: ["religion"],
    traits: "Concentrate, Secret",
    apCost: "1 minute",
    requirements: "Rank 1.",
    trained: true,
    checkType: "skill",
    against: "none",
    outcomes: ladder({
      critical: "You identify the religion or Divine Aspect involved, the relevant doctrine and whether the practice is orthodox, unusual, archaic or heretical within that tradition.",
      success: "You identify the religion or Divine Aspect and the general significance of the practice.",
      partial: "You identify the broad religious tradition but not the specific doctrine.",
      failure: "You cannot identify it.",
      fumble: "You incorrectly associate it with another plausible doctrine or tradition."
    }),
    description: "Examine a prayer, symbol, sermon, rite or religious practice and attempt to identify the doctrine behind it. Particularly useful for distinguishing actual religious practice from something merely designed to resemble it (Pillars of Faith, Chapter 4)."
  },
  {
    key: "performLastRites",
    name: "Perform Last Rites",
    skills: ["religion"],
    traits: "Concentrate, Manipulate",
    apCost: "10 minutes",
    requirements: "Rank 1. Target: one corpse.",
    trained: true,
    checkType: "skill",
    against: "levelDC",
    outcomes: ladder({
      critical: "The rites are performed flawlessly. For the next 7 days, magical attempts to possess the corpse, animate it as an Undead creature or otherwise bind its soul to the remains increase their Casting DC or relevant check DC by 2.",
      success: "As Critical, but the protection lasts 24 hours.",
      partial: "The rites are spiritually and culturally appropriate but provide no mechanical protection.",
      failure: "The rites are incomplete and provide no effect.",
      fumble: "The rite is performed incorrectly. You cannot attempt Last Rites on the corpse again until the error has been identified with a successful Religion check."
    }),
    // GUIDE THE LAST ROAD (Chapter 5; TRG Prime 3.625.0's action variants):
    // "You may Perform Last Rites in 1 minute rather than 10 minutes. When
    // you do so … Critical 1 month, Success 7 days, Partial 24 hours."
    variants: [{
      feat: "Guide the Last Road",
      apCost: "1 minute",
      note: "performed in 1 minute, with the longer protections",
      outcomes: {
        critical: "The rites are performed flawlessly. For the next 1 month, magical attempts to possess the corpse, animate it as an Undead creature or otherwise bind its soul to the remains increase their Casting DC or relevant check DC by 2.",
        success: "As Critical, but the protection lasts 7 days.",
        partial: "The rites are spiritually and culturally appropriate; the protection lasts 24 hours."
      }
    }],
    description: "Perform appropriate funerary prayers, symbols and preparations intended to mark the deceased as properly committed to death. Make a Religion check against the deceased creature's Level DC — target the corpse's token, or the dialog asks. Last Rites does not prevent resurrection or the voluntary return of the deceased's soul (Pillars of Faith, Chapter 4)."
  },
  {
    key: "identifySpiritualAffliction",
    name: "Identify Spiritual Affliction",
    skills: ["religion"],
    traits: "Concentrate, Secret",
    apCost: "1 minute",
    requirements: "Rank 2. Target: one creature you can observe or examine.",
    trained: true,
    minRank: 2,
    checkType: "skill",
    against: "levelDC",
    outcomes: ladder({
      critical: "You identify whether the target is affected by possession, Soul Drain, a Curse with divine origins, an effect with the Soul trait or another directly spiritual affliction and determine its approximate severity.",
      success: "You determine whether a spiritual affliction is present and its broad category.",
      partial: "You recognise that something is spiritually wrong but cannot determine its nature.",
      failure: "You discover nothing.",
      fumble: "You incorrectly diagnose the nature of the affliction."
    }),
    description: "Determine whether the target displays signs associated with supernatural harm to the soul or religious corruption. Make a Religion check against the Level DC of the effect responsible. This identifies an affliction; it does not Counteract or remove it (Pillars of Faith, Chapter 4)."
  },

  /* ---------------------------------------------------------------- */
  /* SENSE MOTIVE                                                       */
  /* ---------------------------------------------------------------- */
  {
    key: "senseOutsideInfluence",
    name: "Sense Outside Influence",
    skills: ["senseMotive"],
    traits: "Concentrate, Secret",
    apCost: "1",
    requirements: "Rank 2. Target: one creature you can see or hear.",
    trained: true,
    minRank: 2,
    checkType: "skill",
    against: "levelDC",
    outcomes: ladder({
      critical: "You recognise that an outside Mental, Compulsion or possession effect is influencing the creature and can distinguish whether the creature is resisting or acting willingly.",
      success: "You recognise that the creature's behaviour is being influenced by an outside effect.",
      partial: "Something about the creature's behaviour feels unnatural, but you cannot determine why.",
      failure: "You notice nothing unusual.",
      fumble: "You incorrectly attribute the creature's behaviour to outside influence."
    }),
    description: "Watch for inconsistencies suggesting that a creature's actions are being influenced by something beyond its ordinary intentions. Make a Sense Motive check against the Level DC of the controlling effect. This does not identify the source or exact effect; use a knowledge skill or Identify Spiritual Affliction to investigate further (Pillars of Faith, Chapter 4)."
  },

  /* ---------------------------------------------------------------- */
  /* Chapter 3 — the Folkwarden's two rolled Folk Rites (0.3.0).        */
  /*                                                                    */
  /* Class abilities rather than skill actions in the book, but each IS */
  /* a check with a printed ladder, and the table offers them only to a */
  /* character carrying the ability (`requiresFeat` reads abilities as  */
  /* well as feats from TRG Prime 3.563.0).                             */
  /* ---------------------------------------------------------------- */
  {
    key: "readTheSigns",
    name: "Read the Signs",
    skills: ["nature", "survival"],
    traits: "Concentrate, Investigation",
    apCost: "10 minutes",
    requirements: "Folkwarden (Folk Rites).",
    requiresFeat: "Read the Signs",
    checkType: "skill",
    against: "none",
    outcomes: {
      heroic: "You may ask four questions.",
      critical: "You may ask three questions.",
      success: "You may ask two questions.",
      partial: "You may ask one question.",
      failure: "You cannot draw a reliable conclusion.",
      fumble: "You misunderstand the signs. The GM may provide one plausible but incorrect conclusion.",
      blunder: ""
    },
    // WAYWARDEN (Chapter 5): "whenever you achieve at least a Success …
    // one question concerning direction, a safe route, shelter, fresh
    // water or an immediate natural hazard does not count against the
    // normal number of questions you may ask."
    variants: [{
      feat: "Waywarden",
      note: "one question about direction, a safe route, shelter, fresh water or an immediate natural hazard is free on a Success or better",
      outcomes: {
        heroic: "You may ask four questions — and one about direction, a safe route, shelter, fresh water or an immediate hazard does not count (Waywarden).",
        critical: "You may ask three questions — and one about direction, a safe route, shelter, fresh water or an immediate hazard does not count (Waywarden).",
        success: "You may ask two questions — and one about direction, a safe route, shelter, fresh water or an immediate hazard does not count (Waywarden)."
      }
    }],
    description: "Study the subtle signs within your surroundings: tracks, disturbed vegetation, insect behaviour, birdsong, weather, smoke, water, fungal growth, animal remains, unusual silence. Make a Nature or Survival check against a DC the GM sets — normally the Area Level DC, modified by the age and obscurity of the signs. Questions: what significant creature or group passed through recently, its general direction, the greatest immediate natural hazard, whether the environment is behaving unnaturally, whether a supernatural disturbance has affected the area, where the nearest shelter, water or other natural resource lies. It cannot reveal what left no trace. An Omen Reader adds one question on a Success or better (Pillars of Faith, Chapter 3)."
  },
  {
    key: "layToRest",
    name: "Lay to Rest",
    skills: ["medicine", "nature", "religion"],
    traits: "Concentrate, Manipulate, Soul, Verdant, Warding",
    apCost: "10 minutes",
    requirements: "Folkwarden (Folk Rites). Target: one corpse or collection of substantially complete remains.",
    requiresFeat: "Lay to Rest",
    checkType: "skill",
    against: "levelDC",
    outcomes: {
      heroic: "The remains are protected for 1 year (a Gravetender: until desecrated, destroyed or the rite is Counteracted).",
      critical: "The remains are protected for 1 month (a Gravetender: 1 year).",
      success: "The remains are protected for 1 week (a Gravetender: 1 month).",
      partial: "The remains are protected for 24 hours (a Gravetender: 1 week).",
      failure: "The rite provides no protection.",
      fumble: "Something has been incorrectly prepared. You cannot attempt Lay to Rest upon those remains again until your next daily preparation.",
      blunder: ""
    },
    description: "Prepare the dead according to traditional funerary practice. Make a Medicine, Nature or Religion check against the deceased creature's Level DC — target the corpse's token, or the dialog asks. While protected, an effect attempting to animate the remains as Undead, possess them or bind another soul into them must first Counteract your Lay to Rest (use your Folkwarden level). It does not prevent decomposition, communication with the dead, resurrection, or affect an Undead already made from the remains (Pillars of Faith, Chapter 3)."
  },
  /* ---------------------------------------------------------------- */
  /* SENSE MOTIVE — Chapter 5, opened by the Read the Room class feat     */
  /* ---------------------------------------------------------------- */
  {
    key: "readTheRoom",
    name: "Read the Room",
    skills: ["senseMotive"],
    traits: "Concentrate, Secret",
    apCost: "1 minute",
    requirements: "Read the Room (Expert) class feat. Observe a group interacting for at least 1 minute.",
    requiresFeat: "Read the Room (Expert)",
    checkType: "skill",
    against: "none",
    outcomes: ladder({
      critical: "You identify the dominant social relationship within the group and recognise one creature who is concealing significant hostility, fear or divided loyalty, if one exists.",
      success: "You determine the general emotional state of the group and who appears to possess the greatest influence.",
      partial: "You determine the general mood.",
      failure: "You learn nothing reliable.",
      fumble: "You draw an incorrect conclusion."
    }),
    description: "After observing a group of creatures interacting for at least 1 minute, make a Sense Motive check against a DC determined by the GM. Read the Room does not reveal thoughts or automatically detect lies (Pillars of Faith, Chapter 5)."
  }
];
