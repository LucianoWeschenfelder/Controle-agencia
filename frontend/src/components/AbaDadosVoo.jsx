import SeletorBusca from './SeletorBusca';
import SeletorAeroporto from './SeletorAeroporto';
import { minutosEntre, formatarDuracao, dataDeChegada } from '../utils/tempo';
import { formatarData } from '../utils/formato';

// Duração de um voo: o valor informado tem prioridade sobre o calculado
function duracaoDoVoo(voo) {
  if (voo.duracao_min !== '' && voo.duracao_min != null) return Number(voo.duracao_min);
  return minutosEntre(voo.data, voo.hora_saida, voo.data, voo.hora_chegada);
}

function BlocoTrecho({
  trecho, iTrecho, iOpcao, sentido, aeroportos, cidades, classes,
  onAlterarOpcao, onAlterarVoo, onAdicionarVoo, onRemoverVoo,
  onNovoAeroporto, onNovaCidade, onNovaClasse,
}) {
  const opcao = trecho.opcoes[iOpcao];
  const voos = opcao.voos || [];

  // Escalas dentro do trecho: da chegada de um voo à saída do seguinte
  const escalas = voos.slice(0, -1).map((v, i) => {
    const proximo = voos[i + 1];
    if (!v.hora_chegada || !proximo.hora_saida) return null;

    const chegada = dataDeChegada(v.data, v.hora_saida, v.hora_chegada);

    return {
      aeroporto: v.destino,
      minutos: minutosEntre(
        chegada, v.hora_chegada,
        proximo.data || chegada, proximo.hora_saida
      ),
    };
  });

  return (
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
        <div className="campo-seletor">
          <span className="campo-seletor-rotulo">Classe</span>
          <SeletorBusca
            valor={opcao.classe}
            opcoes={classes.map((c) => ({ valor: c.nome, rotulo: c.nome }))}
            onSelecionar={(v) => onAlterarOpcao(sentido, iTrecho, iOpcao, 'classe', v)}
            placeholder="Escolher classe..."
            onCriar={async (nome) => {
              const nova = await onNovaClasse(nome);
              if (nova) onAlterarOpcao(sentido, iTrecho, iOpcao, 'classe', nova.nome);
            }}
            textoCriar="Cadastrar classe"
            permitirLimpar
          />
        </div>
      </div>

      {voos.map((voo, iVoo) => {
        const duracao = duracaoDoVoo(voo);
        const chegada = dataDeChegada(voo.data, voo.hora_saida, voo.hora_chegada);
        const viraODia = chegada && chegada !== voo.data;
        const escala = escalas[iVoo];

        return (
          <div key={iVoo}>
            <div className="voo-perna">
              <div className="voo-perna-topo">
                <span className="voo-perna-titulo">
                  {voos.length > 1 ? `Voo ${iVoo + 1} de ${voos.length}` : 'Voo'}
                </span>
                {voos.length > 1 && (
                  <button
                    type="button"
                    className="btn-remover"
                    onClick={() => onRemoverVoo(sentido, iTrecho, iOpcao, iVoo)}
                    title="Remover este voo"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="voo-card-campos">
                <div className="campo-seletor">
                  <span className="campo-seletor-rotulo">Origem</span>
                  <SeletorAeroporto
                    valor={voo.origem}
                    aeroportos={aeroportos}
                    cidades={cidades}
                    onSelecionar={(v) => onAlterarVoo(sentido, iTrecho, iOpcao, iVoo, 'origem', v)}
                    onNovoAeroporto={onNovoAeroporto}
                    onNovaCidade={onNovaCidade}
                  />
                </div>

                <div className="campo-seletor">
                  <span className="campo-seletor-rotulo">Destino</span>
                  <SeletorAeroporto
                    valor={voo.destino}
                    aeroportos={aeroportos}
                    cidades={cidades}
                    onSelecionar={(v) => onAlterarVoo(sentido, iTrecho, iOpcao, iVoo, 'destino', v)}
                    onNovoAeroporto={onNovoAeroporto}
                    onNovaCidade={onNovaCidade}
                  />
                </div>

                <label>
                  Data
                  <input
                    type="date"
                    value={voo.data || ''}
                    onChange={(e) => onAlterarVoo(sentido, iTrecho, iOpcao, iVoo, 'data', e.target.value)}
                  />
                </label>

                <label>
                  Horário de saída
                  <input
                    type="time"
                    value={voo.hora_saida || ''}
                    onChange={(e) => onAlterarVoo(sentido, iTrecho, iOpcao, iVoo, 'hora_saida', e.target.value)}
                  />
                </label>

                <label>
                  Horário de chegada
                  <input
                    type="time"
                    value={voo.hora_chegada || ''}
                    onChange={(e) => onAlterarVoo(sentido, iTrecho, iOpcao, iVoo, 'hora_chegada', e.target.value)}
                  />
                  {viraODia && <small className="marca-dia">chega em {formatarData(chegada)}</small>}
                </label>

                <label>
                  Nº do voo
                  <input
                    value={voo.numero_voo || ''}
                    onChange={(e) => onAlterarVoo(sentido, iTrecho, iOpcao, iVoo, 'numero_voo', e.target.value)}
                    placeholder="G3 800"
                  />
                </label>

                <label>
                  Duração (min)
                  <input
                    type="number"
                    value={voo.duracao_min ?? ''}
                    onChange={(e) => onAlterarVoo(sentido, iTrecho, iOpcao, iVoo, 'duracao_min', e.target.value)}
                    placeholder={minutosEntre(voo.data, voo.hora_saida, voo.data, voo.hora_chegada) ?? ''}
                  />
                  <small>Preencha se houver troca de fuso</small>
                </label>

                <div className="detalhe-voo-tempo">
                  <span>Tempo de voo</span>
                  <strong>{formatarDuracao(duracao) || '—'}</strong>
                </div>
              </div>
            </div>

            {escala && (
              <div className="faixa-conexao">
                Conexão em {escala.aeroporto || '—'} · {formatarDuracao(escala.minutos) || '—'}
                <span className="aviso-vinculada">
                  Escala vinculada — mesma companhia, um único check-in
                </span>
              </div>
            )}
          </div>
        );
      })}

      <button
        type="button"
        className="btn btn-secundario"
        onClick={() => onAdicionarVoo(sentido, iTrecho, iOpcao)}
      >
        + Adicionar conexão neste trecho
      </button>
    </div>
  );
}

function BlocoSentidoVoo({ titulo, icone, trechos, sentido, ...resto }) {
  const comEscolha = trechos
    .map((trecho, iTrecho) => ({
      trecho,
      iTrecho,
      iOpcao: trecho.opcoes.findIndex((o) => o.escolhida),
    }))
    .filter((t) => t.iOpcao >= 0);

  if (!comEscolha.length) {
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

  return (
    <section className="bloco">
      <h3>
        {icone} {titulo}
      </h3>

      {comEscolha.map(({ trecho, iTrecho, iOpcao }) => (
        <BlocoTrecho
          key={iTrecho}
          trecho={trecho}
          iTrecho={iTrecho}
          iOpcao={iOpcao}
          sentido={sentido}
          {...resto}
        />
      ))}
    </section>
  );
}

export default function AbaDadosVoo({ trechosIda, trechosVolta, idaEVolta, ...resto }) {
  return (
    <>
      <p className="dica-aba">
        Aqui ficam os dados que só existem no voo em si. Se um trecho tiver conexão
        pela mesma companhia, use "Adicionar conexão" para incluir o voo seguinte.
      </p>

      <BlocoSentidoVoo titulo="Ida" icone="🛫" sentido="ida" trechos={trechosIda} {...resto} />

      {idaEVolta && (
        <BlocoSentidoVoo titulo="Volta" icone="🛬" sentido="volta" trechos={trechosVolta} {...resto} />
      )}
    </>
  );
}
