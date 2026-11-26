// Phone: Recents (the résumé as a call history, built in index.php) and the selected
// contact's card. On iPhone the card pushes over the list.

import { $, $$ } from '../dom.js';
import { Application } from '../application.js';

class Phone extends Application {
  constructor() {
    super({ id: 'phone', name: 'Phone' });
  }

  init() {
    this.view = $('#win-phone .phone-app');
    this.rows = $$('.call-row', this.view);
    this.rows.forEach(row => {
      row.addEventListener('click', () => this.select(row.dataset.contact, { push: true }));
      // Up and Down move through the list, as in a Mac sidebar.
      row.addEventListener('keydown', e => {
        if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
        e.preventDefault();
        const next = this.rows[this.rows.indexOf(row) + (e.key === 'ArrowUp' ? -1 : 1)];
        if (!next) return;
        next.focus();
        this.select(next.dataset.contact);
      });
    });
    $('[data-phone-back]', this.view).addEventListener('click', () => { this.view.dataset.view = 'list'; });
  }

  select(contact, { push = false } = {}) {
    this.rows.forEach(row => row.setAttribute('aria-current', String(row.dataset.contact === contact)));
    $$('.contact-card', this.view).forEach(card => { card.hidden = card.dataset.contact !== contact; });
    $('.phone-detail', this.view).scrollTop = 0;
    if (push) this.view.dataset.view = 'detail';
  }
}

export default new Phone();
