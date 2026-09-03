const BASE = 'http://localhost:3001/api';

async function tratarResposta(resposta) {
  if (!resposta.ok) {
    const erro = await resposta.json().catch(() => ({}));
    throw new Error(erro.erro || 'Erro na requisição');
  }
  return resposta.json();
}

function buscar(recurso) {
  return async () => tratarResposta(await fetch(`${BASE}/${recurso}`));
}

function criar(recurso) {
  return async (dados) =>
    tratarResposta(
      await fetch(`${BASE}/${recurso}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados),
      })
    );
}

export const listarCidades = buscar('cidades');
export const criarCidade = criar('cidades');

export const listarAeroportos = buscar('aeroportos');
export const criarAeroporto = criar('aeroportos');

export const listarItensTarifa = buscar('itens-tarifa');
export const criarItemTarifa = criar('itens-tarifa');
