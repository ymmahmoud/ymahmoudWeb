import { $ } from './dom.js';

const dialog = $('#alert');

export function confirmAlert({ title, message, confirm }) {
  $('#alert-title').textContent = title;
  $('#alert-message').textContent = message;
  $('#alert-confirm').textContent = confirm;
  dialog.returnValue = '';
  dialog.showModal();
  $('#alert-confirm').focus();
  return new Promise(resolve => {
    dialog.addEventListener('close', () => resolve(dialog.returnValue === 'confirm'), { once: true });
  });
}

export const isAlertOpen = () => dialog.open;
