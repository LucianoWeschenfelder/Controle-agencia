/*
 * Ícones desenhados em SVG, embutidos no próprio documento. Nada de arquivo
 * externo: assim o PDF e o Word saem com os ícones mesmo offline.
 */
const TRACOS = {
  aviao: '<path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5L21 16z"/>',

  mochila:
    '<path d="M9 4a3 3 0 0 1 6 0h1a4 4 0 0 1 4 4v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V8a4 4 0 0 1 4-4h1zm2 0h2a1 1 0 0 0-2 0zM8 12h8v2H8v-2z"/>',

  'bagagem-mao':
    '<path d="M9 2h6a1 1 0 0 1 1 1v3h1a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3h1V3a1 1 0 0 1 1-1zm1 4h4V4h-4v2zm-1 5v7h2v-7H9zm4 0v7h2v-7h-2z"/>',

  'bagagem-despachada':
    '<path d="M8 2h8a1 1 0 0 1 1 1v3h2a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2v1h-2v-1H7v1H5v-1a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2V3a1 1 0 0 1 1-1zm1 4h6V4H9v2zM7 10v8h2v-8H7zm4 0v8h2v-8h-2zm4 0v8h2v-8h-2z"/>',

  troca:
    '<path d="M7 7h9V4l5 4-5 4V9H7a3 3 0 0 0-3 3H2a5 5 0 0 1 5-5zm10 10H8v3l-5-4 5-4v3h9a3 3 0 0 0 3-3h2a5 5 0 0 1-5 5z"/>',

  assento:
    '<path d="M6 3h2v9h6a3 3 0 0 1 3 3v6h-2v-6a1 1 0 0 0-1-1H6V3zm12 15h2v3h-2v-3zM4 18h9v3H4a2 2 0 0 1-2-2 1 1 0 0 1 2-1z"/>',

  cancelamento:
    '<path d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm0 2a8 8 0 0 0-6.3 12.9L16.9 5.7A8 8 0 0 0 12 4zm0 16a8 8 0 0 0 6.3-12.9L7.1 18.3A8 8 0 0 0 12 20z"/>',

  estrela:
    '<path d="M12 2l3 6.6 7.2.8-5.4 4.9 1.5 7.1L12 17.8 5.7 21.4l1.5-7.1L1.8 9.4l7.2-.8L12 2z"/>',
};

export function iconeSvg(nome, cor = '#14243f', tamanho = 26) {
  const traco = TRACOS[nome] || TRACOS.estrela;

  return `<svg viewBox="0 0 24 24" width="${tamanho}" height="${tamanho}" fill="${cor}" aria-hidden="true">${traco}</svg>`;
}

// Lista usada na tela, para escolher o ícone de um item novo
export const ICONES_DISPONIVEIS = Object.keys(TRACOS);
