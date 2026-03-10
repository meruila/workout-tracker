import { getByWeek, isoWeek, weekStart, toDateStr } from './store.js';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

let currentWeek = null; // { year, week }

function dotStyle(type) {
  const colors = { walk: '#a8d5a2', run: '#1b5e20', workout: '#2e7d32' };
  return `background:${colors[type] || '#2e7d32'}`;
}

function formatWeekRange(year, weekNum) {
  const mon = weekStart(year, weekNum);
  const sun = new Date(mon);
  sun.setUTCDate(mon.getUTCDate() + 6);

  const mDay = mon.getUTCDate(), mMon = MONTH_SHORT[mon.getUTCMonth()];
  const sDay = sun.getUTCDate(), sMon = MONTH_SHORT[sun.getUTCMonth()];
  const yr = sun.getUTCFullYear();

  if (mon.getUTCMonth() === sun.getUTCMonth()) {
    return `Week of ${mMon} ${mDay}–${sDay}, ${yr}`;
  }
  return `Week of ${mMon} ${mDay} – ${sMon} ${sDay}, ${yr}`;
}

function getWeekDates(year, weekNum) {
  const mon = weekStart(year, weekNum);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setUTCDate(mon.getUTCDate() + i);
    return toDateStr(d);
  });
}

export function renderWeekly() {
  const entries = getByWeek(currentWeek.year, currentWeek.week);
  const dates = getWeekDates(currentWeek.year, currentWeek.week);

  // Update header
  document.getElementById('week-label').textContent = formatWeekRange(currentWeek.year, currentWeek.week);

  // Stats
  const counts = { walk: 0, run: 0, workout: 0 };
  entries.forEach(e => { if (counts[e.type] !== undefined) counts[e.type]++; });
  document.getElementById('stat-walk').textContent = counts.walk;
  document.getElementById('stat-run').textContent = counts.run;
  document.getElementById('stat-workout').textContent = counts.workout;

  // Day list
  const listEl = document.getElementById('week-day-list');
  listEl.innerHTML = dates.map((dateStr, i) => {
    const dayEntries = entries.filter(e => e.date === dateStr);
    const dayName = DAY_NAMES[i];

    const entriesHtml = dayEntries.length === 0
      ? `<span class="week-day-empty">Rest day</span>`
      : dayEntries.map(e => `
        <div class="week-entry-item">
          <span class="week-entry-dot" style="${dotStyle(e.type)}"></span>
          <span class="week-entry-type">${e.type}</span>
          ${e.notes ? `<span class="week-entry-notes">— ${e.notes}</span>` : ''}
        </div>`).join('');

    return `
      <div class="week-day-row">
        <span class="week-day-name">${dayName}</span>
        <div class="week-day-entries">${entriesHtml}</div>
      </div>`;
  }).join('');
}

export function initWeekly() {
  // Start at current ISO week
  const today = new Date();
  const todayStr = toDateStr(today);
  currentWeek = isoWeek(todayStr);

  document.getElementById('prev-week').addEventListener('click', () => {
    currentWeek.week--;
    if (currentWeek.week < 1) {
      currentWeek.year--;
      // last week of prev year
      const dec28 = `${currentWeek.year}-12-28`;
      currentWeek.week = isoWeek(dec28).week;
    }
    renderWeekly();
  });

  document.getElementById('next-week').addEventListener('click', () => {
    currentWeek.week++;
    // last week of year
    const dec28 = `${currentWeek.year}-12-28`;
    const maxWeek = isoWeek(dec28).week;
    if (currentWeek.week > maxWeek) {
      currentWeek.year++;
      currentWeek.week = 1;
    }
    renderWeekly();
  });

  renderWeekly();
}

export function getCurrentWeek() {
  return currentWeek;
}

export function getWeekDatesExport(year, weekNum) {
  return getWeekDates(year, weekNum);
}

export function formatWeekRangeExport(year, weekNum) {
  return formatWeekRange(year, weekNum);
}
