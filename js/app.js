import { initCalendar, renderCalendar } from './calendar.js';
import { initForm } from './form.js';
import { initWeekly, renderWeekly } from './weekly.js';
import { initExport } from './export.js';

// ── Tab Navigation ──
const tabs = document.querySelectorAll('.nav-tab');
const views = document.querySelectorAll('.view');

function switchTab(tabId) {
  tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tabId));
  views.forEach(v => v.classList.toggle('active', v.id === `view-${tabId}`));

  const fab = document.getElementById('fab');
  fab.style.display = tabId === 'calendar' ? 'flex' : 'none';

  if (tabId === 'weekly') renderWeekly();
}

tabs.forEach(tab => {
  tab.addEventListener('click', () => switchTab(tab.dataset.tab));
});

// ── Init ──
initCalendar();
initForm(() => {
  renderCalendar();
  // If weekly view is active, also re-render it
  if (document.getElementById('view-weekly').classList.contains('active')) {
    renderWeekly();
  }
});
initWeekly();
initExport();

// Activate default tab
switchTab('calendar');
