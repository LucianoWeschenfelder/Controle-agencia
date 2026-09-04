import { useState, useEffect } from 'react';
import SeletorBusca from './SeletorBusca';
import { listarCotacoesDisponiveis } from '../api/viagens';
import { formatarData } from '../utils/formato';

export default function ViagemForm({ onSalvar, onCancelar }) {
  const [disponiveis, setDisponiveis] = useState([]);
  const [cotacaoId, setCotacaoId] = useState('');
  const [antecedencia, setAntecedencia] = useState(24);
  const [localizador, setLocalizador] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [acompanhantes, setAcompanhantes] = useState([]);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    listarCotacoesDisponiveis()
      .then(setDisponiveis)
      .catch(() => setErro('Não foi possível carregar as cotações vendidas.'))
      .finally(() => setCarregando(false));
  }, []);

  const escolhida = disponiveis.find((c) => c.id === Number(cotacaoId));

  /*
   * O titular é o cliente da cotação, então a quantidade de acompanhantes
   * é o total de passageiros menos um.
   */
  function escolherCotacao(id) {
    setCotacaoId(id);

    const cotacao = disponiveis.find((c) => c.id === Number(id));
    const quantos = Math.max((cotacao?.passageiros || 1) - 1, 0);

    setAcompanhantes(
      Array.from({ length: quantos }, () => ({ nome: '', documento: '', data_nascimento: '' }))
    );
  }

  function alterarAcompanhante(i, campo, valor) {
    setAcompanhantes((prev) =>
      prev.map((a, j) => (j === i ? { ...a, [campo]: valor } : a))
    );
  }

  async function salvar() {
    if (!cotacaoId) return setErro('Escolha a cotação vendida.');

    setSalvando(true);
    setErro('');
    try {
      await onSalvar({
        cotacao_id: Number(cotacaoId),
        antecedencia_checkin: antecedencia,
        localizador,
        observacoes,
        acompanhantes,
      });
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return <p className="mensagem-vazia">Carregando cotações vendidas...</p>;
  }

  return (
    <div className="cotacao-form">
      <h2>Cadastrar viagem</h2>

      {erro && <p className="form-erro">{erro}</p>}

      {disponiveis.length === 0 ? (
        <p className="mensagem-vazia">
          Nenhuma cotação vendida sem viagem cadastrada. Marque uma cotação como
          vendida na tela de Cotações para ela aparecer aqui.
        </p>
      ) : (
        <>
          <section className="bloco">
            <h3>1. Cotação vendida</h3>
            <p className="dica">
              Cliente, contato, rota, datas e horários vêm da cotação escolhida.
            </p>

            <SeletorBusca
              valor={cotacaoId}
              opcoes={disponiveis.map((c) => ({
                valor: c.id,
                rotulo: `${c.cliente?.nome} · ${c.ida?.origem} → ${c.ida?.destino}`,
                sub: formatarData(c.ida?.data),
              }))}
              onSelecionar={escolherCotacao}
              placeholder="Buscar cotação vendida..."
            />
          </section>

          {escolhida && (
            <section className="bloco">
              <h3>2. Dados que vêm da cotação</h3>

              <div className="dados-automaticos">
                <div>
                  <span>Cliente</span>
                  <strong>{escolhida.cliente?.nome || '—'}</strong>
                </div>
                <div>
                  <span>Telefone</span>
                  <strong>{escolhida.cliente?.telefone || '—'}</strong>
                </div>
                <div>
                  <span>E-mail</span>
                  <strong>{escolhida.cliente?.email || '—'}</strong>
                </div>
                <div>
                  <span>Passageiros</span>
                  <strong>{escolhida.passageiros}</strong>
                </div>
                <div className="campo-largo-auto">
                  <span>Check-ins que serão criados</span>
                  <strong>
                    {escolhida.unidades.map((u) => (
                      <span className="unidade-previa" key={u.chave}>
                        {u.sentido === 'ida' ? 'Ida' : 'Volta'}
                        {u.parte ? ` (parte ${u.parte}/${u.total_partes})` : ''}
                        {': '}
                        {u.origem} → {u.destino} · {u.cia || 'sem CIA'} ·{' '}
                        {formatarData(u.data)} às {u.hora_saida || '—'}
                        {u.conexoes > 0 && ` · ${u.conexoes} escala vinculada`}
                      </span>
                    ))}
                  </strong>
                </div>
              </div>
            </section>
          )}

          <section className="bloco">
            <h3>3. Preenchimento manual</h3>

            <div className="form-grid">
              <label>
                Check-in libera quantas horas antes do voo
                <select
                  value={antecedencia}
                  onChange={(e) => setAntecedencia(Number(e.target.value))}
                >
                  <option value={24}>24 horas antes</option>
                  <option value={48}>48 horas antes</option>
                </select>
              </label>

              <label>
                Localizador / reserva
                <input
                  value={localizador}
                  onChange={(e) => setLocalizador(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                />
              </label>

              {acompanhantes.length > 0 && (
                <div className="campo-largo">
                  <p className="rotulo">
                    Acompanhantes ({acompanhantes.length}) — o titular é{' '}
                    {escolhida?.cliente?.nome}
                  </p>

                  {acompanhantes.map((a, i) => (
                    <div className="acompanhante-linha" key={i}>
                      <input
                        placeholder={`Nome completo do passageiro ${i + 2}`}
                        value={a.nome}
                        onChange={(e) => alterarAcompanhante(i, 'nome', e.target.value)}
                      />
                      <input
                        placeholder="Documento"
                        value={a.documento}
                        onChange={(e) => alterarAcompanhante(i, 'documento', e.target.value)}
                      />
                      <input
                        type="date"
                        value={a.data_nascimento}
                        onChange={(e) => alterarAcompanhante(i, 'data_nascimento', e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              )}

              <label className="campo-largo">
                Observações
                <textarea
                  rows={3}
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                />
              </label>
            </div>
          </section>
        </>
      )}

      <div className="form-acoes">
        <button type="button" className="btn btn-secundario" onClick={onCancelar}>
          Cancelar
        </button>
        {disponiveis.length > 0 && (
          <button type="button" className="btn btn-primario" onClick={salvar} disabled={salvando}>
            {salvando ? 'Salvando...' : 'Cadastrar viagem'}
          </button>
        )}
      </div>
    </div>
  );
}
