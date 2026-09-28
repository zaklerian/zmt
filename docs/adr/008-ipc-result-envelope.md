# ADR 008 — IPC Result envelope

Status: Accepted · 2026-09-27

## Context
Electron serialises a value thrown by an `ipcMain.handle` handler into an `Error` whose message is a string, so any structure a handler puts in an error is lost on the wire. Reconstructing it needs a sentinel prefix in the message and a parser in preload, which is fragile, invisible to the type system and easy to bypass. The renderer must branch on failure kinds without parsing text.

## Decision
- Every channel returns a Result envelope: `{ ok: true, data }` or `{ ok: false, error: { code, message } }`. Nothing is thrown across IPC (SEC-4).
- Each channel's request, response and envelope are Valibot schemas in `libs/contracts`, collected in one contract map keyed by channel name; the preload API type is derived from the channel constants and that map (SEC-1).
- Error codes are a closed HTTP-style union (`400, 403, 404, 409, 413, 500`) defined by a contracts schema. Unexpected errors become `500 Internal error` after being logged in main; their message never crosses the boundary.
- Main's typed handler helper validates the sender frame, parses and freezes the request, runs the handler, then validates the envelope against the contract before returning it. Preload validates the envelope again and never re-parses errors.
- Renderer consumers branch on `ok` with exhaustive switches; there are no sentinel strings.

## Consequences
- The renderer gets one uniform failure shape per channel and can map codes to localized messages.
- A schema failure on either side is itself a `400` or `500` envelope, so a malformed payload cannot crash a handler or reach a service.
- Every channel costs a request schema, a response schema and a contract test; adding a channel means adding to the map, which the handler-registration spec checks.
- Envelope validation adds one parse per call on each side; payload limits in the contracts keep it bounded.
