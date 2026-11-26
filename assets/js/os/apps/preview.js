// Preview: shows the résumé. Everything else is standard Application behavior.

import { Application } from '../application.js';

class Preview extends Application {
  constructor() {
    super({ id: 'preview', name: 'Preview' });
  }

  get printable() { return true; }
}

export default new Preview();
