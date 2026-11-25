import { $, $$ } from './dom.js';
import { openApp } from './windows.js';
import { copyText, notify } from './system.js';
import { play } from './motion.js';

const win = $('#win-safari');
const address = $('#safari-url');
const pages = $$('.safari-page', win);
const visited = [];
let position = -1;

const control = name => $(`[data-safari="${name}"]`, win);
const pageFor = site => pages.find(page => page.dataset.site === site);
const current = () => visited[position] ?? pages[0];

function render(page) {
  pages.forEach(p => { p.hidden = p !== page; });
  address.value = page.dataset.url;
  $('#t-safari').textContent = page.dataset.title;
  control('back').disabled = position <= 0;
  control('forward').disabled = position >= visited.length - 1;
  win.querySelector('.window-body').scrollTop = 0;
  play(page, 'is-loading');
  play($('#safari-progress'), 'is-loading');
}

export function visit(site) {
  const page = pageFor(site);
  if (!page) return;
  if (current() !== page || position < 0) {
    visited.splice(position + 1);
    visited.push(page);
    position = visited.length - 1;
  }
  openApp('safari');
  render(page);
}

function step(offset) {
  const next = position + offset;
  if (next < 0 || next >= visited.length) return;
  position = next;
  render(visited[position]);
}

function go(text) {
  const query = text.trim();
  const known = pages.find(page => query.toLowerCase().includes(page.dataset.url));
  if (known) {
    visit(known.dataset.site);
  } else if (query) {
    const url = /^[\w-]+(\.[\w-]+)+(\/.*)?$/.test(query) ? `https://${query}` : query;
    const target = /^https?:\/\//.test(url) ? url : `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    window.open(target, '_blank', 'noopener');
    address.value = current().dataset.url;
  }
  address.blur();
}

export function initSafari() {
  control('back').addEventListener('click', () => step(-1));
  control('forward').addEventListener('click', () => step(1));
  control('reload').addEventListener('click', () => render(current()));
  control('share').addEventListener('click', async () => {
    const url = `https://${current().dataset.url}`;
    const copied = await copyText(url);
    notify(copied ? 'Link Copied' : 'Couldn’t Copy', copied ? url : 'Your browser blocked clipboard access.');
  });

  $('#safari-address').addEventListener('submit', e => {
    e.preventDefault();
    go(address.value);
  });
  address.addEventListener('focus', () => address.select());
  address.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      address.value = current().dataset.url;
      address.blur();
    }
  });

  $$('[data-safari-go]', win).forEach(link => link.addEventListener('click', e => {
    e.preventDefault();
    visit(link.dataset.safariGo);
  }));
}
