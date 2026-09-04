import { useState, useEffect } from 'react';
import SeletorBusca from './SeletorBusca';
import { listarCotacoesDisponiveis } from '../api/viagens';
import { formatarData } from '../utils/formato';

export default function ViagemForm({ onSalvar, onCancelar }) {
  const [disponiveis, setDisponiveis] = useState([]);
  const [cotacaoId, setCotacaoId] = useState('');
  const [antecedencia, setAntecedencia] = useState(24);
  const [localizadores, setLocalizadores] = useState({});
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
    if (!cotacao) return;

    /*
     * O titular conta como um adulto. Os acompanhantes já nascem com o tipo
     * certo, seguindo a quantidade informada na cotação.
     */
    const tipos = [
      ...Array(Math.max((cotacao.adultos || 1) - 1, 0)).fill('adulto'),
      ...Array(cotacao.criancas || 0).fill('crianca'),
      ...Array(cotacao.bebes || 0).fill('bebe'),
    ];

    setAcompanhantes(
      tipos.map((tipo) => ({ nome: '', documento: '', data_nascimento: '', tipo }))
    );

    // Voo separado tem reserva própria, então cada unidade tem seu localizador
    setLocalizadores(
      Object.fromEntries((cotacao.unidades || []).map((u) => [u.chave, '']))
    );
  }

  function alterarLocalizador(chave, valor) {
    setLocalizadores((prev) => ({ ...prev, [chave]: valor.toUpperCase() }));
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
        localizadores,
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
              opcoes={disponiveis.map((c) => {
                // A rota vai do primeiro ao último aeroporto da ida
                const ida = (c.unidades || []).filter((u) => u.sentido === 'ida');
                const origem = ida[0]?.origem || '—';
                const destino = ida.at(-1)?.destino || '—';

                return {
                  valor: c.id,
                  rotulo: `${c.cliente?.nome} · ${origem} → ${destino}`,
                  sub: formatarData(ida[0]?.data),
                };
              })}
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
                  <strong>
                    {escolhida.adultos} adulto(s)
                    {escolhida.criancas > 0 && `, ${escolhida.criancas} criança(s)`}
                    {escolhida.bebes > 0 && `, ${escolhida.bebes} bebê(s)`}
                  </strong>
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

              {escolhida && (
                <div className="campo-largo">
                  <p className="rotulo">
                    Localizador de cada reserva
                    {escolhida.unidades.length > 1 &&
                      ' — voos separados têm localizadores diferentes'}
                  </p>

                  {escolhida.unidades.map((u) => (
                    <div className="localizador-linha" key={u.chave}>
                      <span>
                        {u.sentido === 'ida' ? 'Ida' : 'Volta'}
                        {u.parte ? ` (parte ${u.parte}/${u.total_partes})` : ''} ·{' '}
                        {u.origem} → {u.destino} · {u.cia || 'sem CIA'}
                        {u.conexoes > 0 && ` · ${u.conexoes} escala vinculada`}
                      </span>
                      <input
                        value={localizadores[u.chave] || ''}
                        onChange={(e) => alterarLocalizador(u.chave, e.target.value)}
                        placeholder="ABC123"
                      />
                    </div>
                  ))}
                </div>
              )}

              {acompanhantes.length > 0 && (
                <div className="campo-largo">
                  <p className="rotulo">
                    Acompanhantes ({acompanhantes.length}) — o titular é{' '}
                    {escolhida?.cliente?.nome}
                  </p>

                  {acompanhantes.map((a, i) => (
                    <div className="acompanhante-linha" key={i}>
                      <select
                        value={a.tipo}
                        onChange={(e) => alterarAcompanhante(i, 'tipo', e.target.value)}
                      >
                        <option value="adulto">Adulto</option>
                        <option value="crianca">Criança</option>
                        <option value="bebe">Bebê</option>
                      </select>
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
