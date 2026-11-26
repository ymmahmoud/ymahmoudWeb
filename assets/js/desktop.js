// YaseenOS window manager: windows, dock, menu bar, clock and terminal.
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  const desktop = $('#desktop');
  const appName = $('#app-name');
  const phone = matchMedia('(max-width: 700px)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const wins = new Map($$('.window').map(w => [w.id.slice(4), w]));
  let z = 10;
  let cascade = 0;

  const dockItem = id => $(`.dock li[data-app="${id}"]`);
  const isOpen = w => w.classList.contains('open');

  function topWindow() {
    return [...wins.values()].filter(isOpen).sort((a, b) => b.style.zIndex - a.style.zIndex)[0];
  }

  function syncFocus() {
    const top = topWindow();
    appName.textContent = top ? top.dataset.title : 'Desktop';
    wins.forEach(w => w.classList.toggle('focused', w === top));
  }

  function raise(w) {
    if (w.style.zIndex != z) w.style.zIndex = ++z;
    syncFocus();
  }

  // First time a window opens, cascade it near the middle of the desktop.
  function place(w) {
    if (w.dataset.placed) return;
    w.dataset.placed = '1';
    const dw = desktop.clientWidth;
    const dh = desktop.clientHeight;
    const off = (cascade++ % 6) * 28;
    const left = (dw - w.offsetWidth) / 2 - 80 + off;
    const top = 30 + off;
    w.style.left = Math.max(8, Math.min(left, dw - w.offsetWidth - 8)) + 'px';
    w.style.top = Math.max(8, Math.min(top, dh - w.offsetHeight - 100)) + 'px';
  }

  function openApp(id) {
    const w = wins.get(id);
    if (!w) return;
    w.getAnimations().forEach(a => a.cancel());
    w.classList.add('open');
    place(w);
    raise(w);
    dockItem(id)?.classList.add('running');
    ($('[data-autofocus]', w) || w).focus({ preventScroll: true });
  }

  function closeApp(id) {
    const w = wins.get(id);
    w.classList.remove('open', 'max');
    dockItem(id)?.classList.remove('running');
    syncFocus();
  }

  // Minimize keeps the app "running" (dock dot stays) and shrinks it into its dock tile.
  function minimizeApp(id) {
    const w = wins.get(id);
    const tile = dockItem(id);
    const done = () => { w.classList.remove('open'); syncFocus(); };
    if (!tile || reduced.matches) return done();
    const a = w.getBoundingClientRect();
    const b = tile.getBoundingClientRect();
    const dx = b.left + b.width / 2 - (a.left + a.width / 2);
    const dy = b.top + b.height / 2 - (a.top + a.height / 2);
    w.animate(
      [{ transform: 'none', opacity: 1 }, { transform: `translate(${dx}px, ${dy}px) scale(.08)`, opacity: .3 }],
      { duration: 380, easing: 'cubic-bezier(.5, 0, .75, .5)' }
    ).onfinish = done;
  }

  // Drag `el` by `handle`, keeping it reachable inside the desktop.
  function draggable(el, handle) {
    handle.addEventListener('pointerdown', e => {
      if (e.button !== 0 || e.target.closest('button') || phone.matches || el.classList.contains('max')) return;
      e.preventDefault();
      const sx = e.clientX, sy = e.clientY, ox = el.offsetLeft, oy = el.offsetTop;
      handle.setPointerCapture(e.pointerId);
      const move = ev => {
        const x = ox + ev.clientX - sx;
        const y = oy + ev.clientY - sy;
        el.style.left = Math.min(Math.max(x, 80 - el.offsetWidth), desktop.clientWidth - 80) + 'px';
        el.style.top = Math.min(Math.max(y, 0), desktop.clientHeight - 60) + 'px';
      };
      const up = () => {
        handle.removeEventListener('pointermove', move);
        handle.removeEventListener('pointerup', up);
        handle.removeEventListener('pointercancel', up);
      };
      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', up);
      handle.addEventListener('pointercancel', up);
    });
  }

  // ---------- Window chrome ----------
  wins.forEach((w, id) => {
    w.tabIndex = -1;
    w.addEventListener('pointerdown', () => raise(w));
    w.addEventListener('focusin', () => raise(w));
    $('.close', w).addEventListener('click', () => closeApp(id));
    $('.min', w).addEventListener('click', () => minimizeApp(id));
    $('.max', w).addEventListener('click', () => w.classList.toggle('max'));
    const bar = $('.titlebar', w);
    bar.addEventListener('dblclick', e => { if (!e.target.closest('button') && !phone.matches) w.classList.toggle('max'); });
    draggable(w, bar);
  });

  const sticky = $('.sticky');
  if (sticky) draggable(sticky, sticky);

  // ---------- Opening apps ----------
  const menuBtn = $('#menu-btn');
  const menu = $('#menu');
  const closeMenu = () => { menu.hidden = true; menuBtn.setAttribute('aria-expanded', 'false'); };

  menuBtn.addEventListener('click', e => {
    e.stopPropagation();
    const show = menu.hidden;
    menu.hidden = !show;
    menuBtn.setAttribute('aria-expanded', String(show));
    if (show) $('button, a', menu).focus();
  });

  document.addEventListener('click', e => {
    const opener = e.target.closest('[data-open]');
    if (opener && !opener.classList.contains('desk-icon')) {
      openApp(opener.dataset.open);
      closeMenu();
    } else if (!menu.hidden && !e.target.closest('#menu')) {
      closeMenu();
    }
  });

  // Desktop icons: click selects, double-click or Enter opens (like a real desktop).
  $$('.desk-icon').forEach(icon => {
    icon.addEventListener('dblclick', () => openApp(icon.dataset.open));
    icon.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); openApp(icon.dataset.open); }
    });
  });

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (!menu.hidden) { closeMenu(); menuBtn.focus(); return; }
    const top = topWindow();
    if (top) closeApp(top.id.slice(4));
  });

  // ---------- Clock ----------
  const clock = $('#clock');
  const tick = () => {
    const d = new Date();
    clock.dateTime = d.toISOString();
    clock.textContent =
      d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).replace(',', '') +
      '  ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  };
  tick();
  setInterval(tick, 10000);

  // ---------- Work: mail-style list ----------
  const jobs = $$('.mail-list button');
  const showJob = btn => {
    jobs.forEach(b => b.setAttribute('aria-current', String(b === btn)));
    $$('.mail-view article').forEach(a => { a.hidden = a.dataset.job !== btn.dataset.job; });
  };
  jobs.forEach(b => b.addEventListener('click', () => showJob(b)));
  if (jobs[0]) showJob(jobs[0]);

  // ---------- Photos ----------
  $$('.photo').forEach(p => p.addEventListener('click', () => p.closest('figure').classList.toggle('zoom')));

  // ---------- Trash ----------
  const trashMsgs = [
    'Nah. It earned its spot.',
    'Are you sure? It walked so this site could run.',
    'Okay, really, some things are worth keeping.',
  ];
  let trashClicks = 0;
  $('#empty-trash')?.addEventListener('click', () => {
    $('#trash-msg').textContent = trashMsgs[Math.min(trashClicks++, trashMsgs.length - 1)];
  });

  // ---------- Terminal ----------
  const out = $('#term-out');
  const input = $('#term-in');
  const history = [];
  let hIndex = 0;

  const print = (text, cls) => {
    for (const line of String(text).split('\n')) {
      const div = document.createElement('div');
      if (cls) div.className = cls;
      div.textContent = line || ' ';
      out.append(div);
    }
    out.parentElement.parentElement.scrollTop = 1e9;
  };

  const apps = [...wins.keys()].filter(k => k !== 'sysinfo' && k !== 'terminal');
  const todo = '[x] graduate RPI (twice)\n[x] join Apple\n[x] redo website\n[ ] keep the phones ringing';

  const commands = {
    help: () => [
      'available commands:',
      '  whoami          who is this guy?',
      '  ls              list apps',
      '  open <app>      open an app (e.g. open work)',
      '  cat todo.txt    what\'s next',
      '  date, echo, clear, exit',
      '  ...and a few secrets',
    ].join('\n'),
    whoami: () => 'yaseen mahmoud: software systems engineer @ apple (phone & facetime).\nrpi \'22 (itws + mech e). former firefighter / emt. new jersey raised.',
    ls: () => apps.join('  ') + '  todo.txt',
    open: arg => (wins.has(arg) ? (openApp(arg), `opening ${arg}...`) : `open: ${arg || '(nothing)'}: no such app. try 'ls'`),
    cat: arg => (arg === 'todo.txt' ? todo : `cat: ${arg || ''}: No such file or directory`),
    date: () => new Date().toString(),
    echo: arg => arg,
    clear: () => { out.textContent = ''; return null; },
    exit: () => { closeApp('terminal'); return null; },
    hi: () => 'hey! 👋',
    hello: () => 'hey! 👋',
    sudo: arg => (/hire/i.test(arg)
      ? '[sudo] password for visitor: ********\nnice try. he\'s happily employed. you can still say hi though: open call'
      : 'visitor is not in the sudoers file. this incident will be reported. 🚨'),
    911: () => '🚑 dispatching... just kidding. old habits.',
    rm: () => 'absolutely not. i\'ve seen what happens to people who do that.',
    vim: () => 'you can check out any time you like, but you can never leave. (try :q)',
    ':q': () => 'see? told you.',
  };

  $('#term-form').addEventListener('submit', e => {
    e.preventDefault();
    const raw = input.value.trim();
    input.value = '';
    print(`visitor@yaseen ~ % ${raw}`, 'cmd');
    if (!raw) return;
    history.push(raw);
    hIndex = history.length;
    const [cmd, ...rest] = raw.split(/\s+/);
    const fn = commands[cmd.toLowerCase()];
    const result = fn ? fn(rest.join(' ')) : `zsh: command not found: ${cmd}`;
    if (result != null) print(result);
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowUp' && hIndex > 0) input.value = history[--hIndex];
    else if (e.key === 'ArrowDown') input.value = history[++hIndex] ?? (hIndex = history.length, '');
    else return;
    e.preventDefault();
  });

  $('.term').addEventListener('click', () => {
    if (!getSelection().toString()) input.focus();
  });

  // ---------- Start up ----------
  const openFromHash = () => {
    const id = location.hash.slice(1);
    if (wins.has(id)) openApp(id);
  };
  window.addEventListener('hashchange', openFromHash);
  openApp('about');
  openFromHash();
})();
