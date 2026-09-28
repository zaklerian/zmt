import { spawn } from 'node:child_process';
import { existsSync, watch } from 'node:fs';
import { createRequire } from 'node:module';
import { connect } from 'node:net';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const ELECTRON = require('electron');
const ROOT = resolve(import.meta.dirname, '..', '..');
const MAIN = resolve(ROOT, 'dist/apps/main/main.js');
const PRELOAD = resolve(ROOT, 'dist/apps/preload/main.js');
const RENDERER_URL = new URL(process.env.ZMT_RENDERER_URL ?? 'http://localhost:4200');
const RESTART_DEBOUNCE_MS = 300;

function sleep(ms) {
  return new Promise((done) => setTimeout(done, ms));
}

function portOpen(port, host) {
  return new Promise((done) => {
    const socket = connect({ host, port });
    socket.once('connect', () => {
      socket.destroy();
      done(true);
    });
    socket.once('error', () => done(false));
  });
}

async function waitFor(check, label) {
  process.stdout.write(`electron-dev: waiting for ${label}\n`);
  while (!(await check())) {
    await sleep(500);
  }
}

let child = null;
let restartTimer = null;

function start() {
  child = spawn(ELECTRON, [MAIN], { env: process.env, stdio: 'inherit' });
  child.on('exit', (code, signal) => {
    if (signal === null && code !== null && restartTimer === null) {
      process.exit(code);
    }
  });
}

function restart() {
  if (restartTimer !== null) {
    clearTimeout(restartTimer);
  }
  restartTimer = setTimeout(() => {
    restartTimer = null;
    if (child !== null && child.exitCode === null) {
      child.once('exit', start);
      child.kill();
    } else {
      start();
    }
  }, RESTART_DEBOUNCE_MS);
}

await waitFor(
  () => Promise.resolve(existsSync(MAIN) && existsSync(PRELOAD)),
  'main and preload bundles',
);
await waitFor(
  () => portOpen(Number(RENDERER_URL.port || 80), RENDERER_URL.hostname),
  `renderer dev server at ${RENDERER_URL.href}`,
);
start();
for (const file of [MAIN, PRELOAD]) {
  watch(file, { persistent: true }, restart);
}
process.on('SIGINT', () => {
  child?.kill();
  process.exit(0);
});
process.on('SIGTERM', () => {
  child?.kill();
  process.exit(0);
});
