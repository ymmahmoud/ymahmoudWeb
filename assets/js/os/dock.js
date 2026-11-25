import { $, $$ } from './dom.js';
import { play } from './motion.js';

const dock = $('.dock');
const shelf = $('.dock-shelf');
const items = $$('.dock-item', shelf);
const tileOf = app => $(`.dock-item[data-app="${app}"] .dock-tile`, shelf);
const token = name => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));

export function bounce(app) {
  const tile = tileOf(app);
  if (tile) play(tile, 'is-bouncing');
}

export function dockTarget(app) {
  return (tileOf(app) ?? shelf).getBoundingClientRect();
}

export function setTrashFull(full) {
  dock.classList.toggle('trash-empty', !full);
}

function magnify(pointerX) {
  const max = token('--dock-magnify');
  const reach = token('--dock-tile') * token('--dock-magnify-reach');
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
  items.forEach(item => item.style.removeProperty('--scale'));
}

export function initDock() {
  shelf.addEventListener('pointermove', e => {
    if (e.pointerType === 'mouse' && token('--dock-magnify') > 1) magnify(e.clientX);
  });
  shelf.addEventListener('pointerleave', rest);
}
