// Photos: click a photo to view it larger.

import { $$ } from '../dom.js';
import { Application } from '../application.js';

class Photos extends Application {
  constructor() {
    super({ id: 'photos', name: 'Photos' });
  }

  init() {
    $$('.photo').forEach(photo => photo.addEventListener('click', () => {
      const zoomed = photo.closest('figure').classList.toggle('zoom');
      photo.setAttribute('aria-pressed', String(zoomed));
    }));
  }
}

export default new Photos();
