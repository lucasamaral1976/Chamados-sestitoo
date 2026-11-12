const paths = {
  dashboard: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  ticket: '<path d="M4 4h16v5a3 3 0 0 0 0 6v5H4v-5a3 3 0 0 0 0-6V4Z"/><path d="M15 4v3m0 4v2m0 4v3"/>',
  users: '<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M17 5a3 3 0 0 1 0 6m1 3a5 5 0 0 1 3 5v2"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5"/>',
  headphones: '<path d="M4 13V10a8 8 0 0 1 16 0v3M4 12H3v7h4v-7H4Zm16 0h1v7h-4v-7h3Zm0 7a4 4 0 0 1-4 3h-2"/>',
  spark: '<path d="m12 2 2.8 7.2L22 12l-7.2 2.8L12 22l-2.8-7.2L2 12l7.2-2.8L12 2Z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  refresh: '<path d="M20 7V3l-3 3a8 8 0 1 0 2 12M20 3h-5"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  arrowUp: '<path d="M6 18 18 6M6 6h12v12"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  chevronLeft: '<path d="m14 5-7 7 7 7"/>',
  chevronRight: '<path d="m10 5 7 7-7 7"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  edit: '<path d="m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15v5Z"/>',
  trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  pause: '<rect x="7" y="5" width="3" height="14" rx="1"/><rect x="14" y="5" width="3" height="14" rx="1"/>',
  inbox: '<path d="m3 13 3-9h12l3 9v7H3v-7Zm0 0h5l2 3h4l2-3h5"/>',
  alert: '<path d="m12 3 10 18H2L12 3Z"/><path d="M12 9v5m0 3v.5"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4m-4 5v2"/>',
  message: '<path d="M21 15a3 3 0 0 1-3 3H8l-5 4V5a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v10Z"/><path d="M7 8h10M7 12h7"/>',
  send: '<path d="m22 2-7 20-4-9-9-4 20-7ZM11 13 22 2"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>',
  phone: '<path d="m6 3 4 5-3 3a14 14 0 0 0 6 6l3-3 5 4-2 3C10 22 2 14 3 5l3-2Z"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>',
  folder: '<path d="M3 7V4h7l3 3h8v13H3V7Z"/>',
};

export function icon(name) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.ticket}</svg>`;
}

export function paintIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach((node) => { node.innerHTML = icon(node.dataset.icon); });
}

export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

export const statuses = {
  ABERTO: { label: 'Aberto', plural: 'Abertos', color: '#a9bc82', icon: 'inbox' },
  EM_ATENDIMENTO: { label: 'Em atendimento', plural: 'Em atendimento', color: '#8499b6', icon: 'headphones' },
  AGUARDANDO_CLIENTE: { label: 'Aguardando cliente', plural: 'Aguardando cliente', color: '#d4b57a', icon: 'clock' },
  FECHADO: { label: 'Fechado', plural: 'Fechados', color: '#d9e1d1', icon: 'checkCircle' },
};

export const priorities = {
  BAIXA: { label: 'Baixa', color: '#a4b88d' },
  MEDIA: { label: 'Média', color: '#c6b276' },
  ALTA: { label: 'Alta', color: '#dba07a' },
  CRITICA: { label: 'Crítica', color: '#ce8580' },
};

export function badge(value, type = 'status') {
  const definition = (type === 'status' ? statuses : priorities)[value];
  if (!definition) return `<span class="muted">${esc(value || '—')}</span>`;
  return `<span class="badge ${type}-${esc(value)} ${type === 'priority' ? 'priority-badge' : ''}"><i></i>${definition.label}</span>`;
}

export function initials(name = '') {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toLocaleUpperCase('pt-BR') || '?';
}

export function avatar(name, large = false) {
  const colors = ['', 'terracotta', 'blue', 'lilac'];
  const hash = [...String(name)].reduce((sum, character) => sum + character.charCodeAt(0), 0);
  return `<span class="avatar ${colors[hash % colors.length]} ${large ? 'large' : ''}" aria-hidden="true">${esc(initials(name))}</span>`;
}

export function date(value, full = false) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-BR', full
    ? { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: 'short' }).format(parsed);
}

export function number(value) { return new Intl.NumberFormat('pt-BR').format(Number(value) || 0); }
export function ticketNumber(id) { return `#${String(id).padStart(4, '0')}`; }

export function toast(message, error = false) {
  const node = document.createElement('div');
  node.className = `toast${error ? ' error' : ''}`;
  node.setAttribute('role', error ? 'alert' : 'status');
  node.innerHTML = `${icon(error ? 'alert' : 'checkCircle')}<span>${esc(message)}</span><button class="icon-button" aria-label="Fechar aviso">${icon('close')}</button>`;
  node.querySelector('button').addEventListener('click', () => node.remove());
  const stack = document.querySelector('#toasts');
  stack.append(node);
  while (stack.children.length > 4) stack.firstElementChild.remove();
  setTimeout(() => node.remove(), error ? 10000 : 5000);
}

export function errorHtml(error) {
  return `<div class="form-error" role="alert">${esc(error.message)}${error.details?.length ? `<ul>${error.details.map((detail) => `<li>${esc(detail)}</li>`).join('')}</ul>` : ''}</div>`;
}

export function emptyState(title, message, action = '', symbol = 'inbox') {
  return `<div class="empty-state"><span class="empty-symbol">${icon(symbol)}</span><h2>${esc(title)}</h2><p>${esc(message)}</p>${action}</div>`;
}

export function setConnection(online) {
  const node = document.querySelector('#connection');
  node.className = `connection ${online ? 'online' : 'offline'}`;
  node.querySelector('span').textContent = online ? 'Conectado' : 'Sem conexão';
}

export function trapFocus(event, container) {
  if (event.key !== 'Tab') return;
  const elements = [...container.querySelectorAll('a[href],button,input,select,textarea,[tabindex="0"]')]
    .filter((element) => !element.disabled && element.getClientRects().length);
  if (!elements.length) return;
  const first = elements[0];
  const last = elements.at(-1);
  if (event.shiftKey && (document.activeElement === first || !container.contains(document.activeElement))) {
    event.preventDefault(); last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault(); first.focus();
  }
}
