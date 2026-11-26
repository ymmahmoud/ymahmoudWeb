// The menu bar. The app, File, Edit, View, Window and Help menus are built from the
// active Application each time they open. The Y menu and the status menus on the right
// are system menus: their markup is static and their items use data-action.

import { $, $$ } from './dom.js';
import * as system from './system.js';
import { apps, activeApp, goHome } from './application.js';
import { isAlertOpen, showAlert } from './alert.js';
import { play } from './motion.js';
import { renderItems, enabledItems, moveMenuFocus } from './menu.js';

const triggers = $$('.menubar [aria-haspopup]');
let activeTrigger = null;
let menuContext = { field: null, selection: '' };

const popupFor = trigger => document.getElementById(trigger.getAttribute('aria-controls'));
const visibleTriggers = () => triggers.filter(t => t.offsetParent !== null);

const setChecked = (el, on) =>
  el.setAttribute(el.hasAttribute('aria-pressed') ? 'aria-pressed' : 'aria-checked', String(on));

const quitAll = () => Promise.all([...apps.values()].map(app => app.quit()));

async function confirmThen(title, confirm, then) {
  if (await showAlert({ title, message: 'Any open windows will close.', confirm })) then();
}

const actions = {
  appearance: mode => system.setAppearance(mode),
  'dark-mode-toggle': () => system.setAppearance(system.isDark() ? 'light' : 'dark'),
  'wifi-toggle': () => system.setWifi(!system.state.wifi),
  'wifi-join': network => system.joinNetwork(network),
  'low-power-toggle': () => system.setLowPower(!system.state.lowPower),
  'go-home': goHome,
  sleep: () => system.sleep(),
  'lock-screen': () => system.sleep(),
  restart: () => confirmThen('Are you sure you want to restart your computer now?', 'Restart', async () => {
    await quitAll();
    location.reload();
  }),
  'shut-down': () => confirmThen('Are you sure you want to shut down your computer now?', 'Shut Down', async () => {
    await quitAll();
    await system.sleep();
    location.reload();
  }),
  'log-out': () => confirmThen('Are you sure you want to quit all applications and log out now?', 'Log Out', async () => {
    await quitAll();
    $('#signout-form')?.requestSubmit();
  }),
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

function sync() {
  const { state } = system;
  $('#app-name').textContent = activeApp()?.name ?? 'Finder';
  $$('[data-needs="wifi"]').forEach(el => { el.disabled = !state.wifi; });
  $$('[data-action="appearance"]').forEach(el => setChecked(el, el.dataset.arg === state.appearance));
  $$('[data-action="dark-mode-toggle"]').forEach(el => setChecked(el, system.isDark()));
  $$('[data-action="wifi-toggle"]').forEach(el => setChecked(el, state.wifi));
  $$('[data-action="wifi-join"]').forEach(el => setChecked(el, el.dataset.arg === state.network));
  $$('[data-action="low-power-toggle"]').forEach(el => setChecked(el, state.lowPower));
  $$('#mb-wifi, .cc-toggle[data-action="wifi-toggle"]').forEach(el => el.classList.toggle('wifi-off', !state.wifi));
  $$('[data-wifi-name]').forEach(el => { el.textContent = state.wifi ? state.network : 'Off'; });
  syncBattery();
}

// What the Edit menu acts on, captured before focus moves into the menu.
function editContext() {
  const el = document.activeElement;
  const field = el?.matches('input:not([type="hidden"], [type="range"], [type="checkbox"]), textarea') ? el : null;
  return { field, selection: getSelection().toString() };
}

function openMenu(trigger, focusFirst) {
  if (activeTrigger === trigger) return;
  if (!activeTrigger) menuContext = editContext();
  closeMenus();
  sync();
  const popup = popupFor(trigger);
  const kind = trigger.dataset.menu;
  if (kind) popup.replaceChildren(...renderItems(activeApp().menu(kind, menuContext), () => closeMenus()));
  popup.getAnimations().forEach(a => a.cancel());
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
  const action = e.target.closest('[data-action]');
  if (action && !action.disabled) actions[action.dataset.action]?.(action.dataset.arg);
  if (!activeTrigger) return;
  const inMenu = e.target.closest('.mb-menu');
  const chose = e.target.closest('[data-action], [data-open], a[href]');
  if (!inMenu || e.target === popupFor(activeTrigger) || (chose && !chose.hasAttribute('data-keep-open'))) closeMenus();
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
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && activeTrigger && !isAlertOpen()) closeMenus({ restoreFocus: true });
  });
  document.addEventListener('os:windows', sync);
  document.addEventListener('os:system', sync);
  sync();
}
