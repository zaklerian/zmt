# ZMT-48 — Localisation (loc-lines) format grounding

Ground-truth of the BICE localisation byte shape, gathered before writing the
loc-lines strategy (ADR 027 decision 2). All evidence is from real files under
`test-mod-bice/localisation/english/`. The strategy is implemented to what BICE
shows, not to the prompt's approximate illustrations (standing acceptance
criterion).

## 1. Line shape

- **Header**: `l_english:` followed by a line terminator — `air_l_english.yml:1`.
- **Key line**: one leading space, then `KEY:VERSION "value"`, exactly one space
  between `KEY:VERSION` and the opening quote — `air_l_english.yml:2`
  (` AIR_STRATEGIC_OUR_TEXT:1 "Our"`).
- **Version is optional**. A key can carry no numeric suffix at all:
  `air_l_english.yml:4` (` SELECT_ROCKET: "Select a rocket"` — colon, no digits,
  space, value). In `air_l_english.yml`: 424 versioned vs 38 versionless keys.
- **Version suffix varies**: observed `0`, `1`, `2`, `4`, and absent.

## 2. Byte-level specifics

- **BOM** `ef bb bf` at offset 0 of every loc file (`od -An -tx1` on
  `air_l_english.yml`); `file` reports "Unicode text, UTF-8 (with BOM)".
- **Line endings vary per file**. Most files are LF-only; `equipment_l_english.yml`
  is **CRLF** (`0d 0a`). A lossless reader/writer cannot assume one EOL.
- **Escapes / special characters inside values** (all observed in real values):
  - `\n` — `air_l_english.yml` `AIRWING_MISSION_EFFICIENCY_TOT` value ends `…§!\n`.
  - Escaped double-quote `\"` — `BI_EAI_l_english.yml:200`, `BI_SS_events_l_english.yml:15`.
  - `§` colour codes — bytes `c2 a7` + a letter, closed by `§!`
    (`§R §H §G §T §Y §g` and `§!` all appear in `air_l_english.yml`).
  - `$VAR|fmt$` variables — `$AMOUNT|H1%$` in `air_l_english.yml`.
  - `£icon£` icon tokens — `£mapicon_unit_invalid_orders£` in `core_l_english.yml`.

## 3. Structure to preserve

- **Comments `#`** appear as full-line comments (`BI_HSD_localisation_l_english.yml:7`
  `#GER`), inline trailing comments after a value
  (`BI_version_l_english.yml:5` `… #either Main Version or Test Version`), and
  **commented-out key lines** (`BI_EAI_l_english.yml:38` `#EAI_…:0 "…"`).
- **Blank lines** occur in two byte-shapes — truly empty (`\n`) and
  space-then-newline (` \n`); both are present in `BI_version_l_english.yml`.
- **Trailing whitespace** after values occurs (`### IMPORTANT ### `,
  `BI_version_l_english.yml:13` `…:0 "…" `).
- **Multiple keys on one physical line** exist — `BI_version_l_english.yml:11`
  (`BICE_STARTUP_DESC:0 "…" BICE_STARTUP_GENERAL_DESC:0 ""`).
- **Key order is significant** and not alphabetically sorted; keys are grouped by
  `#`-comment section headers and blank-line separators.

## 4. Not YAML (reconfirmed)

`python3 -c "import yaml; yaml.safe_load(open('air_l_english.yml',encoding='utf-8-sig').read())"`
raises `yaml.YAMLError: mapping values are not allowed here` — the `KEY:0 "value"`
colon-without-space is invalid YAML mapping syntax. The Clausewitz
(`@paradox-parser`) grammar cannot read it either. loc is its own line-oriented
format, which is why ADR 027 gives it a second, distinct strategy.

## Design consequences

The strategy models a loc file as **ordered physical lines**, each carrying its own
EOL, with the BOM held as a document-level flag. A line that cleanly parses as a
single leading `KEY:VERSION "value"` becomes an indexable key entry
(indent / key / version / value byte-span); every other line — header, comment,
blank, trailing-whitespace, multi-key, or otherwise malformed — is preserved
**verbatim**. Round-trip is exact by construction: `BOM + Σ(raw + eol)`.

- `set` rewrites only the matched key's inner value span; indent, key, version,
  quotes, and any trailing comment on that line are untouched.
- `delete` removes only the matched key's whole line.
- `insert` appends a new key line in the file's own indent and EOL style
  (append is the accepted PoC position; `resolveWriteTarget` is a later ticket).

**Documented PoC limit**: a physical line carrying more than one key is indexed by
its first key only. The air technologies the canvas edits are all clean
single-key lines, so the PoC is unaffected; a future multi-key addressing need is
its own ticket.
