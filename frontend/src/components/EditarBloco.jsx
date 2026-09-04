import { useState } from 'react';
import { minutosEntre, formatarDuracao, dataDeChegada } from '../utils/tempo';
import { formatarData } from '../utils/formato';

/*
 * Edita só este bloco de check-in. Cada bloco é independente: a companhia
 * pode liberar o check-in em outro prazo, a reserva é própria e o horário
 * do voo pode mudar sem afetar os outros.
 */
export default function EditarBloco({ linha, onSalvar, onCancelar }) {
  const [antecedencia, setAntecedencia] = useState(linha.antecedencia_checkin);
  const [localizador, setLocalizador] = useState(linha.localizador || '');
  const [voos, setVoos] = useState(() =>
    linha.unidade.voos.map((v) => ({
      id: v.id,
      origem: v.origem || '',
      destino: v.destino || '',
      data: v.data || '',
      hora_saida: v.hora_saida || '',
      hora_chegada: v.hora_chegada || '',
      numero_voo: v.numero_voo || '',
      duracao_min: v.duracao_min ?? '',
    }))
  );
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  function alterarVoo(i, campo, valor) {
    setVoos((prev) =>
      prev.map((v, j) => {
        if (j === i) return { ...v, [campo]: valor };
        // A conexão seguinte parte de onde este voo chega
        if (j === i + 1 && campo === 'destino') return { ...v, origem: valor };
        return v;
      })
    );
  }

  async function salvar() {
    setSalvando(true);
    setErro('');
    try {
      await onSalvar(linha, { antecedencia, localizador, voos });
    } catch (err) {
      setErro(err.message);
      setSalvando(false);
    }
  }

  return (
    <div className="editar-bloco">
      <p className="editar-bloco-titulo">
        Editando só este bloco · {linha.unidade.origem} → {linha.unidade.destino} ·{' '}
        {linha.unidade.cia || 'sem CIA'}
      </p>

      <div className="editar-bloco-campos">
        <label>
          Check-in libera
          <select value={antecedencia} onChange={(e) => setAntecedencia(Number(e.target.value))}>
            <option value={24}>24 horas antes</option>
            <option value={48}>48 horas antes</option>
          </select>
        </label>

        <label>
          Localizador desta reserva
          <input
            value={localizador}
            onChange={(e) => setLocalizador(e.target.value.toUpperCase())}
            placeholder="ABC123"
          />
        </label>
      </div>

      {voos.map((voo, i) => {
        const chegada = dataDeChegada(voo.data, voo.hora_saida, voo.hora_chegada);
        const viraODia = chegada && chegada !== voo.data;

        const proximo = voos[i + 1];
        const escala = proximo
          ? minutosEntre(chegada, voo.hora_chegada, proximo.data || chegada, proximo.hora_saida)
          : null;

        return (
          <div key={voo.id ?? i}>
            <div className="voo-perna">
              <div className="voo-perna-topo">
                <span className="voo-perna-titulo">
                  {voos.length > 1 ? `Voo ${i + 1} de ${voos.length}` : 'Voo'} · {voo.origem} →{' '}
                  {voo.destino}
                </span>
              </div>

              <div className="voo-card-campos">
                <label>
                  Data
                  <input
                    type="date"
                    value={voo.data}
                    onChange={(e) => alterarVoo(i, 'data', e.target.value)}
                  />
                </label>

                <label>
                  Horário de saída
                  <input
                    type="time"
                    value={voo.hora_saida}
                    onChange={(e) => alterarVoo(i, 'hora_saida', e.target.value)}
                  />
                </label>

                <label>
                  Horário de chegada
                  <input
                    type="time"
                    value={voo.hora_chegada}
                    onChange={(e) => alterarVoo(i, 'hora_chegada', e.target.value)}
                  />
                  {viraODia && <small className="marca-dia">chega em {formatarData(chegada)}</small>}
                </label>

                <label>
                  Nº do voo
                  <input
                    value={voo.numero_voo}
                    onChange={(e) => alterarVoo(i, 'numero_voo', e.target.value)}
                    placeholder="G3 800"
                  />
                </label>

                <label>
                  Duração (min)
                  <input
                    type="number"
                    value={voo.duracao_min}
                    onChange={(e) => alterarVoo(i, 'duracao_min', e.target.value)}
                    placeholder={
                      minutosEntre(voo.data, voo.hora_saida, voo.data, voo.hora_chegada) ?? ''
                    }
                  />
                </label>
              </div>
            </div>

            {escala !== null && (
              <p className="faixa-conexao">
                Conexão em {voo.destino || '—'} · {formatarDuracao(escala)}
              </p>
            )}
          </div>
        );
      })}

      {erro && <p className="form-erro">{erro}</p>}

      <div className="origem-milhas-acoes">
        <button className="btn-mini cancelar" onClick={onCancelar}>
          Cancelar
        </button>
        <button className="btn-mini destaque" onClick={salvar} disabled={salvando}>
          {salvando ? 'Salvando...' : 'Salvar bloco'}
        </button>
      </div>
    </div>
  );
}
