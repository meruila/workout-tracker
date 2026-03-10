const KEY = 'act_entries';

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; }
  catch { return []; }
}

function save(entries) {
  localStorage.setItem(KEY, JSON.stringify(entries));
}

function shortId() {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 8);
}

export function getAll() {
  return load();
}

export function getByDate(dateStr) {
  return load().filter(e => e.date === dateStr);
}

/** ISO week number (Monday = day 1). Returns { year, week } */
export function isoWeek(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  // Copy date so don't modify original
  const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  // ISO week day: Mon=1 … Sun=7
  const dayNum = target.getUTCDay() || 7;
  // Set to nearest Thursday: current date + 4 - current day number
  target.setUTCDate(target.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((target - yearStart) / 86400000) + 1) / 7);
  return { year: target.getUTCFullYear(), week };
}

/** First day (Monday) of a given ISO week */
export function weekStart(year, weekNum) {
  // Jan 4 is always in week 1
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7; // Mon=1
  const weekOneMonday = new Date(jan4);
  weekOneMonday.setUTCDate(jan4.getUTCDate() - (jan4Day - 1));
  const result = new Date(weekOneMonday);
  result.setUTCDate(weekOneMonday.getUTCDate() + (weekNum - 1) * 7);
  return result; // UTC midnight Monday
}

/** YYYY-MM-DD from a Date */
export function toDateStr(d) {
  return d.toISOString().slice(0, 10);
}

export function getByWeek(year, weekNum) {
  const mon = weekStart(year, weekNum);
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setUTCDate(mon.getUTCDate() + i);
    return toDateStr(d);
  });
  return load().filter(e => dates.includes(e.date));
}

export function add(entry) {
  const entries = load();
  const newEntry = {
    id: shortId(),
    createdAt: Date.now(),
    ...entry,
  };
  entries.push(newEntry);
  save(entries);
  return newEntry;
}

export function remove(id) {
  const entries = load().filter(e => e.id !== id);
  save(entries);
}

export function update(id, patch) {
  const entries = load().map(e => e.id === id ? { ...e, ...patch } : e);
  save(entries);
}
