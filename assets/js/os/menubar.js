import { $, $$ } from './dom.js';
import * as windows from './windows.js';
import * as system from './system.js';
import { runCommand } from './terminal.js';
import { isAlertOpen } from './alert.js';
import { play } from './motion.js';
import { emptyTrash } from './apps.js';

const triggers = $$('.menubar [aria-haspopup]');
let activeTrigger = null;
let selectionAtOpen = '';

const popupFor = trigger => document.getElementById(trigger.getAttribute('aria-controls'));
export const enabledItems = popup => $$('[role^="menuitem"]:not(:disabled)', popup);
const visibleTriggers = () => triggers.filter(t => t.offsetParent !== null);

const setChecked = (el, on) =>
  el.setAttribute(el.hasAttribute('aria-pressed') ? 'aria-pressed' : 'aria-checked', String(on));

function selectFrontWindowText() {
  const front = windows.front();
  if (!front) return;
  const range = document.createRange();
  range.selectNodeContents($('.window-body', front));
  getSelection().removeAllRanges();
  getSelection().addRange(range);
}

async function copyWithNotice(text, success) {
  const copied = await system.copyText(text);
  system.notify(copied ? 'Copied' : 'Couldn’t Copy', copied ? success : 'Your browser blocked clipboard access.');
}

const actions = {
  'close-window': () => windows.closeApp(windows.frontId()),
  'close-all': () => windows.closeAll(),
  'minimize-window': () => windows.minimizeApp(windows.frontId()),
  'zoom-window': () => windows.toggleZoom(windows.frontId()),
  'hide-others': () => windows.hideOthers(windows.frontId()),
  'show-all': () => windows.showAll(),
  'hide-app': app => windows.hideApp(app),
  'quit-app': app => windows.quitApp(app),
  'go-home': () => windows.hideOthers(),
  'empty-trash': () => emptyTrash(),
  'copy-link': id => {
    const url = new URL(location.href);
    url.hash = id ?? windows.frontId();
    copyWithNotice(url.href, url.href);
  },
  copy: () => copyWithNotice(selectionAtOpen, 'Selection copied to the clipboard.'),
  'select-all': selectFrontWindowText,
  print: () => window.print(),
  appearance: mode => system.setAppearance(mode),
  fullscreen: () => system.toggleFullscreen(),
  'toggle-icons': () => system.setIcons(!system.state.icons),
  'wifi-toggle': () => system.setWifi(!system.state.wifi),
  'wifi-join': network => system.joinNetwork(network),
  'low-power-toggle': () => system.setLowPower(!system.state.lowPower),
  'terminal-help': () => {
    windows.openApp('terminal');
    runCommand('help');
  },
  sleep: () => system.sleep(),
  restart: () => location.reload(),
  'shut-down': async () => {
    await windows.closeAll();
    await system.sleep();
    location.reload();
  },
};

function syncBattery() {
  const { battery } = system.state;
  if (!battery) return;
  const percent = Math.round(battery.level * 100);
  const label = `Battery ${percent}%${battery.charging ? ' · Charging' : ''}`;
  $('#battery-label').textContent = label;
  $('#mb-battery').setAttribute('aria-label', label);
  $$('[data-battery-level]').forEach(el => el.setAttribute('width', String(Math.max(2, 20 * battery.level))));
}

export function sync() {
  const { state } = system;
  const front = windows.front();
  const frontId = windows.frontId();
  const name = front?.dataset.title ?? 'Desktop';

  $('#app-name').textContent = name;
  $$('[data-front-name]').forEach(el => { el.textContent = name; });

  const available = {
    window: !!front,
    minimized: windows.hasMinimized(),
    selection: !!selectionAtOpen,
    fullscreen: system.canFullscreen(),
    wifi: state.wifi,
  };
  $$('[data-needs]').forEach(el => { el.disabled = !available[el.dataset.needs]; });

  $$('[data-window-item]').forEach(el => setChecked(el, el.dataset.windowItem === frontId));
  $$('[data-action="appearance"]').forEach(el => setChecked(el, el.dataset.arg === state.appearance));
  $$('[data-action="wifi-toggle"]').forEach(el => setChecked(el, state.wifi));
  $$('[data-action="wifi-join"]').forEach(el => setChecked(el, el.dataset.arg === state.network));
  $$('[data-action="low-power-toggle"]').forEach(el => setChecked(el, state.lowPower));
  $$('[data-action="toggle-icons"]').forEach(el => setChecked(el, state.icons));

  $$('#mb-wifi, .cc-toggle[data-action="wifi-toggle"]').forEach(el => el.classList.toggle('wifi-off', !state.wifi));
  $$('[data-wifi-name]').forEach(el => { el.textContent = state.wifi ? state.network : 'Off'; });
  $$('[data-fullscreen-label]').forEach(el => {
    el.textContent = system.isFullscreen() ? 'Exit Full Screen' : 'Enter Full Screen';
  });

  syncBattery();
}

function openMenu(trigger, focusFirst) {
  if (activeTrigger === trigger) return;
  closeMenus();
  selectionAtOpen = getSelection().toString();
  sync();
  const popup = popupFor(trigger);
  popup.classList.remove('is-closing');
  popup.hidden = false;
  trigger.setAttribute('aria-expanded', 'true');
  activeTrigger = trigger;
  if (focusFirst) (enabledItems(popup)[0] ?? $('button, input, a', popup))?.focus();
}

export function closeMenus({ restoreFocus = false } = {}) {
  if (!activeTrigger) return;
  const trigger = activeTrigger;
  const popup = popupFor(trigger);
  activeTrigger = null;
  trigger.setAttribute('aria-expanded', 'false');
  if (restoreFocus) trigger.focus();
  play(popup, 'is-closing').then(() => {
    if (activeTrigger !== trigger) popup.hidden = true;
  });
}

function openAdjacentMenu(step) {
  const list = visibleTriggers();
  const next = list[(list.indexOf(activeTrigger) + step + list.length) % list.length];
  openMenu(next, true);
}

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

function onMenuKeydown(e) {
  switch (e.key) {
    case 'ArrowRight': openAdjacentMenu(1); break;
    case 'ArrowLeft': openAdjacentMenu(-1); break;
    case 'Tab': closeMenus(); return;
    default: if (!moveMenuFocus(e.currentTarget, e.key)) return;
  }
  e.preventDefault();
}

function onDocumentClick(e) {
  const control = e.target.closest('[data-open], [data-action]');
  if (control && !control.disabled) {
    if (control.dataset.open) windows.openApp(control.dataset.open);
    else actions[control.dataset.action]?.(control.dataset.arg);
    if (!control.hasAttribute('data-keep-open')) closeMenus();
    return;
  }
  if (activeTrigger && (!e.target.closest('.mb-menu') || e.target === popupFor(activeTrigger))) closeMenus();
}

function onDocumentKeydown(e) {
  if (e.key !== 'Escape' || isAlertOpen()) return;
  if (activeTrigger) {
    closeMenus({ restoreFocus: true });
    return;
  }
  const frontId = windows.frontId();
  if (frontId) windows.closeApp(frontId);
}

export function initMenubar() {
  triggers.forEach(trigger => {
    trigger.addEventListener('click', e => {
      if (activeTrigger === trigger) closeMenus();
      else openMenu(trigger, e.detail === 0);
    });
    trigger.addEventListener('pointerenter', () => {
      if (activeTrigger && activeTrigger !== trigger) openMenu(trigger, false);
    });
    trigger.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        openMenu(trigger, true);
      }
    });
  });

  $$('.menubar [role="menu"]').forEach(menu => menu.addEventListener('keydown', onMenuKeydown));
  document.addEventListener('click', onDocumentClick);
  document.addEventListener('keydown', onDocumentKeydown);
  document.addEventListener('os:windows', sync);
  document.addEventListener('os:system', sync);
  sync();
}
