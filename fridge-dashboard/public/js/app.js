import { toDateStr } from './parser.js';
import { startVoice } from './voice.js';

const state = { groceries: [], todos: [], events: [] };
let config = { weather: null, clock24: false, screenOffMinutes: 10 };

const $ = (sel, root = document) => root.querySelector(sel);
const cards = Object.fromEntries(
  [...document.querySelectorAll('.card')].map((el) => [el.dataset.list, el]),
);

// ---------- API ----------

export const api = {
  async add(list, items) {
    const res = await fetch(`/api/${list}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Array.isArray(items) ? { items } : items),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Could not add');
    return res.json();
  },
  async update(list, id, patch) {
    await fetch(`/api/${list}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
  },
  async remove(list, id) {
    await fetch(`/api/${list}/${id}`, { method: 'DELETE' });
  },
  async clearDone(list) {
    await fetch(`/api/${list}?done=1`, { method: 'DELETE' });
  },
};

export const getState = () => state;

function connect() {
  const es = new EventSource('/api/stream');
  es.onmessage = (e) => {
    Object.assign(state, JSON.parse(e.data));
    render();
  };
  // EventSource reconnects on its own; this just covers the server being down for a while.
  es.onerror = () => {
    if (es.readyState === EventSource.CLOSED) setTimeout(connect, 5000);
  };
}

// ---------- rendering ----------

const CHECK_SVG = '<svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  for (const c of [].concat(children)) if (c != null) node.append(c);
  return node;
}

function checkItem(list, item, meta) {
  return el('li', { class: `item${item.done ? ' done' : ''}` }, [
    el('button', {
      class: 'check',
      type: 'button',
      'aria-label': item.done ? `Uncheck ${item.title}` : `Check off ${item.title}`,
      html: CHECK_SVG,
      onclick: () => api.update(list, item.id, { done: !item.done }),
    }),
    el('div', { class: 'item-body' }, [
      el('span', { class: 'item-title' }, item.title),
      meta,
    ]),
    el('button', {
      class: 'remove',
      type: 'button',
      'aria-label': `Remove ${item.title}`,
      onclick: () => api.remove(list, item.id),
    }, '×'),
  ]);
}

function renderGroceries() {
  const card = cards.groceries;
  // Unchecked first (newest at the bottom, like a paper list), checked sink to the end.
  const items = [...state.groceries].sort((a, b) => (a.done - b.done) || (a.createdAt - b.createdAt));
  $('[data-items]', card).replaceChildren(...items.map((i) => checkItem('groceries', i)));
  finishCard(card, items);
}

function renderTodos() {
  const card = cards.todos;
  const today = toDateStr(new Date());
  const items = [...state.todos].sort((a, b) =>
    (a.done - b.done) || ((a.due || '9999') < (b.due || '9999') ? -1 : (a.due || '9999') > (b.due || '9999') ? 1 : 0) || (a.createdAt - b.createdAt));
  $('[data-items]', card).replaceChildren(...items.map((i) => {
    let meta = null;
    if (i.due && !i.done) {
      const overdue = i.due < today;
      meta = el('span', { class: `item-meta${overdue ? ' overdue' : ''}` },
        overdue ? `Overdue · ${relativeDay(i.due)}` : `Due ${dayPhrase(i.due)}`);
    }
    return checkItem('todos', i, meta);
  }));
  finishCard(card, items);
}

function renderEvents() {
  const card = cards.events;
  const today = toDateStr(new Date());
  const events = state.events
    .filter((e) => e.date >= today)
    .sort((a, b) => (a.date + (a.time || '00:00')).localeCompare(b.date + (b.time || '00:00')));

  const groups = new Map();
  for (const e of events) {
    if (!groups.has(e.date)) groups.set(e.date, []);
    groups.get(e.date).push(e);
  }

  $('[data-items]', card).replaceChildren(...[...groups].map(([date, list]) => {
    const rel = relativeDay(date);
    const full = formatDate(date);
    return el('div', { class: 'day-group' }, [
      el('div', { class: 'day-label' }, rel === full
        ? [el('span', {}, full)]
        : [el('span', { class: 'rel' }, rel), el('span', {}, full)]),
      ...list.map((e) => el('div', { class: `item event${date === today ? ' today' : ''}` }, [
        el('span', { class: 'when' }, e.time ? formatTime(e.time) : 'All day'),
        el('div', { class: 'item-body' }, [el('span', { class: 'item-title' }, e.title)]),
        el('button', {
          class: 'remove', type: 'button', 'aria-label': `Remove ${e.title}`,
          onclick: () => api.remove('events', e.id),
        }, '×'),
      ])),
    ]);
  }));
  $('[data-count]', card).textContent = events.length || '';
  $('[data-empty]', card).hidden = events.length > 0;
}

function finishCard(card, items) {
  const open = items.filter((i) => !i.done).length;
  $('[data-count]', card).textContent = open || '';
  $('[data-empty]', card).hidden = items.length > 0;
  const clear = $('[data-clear]', card);
  if (clear) clear.hidden = !items.some((i) => i.done);
}

function render() {
  renderGroceries();
  renderTodos();
  renderEvents();
}

// ---------- date formatting ----------

const parseDate = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };

export function relativeDay(dateStr) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((parseDate(dateStr) - today) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff > 1 && diff < 7) return parseDate(dateStr).toLocaleDateString(undefined, { weekday: 'long' });
  return formatDate(dateStr);
}

// "today" / "tomorrow" / "Friday" / "Oct 3" — for use mid-sentence.
export function dayPhrase(dateStr) {
  const rel = relativeDay(dateStr);
  return ['Today', 'Tomorrow', 'Yesterday'].includes(rel) ? rel.toLowerCase() : rel;
}

export function formatDate(dateStr) {
  return parseDate(dateStr).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export function formatTime(t) {
  const [h, m] = t.split(':').map(Number);
  if (config.clock24) return t;
  const suffix = h < 12 ? 'am' : 'pm';
  const h12 = h % 12 || 12;
  return m ? `${h12}:${String(m).padStart(2, '0')}${suffix}` : `${h12}${suffix}`;
}

// ---------- forms ----------

for (const [list, card] of Object.entries(cards)) {
  const form = $('[data-add]', card);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const title = data.title.trim();
    if (!title) return form.elements.title.focus();
    try {
      if (list === 'events') {
        if (!data.date) { form.classList.add('open'); return form.elements.date.focus(); }
        await api.add('events', { title, date: data.date, time: data.time || null });
        form.reset();
        form.elements.date.value = toDateStr(new Date());
        form.classList.remove('open');
        form.elements.title.blur();
      } else {
        await api.add(list, { title });
        form.reset();
      }
    } catch (err) {
      toast(err.message);
    }
  });
  $('[data-clear]', card)?.addEventListener('click', () => api.clearDone(list));
}

const eventForm = $('[data-add]', cards.events);
eventForm.elements.date.value = toDateStr(new Date());
eventForm.elements.title.addEventListener('focus', () => eventForm.classList.add('open'));
document.addEventListener('pointerdown', (e) => {
  if (!eventForm.contains(e.target)) eventForm.classList.remove('open');
});

// ---------- toast ----------

let toastTimer;
export function toast(message) {
  const t = $('#toast');
  t.textContent = message;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3500);
}

// ---------- clock, greeting, night mode ----------

let lastDay = '';
function tick() {
  const now = new Date();
  const h = now.getHours();
  const m = String(now.getMinutes()).padStart(2, '0');
  $('#time').innerHTML = config.clock24
    ? `${String(h).padStart(2, '0')}:${m}`
    : `${h % 12 || 12}:${m}<span class="ampm">${h < 12 ? 'am' : 'pm'}</span>`;
  $('#greeting').textContent = h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  $('#date').textContent = now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  const night = h >= 21 || h < 6;
  document.documentElement.dataset.theme = night ? 'dark' : 'light';
  document.querySelector('meta[name="theme-color"]').content = night ? '#16140f' : '#f5efe6';

  // Re-render at midnight so "Tomorrow" becomes "Today".
  const day = toDateStr(now);
  if (day !== lastDay) { lastDay = day; render(); }
}

// ---------- weather (Open-Meteo, free, no API key) ----------

const WEATHER = [
  [[0], '☀️', 'Clear'], [[1, 2], '🌤️', 'Partly cloudy'], [[3], '☁️', 'Cloudy'],
  [[45, 48], '🌫️', 'Fog'], [[51, 53, 55, 56, 57], '🌦️', 'Drizzle'],
  [[61, 63, 65, 66, 67, 80, 81, 82], '🌧️', 'Rain'], [[71, 73, 75, 77, 85, 86], '❄️', 'Snow'],
  [[95, 96, 99], '⛈️', 'Storms'],
];

async function updateWeather() {
  if (!config.weather) return;
  const { lat, lon, units } = config.weather;
  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&temperature_unit=${units}&timezone=auto&forecast_days=1`);
    const data = await res.json();
    const code = data.current.weather_code;
    const [, icon, desc] = WEATHER.find(([codes]) => codes.includes(code)) || [null, '🌡️', ''];
    $('#weather-icon').textContent = icon;
    $('#weather-temp').textContent = `${Math.round(data.current.temperature_2m)}°`;
    $('#weather-desc').textContent =
      `${desc} · H ${Math.round(data.daily.temperature_2m_max[0])}° L ${Math.round(data.daily.temperature_2m_min[0])}°`;
    $('#weather').hidden = false;
  } catch {
    // Offline — just leave the last reading up.
  }
}

// ---------- screen on / off ----------
//
// Windows is set to never turn the display off, because on most touch PCs a
// dark display means standby: touch and the microphone stop working. Instead
// the dashboard blacks itself out after a few idle minutes and wakes on a tap
// or on "Hello assistant".

const sleepEl = $('#sleep');
let idleTimer;

export function wakeScreen() {
  sleepEl.hidden = true;
  clearTimeout(idleTimer);
  if (config.screenOffMinutes > 0) {
    idleTimer = setTimeout(() => { sleepEl.hidden = false; }, config.screenOffMinutes * 60000);
  }
}

// The waking tap lands on the black overlay, so it can't press a button underneath.
sleepEl.addEventListener('pointerdown', (e) => { e.preventDefault(); wakeScreen(); });
for (const type of ['pointerdown', 'keydown']) document.addEventListener(type, wakeScreen, { passive: true });

// Hold a screen wake lock so the browser never lets the display turn off.
// With SCREEN_OFF_MINUTES=0 the dashboard leaves screen timing to Windows instead.
async function keepAwake() {
  if (!(config.screenOffMinutes > 0)) return;
  try {
    if ('wakeLock' in navigator && document.visibilityState === 'visible') await navigator.wakeLock.request('screen');
  } catch { /* not supported or not allowed; the Windows power settings are the fallback */ }
}
document.addEventListener('visibilitychange', keepAwake);

// ---------- boot ----------

try { config = await (await fetch('/api/config')).json(); } catch { /* defaults */ }
tick();
setInterval(tick, 1000);
updateWeather();
setInterval(updateWeather, 20 * 60 * 1000);
keepAwake();
wakeScreen();
connect();
startVoice({ api, getState, toast, dayPhrase, formatTime, wakeScreen });
