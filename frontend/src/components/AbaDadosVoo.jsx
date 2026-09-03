import { minutosEntre, formatarDuracao, dataDeChegada } from '../utils/tempo';
import { formatarData } from '../utils/formato';

// Duração informada manualmente tem prioridade sobre a calculada
function duracaoDe(trecho, opcao) {
  if (!opcao) return null;
  if (opcao.duracao_min !== '' && opcao.duracao_min != null) return Number(opcao.duracao_min);
  return minutosEntre(trecho.data, opcao.hora_saida, trecho.data, opcao.hora_chegada);
}

function BlocoVoo({ titulo, icone, trechos, onAlterar }) {
  const escolhidas = trechos.map((t, iTrecho) => ({
    trecho: t,
    iTrecho,
    iOpcao: t.opcoes.findIndex((o) => o.escolhida),
    opcao: t.opcoes.find((o) => o.escolhida) || null,
  }));

  const preenchidos = escolhidas.filter((e) => e.opcao);

  if (!preenchidos.length) {
    return (
      <section className="bloco">
        <h3>
          {icone} {titulo}
        </h3>
        <p className="mensagem-vazia">
          Escolha uma companhia em cada trecho na aba "Cotação" para liberar os dados do voo.
        </p>
      </section>
    );
  }

  // Conexões entre um voo e o seguinte, e se a companhia muda no caminho
  const conexoes = preenchidos.slice(0, -1).map((e, i) => {
    const proximo = preenchidos[i + 1];
    const chegada = dataDeChegada(e.trecho.data, e.opcao.hora_saida, e.opcao.hora_chegada);

    return {
      aeroporto: e.trecho.destino,
      minutos: minutosEntre(
        chegada, e.opcao.hora_chegada,
        proximo.trecho.data || chegada, proximo.opcao.hora_saida
      ),
      // Companhias diferentes significam bilhetes separados
      naoVinculada: Boolean(
        e.opcao.cia && proximo.opcao.cia && e.opcao.cia !== proximo.opcao.cia
      ),
    };
  });

  return (
    <section className="bloco">
      <h3>
        {icone} {titulo}
      </h3>

      {preenchidos.map((e, i) => {
        const { trecho, iTrecho, iOpcao, opcao } = e;
        const duracao = duracaoDe(trecho, opcao);
        const chegada = dataDeChegada(trecho.data, opcao.hora_saida, opcao.hora_chegada);
        const viraODia = chegada !== trecho.data;
        const conexao = conexoes[i];

        return (
          <div key={i}>
            <div className="voo-card">
              <div className="voo-card-topo">
                <span className="voo-card-rota">
                  {trecho.origem || '—'} → {trecho.destino || '—'}
                </span>
                <span className="voo-card-cia">
                  {opcao.cia || 'sem CIA'} · {formatarData(trecho.data)}
                </span>
              </div>

              <div className="voo-card-campos">
                <label>
                  Horário de saída
                  <input
                    type="time"
                    value={opcao.hora_saida}
                    onChange={(e2) => onAlterar(iTrecho, iOpcao, 'hora_saida', e2.target.value)}
                  />
                </label>

                <label>
                  Horário de chegada
                  <input
                    type="time"
                    value={opcao.hora_chegada}
                    onChange={(e2) => onAlterar(iTrecho, iOpcao, 'hora_chegada', e2.target.value)}
                  />
                  {viraODia && <small className="marca-dia">chega em {formatarData(chegada)}</small>}
                </label>

                <label>
                  Nº do voo
                  <input
                    value={opcao.numero_voo}
                    onChange={(e2) => onAlterar(iTrecho, iOpcao, 'numero_voo', e2.target.value)}
                    placeholder="VY 801"
                  />
                </label>

                <label>
                  Classe
                  <input
                    value={opcao.classe}
                    onChange={(e2) => onAlterar(iTrecho, iOpcao, 'classe', e2.target.value)}
                    placeholder="Econômica"
                  />
                </label>

                <label>
                  Aeronave
                  <input
                    value={opcao.aeronave}
                    onChange={(e2) => onAlterar(iTrecho, iOpcao, 'aeronave', e2.target.value)}
                    placeholder="Airbus A350-900"
                  />
                </label>

                <label>
                  Duração (min)
                  <input
                    type="number"
                    value={opcao.duracao_min}
                    onChange={(e2) => onAlterar(iTrecho, iOpcao, 'duracao_min', e2.target.value)}
                    placeholder={
                      minutosEntre(trecho.data, opcao.hora_saida, trecho.data, opcao.hora_chegada) ?? ''
                    }
                  />
                  <small>Preencha se houver troca de fuso</small>
                </label>

                <div className="detalhe-voo-tempo">
                  <span>Tempo de voo</span>
                  <strong>{formatarDuracao(duracao) || '—'}</strong>
                </div>
              </div>
            </div>

            {conexao && (
              <div className={`faixa-conexao ${conexao.naoVinculada ? 'nao-vinculada' : ''}`}>
                Conexão em {conexao.aeroporto || '—'} · {formatarDuracao(conexao.minutos) || '—'}
                {conexao.naoVinculada && (
                  <span className="aviso-nao-vinculada">
                    Escala não vinculada — companhias diferentes, bagagem e check-in separados
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}

export default function AbaDadosVoo({ trechosIda, trechosVolta, idaEVolta, onAlterarOpcao }) {
  return (
    <>
      <p className="dica-aba">
        Aqui ficam os dados que só existem no voo em si. Origem, destino, data e companhia
        já vêm da aba "Cotação".
      </p>

      <BlocoVoo
        titulo="Ida"
        icone="🛫"
        trechos={trechosIda}
        onAlterar={(iTrecho, iOpcao, campo, valor) =>
          onAlterarOpcao('ida', iTrecho, iOpcao, campo, valor)
        }
      />

      {idaEVolta && (
        <BlocoVoo
          titulo="Volta"
          icone="🛬"
          trechos={trechosVolta}
          onAlterar={(iTrecho, iOpcao, campo, valor) =>
            onAlterarOpcao('volta', iTrecho, iOpcao, campo, valor)
          }
        />
      )}
    </>
  );
}
