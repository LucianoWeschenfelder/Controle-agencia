const BASE_URL = 'http://localhost:3001/api/clientes';

async function tratarResposta(resposta) {
  if (!resposta.ok) {
    const erro = await resposta.json().catch(() => ({}));
    throw new Error(erro.erro || 'Erro na requisição');
  }
  if (resposta.status === 204) return null;
  return resposta.json();
}

export async function listarClientes(busca = '') {
  const url = busca ? `${BASE_URL}?busca=${encodeURIComponent(busca)}` : BASE_URL;
  const resposta = await fetch(url);
  return tratarResposta(resposta);
}

export async function criarCliente(dados) {
  const resposta = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados),
  });
  return tratarResposta(resposta);
}

export async function editarCliente(id, dados) {
  const resposta = await fetch(`${BASE_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados),
  });
  return tratarResposta(resposta);
}

export async function excluirCliente(id) {
  const resposta = await fetch(`${BASE_URL}/${id}`, { method: 'DELETE' });
  return tratarResposta(resposta);
}
