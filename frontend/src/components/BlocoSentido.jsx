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
  podeRemover, cias, onNovaCia,
}) {
  const custo = calcularCusto(opcao);

  const tempoVoo = minutosEntre(
    trecho.data, opcao.hora_saida, trecho.data, opcao.hora_chegada
  );

  // A duração informada manualmente tem prioridade sobre a calculada
  const duracaoFinal =
    opcao.duracao_min !== '' && opcao.duracao_min != null
      ? Number(opcao.duracao_min)
      : tempoVoo;

  const detalheCompleto = opcao.hora_saida && opcao.hora_chegada;

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
        <td className="celula-valor destaque">
          {formatarMoeda(custo)}
          {maisBarata && <span className="selo-barato">mais barata</span>}
        </td>
        <td className="col-acoes-opcao">
          <button
            type="button"
            className={`btn-mini ${detalheCompleto ? 'preenchido' : ''}`}
            onClick={onAlternarDetalhe}
          >
            {aberta ? 'Fechar' : detalheCompleto ? '✓ Voo' : 'Detalhar'}
          </button>
          {podeRemover && (
            <button type="button" className="btn-remover" onClick={onRemover} title="Remover CIA">
              ✕
            </button>
          )}
        </td>
      </tr>

      {aberta && (
        <tr className="linha-detalhe">
          <td colSpan={8}>
            <div className="detalhe-voo">
              <p className="detalhe-voo-titulo">
                Dados do voo · {opcao.cia || 'CIA'} · {trecho.origem || '—'} → {trecho.destino || '—'}
              </p>

              <div className="detalhe-voo-campos">
                <label>
                  Horário de saída
                  <input
                    type="time"
                    value={opcao.hora_saida}
                    onChange={(e) => onAlterar('hora_saida', e.target.value)}
                  />
                </label>
                <label>
                  Horário de chegada
                  <input
                    type="time"
                    value={opcao.hora_chegada}
                    onChange={(e) => onAlterar('hora_chegada', e.target.value)}
                  />
                </label>
                <label>
                  Nº do voo
                  <input
                    value={opcao.numero_voo}
                    onChange={(e) => onAlterar('numero_voo', e.target.value)}
                    placeholder="G31234"
                  />
                </label>
                <label>
                  Classe
                  <input
                    value={opcao.classe}
                    onChange={(e) => onAlterar('classe', e.target.value)}
                    placeholder="Econômica"
                  />
                </label>
                <label>
                  Aeronave
                  <input
                    value={opcao.aeronave}
                    onChange={(e) => onAlterar('aeronave', e.target.value)}
                    placeholder="Airbus A350-900"
                  />
                </label>
                <label>
                  Duração (min)
                  <input
                    type="number"
                    value={opcao.duracao_min}
                    onChange={(e) => onAlterar('duracao_min', e.target.value)}
                    placeholder={tempoVoo ?? ''}
                  />
                  <small>Só preencha em voo com troca de fuso</small>
                </label>
                <div className="detalhe-voo-tempo">
                  <span>Tempo de voo</span>
                  <strong>{formatarDuracao(duracaoFinal) || '—'}</strong>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
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
  cidades, onNovaCidade,
  onAlterarTrecho, onAdicionarTrecho, onRemoverTrecho,
  onAlterarOpcao, onAdicionarOpcao, onRemoverOpcao, onEscolherOpcao,
}) {
  const [editando, setEditando] = useState(null);
  const [detalheAberto, setDetalheAberto] = useState(null); // "indiceTrecho-indiceOpcao"

  // Subtotal e tempos do sentido, a partir das opções escolhidas
  const escolhidas = trechos.map((t) => t.opcoes.find((o) => o.escolhida) || null);
  const subtotal = escolhidas.filter(Boolean).reduce((s, o) => s + calcularCusto(o), 0);
  const temEscolha = escolhidas.some(Boolean);

  // Duração de um voo: o valor informado tem prioridade sobre o calculado
  function duracaoDe(trecho, opcao) {
    if (!opcao) return null;
    if (opcao.duracao_min !== '' && opcao.duracao_min != null) return Number(opcao.duracao_min);
    return minutosEntre(trecho.data, opcao.hora_saida, trecho.data, opcao.hora_chegada);
  }

  // Escalas: da chegada de um trecho até a saída do seguinte.
  // A chegada pode ter caído no dia seguinte, então usamos a data real.
  const escalas = trechos.slice(0, -1).map((t, i) => {
    const atual = escolhidas[i];
    const proximo = escolhidas[i + 1];
    if (!atual?.hora_chegada || !proximo?.hora_saida) return null;

    const chegada = dataDeChegada(t.data, atual.hora_saida, atual.hora_chegada);

    return {
      aeroporto: t.destino,
      minutos: minutosEntre(
        chegada, atual.hora_chegada,
        trechos[i + 1].data || chegada, proximo.hora_saida
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
                      <th>Custo</th>
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
            Subtotal por passageiro
            {tempoTotal !== null && ` · duração total ${formatarDuracao(tempoTotal)}`}
          </span>
          <strong>{formatarMoeda(subtotal)}</strong>
        </div>
      )}
    </section>
  );
}
