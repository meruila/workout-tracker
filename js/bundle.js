// ── store.js ──────────────────────────────────────────────
const KEY = 'act_entries';

function _load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; }
  catch { return []; }
}

function _save(entries) {
  localStorage.setItem(KEY, JSON.stringify(entries));
}

function shortId() {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 8);
}

function getAll() { return _load(); }

function getByDate(dateStr) {
  return _load().filter(e => e.date === dateStr);
}

function isoWeek(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((target - yearStart) / 86400000) + 1) / 7);
  return { year: target.getUTCFullYear(), week };
}

function weekStart(year, weekNum) {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const weekOneMonday = new Date(jan4);
  weekOneMonday.setUTCDate(jan4.getUTCDate() - (jan4Day - 1));
  const result = new Date(weekOneMonday);
  result.setUTCDate(weekOneMonday.getUTCDate() + (weekNum - 1) * 7);
  return result;
}

function toDateStr(d) {
  return d.toISOString().slice(0, 10);
}

function getByWeek(year, weekNum) {
  const mon = weekStart(year, weekNum);
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setUTCDate(mon.getUTCDate() + i);
    return toDateStr(d);
  });
  return _load().filter(e => dates.includes(e.date));
}

function storeAdd(entry) {
  const entries = _load();
  const newEntry = { id: shortId(), createdAt: Date.now(), ...entry };
  entries.push(newEntry);
  _save(entries);
  return newEntry;
}

function storeRemove(id) {
  _save(_load().filter(e => e.id !== id));
}

function storeUpdate(id, patch) {
  _save(_load().map(e => e.id === id ? { ...e, ...patch } : e));
}

// ── calendar.js ───────────────────────────────────────────
const CAL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

let calCurrent = { year: new Date().getFullYear(), month: new Date().getMonth() };
let calPopover = null;
let calActiveCell = null;

function calToDateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function calTodayStr() {
  const d = new Date();
  return calToDateStr(d.getFullYear(), d.getMonth(), d.getDate());
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
  if (calPopover) calPopover.classList.remove('visible');
  calActiveCell = null;
}

function showPopover(cell, dateStr, entries) {
  if (!calPopover) return;
  if (calActiveCell === cell) { closePopover(); return; }
  calActiveCell = cell;

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
        <button class="popover-edit" data-id="${e.id}" title="Edit notes">✎</button>
        <button class="popover-delete" data-id="${e.id}" title="Delete">✕</button>
      </div>`).join('');

  calPopover.innerHTML = `
    <div class="popover-header">
      <span class="popover-date">${label}</span>
      <button class="popover-close">✕</button>
    </div>
    ${entriesHtml}
  `;

  const rect = cell.getBoundingClientRect();
  const vw = window.innerWidth, vh = window.innerHeight;
  let top = rect.bottom + 8;
  let left = rect.left;

  calPopover.style.visibility = 'hidden';
  calPopover.classList.add('visible');
  const pw = calPopover.offsetWidth, ph = calPopover.offsetHeight;
  calPopover.classList.remove('visible');
  calPopover.style.visibility = '';

  if (left + pw > vw - 8) left = vw - pw - 8;
  if (top + ph > vh - 8) top = rect.top - ph - 8;
  if (left < 8) left = 8;

  calPopover.style.top = `${top}px`;
  calPopover.style.left = `${left}px`;
  calPopover.classList.add('visible');

  calPopover.querySelector('.popover-close').addEventListener('click', closePopover);
  calPopover.querySelectorAll('.popover-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      storeRemove(btn.dataset.id);
      closePopover();
      renderCalendar();
    });
  });
  calPopover.querySelectorAll('.popover-edit').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const entryEl = calPopover.querySelector(`.popover-entry[data-id="${id}"]`);
      const infoEl = entryEl.querySelector('.popover-entry-info');
      const currentNotes = infoEl.querySelector('.popover-notes')?.textContent || '';

      infoEl.innerHTML = `
        <div class="popover-type">${entryEl.querySelector('.popover-type').textContent}</div>
        <textarea class="popover-notes-input" rows="2">${currentNotes}</textarea>
        <div class="popover-notes-actions">
          <button class="popover-notes-save">Save</button>
          <button class="popover-notes-cancel">Cancel</button>
        </div>`;
      btn.style.display = 'none';
      entryEl.querySelector('.popover-delete').style.display = 'none';

      const textarea = infoEl.querySelector('.popover-notes-input');
      textarea.focus();
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);

      infoEl.querySelector('.popover-notes-save').addEventListener('click', () => {
        storeUpdate(id, { notes: textarea.value.trim() });
        const savedCell = calActiveCell;
        calActiveCell = null;
        showPopover(savedCell, savedCell.dataset.date, getByDate(savedCell.dataset.date));
      });
      infoEl.querySelector('.popover-notes-cancel').addEventListener('click', () => {
        const savedCell = calActiveCell;
        calActiveCell = null;
        showPopover(savedCell, savedCell.dataset.date, getByDate(savedCell.dataset.date));
      });
    });
  });
}

function renderCalendar() {
  const grid = document.getElementById('calendar-grid');
  const monthLabel = document.getElementById('month-label');
  if (!grid || !monthLabel) return;

  const { year, month } = calCurrent;
  monthLabel.textContent = `${MONTHS[month]} ${year}`;

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const today = calTodayStr();
  const startOffset = (firstDay.getDay() + 6) % 7;

  let cells = [];
  const prevLast = new Date(year, month, 0).getDate();
  for (let i = startOffset - 1; i >= 0; i--) {
    const day = prevLast - i;
    const m = month === 0 ? 11 : month - 1;
    const y = month === 0 ? year - 1 : year;
    cells.push({ dateStr: calToDateStr(y, m, day), otherMonth: true });
  }
  for (let d = 1; d <= lastDay.getDate(); d++) {
    cells.push({ dateStr: calToDateStr(year, month, d), otherMonth: false });
  }
  const remaining = cells.length % 7 === 0 ? 0 : 7 - (cells.length % 7);
  for (let d = 1; d <= remaining; d++) {
    const m = month === 11 ? 0 : month + 1;
    const y = month === 11 ? year + 1 : year;
    cells.push({ dateStr: calToDateStr(y, m, d), otherMonth: true });
  }

  grid.innerHTML = cells.map(({ dateStr, otherMonth }) => {
    const entries = otherMonth ? [] : getByDate(dateStr);
    const isToday = dateStr === today;
    const dayNum = parseInt(dateStr.slice(8), 10);
    const classes = ['day-cell', isToday ? 'today' : '', otherMonth ? 'other-month' : '', entries.length > 0 ? 'has-entries' : ''].filter(Boolean).join(' ');
    return `<div class="${classes}" data-date="${dateStr}">
      <span class="day-num">${dayNum}</span>
      <div class="dots-row">${renderDots(entries)}</div>
    </div>`;
  }).join('');

  grid.querySelectorAll('.day-cell:not(.other-month)').forEach(cell => {
    cell.addEventListener('click', () => {
      showPopover(cell, cell.dataset.date, getByDate(cell.dataset.date));
    });
  });
}

function initCalendar() {
  calPopover = document.createElement('div');
  calPopover.className = 'day-popover';
  document.body.appendChild(calPopover);

  document.getElementById('prev-month').addEventListener('click', () => {
    calCurrent.month--;
    if (calCurrent.month < 0) { calCurrent.month = 11; calCurrent.year--; }
    closePopover();
    renderCalendar();
  });
  document.getElementById('next-month').addEventListener('click', () => {
    calCurrent.month++;
    if (calCurrent.month > 11) { calCurrent.month = 0; calCurrent.year++; }
    closePopover();
    renderCalendar();
  });
  document.addEventListener('click', e => {
    if (calPopover && !calPopover.contains(e.target) && !e.target.closest('.day-cell')) {
      closePopover();
    }
  });
  renderCalendar();
}

// ── weekly.js ─────────────────────────────────────────────
const WK_DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

let currentWeek = null;

function wkDotStyle(type) {
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
  if (mon.getUTCMonth() === sun.getUTCMonth()) return `Week of ${mMon} ${mDay}–${sDay}, ${yr}`;
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

function renderWeekly() {
  const entries = getByWeek(currentWeek.year, currentWeek.week);
  const dates = getWeekDates(currentWeek.year, currentWeek.week);

  document.getElementById('week-label').textContent = formatWeekRange(currentWeek.year, currentWeek.week);

  const counts = { walk: 0, run: 0, workout: 0 };
  entries.forEach(e => { if (counts[e.type] !== undefined) counts[e.type]++; });
  document.getElementById('stat-walk').textContent = counts.walk;
  document.getElementById('stat-run').textContent = counts.run;
  document.getElementById('stat-workout').textContent = counts.workout;

  const listEl = document.getElementById('week-day-list');
  listEl.innerHTML = dates.map((dateStr, i) => {
    const dayEntries = entries.filter(e => e.date === dateStr);
    const dayName = WK_DAY_NAMES[i];
    const entriesHtml = dayEntries.length === 0
      ? `<span class="week-day-empty">Rest day</span>`
      : dayEntries.map(e => `
        <div class="week-entry-item">
          <span class="week-entry-dot" style="${wkDotStyle(e.type)}"></span>
          <span class="week-entry-type">${e.type}</span>
          ${e.notes ? `<span class="week-entry-notes">— ${e.notes}</span>` : ''}
        </div>`).join('');
    return `<div class="week-day-row">
      <span class="week-day-name">${dayName}</span>
      <div class="week-day-entries">${entriesHtml}</div>
    </div>`;
  }).join('');
}

function initWeekly() {
  const todayStr = toDateStr(new Date());
  currentWeek = isoWeek(todayStr);

  document.getElementById('prev-week').addEventListener('click', () => {
    currentWeek.week--;
    if (currentWeek.week < 1) {
      currentWeek.year--;
      currentWeek.week = isoWeek(`${currentWeek.year}-12-28`).week;
    }
    renderWeekly();
  });
  document.getElementById('next-week').addEventListener('click', () => {
    currentWeek.week++;
    const maxWeek = isoWeek(`${currentWeek.year}-12-28`).week;
    if (currentWeek.week > maxWeek) { currentWeek.year++; currentWeek.week = 1; }
    renderWeekly();
  });
  renderWeekly();
}

// ── export.js ─────────────────────────────────────────────
const EXP_DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const RATIOS = { '9:16': { width: 1080, height: 1920 }, '1:1': { width: 1080, height: 1080 }, '3:4': { width: 1080, height: 1440 } };
const COLORS = { bg: '#1a2e1a', text: '#e8f5e8', muted: '#7ab87a', border: 'rgba(255,255,255,0.08)', walk: '#a8d5a2', run: '#1b5e20', workout: '#2e7d32' };

function expDotColor(type) { return COLORS[type] || COLORS.workout; }

function buildExportCard(year, weekNum, width, height) {
  const card = document.getElementById('export-card');
  card.style.width = `${width}px`;
  card.style.height = `${height}px`;
  card.style.background = COLORS.bg;

  const entries = getByWeek(year, weekNum);
  const dates = getWeekDates(year, weekNum);
  const wkLabel = formatWeekRange(year, weekNum);
  const counts = { walk: 0, run: 0, workout: 0 };
  entries.forEach(e => { if (counts[e.type] !== undefined) counts[e.type]++; });
  const total = entries.length;
  const padding = Math.round(height * 0.042);
  const fs = {
    appName: Math.round(height * 0.016),
    weekLabel: Math.round(height * 0.024),
    dayName: Math.round(height * 0.012),
    entry: Math.round(height * 0.011),
    barLabel: Math.round(height * 0.01),
  };

  const dayRows = dates.map((dateStr, i) => {
    const dayEntries = entries.filter(e => e.date === dateStr);
    const dayName = EXP_DAY_NAMES[i];
    const entryLines = dayEntries.length === 0
      ? `<div style="font-size:${fs.entry}px;color:rgba(122,184,122,0.4);font-style:italic;">Rest</div>`
      : dayEntries.map(e => {
          const notes = e.notes ? `<span style="color:${COLORS.muted};margin-left:8px;">— ${e.notes}</span>` : '';
          return `<div style="display:flex;align-items:center;gap:10px;font-size:${fs.entry}px;color:${COLORS.text};margin-bottom:4px;">
            <span style="width:12px;height:12px;border-radius:50%;background:${expDotColor(e.type)};flex-shrink:0;display:inline-block;"></span>
            <span style="font-weight:600;text-transform:capitalize;">${e.type}</span>${notes}</div>`;
        }).join('');
    return `<div style="display:flex;align-items:flex-start;gap:24px;border-top:1px solid ${COLORS.border};padding-top:${Math.round(padding * 0.4)}px;margin-bottom:${Math.round(padding * 0.4)}px;">
      <span style="font-size:${fs.dayName}px;font-weight:700;color:${COLORS.muted};width:52px;flex-shrink:0;">${dayName}</span>
      <div style="flex:1;min-width:0;">${entryLines}</div></div>`;
  }).join('');

  const barTotal = counts.walk + counts.run + counts.workout;
  let barSegments = barTotal > 0
    ? ['walk', 'run', 'workout'].map(t => counts[t] > 0
        ? `<div style="height:100%;width:${(counts[t]/barTotal*100).toFixed(1)}%;background:${expDotColor(t)};"></div>` : '').join('')
    : `<div style="height:100%;width:100%;background:rgba(255,255,255,0.06);"></div>`;

  const statsLine = [
    counts.walk > 0 ? `${counts.walk} walk${counts.walk !== 1 ? 's' : ''}` : '',
    counts.run > 0 ? `${counts.run} run${counts.run !== 1 ? 's' : ''}` : '',
    counts.workout > 0 ? `${counts.workout} workout${counts.workout !== 1 ? 's' : ''}` : '',
  ].filter(Boolean).join(' · ') || 'No activities';

  card.innerHTML = `<div style="height:100%;display:flex;flex-direction:column;padding:${padding}px ${Math.round(padding*1.1)}px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <div style="font-size:${fs.appName}px;font-weight:700;color:${COLORS.muted};letter-spacing:-0.3px;margin-bottom:6px;">Activity Tracker</div>
    <div style="font-size:${fs.weekLabel}px;font-weight:700;color:${COLORS.text};line-height:1.1;margin-bottom:${Math.round(padding*0.6)}px;">${wkLabel}</div>
    <div style="font-size:${fs.entry}px;color:${COLORS.muted};margin-bottom:${Math.round(padding*0.8)}px;">${total} activit${total!==1?'ies':'y'} · ${statsLine}</div>
    <div style="flex:1;overflow:hidden;">${dayRows}</div>
    <div style="margin-top:${Math.round(padding*0.6)}px;">
      <div style="font-size:${fs.barLabel}px;color:${COLORS.muted};margin-bottom:8px;text-transform:uppercase;letter-spacing:0.8px;">Activity Mix</div>
      <div style="display:flex;height:14px;border-radius:7px;overflow:hidden;background:rgba(255,255,255,0.06);">${barSegments}</div>
    </div></div>`;
}

async function exportPNG(ratio) {
  if (typeof html2canvas === 'undefined') { alert('html2canvas not loaded. Check your internet connection.'); return; }
  const { year, week } = currentWeek;
  const { width, height } = RATIOS[ratio];
  buildExportCard(year, week, width, height);
  const card = document.getElementById('export-card');
  const btn = document.querySelector(`[data-ratio="${ratio}"]`);
  if (btn) btn.classList.add('loading');
  try {
    const canvas = await html2canvas(card, { scale: 1, useCORS: false, logging: false, width, height, windowWidth: width, windowHeight: height });
    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `activity-tracker-week-${String(week).padStart(2,'0')}-${year}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    }, 'image/png');
  } catch (err) {
    console.error('Export failed:', err);
    alert('Export failed. See console for details.');
  } finally {
    if (btn) btn.classList.remove('loading');
  }
}

function initExport() {
  document.querySelectorAll('.btn-export').forEach(btn => {
    btn.addEventListener('click', () => exportPNG(btn.dataset.ratio));
  });
}

// ── form.js ───────────────────────────────────────────────
function formTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function initForm(onSave) {
  const modal = document.getElementById('activity-modal');
  const overlay = document.getElementById('modal-overlay');
  const fab = document.getElementById('fab');
  const closeBtn = document.getElementById('modal-close');
  const cancelBtn = document.getElementById('btn-cancel');
  const saveBtn = document.getElementById('btn-save');
  const typeBtns = modal.querySelectorAll('.type-btn');
  const dateInput = document.getElementById('activity-date');
  const notesInput = document.getElementById('activity-notes');
  let selectedType = 'walk';

  function openModal() {
    selectedType = 'walk';
    typeBtns.forEach(b => b.classList.toggle('selected', b.dataset.type === 'walk'));
    dateInput.value = formTodayStr();
    notesInput.value = '';
    modal.classList.add('open');
    overlay.classList.add('visible');
    dateInput.focus();
  }

  function closeModal() {
    modal.classList.remove('open');
    overlay.classList.remove('visible');
  }

  fab.addEventListener('click', openModal);
  closeBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', closeModal);

  typeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      selectedType = btn.dataset.type;
      typeBtns.forEach(b => b.classList.toggle('selected', b === btn));
    });
  });

  saveBtn.addEventListener('click', () => {
    const date = dateInput.value;
    if (!date) { dateInput.focus(); return; }
    storeAdd({ date, type: selectedType, notes: notesInput.value.trim() });
    closeModal();
    if (onSave) onSave();
  });

  notesInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveBtn.click(); }
  });
}

// ── app.js ────────────────────────────────────────────────
const tabs = document.querySelectorAll('.nav-tab');
const views = document.querySelectorAll('.view');

function switchTab(tabId) {
  tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tabId));
  views.forEach(v => v.classList.toggle('active', v.id === `view-${tabId}`));
  document.getElementById('fab').style.display = tabId === 'calendar' ? 'flex' : 'none';
  if (tabId === 'weekly') renderWeekly();
}

tabs.forEach(tab => tab.addEventListener('click', () => switchTab(tab.dataset.tab)));

initCalendar();
initForm(() => {
  renderCalendar();
  if (document.getElementById('view-weekly').classList.contains('active')) renderWeekly();
});
initWeekly();
initExport();
switchTab('calendar');
