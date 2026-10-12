/**
 * Chapter 5 — the thirteen General feats not already shipped as
 * background feats in 0.1.0 (those twelve live in foundation.mjs, where
 * the backgrounds that grant them are).
 */
import { bookFeat, saveBonus, offeredBonus, actionBonus } from "./feat-builder.mjs";

export const GENERAL_FEATS = [
  bookFeat("general", "CLOSE READING", { sheet: "Works automatically: a Partial on Analyse Scripture resolves as a Success (the card says so); the accidental-or-deliberate reading on a Critical is a note." }),
  bookFeat("general", "CONVINCING DEVOTION", {
    sheet: "Works automatically: +1 circumstance is offered on Conceal Faith with the book's wording; the observer's lost +2 is a rule for the table.",
    flags: { conditionals: [offeredBonus("Convincing Devotion", 1, "circumstance", { checkTypes: ["skill"], actions: ["concealFaith"] }, "Conceal Faith after a successful Observe Sacred Custom of the faith you impersonate within 24 hours")] }
  }),
  bookFeat("general", "CULTURAL THEOLOGIAN", {
    sheet: "Works automatically: +2 circumstance is offered on Observe Sacred Custom with the book's wording; folding it into Recognise Doctrine's action is a rule for the table.",
    flags: { conditionals: [offeredBonus("Cultural Theologian", 2, "circumstance", { checkTypes: ["skill"], actions: ["observeSacredCustom"] }, "Observe Sacred Custom made as part of a Critical Recognise Doctrine")] }
  }),
  bookFeat("general", "DEATH INVESTIGATOR", {
    sheet: "Works automatically: +1 circumstance is offered on Perception, Medicine and Survival checks with the book's wording; Examine the Dead in 1 minute is a note.",
    flags: { conditionals: [offeredBonus("Death Investigator", 1, "circumstance", { checkTypes: ["skill"], subjects: ["perception", "medicine", "survival"] }, "Investigating the circumstances of a death after a successful Examine the Dead")] }
  }),
  bookFeat("general", "EXPERT AUTOPSIST", { sheet: "Works automatically: a Fumble on Perform Autopsy resolves as a Failure (the card says so); the +4 on a Critical and the 30-minute autopsy are notes." }),
  bookFeat("general", "HAUNTWISE", { sheet: "Use after a successful Interpret Haunt: queues +2 circumstance for your next save or check against that haunt (target an ally first to give it to them on a Critical)." }),
  bookFeat("general", "LAY EXORCIST", {
    sheet: "Works automatically: Religion offers Trace Possession and Interpret Haunt to you; Use after a Success or better on Trace Possession (target the possessed creature) to queue their +1 circumstance to the next save against the possession."
  }),
  bookFeat("general", "METHODICAL INVESTIGATOR", {
    sheet: "Use to choose the action: +2 class is then pre-ticked on it. Take the feat again for another action.",
    repeatable: true, repeatLimit: 6
  }),
  bookFeat("general", "PERFECT PRESERVATION", {
    sheet: "Works automatically: the −2 circumstance for improvised materials is offered on Preserve Remains; read the card's ladder one step longer (Critical 1 year; Success 1 month; Partial 1 week).",
    flags: { conditionals: [offeredBonus("Perfect Preservation", -2, "circumstance", { checkTypes: ["skill"], actions: ["preserveRemains"] }, "Preserve Remains with improvised materials rather than a healer's kit")] }
  }),
  bookFeat("general", "SACRED POLYGLOT", {
    sheet: "Works automatically: +2 circumstance is offered on Linguistics checks with the book's wording; reading a scripture's terminology without a language penalty is a note.",
    flags: { conditionals: [offeredBonus("Sacred Polyglot", 2, "circumstance", { checkTypes: ["skill"], subjects: ["linguistics"] }, "Linguistics involving liturgical languages, ancient religious terminology, sacred names and ritual formulae")] }
  }),
  bookFeat("general", "SOUL ANCHOR", {
    sheet: "Works automatically: +1 circumstance to saves is pre-ticked against Soul-trait and possession effects and offered against Soul Drain; recognising a possession attempt on a Critical is a note.",
    flags: { conditionals: saveBonus("Soul Anchor", 1, "circumstance", ["soul", "possession"], "Saving throws against possession, Soul Drain and effects that forcibly displace or control your soul") }
  }),
  bookFeat("general", "SPIRITUAL FORENSICS", {
    sheet: "Works automatically: +2 circumstance is offered on Trace Possession and Identify Spiritual Affliction with the book's wording; making the second check as part of the examination is a rule for the table.",
    flags: { conditionals: [offeredBonus("Spiritual Forensics", 2, "circumstance", { checkTypes: ["skill"], actions: ["tracePossession", "identifySpiritualAffliction"] }, "A Trace Possession or Identify Spiritual Affliction made as part of an Examine the Dead or Perform Autopsy that was a Critical")] }
  }),
  bookFeat("general", "WATCH THE EYES", { sheet: "Works automatically: a Partial on Sense Outside Influence resolves as a Success (the card says so); Use after a Critical (target the creature) to queue your +2 circumstance for the next Trace Possession or Identify Spiritual Affliction against them." })
];
