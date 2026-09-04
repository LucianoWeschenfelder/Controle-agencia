import { formatarMoeda, formatarData } from './formato';

/*
 * Deixa o telefone só com dígitos e garante o código do país.
 * Números brasileiros têm 10 ou 11 dígitos com o DDD; nesse caso
 * o 55 é acrescentado na frente.
 */
export function normalizarTelefone(telefone) {
  const digitos = String(telefone || '').replace(/\D/g, '');
  if (!digitos) return '';

  if (digitos.length === 10 || digitos.length === 11) return `55${digitos}`;
  return digitos;
}

/*
 * Troca os marcadores do modelo pelos dados da cotação.
 * Marcadores aceitos: {cliente} {origem} {destino} {ida} {volta} {valor} {agencia}
 */
export function montarMensagem(modelo, cotacao, config) {
  const valores = {
    cliente: cotacao?.cliente?.nome || '',
    origem: cotacao?.origem || '',
    destino: cotacao?.destino || '',
    ida: formatarData(cotacao?.data_ida),
    volta: cotacao?.data_volta ? formatarData(cotacao.data_volta) : '',
    valor: cotacao?.preco_venda ? formatarMoeda(cotacao.preco_venda) : '',
    agencia: config?.agencia_nome || '',
  };

  return String(modelo || '').replace(
    /\{(\w+)\}/g,
    (original, chave) => (chave in valores ? valores[chave] : original)
  );
}

// Abre a conversa do cliente no WhatsApp com a mensagem já escrita
export function abrirWhatsApp(telefone, mensagem) {
  const numero = normalizarTelefone(telefone);

  const base = numero
    ? `https://wa.me/${numero}`
    : 'https://wa.me/'; // sem telefone, o WhatsApp pede o contato

  const url = mensagem ? `${base}?text=${encodeURIComponent(mensagem)}` : base;
  window.open(url, '_blank');
}
