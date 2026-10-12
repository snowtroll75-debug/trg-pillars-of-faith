/**
 * Chapter 8 — Spirits & Haunts (0.10.0).
 *
 * The nine sample haunts, each an NPC with TRG Prime 3.629.0's Peril
 * section filled from its stat block, and a Spirit Presence template.
 * Graham's design of 8 October 2026 (claude/pillars-of-faith-chapter8-design.md):
 *
 *   Level                 the NPC's level; its Level DC is level + 14
 *   Detection / Disable   the printed lines, as printed — the core reads each
 *                         skill and its DC, "Rank n", and "Three successes"
 *   Disable suppresses    `onDisable: "suppressed"`, for the span the line
 *                         gives ("Success suppresses the haunt for 24
 *                         hours"); no span, until its Reset
 *   Counteract            the core's default: its level, its Level DC
 *   Effect                the printed Effect and its ladder; Trigger rolls
 *                         and applies it
 *   Routine               each action an ability on the NPC with an Action
 *                         line and its own text, rolled and applied on Use
 *   Initiative            the printed bonus, on the NPC's initiative
 *   Anchor, Resolution, Reset   as printed
 *   No body               "A haunt normally has no physical body"
 *   Spirit Sense          "can reveal that a haunt is present and its
 *                         general direction" — every haunt is marked
 *
 * The Hungry Reliquary's Effect and Redistribute Suffering heal one creature
 * and drain another; module/haunt-automations.mjs carries both.
 *
 * Text is the book's, from haunt-text.json (extracted by heading from the
 * Chapter 8 text).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stableId, SYSTEM_ID, SOURCE, html } from "./builders.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const HAUNT_TEXT = JSON.parse(fs.readFileSync(path.join(HERE, "haunt-text.json"), "utf8"));

const STATS = {
  coreVersion: "14", systemId: SYSTEM_ID, systemVersion: "3.629.0",
  createdTime: 1789000000000, modifiedTime: 1789000000000, lastModifiedBy: null,
  compendiumSource: null, duplicateSource: null
};

/** "THE BELL THAT CALLS NO ONE" → "The Bell That Calls No One". */
export function titleCase(caps) {
  const small = new Set(["the", "of", "a", "an", "and", "or", "to"]);
  return String(caps).toLowerCase().split(/\s+/)
    .map((w, i) => (i > 0 && small.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

/** A printed trait line ("AUDITORY COMPLEX HAUNT MENTAL") as the traits field. */
const traitLine = (caps) => caps.split(/\s+/).filter(Boolean).map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(", ");

/**
 * What the book says, beyond its lines, for each haunt: the suppression
 * span its Disable entry prints, a situational bonus it prints, and a
 * registered automation.
 */
export const HAUNT_RULES = Object.freeze({
  "THE UNFINISHED FAREWELL": { suppressFor: "24 hours" },
  "THE EMPTY CHAIR": { bonuses: "+2 circumstance: Speaking a remembered name that belonged to somebody who once lived in the house" },
  // "Success suppresses the haunt until sunrise" — a named time: until Reset, the GM's.
  "THE BELL THAT CALLS NO ONE": { suppressFor: "" },
  "THE DROWNED PROCESSION": { complex: true },
  "THE FALSE CONFESSION": { suppressFor: "1 hour", bonuses: "+2 circumstance: Examined the ledger through appropriate historical or investigative means" },
  "THE OATHBOUND DOOR": {},
  "THE LAST WATCHMAN": {},
  "THE CHOIR BENEATH THE FLOOR": { complex: true },
  "THE HUNGRY RELIQUARY": { complex: true, automation: "hungry reliquary", routineAutomation: { "REDISTRIBUTE SUFFERING": "redistribute suffering" } }
});

const join = (list) => (list ?? []).join("\n");
const first = (list) => String((list ?? [])[0] ?? "");

/** "6; Initiative +30" → { level: 6, initiative: 30 } */
function levelLine(text) {
  const m = /^(\d+)(?:;\s*Initiative\s*\+(\d+))?/.exec(String(text).trim());
  return { level: Number(m?.[1] ?? 1), initiative: Number(m?.[2] ?? 0) };
}

/** A routine action as an NPC ability: its Action line, its text, its effect. */
function routineAbility(hauntKey, hauntId, action, automation = "") {
  const name = titleCase(action.name);
  const id = stableId(`haunts:${hauntKey}:${action.name}`);
  return {
    _id: id,
    name,
    img: "icons/svg/aura.svg",
    type: "ability",
    system: {
      source: SOURCE, category: "Racial", tier: "", level: 0, prerequisites: "", active: true,
      description: html([`<strong>${traitLine(action.traits)}</strong> — Action ${action.ap} AP`, ...action.text].join("\n\n")),
      usesPerDay: "", bonusUses: 0, usesValue: 0, sourceRace: "", sourceClass: "", traits: traitLine(action.traits)
    },
    effects: [],
    folder: null, sort: 0, ownership: { default: 0 },
    flags: {
      [SYSTEM_ID]: {
        // The Use button (creature-activation.mjs) and its cost line.
        creatureAbility: { activation: { ap: action.ap } },
        // Rolled and applied on Use (3.629.0 peril-workflow `usePerilRoutine`).
        perilEffect: join(action.text),
        ...(automation ? { perilAutomation: automation } : {})
      }
    },
    _stats: { ...STATS }
  };
}

/** One haunt as an NPC. */
function hauntActor(key, h) {
  const rules = HAUNT_RULES[key] ?? {};
  const name = titleCase(h.name);
  const id = stableId(`haunts:${key}`);
  const { level, initiative } = levelLine(first(h.fields.Level));
  const f = h.fields;
  const complex = Boolean(rules.complex) || /\bCOMPLEX\b/.test(h.traits) || initiative > 0;
  const routineText = h.routine.length
    ? [`Routine (${h.routineAP ?? 3} AP): ${h.routine.map((a) => `${titleCase(a.name)} (${a.ap} AP)`).join(", ")} — each is an ability on this sheet; Use rolls and applies it.`]
    : [];
  return {
    _id: id,
    name,
    type: "npc",
    img: "icons/svg/aura.svg",
    system: {
      identity: { level, size: "medium" },
      details: {
        traits: traitLine(h.traits),
        biography: html(join(f.Description))
      },
      combat: { initiative: { other: initiative } },
      gm: {
        role: complex ? "Complex haunt" : "Haunt",
        notes: html([`<strong>${name}</strong> — Level ${level} haunt (Pillars of Faith, Chapter 8). Its Level DC is ${level + 14}.`,
          `<strong>Anchor</strong> ${join(f.Anchor)}`, `<strong>Resolution</strong> ${join(f.Resolution)}`].join("\n\n")),
        peril: {
          enabled: true,
          detection: join(f.Detection),
          disable: join(f.Disable),
          successes: 1,
          onDisable: "suppressed",
          suppressFor: rules.suppressFor ?? "",
          state: "armed",
          actionType: complex ? "complex" : "reaction",
          trigger: join(f.Trigger),
          effectText: join(f.Effect),
          routine: routineText.join("\n"),
          anchor: join(f.Anchor),
          resolution: join(f.Resolution),
          reset: join(f.Reset),
          disableBonuses: rules.bonuses ?? "",
          spiritPresence: true,
          noBody: true,
          automation: rules.automation ?? ""
        }
      }
    },
    prototypeToken: {
      name,
      actorLink: false,
      disposition: -1,
      displayName: 20,
      texture: { src: "icons/svg/aura.svg" }
    },
    items: h.routine.map((a) => routineAbility(key, id, a, rules.routineAutomation?.[a.name] ?? "")),
    effects: [],
    folder: null,
    sort: 0,
    ownership: { default: 0 },
    flags: { [SYSTEM_ID]: { haunt: true, source: SOURCE } },
    _stats: { ...STATS }
  };
}

/**
 * THE SPIRIT PRESENCE (Chapter 8): "Not every spirit requires a creature stat
 * block … For such spirits, the GM can use the following format." Graham, 8
 * October: an NPC template, the lines in its GM notes — a token the Level-DC
 * actions (Read Spirit Signs, Trace Possession, Interpret Haunt) can target.
 */
function spiritPresenceTemplate() {
  const name = "Spirit Presence (Template)";
  const lines = [
    ["Level", "X — its Level DC is level + 14. Set the level on the sheet."],
    ["Nature", "The spirit's broad classification (Ancestor, Beast, Elemental, Land, Veil or Emergent)."],
    ["Awareness", "What the spirit understands and how intelligently it can interact."],
    ["Manifestation", "How it becomes perceptible."],
    ["Communication", "How it communicates."],
    ["Anchor", "Any Anchor, if one exists."],
    ["Disposition", "Its initial attitude and general personality (set the Disposition field too)."],
    ["Desire", "What the spirit currently wants."],
    ["Influence", "Any minor supernatural effects it can produce outside a creature stat block."],
    ["Resolution", "Circumstances that cause it to leave, become peaceful or otherwise cease to matter."]
  ];
  return {
    _id: stableId("haunts:spirit-presence-template"),
    name,
    type: "npc",
    img: "icons/svg/mystery-man.svg",
    system: {
      identity: { level: 1, size: "medium" },
      details: { traits: "Spirit", biography: html("A spirit that exists principally as an NPC, a source of information or a supernatural influence. If it enters combat or begins producing effects equivalent to hostile creature abilities, give it an appropriate creature stat block (Pillars of Faith, Chapter 8).") },
      gm: {
        role: "Spirit Presence",
        notes: lines.map(([label, text]) => `<p><strong>${label}</strong> ${text}</p>`).join("\n")
      }
    },
    prototypeToken: { name: "Spirit", actorLink: false, disposition: 0, displayName: 20, texture: { src: "icons/svg/mystery-man.svg" } },
    items: [],
    effects: [],
    folder: null,
    sort: 0,
    ownership: { default: 0 },
    flags: { [SYSTEM_ID]: { spiritPresence: true, source: SOURCE } },
    _stats: { ...STATS }
  };
}

export const HAUNTS = Object.entries(HAUNT_TEXT).map(([key, h]) => hauntActor(key, h));
export const SPIRIT_ACTORS = [spiritPresenceTemplate()];

/* ------------------------------------------------------------------ */
/* The GM's journal: running spirits and haunts                         */
/* ------------------------------------------------------------------ */

const page = (name, sort, content) => ({
  _id: stableId(`journal:spirits-haunts:${name}`),
  name,
  type: "text",
  title: { show: true, level: 1 },
  text: { format: 1, content },
  sort,
  ownership: { default: -1 },
  flags: {},
  _stats: { ...STATS }
});

export const HAUNT_JOURNAL = [{
  _id: stableId("journal:spirits-haunts"),
  name: "Running Spirits & Haunts",
  pages: [
    page("Spirits", 100000, [
      "<p>A spirit is a trait, not a creature type (Pillars of Faith, Chapter 8). A spirit that fights uses a creature stat block — give it the <strong>Spirit</strong> trait.</p>",
      "<p>A spirit that exists principally as an NPC, a source of information or an influence is a <strong>Spirit Presence</strong>. Drag <em>Spirit Presence (Template)</em> from <strong>Pillars of Faith: Haunts & Spirits</strong>, rename it, set its level, and fill in the ten lines in its GM notes. Placed as a token, it can be targeted by Read Spirit Signs, Trace Possession and Interpret Haunt, which roll against its Level DC (level + 14).</p>",
      "<p>Social actions, offerings, attitudes, possession, banishment and destruction use the ordinary rules of whatever ability is involved.</p>"
    ].join("\n")),
    page("Haunts", 200000, [
      "<p>A haunt is a <strong>peril</strong>: an NPC with its <strong>Peril</strong> section on, on the GM tab. The nine sample haunts in <strong>Pillars of Faith: Haunts & Spirits</strong> are filled in from the book; to build your own, type its stat block's lines into the same fields.</p>",
      "<ul>",
      "<li><strong>Detection line</strong> — each skill with its DC, as printed (\"Perception DC 17; Occultism or Religion DC 17, Rank 1\"). <em>Roll Detection</em> makes a secret check for each PC on the scene with the skill that serves them best; a PC whose Spirit Sense reaches the haunt is told of its presence and direction without a roll.</li>",
      "<li><strong>Disable line</strong> — any skill, each with its DC, a specialist Lore by name (\"Spirit Lore\"). Players target the haunt and use <em>Disable a Peril</em> from that skill; a Critical counts two successes, a Heroic three; a Fumble or Blunder triggers it. When the last success lands the haunt is <strong>suppressed</strong> for its span (\"Suppressed for\"), or until its next Reset when none is printed.</li>",
      "<li><strong>Counteract</strong> — Dispel, Still the Haunt and Quarantine Working counteract it at its level and Level DC, and suppress it for the effect's own span.</li>",
      "<li><strong>Trigger</strong> — rolls the Effect: everyone within a printed radius of the haunt's token, or the creatures you have targeted (the triggering creature, those in the room), save against the printed DC or its Level DC; the conditions and damage of their rung are applied. A complex haunt joins the combat and rolls Initiative; on its turn, <em>Use</em> each of its routine actions (abilities on its sheet) with the right creatures targeted.</li>",
      "<li><strong>Suppression</strong> — a suppressed haunt cannot trigger or act. A span in hours or minutes re-arms itself as game time passes; \"until sunrise\", \"at midnight\" and \"until its next Reset\" wait for your <em>Reset</em>.</li>",
      "<li><strong>Resolve</strong> — when the party meets its Resolution, press <em>Resolve</em>: it is ended for good and never resets.</li>",
      "<li><strong>No body</strong> — a haunt cannot be struck; its Anchor, if it has statistics, is a separate object or creature.</li>",
      "</ul>",
      "<p>XP: as a peril of its level, once, on the Party sheet.</p>"
    ].join("\n")),
    page("What stays at the table", 300000, [
      "<p>What the haunts print that is not a condition, a save or damage is on their cards for you to rule on: being unable to approach a bed or cross a threshold, false convictions, compelled confessions, being pushed by the Surging Crowd, being unable to speak, singing with the choir, the Watchman's countersign and his grudge, a forgotten skill or memory, and what destroying an Anchor does.</p>",
      "<p>The Hungry Reliquary's Effect heals the creature you target and drains a random living creature within 60 feet; Redistribute Suffering heals the most injured creature within 60 feet and drains another, who makes a Basic Will save.</p>"
    ].join("\n"))
  ],
  folder: null,
  sort: 0,
  ownership: { default: 0 },
  flags: {},
  _stats: { ...STATS }
}];
