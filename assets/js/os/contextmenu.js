// Context menus: right-click, Control-click, the context menu key and long-press.
// The items come from whoever owns the target: a file's app, a Dock app, or Finder.

import { $ } from './dom.js';
import { play } from './motion.js';
import { apps } from './application.js';
import { closeMenus } from './menubar.js';
import { renderItems, enabledItems, moveMenuFocus } from './menu.js';

const menu = $('#context-menu');
const edge = 6;
const phone = matchMedia('(max-width: 700px)');
const longPressMs = 500;
const longPressSlop = 10;
let suppressClick = false;

function itemsFor(target) {
  const finder = apps.get('finder');
  const file = target.closest('[data-launch]');
  if (file) return { items: finder.fileMenu(file), anchor: file };

  const homeApp = target.closest('.home-app');
  if (homeApp) {
    const items = apps.get(homeApp.dataset.app)?.dockItems() ?? [];
    return items.length ? { items, anchor: homeApp } : null;
  }

  const dockItem = target.closest('.dock-item');
  if (dockItem) {
    if (dockItem.dataset.app === 'trash') return { items: finder.trashMenu(), anchor: dockItem, above: true };
    const app = apps.get(dockItem.dataset.app);
    return app ? { items: app.dockMenu(), anchor: dockItem, above: true } : null;
  }

  if (target.closest('#desktop') && !target.closest('.window, .home-screen')) return { items: finder.desktopMenu() };
  return null;
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
  menu.replaceChildren(...renderItems(found.items, closeContextMenu));
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
  document.addEventListener('pointerdown', e => { if (!menu.contains(e.target)) closeContextMenu(); });
  window.addEventListener('blur', closeContextMenu);
  window.addEventListener('resize', closeContextMenu);
  watchLongPress();
}
