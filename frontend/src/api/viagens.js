const BASE_URL = 'http://localhost:3001/api/viagens';

async function tratarResposta(resposta) {
  if (!resposta.ok) {
    const erro = await resposta.json().catch(() => ({}));
    throw new Error(erro.erro || 'Erro na requisição');
  }
  if (resposta.status === 204) return null;
  return resposta.json();
}

export async function listarViagens(busca = '') {
  const url = busca ? `${BASE_URL}?busca=${encodeURIComponent(busca)}` : BASE_URL;
  return tratarResposta(await fetch(url));
}

export async function listarCotacoesDisponiveis() {
  return tratarResposta(await fetch(`${BASE_URL}/disponiveis`));
}

export async function criarViagem(dados) {
  return tratarResposta(
    await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    })
  );
}

export async function editarViagem(id, dados) {
  return tratarResposta(
    await fetch(`${BASE_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    })
  );
}

export async function marcarCheckin(viagemId, chave, feito) {
  return tratarResposta(
    await fetch(`${BASE_URL}/${viagemId}/checkin`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chave, feito }),
    })
  );
}

export async function excluirViagem(id) {
  return tratarResposta(await fetch(`${BASE_URL}/${id}`, { method: 'DELETE' }));
}

export async function buscarViagem(id) {
  return tratarResposta(await fetch(`${BASE_URL}/${id}`));
}

export async function definirLocalizador(viagemId, chave, localizador) {
  return tratarResposta(
    await fetch(`${BASE_URL}/${viagemId}/localizador`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chave, localizador }),
    })
  );
}

export async function salvarBloco(viagemId, dados) {
  return tratarResposta(
    await fetch(`${BASE_URL}/${viagemId}/bloco`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    })
  );
}

export async function salvarVoos(viagemId, voos) {
  return tratarResposta(
    await fetch(`${BASE_URL}/${viagemId}/voos`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voos }),
    })
  );
}
