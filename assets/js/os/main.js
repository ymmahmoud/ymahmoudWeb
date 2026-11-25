import { initSystem } from './system.js';
import { initDock } from './dock.js';
import { initWindows, openApp, wins } from './windows.js';
import { initApps } from './apps.js';
import { initSafari, visit } from './safari.js';
import { initTerminal } from './terminal.js';
import { initMenubar } from './menubar.js';
import { initContextMenu } from './contextmenu.js';

initSystem();
initDock();
initWindows();
initApps();
initSafari();
initTerminal();
initMenubar();
initContextMenu();

const openFromHash = () => {
  const id = location.hash.slice(1);
  if (wins.has(id)) openApp(id);
};

window.addEventListener('hashchange', openFromHash);

const site = document.body.dataset.safari;
if (site) visit(site);
else openApp('notes');
openFromHash();
