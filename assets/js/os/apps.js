import { $, $$ } from './dom.js';
import { sendAway } from './windows.js';
import { notify } from './system.js';
import { confirmAlert } from './alert.js';
import { setTrashFull } from './dock.js';

function selectable(buttons, key, onSelect) {
  const select = button => {
    buttons().forEach(b => b.setAttribute('aria-current', String(b === button)));
    onSelect(button.dataset[key]);
  };
  buttons().forEach(b => b.addEventListener('click', () => select(b)));
  return select;
}

function showOnly(panels, key, value) {
  panels.forEach(panel => { panel.hidden = panel.dataset[key] !== value; });
}

function initFinder() {
  const win = $('#win-finder');
  const title = $('h2', win);
  const files = $$('.finder-grid li', win);
  const folders = () => $$('[data-folder]', win);
  const select = selectable(folders, 'folder', folder => {
    files.forEach(li => { li.hidden = !li.dataset.folders.split(' ').includes(folder); });
    title.textContent = $(`[data-folder="${folder}"]`, win).textContent;
  });
  select(folders()[0]);
}

function initNotes() {
  const notes = $$('.note');
  const buttons = () => $$('.note-list button');
  selectable(buttons, 'note', note => showOnly(notes, 'note', note))(buttons()[0]);
}

const mail = {
  mailbox: 'inbox',
  sentCount: 0,
  items: () => $$('#mail-list > li'),
  buttons: () => $$('#mail-list button'),
  messages: () => $$('#mail-reader .message'),
};

function openMessage(button) {
  mail.buttons().forEach(b => b.setAttribute('aria-current', String(b === button)));
  showOnly(mail.messages(), 'message', button?.dataset.message);
}

function showMailbox(mailbox) {
  mail.mailbox = mailbox;
  mail.items().forEach(li => {
    const inMailbox = li.dataset.mailbox === mailbox;
    li.hidden = li.classList.contains('mail-empty') ? !inMailbox || mail.sentCount > 0 : !inMailbox;
  });
  $('#win-mail h2').textContent = mailbox === 'inbox' ? 'Inbox' : 'Sent';
  openMessage(mail.items().find(li => !li.hidden)?.querySelector('button'));
}

function addSentMessage({ subject, message }) {
  const id = `sent-${++mail.sentCount}`;

  const item = document.createElement('li');
  item.dataset.mailbox = 'sent';
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.message = id;
  const to = document.createElement('strong');
  to.textContent = 'To: Yaseen Mahmoud';
  const line = document.createElement('span');
  line.textContent = subject;
  const when = document.createElement('small');
  when.textContent = 'Just now';
  button.append(to, line, when);
  button.addEventListener('click', () => openMessage(button));
  item.append(button);
  $('#mail-list').prepend(item);

  const article = document.createElement('article');
  article.className = 'message';
  article.dataset.message = id;
  article.hidden = true;
  const header = document.createElement('header');
  const recipient = document.createElement('p');
  recipient.className = 'message-from';
  recipient.textContent = 'To: Yaseen Mahmoud';
  const heading = document.createElement('h3');
  heading.textContent = subject;
  header.append(recipient, heading);
  const body = document.createElement('p');
  body.textContent = message;
  article.append(header, body);
  $('#mail-reader').append(article);

  const count = $('#sent-count');
  count.textContent = String(mail.sentCount);
  count.hidden = false;
  showMailbox(mail.mailbox);
}

function initMail() {
  mail.buttons().forEach(b => b.addEventListener('click', () => openMessage(b)));
  const mailboxes = () => $$('[data-mailbox]', $('#win-mail .sidebar'));
  selectable(mailboxes, 'mailbox', showMailbox)(mailboxes()[0]);
}

function initCompose() {
  const form = $('#compose-form');
  const send = $('#compose-send');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    send.disabled = true;
    try {
      const response = await fetch(form.action, { method: 'POST', body: data, headers: { Accept: 'application/json' } });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.ok !== true) throw new Error(result.error || 'The message couldn’t be sent.');
      addSentMessage({ subject: data.get('subject'), message: data.get('message') });
      await sendAway('compose');
      form.reset();
      notify('Message Sent', `“${data.get('subject')}” was sent to Yaseen.`);
    } catch (error) {
      notify('Message Not Sent', `${error.message} You can also reach Yaseen on LinkedIn.`);
    } finally {
      send.disabled = false;
    }
  });
}

function initPhotos() {
  $$('.photo').forEach(photo => photo.addEventListener('click', () => {
    const zoomed = photo.closest('figure').classList.toggle('zoom');
    photo.setAttribute('aria-pressed', String(zoomed));
  }));
}

export async function emptyTrash() {
  const empty = $('#empty-trash');
  if (empty.disabled) return;
  const confirmed = await confirmAlert({
    title: 'Are you sure you want to permanently erase the items in the Trash?',
    message: 'You can’t undo this action.',
    confirm: 'Empty Trash',
  });
  if (!confirmed) return;
  $('#trash-items').replaceChildren();
  $('#win-trash .file-table').hidden = true;
  $('#trash-empty').hidden = false;
  empty.disabled = true;
  setTrashFull(false);
}

export const trashIsEmpty = () => $('#empty-trash').disabled;

function initTrash() {
  $('#empty-trash').addEventListener('click', emptyTrash);
}

export function initApps() {
  initFinder();
  initNotes();
  initMail();
  initCompose();
  initPhotos();
  initTrash();
}
