const BASE_URL = 'http://localhost:3001/api/cotacoes';

async function tratarResposta(resposta) {
  if (!resposta.ok) {
    const erro = await resposta.json().catch(() => ({}));
    throw new Error(erro.erro || 'Erro na requisição');
  }
  if (resposta.status === 204) return null;
  return resposta.json();
}

export async function listarCotacoes({ status = '', busca = '' } = {}) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (busca) params.set('busca', busca);

  const url = params.toString() ? `${BASE_URL}?${params}` : BASE_URL;
  return tratarResposta(await fetch(url));
}

export async function criarCotacao(dados) {
  return tratarResposta(
    await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    })
  );
}

export async function editarCotacao(id, dados) {
  return tratarResposta(
    await fetch(`${BASE_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    })
  );
}

export async function alterarStatus(id, status) {
  return tratarResposta(
    await fetch(`${BASE_URL}/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
  );
}

export async function excluirCotacao(id) {
  return tratarResposta(await fetch(`${BASE_URL}/${id}`, { method: 'DELETE' }));
}

export async function definirFornecedor(id, dados) {
  return tratarResposta(
    await fetch(`${BASE_URL}/${id}/fornecedor`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    })
  );
}

export async function alterarDatas(id, dados) {
  return tratarResposta(
    await fetch(`${BASE_URL}/${id}/datas`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    })
  );
}
