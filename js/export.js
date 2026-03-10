import { getByWeek } from './store.js';
import { getCurrentWeek, getWeekDatesExport, formatWeekRangeExport } from './weekly.js';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const RATIOS = {
  '9:16': { width: 1080, height: 1920 },
  '1:1':  { width: 1080, height: 1080 },
  '3:4':  { width: 1080, height: 1440 },
};

// Inline colors for html2canvas (no CSS vars)
const COLORS = {
  bg:      '#1a2e1a',
  text:    '#e8f5e8',
  muted:   '#7ab87a',
  border:  'rgba(255,255,255,0.08)',
  walk:    '#a8d5a2',
  run:     '#1b5e20',
  workout: '#2e7d32',
};

function dotColor(type) {
  return COLORS[type] || COLORS.workout;
}

function buildExportCard(year, weekNum, width, height) {
  const card = document.getElementById('export-card');
  card.style.width = `${width}px`;
  card.style.height = `${height}px`;
  card.style.background = COLORS.bg;

  const entries = getByWeek(year, weekNum);
  const dates = getWeekDatesExport(year, weekNum);
  const weekLabel = formatWeekRangeExport(year, weekNum);

  const counts = { walk: 0, run: 0, workout: 0 };
  entries.forEach(e => { if (counts[e.type] !== undefined) counts[e.type]++; });
  const total = entries.length;

  const padding = Math.round(height * 0.042);
  const fontSize = {
    appName: Math.round(height * 0.016),
    weekLabel: Math.round(height * 0.024),
    dayName: Math.round(height * 0.012),
    entry: Math.round(height * 0.011),
    barLabel: Math.round(height * 0.01),
  };

  // Day rows
  const dayRows = dates.map((dateStr, i) => {
    const dayEntries = entries.filter(e => e.date === dateStr);
    const dayName = DAY_NAMES[i];

    const entryLines = dayEntries.length === 0
      ? `<div style="font-size:${fontSize.entry}px;color:rgba(122,184,122,0.4);font-style:italic;">Rest</div>`
      : dayEntries.map(e => {
          const notes = e.notes ? `<span style="color:${COLORS.muted};margin-left:8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:600px;">— ${e.notes}</span>` : '';
          return `
            <div style="display:flex;align-items:center;gap:10px;font-size:${fontSize.entry}px;color:${COLORS.text};margin-bottom:4px;">
              <span style="width:12px;height:12px;border-radius:50%;background:${dotColor(e.type)};flex-shrink:0;display:inline-block;"></span>
              <span style="font-weight:600;text-transform:capitalize;">${e.type}</span>
              ${notes}
            </div>`;
        }).join('');

    return `
      <div style="display:flex;align-items:flex-start;gap:24px;border-top:1px solid ${COLORS.border};padding-top:${Math.round(padding * 0.4)}px;margin-bottom:${Math.round(padding * 0.4)}px;">
        <span style="font-size:${fontSize.dayName}px;font-weight:700;color:${COLORS.muted};width:52px;flex-shrink:0;">${dayName}</span>
        <div style="flex:1;min-width:0;">${entryLines}</div>
      </div>`;
  }).join('');

  // Proportion bar segments
  const barTotal = counts.walk + counts.run + counts.workout;
  let barSegments = '';
  if (barTotal > 0) {
    const types = ['walk', 'run', 'workout'];
    barSegments = types.map(t => {
      const pct = (counts[t] / barTotal * 100).toFixed(1);
      return counts[t] > 0
        ? `<div style="height:100%;width:${pct}%;background:${dotColor(t)};"></div>`
        : '';
    }).join('');
  } else {
    barSegments = `<div style="height:100%;width:100%;background:rgba(255,255,255,0.06);"></div>`;
  }

  const statsLine = [
    counts.walk > 0 ? `${counts.walk} walk${counts.walk !== 1 ? 's' : ''}` : '',
    counts.run > 0 ? `${counts.run} run${counts.run !== 1 ? 's' : ''}` : '',
    counts.workout > 0 ? `${counts.workout} workout${counts.workout !== 1 ? 's' : ''}` : '',
  ].filter(Boolean).join(' · ') || 'No activities';

  card.innerHTML = `
    <div style="height:100%;display:flex;flex-direction:column;padding:${padding}px ${Math.round(padding * 1.1)}px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <div style="font-size:${fontSize.appName}px;font-weight:700;color:${COLORS.muted};letter-spacing:-0.3px;margin-bottom:6px;">Activity Tracker</div>
      <div style="font-size:${fontSize.weekLabel}px;font-weight:700;color:${COLORS.text};line-height:1.1;margin-bottom:${Math.round(padding * 0.6)}px;">${weekLabel}</div>
      <div style="font-size:${fontSize.entry}px;color:${COLORS.muted};margin-bottom:${Math.round(padding * 0.8)}px;">${total} activit${total !== 1 ? 'ies' : 'y'} · ${statsLine}</div>
      <div style="flex:1;overflow:hidden;">${dayRows}</div>
      <div style="margin-top:${Math.round(padding * 0.6)}px;">
        <div style="font-size:${fontSize.barLabel}px;color:${COLORS.muted};margin-bottom:8px;text-transform:uppercase;letter-spacing:0.8px;">Activity Mix</div>
        <div style="display:flex;height:14px;border-radius:7px;overflow:hidden;background:rgba(255,255,255,0.06);">${barSegments}</div>
      </div>
    </div>`;
}

async function exportPNG(ratio) {
  if (typeof html2canvas === 'undefined') {
    alert('html2canvas not loaded. Check your internet connection.');
    return;
  }

  const { year, week } = getCurrentWeek();
  const { width, height } = RATIOS[ratio];

  buildExportCard(year, week, width, height);

  const card = document.getElementById('export-card');
  const btn = document.querySelector(`[data-ratio="${ratio}"]`);
  if (btn) btn.classList.add('loading');

  try {
    const canvas = await html2canvas(card, {
      scale: 1,
      useCORS: false,
      logging: false,
      width,
      height,
      windowWidth: width,
      windowHeight: height,
    });

    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `activity-tracker-week-${String(week).padStart(2, '0')}-${year}.png`;
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

export function initExport() {
  document.querySelectorAll('.btn-export').forEach(btn => {
    btn.addEventListener('click', () => exportPNG(btn.dataset.ratio));
  });
}
