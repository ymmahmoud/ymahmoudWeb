// TV: Home (Jellyfin), Requests (Seerr) and Donate sections, and sharing the current
// section's link. The window is only on the page for signed-in people and the TV,
// Watch and Donate pages.

import { $, $$ } from '../dom.js';
import { Application } from '../application.js';
import { copyText, notify } from '../system.js';
import { play } from '../motion.js';

class TV extends Application {
  constructor() {
    super({ id: 'tv', name: 'TV' });
  }

  get sections() { return $$('.tv-section', this.win); }

  init() {
    this.win = $('#win-tv');
    if (!this.win) return;
    this.current = this.sections[0];
    $$('[data-tv-tab]', this.win).forEach(tab => tab.addEventListener('click', () => this.show(tab.dataset.tvTab)));
    $$('[data-tv-go]', this.win).forEach(link => link.addEventListener('click', e => {
      e.preventDefault();
      this.show(link.dataset.tvGo);
    }));
    $('[data-tv="share"]', this.win).addEventListener('click', () => this.copyLink());
  }

  // Opens TV at a section: 'tv', 'watch' or 'donate'.
  show(site) {
    const section = this.sections.find(s => s.dataset.site === site);
    if (!section) return;
    this.open();
    if (section === this.current) return;
    this.current = section;
    this.sections.forEach(s => { s.hidden = s !== section; });
    $$('[data-tv-tab]', this.win).forEach(tab => tab.setAttribute('aria-current', String(tab.dataset.tvTab === site)));
    $('.tv-content', this.win).scrollTop = 0;
    play(section, 'is-entering');
  }

  async copyLink() {
    const url = `https://${this.current.dataset.url}`;
    const copied = await copyText(url);
    notify(copied ? 'Link Copied' : 'Couldn’t Copy', copied ? url : 'Your browser blocked clipboard access.');
  }

  fileItems() {
    return this.win ? [{ label: 'Copy Link', run: () => this.copyLink() }] : [];
  }
}

export default new TV();
