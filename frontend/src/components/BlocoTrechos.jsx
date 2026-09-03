import { Fragment } from 'react';
import SeletorCia from './SeletorCia';
import { calcularTemposDoGrupo, formatarDuracao, agruparTrechos } from '../utils/tempo';

export default function BlocoTrechos({
  titulo, icone, trechos, cias, onAlterar, onAdicionar, onRemover, onNovaCia,
}) {
  const grupos = agruparTrechos(trechos);

  // Próximo número de grupo livre, para criar um voo desvinculado
  const proximoGrupo = grupos.length ? Math.max(...grupos.map((g) => g.grupo)) + 1 : 0;

  return (
    <section className="bloco">
      <div className="bloco-topo">
        <div>
          <h3>
            {icone} {titulo}
          </h3>
          <p className="bloco-rota">
            Conexões do mesmo voo ficam juntas. Voos desvinculados formam blocos separados.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secundario"
          onClick={() => onAdicionar(proximoGrupo)}
        >
          + Voo separado
        </button>
      </div>

      {grupos.map(({ grupo, trechos: doGrupo }) => {
        const tempos = calcularTemposDoGrupo(doGrupo);

        return (
          <div className="grupo-voo" key={grupo}>
            <div className="grupo-voo-topo">
              <span className="grupo-voo-titulo">
                Voo {grupo + 1}
                {doGrupo.length > 1 && ` · ${doGrupo.length - 1} escala${doGrupo.length > 2 ? 's' : ''}`}
              </span>
              <button
                type="button"
                className="btn-mini"
                onClick={() => onAdicionar(grupo)}
              >
                + Conexão
              </button>
            </div>

            <div className="tabela-wrapper">
              <table className="tabela-comparativo">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Origem</th>
                    <th>Saída</th>
                    <th>Destino</th>
                    <th>Chegada</th>
                    <th>CIA</th>
                    <th>Classe</th>
                    <th>Nº voo</th>
                    <th>Tempo de voo</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {doGrupo.map((trecho) => {
                    const i = trechos.indexOf(trecho);
                    const posicao = doGrupo.indexOf(trecho);
                    const escala = tempos.escalas[posicao];

                    return (
                      <Fragment key={i}>
                        <tr>
                          <td>
                            <input
                              type="date"
                              value={trecho.data}
                              onChange={(e) => onAlterar(i, 'data', e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              value={trecho.origem}
                              onChange={(e) => onAlterar(i, 'origem', e.target.value)}
                              placeholder="Porto Alegre - POA"
                            />
                          </td>
                          <td>
                            <input
                              type="time"
                              value={trecho.hora_saida}
                              onChange={(e) => onAlterar(i, 'hora_saida', e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              value={trecho.destino}
                              onChange={(e) => onAlterar(i, 'destino', e.target.value)}
                              placeholder="São Paulo - GRU"
                            />
                          </td>
                          <td>
                            <input
                              type="time"
                              value={trecho.hora_chegada}
                              onChange={(e) => onAlterar(i, 'hora_chegada', e.target.value)}
                            />
                          </td>
                          <td>
                            <SeletorCia
                              valor={trecho.cia}
                              cias={cias}
                              onSelecionar={(v) => onAlterar(i, 'cia', v)}
                              onNovaCia={onNovaCia}
                            />
                          </td>
                          <td>
                            <input
                              value={trecho.classe}
                              onChange={(e) => onAlterar(i, 'classe', e.target.value)}
                              placeholder="Econômica"
                            />
                          </td>
                          <td>
                            <input
                              value={trecho.numero_voo}
                              onChange={(e) => onAlterar(i, 'numero_voo', e.target.value)}
                              placeholder="G31234"
                            />
                          </td>
                          <td className="celula-valor">
                            {formatarDuracao(tempos.voos[posicao]) || '—'}
                          </td>
                          <td>
                            {trechos.length > 1 && (
                              <button
                                type="button"
                                className="btn-remover"
                                onClick={() => onRemover(i)}
                                title="Remover trecho"
                              >
                                ✕
                              </button>
                            )}
                          </td>
                        </tr>

                        {escala && (
                          <tr className="linha-escala">
                            <td colSpan={10}>
                              Escala em {escala.aeroporto || '—'}:{' '}
                              <strong>{formatarDuracao(escala.minutos) || '—'}</strong>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {tempos.total !== null && (
              <p className="grupo-voo-total">
                Duração total do voo {grupo + 1}: <strong>{formatarDuracao(tempos.total)}</strong>
              </p>
            )}
          </div>
        );
      })}
    </section>
  );
}
