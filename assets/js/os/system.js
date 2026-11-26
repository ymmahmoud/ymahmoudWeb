import { $ } from './dom.js';
import { play } from './motion.js';

const root = document.documentElement;

export const store = {
  get(key) {
    try { return localStorage.getItem('yos.' + key); } catch { return null; }
  },
  set(key, value) {
    try { localStorage.setItem('yos.' + key, value); } catch {}
  },
};

export const state = {
  appearance: 'auto',
  wifi: true,
  network: 'Home',
  lowPower: false,
  wallpaper: null,
  battery: null,
};

// The choices come from System Settings › Wallpaper (listed once, in index.php).
const wallpaperSource = name => document.querySelector(`[data-wallpaper="${name}"] img`)?.getAttribute('src');

const prefersDark = matchMedia('(prefers-color-scheme: dark)');
export const isDark = () => state.appearance === 'dark' || (state.appearance === 'auto' && prefersDark.matches);

const emit = () => document.dispatchEvent(new CustomEvent('os:system'));

export function setAppearance(mode) {
  if (!['auto', 'light', 'dark'].includes(mode)) return;
  state.appearance = mode;
  if (mode === 'auto') delete root.dataset.theme;
  else root.dataset.theme = mode;
  store.set('appearance', mode);
  emit();
}

export function setWifi(on) {
  state.wifi = on;
  emit();
  notify('Wi-Fi', on ? `Connected to “${state.network}”.` : 'Wi-Fi is turned off.');
}

export function joinNetwork(name) {
  if (!state.wifi || !name) return;
  state.network = name;
  emit();
  notify('Wi-Fi', `Connected to “${name}”.`);
}

const prefersLessGlass = matchMedia('(prefers-reduced-transparency: reduce)');
const prefersLessMotion = matchMedia('(prefers-reduced-motion: reduce)');

function applyAccessibility() {
  root.classList.toggle('reduce-transparency', state.lowPower || prefersLessGlass.matches);
  root.classList.toggle('reduce-motion', state.lowPower || prefersLessMotion.matches);
}

export function setLowPower(on) {
  state.lowPower = on;
  applyAccessibility();
  emit();
}

export function setBrightness(percent) {
  $('#dimmer').style.opacity = String(((100 - percent) / 100) * 0.8);
}

export function setWallpaper(name) {
  const src = wallpaperSource(name);
  if (!src) return;
  state.wallpaper = name;
  root.style.setProperty('--wallpaper-image', `url("${new URL(src, document.baseURI).href}")`);
  store.set('wallpaper', name);
  emit();
}

export function sleep() {
  const screen = $('#sleep');
  screen.hidden = false;
  return new Promise(resolve => {
    const wake = () => {
      screen.hidden = true;
      removeEventListener('pointerdown', wake, true);
      removeEventListener('keydown', wake, true);
      resolve();
    };
    setTimeout(() => {
      addEventListener('pointerdown', wake, true);
      addEventListener('keydown', wake, true);
    }, 600);
  });
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function dismiss(card) {
  if (!card.isConnected || card.classList.contains('is-leaving')) return;
  play(card, 'is-leaving').then(() => card.remove());
}

export function notify(title, body) {
  const box = $('#notifications');
  const card = document.createElement('div');
  card.className = 'notice glass glass--strong';
  const heading = document.createElement('b');
  heading.textContent = title;
  const text = document.createElement('p');
  text.textContent = body;
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'notice-close';
  close.setAttribute('aria-label', 'Dismiss notification');
  close.textContent = '×';
  close.addEventListener('click', () => dismiss(card));
  card.append(heading, close, text);
  box.prepend(card);
  [...box.children].slice(3).forEach(dismiss);
  setTimeout(() => dismiss(card), 5000);
}

function tick() {
  const now = new Date();
  const clock = $('#clock');
  clock.dateTime = now.toISOString();
  $('.clock-date', clock).textContent =
    now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).replace(',', '');
  $('.clock-time', clock).textContent = now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function renderCalendar() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const leadingBlanks = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();

  const title = document.createElement('p');
  title.className = 'calendar-month';
  title.textContent = now.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const grid = document.createElement('div');
  grid.className = 'calendar-grid';
  grid.setAttribute('role', 'presentation');
  const cell = (text, className) => {
    const span = document.createElement('span');
    if (className) span.className = className;
    span.textContent = text;
    grid.append(span);
    return span;
  };
  ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach(d => cell(d, 'dow'));
  for (let i = 0; i < leadingBlanks; i++) cell('');
  for (let day = 1; day <= days; day++) {
    const span = cell(String(day), day === now.getDate() ? 'today' : '');
    if (day === now.getDate()) span.setAttribute('aria-current', 'date');
  }
  $('#calendar').replaceChildren(title, grid);
}

async function initBattery() {
  if (!navigator.getBattery) return;
  try {
    const battery = await navigator.getBattery();
    const update = () => {
      state.battery = { level: battery.level, charging: battery.charging };
      emit();
    };
    battery.addEventListener('levelchange', update);
    battery.addEventListener('chargingchange', update);
    update();
  } catch {}
}

export function initSystem() {
  const saved = store.get('appearance');
  if (saved) setAppearance(saved);
  state.wallpaper = wallpaperSource(store.get('wallpaper')) ? store.get('wallpaper') : document.querySelector('[data-wallpaper]')?.dataset.wallpaper;
  prefersDark.addEventListener?.('change', emit);

  applyAccessibility();
  prefersLessGlass.addEventListener?.('change', applyAccessibility);
  prefersLessMotion.addEventListener?.('change', applyAccessibility);

  $('#brightness').addEventListener('input', e => setBrightness(+e.target.value));

  tick();
  setInterval(tick, 10000);
  renderCalendar();
  initBattery();
}
