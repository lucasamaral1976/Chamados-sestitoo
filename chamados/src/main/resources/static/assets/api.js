export class ApiError extends Error {
  constructor(message, status = 0, details = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

async function request(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(path, {
      ...options,
      signal: controller.signal,
      headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}) },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    if (response.status === 204) return null;
    const text = await response.text();
    let body;
    try { body = text ? JSON.parse(text) : null; } catch { body = null; }
    if (!response.ok) {
      const message = body?.erro || (response.status === 404 ? 'Registro não encontrado.' : 'Não foi possível concluir a operação.');
      throw new ApiError(message, response.status, Array.isArray(body?.detalhes) ? body.detalhes : []);
    }
    if (body === null) throw new ApiError('O servidor retornou uma resposta inesperada.', response.status);
    return body;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(error.name === 'AbortError' ? 'O servidor demorou para responder. Tente novamente.' : 'Sem conexão com o servidor. Verifique se a aplicação está rodando.');
  } finally {
    clearTimeout(timeout);
  }
}

function query(values) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== '' && value !== null && value !== undefined) params.set(key, value);
  }
  return params.size ? `?${params}` : '';
}

export const api = {
  list: (resource) => request(`/${resource}`),
  get: (resource, id) => request(`/${resource}/${id}`),
  create: (resource, body) => request(`/${resource}`, { method: 'POST', body }),
  update: (resource, id, body) => request(`/${resource}/${id}`, { method: 'PUT', body }),
  remove: (resource, id) => request(`/${resource}/${id}`, { method: 'DELETE' }),
  tickets: (filters = {}) => request(`/chamados${query(filters)}`),
  clientTickets: (id, page = 0) => request(`/clientes/${id}/chamados${query({ page, size: 8, sort: 'id,desc' })}`),
  assign: (id, tecnicoId) => request(`/chamados/${id}/atribuir`, { method: 'PATCH', body: { tecnicoId } }),
  status: (id, status) => request(`/chamados/${id}/status`, { method: 'PATCH', body: { status } }),
  comments: (id) => request(`/chamados/${id}/comentarios`),
  comment: (id, body) => request(`/chamados/${id}/comentarios`, { method: 'POST', body }),
};
