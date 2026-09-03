const BASE_URL = 'http://localhost:3001/api/configuracoes';

async function tratarResposta(resposta) {
  if (!resposta.ok) {
    const erro = await resposta.json().catch(() => ({}));
    throw new Error(erro.erro || 'Erro na requisição');
  }
  return resposta.json();
}

export async function buscarConfiguracoes() {
  return tratarResposta(await fetch(BASE_URL));
}

export async function salvarConfiguracoes(dados) {
  return tratarResposta(
    await fetch(BASE_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    })
  );
}
