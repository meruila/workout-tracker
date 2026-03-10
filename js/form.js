import { add } from './store.js';

let onSaveCallback = null;

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function initForm(onSave) {
  onSaveCallback = onSave;

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
    // Reset form
    selectedType = 'walk';
    typeBtns.forEach(b => b.classList.toggle('selected', b.dataset.type === 'walk'));
    dateInput.value = todayStr();
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

    add({
      date,
      type: selectedType,
      notes: notesInput.value.trim(),
    });

    closeModal();
    if (onSaveCallback) onSaveCallback();
  });

  // Submit on Enter in notes
  notesInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveBtn.click(); }
  });
}
