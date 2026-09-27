#!/usr/bin/env bash
# Governance checks for AI-1, PROC-5, PROC-6, PROC-8, PROC-9 and ADR 006.
# Prints one line per violation to stderr and exits 1 when any check fails.
set -uo pipefail

ROOT="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
cd "$ROOT" || exit 1

ID_RE='(ARCH|NG|STATE|TEST|SEC|PROC|AI|I18N)-[0-9]+'
fail=0
err() { echo "governance: $*" >&2; fail=1; }

shopt -s nullglob
rule_files=(.claude/rules/*.md)
rationale_files=(docs/rationale/*.md)

# Rule lines: one per ID, each declaring enforcement; review-only rules carry DEBT.
for f in "${rule_files[@]}"; do
  while IFS= read -r line; do
    id=$(grep -oE "^$ID_RE" <<<"$line")
    grep -q 'Enforced:' <<<"$line" || err "$f: $id has no 'Enforced:' (AI-1)"
    if grep -qE 'Enforced: review' <<<"$line" && ! grep -q 'DEBT:' <<<"$line"; then
      err "$f: $id is review-only without a DEBT note (AI-1)"
    fi
  done < <(grep -hE "^$ID_RE " "$f")
done

rule_ids=$( ((${#rule_files[@]})) && grep -ohE "^$ID_RE" "${rule_files[@]}" | sort)
dupes=$(uniq -d <<<"$rule_ids")
[ -n "$dupes" ] && err "duplicate rule IDs: $(tr '\n' ' ' <<<"$dupes")"

rat_ids=$( ((${#rationale_files[@]})) && grep -ohE "^## $ID_RE" "${rationale_files[@]}" | sed 's/^## //' | sort)
rat_dupes=$(uniq -d <<<"$rat_ids")
[ -n "$rat_dupes" ] && err "duplicate rationale sections: $(tr '\n' ' ' <<<"$rat_dupes")"

missing=$(comm -23 <(sort -u <<<"$rule_ids") <(sort -u <<<"$rat_ids") | sed '/^$/d')
orphan=$(comm -13 <(sort -u <<<"$rule_ids") <(sort -u <<<"$rat_ids") | sed '/^$/d')
[ -n "$missing" ] && err "rules without rationale: $(tr '\n' ' ' <<<"$missing")"
[ -n "$orphan" ] && err "rationale without rule: $(tr '\n' ' ' <<<"$orphan")"

# ADRs: at most 25 lines with Context, Decision, Consequences (PROC-5).
for f in docs/adr/[0-9][0-9][0-9]-*.md; do
  n=$(wc -l <"$f")
  [ "$n" -le 25 ] || err "$f has $n lines (max 25, PROC-5)"
  for s in Context Decision Consequences; do
    grep -q "^## $s" "$f" || err "$f lacks '## $s' (PROC-5)"
  done
done

# Ledger: line format, revisit trigger on deferrals, finding recurrence (PROC-6, PROC-9).
if [ -f docs/ledger.md ]; then
  while IFS= read -r line; do
    grep -qE '^- [0-9]{4}-[0-9]{2}-[0-9]{2} · .+ · (\[ADR [0-9]{3}\]\(adr/[^)]+\)|—)( · .+)?$' <<<"$line" \
      || err "ledger line malformed (PROC-6): $line"
    if grep -qi 'deferred' <<<"$line" && ! grep -q 'revisit: ' <<<"$line"; then
      err "deferred ledger line lacks 'revisit:' (PROC-6): $line"
    fi
  done < <(grep -E '^- ' docs/ledger.md)
  while read -r count slug; do
    [ -z "$slug" ] && continue
    if [ "$count" -ge 3 ] && ! grep -F "finding:$slug" docs/ledger.md | grep -qE "$ID_RE"; then
      err "finding:$slug recorded $count times without a rule ID (PROC-9)"
    fi
  done < <(grep -oE 'finding:[a-z0-9-]+' docs/ledger.md | sed 's/^finding://' | sort | uniq -c)
fi

# Retros: five sections; action items name owner and trigger (PROC-8).
for f in docs/retro/*.md; do
  for s in 'Went Wrong' 'Could Be Better' 'Good' 'Keep Doing' 'Action Items'; do
    grep -qE "^##+ $s" "$f" || err "$f lacks section '$s' (PROC-8)"
  done
  while IFS= read -r item; do
    grep -q 'owner:' <<<"$item" && grep -q 'trigger:' <<<"$item" \
      || err "$f action item lacks owner:/trigger: (PROC-8): $item"
  done < <(awk '/^##+ Action Items/{a=1;next} /^##+ /{a=0} a && /^- /' "$f")
done

exit "$fail"
