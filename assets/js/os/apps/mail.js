// Mail: mailboxes, the message list and reader, unread counts, and composing a message
// to Yaseen (posted to assets/mail.php).

import { $, $$ } from '../dom.js';
import { Application } from '../application.js';
import { windows } from '../windows.js';
import { notify, store } from '../system.js';

class Mail extends Application {
  constructor() {
    super({ id: 'mail', name: 'Mail' });
    this.mailbox = 'inbox';
    this.sentCount = 0;
    this.read = new Set(JSON.parse(store.get('mail.read') ?? '[]'));
  }

  get printable() { return true; }
  get items() { return $$('#mail-list > li'); }
  get unread() { return $$('#mail-list button[data-unread]').filter(b => !this.read.has(b.dataset.message)); }
  get badge() { return this.unread.length; }

  init() {
    $$('#mail-list button').forEach(b => b.addEventListener('click', () => this.openMessage(b)));
    $$('[data-mailbox]', $('#win-mail .sidebar')).forEach(b => b.addEventListener('click', () => this.showMailbox(b.dataset.mailbox)));
    $('#compose-form').addEventListener('submit', e => this.send(e));
    this.syncUnread();
    this.showMailbox('inbox', { select: false });
  }

  syncUnread() {
    $$('#mail-list button[data-unread]').forEach(b => b.classList.toggle('unread', !this.read.has(b.dataset.message)));
    const count = this.unread.length;
    const badge = $('#inbox-count');
    badge.textContent = String(count);
    badge.hidden = !count;
    this.updateBadge();
  }

  // Opening a message marks it read, as Mail does.
  openMessage(button) {
    $$('#mail-list button').forEach(b => b.setAttribute('aria-current', String(b === button)));
    $$('#mail-reader .message').forEach(m => { m.hidden = m.dataset.message !== button?.dataset.message; });
    if (button?.hasAttribute('data-unread') && !this.read.has(button.dataset.message)) {
      this.read.add(button.dataset.message);
      store.set('mail.read', JSON.stringify([...this.read]));
      this.syncUnread();
    }
  }

  // Selecting a mailbox doesn't open a message until you choose one, so unread mail
  // stays unread until it's read.
  showMailbox(mailbox, { select = mailbox !== 'inbox' } = {}) {
    this.mailbox = mailbox;
    $$('[data-mailbox]', $('#win-mail .sidebar')).forEach(b => b.setAttribute('aria-current', String(b.dataset.mailbox === mailbox)));
    this.items.forEach(li => {
      const inMailbox = li.dataset.mailbox === mailbox;
      li.hidden = li.classList.contains('mail-empty') ? !inMailbox || this.sentCount > 0 : !inMailbox;
    });
    $('#win-mail h2').textContent = mailbox === 'inbox' ? 'Inbox' : 'Sent';
    const first = this.items.find(li => !li.hidden)?.querySelector('button');
    this.openMessage(select ? first : null);
  }

  addSentMessage({ subject, message }) {
    const id = `sent-${++this.sentCount}`;

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
    button.addEventListener('click', () => this.openMessage(button));
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
    count.textContent = String(this.sentCount);
    count.hidden = false;
    this.showMailbox(this.mailbox);
  }

  async send(e) {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.reportValidity()) return;
    const sendButton = $('#compose-send');
    const data = new FormData(form);
    sendButton.disabled = true;
    try {
      const response = await fetch(form.action, { method: 'POST', body: data, headers: { Accept: 'application/json' } });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.ok !== true) throw new Error(result.error || 'The message couldn’t be sent.');
      this.addSentMessage({ subject: data.get('subject'), message: data.get('message') });
      await windows.get('compose').close('is-sending');
      form.reset();
      notify('Message Sent', `“${data.get('subject')}” was sent to Yaseen.`);
    } catch (error) {
      notify('Message Not Sent', `${error.message} You can also reach Yaseen on LinkedIn.`);
    } finally {
      sendButton.disabled = false;
    }
  }

  fileItems() {
    return [{ label: 'New Message', run: () => this.open('compose') }];
  }

  dockItems() {
    return this.fileItems();
  }
}

export default new Mail();
