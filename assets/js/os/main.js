import { initSystem } from './system.js';
import { initDock } from './dock.js';
import { Application, register, initApplications, openWindow } from './application.js';
import { windows } from './windows.js';
import { initMenubar } from './menubar.js';
import { initContextMenu } from './contextmenu.js';
import finder from './apps/finder.js';
import notes from './apps/notes.js';
import mail from './apps/mail.js';
import preview from './apps/preview.js';
import photos from './apps/photos.js';
import terminal from './apps/terminal.js';
import phone from './apps/phone.js';
import tv from './apps/tv.js';
import settings from './apps/settings.js';

initSystem();
initDock();

// Help Viewer has no behavior of its own beyond Application's.
register(
  finder,
  notes,
  mail,
  phone,
  preview,
  photos,
  terminal,
  tv,
  settings,
  new Application({ id: 'help', name: 'Help Viewer', quitsWithLastWindow: true }),
);
initApplications();
initMenubar();
initContextMenu();

// Links such as yaseenm.com/#mail open straight to a window.
const openFromHash = () => {
  const id = location.hash.slice(1);
  if (windows.has(id)) openWindow(id);
};
window.addEventListener('hashchange', openFromHash);

const site = document.body.dataset.tv;
if (site) tv.show(site);
else notes.open();
openFromHash();
