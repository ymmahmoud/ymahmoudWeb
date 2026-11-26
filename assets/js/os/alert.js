import { $ } from './dom.js';

const dialog = $('#alert');
const confirmButton = $('#alert-confirm');
const cancelButton = $('#alert-cancel');

// A modal alert. Resolves true when the default button is chosen. Pass cancel: null
// for a single-button alert such as an About panel.
export function showAlert({ title, message, confirm = 'OK', cancel = 'Cancel' }) {
  $('#alert-title').textContent = title;
  $('#alert-message').textContent = message;
  confirmButton.textContent = confirm;
  cancelButton.hidden = cancel === null;
  if (cancel !== null) cancelButton.textContent = cancel;
  dialog.returnValue = '';
  dialog.showModal();
  confirmButton.focus();
  return new Promise(resolve => {
    dialog.addEventListener('close', () => resolve(dialog.returnValue === 'confirm'), { once: true });
  });
}

export const isAlertOpen = () => dialog.open;
