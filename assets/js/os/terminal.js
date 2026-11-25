import { $ } from './dom.js';
import { wins, openApp, closeApp } from './windows.js';
import { setAppearance } from './system.js';

const out = $('#term-out');
const input = $('#term-in');
const scroller = out.closest('.window-body');
const history = [];
let historyIndex = 0;

function print(text, className) {
  for (const line of String(text).split('\n')) {
    const div = document.createElement('div');
    if (className) div.className = className;
    div.textContent = line || ' ';
    out.append(div);
  }
  scroller.scrollTop = scroller.scrollHeight;
}

const listedApps = () => [...wins.keys()].filter(id => !['compose', 'help', 'sysinfo'].includes(id));

const commands = {
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
    '  exit           close Terminal',
  ].join('\n'),
  whoami: () => 'Yaseen Mahmoud\nSoftware Systems Engineer, Apple (Phone and FaceTime)\nRensselaer Polytechnic Institute, 2022',
  ls: () => listedApps().join('  '),
  open: app => (wins.has(app) ? (openApp(app), '') : `open: ${app || '(none)'}: application not found`),
  mail: () => (openApp('compose'), ''),
  theme: mode => (['light', 'dark', 'auto'].includes(mode) ? (setAppearance(mode), '') : 'usage: theme light | dark | auto'),
  date: () => new Date().toString(),
  echo: text => text,
  clear: () => { out.textContent = ''; return null; },
  exit: () => { closeApp('terminal'); return null; },
};

export function runCommand(raw) {
  const line = raw.trim();
  print(`visitor@yaseen ~ % ${line}`, 'cmd');
  if (!line) return;
  history.push(line);
  historyIndex = history.length;
  const [name, ...args] = line.split(/\s+/);
  const command = commands[name.toLowerCase()];
  const result = command ? command(args.join(' ')) : `zsh: command not found: ${name}`;
  if (result) print(result);
}

export function initTerminal() {
  $('#term-form').addEventListener('submit', e => {
    e.preventDefault();
    const line = input.value;
    input.value = '';
    runCommand(line);
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowUp' && historyIndex > 0) {
      input.value = history[--historyIndex];
    } else if (e.key === 'ArrowDown' && historyIndex < history.length) {
      input.value = history[++historyIndex] ?? '';
    } else {
      return;
    }
    e.preventDefault();
  });

  $('.term').addEventListener('click', () => {
    if (!getSelection().toString()) input.focus();
  });
}
