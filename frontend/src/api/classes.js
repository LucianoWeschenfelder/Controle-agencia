const BASE_URL = 'http://localhost:3001/api/classes';

async function tratarResposta(resposta) {
  if (!resposta.ok) {
    const erro = await resposta.json().catch(() => ({}));
    throw new Error(erro.erro || 'Erro na requisição');
  }
  return resposta.json();
}

export async function listarClasses() {
  return tratarResposta(await fetch(BASE_URL));
}

export async function criarClasse(nome) {
  return tratarResposta(
    await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome }),
    })
  );
}
