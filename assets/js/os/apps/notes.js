// Notes: the note list beside the selected note.

import { $$ } from '../dom.js';
import { Application } from '../application.js';

class Notes extends Application {
  constructor() {
    super({ id: 'notes', name: 'Notes' });
  }

  get printable() { return true; }

  init() {
    const buttons = $$('.note-list button');
    const notes = $$('.note');
    const show = button => {
      buttons.forEach(b => b.setAttribute('aria-current', String(b === button)));
      notes.forEach(note => { note.hidden = note.dataset.note !== button.dataset.note; });
    };
    buttons.forEach(b => b.addEventListener('click', () => show(b)));
    show(buttons[0]);
  }
}

export default new Notes();
