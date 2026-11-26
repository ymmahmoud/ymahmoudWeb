// Window mechanics: stacking, placement, dragging, resizing, and the open, close,
// minimize, zoom, fill, center and full screen transitions. Which app a window belongs
// to, and what happens to that app when its windows change, is Application's job.

import { $, $$ } from './dom.js';
import { play, setVars } from './motion.js';
import * as dock from './dock.js';

const desktop = $('#desktop');
export const phone = matchMedia('(max-width: 700px)');
const interactive = 'button, a, input, textarea, select, label';
const minWidth = 300;
const minHeight = 200;
const edges = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];

let z = 10;
let cascade = 0;

const changed = () => document.dispatchEvent(new CustomEvent('os:windows'));

export class AppWindow {
  constructor(el) {
    this.el = el;
    this.id = el.id.slice(4);
    this.appId = el.dataset.app;
    this.fixed = el.hasAttribute('data-fixed');
    this.state = 'closed';
    this.app = null;
    this.restoreFullScreenDocument = false;
  }

  get title() { return $('.titlebar h2', this.el).textContent; }
  get z() { return +this.el.style.zIndex || 0; }
  get onScreen() { return this.state === 'open' && !this.app?.hidden; }
  get fullScreen() { return this.el.classList.contains('fullscreen'); }
  get busy() { return /\bis-(closing|sending|minimizing|restoring)\b/.test(this.el.className); }

  setState(state) {
    this.state = state;
    this.el.classList.toggle('open', state === 'open');
    changed();
  }

  raise() {
    if (this.z === z) return;
    this.el.style.zIndex = ++z;
    changed();
  }

  focus() {
    ($('[data-autofocus]', this.el) || this.el).focus({ preventScroll: true });
  }

  place() {
    if (this.placed) return;
    this.placed = true;
    const off = (cascade++ % 6) * 28;
    const left = (desktop.clientWidth - this.el.offsetWidth) / 2 - 80 + off;
    const top = 30 + off;
    this.el.style.left = clamp(left, 8, desktop.clientWidth - this.el.offsetWidth - 8) + 'px';
    this.el.style.top = clamp(top, 8, desktop.clientHeight - this.el.offsetHeight - 110) + 'px';
  }

  // Shows the window: opens it, restores it from the Dock, or just brings it forward.
  show() {
    if (fullScreenWindow && fullScreenWindow !== this) fullScreenWindow.exitFullScreen();
    const previous = this.state;
    this.setState('open');
    if (previous === 'closed') this.place();
    this.raise();
    this.focus();
    if (previous === 'closed') return play(this.el, 'is-opening');
    if (previous === 'minimized') return this.restore();
    return Promise.resolve();
  }

  async restore() {
    const tile = dock.minimizedTile(this.id);
    if (tile) {
      this.genieTo(tile.getBoundingClientRect());
      tile.closest('li').classList.add('is-leaving');
    }
    await play(this.el, 'is-restoring');
    dock.removeMinimized(this.id);
  }

  async close(animation = 'is-closing') {
    if (this.state === 'minimized') {
      dock.removeMinimized(this.id);
      this.setState('closed');
      return;
    }
    if (this.state !== 'open' || this.busy) return;
    if (this.fullScreen) this.exitFullScreen();
    await play(this.el, animation);
    this.el.classList.remove('max');
    this.setState('closed');
  }

  async minimize() {
    if (this.state !== 'open' || this.busy) return;
    if (this.fullScreen) this.exitFullScreen();
    const tile = dock.addMinimized(this, () => this.app.open(this.id));
    this.genieTo((tile ?? dock.tile(this.appId)).getBoundingClientRect());
    await play(this.el, 'is-minimizing');
    this.setState('minimized');
    dock.showMinimized(this.id);
  }

  genieTo(target) {
    const win = this.el.getBoundingClientRect();
    const half = target.width / 2;
    const center = target.left + half - win.left;
    setVars(this.el, {
      'genie-l': ((center - half) / win.width) * 100,
      'genie-r': ((center + half) / win.width) * 100,
      'genie-stretch': Math.max(1, (target.bottom - win.top) / win.height),
      'genie-dy': `${target.top - win.top}px`,
      'genie-sy': target.height / win.height,
    });
  }

  // Animates from the current frame to whatever frame `change` produces.
  morph(change) {
    const before = this.el.getBoundingClientRect();
    change();
    const after = this.el.getBoundingClientRect();
    setVars(this.el, {
      'zoom-x': `${before.left - after.left}px`,
      'zoom-y': `${before.top - after.top}px`,
      'zoom-sx': before.width / after.width,
      'zoom-sy': before.height / after.height,
    });
    play(this.el, 'is-zooming');
  }

  get canResize() { return !this.fixed && !phone.matches && this.state === 'open'; }

  zoom() {
    if (!this.canResize || this.fullScreen) return;
    this.morph(() => this.el.classList.toggle('max'));
  }

  fill() {
    if (!this.canResize || this.fullScreen || this.el.classList.contains('max')) return;
    this.morph(() => this.el.classList.add('max'));
  }

  center() {
    if (this.state !== 'open' || phone.matches || this.fullScreen) return;
    this.morph(() => {
      this.el.classList.remove('max');
      this.el.style.left = Math.max(8, (desktop.clientWidth - this.el.offsetWidth) / 2) + 'px';
      this.el.style.top = Math.max(8, (desktop.clientHeight - this.el.offsetHeight) / 2 - 40) + 'px';
    });
  }

  toggleFullScreen() {
    if (this.fullScreen) this.exitFullScreen();
    else this.enterFullScreen();
  }

  enterFullScreen() {
    if (!this.canResize || this.fullScreen) return;
    fullScreenWindow?.exitFullScreen();
    fullScreenWindow = this;
    this.morph(() => this.el.classList.add('fullscreen'));
    document.body.classList.add('has-fullscreen');
    // Fill the real screen too, when the browser allows it.
    if (document.fullscreenEnabled && !document.fullscreenElement) {
      this.restoreFullScreenDocument = true;
      document.documentElement.requestFullscreen().catch(() => { this.restoreFullScreenDocument = false; });
    }
    changed();
  }

  exitFullScreen() {
    if (!this.fullScreen) return;
    fullScreenWindow = null;
    this.morph(() => this.el.classList.remove('fullscreen'));
    document.body.classList.remove('has-fullscreen');
    if (this.restoreFullScreenDocument && document.fullscreenElement) document.exitFullscreen().catch(() => {});
    this.restoreFullScreenDocument = false;
    changed();
  }
}

let fullScreenWindow = null;

export const windows = new Map($$('.window').map(el => {
  const w = new AppWindow(el);
  return [w.id, w];
}));

export function frontWindow() {
  let top = null;
  windows.forEach(w => { if (w.onScreen && (!top || w.z > top.z)) top = w; });
  return top;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
}

function draggable(w, handle) {
  handle.addEventListener('pointerdown', e => {
    if (e.button !== 0 || e.target.closest(interactive) || phone.matches || w.fullScreen) return;
    e.preventDefault();
    const el = w.el;
    if (el.classList.contains('max')) {
      // Dragging a zoomed window restores its size under the pointer, as on macOS.
      const ratio = (e.clientX - el.offsetLeft) / el.offsetWidth;
      el.classList.remove('max');
      el.style.left = e.clientX - el.offsetWidth * ratio + 'px';
      el.style.top = Math.max(0, e.clientY - desktop.getBoundingClientRect().top - handle.offsetHeight / 2) + 'px';
    }
    const sx = e.clientX, sy = e.clientY, ox = el.offsetLeft, oy = el.offsetTop;
    handle.setPointerCapture(e.pointerId);
    const move = ev => {
      el.style.left = clamp(ox + ev.clientX - sx, 80 - el.offsetWidth, desktop.clientWidth - 80) + 'px';
      el.style.top = clamp(oy + ev.clientY - sy, 0, desktop.clientHeight - 60) + 'px';
    };
    trackPointer(handle, move);
  });
}

function resizable(w) {
  if (w.fixed) return;
  edges.forEach(edge => {
    const handle = document.createElement('div');
    handle.className = `resize resize--${edge}`;
    handle.setAttribute('aria-hidden', 'true');
    w.el.append(handle);
    handle.addEventListener('pointerdown', e => {
      if (e.button !== 0 || !w.canResize || w.fullScreen) return;
      e.preventDefault();
      e.stopPropagation();
      const el = w.el;
      const start = { x: e.clientX, y: e.clientY, left: el.offsetLeft, top: el.offsetTop, width: el.offsetWidth, height: el.offsetHeight };
      el.classList.remove('max');
      el.classList.add('is-resizing');
      handle.setPointerCapture(e.pointerId);
      const move = ev => {
        const dx = ev.clientX - start.x;
        const dy = ev.clientY - start.y;
        if (edge.includes('e')) el.style.width = clamp(start.width + dx, minWidth, desktop.clientWidth - start.left) + 'px';
        if (edge.includes('s')) el.style.height = clamp(start.height + dy, minHeight, desktop.clientHeight - start.top) + 'px';
        if (edge.includes('w')) {
          const width = clamp(start.width - dx, minWidth, start.left + start.width);
          el.style.width = width + 'px';
          el.style.left = start.left + start.width - width + 'px';
        }
        if (edge.includes('n')) {
          const height = clamp(start.height - dy, minHeight, start.top + start.height);
          el.style.height = height + 'px';
          el.style.top = start.top + start.height - height + 'px';
        }
      };
      trackPointer(handle, move, () => el.classList.remove('is-resizing'));
    });
  });
}

function trackPointer(handle, move, done) {
  const up = () => {
    handle.removeEventListener('pointermove', move);
    handle.removeEventListener('pointerup', up);
    handle.removeEventListener('pointercancel', up);
    done?.();
  };
  handle.addEventListener('pointermove', move);
  handle.addEventListener('pointerup', up);
  handle.addEventListener('pointercancel', up);
}

// `onActivate` lets Application activate the window's app; the window manager only stacks.
export function initWindows({ onActivate }) {
  windows.forEach(w => {
    const el = w.el;
    el.tabIndex = -1;
    const activate = () => {
      if (w.state !== 'open') return;
      w.raise();
      onActivate(w);
    };
    el.addEventListener('pointerdown', activate);
    el.addEventListener('focusin', activate);
    $('.light--close', el).addEventListener('click', () => w.app.closeWindow(w));
    $('.light--min', el).addEventListener('click', () => w.minimize());
    // Green: full screen; Option-click: zoom.
    $('.light--max', el).addEventListener('click', e => (e.altKey ? w.zoom() : w.toggleFullScreen()));
    const bar = $('.titlebar', el);
    bar.addEventListener('dblclick', e => { if (!e.target.closest(interactive)) w.zoom(); });
    draggable(w, bar);
    resizable(w);
  });

  // Leaving the browser's full screen (Esc) leaves the window's full screen too.
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && fullScreenWindow?.restoreFullScreenDocument) {
      fullScreenWindow.restoreFullScreenDocument = false;
      fullScreenWindow.exitFullScreen();
    }
  });
  changed();
}
