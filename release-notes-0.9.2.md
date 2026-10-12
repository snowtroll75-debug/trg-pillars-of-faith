# Pillars of Faith 0.9.2 — two ladders that read a Partial as nothing

7 October 2026. Requires TRG Prime 3.627.1 or later; 3.627.2 is recommended (`release-notes-3.627.2.md`). This comes from the 3.627.1 re-test, recorded in `pillars-of-faith-live-testing-report-0.9.0.md`, addendum. Still 650 documents.

## Ghast Stench and Paralytic Touch

TRG Prime reads a save ladder one degree row at a time. A degree that isn't declared falls back to its neighbour: Partial reads Failure, Heroic reads Critical, Blunder reads Fumble. Partial is not a success.

Two declarations listed `partial: []` among their conditions without any Partial text:

- **Ghast Stench.** The card said "sickened 1" and applied nothing.
- **Paralytic Touch.** A Partial would have printed "Paralysed for 1 round" and paralysed nobody.

The empty rows are gone, so a Partial now does what the Failure does, as the card says. Found live: PoF Test Living's Ghast Stench Partial was "sickened 1 Unaffected."

The Lich Aura's Heroic row now has its own text ("unaffected"). This changes nothing in play.

**Copies already on characters.** These keep the old row. If a character has Ghast Stench or Paralytic Touch, remove the feat and re-add it from the compendium.

## Harness

verify-unliving H5 now checks that every declared ladder in the module takes its card text and its conditions from the same degree row; it failed on the two declarations above. H6 checks that H5 actually sees the ladders. The suite has 519 checks, all green.
