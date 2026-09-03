import { formatarMoeda } from './formato';
import { FONTE_MONTSERRAT } from './fonte-montserrat';
import { minutosEntre, formatarDuracao, chegaNoDiaSeguinte, somarDias } from './tempo';

const MESES = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

function emLista(texto) {
  return (texto || '').split('\n').map((l) => l.trim()).filter(Boolean);
}

// 2026-11-12 -> "12 Nov 2026"
function dataExtenso(data) {
  if (!data) return '';
  const [ano, mes, dia] = data.slice(0, 10).split('-');
  return `${dia} ${MESES[Number(mes) - 1]} ${ano}`;
}

// 2026-11-12 -> "12 Nov"
function dataCurta(data) {
  if (!data) return '';
  const [, mes, dia] = data.slice(0, 10).split('-');
  return `${dia} ${MESES[Number(mes) - 1]}`;
}

// Sigla -> "Cidade (SIGLA)", usando a lista de aeroportos cadastrados
function nomeAeroporto(sigla, aeroportos) {
  if (!sigla) return '';
  const encontrado = aeroportos.find((a) => a.sigla === sigla.toUpperCase());
  return encontrado ? `${encontrado.cidade} (${encontrado.sigla})` : sigla;
}

function cidadeAeroporto(sigla, aeroportos) {
  if (!sigla) return '';
  const encontrado = aeroportos.find((a) => a.sigla === sigla.toUpperCase());
  return encontrado ? encontrado.cidade : sigla;
}

/*
 * Calcula tudo o que o bloco de um sentido precisa: cada voo com seus
 * horários e datas, as conexões entre eles e os tempos totais.
 */
function prepararSentido(trechos) {
  const comEscolha = trechos.filter((t) => t.opcao_escolhida);
  if (!comEscolha.length) return null;

  const voos = comEscolha.map((t) => {
    const o = t.opcao_escolhida;

    const viraODia = chegaNoDiaSeguinte(o.hora_saida, o.hora_chegada);
    const dataChegada = viraODia ? somarDias(t.data, 1) : t.data;

    // Duração informada manualmente tem prioridade (voo internacional muda de fuso)
    const automatica = minutosEntre(t.data, o.hora_saida, t.data, o.hora_chegada);
    const duracao = o.duracao_min != null && o.duracao_min !== '' ? Number(o.duracao_min) : automatica;

    return {
      trecho: t,
      opcao: o,
      dataSaida: t.data,
      dataChegada,
      viraODia,
      duracao,
    };
  });

  // Conexão: entre a chegada de um voo e a saída do seguinte
  const conexoes = voos.slice(0, -1).map((v, i) => {
    const proximo = voos[i + 1];
    return {
      sigla: v.trecho.destino,
      minutos: minutosEntre(
        v.dataChegada, v.opcao.hora_chegada,
        proximo.dataSaida || v.dataChegada, proximo.opcao.hora_saida
      ),
      // Companhias diferentes = bilhetes separados, bagagem não segue direto
      naoVinculada: Boolean(
        v.opcao.cia && proximo.opcao.cia && v.opcao.cia !== proximo.opcao.cia
      ),
    };
  });

  const somaVoos = voos.every((v) => v.duracao !== null)
    ? voos.reduce((s, v) => s + v.duracao, 0) : null;

  const somaConexoes = conexoes.every((c) => c.minutos !== null)
    ? conexoes.reduce((s, c) => s + c.minutos, 0) : null;

  const total = somaVoos !== null && somaConexoes !== null ? somaVoos + somaConexoes : null;

  return { voos, conexoes, somaVoos, somaConexoes, total };
}

function blocoSentido(sentido, rotulo, aeroportos) {
  if (!sentido) return '';

  const { voos, conexoes, somaVoos, somaConexoes, total } = sentido;

  const origem = voos[0].trecho.origem;
  const destino = voos[voos.length - 1].trecho.destino;
  const qtdConexoes = conexoes.length;

  const etiquetaConexao =
    qtdConexoes === 0
      ? 'Voo Direto'
      : `${qtdConexoes} Conexão${qtdConexoes > 1 ? 'es' : ''}`;

  const linhas = voos
    .map((v, i) => {
      const o = v.opcao;

      const marcaChegada = v.viraODia ? '<sup>+1</sup>' : '';
      const datasVoo = v.viraODia
        ? `${dataCurta(v.dataSaida)} → ${dataCurta(v.dataChegada)}`
        : dataExtenso(v.dataSaida);

      const voo = `
        <div class="voo">
          <div class="voo-horas">
            <div class="horas">${o.hora_saida || ''} → ${o.hora_chegada || ''}${marcaChegada}</div>
            <div class="voo-datas">${datasVoo}</div>
          </div>
          <div class="voo-rota">
            <div class="rota-siglas">${v.trecho.origem || ''} <span class="seta">→</span> ${v.trecho.destino || ''}</div>
            <div class="voo-numero">
              ${o.numero_voo ? `Voo ${o.numero_voo}` : ''}${o.numero_voo && o.cia ? ' • ' : ''}${o.cia ? `Operado por ${o.cia}` : ''}
            </div>
          </div>
          <div class="voo-info">
            ${v.duracao !== null ? `<div><strong>Duração:</strong> ${formatarDuracao(v.duracao)}</div>` : ''}
            ${o.classe ? `<div><strong>Classe:</strong> ${o.classe}</div>` : ''}
            ${o.aeronave ? `<div><strong>Aeronave:</strong> ${o.aeronave}</div>` : ''}
          </div>
        </div>
      `;

      const c = conexoes[i];
      const conexao = c
        ? `<div class="conexao${c.naoVinculada ? ' conexao-solta' : ''}">
             Conexão em ${nomeAeroporto(c.sigla, aeroportos)}: ${formatarDuracao(c.minutos)}
             ${
               c.naoVinculada
                 ? '<div class="conexao-obs">Escala não vinculada — companhias diferentes: bagagem e check-in feitos separadamente</div>'
                 : ''
             }
           </div>`
        : '';

      return voo + conexao;
    })
    .join('');

  const rodape =
    total !== null
      ? `<div class="sentido-total">
           Tempo total de viagem na ${rotulo.toLowerCase()}: ${formatarDuracao(total)}
           ${
             qtdConexoes > 0
               ? `(Voos: ${formatarDuracao(somaVoos)} | Conexão: ${formatarDuracao(somaConexoes)})`
               : '(Sem conexões)'
           }
         </div>`
      : '';

  return `
    <div class="sentido">
      <div class="sentido-topo">
        <span class="sentido-titulo">
          ${rotulo.toUpperCase()}: ${dataExtenso(voos[0].dataSaida)} —
          ${cidadeAeroporto(origem, aeroportos).toUpperCase()} (${origem}) →
          ${cidadeAeroporto(destino, aeroportos).toUpperCase()} (${destino})
        </span>
        <span class="sentido-conexao">${etiquetaConexao}</span>
      </div>
      ${linhas}
      ${rodape}
    </div>
  `;
}

// Itens fixos da tarifa mais as bagagens escolhidas na cotação
// Itens marcados como incluídos na própria cotação
function blocoIncluido(cotacao) {
  const itens = (cotacao.itens || []).map((i) => ({
    titulo: i.tem_quantidade && i.quantidade > 1 ? `${i.quantidade}x ${i.titulo}` : i.titulo,
    descricao: i.descricao || '',
  }));

  if (!itens.length) return '';

  return itens
    .map(
      (i) => `
      <div class="incluido-item">
        <div class="incluido-titulo">${i.titulo}</div>
        <div class="incluido-descricao">${i.descricao}</div>
      </div>`
    )
    .join('');
}

/*
 * Preço no cartão = preço à vista acrescido da taxa configurada.
 * O desconto do PIX é a diferença entre os dois, em percentual.
 */
function calcularPagamento(cotacao, config) {
  const aVista = cotacao.preco_venda;
  if (!aVista) return null;

  const taxa = Number(config.taxa_cartao) || 0;
  const parcelas = Number(config.parcelas_cartao) || 1;

  const noCartao = aVista * (1 + taxa / 100);
  const porParcela = noCartao / parcelas;
  const descontoPix = noCartao > 0 ? ((noCartao - aVista) / noCartao) * 100 : 0;

  return { aVista, noCartao, parcelas, porParcela, descontoPix };
}

function listaHtml(itens) {
  if (!itens.length) return '';
  return `<ul>${itens.map((i) => `<li>${i}</li>`).join('')}</ul>`;
}

export function gerarHtmlOrcamento(cotacao, config, aeroportos = []) {
  const ida = prepararSentido(cotacao.trechos_ida);
  const volta = prepararSentido(cotacao.trechos_volta);

  const origemGeral = ida ? ida.voos[0].trecho.origem : cotacao.origem;
  const destinoGeral = ida ? ida.voos[ida.voos.length - 1].trecho.destino : cotacao.destino;

  const pagamento = calcularPagamento(cotacao, config);
  const passageiros = cotacao.passageiros || 1;

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Orçamento de viagem - ${cotacao.cliente?.nome || ''}</title>
<style>
  ${FONTE_MONTSERRAT}
  @page { size: A4; margin: 8mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #1a2436; font-size: 11px; margin: 0; background: white; }

  /* Cabeçalho: arte à esquerda ocupando pouco mais da metade, dados à direita */
  .cabecalho { position: relative; display: flex; align-items: center; background: #f6ebdb;
    margin: 10px 10px 10px 0; overflow: hidden; }
  .cabecalho-arte { width: 70%; height: auto; display: block; margin-right: -1px; }
  .cabecalho-texto { width: 62%; background: #14243f; display: flex; align-items: center; padding: 18px 24px; }
  .cabecalho-titulo { color: white; font-size: 22px; font-weight: bold; line-height: 1.12; letter-spacing: 1.5px; }
  .cabecalho-dados { flex: 1; display: flex; flex-direction: column; justify-content: center;
    align-items: flex-end; text-align: right; padding: 0 20px;
    font-family: 'Montserrat', Arial, Helvetica, sans-serif;
    font-size: 19px; font-weight: 400; line-height: 1.7; color: #1a2436; }
  .cabecalho-dados strong { color: #14243f; font-weight: 700; }

  .resumo { background: #1d3053; color: white; text-align: center; padding: 12px; font-size: 14px; line-height: 1.5; }
  .resumo strong { font-weight: bold; }
  .resumo-linha2 { font-size: 12px; opacity: 0.9; }

  .conteudo { padding: 16px 22px; }

  h2.secao { font-size: 13px; letter-spacing: 1px; color: #14243f; text-transform: uppercase; border-bottom: 2px solid #14243f; padding-bottom: 5px; margin: 0 0 12px; }

  .sentido { border: 1px solid #e2e6ec; border-radius: 6px; margin-bottom: 14px; overflow: hidden; }
  .sentido-topo { background: #f2ede1; padding: 8px 14px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e6ec; }
  .sentido-titulo { font-size: 11px; font-weight: bold; color: #14243f; letter-spacing: 0.3px; }
  .sentido-conexao { font-size: 11px; font-weight: bold; color: #8a6d2f; letter-spacing: 0.5px; }

  .voo { display: flex; align-items: center; gap: 14px; padding: 12px 14px; }
  .voo-horas { min-width: 130px; }
  .horas { font-size: 16px; font-weight: bold; color: #14243f; }
  .horas sup { color: #b08d3d; font-size: 10px; }
  .voo-datas { font-size: 10px; color: #6b7688; margin-top: 2px; }
  .voo-rota { flex: 1; text-align: center; }
  .rota-siglas { font-size: 15px; font-weight: bold; color: #b08d3d; letter-spacing: 1px; }
  .rota-siglas .seta { color: #1a2436; }
  .voo-numero { font-size: 10px; color: #6b7688; margin-top: 3px; }
  .voo-info { min-width: 175px; text-align: right; font-size: 10px; line-height: 1.6; color: #3c4759; }

  .conexao { background: #fbf7ee; border-top: 1px dashed #ddd3bd; border-bottom: 1px dashed #ddd3bd; text-align: center; padding: 6px; font-size: 10px; font-weight: bold; color: #8a6d2f; }

  .conexao-solta { background: #fdeee8; border-color: #e8b9a6; color: #a2482a; }
  .conexao-obs { font-weight: normal; font-size: 9px; margin-top: 3px; }

  .sentido-total { border-top: 1px dashed #dfe4ea; text-align: right; padding: 7px 14px; font-size: 10px; font-style: italic; color: #6b7688; }

  .incluido { display: flex; gap: 10px; border: 1px solid #e2e6ec; border-radius: 6px; padding: 12px; margin-bottom: 14px; }
  .incluido-item { flex: 1; text-align: center; }
  .incluido-titulo { font-size: 11px; font-weight: bold; color: #14243f; }
  .incluido-descricao { font-size: 9px; color: #6b7688; margin-top: 2px; }

  .pagamento { background: #14243f; color: white; border-radius: 6px; padding: 16px 18px; display: flex; gap: 18px; margin-bottom: 12px; }
  .pagamento-bloco { flex: 1; }
  .pagamento-bloco + .pagamento-bloco { border-left: 1px solid #2f4468; padding-left: 18px; }
  .pagamento-rotulo { font-size: 10px; letter-spacing: 1px; color: #d4b062; text-transform: uppercase; margin-bottom: 5px; }
  .pagamento-valor { font-size: 24px; font-weight: bold; }
  .pagamento-valor.menor { font-size: 19px; }
  .pagamento-nota { font-size: 10px; margin-top: 5px; opacity: 0.85; }
  .pagamento-nota.destaque { color: #7ddc9a; opacity: 1; }

  .chamada { border: 1px dashed #d4b062; border-radius: 6px; text-align: center; padding: 8px; font-size: 11px; color: #8a6d2f; margin-bottom: 14px; }

  .rodape { display: flex; gap: 18px; border-top: 2px solid #14243f; padding-top: 10px; }
  .rodape-coluna { flex: 1; }
  .rodape-titulo { font-size: 11px; font-weight: bold; color: #14243f; margin-bottom: 5px; }
  .rodape ul { margin: 0; padding-left: 15px; }
  .rodape li { font-size: 10px; margin-bottom: 3px; color: #3c4759; }

  .aviso { text-align: center; font-size: 9px; color: #8a93a2; margin-top: 12px; padding-top: 8px; border-top: 1px solid #e2e6ec; line-height: 1.5; }
</style>
</head>
<body>

<div class="cabecalho">
  ${
    config.cabecalho_imagem
      ? `<img class="cabecalho-arte" src="${config.cabecalho_imagem}" alt="" />`
      : `<div class="cabecalho-texto">
           <div class="cabecalho-titulo">ORÇAMENTO<br />DE VIAGEM</div>
         </div>`
  }
  <div class="cabecalho-dados">
    <div><strong>CLIENTE:</strong> ${cotacao.cliente?.nome || ''}</div>
    <div><strong>DATA:</strong> ${dataExtenso(cotacao.data_conclusao) || dataExtenso(cotacao.criado_em)}</div>
    <div><strong>REF:</strong> ${cotacao.referencia || ''}</div>
  </div>
</div>

<div class="resumo">
  <strong>Resumo da viagem:</strong>
  ${nomeAeroporto(origemGeral, aeroportos)} → ${nomeAeroporto(destinoGeral, aeroportos)}
  <div class="resumo-linha2">
    ${cotacao.tipo_viagem === 'ida' ? 'Somente Ida' : 'Ida e Volta'} |
    ${String(passageiros).padStart(2, '0')} Passageiro(s)
  </div>
</div>

<div class="conteudo">

  <h2 class="secao">Voos Selecionados</h2>
  ${blocoSentido(ida, 'Ida', aeroportos)}
  ${blocoSentido(volta, 'Volta', aeroportos)}

  ${
    (cotacao.itens || []).length
      ? `<h2 class="secao">O que está incluído na tarifa</h2>
         <div class="incluido">${blocoIncluido(cotacao)}</div>`
      : ''
  }

  ${
    pagamento
      ? `<div class="pagamento">
           <div class="pagamento-bloco">
             <div class="pagamento-rotulo">Pagamento à vista (PIX)</div>
             <div class="pagamento-valor">${formatarMoeda(pagamento.aVista)}</div>
             ${
               pagamento.descontoPix > 0
                 ? `<div class="pagamento-nota destaque">${pagamento.descontoPix.toFixed(
                     0
                   )}% OFF aplicado no PIX</div>`
                 : ''
             }
           </div>
           <div class="pagamento-bloco">
             <div class="pagamento-rotulo">Pagamento parcelado no cartão</div>
             <div class="pagamento-valor menor">OU ${formatarMoeda(pagamento.noCartao)}</div>
             <div class="pagamento-nota">
               Em até ${pagamento.parcelas}x de ${formatarMoeda(pagamento.porParcela)} sem juros
             </div>
           </div>
         </div>
         <div class="chamada">Encontrou mais barato? Fale conosco!</div>`
      : ''
  }

  <div class="rodape">
    <div class="rodape-coluna">
      <div class="rodape-titulo">Formas de Pagamento</div>
      ${listaHtml(emLista(config.formas_pagamento))}
    </div>
    <div class="rodape-coluna">
      <div class="rodape-titulo">
        Por que escolher a ${config.agencia_nome || 'nossa agência'} para comprar sua viagem?
      </div>
      ${listaHtml(emLista(config.por_que_escolher))}
    </div>
  </div>

  <div class="aviso">
    ${config.rodape_aviso || ''}
    ${config.agencia_contato ? `<br />${config.agencia_contato}` : ''}
  </div>

</div>
</body>
</html>
  `.trim();
}

export function gerarPdf(cotacao, config, aeroportos) {
  const html = gerarHtmlOrcamento(cotacao, config, aeroportos);
  const janela = window.open('', '_blank');

  if (!janela) {
    alert('O navegador bloqueou a nova aba. Libere os pop-ups para gerar o PDF.');
    return;
  }

  janela.document.write(html);
  janela.document.close();
  janela.focus();
  setTimeout(() => janela.print(), 400);
}

export function gerarWord(cotacao, config, aeroportos) {
  const html = gerarHtmlOrcamento(cotacao, config, aeroportos);
  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `orcamento-${cotacao.referencia || cotacao.id}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
