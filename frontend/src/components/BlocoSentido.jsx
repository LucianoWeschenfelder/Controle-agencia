import { useState } from 'react';
import SeletorCia from './SeletorCia';
import SeletorAeroporto from './SeletorAeroporto';
import { formatarMoeda } from '../utils/formato';
import { minutosEntre, formatarDuracao, dataDeChegada } from '../utils/tempo';

// custo por passageiro = (milhas / 1000 x milheiro) + taxa + bagagem
export function calcularCusto(opcao) {
  const milhas = Number(opcao.milhas) || 0;
  const milheiro = Number(opcao.valor_milheiro) || 0;
  const taxa = Number(opcao.taxa) || 0;
  const bagagem = Number(opcao.bagagem) || 0;

  return (milhas / 1000) * milheiro + taxa + bagagem;
}

function LinhaOpcao({
  opcao, trecho, maisBarata, aberta, onAlterar, onEscolher, onRemover, onAlternarDetalhe,
  podeRemover, cias, onNovaCia, pagantes,
}) {
  const custo = calcularCusto(opcao);
  const custoTodos = custo * pagantes;

  // Os horários vivem nos voos da opção, preenchidos na aba "Dados do voo"
  const detalheCompleto = (opcao.voos || []).some((v) => v.hora_saida && v.hora_chegada);

  return (
    <>
      <tr className={opcao.escolhida ? 'linha-escolhida' : ''}>
        <td className="col-radio">
          <input type="radio" checked={!!opcao.escolhida} onChange={onEscolher} />
        </td>
        <td>
          <SeletorCia
            valor={opcao.cia}
            cias={cias}
            onSelecionar={(v) => onAlterar('cia', v)}
            onNovaCia={onNovaCia}
          />
        </td>
        <td>
          <input
            type="number"
            value={opcao.milhas}
            onChange={(e) => onAlterar('milhas', e.target.value)}
          />
        </td>
        <td>
          <input
            type="number"
            step="0.01"
            value={opcao.valor_milheiro}
            onChange={(e) => onAlterar('valor_milheiro', e.target.value)}
          />
        </td>
        <td>
          <input
            type="number"
            step="0.01"
            value={opcao.taxa}
            onChange={(e) => onAlterar('taxa', e.target.value)}
          />
        </td>
        <td>
          <input
            type="number"
            step="0.01"
            value={opcao.bagagem}
            onChange={(e) => onAlterar('bagagem', e.target.value)}
          />
        </td>
        <td className="celula-valor">
          {formatarMoeda(custo)}
          {maisBarata && <span className="selo-barato">mais barata</span>}
        </td>
        <td className="celula-valor destaque">{formatarMoeda(custoTodos)}</td>
        <td className="col-acoes-opcao">
          <span
            className={`selo-voo ${detalheCompleto ? 'preenchido' : ''}`}
            title="Os horários são preenchidos na aba Dados do voo"
          >
            {detalheCompleto ? '✓ voo' : 'sem voo'}
          </span>
          {podeRemover && (
            <button type="button" className="btn-remover" onClick={onRemover} title="Remover CIA">
              ✕
            </button>
          )}
        </td>
      </tr>

    </>
  );
}

function CabecalhoTrecho({ trecho, indice, editando, onAlterar, onEditar, onRemover, podeRemover, onAdicionarCia, aeroportos, onNovoAeroporto, cidades, onNovaCidade }) {
  if (editando) {
    return (
      <div className="trecho-topo editando">
        <div className="trecho-campos">
          <div className="campo-seletor">
            <span className="campo-seletor-rotulo">Origem</span>
            <SeletorAeroporto
              valor={trecho.origem}
              aeroportos={aeroportos}
              onSelecionar={(v) => onAlterar('origem', v)}
              onNovoAeroporto={onNovoAeroporto}
              cidades={cidades}
              onNovaCidade={onNovaCidade}
            />
          </div>
          <div className="campo-seletor">
            <span className="campo-seletor-rotulo">Destino</span>
            <SeletorAeroporto
              valor={trecho.destino}
              aeroportos={aeroportos}
              onSelecionar={(v) => onAlterar('destino', v)}
              onNovoAeroporto={onNovoAeroporto}
              cidades={cidades}
              onNovaCidade={onNovaCidade}
            />
          </div>
          <label>
            Data
            <input
              type="date"
              value={trecho.data}
              onChange={(e) => onAlterar('data', e.target.value)}
            />
          </label>
        </div>
        <button type="button" className="btn-mini" onClick={onEditar}>
          Pronto
        </button>
      </div>
    );
  }

  return (
    <div className="trecho-topo">
      <div>
        <span className="trecho-titulo">
          Trecho {indice + 1} · {trecho.origem || '—'} → {trecho.destino || '—'}
        </span>
        {trecho.data && <span className="trecho-data">{trecho.data.split('-').reverse().join('/')}</span>}
      </div>

      <div className="trecho-acoes">
        <button type="button" className="btn-mini" onClick={onEditar}>
          Editar
        </button>
        <button type="button" className="btn-mini" onClick={onAdicionarCia}>
          + CIA
        </button>
        {podeRemover && (
          <button type="button" className="btn-mini cancelar" onClick={onRemover}>
            Excluir trecho
          </button>
        )}
      </div>
    </div>
  );
}

export default function BlocoSentido({
  titulo, icone, rota, trechos, cias, onNovaCia, aeroportos, onNovoAeroporto,
  cidades, onNovaCidade, pagantes = 1,
  onAlterarTrecho, onAdicionarTrecho, onRemoverTrecho,
  onAlterarOpcao, onAdicionarOpcao, onRemoverOpcao, onEscolherOpcao,
}) {
  const [editando, setEditando] = useState(null);
  const [detalheAberto, setDetalheAberto] = useState(null); // "indiceTrecho-indiceOpcao"

  // Subtotal e tempos do sentido, a partir das opções escolhidas
  const escolhidas = trechos.map((t) => t.opcoes.find((o) => o.escolhida) || null);
  const subtotal = escolhidas.filter(Boolean).reduce((s, o) => s + calcularCusto(o), 0);
  const temEscolha = escolhidas.some(Boolean);

  // Primeiro e último voo de uma opção, base para os horários do trecho
  function primeiroVoo(opcao) {
    return (opcao?.voos || []).find((v) => v.hora_saida) || null;
  }

  function ultimoVoo(opcao) {
    return [...(opcao?.voos || [])].reverse().find((v) => v.hora_chegada) || null;
  }

  // Duração do trecho: da saída do primeiro voo à chegada do último
  function duracaoDe(trecho, opcao) {
    const inicio = primeiroVoo(opcao);
    const fim = ultimoVoo(opcao);
    if (!inicio || !fim) return null;

    return minutosEntre(
      inicio.data || trecho.data, inicio.hora_saida,
      fim.data || trecho.data, fim.hora_chegada
    );
  }

  // Escalas: da chegada de um trecho até a saída do seguinte.
  // A chegada pode ter caído no dia seguinte, então usamos a data real.
  const escalas = trechos.slice(0, -1).map((t, i) => {
    const fimAtual = ultimoVoo(escolhidas[i]);
    const inicioProximo = primeiroVoo(escolhidas[i + 1]);
    const inicioAtual = primeiroVoo(escolhidas[i]);
    if (!fimAtual?.hora_chegada || !inicioProximo?.hora_saida) return null;

    const chegada = dataDeChegada(
      fimAtual.data || t.data, inicioAtual.hora_saida, fimAtual.hora_chegada
    );

    return {
      aeroporto: t.destino,
      minutos: minutosEntre(
        chegada, fimAtual.hora_chegada,
        inicioProximo.data || trechos[i + 1].data || chegada, inicioProximo.hora_saida
      ),
    };
  });

  // Duração total: soma dos voos com as escalas
  const tempoTotal = (() => {
    if (!escolhidas.every(Boolean)) return null;

    const voos = escolhidas.map((o, i) => duracaoDe(trechos[i], o));

    if (voos.some((v) => v === null) || escalas.some((e) => e === null)) return null;

    return voos.reduce((s, v) => s + v, 0) + escalas.reduce((s, e) => s + e.minutos, 0);
  })();

  return (
    <section className="bloco">
      <div className="bloco-topo">
        <div>
          <h3>
            {icone} {titulo}
          </h3>
          <p className="bloco-rota">{rota}</p>
        </div>
        <button type="button" className="btn btn-secundario" onClick={onAdicionarTrecho}>
          + Adicionar trecho
        </button>
      </div>

      {trechos.length === 0 && (
        <p className="mensagem-vazia">
          Nenhum trecho ainda. Use "+ Adicionar trecho" para começar.
        </p>
      )}

      {trechos.map((trecho, iT) => {
        const custos = trecho.opcoes.map(calcularCusto).filter((c) => c > 0);
        const menor = custos.length ? Math.min(...custos) : null;
        const escala = escalas[iT];

        return (
          <div key={iT}>
            <div className="trecho-card">
              <CabecalhoTrecho
                trecho={trecho}
                indice={iT}
                editando={editando === iT}
                podeRemover={trechos.length > 1}
                onAlterar={(campo, valor) => onAlterarTrecho(iT, campo, valor)}
                onEditar={() => setEditando(editando === iT ? null : iT)}
                onRemover={() => onRemoverTrecho(iT)}
                onAdicionarCia={() => onAdicionarOpcao(iT)}
                aeroportos={aeroportos}
                onNovoAeroporto={onNovoAeroporto}
                cidades={cidades}
                onNovaCidade={onNovaCidade}
              />

              <div className="tabela-wrapper">
                <table className="tabela-comparativo">
                  <thead>
                    <tr>
                      <th>Usar</th>
                      <th>CIA</th>
                      <th>Milhas</th>
                      <th>Milheiro</th>
                      <th>Taxa</th>
                      <th>Bagagem</th>
                      <th>Por pessoa</th>
                      <th>Total ({pagantes}x)</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {trecho.opcoes.map((opcao, iO) => {
                      const chave = `${iT}-${iO}`;
                      const custo = calcularCusto(opcao);

                      return (
                        <LinhaOpcao
                          key={iO}
                          opcao={opcao}
                          trecho={trecho}
                          cias={cias}
                          onNovaCia={onNovaCia}
                          maisBarata={custo > 0 && custo === menor && trecho.opcoes.length > 1}
                          aberta={detalheAberto === chave}
                          podeRemover={trecho.opcoes.length > 1}
                          onAlterar={(campo, valor) => onAlterarOpcao(iT, iO, campo, valor)}
                          onEscolher={() => onEscolherOpcao(iT, iO)}
                          onRemover={() => onRemoverOpcao(iT, iO)}
                          pagantes={pagantes}
                          onAlternarDetalhe={() =>
                            setDetalheAberto(detalheAberto === chave ? null : chave)
                          }
                        />
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {escala && (
              <p className="faixa-escala">
                Escala em {escala.aeroporto || '—'} · {formatarDuracao(escala.minutos)}
              </p>
            )}
          </div>
        );
      })}

      {temEscolha && (
        <div className="subtotal-sentido">
          <span>
            Subtotal
            {tempoTotal !== null && ` · duração total ${formatarDuracao(tempoTotal)}`}
          </span>
          <span className="subtotal-valores">
            <span>
              {formatarMoeda(subtotal)} <small>por pessoa</small>
            </span>
            <strong>
              {formatarMoeda(subtotal * pagantes)} <small>total</small>
            </strong>
          </span>
        </div>
      )}
    </section>
  );
}
