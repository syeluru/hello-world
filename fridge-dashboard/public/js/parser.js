// Turns a spoken sentence into a dashboard action. Pure functions, no DOM,
// so the same file runs in the browser and in `npm test`.
//
//   parseCommand('add milk and eggs to the grocery list')
//     → { action: 'add', list: 'groceries', items: ['Milk', 'Eggs'] }
//   parseCommand('dentist on friday at 3pm')
//     → { action: 'add', list: 'events', title: 'Dentist', date: '2026-09-25', time: '15:00' }

const WAKE = /\b(?:hello|hey|hi|ok|okay)[,!.]?\s+(?:assistant|assistance|assistants)\b[,!.]?\s*/i;

export function findWakePhrase(text) {
  const m = WAKE.exec(text);
  if (!m) return null;
  return { rest: text.slice(m.index + m[0].length).trim() };
}

const LIST_WORDS = {
  groceries: /\b(?:grocery|groceries|shopping)(?:\s+list)?\b/i,
  todos: /\b(?:to[\s-]?do|todo|2[\s-]?do|task|tasks|chores?)(?:'?s)?(?:\s+list)?\b/i,
  events: /\b(?:calendar|events?|schedule|agenda)\b/i,
};

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july',
  'august', 'september', 'october', 'november', 'december'];
const MONTH_RE = '(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
const NUMBER_WORDS = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
  nine: 9, ten: 10, eleven: 11, twelve: 12, a: 1, an: 1,
};

const pad = (n) => String(n).padStart(2, '0');
export const toDateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const num = (s) => (s in NUMBER_WORDS ? NUMBER_WORDS[s] : parseInt(s, 10));

function tidyText(s) {
  return s
    .replace(/\s+/g, ' ')
    .replace(/^(?:a|an|the|some|to|for|please)\s+/i, '')
    .replace(/[\s,.!?]+$/g, '')
    .replace(/^[\s,.]+/, '')
    .trim();
}

// ---------- dates & times ----------

/**
 * Pull a date and/or time out of free text.
 * Returns { date, time, rest } where `rest` is the text with the date/time words removed.
 */
export function extractDateTime(text, now = new Date()) {
  let rest = ` ${text} `;
  let date = null;
  let time = null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const take = (re, fn) => {
    const m = re.exec(rest);
    if (!m) return false;
    const out = fn(m);
    if (out === false) return false;
    rest = rest.slice(0, m.index) + ' ' + rest.slice(m.index + m[0].length);
    return true;
  };

  // --- time ---
  take(/\s(?:at\s+)?(noon|midday|midnight)\b/i, (m) => {
    time = m[1].toLowerCase() === 'midnight' ? '00:00' : '12:00';
  }) ||
  take(/\s(?:at\s+|@\s*)?(\d{1,2})(?::(\d{2}))?\s*(a\.?\s?m\.?|p\.?\s?m\.?)(?=\s|$|[,.!?])/i, (m) => {
    let h = parseInt(m[1], 10);
    const min = m[2] ? parseInt(m[2], 10) : 0;
    const pm = /p/i.test(m[3]);
    if (h > 12 || min > 59) return false;
    if (pm && h < 12) h += 12;
    if (!pm && h === 12) h = 0;
    time = `${pad(h)}:${pad(min)}`;
  }) ||
  take(/\s(?:at\s+)(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)(?::(\d{2}))?(?:\s*o'?\s?clock)?(\s+in the (?:morning|afternoon|evening)|\s+tonight)?(?=\s|$|[,.!?])/i, (m) => {
    let h = num(m[1].toLowerCase());
    const min = m[2] ? parseInt(m[2], 10) : 0;
    if (Number.isNaN(h) || h > 23 || min > 59) return false;
    const part = (m[3] || '').toLowerCase();
    if (h <= 12) {
      if (/morning/.test(part)) { if (h === 12) h = 0; }
      else if (/afternoon|evening|tonight/.test(part)) { if (h < 12) h += 12; }
      else if (h < 8) h += 12; // "at 3" on a family calendar almost always means 3pm
    }
    time = `${pad(h)}:${pad(min)}`;
  });

  // --- date ---
  take(/\s(?:the\s+)?day after tomorrow\b/i, () => { date = addDays(today, 2); }) ||
  take(/\s(?:today|tonight|this (?:morning|afternoon|evening))\b/i, (m) => {
    date = today;
    if (!time && /tonight|evening/i.test(m[0])) time = null;
  }) ||
  take(/\s(?:tomorrow|tmrw)(?:\s+(?:morning|afternoon|evening|night))?\b/i, () => { date = addDays(today, 1); }) ||
  take(/\sin\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten|a|an)\s+(day|days|week|weeks)\b/i, (m) => {
    const n = num(m[1].toLowerCase());
    date = addDays(today, /week/i.test(m[2]) ? n * 7 : n);
  }) ||
  take(new RegExp(`\\s(?:on\\s+)?(?:(this|next|coming)\\s+)?(${WEEKDAYS.join('|')})s?\\b`, 'i'), (m) => {
    const target = WEEKDAYS.indexOf(m[2].toLowerCase());
    let diff = (target - today.getDay() + 7) % 7;
    const mod = (m[1] || '').toLowerCase();
    if (diff === 0 && mod !== 'this') diff = 7;
    // "next friday" when friday is still in this week means the one after.
    if (mod === 'next' && diff < 7 && target > today.getDay()) diff += 7;
    date = addDays(today, diff);
  }) ||
  take(new RegExp(`\\s(?:on\\s+)?${MONTH_RE}\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b(?:,?\\s+(\\d{4}))?`, 'i'), (m) => {
    date = resolveMonthDay(today, monthIndex(m[1]), parseInt(m[2], 10), m[3]);
    if (!date) return false;
  }) ||
  take(new RegExp(`\\s(?:on\\s+)?(?:the\\s+)?(\\d{1,2})(?:st|nd|rd|th)?\\s+of\\s+${MONTH_RE}\\b`, 'i'), (m) => {
    date = resolveMonthDay(today, monthIndex(m[2]), parseInt(m[1], 10));
    if (!date) return false;
  }) ||
  take(/\s(?:on\s+)?(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/, (m) => {
    const y = m[3] ? (m[3].length === 2 ? 2000 + parseInt(m[3], 10) : m[3]) : undefined;
    date = resolveMonthDay(today, parseInt(m[1], 10) - 1, parseInt(m[2], 10), y);
    if (!date) return false;
  }) ||
  take(/\s(?:on\s+)?the\s+(\d{1,2})(?:st|nd|rd|th)\b/i, (m) => {
    const d = parseInt(m[1], 10);
    let candidate = new Date(today.getFullYear(), today.getMonth(), d);
    if (candidate.getDate() !== d) return false;
    if (candidate < today) candidate = new Date(today.getFullYear(), today.getMonth() + 1, d);
    date = candidate;
  });

  if (time && !date) date = today;
  return { date: date ? toDateStr(date) : null, time, rest: rest.replace(/\s+/g, ' ').trim() };
}

function monthIndex(word) {
  const w = word.toLowerCase().slice(0, 3);
  return MONTHS.findIndex((m) => m.startsWith(w));
}

function resolveMonthDay(today, month, day, year) {
  if (month < 0 || month > 11 || day < 1 || day > 31) return null;
  let d = new Date(year ? Number(year) : today.getFullYear(), month, day);
  if (d.getMonth() !== month) return null;
  if (!year && d < today) d = new Date(today.getFullYear() + 1, month, day);
  return d;
}

// ---------- grocery items ----------

export function splitItems(text) {
  return text
    .split(/\s*(?:,|\band also\b|\band\b|\bplus\b|&)\s*/i)
    .map(tidyText)
    .filter(Boolean)
    .map(capitalize);
}

// ---------- the main entry point ----------

export function parseCommand(input, now = new Date()) {
  const text = input.trim().replace(/[.!?]+$/, '');
  if (!text) return { action: 'unknown', text: input };
  const lower = text.toLowerCase();

  // Read-backs: "what's on the grocery list", "what's coming up", "read my to-dos"
  if (/^(?:what(?:'s| is| do we have)|read|tell me|show|list)\b/i.test(lower)) {
    for (const list of ['groceries', 'todos', 'events']) {
      if (LIST_WORDS[list].test(lower)) return { action: 'read', list };
    }
    if (/coming up|this week|today|tomorrow|plans?/i.test(lower)) return { action: 'read', list: 'events' };
    if (/need|buy/i.test(lower)) return { action: 'read', list: 'groceries' };
  }

  // Removals: "remove milk from the grocery list", "cross off eggs", "delete call mom from my to-dos"
  let m = /^(?:remove|delete|take|cross|scratch|check)\s+(?:off\s+)?(.+?)\s+(?:off\s+)?(?:from|off)\s+(?:the |my |our )?(.+)$/i.exec(text)
    || /^(?:remove|delete|cross off|scratch off|check off|we (?:got|bought))\s+(.+)$/i.exec(text);
  if (m) {
    const target = m[2] ? listFromWords(m[2]) : 'groceries';
    return { action: 'remove', list: target || 'groceries', items: splitItems(m[1]) };
  }

  // Explicit list, wherever it sits in the sentence:
  //   "add X to the grocery list", "add dentist friday at 3 to the calendar",
  //   "add parent conference to the calendar next tuesday", "add to the grocery list apples"
  m = /^(?:please\s+)?(?:add|put|stick|write|include)\s+(.+)$/i.exec(text);
  if (m) {
    const body = ` ${m[1]} `;
    for (const list of ['groceries', 'todos', 'events']) {
      const re = new RegExp(`\\s(?:to|on|onto|in|into)\\s+(?:the |my |our )?${LIST_WORDS[list].source}[:,]?\\s`, 'i');
      const lm = re.exec(body);
      if (lm) return build(list, body.slice(0, lm.index) + ' ' + body.slice(lm.index + lm[0].length), now);
    }
  }

  // Grocery phrasings
  m = /^(?:we(?:'re| are)? (?:need|out of|running low on|low on)|we need(?: to buy| more)?|we'?re out of|buy|get|pick up|grab|need to buy|i need to buy)\s+(?:some\s+|more\s+)?(.+)$/i.exec(text);
  if (m) return build('groceries', m[1], now);

  // To-do phrasings
  m = /^(?:remind (?:me|us) to|i need to|we need to|don'?t forget to|need to|(?:add (?:a )?)?(?:to[\s-]?do|todo|task)[:,]?)\s+(.+)$/i.exec(text);
  if (m) {
    const dt = extractDateTime(m[1], now);
    // "remind me to call mom on friday at 3" → it's got a time, still a to-do, but keep the due date.
    return { action: 'add', list: 'todos', title: capitalize(tidyText(dt.date ? dt.rest : m[1])), ...(dt.date ? { due: dt.date } : {}) };
  }

  // Event phrasings: "schedule a dentist appointment friday at 3", "add event soccer practice tomorrow"
  m = /^(?:schedule|book|add (?:an? )?(?:event|appointment)|new event|create (?:an? )?event|put)\s+(.+)$/i.exec(text);
  if (m) return build('events', m[1], now);

  // Anything with a clear date is probably an event: "dentist on friday at 3pm"
  const dt = extractDateTime(text, now);
  if (dt.date && dt.rest && dt.rest.split(' ').length <= 8) {
    return { action: 'add', list: 'events', title: capitalize(tidyText(stripFiller(dt.rest))), date: dt.date, time: dt.time };
  }

  // "add paper towels" with no list → assume groceries (that's what fridges are for)
  m = /^(?:add|put)\s+(.+)$/i.exec(text);
  if (m) return build('groceries', m[1], now);

  return { action: 'unknown', text: input };
}

function listFromWords(words) {
  for (const list of ['groceries', 'todos', 'events']) if (LIST_WORDS[list].test(words)) return list;
  return null;
}

function stripFiller(s) {
  return s.replace(/\b(?:is|are|we have|there'?s|there is|an? appointment|appointment for)\b\s*$/i, '').trim();
}

function build(list, body, now) {
  if (list === 'groceries') return { action: 'add', list, items: splitItems(body) };
  if (list === 'todos') {
    const dt = extractDateTime(body, now);
    return { action: 'add', list, title: capitalize(tidyText(dt.date ? dt.rest : body)), ...(dt.date ? { due: dt.date } : {}) };
  }
  const dt = extractDateTime(body, now);
  return {
    action: 'add',
    list: 'events',
    title: capitalize(tidyText(stripFiller(dt.rest || body))),
    date: dt.date,
    time: dt.time,
  };
}
