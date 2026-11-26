// System Settings: Sign In, Appearance and Wallpaper panes. Quits with its window,
// like the real System Settings.

import { $, $$ } from '../dom.js';
import { Application } from '../application.js';
import { setWallpaper, state } from '../system.js';

class Settings extends Application {
  constructor() {
    super({ id: 'settings', name: 'System Settings', quitsWithLastWindow: true });
  }

  init() {
    this.win = $('#win-settings');
    $$('.sidebar [data-pane]', this.win).forEach(b => b.addEventListener('click', () => this.selectPane(b.dataset.pane)));
    $$('[data-wallpaper]', this.win).forEach(b => b.addEventListener('click', () => setWallpaper(b.dataset.wallpaper)));
    const syncWallpaper = () => $$('[data-wallpaper]', this.win).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.wallpaper === state.wallpaper)));
    document.addEventListener('os:system', syncWallpaper);
    syncWallpaper();
  }

  selectPane(name) {
    $$('.sidebar [data-pane]', this.win).forEach(b => b.setAttribute('aria-current', String(b.dataset.pane === name)));
    $$('.settings-pane', this.win).forEach(pane => { pane.hidden = pane.dataset.pane !== name; });
  }

  showPane(name) {
    this.selectPane(name);
    return this.open();
  }
}

export default new Settings();
