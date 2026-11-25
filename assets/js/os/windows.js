import { $, $$ } from './dom.js';
import { play, setVars } from './motion.js';
import { bounce, dockTarget } from './dock.js';

const desktop = $('#desktop');
const phone = matchMedia('(max-width: 700px)');
const interactive = 'button, a, input, textarea, select, form';

export const wins = new Map($$('.window').map(w => [w.id.slice(4), w]));

let z = 10;
let cascade = 0;

const state = w => w.dataset.state || 'closed';
const dockAppOf = (w, id) => w.dataset.dock || id;
const windowsOf = dockApp =>
  [...wins].filter(([id, w]) => dockAppOf(w, id) === dockApp && state(w) !== 'closed');
const isRunning = dockApp => windowsOf(dockApp).length > 0;

export const appWindows = dockApp =>
  windowsOf(dockApp).map(([id, w]) => ({ id, title: $('.titlebar h2', w).textContent }));

function changed() {
  const top = front();
  const running = new Set();
  wins.forEach((w, id) => {
    w.classList.toggle('open', state(w) === 'open');
    w.classList.toggle('focused', w === top);
    if (state(w) !== 'closed') running.add(dockAppOf(w, id));
  });
  $$('.dock-item').forEach(item => item.classList.toggle('running', running.has(item.dataset.app)));
  document.dispatchEvent(new CustomEvent('os:windows'));
}

export function front() {
  let top;
  wins.forEach(w => {
    if (state(w) === 'open' && (!top || +w.style.zIndex > +top.style.zIndex)) top = w;
  });
  return top;
}
export const frontId = () => front()?.id.slice(4);
export const hasMinimized = () => [...wins.values()].some(w => state(w) === 'minimized');

function raise(w) {
  if (+w.style.zIndex !== z) {
    w.style.zIndex = ++z;
    changed();
  }
}

function place(w) {
  if (w.dataset.placed) return;
  w.dataset.placed = '1';
  const off = (cascade++ % 6) * 28;
  const left = (desktop.clientWidth - w.offsetWidth) / 2 - 80 + off;
  const top = 30 + off;
  w.style.left = Math.max(8, Math.min(left, desktop.clientWidth - w.offsetWidth - 8)) + 'px';
  w.style.top = Math.max(8, Math.min(top, desktop.clientHeight - w.offsetHeight - 110)) + 'px';
}

function setGenieTarget(w, id) {
  const win = w.getBoundingClientRect();
  const target = dockTarget(dockAppOf(w, id));
  const half = target.width / 2;
  const center = target.left + half - win.left;
  setVars(w, {
    'genie-l': ((center - half) / win.width) * 100,
    'genie-r': ((center + half) / win.width) * 100,
    'genie-stretch': Math.max(1, (target.bottom - win.top) / win.height),
    'genie-dy': `${target.top - win.top}px`,
    'genie-sy': target.height / win.height,
  });
}

function focusInside(w) {
  ($('[data-autofocus]', w) || w).focus({ preventScroll: true });
}

export function openApp(id) {
  const w = wins.get(id);
  if (!w) return;
  const previous = state(w);
  if (previous === 'open') {
    raise(w);
    focusInside(w);
    return;
  }
  if (previous === 'closed' && !isRunning(dockAppOf(w, id))) bounce(dockAppOf(w, id));
  w.dataset.state = 'open';
  w.classList.add('open');
  place(w);
  w.style.zIndex = ++z;
  changed();
  focusInside(w);
  if (previous === 'minimized') {
    setGenieTarget(w, id);
    play(w, 'is-restoring');
  } else {
    play(w, 'is-opening');
  }
}

async function exit(id, className) {
  const w = wins.get(id);
  if (!w || state(w) !== 'open' || w.classList.contains(className)) return;
  await play(w, className);
  w.dataset.state = 'closed';
  w.classList.remove('max');
  changed();
}

export function closeApp(id) {
  const w = wins.get(id);
  if (w && state(w) === 'minimized') {
    w.dataset.state = 'closed';
    changed();
    return Promise.resolve();
  }
  return exit(id, 'is-closing');
}

export const sendAway = id => exit(id, 'is-sending');

export async function minimizeApp(id) {
  const w = wins.get(id);
  if (!w || state(w) !== 'open' || w.classList.contains('is-minimizing')) return;
  setGenieTarget(w, id);
  await play(w, 'is-minimizing');
  w.dataset.state = 'minimized';
  changed();
}

export function toggleZoom(id) {
  const w = wins.get(id);
  if (!w || phone.matches) return;
  const before = w.getBoundingClientRect();
  w.classList.toggle('max');
  const after = w.getBoundingClientRect();
  setVars(w, {
    'zoom-x': `${before.left - after.left}px`,
    'zoom-y': `${before.top - after.top}px`,
    'zoom-sx': before.width / after.width,
    'zoom-sy': before.height / after.height,
  });
  play(w, 'is-zooming');
}

export function closeAll() {
  return Promise.all([...wins.keys()].map(closeApp));
}

export function hideOthers(keepId) {
  wins.forEach((w, id) => { if (id !== keepId && state(w) === 'open') minimizeApp(id); });
}

export const hideApp = dockApp => windowsOf(dockApp).forEach(([id]) => minimizeApp(id));

export const quitApp = dockApp => Promise.all(windowsOf(dockApp).map(([id]) => closeApp(id)));

export function showAll() {
  wins.forEach((w, id) => { if (state(w) === 'minimized') openApp(id); });
}

function draggable(w, handle) {
  handle.addEventListener('pointerdown', e => {
    if (e.button !== 0 || e.target.closest(interactive) || phone.matches || w.classList.contains('max')) return;
    e.preventDefault();
    const sx = e.clientX, sy = e.clientY, ox = w.offsetLeft, oy = w.offsetTop;
    handle.setPointerCapture(e.pointerId);
    const move = ev => {
      w.style.left = Math.min(Math.max(ox + ev.clientX - sx, 80 - w.offsetWidth), desktop.clientWidth - 80) + 'px';
      w.style.top = Math.min(Math.max(oy + ev.clientY - sy, 0), desktop.clientHeight - 60) + 'px';
    };
    const up = () => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', up);
      handle.removeEventListener('pointercancel', up);
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', up);
    handle.addEventListener('pointercancel', up);
  });
}

function initLaunchers() {
  $$('[data-launch]').forEach(item => {
    item.addEventListener('dblclick', () => openApp(item.dataset.launch));
    item.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        openApp(item.dataset.launch);
      }
    });
  });
}

export function initWindows() {
  wins.forEach((w, id) => {
    w.tabIndex = -1;
    w.addEventListener('pointerdown', () => raise(w));
    w.addEventListener('focusin', () => raise(w));
    $('.light--close', w).addEventListener('click', () => closeApp(id));
    $('.light--min', w).addEventListener('click', () => minimizeApp(id));
    $('.light--max', w).addEventListener('click', () => toggleZoom(id));
    const bar = $('.titlebar', w);
    bar.addEventListener('dblclick', e => { if (!e.target.closest(interactive)) toggleZoom(id); });
    draggable(w, bar);
  });
  initLaunchers();
  changed();
}
