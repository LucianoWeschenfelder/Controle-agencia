const BASE_URL = 'http://localhost:3001/api/fornecedores';

async function tratarResposta(resposta) {
  if (!resposta.ok) {
    const erro = await resposta.json().catch(() => ({}));
    throw new Error(erro.erro || 'Erro na requisição');
  }
  if (resposta.status === 204) return null;
  return resposta.json();
}

export async function listarFornecedores() {
  return tratarResposta(await fetch(BASE_URL));
}

export async function criarFornecedor(dados) {
  return tratarResposta(
    await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    })
  );
}

export async function editarFornecedor(id, dados) {
  return tratarResposta(
    await fetch(`${BASE_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    })
  );
}

export async function excluirFornecedor(id) {
  return tratarResposta(await fetch(`${BASE_URL}/${id}`, { method: 'DELETE' }));
}
