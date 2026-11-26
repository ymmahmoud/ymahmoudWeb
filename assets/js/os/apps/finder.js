// Finder: always running, never quits. Owns Finder windows, the Trash, the desktop,
// About YaseenOS, and opening documents in their apps.

import { $, $$ } from '../dom.js';
import { Application, apps } from '../application.js';
import { separator } from '../menu.js';
import { showAlert } from '../alert.js';
import { setTrashFull } from '../dock.js';
import { copyText, notify, store } from '../system.js';

const clamp = (value, min, max) => Math.max(min, Math.min(value, max));

class Finder extends Application {
  constructor() {
    super({ id: 'finder', name: 'Finder', canQuit: false });
  }

  get helpTitle() { return 'YaseenOS Help'; }
  get trashEmpty() { return !$('#trash-items').children.length; }

  init() {
    const win = $('#win-finder');
    const files = $$('.finder-grid li', win);
    const folders = $$('[data-folder]', win);
    const show = button => {
      folders.forEach(b => b.setAttribute('aria-current', String(b === button)));
      files.forEach(li => { li.hidden = !li.dataset.folders.split(' ').includes(button.dataset.folder); });
      $('h2', win).textContent = button.textContent;
    };
    folders.forEach(b => b.addEventListener('click', () => show(b)));
    show(folders[0]);

    // Documents open in their app on double-click, or with Return, ⌘O or ⌘↓.
    $$('[data-launch]').forEach(item => {
      item.addEventListener('dblclick', () => this.openFile(item));
      item.addEventListener('keydown', e => {
        const command = (e.metaKey || e.ctrlKey) && (e.key === 'o' || e.key === 'ArrowDown');
        if (e.key === 'Enter' || command) {
          e.preventDefault();
          this.openFile(item);
        }
      });
    });

    this.initDesktop();
    $('#empty-trash').addEventListener('click', () => this.emptyTrash());
    setTrashFull(!this.trashEmpty);
  }

  // Desktop icons start in a column at the top right and can be dragged anywhere; where
  // they end up is remembered, measured from the top-right corner.
  initDesktop() {
    const list = $('#desk-icons');
    if (!list) return;
    const desktop = $('#desktop');
    const icons = () => [...list.children];
    const key = li => li.querySelector('[data-launch]').dataset.launch;
    const place = (li, right, top) => {
      li.style.right = `${right}px`;
      li.style.top = `${top}px`;
    };
    // Switches from the CSS column to free positions, keeping each icon where it is.
    const free = () => {
      if (list.classList.contains('is-free')) return;
      const saved = JSON.parse(store.get('desktop.icons') ?? 'null') ?? {};
      const d = desktop.getBoundingClientRect();
      const rects = icons().map(li => li.getBoundingClientRect());
      list.classList.add('is-free');
      icons().forEach((li, i) => {
        const [right, top] = saved[key(li)] ?? [d.right - rects[i].right, rects[i].top - d.top];
        place(li, right, top);
      });
    };
    const save = () => {
      store.set('desktop.icons', JSON.stringify(Object.fromEntries(
        icons().map(li => [key(li), [parseFloat(li.style.right), parseFloat(li.style.top)]]))));
    };
    this.cleanUpDesktop = () => {
      list.classList.remove('is-free');
      icons().forEach(li => li.removeAttribute('style'));
      store.set('desktop.icons', 'null');
    };
    if (store.get('desktop.icons') && store.get('desktop.icons') !== 'null' && list.offsetParent) free();

    list.addEventListener('pointerdown', e => {
      const icon = e.target.closest('.desk-icon');
      if (!icon || e.button !== 0) return;
      const li = icon.parentElement;
      const sx = e.clientX, sy = e.clientY;
      let start = null;
      icon.setPointerCapture(e.pointerId);
      const move = ev => {
        const dx = ev.clientX - sx, dy = ev.clientY - sy;
        if (!start) {
          if (Math.hypot(dx, dy) < 4) return;
          free();
          start = { right: parseFloat(li.style.right), top: parseFloat(li.style.top) };
          li.classList.add('is-dragging');
        }
        place(li,
          clamp(start.right - dx, 0, desktop.clientWidth - li.offsetWidth),
          clamp(start.top + dy, 0, desktop.clientHeight - li.offsetHeight));
      };
      const up = () => {
        icon.removeEventListener('pointermove', move);
        icon.removeEventListener('pointerup', up);
        icon.removeEventListener('pointercancel', up);
        if (!start) return;
        li.classList.remove('is-dragging');
        save();
        // A drag isn't a click.
        const swallow = ev => ev.stopPropagation();
        icon.addEventListener('click', swallow, { capture: true, once: true });
        setTimeout(() => icon.removeEventListener('click', swallow, { capture: true }));
      };
      icon.addEventListener('pointermove', move);
      icon.addEventListener('pointerup', up);
      icon.addEventListener('pointercancel', up);
    });
  }

  openFile(item) {
    apps.get(item.dataset.launch)?.open();
  }

  async shareFile(item) {
    const url = new URL(location.href);
    url.hash = item.dataset.launch;
    if (navigator.share) {
      navigator.share({ url: url.href }).catch(() => {});
      return;
    }
    const copied = await copyText(url.href);
    notify(copied ? 'Link Copied' : 'Couldn’t Copy', copied ? url.href : 'Your browser blocked clipboard access.');
  }

  async emptyTrash() {
    if (this.trashEmpty) return;
    const confirmed = await showAlert({
      title: 'Are you sure you want to permanently erase the items in the Trash?',
      message: 'You can’t undo this action.',
      confirm: 'Empty Trash',
    });
    if (!confirmed) return;
    $('#trash-items').replaceChildren();
    $('#win-trash .file-table').hidden = true;
    $('#trash-empty').hidden = false;
    $('#empty-trash').disabled = true;
    setTrashFull(false);
  }

  appItems() {
    return [{ label: 'Empty Trash…', run: this.trashEmpty ? null : () => this.emptyTrash() }];
  }

  fileItems() {
    return [{ label: 'New Finder Window', run: () => this.open('finder') }];
  }

  dockItems() {
    return this.fileItems();
  }

  fileMenu(item) {
    return [
      { label: 'Open', run: () => this.openFile(item) },
      separator,
      { label: 'Share…', run: () => this.shareFile(item) },
    ];
  }

  trashMenu() {
    return [
      { label: 'Open', run: () => this.open('trash') },
      separator,
      { label: 'Empty Trash…', run: this.trashEmpty ? null : () => this.emptyTrash() },
    ];
  }

  desktopMenu() {
    const arranged = $('#desk-icons')?.classList.contains('is-free');
    return [
      { label: 'Change Wallpaper…', run: () => apps.get('settings').showPane('wallpaper') },
      separator,
      { label: 'Clean Up', run: arranged ? () => this.cleanUpDesktop() : null },
    ];
  }
}

export default new Finder();
