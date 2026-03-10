import { getByDate, remove } from './store.js';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

let current = { year: new Date().getFullYear(), month: new Date().getMonth() };
let popover = null;
let activeCell = null;

function toDateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function todayStr() {
  const d = new Date();
  return toDateStr(d.getFullYear(), d.getMonth(), d.getDate());
}

function dotColor(type) {
  if (type === 'walk') return 'var(--color-walk)';
  if (type === 'run') return 'var(--color-run)';
  return 'var(--color-workout)';
}

function renderDots(entries) {
  const types = [...new Set(entries.map(e => e.type))];
  const shown = types.slice(0, 3);
  const extra = entries.length - shown.length;
  let html = shown.map(t => `<span class="dot dot-${t}" title="${t}"></span>`).join('');
  if (extra > 0) html += `<span class="dot-overflow">+${extra}</span>`;
  return html;
}

function closePopover() {
  if (popover) { popover.classList.remove('visible'); }
  activeCell = null;
}

function showPopover(cell, dateStr, entries) {
  if (!popover) return;

  if (activeCell === cell) { closePopover(); return; }
  activeCell = cell;

  const d = new Date(dateStr + 'T00:00:00');
  const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  let entriesHtml = entries.length === 0
    ? `<p class="popover-empty">No activities</p>`
    : entries.map(e => `
      <div class="popover-entry" data-id="${e.id}">
        <span class="popover-dot" style="background:${dotColor(e.type)}"></span>
        <div class="popover-entry-info">
          <div class="popover-type">${e.type}</div>
          ${e.notes ? `<div class="popover-notes">${e.notes}</div>` : ''}
        </div>
        <button class="popover-delete" data-id="${e.id}" title="Delete">✕</button>
      </div>`).join('');

  popover.innerHTML = `
    <div class="popover-header">
      <span class="popover-date">${label}</span>
      <button class="popover-close">✕</button>
    </div>
    ${entriesHtml}
  `;

  // Position near cell
  const rect = cell.getBoundingClientRect();
  const vw = window.innerWidth, vh = window.innerHeight;
  let top = rect.bottom + 8;
  let left = rect.left;

  popover.style.visibility = 'hidden';
  popover.classList.add('visible');
  const pw = popover.offsetWidth, ph = popover.offsetHeight;
  popover.classList.remove('visible');
  popover.style.visibility = '';

  if (left + pw > vw - 8) left = vw - pw - 8;
  if (top + ph > vh - 8) top = rect.top - ph - 8;
  if (left < 8) left = 8;

  popover.style.top = `${top}px`;
  popover.style.left = `${left}px`;
  popover.classList.add('visible');

  // Wiring
  popover.querySelector('.popover-close').addEventListener('click', closePopover);
  popover.querySelectorAll('.popover-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      remove(btn.dataset.id);
      closePopover();
      renderCalendar();
    });
  });
}

export function renderCalendar() {
  const grid = document.getElementById('calendar-grid');
  const monthLabel = document.getElementById('month-label');
  if (!grid || !monthLabel) return;

  const { year, month } = current;
  monthLabel.textContent = `${MONTHS[month]} ${year}`;

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const today = todayStr();

  // ISO: Mon=1, so offset = (getDay() + 6) % 7
  const startOffset = (firstDay.getDay() + 6) % 7;

  let cells = [];

  // Prev month filler
  const prevLast = new Date(year, month, 0).getDate();
  for (let i = startOffset - 1; i >= 0; i--) {
    const day = prevLast - i;
    const m = month === 0 ? 11 : month - 1;
    const y = month === 0 ? year - 1 : year;
    cells.push({ dateStr: toDateStr(y, m, day), otherMonth: true });
  }

  // Current month
  for (let d = 1; d <= lastDay.getDate(); d++) {
    cells.push({ dateStr: toDateStr(year, month, d), otherMonth: false });
  }

  // Next month filler to complete row
  const remaining = cells.length % 7 === 0 ? 0 : 7 - (cells.length % 7);
  for (let d = 1; d <= remaining; d++) {
    const m = month === 11 ? 0 : month + 1;
    const y = month === 11 ? year + 1 : year;
    cells.push({ dateStr: toDateStr(y, m, d), otherMonth: true });
  }

  grid.innerHTML = cells.map(({ dateStr, otherMonth }) => {
    const entries = otherMonth ? [] : getByDate(dateStr);
    const isToday = dateStr === today;
    const dayNum = parseInt(dateStr.slice(8), 10);
    const classes = [
      'day-cell',
      isToday ? 'today' : '',
      otherMonth ? 'other-month' : '',
      entries.length > 0 ? 'has-entries' : '',
    ].filter(Boolean).join(' ');

    return `
      <div class="${classes}" data-date="${dateStr}">
        <span class="day-num">${dayNum}</span>
        <div class="dots-row">${renderDots(entries)}</div>
      </div>`;
  }).join('');

  // Attach click handlers
  grid.querySelectorAll('.day-cell:not(.other-month)').forEach(cell => {
    cell.addEventListener('click', () => {
      const date = cell.dataset.date;
      const entries = getByDate(date);
      showPopover(cell, date, entries);
    });
  });
}

export function initCalendar() {
  // Create popover element
  popover = document.createElement('div');
  popover.className = 'day-popover';
  document.body.appendChild(popover);

  // Month nav
  document.getElementById('prev-month').addEventListener('click', () => {
    current.month--;
    if (current.month < 0) { current.month = 11; current.year--; }
    closePopover();
    renderCalendar();
  });

  document.getElementById('next-month').addEventListener('click', () => {
    current.month++;
    if (current.month > 11) { current.month = 0; current.year++; }
    closePopover();
    renderCalendar();
  });

  // Close popover on outside click
  document.addEventListener('click', e => {
    if (popover && !popover.contains(e.target) && !e.target.closest('.day-cell')) {
      closePopover();
    }
  });

  renderCalendar();
}
