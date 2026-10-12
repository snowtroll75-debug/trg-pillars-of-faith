# Pillars of Faith 0.9.3 — the module names its sourcebook

7 October 2026. For TRG Prime 3.628.0's Sourcebook menu (`release-notes-3.628.0.md`). It still runs on 3.627.1 or later, where the new flag is simply ignored.

`module.json` now carries:

```json
"flags": { "trg-prime": { "sourcebook": "Pillars of Faith" } }
```

This is the line every future sourcebook module adds beside its packs' `extends` flags. TRG Prime 3.628.0 already knows Pillars of Faith by name, so the menu reads "Pillars of Faith" with or without it; the flag makes the module say so itself.

No content changed: still 650 documents across 20 packs. verify-unliving gains G5 (520 checks).
