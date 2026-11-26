// Application: everything every app shares. Launching, reopening from the Dock,
// hiding, quitting, the standard menus (app, File, Edit, View, Window, Help) and the
// Dock menu live here. Each app in apps/ subclasses it and adds only its own items
// and behavior through the hooks at the bottom of the class.
//
// The workspace functions after the class track which app is active (the one named in
// the menu bar), as macOS does: Finder is always running and becomes active when you
// click the desktop or when the active app quits or hides.

import { $ } from './dom.js';
import { windows, frontWindow, initWindows } from './windows.js';
import * as dock from './dock.js';
import { separator, tidy } from './menu.js';
import { showAlert } from './alert.js';
import { copyText } from './system.js';

export const apps = new Map();
let active = null;

const changed = () => document.dispatchEvent(new CustomEvent('os:windows'));
const byStacking = (a, b) => a.z - b.z;

export class Application {
  constructor({ id, name, defaultWindow = id, quitsWithLastWindow = false, canQuit = true }) {
    this.id = id;
    this.name = name;
    this.defaultWindow = defaultWindow;
    this.quitsWithLastWindow = quitsWithLastWindow;
    this.canQuit = canQuit;
    this.running = !canQuit;
    this.hidden = false;
    this.windows = [];
  }

  get openWindows() { return this.windows.filter(w => w.state !== 'closed'); }
  get onScreenWindows() { return this.windows.filter(w => w.onScreen).sort(byStacking); }
  get frontWindow() { return this.onScreenWindows.at(-1) ?? null; }
  get isActive() { return active === this; }

  launch() {
    if (this.running) return;
    this.running = true;
    dock.bounce(this.id);
    changed();
  }

  // Opens (or brings forward) one of this app's windows and makes the app active.
  open(windowId = this.defaultWindow) {
    const w = windows.get(windowId);
    if (w?.app !== this) return Promise.resolve();
    this.launch();
    this.unhide();
    activate(this);
    return w.show();
  }

  // Clicking the app in the Dock: launch it, or unhide it and bring all of its windows
  // forward, or restore its last minimized window, or open a new window.
  reopen() {
    this.launch();
    this.unhide();
    const onScreen = this.onScreenWindows;
    if (onScreen.length) {
      onScreen.forEach(w => w.raise());
      onScreen.at(-1).focus();
      activate(this);
      return Promise.resolve();
    }
    const minimized = this.windows.filter(w => w.state === 'minimized');
    return this.open(minimized.at(-1)?.id ?? this.defaultWindow);
  }

  hide() {
    if (this.hidden || !this.running) return;
    this.hidden = true;
    this.windows.forEach(w => w.el.classList.add('app-hidden'));
    if (this.isActive) activateFrontmost();
    changed();
  }

  unhide() {
    if (!this.hidden) return;
    this.hidden = false;
    this.windows.forEach(w => w.el.classList.remove('app-hidden'));
    changed();
  }

  async quit() {
    if (!this.canQuit || !this.running) return;
    await Promise.all(this.openWindows.map(w => w.close()));
    this.unhide();
    this.running = false;
    this.didQuit();
    if (this.isActive) activateFrontmost();
    changed();
  }

  // Closing a window leaves the app running (and active) unless it's a single-window
  // utility such as System Settings, which quits with its last window.
  async closeWindow(w) {
    await w.close();
    if (this.quitsWithLastWindow && !this.openWindows.length) await this.quit();
  }

  about() {
    showAlert({ title: this.name, message: 'Version 27.0', cancel: null });
  }

  menu(kind, context) {
    const front = this.frontWindow;
    switch (kind) {
      case 'app': {
        const others = [...apps.values()].filter(a => a !== this && a.running && !a.hidden);
        return tidy([
          { label: `About ${this.name}`, run: () => this.about() },
          separator,
          ...this.appItems(),
          separator,
          { label: `Hide ${this.name}`, run: () => this.hide() },
          { label: 'Hide Others', run: others.length ? hideOthers : null },
          { label: 'Show All', run: [...apps.values()].some(a => a.hidden) ? showAll : null },
          this.canQuit && separator,
          this.canQuit && { label: `Quit ${this.name}`, run: () => this.quit() },
        ]);
      }
      case 'file':
        return tidy([
          ...this.fileItems(),
          separator,
          { label: 'Close Window', run: front && (() => this.closeWindow(front)) },
          this.printable && separator,
          this.printable && { label: 'Print…', run: front && (() => window.print()) },
        ]);
      case 'edit':
        return tidy([...editItems(context, front), ...this.editItems()]);
      case 'view':
        return tidy([
          ...this.viewItems(),
          separator,
          {
            label: front?.fullScreen ? 'Exit Full Screen' : 'Enter Full Screen',
            run: front && !front.fixed && (() => front.toggleFullScreen()),
          },
        ]);
      case 'window': {
        const resizable = front && !front.fixed;
        return tidy([
          { label: 'Minimize', run: front && (() => front.minimize()) },
          { label: 'Zoom', run: resizable && (() => front.zoom()) },
          { label: 'Fill', run: resizable && (() => front.fill()) },
          { label: 'Center', run: front && (() => front.center()) },
          separator,
          { label: 'Bring All to Front', run: this.onScreenWindows.length ? () => this.reopen() : null },
          separator,
          ...this.windowList(),
        ]);
      }
      case 'help':
        return tidy([
          { label: this.helpTitle, run: () => apps.get('help')?.open() },
          ...this.helpItems(),
        ]);
      default:
        return [];
    }
  }

  windowList() {
    const front = this.frontWindow;
    return this.openWindows.map(w => ({
      label: w.title,
      checked: w === front,
      minimized: w.state === 'minimized',
      run: () => this.open(w.id),
    }));
  }

  dockMenu() {
    if (!this.running) return [{ label: 'Open', run: () => this.reopen() }];
    return tidy([
      ...this.windowList(),
      separator,
      ...this.dockItems(),
      separator,
      { label: this.hidden ? 'Show' : 'Hide', run: () => (this.hidden ? this.reopen() : this.hide()) },
      this.canQuit && { label: 'Quit', run: () => this.quit() },
    ]);
  }

  updateBadge() {
    dock.setBadge(this.id, this.badge);
  }

  // Hooks for each app. Defaults add nothing.
  init() {}
  didQuit() {}
  get badge() { return 0; }
  get printable() { return false; }
  get helpTitle() { return `${this.name} Help`; }
  appItems() { return []; }
  fileItems() { return []; }
  editItems() { return []; }
  viewItems() { return []; }
  helpItems() { return []; }
  dockItems() { return []; }
}

// Edit menu items. `context` is captured when the menu opens, because choosing an item
// moves focus to the menu: { selection, field } where field is the focused text field.
function editItems({ selection, field }, front) {
  const fieldSelection = field ? field.value.slice(field.selectionStart, field.selectionEnd) : '';
  const inField = command => () => {
    field.focus();
    document.execCommand(command);
  };
  return [
    { label: 'Undo', run: field && inField('undo') },
    { label: 'Redo', run: field && inField('redo') },
    separator,
    { label: 'Cut', run: fieldSelection && !field.readOnly ? inField('cut') : null },
    { label: 'Copy', run: fieldSelection || selection ? () => copyText(fieldSelection || selection) : null },
    {
      label: 'Paste',
      run: field && !field.readOnly && navigator.clipboard?.readText
        ? () => navigator.clipboard.readText().then(text => {
          field.focus();
          document.execCommand('insertText', false, text);
        }).catch(() => {})
        : null,
    },
    {
      label: 'Select All',
      run: field ? () => { field.focus(); field.select(); } : front && (() => selectContents($('.window-body', front.el))),
    },
  ];
}

function selectContents(node) {
  const range = document.createRange();
  range.selectNodeContents(node);
  getSelection().removeAllRanges();
  getSelection().addRange(range);
}

export const activeApp = () => active;

export function activate(app) {
  if (!app || active === app) return;
  active = app;
  changed();
}

function activateFrontmost() {
  activate(frontWindow()?.app ?? apps.get('finder'));
}

export function hideOthers() {
  apps.forEach(app => { if (app !== active) app.hide(); });
}

export function showAll() {
  apps.forEach(app => app.unhide());
}

export function openWindow(id) {
  return windows.get(id)?.app.open(id);
}

// iOS: the home indicator sends every app to the background.
export function goHome() {
  windows.forEach(w => { if (w.onScreen) w.minimize(); });
  activate(apps.get('finder'));
}

export function register(...list) {
  list.forEach(app => {
    apps.set(app.id, app);
    app.windows = [...windows.values()].filter(w => w.appId === app.id);
    app.windows.forEach(w => { w.app = app; });
  });
}

export function initApplications() {
  active = apps.get('finder');
  initWindows({ onActivate: w => activate(w.app) });
  apps.forEach(app => {
    app.init();
    app.updateBadge();
  });

  // [data-open] opens a particular window; Dock and Home Screen icons reopen their app.
  document.addEventListener('click', e => {
    const opener = e.target.closest('[data-open]');
    if (opener && !opener.disabled) {
      openWindow(opener.dataset.open);
      return;
    }
    const icon = e.target.closest('button[data-app]');
    if (icon) apps.get(icon.dataset.app)?.reopen();
  });

  // Clicking the desktop itself makes Finder active.
  $('#desktop').addEventListener('pointerdown', e => {
    if (!e.target.closest('.window')) activate(apps.get('finder'));
  });

  document.addEventListener('os:windows', () => {
    dock.setRunning(new Set([...apps.values()].filter(a => a.running).map(a => a.id)));
  });
  changed();
}
