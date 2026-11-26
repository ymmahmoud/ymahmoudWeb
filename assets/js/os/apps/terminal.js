// Terminal: a small shell with commands about Yaseen and the system.

import { $ } from '../dom.js';
import { Application, apps, openWindow } from '../application.js';
import { separator } from '../menu.js';
import { windows } from '../windows.js';
import { setAppearance } from '../system.js';

class Terminal extends Application {
  constructor() {
    super({ id: 'terminal', name: 'Terminal' });
    this.history = [];
    this.historyIndex = 0;
    this.commands = {
      help: () => [
        'commands:',
        '  whoami         about Yaseen',
        '  ls             list applications',
        '  open <app>     open an application, e.g. open notes',
        '  mail           write a message to Yaseen',
        '  theme <mode>   light | dark | auto',
        '  date           print the date',
        '  echo <text>    print text',
        '  clear          clear the screen',
        '  exit           close this window',
      ].join('\n'),
      whoami: () => 'Yaseen Mahmoud\nSoftware Systems Engineer, Apple (Phone and FaceTime)\nRensselaer Polytechnic Institute, 2022',
      ls: () => [...apps.values()].filter(app => app.windows.length && app.id !== 'help').map(app => app.id).join('  '),
      open: name => {
        if (apps.get(name)?.windows.length) apps.get(name).open();
        else if (windows.has(name)) openWindow(name);
        else return `open: ${name || '(none)'}: application not found`;
        return '';
      },
      mail: () => (openWindow('compose'), ''),
      theme: mode => (['light', 'dark', 'auto'].includes(mode) ? (setAppearance(mode), '') : 'usage: theme light | dark | auto'),
      date: () => new Date().toString(),
      echo: text => text,
      clear: () => { this.clear(); return null; },
      exit: () => { this.closeWindow(windows.get('terminal')); return null; },
    };
  }

  init() {
    this.out = $('#term-out');
    this.input = $('#term-in');
    this.scroller = this.out.closest('.window-body');

    $('#term-form').addEventListener('submit', e => {
      e.preventDefault();
      const line = this.input.value;
      this.input.value = '';
      this.run(line);
    });

    this.input.addEventListener('keydown', e => {
      if (e.key === 'ArrowUp' && this.historyIndex > 0) {
        this.input.value = this.history[--this.historyIndex];
      } else if (e.key === 'ArrowDown' && this.historyIndex < this.history.length) {
        this.input.value = this.history[++this.historyIndex] ?? '';
      } else {
        return;
      }
      e.preventDefault();
    });

    $('.term').addEventListener('click', () => {
      if (!getSelection().toString()) this.input.focus();
    });
  }

  print(text, className) {
    for (const line of String(text).split('\n')) {
      const div = document.createElement('div');
      if (className) div.className = className;
      div.textContent = line || ' ';
      this.out.append(div);
    }
    this.scroller.scrollTop = this.scroller.scrollHeight;
  }

  clear() {
    this.out.textContent = '';
  }

  run(raw) {
    const line = raw.trim();
    this.print(`visitor@yaseen ~ % ${line}`, 'cmd');
    if (!line) return;
    this.history.push(line);
    this.historyIndex = this.history.length;
    const [name, ...args] = line.split(/\s+/);
    const command = this.commands[name.toLowerCase()];
    const result = command ? command(args.join(' ')) : `zsh: command not found: ${name}`;
    if (result) this.print(result);
  }

  fileItems() {
    return [{ label: 'New Window', run: () => this.open() }];
  }

  editItems() {
    return [separator, { label: 'Clear Scrollback', run: () => this.clear() }];
  }

  helpItems() {
    return [{ label: 'Terminal Commands', run: () => this.open().then(() => this.run('help')) }];
  }
}

export default new Terminal();
