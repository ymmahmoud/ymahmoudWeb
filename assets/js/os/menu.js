// Menus shared by the menu bar, context menus and Dock menus.
// An item is { label, run, disabled, checked, minimized } or the separator '-'.

import { $$ } from './dom.js';

export const separator = '-';

export function renderItems(items, onChoose) {
  return items.map(item => {
    if (item === separator) return document.createElement('hr');
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('role', 'checked' in item ? 'menuitemcheckbox' : 'menuitem');
    if ('checked' in item) button.setAttribute('aria-checked', String(!!item.checked));
    if (item.minimized) button.classList.add('is-minimized');
    button.textContent = item.label;
    button.disabled = !!item.disabled || !item.run;
    button.addEventListener('click', () => {
      onChoose();
      item.run();
    });
    return button;
  });
}

// Drops leading, trailing and doubled separators left by optional items.
export function tidy(items) {
  const out = [];
  items.filter(Boolean).forEach(item => {
    if (item !== separator || (out.length && out.at(-1) !== separator)) out.push(item);
  });
  if (out.at(-1) === separator) out.pop();
  return out;
}

export const enabledItems = popup => $$('[role^="menuitem"]:not(:disabled)', popup);

export function moveMenuFocus(menu, key) {
  const items = enabledItems(menu);
  const index = items.indexOf(document.activeElement);
  const focusAt = i => items[(i + items.length) % items.length]?.focus();
  switch (key) {
    case 'ArrowDown': focusAt(index + 1); return true;
    case 'ArrowUp': focusAt(index < 0 ? -1 : index - 1); return true;
    case 'Home': focusAt(0); return true;
    case 'End': focusAt(-1); return true;
    default: return false;
  }
}
