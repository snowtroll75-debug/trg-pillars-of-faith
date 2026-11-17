import json,re,sys
rows=json.load(open('/home/claude/audit-rows.json'))
plan=json.load(open('/tmp/plan.json'))
LIVE_USE={p[1] for p in plan if p[1] not in ("Carrion Feast","Phylactery of Eternal Resurgence","Sapiren","Velori")}
CLASS_ABIL={"Gift of Healing","Healer's Touch","Restorative Hands","Lifeline","Healer's Calling","Restorative Overflow","Chirurgeon",
 "Archivist's Prayer Book","Scholarly Exegesis","Recite from the Text","Archival Discipline","Deific Aspects","Canonist",
 "Inquisition","Judgement","Reconstruct Target","Prepared Adversary","Deific Aspect (Grimward)","Inquisitorial Discipline","Grim Resolve","Sanctioned Strike","Grave Warden",
 "Folkwarden Specialist Spell","Folk Alchemy","Keeper of the Old Ways","Folk Rites","Warding Charm","Brew Remedy","Ward the Threshold","Read the Signs","Lay to Rest","Folk Tradition","Practical Counsel","Seasoned Hands","Herbal",
 "Shaman Specialist Spell","Spirit Speaker","Spirit Communion","Spirit Guide","Manifest Spirit","Spirit Intercession","Spirit Ward","Deepened Bond","Elemental Spirit",
 "Past-Life Echo","Continuity of Self","Soul Warden","Spirit Sense","Nightvision","Fungal Physiology","Ancestral Communion","Living Testament","Sacred Inscription",
 "Archivist","Folkwarden","Grimward","Healer","Shaman","Rhevani","Eshari","Kethrani","Myrathi","The Veil","Votary","Waywarden","Alchemist","Heighten Spell","Scribe Scroll","Spell Substitution","Alchemical Crafting",
 "Ancestor's Locket","Plate of the Sealed Sepulchre","Pilgrim's Coat","Vesperyn","Bloom Light","Break the Evil Eye","Lantern Glow","Undead Lords"}
CONS_PACKS={"pof-alchemical","pof-consumables"}
FIXED={
 "Rhevani":"F1","Eshari":"F1","Kethrani":"F1","Myrathi":"F1","Sevrai":"F1",
 "Gift of Healing":"F2","Healer's Touch":"F2","Restorative Hands":"F2","Lifeline":"F2","Restorative Overflow":"F2","Lifebound Ward":"F2","Restorative Spores":"F2","Share the Wound":"F2","Grace beyond Need":"F2",
 "Break the Evil Eye":"F3","Sever Influence":"F3","Sever Soulchain":"F3","Expel Possessor":"F4",
 "Plate of the Sealed Sepulchre":"F5","Bloom Light":"F6","Lantern Glow":"F6","Lumeri":"F6","Lumari":"F6","Perfected Aberration":"F7","Vesperyn":"F8","Not Yet Finished":"F9","First Age Theologian":"F10"}
FIXED.update({
 "Elemental Spirit":"F11","Second Discipline":"F12","Sacred Marginalia":"F13","Liturgist":"F14","Liturgy of Prayer":"F14","Liturgical Book":"F14",
 "Lantern of the Veil":"F15","Lantern of the Last Road (Relic)":"F15","Final Toll":"F16","Eternal Resonance":"F17","Cleansing Radiance":"F18"})
# 0.12.4 (TRG Prime 3.696.0, Graham: "build CD1-CD9 and Cd12"): the core seams adopted.
FIXED.update({"Continuity Unbroken":"F19","Vowbound Resolve":"F19","Revelation in Crisis":"F19","Hunter's Fangs":"F20",
 "Break the Evil Eye":"F21","Sever Influence":"F21","Sever Soulchain":"F21",
 "Ossuary Lamellar":"F22","Deep-Rooted Ironcap":"F23","Ossuary Board":"F24","Expert Autopsist":"F25","Redundant Anatomy":"F26",
 "Final Sanction":"F27","Judgement":"F27"})
FIX_VER={**{k:"0.12.1" for k in ("F11","F12","F13","F14","F15","F16")},"F17":"0.12.2","F18":"0.12.2",**{f"F{n}":"0.12.4" for n in range(19,28)}}
FIX_TEXT={"F11":"The Use grants the bonus Verdant cantrip of the chosen element (outside cantrips known); re-Use grants it to characters who chose earlier",
 "F12":"The second discipline's 7th-level Advanced Specialist Spell is withheld at grant time (preCreateItem)",
 "F13":"Use adds the four Divinity spells to the Prayer Book as book spells outside the level ladder, owned by the feat",
 "F14":"Liturgical Book records its spells; the daily selection and Liturgy of Prayer's pick become granted spells, swept at daily preparation / turn end; Liturgy of Prayer limited to recorded spells",
 "F15":"Held + invested lantern sheds registered magical light (actor effect kept in step with the item); the relic's essence Resistance is a worn effect",
 "F17":"Ruling U7: a required casting option on every innate cast: +1 racial to the spell attack and +1 Save DC (registerCastOption)",
 "F18":"Ruling U8: the chosen effect is applied directly (conditions, Disease/Curse afflictions and trait-sourced effects removed; relayed to the GM for another's creature)",
 "F16":"Use lands the Final Toll ladder: no Reactions, −1 status to attacks (target effect), Slowed 1 via the condition relay; Sacred Toll left expended"}
FIX_TEXT.update({
 "F19":"CD1: a registered check reaction asks the reactor (their player, else the GM) when the save (or Vowbound's skill check) fails; yes spends the use and reaction on their client and the core rerolls, with advantage where printed, keeping the better result. Spirit Intercession also asks a 7th-level Shaman ally within 30 feet",
 "F20":"CD2: filtered strike riders — Blood Awakened's +1d6 essence once a round with a Bite or Fangs against a living creature; Hunter's Fangs' Bleed 1 on a critical injury with the Fangs (a critical-only rider)",
 "F21":"CD3: the counteract row always asks (confirm, with 'None of these') where Enchantment could be a welcomed Bless; the '+1 additional effect' warp raises the row's limit (counteractLimitBonus)",
 "F22":"CD4: a worn-only effect declaring drVersus {slashing: 1}, met by the damage pipeline",
 "F23":"CD5: the core's forcedMovementReduction 5, read before a push and named on its card",
 "F24":"CD6: bashTraits ['shove'] — a Shove Attack is made with the board's Shield Bash and the card names it",
 "F25":"CD7: registerDegreeUpgrades bonusValue — Perform Autopsy's Critical +2 is +4",
 "F26":"CD8: a critical reaction asks the injured character once a day and reads the injury one step less severe (severitySteps −1)",
 "F27":"CD12: Judgement's rider reaches a Grimward specialist spell (spells + spellClasses); Final Sanction's −1 status DB lands on a critical against the Subject (onCritical); the half-HP growth already read the HP (3.625.0)"})
FIX_TEXT.update({"F1":"Speed change re-keyed to `system.combat.movement.land.base` (the bare node crashed actor preparation with any `land.other` change)",
 "F2":"Heals/temp HP/condition steps routed through the core heal (Dying rule) and the GM relay (module/relay.mjs)",
 "F3":"Core `counteract` row added (traits curse/possession/fear as printed and safe); success removes the effect",
 "F4":"`counteractRoll` row as Exorcise (Graham's ruling 8 Oct); +4 PP warp pre-fills +2 circumstance",
 "F5":"`worn` effect now suppressed while unequipped (registerEffectSuppressor)",
 "F6":"Registered light source; the token is lit and the illumination ladder counts it",
 "F7":"Fast Healing 1 declared (`fastHealing` flag) instead of a note",
 "F8":"Darkvision granted in place of a duplicate Nightvision (module/vesperyn.mjs)",
 "F9":"Holds at 1 HP through the shared Lifeline step: Dying from the blow is cleared, Fatigued +1",
 "F10":"Intelligence in place of Wisdom offered as a declared row (valueFrom intelligence-wisdom), as Scholarly Exegesis"})
NARR=re.compile(r"A rule for the table|Nothing on the sheet changes|is the character's to play|narrative|the GM answers|Nothing to roll",re.I)
# 0.12.1: broadened after Graham's review ("you have definitely missed things"):
# any sheet line that leaves a step to the table, the GM, a note or the player's
# hand makes the entry C, even when the rest of it is automated.
CMARK=re.compile(r"are notes|is for the table|are for the table|(is|are) the table's|the table's\b|rule for the table|by hand|\(a note\)|is a note|a note on|a note for|— a note|add it to the roll|on their sheet|table decides|the GM's\b|GM to apply|for the GM|GM resolves|resolve it|remove it once|from Spellcraft and end it|apply the lesser result|set on your sheet|from your sheet|yours to note|GM leaves|asks the GM to roll|whoever applies",re.I)
def sheet_sentence(desc):
    m=re.search(r"(Works automatically:.*|Works through .*|Use (?:as|to|at|after|once|again|:|this)[^.]*\..*|On the sheet:.*|A rule for the table.*|Nothing to (?:do|roll).*|Granted for free.*|Offered .*|Pick your .*|The Counteract is rolled.*)$",desc)
    return (m.group(1) if m else "").strip()
def deps(ev):
    d=set()
    for e in ev:
        if e.startswith("AE"): d.add("ActiveEffect pipeline")
        if e=="flag:conditionals" or e=="flag:goodsConditionals": d.add("conditionals.mjs")
        if e.startswith("code:use-handler"): d.add("registerFeatAutomation")
        if e.startswith("code:passive-hint"): d.add("registerPassiveAutomation")
        if e.startswith("rows:") or e.startswith("save:") or e=="attack" or e.startswith("damage:"): d.add("spell-effects rows / cast-workflow")
        if e in ("flag:consumable","flag:alchemical"): d.add("consumable-use-workflow")
        if e in ("flag:rune","flag:specificItem"): d.add("rune-declarations")
        if e.startswith("grant:") or e=="flag:abilityLevels": d.add("grants-workflow")
        if e in ("flag:haunt","flag:spiritPresence","actor"): d.add("peril-workflow")
        if e=="flag:wondrous" or e=="flag:chargedItem": d.add("wondrous/charged-item workflows")
        if e=="flag:auras": d.add("aura-conditionals")
        if e.startswith("code:reg:"): d.add(e[5:].replace("reg:","register"))
        if e=="item-stats": d.add("item data (attack/armour)")
        if e=="flag:abilityChoices": d.add("abilityChoices (feats-workflow)")
    return ", ".join(sorted(d)) or "—"
INFO_SPELLS={"Blackthorn Warning","Call Minor Spirit","Green Witness","Hidden Doctrine","Memory of Stone","Mycelial Message","Oathseal","Read Omen","Red Thread","Spirit Road","Spirit Trace","Final Whisper","Veil Lantern"}
PARTIAL={"Restore Memory":"Counteract against memory-altering effects is rolled from Spellcraft and removed by hand: no TRG trait marks a memory effect, so the core counteract row cannot find one",
 "Anchor the Departing Soul":"The anchor (possession/animation/binding must first Counteract it) is a card instruction: the core has no per-corpse counteract gate",
 "Last Rite":"As Anchor the Departing Soul: the Counteract gate on the corpse is the card's",}
def classify(r):
    desc=r.get('sheet') or r['desc'][-500:]; ev=r['ev']; n=r['name']
    if n in INFO_SPELLS: return "D"
    if n in ("Spirit Guide","Liturgical Book","Crossroads of Faith","Waywarden","Prayer Book"): return "B"
    if n in ("Archive Sealant","Purifying Lye","Bloom Culture","Oath-Wax Seal","Incense of the Open Veil","Reliquary Case","Waterproof Bookcase"): return "D"
    if r['pack']=="pof-haunts": return "B"
    if n in PARTIAL: return "C"
    strong = [e for e in ev if e not in ("code:passive-hint","code:named","flag:unlivingGroup")]
    if NARR.search(desc) and not any(e.startswith(("AE","flag:conditionals","code:use","rows:","code:reg")) for e in ev): return "D"
    if not r['mech'] and not strong and not re.search(r"Works automatically|Works through|\bUse\b", desc): return "D"
    if n in FIXED and CMARK.search(desc): return "C"
    if n in FIXED: return "B" if n in ("Elemental Spirit","Second Discipline","Sacred Marginalia","Liturgist","Liturgy of Prayer","Liturgical Book","Final Toll","Cleansing Radiance","Gift of Healing","Healer's Touch","Restorative Hands","Lifeline","Lifebound Ward","Restorative Spores","Share the Wound","Break the Evil Eye","Sever Influence","Sever Soulchain","Expel Possessor","Bloom Light","Lantern Glow","Blood Awakened","Perfected Aberration","Grace beyond Need","Restorative Overflow","Not Yet Finished","First Age Theologian","Spirit Intercession","Continuity Unbroken","Vowbound Resolve","Revelation in Crisis","Redundant Anatomy","Hunter's Fangs","Judgement") else "A"
    if CMARK.search(desc): return "C"
    if any(e.startswith("code:use-handler") or e=="flag:abilityChoices" for e in ev) or re.search(r"\bUse\b|offered|tick ",desc): return "B"
    if r.get('type') in ("spell",) and all(not e.startswith("rows:") for e in ev) and not any(e.startswith(("damage:","save:","attack")) for e in ev): return "D" if NARR.search(desc) else "C"
    return "A"
def missing(r,cls):
    desc=r.get('sheet') or r['desc'][-500:]
    if r['name'] in PARTIAL: return PARTIAL[r['name']]
    if cls=="C":
        m=CMARK.search(desc)
        if not m: return "No declared row: the spell's effect is printed on its card for the table to apply"
        s=max(0,m.start()-110); return "Manual step: …"+desc[s:m.end()+30].replace("|","/")+"…"
    if cls=="D": return "Narrative / information / table judgement — nothing the engine can execute" 
    return "—"
def verif(r):
    n=r['name']; out=[]
    if n in LIVE_USE: out.append("Live Use sweep (0.12.0)")
    if n in ("Liturgist","Liturgy of Prayer","Liturgical Book","Sacred Marginalia","Lantern of the Veil","Lantern of the Last Road (Relic)","Final Toll","Elemental Spirit","Second Discipline","Cleansing Radiance"): out.append("Live drive of the 0.12.1 code")
    if r['pack'] in CONS_PACKS: out.append("Live consumable sweep")
    if n in CLASS_ABIL: out.append("Live class/feature test")
    out.append("verify suites")
    if n in FIXED: out.append("verify-audit")
    if FIXED.get(n) in ("F19","F20","F21","F22","F23","F24","F25","F26","F27"): out.insert(-1, "core verify-fixes-3696-0")
    return "; ".join(out)
cut=lambda s,k: (s[:k]+"…") if len(s)>k else s
lines=[]; counts={}
for r in rows:
    cls=classify(r); counts[cls]=counts.get(cls,0)+1
    intended=cut(re.split(r"Works automatically:|Works through |On the sheet:|A rule for the table|Use (?:as|to|at|after|once|again|:)",r['desc'])[0].strip(),150)
    auto=sheet_sentence(r['desc']) or ", ".join(r['ev']) or "—"
    fix=FIXED.get(r['name'])
    lines.append("| "+" | ".join(x.replace("|","/").replace("\n"," ") for x in [r['pack'], f"{r['name']} `{r['id']}`", f"{r.get('type') or 'journal'}{' / '+r['category'] if r.get('category') else ''}", intended, cut(auto,170)+(f" [{', '.join(r['ev'])}]" if r['ev'] else ""), (missing(r,cls) if cls=="C" else f"Fixed in {FIX_VER.get(fix,'0.12.0')}") if fix else missing(r,cls), deps(r['ev']), FIX_TEXT[fix] if fix else "none needed", verif(r), ("fixed + tested" if fix else ("tested (live)" if ("Live" in verif(r)) else "verified (static)")), cls])+" |")
json.dump(counts,open('/home/claude/out/class-counts.json','w'))
per={}
for r in rows:
    c=classify(r); d=per.setdefault(r['pack'],{"A":0,"B":0,"C":0,"D":0}); d[c]+=1
st="| Compendium | Entries | A | B | C | D |\n|---|---|---|---|---|---|\n"
tot={"A":0,"B":0,"C":0,"D":0}
for p in sorted(per):
    d=per[p]; st+=f"| {p} | {sum(d.values())} | {d['A']} | {d['B']} | {d['C']} | {d['D']} |\n"
    for k in tot: tot[k]+=d[k]
st+=f"| **Total** | **{sum(tot.values())}** | **{tot['A']}** | **{tot['B']}** | **{tot['C']}** | **{tot['D']}** |\n"
open('/home/claude/out/summary-table.md','w').write(st)
cl=[(r['pack'],r['name'],missing(r,classify(r))) for r in rows if classify(r)=="C"]
json.dump(cl,open('/home/claude/out/c-rows.json','w'),indent=0)
hdr="| Compendium | Document | Category | Intended mechanics | Existing automation | Missing behaviour | Dependencies | Repair | Verification | Status | Class |\n|---|---|---|---|---|---|---|---|---|---|---|\n"
open('/home/claude/out/audit-table.md','w').write(hdr+"\n".join(lines)+"\n")
print(counts, len(lines))
