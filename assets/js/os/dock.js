// The Dock's own presentation: magnification, launch bounce, running indicators,
// badges, minimized-window tiles and the Trash icon. What clicking a tile does is
// Application's job (see application.js).

import { $, $$ } from './dom.js';
import { play } from './motion.js';

const dock = $('.dock');
const shelf = $('.dock-shelf');
const separator = $('.dock-sep', shelf);
const token = name => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));

export const tile = app => $(`.dock-item[data-app="${app}"] .dock-tile`, shelf) ?? shelf;
export const minimizedTile = id => $(`.dock-item[data-window="${id}"] .dock-tile`, shelf);

export function bounce(app) {
  const t = $(`.dock-item[data-app="${app}"] .dock-tile`, shelf);
  if (t) play(t, 'is-bouncing');
}

export function setRunning(running) {
  $$('.dock-item[data-app]', shelf).forEach(item => item.classList.toggle('running', running.has(item.dataset.app)));
}

// Red badge on the Dock tile and the matching Home Screen icon.
export function setBadge(app, count) {
  $$(`.dock-item[data-app="${app}"], .home-app[data-app="${app}"]`).forEach(host => {
    let badge = $('.app-badge', host);
    if (!count) {
      badge?.remove();
      return;
    }
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'app-badge';
      badge.setAttribute('aria-hidden', 'true');
      host.append(badge);
    }
    badge.textContent = String(count);
  });
}

export function setTrashFull(full) {
  dock.classList.toggle('trash-empty', !full);
}

// A minimized window sits after the separator, before the Trash, until it's restored.
export function addMinimized(win, onClick) {
  const item = document.createElement('li');
  item.className = 'dock-item dock-item--window is-pending';
  item.dataset.window = win.id;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'dock-tile dock-tile--window';
  button.setAttribute('aria-label', `${win.title} (minimized)`);
  const badge = document.createElement('span');
  badge.className = 'dock-window-app';
  badge.style.setProperty('--tile', `var(--icon-${win.appId})`);
  button.append(badge);
  button.addEventListener('click', onClick);
  const tip = document.createElement('span');
  tip.className = 'dock-tip glass glass--strong';
  tip.setAttribute('aria-hidden', 'true');
  tip.textContent = win.title;
  item.append(button, tip);
  separator.after(item);
  return button;
}

export const showMinimized = id => $(`.dock-item[data-window="${id}"]`, shelf)?.classList.remove('is-pending');
export const removeMinimized = id => $(`.dock-item[data-window="${id}"]`, shelf)?.remove();

function magnify(pointerX) {
  const max = token('--dock-magnify');
  const reach = token('--dock-tile') * token('--dock-magnify-reach');
  const items = $$('.dock-item', shelf);
  const centers = items.map(item => {
    const r = item.getBoundingClientRect();
    return r.left + r.width / 2;
  });
  items.forEach((item, i) => {
    const distance = Math.abs(pointerX - centers[i]);
    const scale = distance >= reach ? 1 : 1 + (max - 1) * (1 + Math.cos((Math.PI * distance) / reach)) / 2;
    item.style.setProperty('--scale', scale.toFixed(3));
  });
}

function rest() {
  $$('.dock-item', shelf).forEach(item => item.style.removeProperty('--scale'));
}

export function initDock() {
  shelf.addEventListener('pointermove', e => {
    if (e.pointerType === 'mouse' && token('--dock-magnify') > 1) magnify(e.clientX);
  });
  shelf.addEventListener('pointerleave', rest);
}
