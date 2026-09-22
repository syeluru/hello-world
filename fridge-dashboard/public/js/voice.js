// "Hello assistant" voice control, built on the browser's Web Speech API.
//
// The recognizer runs continuously. While idle it only looks for the wake
// phrase; once it hears it, the overlay opens and the next thing said is
// treated as a command. A command in the same breath also works:
// "Hello assistant, add milk to the grocery list".
//
// Speech recognition needs a secure context: open the dashboard at
// http://localhost (the server running on the tablet) or over HTTPS.

import { parseCommand, findWakePhrase, extractDateTime } from './parser.js';

const COMMAND_TIMEOUT = 8000;
const LIST_NAMES = { groceries: 'the grocery list', todos: 'your to-dos', events: 'the calendar' };

let deps;
let rec = null;
let mode = 'wake';        // 'wake' | 'command'
let pendingEvent = null;  // an event title waiting for "what day is that?"
let commandTimer = null;
let running = false;
let blocked = false;

const $ = (id) => document.getElementById(id);
const pill = $('voice-pill');
const hint = $('voice-hint');
const overlay = $('voice-overlay');
const statusEl = $('voice-status');
const transcriptEl = $('voice-transcript');

function setPill(state, text) {
  pill.dataset.state = state;
  hint.textContent = text;
}

export function startVoice(dependencies) {
  deps = dependencies;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    setPill('off', 'Voice needs Chrome or Edge');
    pill.disabled = true;
    return;
  }
  if (!window.isSecureContext) {
    setPill('off', 'Voice needs localhost or HTTPS');
    pill.disabled = true;
    return;
  }

  rec = new SR();
  rec.continuous = true;
  rec.interimResults = true;
  rec.lang = navigator.language || 'en-US';
  rec.maxAlternatives = 1;

  rec.onresult = onResult;
  rec.onerror = (e) => {
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
      blocked = true;
      setPill('error', 'Tap to allow the microphone');
    } else if (e.error === 'audio-capture') {
      setPill('error', 'No microphone found');
    }
    // 'no-speech', 'aborted', 'network' → just let onend restart us.
  };
  rec.onend = () => {
    running = false;
    if (!blocked) setTimeout(listen, 400);
  };

  pill.addEventListener('click', () => {
    blocked = false;
    listen();
    enterCommandMode();
  });
  $('voice-cancel').addEventListener('click', () => exitCommandMode());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) exitCommandMode(); });

  listen();
}

function listen() {
  if (running) return;
  try {
    rec.start();
    running = true;
    if (mode === 'wake') setPill('idle', 'Say “Hello assistant”');
  } catch {
    // Some browsers refuse to start without a tap first.
    setPill('error', 'Tap to turn on voice');
  }
}

function onResult(event) {
  for (let i = event.resultIndex; i < event.results.length; i++) {
    const result = event.results[i];
    const text = result[0].transcript.trim();
    if (!text) continue;

    if (mode === 'wake') {
      const wake = findWakePhrase(text);
      if (!wake) continue;
      enterCommandMode();
      transcriptEl.textContent = wake.rest;
      if (result.isFinal && wake.rest) handleCommand(wake.rest);
    } else {
      // In command mode, drop any wake phrase that's still in this utterance.
      const spoken = findWakePhrase(text)?.rest ?? text;
      transcriptEl.textContent = spoken;
      deps.wakeScreen();
      resetCommandTimer();
      if (result.isFinal && spoken) handleCommand(spoken);
    }
  }
}

function enterCommandMode() {
  deps.wakeScreen();
  mode = 'command';
  overlay.hidden = false;
  overlay.dataset.state = 'listening';
  statusEl.textContent = pendingEvent ? 'What day is that?' : 'Listening…';
  transcriptEl.textContent = '';
  setPill('idle', 'Listening…');
  chime();
  resetCommandTimer();
}

function exitCommandMode() {
  mode = 'wake';
  pendingEvent = null;
  clearTimeout(commandTimer);
  overlay.hidden = true;
  setPill('idle', 'Say “Hello assistant”');
}

function resetCommandTimer() {
  clearTimeout(commandTimer);
  commandTimer = setTimeout(exitCommandMode, COMMAND_TIMEOUT);
}

async function handleCommand(text) {
  clearTimeout(commandTimer);
  overlay.dataset.state = 'working';
  let reply;
  let keepListening = false;

  try {
    if (pendingEvent) {
      const { date, time } = extractDateTime(text);
      if (date) {
        await deps.api.add('events', { title: pendingEvent, date, time });
        reply = `Added ${pendingEvent} to the calendar, ${describeWhen(date, time)}.`;
        pendingEvent = null;
      } else {
        reply = "Sorry, I didn't catch the day. Try something like “Friday at 3”.";
        keepListening = true;
      }
    } else {
      ({ reply, keepListening } = await run(parseCommand(text)));
    }
  } catch (err) {
    reply = `Something went wrong: ${err.message}`;
  }

  statusEl.textContent = reply;
  deps.toast(reply);
  speak(reply);

  if (keepListening) {
    setTimeout(() => {
      transcriptEl.textContent = '';
      overlay.dataset.state = 'listening';
      statusEl.textContent = pendingEvent ? 'What day is that?' : 'Listening…';
      resetCommandTimer();
    }, 400);
  } else {
    setTimeout(exitCommandMode, 1600);
  }
}

async function run(cmd) {
  const state = deps.getState();

  if (cmd.action === 'add' && cmd.list === 'groceries') {
    await deps.api.add('groceries', cmd.items.map((title) => ({ title })));
    return { reply: `Added ${joinWords(cmd.items)} to the grocery list.` };
  }

  if (cmd.action === 'add' && cmd.list === 'todos') {
    await deps.api.add('todos', { title: cmd.title, due: cmd.due || null });
    return { reply: `Added “${cmd.title}” to your to-dos${cmd.due ? `, due ${deps.dayPhrase(cmd.due)}` : ''}.` };
  }

  if (cmd.action === 'add' && cmd.list === 'events') {
    if (!cmd.date) {
      pendingEvent = cmd.title;
      return { reply: `${cmd.title} — what day is that?`, keepListening: true };
    }
    await deps.api.add('events', { title: cmd.title, date: cmd.date, time: cmd.time });
    return { reply: `Added ${cmd.title} to the calendar, ${describeWhen(cmd.date, cmd.time)}.` };
  }

  if (cmd.action === 'remove') {
    const found = [];
    const missing = [];
    for (const word of cmd.items) {
      const needle = word.toLowerCase();
      const item = state[cmd.list].find((i) => !i.done && i.title.toLowerCase() === needle)
        || state[cmd.list].find((i) => !i.done && i.title.toLowerCase().includes(needle));
      if (!item) { missing.push(word); continue; }
      found.push(item.title);
      if (cmd.list === 'events') await deps.api.remove('events', item.id);
      else await deps.api.update(cmd.list, item.id, { done: true });
    }
    if (!found.length) return { reply: `I couldn't find ${joinWords(missing)} on ${LIST_NAMES[cmd.list]}.` };
    return { reply: `Crossed off ${joinWords(found)}.` };
  }

  if (cmd.action === 'read') {
    if (cmd.list === 'events') {
      const upcoming = [...state.events]
        .sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')))
        .slice(0, 4);
      if (!upcoming.length) return { reply: 'Nothing on the calendar.' };
      return { reply: upcoming.map((e) => `${e.title} ${describeWhen(e.date, e.time)}`).join('; ') + '.' };
    }
    const open = state[cmd.list].filter((i) => !i.done).map((i) => i.title);
    if (!open.length) return { reply: `${cmd.list === 'groceries' ? 'The grocery list' : 'Your to-do list'} is empty.` };
    return { reply: `${open.length} on ${LIST_NAMES[cmd.list]}: ${joinWords(open.slice(0, 8))}${open.length > 8 ? ', and more' : ''}.` };
  }

  return { reply: "Sorry, I didn't get that. Try “add milk to the grocery list”.", keepListening: true };
}

function describeWhen(date, time) {
  const day = deps.dayPhrase(date);
  const dayText = ['today', 'tomorrow'].includes(day) ? day : `on ${day}`;
  return time ? `${dayText} at ${deps.formatTime(time)}` : dayText;
}

function joinWords(words) {
  if (words.length <= 1) return words.join('');
  return `${words.slice(0, -1).join(', ')} and ${words.at(-1)}`;
}

// ---------- feedback ----------

function speak(text) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/[“”]/g, ''));
  u.rate = 1.05;
  u.volume = 0.9;
  speechSynthesis.speak(u);
}

let audioCtx;
function chime() {
  try {
    audioCtx ??= new AudioContext();
    const t = audioCtx.currentTime;
    for (const [freq, start] of [[660, 0], [880, 0.12]]) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, t + start);
      gain.gain.linearRampToValueAtTime(0.12, t + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + start + 0.35);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(t + start);
      osc.stop(t + start + 0.4);
    }
  } catch { /* audio not available */ }
}
