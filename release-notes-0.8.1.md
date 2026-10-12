# Pillars of Faith 0.8.1 — the 0.8.0 live test's follow-up

7 October 2026. Requires TRG Prime 3.626.1 (`release-notes-3.626.1.md`). Same 565 documents; two declarations corrected after the live test (`pillars-of-faith-live-testing-report-0.8.0.md`).

- **Anchored Soul** (`module/magic-items.mjs`): the +2 item was a single offered row, and a save forced by a spell opens no dialog to offer it in — so the rune did nothing on exactly the save it is for. It is now two rows in the ally auras' own shape: pre-ticked (`auto`) where the save's traits say Soul or possession, offered with those traits excluded otherwise, so a save against an untagged effect still asks the table once and never twice.
- **Printed activations** (`tools/content/magic-items.mjs`): the spell grants that print their own activation carry it as `castAP`, which 3.626.1 hands to the granted spell — Voice of the Dead and Walk the Road (Command, 1 AP), Open the Lantern (Engage, 1 AP), Read Vital Traces (Interact, 2 AP), the Hospice Vestment's two (Command, 2 AP). Final Toll, Seal the Word and the Thread keep the spell's own.
- **Vowkeeper** needed no change here: its class-bonus-to-damage offer is a `checkTypes: ["damage"]` conditional, and 3.626.1 is what makes the damage roll read one. The same release makes Rejuvenating Surge's damage half (0.4.0) apply for the first time.

Harness: verify-magic-items 592 (D13 reads both Anchored Soul rows; D13b the activations); version strings in every suite.
