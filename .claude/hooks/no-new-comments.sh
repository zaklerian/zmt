#!/usr/bin/env bash
# PreToolUse hook on Edit|Write|MultiEdit (AI-13): block edits that add comment
# lines to .ts/.html/.scss files. Only newly added comment lines count; comment
# lines already present in the replaced text or on-disk file are ignored.
set -uo pipefail

if [ -t 0 ]; then exit 0; fi

exec node -e '
const fs = require("fs");
let raw = "";
process.stdin.on("data", d => (raw += d)).on("end", () => {
  let input;
  try { input = JSON.parse(raw || "{}"); } catch { process.exit(0); }
  const tool = input.tool_name ?? "";
  const ti = input.tool_input ?? {};
  const file = ti.file_path ?? "";
  const ext = (file.match(/\.(ts|mts|cts|html|scss)$/) ?? [])[1];
  if (!ext) process.exit(0);

  const stripStrings = line =>
    line.replace(/"(?:\\.|[^"\\])*"|\x27(?:\\.|[^\x27\\])*\x27|`(?:\\.|[^`\\])*`/g, "\"\"");

  const commentLines = text => {
    const out = [];
    let inBlock = false;
    for (const rawLine of String(text ?? "").split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line) continue;
      if (ext === "html") {
        if (inBlock) { out.push(line); if (line.includes("-->")) inBlock = false; continue; }
        if (line.includes("<!--")) { out.push(line); if (!line.includes("-->")) inBlock = true; }
        continue;
      }
      if (inBlock) { out.push(line); if (line.includes("*/")) inBlock = false; continue; }
      const code = stripStrings(line);
      const lineIdx = code.search(/(^|[^:])\/\//);
      const blockIdx = code.indexOf("/*");
      if (lineIdx !== -1 || blockIdx !== -1) {
        out.push(line);
        if (blockIdx !== -1 && !code.slice(blockIdx + 2).includes("*/")) inBlock = true;
      }
    }
    return out;
  };

  const pairs = [];
  if (tool === "Write") {
    let before = "";
    try { before = fs.readFileSync(file, "utf8"); } catch {}
    pairs.push([before, ti.content]);
  } else if (tool === "MultiEdit") {
    for (const e of ti.edits ?? []) pairs.push([e.old_string, e.new_string]);
  } else {
    pairs.push([ti.old_string, ti.new_string]);
  }

  const added = [];
  for (const [before, after] of pairs) {
    const pool = new Map();
    for (const l of commentLines(before)) pool.set(l, (pool.get(l) ?? 0) + 1);
    for (const l of commentLines(after)) {
      const n = pool.get(l) ?? 0;
      if (n > 0) pool.set(l, n - 1);
      else added.push(l);
    }
  }

  if (added.length) {
    process.stderr.write(
      "no-new-comments: AI-13 blocks adding comment lines to " + file + ":\n" +
      added.map(l => "  " + l).join("\n") +
      "\nRemove the comments and express intent through names and types.\n"
    );
    process.exit(2);
  }
  process.exit(0);
});
'
