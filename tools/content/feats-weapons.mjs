/**
 * Chapter 5 — the natural attacks feats hand over, in the shape the
 * system's companions pack keeps natural attacks (a weapon with
 * `natural: true`, Brawling group, Unarmed category, sized medium).
 * Hunter's Fangs grants Fangs outright; Grafted Armament's Use chooses
 * one of four; Predator's Manifestation's Use chooses a damage type.
 */
import { stableId, html, SYSTEM_ID } from "./builders.mjs";

const STATS = { coreVersion: "14", systemId: SYSTEM_ID, systemVersion: "3.571.0", createdTime: 1789000000000, modifiedTime: 1789000000000, lastModifiedBy: null, compendiumSource: null, duplicateSource: null };

export function naturalAttack({ name, damage, damageType, traits, description, magical = false, img = "systems/trg-prime/assets/weapons/claw.png" }) {
  return {
    _id: stableId(`companions:${name}`),
    name, img, type: "weapon",
    system: {
      quantity: 1, weight: 0, price: 0, equipped: true, invested: false, hp: { value: 0, max: 0 },
      traits: magical ? [traits, "Magical"].filter(Boolean).join(", ") : traits,
      description: html(description),
      attackBonus: 0, damage, damageType, baseDamage: 0, hands: 0, range: "", armourRending: 0, proficiency: "",
      fumbleDC: 5, attackMode: "melee", rangeIncrement: 0, group: "Brawling", category: "Unarmed", size: "medium",
      itemLevel: 0, quality: "standard", material: "", superiorTraits: "", loaded: true, reloadProgress: 0,
      usedQuickLoadThisRound: false, spinBonus: 0, attackedThisTurn: false, natural: true
    },
    effects: [], folder: null, sort: 0, ownership: { default: 0 }, flags: { [SYSTEM_ID]: {} }, _stats: { ...STATS }
  };
}

export const FEAT_WEAPONS = [
  naturalAttack({ name: "Fangs (Vesperyn)", damage: "1d6", damageType: "piercing", traits: "Agile, Finesse", description: "Hunter's Fangs (Pillars of Faith, Chapter 5). Whenever your Fangs inflict a critical injury upon a living creature capable of bleeding, that creature also gains Bleed 1." }),
  naturalAttack({ name: "Bite (Grafted)", damage: "1d8", damageType: "piercing", traits: "Finesse", description: "Grafted Armament (Pillars of Faith, Chapter 5). Part of your natural anatomy; cannot normally be disarmed." }),
  naturalAttack({ name: "Claw (Grafted)", damage: "1d6", damageType: "slashing", traits: "Agile, Finesse, Versatile (P)", description: "Grafted Armament (Pillars of Faith, Chapter 5). Part of your natural anatomy; cannot normally be disarmed." }),
  naturalAttack({ name: "Bone Spur (Grafted)", damage: "1d6", damageType: "piercing", traits: "Deadly", description: "Grafted Armament (Pillars of Faith, Chapter 5). Part of your natural anatomy; cannot normally be disarmed." }),
  naturalAttack({ name: "Heavy Appendage (Grafted)", damage: "1d8", damageType: "bludgeoning", traits: "Shove", description: "Grafted Armament (Pillars of Faith, Chapter 5). Part of your natural anatomy; cannot normally be disarmed." }),
  naturalAttack({ name: "Predator's Manifestation (Slashing)", damage: "1d6", damageType: "slashing", traits: "", magical: true, description: "Predator's Manifestation (Pillars of Faith, Chapter 5). Only while Manifest Spirit (Beast) is active; 1d8 from 11th level — the manifestation card says which." }),
  naturalAttack({ name: "Predator's Manifestation (Piercing)", damage: "1d6", damageType: "piercing", traits: "", magical: true, description: "Predator's Manifestation (Pillars of Faith, Chapter 5). Only while Manifest Spirit (Beast) is active; 1d8 from 11th level." }),
  naturalAttack({ name: "Predator's Manifestation (Bludgeoning)", damage: "1d6", damageType: "bludgeoning", traits: "", magical: true, description: "Predator's Manifestation (Pillars of Faith, Chapter 5). Only while Manifest Spirit (Beast) is active; 1d8 from 11th level." })
];
