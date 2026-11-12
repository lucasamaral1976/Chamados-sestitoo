import { api, ApiError } from './api.js';
import { icon, paintIcons, esc, statuses, priorities, badge, avatar, date, number, ticketNumber,
  toast, errorHtml, emptyState, setConnection, trapFocus } from './ui.js';

const main = document.querySelector('#main');
const drawerRoot = document.querySelector('#drawer-root');
const formDialog = document.querySelector('#form-dialog');
const confirmDialog = document.querySelector('#confirm-dialog');
const mobileViewport = window.matchMedia('(max-width: 760px)');
const defaults = { status: '', prioridade: '', clienteId: '', page: 0, size: 10, sort: 'id,desc' };
const state = {
  page: 'dashboard', revision: 0, drawerRevision: 0, lookups: null, lookupPromise: null,
  filters: { ...defaults }, counts: {}, records: [], search: '', drawerId: null, drawerKind: null,
  drawerRecord: null, returnFocus: null, clientPage: 0,
};

const resources = {
  clientes: {
    title: 'Clientes', singular: 'cliente', action: 'Novo cliente', icon: 'users',
    subtitle: 'As pessoas e empresas que contam com o seu suporte.',
    fields: [
      { name: 'nome', label: 'Nome', required: true, max: 100, placeholder: 'Nome do cliente', full: true },
      { name: 'email', label: 'E-mail', required: true, type: 'email', max: 120, placeholder: 'nome@exemplo.com', full: true },
      { name: 'telefone', label: 'Telefone', type: 'tel', max: 20, placeholder: '(47) 99999-9999', full: true },
    ],
  },
  categorias: {
    title: 'Categorias', singular: 'categoria', action: 'Nova categoria', icon: 'layers',
    subtitle: 'Organize os assuntos que chegam ao atendimento.',
    fields: [
      { name: 'nome', label: 'Nome', required: true, max: 100, placeholder: 'Ex.: Rede e conectividade', full: true },
      { name: 'descricao', label: 'Descrição', type: 'textarea', max: 500, placeholder: 'Quais assuntos entram nesta categoria?', full: true },
    ],
  },
  tecnicos: {
    title: 'Equipe técnica', singular: 'técnico', action: 'Novo técnico', icon: 'headphones',
    subtitle: 'Quem transforma os chamados em soluções.',
    fields: [
      { name: 'nome', label: 'Nome', required: true, max: 100, placeholder: 'Nome do técnico', full: true },
      { name: 'email', label: 'E-mail', required: true, type: 'email', max: 120, placeholder: 'nome@exemplo.com', full: true },
      { name: 'perfil', label: 'Perfil', required: true, type: 'select', options: [['TECNICO', 'Técnico'], ['ADMIN', 'Administrador']], full: true },
    ],
  },
};

function primaryButton(label, action = 'new-ticket', attributes = '', style = '') {
  return `<button class="button ${style || 'button-primary'}" data-action="${action}" ${attributes}>${icon('plus')}${esc(label)}</button>`;
}

function pageHeader(title, subtitle, action, eyebrow = 'ATENDIMENTO') {
  return `<div class="page-header"><div><p class="eyebrow">${esc(eyebrow)}</p><h1>${esc(title)}</h1><p class="page-subtitle">${esc(subtitle)}</p></div><div class="page-actions"><button class="button button-secondary" data-action="refresh">${icon('refresh')}<span class="refresh-text">Atualizar</span></button>${action}</div></div>`;
}

function find(resource, id) { return state.lookups?.[resource]?.find((item) => item.id === id); }
function name(resource, id) { return find(resource, id)?.nome || (id ? `Cadastro #${id}` : 'Não atribuído'); }

async function loadLookups(force = false) {
  if (state.lookups && !force) return state.lookups;
  if (state.lookupPromise) return state.lookupPromise;
  state.lookupPromise = Promise.all(['clientes', 'categorias', 'tecnicos'].map((resource) => api.list(resource)))
    .then(([clientes, categorias, tecnicos]) => {
      state.lookups = { clientes, categorias, tecnicos };
      setConnection(true);
      return state.lookups;
    }).finally(() => { state.lookupPromise = null; });
  return state.lookupPromise;
}

async function loadCounts() {
  const values = await Promise.all(Object.keys(statuses).map((status) => api.tickets({ status, size: 1 })));
  state.counts = Object.fromEntries(Object.keys(statuses).map((status, index) => [status, values[index].totalElements]));
  const count = document.querySelector('#open-count');
  count.textContent = number(state.counts.ABERTO);
  count.hidden = state.counts.ABERTO === 0;
  return state.counts;
}

function loading() {
  return '<div aria-label="Carregando dados" aria-busy="true"><div class="skeleton-grid">' +
    '<div class="skeleton skeleton-card"></div>'.repeat(4) + '</div><div class="skeleton skeleton-content"></div></div>';
}

function failure(error) {
  if (!error.status) setConnection(false);
  return `<div class="panel error-state">${emptyState('Não foi possível carregar', error.message,
    `<button class="button button-primary" data-action="refresh">${icon('refresh')}Tentar novamente</button>`, 'alert')}</div>`;
}

async function navigate() {
  const revision = ++state.revision;
  closeDrawer(false, false);
  if (formDialog.open) formDialog.close();
  closeMenu();
  const [path, query = ''] = (location.hash.slice(1) || '/').split('?');
  const parts = path.split('/').filter(Boolean);
  const page = parts[0] || 'dashboard';
  if (!['dashboard', 'chamados', ...Object.keys(resources)].includes(page)) {
    location.hash = '#/'; return;
  }
  state.page = page;
  state.search = '';
  if (page === 'chamados') {
    const params = Object.fromEntries(new URLSearchParams(query));
    state.filters = { ...defaults, ...Object.fromEntries(Object.entries(params).filter(([key]) => key in defaults)) };
    state.filters.page = Math.max(0, Number(state.filters.page) || 0);
    state.filters.size = [10, 20, 50].includes(Number(state.filters.size)) ? Number(state.filters.size) : 10;
  }
  document.querySelector('#breadcrumb-current').textContent = page === 'dashboard' ? 'Visão geral' : page === 'chamados' ? 'Chamados' : resources[page].title;
  document.title = `${document.querySelector('#breadcrumb-current').textContent} — Fila`;
  document.querySelectorAll('[data-nav]').forEach((link) => {
    link.classList.toggle('active', link.dataset.nav === page);
    if (link.dataset.nav === page) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  main.innerHTML = loading();
  try {
    await loadLookups(true);
    if (revision !== state.revision) return;
    await renderPage(revision);
    if (revision !== state.revision) return;
    if (parts[1] && /^\d+$/.test(parts[1]) && Number(parts[1]) > 0) {
      if (page === 'chamados') await openTicket(Number(parts[1]));
      else if (page === 'clientes') await openClient(Number(parts[1]));
    }
  } catch (error) {
    if (revision === state.revision) main.innerHTML = failure(error);
  }
}

async function renderPage(revision = state.revision) {
  if (state.page === 'dashboard') return renderDashboard(revision);
  if (state.page === 'chamados') return renderTickets(revision);
  state.records = state.lookups[state.page];
  renderRecords();
}

async function renderDashboard(revision) {
  const [counts, recent, priorityPages] = await Promise.all([
    loadCounts(), api.tickets({ page: 0, size: 5, sort: 'id,desc' }),
    Promise.all(Object.keys(priorities).map((prioridade) => api.tickets({ prioridade, size: 1 }))),
  ]);
  if (revision !== state.revision || state.page !== 'dashboard') return;
  setConnection(true);
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  const dateLabel = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  let accumulated = 0;
  const stops = Object.entries(statuses).map(([key, status]) => {
    const start = accumulated;
    accumulated += total ? counts[key] / total * 100 : 0;
    return `${status.color} ${start}% ${accumulated}%`;
  });
  const priorityMax = Math.max(1, ...priorityPages.map((page) => page.totalElements));
  main.innerHTML = pageHeader('Visão geral', 'O que está acontecendo no seu atendimento, agora.', primaryButton('Novo chamado', 'new-ticket', '', 'button-orange'), dateLabel) +
    `<div class="metric-grid">${Object.entries(statuses).map(([key, status], index) => `<article class="metric-card ${index === 0 ? 'featured' : ''}"><div class="metric-top"><span class="metric-label">${key === 'ABERTO' ? 'Chamados abertos' : status.plural}</span><span class="metric-icon">${icon(status.icon)}</span></div><strong class="metric-value">${number(counts[key])}</strong><div class="metric-bottom"><i></i>${['Prontos para começar', 'Soluções em andamento', 'À espera de um retorno', 'Atendimentos concluídos'][index]}</div></article>`).join('')}</div>
    <div class="overview-grid"><section class="panel"><div class="panel-head"><div><h2 class="panel-title">Chamados recentes</h2><p class="panel-caption">Os últimos pedidos que chegaram</p></div><a class="text-link" href="#/chamados">Ver todos ${icon('arrow')}</a></div>${recent.content.length ? ticketTable(recent.content, true) : emptyState('Sua fila começa aqui', 'Abra o primeiro chamado para acompanhar os pedidos de suporte.', primaryButton('Abrir chamado'))}<div class="panel-foot">${icon('clock')}Atualizado às ${new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date())}</div></section>
    <section class="panel"><div class="panel-head"><div><h2 class="panel-title">Situação da fila</h2><p class="panel-caption">Um retrato dos seus atendimentos</p></div></div><div class="donut" style="background: ${total ? `conic-gradient(${stops.join(',')})` : '#edf1e6'}" role="img" aria-label="${number(total)} chamados no total"><div class="donut-inner"><strong>${number(total)}</strong><span>chamados no total</span></div></div><div class="legend">${Object.entries(statuses).map(([key, status]) => `<div class="legend-row"><i style="background:${status.color}"></i><span>${status.plural}</span><strong>${number(counts[key])}</strong></div>`).join('')}</div></section></div>
    <div class="bottom-grid"><section class="panel"><div class="panel-head"><div><h2 class="panel-title">Prioridades</h2><p class="panel-caption">Como os pedidos estão distribuídos</p></div></div><div class="priority-list">${Object.entries(priorities).map(([key, priority], index) => `<div class="priority-row"><span>${priority.label}</span><div class="bar-track"><div class="bar-fill" style="width:${priorityPages[index].totalElements / priorityMax * 100}%;background:${priority.color}"></div></div><strong>${number(priorityPages[index].totalElements)}</strong></div>`).join('')}</div></section><section class="quick-start"><div><p class="eyebrow">CADA PEDIDO TEM SEU LUGAR</p><h2>Vamos resolver o próximo?</h2><p>Registre o pedido, conecte a equipe e acompanhe cada etapa.</p><button class="text-link" data-action="new-ticket" style="border:0;background:none;padding:0">Abrir um chamado ${icon('arrow')}</button></div><span class="quick-decoration">${icon('ticket')}</span></section></div>`;
}

function ticketHref(id) {
  const query = state.page === 'chamados' ? ticketHash().split('?')[1] : '';
  return `#/chamados/${id}${query ? `?${query}` : ''}`;
}

function ticketTable(tickets, compact = false) {
  return `<div class="table-scroll"><table class="data-table ${compact ? 'compact-table' : 'tickets-table'}"><thead><tr><th scope="col">CHAMADO</th><th scope="col">CLIENTE</th><th scope="col">PRIORIDADE</th><th scope="col">STATUS</th>${compact ? '' : '<th scope="col">RESPONSÁVEL</th><th scope="col">ABERTURA</th><th scope="col"><span class="sr-only">Ações</span></th>'}</tr></thead><tbody>${tickets.map((ticket) => `<tr data-ticket="${ticket.id}"><td><span class="ticket-number">${ticketNumber(ticket.id)}</span><a class="ticket-title" href="${ticketHref(ticket.id)}">${esc(ticket.titulo)}</a>${compact ? '' : `<span class="ticket-description">${esc(ticket.descricao)}</span>`}</td><td>${esc(name('clientes', ticket.clienteId))}</td><td>${badge(ticket.prioridade, 'priority')}</td><td>${badge(ticket.status)}</td>${compact ? '' : `<td>${ticket.tecnicoId ? `<div class="person-cell">${avatar(name('tecnicos', ticket.tecnicoId))}<span>${esc(name('tecnicos', ticket.tecnicoId))}</span></div>` : '<span class="muted">Não atribuído</span>'}</td><td class="nowrap"><time title="${esc(date(ticket.dataAbertura, true))}">${esc(date(ticket.dataAbertura))}</time></td><td><div class="row-actions"><button class="icon-button" data-action="edit" data-resource="chamados" data-id="${ticket.id}" aria-label="Editar chamado ${ticket.id}" ${ticket.status === 'FECHADO' ? 'disabled' : ''}>${icon('edit')}</button></div></td>`}</tr>`).join('')}</tbody></table></div>`;
}

async function renderTickets(revision) {
  const [page] = await Promise.all([api.tickets(state.filters), loadCounts()]);
  if (revision !== state.revision || state.page !== 'chamados') return;
  if (!page.content.length && page.totalElements > 0 && page.page > 0) {
    return setTicketFilters({ page: Math.max(0, page.totalPages - 1) });
  }
  setConnection(true);
  const activeFilters = state.filters.status || state.filters.prioridade || state.filters.clienteId;
  main.innerHTML = pageHeader('Chamados', 'Do primeiro contato até a solução.', primaryButton('Novo chamado')) +
    `<div class="status-tabs" aria-label="Filtrar por status"><button class="status-tab ${!state.filters.status ? 'active' : ''}" data-action="filter-status" data-status="">Todos</button>${Object.entries(statuses).map(([value, status]) => `<button class="status-tab ${state.filters.status === value ? 'active' : ''}" data-action="filter-status" data-status="${value}">${status.plural} <span class="tab-count">${number(state.counts[value])}</span></button>`).join('')}</div>
    <div class="filter-bar"><div class="filter-group"><label class="sr-only" for="priority-filter">Prioridade</label><select class="filter-select" id="priority-filter">${options([['', 'Todas as prioridades'], ...Object.entries(priorities).map(([key, value]) => [key, value.label])], state.filters.prioridade)}</select><label class="sr-only" for="client-filter">Cliente</label><select class="filter-select" id="client-filter">${options([['', 'Todos os clientes'], ...state.lookups.clientes.map((client) => [client.id, client.nome])], state.filters.clienteId)}</select><label class="sr-only" for="sort-filter">Ordenação</label><select class="filter-select" id="sort-filter">${options([['id,desc', 'Mais recentes'], ['id,asc', 'Mais antigos'], ['titulo,asc', 'Título: A a Z'], ['titulo,desc', 'Título: Z a A']], state.filters.sort)}</select>${activeFilters ? '<button class="button button-quiet button-small" data-action="reset-filters">Limpar filtros</button>' : ''}</div><form class="search-box jump-form" id="jump-form" aria-label="Buscar chamado pelo número">${icon('search')}<input name="numero" aria-label="Número do chamado" placeholder="Ir para chamado #" inputmode="numeric" required pattern="#?[0-9]+"><button aria-label="Buscar chamado">${icon('arrow')}</button></form></div>
    <section class="panel">${page.content.length ? ticketTable(page.content) : emptyState(activeFilters ? 'Nenhum chamado encontrado' : 'A fila está livre por aqui', activeFilters ? 'Tente outra combinação de filtros para encontrar o que procura.' : 'Crie um chamado para começar a acompanhar seus atendimentos.', activeFilters ? '<button class="button button-secondary" data-action="reset-filters">Limpar filtros</button>' : primaryButton('Abrir chamado'))}${pagination(page)}</section>`;
}

function pagination(page, client = false) {
  const start = page.totalElements ? page.page * page.size + 1 : 0;
  const end = Math.min((page.page + 1) * page.size, page.totalElements);
  return `<div class="pagination"><span>${number(start)}–${number(end)} de ${number(page.totalElements)} chamados</span><div class="pagination-buttons"><button class="icon-button" data-action="${client ? 'client-page' : 'ticket-page'}" data-page="${page.page - 1}" aria-label="Página anterior" ${page.page === 0 ? 'disabled' : ''}>${icon('chevronLeft')}</button><span class="page-label">${number(page.page + 1)} / ${number(Math.max(1, page.totalPages))}</span><button class="icon-button" data-action="${client ? 'client-page' : 'ticket-page'}" data-page="${page.page + 1}" aria-label="Próxima página" ${page.last ? 'disabled' : ''}>${icon('chevronRight')}</button></div></div>`;
}

function options(values, selected = '') {
  return values.map(([value, label]) => `<option value="${esc(value)}" ${String(value) === String(selected ?? '') ? 'selected' : ''}>${esc(label)}</option>`).join('');
}

function renderRecords() {
  const config = resources[state.page];
  if (!config) return;
  main.innerHTML = pageHeader(config.title, config.subtitle, primaryButton(config.action, 'new-record', `data-resource="${state.page}"`), 'CADASTROS') +
    `<div class="filter-bar"><label class="search-box">${icon('search')}<input type="search" id="record-search" aria-label="Buscar ${config.title.toLocaleLowerCase('pt-BR')}" placeholder="Buscar por nome${state.page === 'categorias' ? ' ou descrição' : ' ou e-mail'}…"></label><span class="record-count" id="record-count"></span></div><div id="record-content"></div>`;
  renderRecordContent();
}

function renderRecordContent() {
  const resource = state.page;
  const config = resources[resource];
  const content = document.querySelector('#record-content');
  if (!content || !config) return;
  const term = state.search.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/\p{Diacritic}/gu, '');
  const items = state.records.filter((record) => [record.nome, record.email, record.descricao].some((value) =>
    String(value || '').toLocaleLowerCase('pt-BR').normalize('NFD').replace(/\p{Diacritic}/gu, '').includes(term)));
  document.querySelector('#record-count').textContent = `${number(items.length)} ${items.length === 1 ? 'cadastro' : 'cadastros'}`;
  if (!items.length) {
    content.innerHTML = `<section class="panel">${emptyState(state.search ? 'Nenhum cadastro encontrado' : `Cadastre o primeiro ${config.singular}`, state.search ? 'Tente buscar por outro nome.' : 'Os cadastros ficam disponíveis para usar nos seus chamados.', state.search ? '' : primaryButton(config.action, 'new-record', `data-resource="${resource}"`), config.icon)}</section>`;
    return;
  }
  if (resource === 'clientes') {
    content.innerHTML = `<section class="panel"><div class="table-scroll"><table class="data-table clients-table"><thead><tr><th scope="col">CLIENTE</th><th scope="col">E-MAIL</th><th scope="col">TELEFONE</th><th scope="col"><span class="sr-only">Ações</span></th></tr></thead><tbody>${items.map((client) => `<tr data-client="${client.id}"><td><div class="person-cell">${avatar(client.nome)}<div><a class="person-name" href="#/clientes/${client.id}">${esc(client.nome)}</a><span class="subtext">Cliente #${client.id}</span></div></div></td><td>${esc(client.email)}</td><td>${esc(client.telefone || '—')}</td><td>${recordActions(resource, client)}</td></tr>`).join('')}</tbody></table></div></section>`;
  } else {
    content.innerHTML = `<div class="cards-grid">${items.map((record) => `<article class="record-card"><div class="record-card-head">${resource === 'tecnicos' ? avatar(record.nome, true) : `<span class="category-symbol">${icon('folder')}</span>`}${recordActions(resource, record)}</div><h2>${esc(record.nome)}</h2>${resource === 'tecnicos' ? `<span class="card-email">${esc(record.email)}</span><span class="badge role-${esc(record.perfil)}">${record.perfil === 'ADMIN' ? 'Administrador' : 'Técnico'}</span>` : `<p>${esc(record.descricao || 'Sem descrição.')}</p>`}</article>`).join('')}</div>`;
  }
}

function recordActions(resource, record) {
  return `<div class="row-actions"><button class="icon-button" data-action="edit" data-resource="${resource}" data-id="${record.id}" aria-label="Editar ${esc(record.nome)}">${icon('edit')}</button><button class="icon-button danger" data-action="delete" data-resource="${resource}" data-id="${record.id}" aria-label="Excluir ${esc(record.nome)}">${icon('trash')}</button></div>`;
}

function setTicketFilters(changes) {
  const filters = { ...state.filters, page: 0, ...changes };
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (String(value) !== String(defaults[key]) && value !== '') params.set(key, value);
  }
  const hash = `#/chamados${params.size ? `?${params}` : ''}`;
  if (location.hash === hash) return navigate();
  location.hash = hash;
}

function formField(field, value = '') {
  const id = `field-${field.name}`;
  const attributes = `id="${id}" name="${field.name}" ${field.required ? 'required' : ''} ${field.max ? `maxlength="${field.max}"` : ''} ${field.placeholder ? `placeholder="${esc(field.placeholder)}"` : ''}`;
  let input;
  if (field.type === 'textarea') input = `<textarea ${attributes} rows="4">${esc(value)}</textarea>`;
  else if (field.type === 'select') input = `<select ${attributes}>${options(field.options, value)}</select>`;
  else input = `<input type="${field.type || 'text'}" ${attributes} value="${esc(value)}" ${field.type === 'email' ? 'autocomplete="email"' : field.name === 'nome' ? 'autocomplete="name"' : ''}>`;
  return `<div class="form-field ${field.full ? 'full' : ''}"><label for="${id}">${esc(field.label)}${field.required ? '' : '<span class="optional">opcional</span>'}</label>${input}</div>`;
}

async function openForm(resource, id = null) {
  await loadLookups();
  const record = id ? await api.get(resource, id) : {};
  if (record.status === 'FECHADO') throw new ApiError('Este chamado está fechado e não pode ser editado.', 409);
  const isTicket = resource === 'chamados';
  const config = resources[resource];
  const title = isTicket ? (id ? 'Editar chamado' : 'Novo chamado') : id ? `Editar ${config.singular}` : config.action;
  let fields;
  let hint = '';
  if (isTicket) {
    fields = [
      { name: 'titulo', label: 'Título', required: true, max: 150, placeholder: 'Resuma o que precisa de atenção', full: true },
      { name: 'descricao', label: 'Descrição', type: 'textarea', required: true, max: 5000, placeholder: 'Conte o que aconteceu e como podemos ajudar.', full: true },
      { name: 'clienteId', label: 'Cliente', type: 'select', required: true, options: [['', 'Selecione o cliente'], ...state.lookups.clientes.map((client) => [client.id, client.nome])] },
      { name: 'categoriaId', label: 'Categoria', type: 'select', required: true, options: [['', 'Selecione a categoria'], ...state.lookups.categorias.map((category) => [category.id, category.nome])] },
      { name: 'prioridade', label: 'Prioridade', type: 'select', required: true, options: Object.entries(priorities).map(([key, priority]) => [key, priority.label]) },
      { name: 'tecnicoId', label: 'Responsável', type: 'select', options: [['', 'Atribuir depois'], ...state.lookups.tecnicos.map((tech) => [tech.id, tech.nome])] },
    ];
    if (!state.lookups.clientes.length || !state.lookups.categorias.length) {
      hint = '<p class="form-hint">Antes de abrir um chamado, cadastre pelo menos um <a href="#/clientes">cliente</a> e uma <a href="#/categorias">categoria</a>.</p>';
    }
  } else fields = config.fields;
  const values = { prioridade: 'MEDIA', perfil: 'TECNICO', ...record };
  document.querySelector('#form-content').innerHTML = `<div class="dialog-header"><div><h2 id="form-title">${esc(title)}</h2><p>${isTicket ? 'Um bom registro é o primeiro passo para resolver.' : 'Preencha as informações do cadastro.'}</p></div><button class="icon-button" data-action="close-form" aria-label="Fechar formulário">${icon('close')}</button></div><form id="record-form" data-resource="${resource}" ${id ? `data-id="${id}"` : ''}><div class="form-body"><div id="record-form-error"></div><div class="form-grid">${fields.map((field) => formField(field, values[field.name])).join('')}</div>${hint}</div><div class="dialog-footer"><button class="button button-secondary" type="button" data-action="close-form">Cancelar</button><button class="button button-primary" type="submit" ${isTicket && (!state.lookups.clientes.length || !state.lookups.categorias.length) ? 'disabled' : ''}>${id ? 'Salvar alterações' : isTicket ? 'Abrir chamado' : 'Salvar cadastro'} ${icon('arrow')}</button></div></form>`;
  formDialog.showModal();
  syncScroll();
}

async function submitRecord(form) {
  if (!form.reportValidity()) return;
  const resource = form.dataset.resource;
  const id = Number(form.dataset.id) || null;
  const values = Object.fromEntries(new FormData(form));
  const body = resource === 'chamados'
    ? { titulo: values.titulo.trim(), descricao: values.descricao.trim(), prioridade: values.prioridade,
        clienteId: Number(values.clienteId), categoriaId: Number(values.categoriaId), tecnicoId: values.tecnicoId ? Number(values.tecnicoId) : null }
    : Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.trim()]));
  const button = form.querySelector('[type="submit"]');
  const original = button.innerHTML;
  button.disabled = true; button.textContent = 'Salvando…';
  document.querySelector('#record-form-error').innerHTML = '';
  form.querySelectorAll('[aria-invalid]').forEach((input) => input.removeAttribute('aria-invalid'));
  try {
    const saved = id ? await api.update(resource, id, body) : await api.create(resource, body);
    setConnection(true);
    formDialog.close();
    toast(resource === 'chamados' ? (id ? 'Chamado atualizado.' : 'Chamado aberto. Vamos resolver!') : 'Cadastro salvo.');
    if (resource === 'chamados') {
      const hash = ticketHref(saved.id);
      if (location.hash === hash) await navigate(); else location.hash = hash;
    } else await navigate();
  } catch (error) {
    if (!error.status) setConnection(false);
    document.querySelector('#record-form-error').innerHTML = errorHtml(error);
    for (const detail of error.details || []) {
      const field = form.elements.namedItem(detail.split(':')[0].trim());
      if (field) field.setAttribute('aria-invalid', 'true');
    }
    document.querySelector('#record-form-error').scrollIntoView({ block: 'nearest' });
  } finally {
    button.disabled = false; button.innerHTML = original;
  }
}

function syncScroll() {
  const menuOpen = mobileViewport.matches && document.querySelector('#sidebar').classList.contains('open');
  document.body.style.overflow = state.drawerId !== null || formDialog.open || confirmDialog.open || menuOpen ? 'hidden' : '';
}

function syncNavigationAccess() {
  document.querySelector('#sidebar').inert = state.drawerId !== null ||
    (mobileViewport.matches && !document.querySelector('#sidebar').classList.contains('open'));
}

function beginDrawer(kind, id) {
  if (state.drawerId === null) state.returnFocus = document.activeElement;
  state.drawerKind = kind;
  state.drawerId = id;
  document.querySelector('.app-shell').inert = true;
  document.querySelector('#sidebar').inert = true;
  syncScroll();
}

function drawerShell(label, body, footer = '') {
  return `<div class="drawer-backdrop" data-action="close-drawer"></div><aside class="detail-drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title" tabindex="-1"><header class="drawer-header"><span class="eyebrow">${esc(label)}</span><button class="icon-button" data-action="close-drawer" aria-label="Fechar detalhes">${icon('close')}</button></header><div class="drawer-body">${body}</div>${footer ? `<footer class="drawer-footer">${footer}</footer>` : ''}</aside>`;
}

function closeDrawer(restoreFocus = true, changeUrl = true) {
  const oldKind = state.drawerKind;
  const hadDrawer = state.drawerId !== null;
  state.drawerId = null;
  state.drawerKind = null;
  state.drawerRecord = null;
  state.drawerRevision++;
  drawerRoot.innerHTML = '';
  document.querySelector('.app-shell').inert = false;
  document.querySelector('#sidebar').inert = false;
  syncNavigationAccess();
  syncScroll();
  if (hadDrawer && changeUrl && oldKind && location.hash.startsWith(`#/${oldKind}/`)) {
    history.replaceState(null, '', oldKind === 'chamados' ? ticketHash() : '#/clientes');
  }
  if (restoreFocus && hadDrawer) {
    if (state.returnFocus?.isConnected && state.returnFocus.matches('a,button,input,select,textarea')) state.returnFocus.focus();
    else main.focus({ preventScroll: true });
  }
}

function lastCommentAuthor() {
  try { return sessionStorage.getItem('fila-comment-author') || ''; }
  catch { return ''; }
}

function ticketHash() {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(state.filters)) {
    if (String(value) !== String(defaults[key]) && value !== '') params.set(key, value);
  }
  return `#/chamados${params.size ? `?${params}` : ''}`;
}

async function openTicket(id, initial = true, focusAfter = null) {
  const revision = ++state.drawerRevision;
  beginDrawer('chamados', id);
  if (initial) drawerRoot.innerHTML = drawerShell('CARREGANDO CHAMADO', '<h2 id="drawer-title" class="sr-only">Carregando chamado</h2><div class="skeleton skeleton-content"></div>');
  try {
    const [ticket, comments] = await Promise.all([api.get('chamados', id), api.comments(id)]);
    if (revision !== state.drawerRevision || state.drawerId !== id) return;
    state.drawerRecord = ticket;
    const closed = ticket.status === 'FECHADO';
    const body = `<div>${badge(ticket.status)}<h2 class="drawer-title" id="drawer-title">${esc(ticket.titulo)}</h2><p class="drawer-description">${esc(ticket.descricao)}</p></div>
      <div class="detail-grid"><div class="detail-field"><small>Cliente</small><strong>${esc(name('clientes', ticket.clienteId))}</strong></div><div class="detail-field"><small>Categoria</small><strong>${esc(name('categorias', ticket.categoriaId))}</strong></div><div class="detail-field"><small>Prioridade</small>${badge(ticket.prioridade, 'priority')}</div><div class="detail-field"><small>Abertura</small><span>${esc(date(ticket.dataAbertura, true))}</span></div>${closed ? `<div class="detail-field"><small>Fechamento</small><span>${esc(date(ticket.dataFechamento, true))}</span></div><div class="detail-field"><small>Responsável</small><span>${esc(name('tecnicos', ticket.tecnicoId))}</span></div>` : ''}</div>
      ${closed ? `<div class="closed-notice">${icon('checkCircle')}<span>Atendimento concluído. Este chamado está disponível para consulta.</span></div>` : `<section class="drawer-section"><h3>Conduzir atendimento</h3><form class="inline-form" id="assign-form" data-id="${id}"><label for="assign-tech">Responsável</label><select id="assign-tech" name="tecnicoId" required>${options([['', state.lookups.tecnicos.length ? 'Selecione um técnico' : 'Cadastre um técnico primeiro'], ...state.lookups.tecnicos.map((tech) => [tech.id, tech.nome])], ticket.tecnicoId)}</select><button class="button button-secondary" type="submit" ${state.lookups.tecnicos.length ? '' : 'disabled'}>Atribuir</button></form><form class="inline-form" id="status-form" data-id="${id}"><label for="new-status">Novo status</label><select id="new-status" name="status" required>${options(Object.entries(statuses).filter(([key]) => key !== ticket.status).map(([key, status]) => [key, status.label]))}</select><button class="button button-primary" type="submit">Atualizar</button></form></section>`}
      <section class="drawer-section"><h3>Comentários <span class="muted">(${number(comments.length)})</span></h3><div class="comment-list">${comments.length ? comments.map((comment) => `<article class="comment">${avatar(comment.autor)}<div class="comment-main"><div class="comment-meta"><strong>${esc(comment.autor)}</strong><time>${esc(date(comment.data, true))}</time></div><p>${esc(comment.texto)}</p></div></article>`).join('') : '<p class="comment-empty">Nenhum comentário ainda. Registre aqui as próximas informações do atendimento.</p>'}</div>${closed ? '' : `<form class="comment-form" id="comment-form" data-id="${id}"><div id="comment-error"></div><div class="form-field"><label for="comment-author">Seu nome</label><input id="comment-author" name="autor" maxlength="100" required placeholder="Quem está comentando?" autocomplete="name" value="${esc(lastCommentAuthor())}"></div><div class="form-field"><label for="comment-text">Comentário</label><textarea id="comment-text" name="texto" maxlength="2000" required rows="3" placeholder="O que mudou no atendimento?"></textarea></div><button class="button button-primary button-small" type="submit">${icon('send')}Enviar comentário</button></form>`}</section>`;
    const footer = `<button class="button button-secondary" data-action="edit" data-resource="chamados" data-id="${id}" ${closed ? 'disabled' : ''}>${icon('edit')}Editar chamado</button><button class="icon-button danger" data-action="delete" data-resource="chamados" data-id="${id}" aria-label="Excluir chamado" ${closed ? 'disabled' : ''}>${icon('trash')}</button>`;
    drawerRoot.innerHTML = drawerShell(`CHAMADO ${ticketNumber(id)}`, body, footer);
    if (focusAfter) drawerRoot.querySelector(focusAfter)?.focus();
    else drawerRoot.querySelector('[data-action="close-drawer"] + aside button, .drawer-header button')?.focus();
    if (initial) drawerRoot.querySelector('.drawer-header button')?.focus();
  } catch (error) {
    if (revision !== state.drawerRevision) return;
    drawerRoot.innerHTML = drawerShell('CHAMADO', `<h2 id="drawer-title" class="sr-only">Erro ao carregar chamado</h2>${emptyState('Não foi possível abrir', error.message, '<button class="button button-primary" data-action="retry-drawer">Tentar novamente</button>', 'alert')}`);
    drawerRoot.querySelector('.drawer-header button')?.focus();
  }
}

async function openClient(id, page = 0) {
  const revision = ++state.drawerRevision;
  beginDrawer('clientes', id);
  state.clientPage = page;
  drawerRoot.innerHTML = drawerShell('CLIENTE', '<h2 id="drawer-title" class="sr-only">Carregando cliente</h2><div class="skeleton skeleton-content"></div>');
  try {
    const [client, tickets] = await Promise.all([api.get('clientes', id), api.clientTickets(id, page)]);
    if (revision !== state.drawerRevision || state.drawerId !== id) return;
    state.drawerRecord = client;
    const body = `<div class="client-details-header">${avatar(client.nome, true)}<div><h2 id="drawer-title">${esc(client.nome)}</h2><p>Cliente #${id}</p></div></div><div class="detail-grid"><div class="detail-field"><small>E-mail</small><span>${esc(client.email)}</span></div><div class="detail-field"><small>Telefone</small><span>${esc(client.telefone || 'Não informado')}</span></div></div><section class="drawer-section"><h3>Chamados deste cliente <span class="muted">(${number(tickets.totalElements)})</span></h3>${tickets.content.length ? tickets.content.map((ticket) => `<a class="client-ticket" href="${ticketHref(ticket.id)}"><span class="ticket-number">${ticketNumber(ticket.id)}</span><span class="ticket-title">${esc(ticket.titulo)}</span><span class="client-ticket-row">${badge(ticket.status)}<span class="muted">${esc(date(ticket.dataAbertura))}</span></span></a>`).join('') + pagination(tickets, true) : '<p class="comment-empty">Este cliente ainda não tem chamados.</p>'}</section>`;
    drawerRoot.innerHTML = drawerShell('DETALHES DO CLIENTE', body, `<button class="button button-secondary" data-action="edit" data-resource="clientes" data-id="${id}">${icon('edit')}Editar cliente</button><button class="icon-button danger" data-action="delete" data-resource="clientes" data-id="${id}" aria-label="Excluir cliente">${icon('trash')}</button>`);
    drawerRoot.querySelector('.drawer-header button')?.focus();
  } catch (error) {
    if (revision !== state.drawerRevision) return;
    drawerRoot.innerHTML = drawerShell('CLIENTE', `<h2 id="drawer-title" class="sr-only">Erro ao carregar cliente</h2>${emptyState('Não foi possível abrir', error.message, '<button class="button button-primary" data-action="retry-drawer">Tentar novamente</button>', 'alert')}`);
  }
}

function confirmAction(title, message, label = 'Excluir', dangerous = true) {
  document.querySelector('#confirm-title').textContent = title;
  document.querySelector('#confirm-text').textContent = message;
  const accept = document.querySelector('#confirm-accept');
  accept.textContent = label;
  accept.className = `button ${dangerous ? 'button-danger' : 'button-primary'}`;
  confirmDialog.returnValue = '';
  confirmDialog.showModal();
  syncScroll();
  return new Promise((resolve) => {
    confirmDialog.addEventListener('close', () => { syncScroll(); resolve(confirmDialog.returnValue === 'confirm'); }, { once: true });
    document.querySelector('#confirm-cancel').focus();
  });
}

async function deleteRecord(resource, id) {
  const config = resources[resource];
  const label = resource === 'chamados' ? `chamado ${ticketNumber(id)}` : config.singular;
  if (!await confirmAction(`Excluir ${label}?`, 'Esta ação remove o registro. Confirme apenas se ele não for mais necessário.')) return;
  try {
    await api.remove(resource, id);
    closeDrawer(false);
    toast('Registro excluído.');
    await navigate();
  } catch (error) {
    if (!error.status) setConnection(false);
    const message = error.status === 409 && resource !== 'chamados'
      ? 'Este cadastro está vinculado a um chamado e não pode ser excluído.' : error.message;
    toast(message, true);
    if (resource === 'chamados' && state.drawerId === id && error.status === 409) await openTicket(id, false);
  }
}

async function submitTicketAction(form, action) {
  if (!form.reportValidity()) return;
  const id = Number(form.dataset.id);
  const values = Object.fromEntries(new FormData(form));
  if (action === 'status' && values.status === 'FECHADO') {
    if (!await confirmAction('Concluir este chamado?', 'Após o fechamento, o chamado fica disponível somente para consulta.', 'Concluir chamado', false)) return;
  }
  const button = form.querySelector('[type="submit"]');
  const original = button.innerHTML;
  button.disabled = true; button.textContent = 'Salvando…';
  try {
    if (action === 'assign') await api.assign(id, Number(values.tecnicoId));
    if (action === 'status') await api.status(id, values.status);
    if (action === 'comment') {
      await api.comment(id, { autor: values.autor.trim(), texto: values.texto.trim() });
      try { sessionStorage.setItem('fila-comment-author', values.autor.trim()); } catch { /* O comentário funciona mesmo sem armazenamento local. */ }
    }
    toast(action === 'assign' ? 'Responsável atualizado.' : action === 'status' ? 'Status atualizado.' : 'Comentário enviado.');
    await Promise.all([openTicket(id, false, action === 'comment' ? '#comment-text' : null), renderPage()]);
  } catch (error) {
    if (!error.status) setConnection(false);
    if (action === 'comment' && document.querySelector('#comment-error')) {
      document.querySelector('#comment-error').innerHTML = errorHtml(error);
    } else toast(error.message, true);
    if (error.status === 409 && state.drawerId === id) await openTicket(id, false);
  } finally {
    if (button.isConnected) { button.disabled = false; button.innerHTML = original; }
  }
}

function closeMenu() {
  document.querySelector('#sidebar').classList.remove('open');
  document.querySelector('#nav-backdrop').hidden = true;
  document.querySelector('#menu-toggle').setAttribute('aria-expanded', 'false');
  syncNavigationAccess();
  syncScroll();
}

function reportError(error) {
  if (!error.status) setConnection(false);
  toast(error.message || 'Não foi possível concluir. Tente novamente.', true);
}

async function handleAction(button) {
  const action = button.dataset.action;
  if (action === 'new-ticket') return openForm('chamados');
  if (action === 'new-record') return openForm(button.dataset.resource);
  if (action === 'edit') return openForm(button.dataset.resource, Number(button.dataset.id));
  if (action === 'delete') return deleteRecord(button.dataset.resource, Number(button.dataset.id));
  if (action === 'close-form') return formDialog.close();
  if (action === 'close-drawer') return closeDrawer();
  if (action === 'filter-status') return setTicketFilters({ status: button.dataset.status });
  if (action === 'reset-filters') return setTicketFilters({ ...defaults });
  if (action === 'ticket-page') return setTicketFilters({ page: Number(button.dataset.page) });
  if (action === 'client-page') return openClient(state.drawerId, Number(button.dataset.page));
  if (action === 'retry-drawer') return state.drawerKind === 'chamados' ? openTicket(state.drawerId) : openClient(state.drawerId);
  if (action === 'refresh') {
    button.disabled = true;
    try { await navigate(); }
    finally { if (button.isConnected) button.disabled = false; }
  }
}

document.addEventListener('click', (event) => {
  if (event.target.closest('.skip-link')) { event.preventDefault(); main.focus(); return; }
  const button = event.target.closest('[data-action]');
  if (button && !button.disabled) {
    event.preventDefault();
    handleAction(button).catch(reportError);
    return;
  }
  const ticket = event.target.closest('tr[data-ticket]');
  const client = event.target.closest('tr[data-client]');
  if (ticket && !event.target.closest('button')) { event.preventDefault(); location.hash = ticketHref(Number(ticket.dataset.ticket)); }
  else if (client && !event.target.closest('button')) { event.preventDefault(); location.hash = `#/clientes/${client.dataset.client}`; }
});

document.addEventListener('input', (event) => {
  if (event.target.id === 'record-search') {
    state.search = event.target.value;
    renderRecordContent();
  }
});

document.addEventListener('change', (event) => {
  const keys = { 'priority-filter': 'prioridade', 'client-filter': 'clienteId', 'sort-filter': 'sort' };
  if (keys[event.target.id]) setTicketFilters({ [keys[event.target.id]]: event.target.value });
});

document.addEventListener('submit', (event) => {
  const form = event.target;
  if (!['record-form', 'assign-form', 'status-form', 'comment-form', 'jump-form'].includes(form.id)) return;
  event.preventDefault();
  if (form.id === 'jump-form') {
    const input = form.elements.namedItem('numero').value.trim().replace(/^#/, '');
    const id = Number(input);
    if (!/^\d+$/.test(input) || !Number.isSafeInteger(id) || id < 1) { toast('Informe um número de chamado válido.', true); return; }
    location.hash = ticketHref(id);
    return;
  }
  const action = form.id === 'record-form' ? submitRecord(form)
    : submitTicketAction(form, { 'assign-form': 'assign', 'status-form': 'status', 'comment-form': 'comment' }[form.id]);
  action.catch(reportError);
});

document.querySelector('#confirm-accept').addEventListener('click', () => confirmDialog.close('confirm'));
document.querySelector('#confirm-cancel').addEventListener('click', () => confirmDialog.close('cancel'));
formDialog.addEventListener('close', syncScroll);
formDialog.addEventListener('click', (event) => {
  if (event.target === formDialog) {
    const box = formDialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) formDialog.close();
  }
});
document.querySelector('#menu-toggle').addEventListener('click', () => {
  const open = !document.querySelector('#sidebar').classList.contains('open');
  document.querySelector('#sidebar').classList.toggle('open', open);
  document.querySelector('#nav-backdrop').hidden = !open;
  document.querySelector('#menu-toggle').setAttribute('aria-expanded', String(open));
  syncNavigationAccess();
  syncScroll();
  if (open) document.querySelector('#sidebar .brand').focus();
});
document.querySelector('#nav-backdrop').addEventListener('click', closeMenu);
document.addEventListener('keydown', (event) => {
  if (formDialog.open || confirmDialog.open) return;
  if (event.key === 'Escape') { closeDrawer(); closeMenu(); }
  if (state.drawerId !== null) trapFocus(event, drawerRoot);
  else if (document.querySelector('#sidebar').classList.contains('open')) trapFocus(event, document.querySelector('#sidebar'));
});
window.addEventListener('hashchange', navigate);
mobileViewport.addEventListener('change', () => { closeMenu(); syncNavigationAccess(); });
paintIcons();
document.querySelector('#footer-date').textContent = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date());
navigate();
