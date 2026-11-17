// Inventory every Pillars of Faith compendium entry with its automation evidence.
import fs from "node:fs"; import path from "node:path";
const root = process.argv[2]; const out = process.argv[3];
const M = (f) => import(path.join(root, "module", f));
const reg = await M("registration.mjs");
const { AUTOMATIONS, PASSIVE_HINTS } = await M("automations.mjs");
const { CLASS_AUTOMATIONS, CLASS_PASSIVE_HINTS } = await M("class-automations.mjs");
const { FEAT_AUTOMATIONS, FEAT_PASSIVE_HINTS } = await M("feat-automations.mjs");
const { GRIMOIRE_AUTOMATIONS, GRIMOIRE_PASSIVE_HINTS } = await M("grimoire-automations.mjs");
const { UNLIVING_AUTOMATIONS } = await M("unliving-automations.mjs");
const { SKILL_ACTIONS } = await M("skill-actions.mjs");
const { PERIL_AUTOMATIONS } = await M("haunt-automations.mjs");
// magic items registered through a fake api
const calls = []; const fake = new Proxy({}, { get: (_, n) => (...a) => { calls.push([n, ...a]); return true; } });
reg.registerContent(fake, "trg-pillars-of-faith");
const byName = new Map(); const add = (n, what) => { const k = String(n).trim().toLowerCase(); if (!byName.has(k)) byName.set(k, new Set()); byName.get(k).add(what); };
for (const [n] of Object.entries({ ...AUTOMATIONS, ...CLASS_AUTOMATIONS, ...FEAT_AUTOMATIONS, ...GRIMOIRE_AUTOMATIONS, ...UNLIVING_AUTOMATIONS })) add(n, "use-handler");
for (const [n] of Object.entries({ ...PASSIVE_HINTS, ...CLASS_PASSIVE_HINTS, ...FEAT_PASSIVE_HINTS, ...GRIMOIRE_PASSIVE_HINTS })) add(n, "passive-hint");
for (const [fn, name] of calls) {
  if (["registerItemAutomation","registerRunes","registerSkillSubstitution","registerDegreeUpgrades","registerSpellWarps","registerFeatPickBonus","registerDamageShare","registerPerilAutomation","registerExtraUses","registerFeatEligibility","registerDefenceOffer","registerLightSources","registerCheckReaction","registerDamageReaction","registerCastOption"].includes(fn)) {
    if (typeof name === "string") add(name, fn.replace("register", "reg:"));
    else if (Array.isArray(name)) for (const n of name) add(n?.name ?? n, fn.replace("register", "reg:"));
    else if (name && typeof name === "object") for (const k of Object.keys(name)) add(k, fn.replace("register", "reg:"));
  }
  if (fn === "registerRunes" && calls) {}
}
for (const a of SKILL_ACTIONS ?? []) add(a.label ?? a.name ?? a.key, "skill-action");
// source scan: names mentioned in module code, as a weak signal
const code = fs.readdirSync(path.join(root, "module")).map((f) => fs.readFileSync(path.join(root, "module", f), "utf8")).join("\n").toLowerCase();
const strip = (h) => String(h ?? "").replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ").trim();
const MECH = /\b(\+\d+|−\d+|-\d+-?(?:status|circumstance|class|item)|\d+d\d+|bonus|penalty|resistance|immun|damage|heal|regain|hit points|\bHP\b|save|saving throw|DC|AP\b|reaction|power points|\bPP\b|condition|frightened|sickened|fatigued|slowed|stunned|dazed|weakened|bleeding|dying|speed|vision|sense|counteract|advantage|disadvantage|reroll|temporary)/i;
const rows = [];
const src = path.join(root, "packs-source");
for (const pack of fs.readdirSync(src).sort()) for (const f of fs.readdirSync(path.join(src, pack)).sort()) {
  if (!f.endsWith(".json")) continue;
  const d = JSON.parse(fs.readFileSync(path.join(src, pack, f), "utf8"));
  const s = d.system ?? {}; const fl = d.flags?.["trg-prime"] ?? {};
  const desc = strip(typeof s.description === "object" ? s.description?.value : s.description);
  const ev = [];
  const changes = (d.effects ?? []).flatMap((e) => e.changes ?? []);
  if (changes.length) ev.push(`AE×${changes.length}`);
  if ((d.effects ?? []).some((e) => (e.changes ?? []).length === 0 && e.flags?.["trg-prime"])) ev.push("AE-flags");
  const DECL = ["conditionals","consumable","alchemical","grantInnate","grantedSpecialistSkills","rune","wondrous","chargedItem","auras","haunt","goodsConditionals","magicalStrike","healingRider","grantedSpellUses","light","strikeRiders","defenceDC","creatureAbility","pofAutomation","pofDisease","toolFor","spiritPresence","inflictedFloors","abilityChoices","specialistChoice","specificItem","repertoire","abilityLevels","unlivingGroup"];
  for (const k of DECL) if (fl[k] !== undefined) ev.push(`flag:${k}`);
  for (const k of Object.keys(fl)) if (!DECL.includes(k) && !["bookChapter","bookCategory","source","suggestedEthics","classAbility","magicalNote","bonusFeatsNote","borrowedFrom","featSource"].includes(k)) ev.push(`flag:${k}?`);
  if (d.type === "spell") {
    const kinds = (s.effects ?? []).map((e) => e.kind);
    const real = kinds.filter((k) => k !== "note");
    if (real.length) ev.push(`rows:${real.join("+")}`);
    if (s.damage?.formula) ev.push(`damage:${s.damage.formula} ${s.damage.type}`);
    if (s.category === "save" || s.defence) ev.push(`save:${s.defence || "?"}`);
    if (s.category === "attack") ev.push("attack");
    if ((s.warps ?? []).length) ev.push(`warps:${(s.warps ?? []).filter((w) => Object.keys(w.mods ?? {}).length).length}/${(s.warps ?? []).length}`);
  }
  if (["class","race","heritage","background","divine-aspect"].includes(d.type)) {
    for (const k of ["grantedFeats","grantedAbilities","classAbilities","racialAbilities","grantedSpells","bonusSpells","specialistSpells","grantedSkills","classSkill","favouredWeapon","specialistSkills","grantedSpecialistSkills","removedAbilities","languages","senses"]) if (s[k]) ev.push(`grant:${k}`);
  }
  if (["weapon","armour","shield"].includes(d.type)) ev.push("item-stats");
  if (d.type === "npc") ev.push("actor");
  const names = byName.get(String(d.name).toLowerCase());
  if (names) ev.push(...[...names].map((n) => `code:${n}`));
  const mentioned = !names && code.includes(`"${String(d.name).toLowerCase()}"`);
  if (mentioned) ev.push("code:named");
  const mech = MECH.test(desc);
  rows.push({ pack, id: d._id, name: d.name, type: d.type, category: s.category ?? "", mech, ev, desc, sheet: (desc.match(/(?:Works automatically:|Works through |On the sheet:|A rule for the table|Use (?:as|to|at|after|once|again|this)\b|Use:)[^]*$/) ?? [""])[0] });
}
fs.writeFileSync(out, JSON.stringify(rows, null, 1));
const none = rows.filter((r) => r.mech && !r.ev.length);
console.log("entries", rows.length, "mechanical", rows.filter(r=>r.mech).length, "mechanical with NO evidence", none.length);
for (const r of none) console.log(" -", r.pack, r.type, r.name);
