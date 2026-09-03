import SeletorCia from './SeletorCia';
import { formatarMoeda } from '../utils/formato';

// custo por passageiro = (milhas / 1000 x milheiro) + taxa + bagagem
export function calcularCusto(opcao) {
  const milhas = Number(opcao.milhas) || 0;
  const milheiro = Number(opcao.valor_milheiro) || 0;
  const taxa = Number(opcao.taxa) || 0;
  const bagagem = Number(opcao.bagagem) || 0;

  const custoMilhas = (milhas / 1000) * milheiro;
  return { custoMilhas, custoTotal: custoMilhas + taxa + bagagem };
}

export default function BlocoComparativo({
  titulo,
  icone,
  rota,
  data,
  opcoes,
  escolhida,
  onAlterar,
  onAdicionar,
  onRemover,
  onEscolher,
  cias,
  onNovaCia,
}) {
  // Menor custo do bloco, para destacar a opção mais barata
  const custos = opcoes.map((o) => calcularCusto(o).custoTotal);
  const menorCusto = custos.length ? Math.min(...custos.filter((c) => c > 0)) : null;

  return (
    <section className="bloco">
      <div className="bloco-topo">
        <div>
          <h3>
            {icone} {titulo}
          </h3>
          <p className="bloco-rota">
            {rota} {data && `· ${data}`}
          </p>
        </div>
        <button type="button" className="btn btn-secundario" onClick={onAdicionar}>
          + Adicionar CIA
        </button>
      </div>

      <div className="tabela-wrapper">
        <table className="tabela-comparativo">
          <thead>
            <tr>
              <th>Escolher</th>
              <th>CIA</th>
              <th>Classe</th>
              <th>Milhas</th>
              <th>Valor milheiro</th>
              <th>Taxa</th>
              <th>Bagagem</th>
              <th>Custo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {opcoes.map((opcao, i) => {
              const { custoTotal } = calcularCusto(opcao);
              const maisBarata = custoTotal > 0 && custoTotal === menorCusto;

              return (
                <tr key={i} className={escolhida === i ? 'linha-escolhida' : ''}>
                  <td className="col-radio">
                    <input
                      type="radio"
                      checked={escolhida === i}
                      onChange={() => onEscolher(i)}
                    />
                  </td>
                  <td>
                    <SeletorCia
                      valor={opcao.cia}
                      cias={cias}
                      onSelecionar={(v) => onAlterar(i, 'cia', v)}
                      onNovaCia={onNovaCia}
                    />
                  </td>
                  <td>
                    <input
                      value={opcao.classe}
                      onChange={(e) => onAlterar(i, 'classe', e.target.value)}
                      placeholder="Econômica"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={opcao.milhas}
                      onChange={(e) => onAlterar(i, 'milhas', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      value={opcao.valor_milheiro}
                      onChange={(e) => onAlterar(i, 'valor_milheiro', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      value={opcao.taxa}
                      onChange={(e) => onAlterar(i, 'taxa', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      value={opcao.bagagem}
                      onChange={(e) => onAlterar(i, 'bagagem', e.target.value)}
                    />
                  </td>
                  <td className="celula-valor destaque">
                    {formatarMoeda(custoTotal)}
                    {maisBarata && <span className="selo-barato">mais barata</span>}
                  </td>
                  <td>
                    {opcoes.length > 1 && (
                      <button
                        type="button"
                        className="btn-remover"
                        onClick={() => onRemover(i)}
                        title="Remover linha"
                      >
                        ✕
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
