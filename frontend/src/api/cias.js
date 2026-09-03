const BASE_URL = 'http://localhost:3001/api/cias';

async function tratarResposta(resposta) {
  if (!resposta.ok) {
    const erro = await resposta.json().catch(() => ({}));
    throw new Error(erro.erro || 'Erro na requisição');
  }
  if (resposta.status === 204) return null;
  return resposta.json();
}

export async function listarCias() {
  return tratarResposta(await fetch(BASE_URL));
}

export async function criarCia(dados) {
  return tratarResposta(
    await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    })
  );
}
