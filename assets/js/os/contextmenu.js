import { $ } from './dom.js';
import { play } from './motion.js';
import * as windows from './windows.js';
import { trashIsEmpty } from './apps.js';
import { closeMenus, enabledItems, moveMenuFocus, sync } from './menubar.js';

const menu = $('#context-menu');
const edge = 6;
const phone = matchMedia('(max-width: 700px)');
const longPressMs = 500;
const longPressSlop = 10;
let suppressClick = false;

const separator = '-';

function fileItems(launcher) {
  const app = launcher.dataset.launch;
  return [
    { label: 'Open', open: app },
    separator,
    { label: 'Copy Link', action: 'copy-link', arg: app },
  ];
}

function dockItems(app) {
  if (app === 'trash') {
    return [
      { label: 'Open', open: 'trash' },
      separator,
      { label: 'Empty Trash', action: 'empty-trash', disabled: trashIsEmpty() },
    ];
  }
  const open = windows.appWindows(app);
  if (!open.length) return [{ label: 'Open', open: app }];
  return [
    ...open.map(({ id, title }) => ({ label: title, open: id, role: 'menuitemradio', windowItem: id })),
    separator,
    { label: 'Show All Windows', action: 'show-all', needs: 'minimized' },
    { label: 'Hide', action: 'hide-app', arg: app },
    { label: 'Quit', action: 'quit-app', arg: app },
  ];
}

const desktopItems = () => [
  { label: 'About YaseenOS', open: 'sysinfo' },
  separator,
  { label: 'Show Desktop Icons', action: 'toggle-icons', role: 'menuitemcheckbox' },
  { label: 'Enter Full Screen', action: 'fullscreen', needs: 'fullscreen', fullscreenLabel: '' },
  separator,
  { label: 'New Message', open: 'compose' },
];

function itemsFor(target) {
  const launcher = target.closest('[data-launch]');
  if (launcher) return { items: fileItems(launcher), anchor: launcher };
  const homeApp = target.closest('.home-app');
  if (homeApp) return { items: dockItems(homeApp.dataset.open), anchor: homeApp };
  const dockItem = target.closest('.dock-item');
  if (dockItem) return { items: dockItems(dockItem.dataset.app), anchor: dockItem, above: true };
  if (target.closest('#desktop') && !target.closest('.window')) return { items: desktopItems() };
  return null;
}

function render(items) {
  return items.map(item => {
    if (item === separator) return document.createElement('hr');
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('role', item.role ?? 'menuitem');
    if (item.role) button.setAttribute('aria-checked', 'false');
    button.textContent = item.label;
    button.disabled = !!item.disabled;
    ['open', 'action', 'arg', 'needs', 'windowItem', 'fullscreenLabel']
      .filter(key => key in item)
      .forEach(key => { button.dataset[key] = item[key]; });
    return button;
  });
}

function place({ x, y, anchor, above }) {
  const { width, height } = menu.getBoundingClientRect();
  let origin = [x, y];
  if (anchor && above) {
    const r = anchor.getBoundingClientRect();
    origin = [r.left + r.width / 2, r.top];
    x = origin[0] - width / 2;
    y = r.top - height - edge;
  } else if (anchor && ((!x && !y) || phone.matches)) {
    const r = anchor.getBoundingClientRect();
    origin = [r.left, r.bottom];
    x = r.left;
    y = r.bottom + edge;
  }
  if (y + height > innerHeight - edge) y = (anchor ? anchor.getBoundingClientRect().top - edge : y) - height;
  const left = Math.max(edge, Math.min(x, innerWidth - width - edge));
  const top = Math.max(edge, Math.min(y, innerHeight - height - edge));
  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
  menu.style.setProperty('--origin', `${origin[0] - left}px ${origin[1] - top}px`);
}

export function closeContextMenu() {
  if (menu.hidden || menu.classList.contains('is-closing')) return;
  play(menu, 'is-closing').then(() => { menu.hidden = true; });
}

function open(target, x, y, focusFirst) {
  const found = itemsFor(target);
  if (!found) return false;
  closeMenus();
  menu.getAnimations().forEach(a => a.cancel());
  menu.classList.remove('is-closing');
  menu.replaceChildren(...render(found.items));
  sync();
  menu.hidden = false;
  place({ x, y, anchor: found.anchor, above: found.above });
  play(menu, 'is-opening');
  if (focusFirst) enabledItems(menu)[0]?.focus();
  else menu.focus({ preventScroll: true });
  return true;
}

function onContextMenu(e) {
  const fromKeyboard = e.button !== 2 && !e.clientX && !e.clientY;
  if (open(e.target, e.clientX, e.clientY, fromKeyboard)) e.preventDefault();
  else closeContextMenu();
}

function onMenuKeydown(e) {
  if (e.key === 'Escape' || e.key === 'Tab') {
    e.stopPropagation();
    closeContextMenu();
  } else if (!moveMenuFocus(menu, e.key)) {
    return;
  }
  e.preventDefault();
}

function watchLongPress() {
  document.addEventListener('pointerdown', e => {
    suppressClick = false;
    if (e.pointerType !== 'touch') return;
    const { target, clientX: x, clientY: y } = e;
    const timer = setTimeout(() => {
      stop();
      if (open(target, x, y, false)) suppressClick = true;
    }, longPressMs);
    const onMove = ev => { if (Math.hypot(ev.clientX - x, ev.clientY - y) > longPressSlop) stop(); };
    const stop = () => {
      clearTimeout(timer);
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', stop);
      document.removeEventListener('pointercancel', stop);
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', stop);
    document.addEventListener('pointercancel', stop);
  });
  document.addEventListener('click', e => {
    if (!suppressClick) return;
    suppressClick = false;
    if (!menu.contains(e.target)) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }, true);
}

export function initContextMenu() {
  menu.tabIndex = -1;
  document.addEventListener('contextmenu', onContextMenu);
  menu.addEventListener('keydown', onMenuKeydown);
  menu.addEventListener('click', e => { if (e.target.closest('[role^="menuitem"]')) closeContextMenu(); });
  document.addEventListener('pointerdown', e => { if (!menu.contains(e.target)) closeContextMenu(); });
  window.addEventListener('blur', closeContextMenu);
  window.addEventListener('resize', closeContextMenu);
  watchLongPress();
}
