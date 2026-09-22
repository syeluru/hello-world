// Zero-dependency server for the fridge dashboard.
// Serves the web app from ./public and stores lists in ./data/db.json.
// Every change is broadcast over Server-Sent Events so the tablet and any
// phones on the same Wi-Fi stay in sync instantly.

import http from 'node:http';
import fs from 'node:fs/promises';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(ROOT, 'public');
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

const LISTS = ['groceries', 'todos', 'events'];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
};

// ---------- storage ----------

let db = { groceries: [], todos: [], events: [] };

async function loadDb() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  try {
    const parsed = JSON.parse(await fs.readFile(DB_FILE, 'utf8'));
    for (const list of LISTS) db[list] = Array.isArray(parsed[list]) ? parsed[list] : [];
  } catch (err) {
    if (err.code !== 'ENOENT') console.warn('Could not read db, starting fresh:', err.message);
  }
}

// Serialize writes so two quick edits can't interleave and corrupt the file.
let writeChain = Promise.resolve();
function saveDb() {
  writeChain = writeChain.then(async () => {
    const tmp = DB_FILE + '.tmp';
    await fs.writeFile(tmp, JSON.stringify(db, null, 2));
    await fs.rename(tmp, DB_FILE);
  }).catch((err) => console.error('Failed to save db:', err));
  return writeChain;
}

// ---------- validation ----------

const str = (v, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const isTime = (v) => typeof v === 'string' && /^\d{2}:\d{2}$/.test(v);

function sanitize(list, input, existing = {}) {
  const item = { ...existing };
  if ('title' in input) item.title = str(input.title);
  if ('done' in input) item.done = Boolean(input.done);
  if (list === 'groceries' && 'qty' in input) item.qty = str(input.qty, 20);
  if (list === 'todos' && 'due' in input) item.due = isDate(input.due) ? input.due : null;
  if (list === 'events') {
    if ('date' in input && isDate(input.date)) item.date = input.date;
    if ('time' in input) item.time = isTime(input.time) ? input.time : null;
  }
  return item;
}

// ---------- live updates (SSE) ----------

const clients = new Set();
function broadcast() {
  const payload = `data: ${JSON.stringify(db)}\n\n`;
  for (const res of clients) res.write(payload);
}

// ---------- http helpers ----------

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': MIME['.json'], 'Cache-Control': 'no-store' });
  res.end(body === undefined ? '' : JSON.stringify(body));
}

async function readJson(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 64 * 1024) throw Object.assign(new Error('Body too large'), { status: 413 });
  }
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw Object.assign(new Error('Invalid JSON'), { status: 400 });
  }
}

async function serveStatic(req, res, pathname) {
  const rel = pathname === '/' ? 'index.html' : decodeURIComponent(pathname).replace(/^\/+/, '');
  const file = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!file.startsWith(PUBLIC_DIR)) return send(res, 403, { error: 'Forbidden' });
  try {
    const data = await fs.readFile(file);
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  } catch {
    send(res, 404, { error: 'Not found' });
  }
}

// ---------- API ----------

async function handleApi(req, res, url) {
  const parts = url.pathname.split('/').filter(Boolean); // ['api', list?, id?]

  if (parts[1] === 'state' && req.method === 'GET') return send(res, 200, db);

  // Optional weather location, e.g. LAT=40.71 LON=-74.01 npm start
  if (parts[1] === 'config' && req.method === 'GET') {
    return send(res, 200, {
      weather: process.env.LAT && process.env.LON
        ? { lat: Number(process.env.LAT), lon: Number(process.env.LON), units: process.env.UNITS === 'celsius' ? 'celsius' : 'fahrenheit' }
        : null,
      clock24: process.env.CLOCK_24H === '1',
      // Minutes of no touch before the dashboard blacks out the screen (0 = never).
      screenOffMinutes: process.env.SCREEN_OFF_MINUTES === undefined ? 10 : Math.max(0, Number(process.env.SCREEN_OFF_MINUTES) || 0),
    });
  }

  if (parts[1] === 'stream' && req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-store',
      Connection: 'keep-alive',
    });
    res.write(`data: ${JSON.stringify(db)}\n\n`);
    clients.add(res);
    const ping = setInterval(() => res.write(': ping\n\n'), 25000);
    req.on('close', () => {
      clearInterval(ping);
      clients.delete(res);
    });
    return;
  }

  const list = parts[1];
  const id = parts[2];
  if (!LISTS.includes(list)) return send(res, 404, { error: 'Unknown list' });

  // POST /api/:list  → create one item, or several with { items: [...] }
  if (req.method === 'POST' && !id) {
    const body = await readJson(req);
    const inputs = Array.isArray(body.items) ? body.items : [body];
    const created = [];
    for (const input of inputs) {
      const item = sanitize(list, input, { id: crypto.randomUUID(), done: false, createdAt: Date.now() });
      if (!item.title) continue;
      if (list === 'events' && !item.date) continue;
      if (list === 'events') item.time ??= null;
      // Don't add a grocery item that's already on the list and not checked off.
      if (list === 'groceries') {
        const dupe = db.groceries.find((g) => !g.done && g.title.toLowerCase() === item.title.toLowerCase());
        if (dupe) { created.push(dupe); continue; }
      }
      db[list].push(item);
      created.push(item);
    }
    if (!created.length) return send(res, 400, { error: 'Nothing to add' });
    await saveDb();
    broadcast();
    return send(res, 201, created);
  }

  // DELETE /api/:list?done=1  → clear completed items
  if (req.method === 'DELETE' && !id) {
    if (url.searchParams.get('done') !== '1') return send(res, 400, { error: 'Use ?done=1' });
    db[list] = db[list].filter((i) => !i.done);
    await saveDb();
    broadcast();
    return send(res, 204);
  }

  const index = db[list].findIndex((i) => i.id === id);
  if (index === -1) return send(res, 404, { error: 'Not found' });

  if (req.method === 'PATCH') {
    const body = await readJson(req);
    db[list][index] = sanitize(list, body, db[list][index]);
    if (db[list][index].done && !db[list][index].doneAt) db[list][index].doneAt = Date.now();
    if (!db[list][index].done) delete db[list][index].doneAt;
    await saveDb();
    broadcast();
    return send(res, 200, db[list][index]);
  }

  if (req.method === 'DELETE') {
    db[list].splice(index, 1);
    await saveDb();
    broadcast();
    return send(res, 204);
  }

  send(res, 405, { error: 'Method not allowed' });
}

// ---------- housekeeping ----------

// Past events and to-dos finished more than a day ago are dropped automatically,
// so the fridge never fills up with stale stuff.
function tidy() {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const before = JSON.stringify(db);
  db.events = db.events.filter((e) => e.date >= todayStr);
  db.todos = db.todos.filter((t) => !t.done || (t.doneAt ?? 0) > dayAgo);
  if (JSON.stringify(db) !== before) {
    saveDb();
    broadcast();
  }
}

// ---------- boot ----------

await loadDb();
tidy();
setInterval(tidy, 15 * 60 * 1000);

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url);
    if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' });
    return await serveStatic(req, res, url.pathname);
  } catch (err) {
    send(res, err.status || 500, { error: err.message || 'Server error' });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Fridge dashboard running at http://localhost:${PORT}`);
});
