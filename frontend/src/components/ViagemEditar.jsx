import { useState, useEffect } from 'react';
import { buscarViagem } from '../api/viagens';
import { FaixaEtaria } from './ViagemForm';
import { formatarData } from '../utils/formato';

export default function ViagemEditar({ viagemId, onSalvar, onCancelar }) {
  const [dados, setDados] = useState(null);
  const [acompanhantes, setAcompanhantes] = useState([]);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    buscarViagem(viagemId)
      .then((v) => {
        setDados(v);

        // Garante um campo por acompanhante, mesmo que ainda não tenha nome
        const quantos = Math.max((v.passageiros || 1) - 1, 0);
        const existentes = v.acompanhantes || [];

        setAcompanhantes(
          Array.from({ length: quantos }, (_, i) => ({
            nome: existentes[i]?.nome || '',
            documento: existentes[i]?.documento || '',
            data_nascimento: existentes[i]?.data_nascimento || '',
          }))
        );
      })
      .catch(() => setErro('Não foi possível carregar a viagem.'));
  }, [viagemId]);

  function alterar(campo, valor) {
    setDados((prev) => ({ ...prev, [campo]: valor }));
  }

  function alterarAcompanhante(i, campo, valor) {
    setAcompanhantes((prev) => prev.map((a, j) => (j === i ? { ...a, [campo]: valor } : a)));
  }

  async function salvar() {
    setSalvando(true);
    setErro('');
    try {
      await onSalvar(viagemId, {
        antecedencia_checkin: dados.antecedencia_checkin,
        localizador: dados.localizador || '',
        observacoes: dados.observacoes || '',
        acompanhantes,
      });
    } catch (err) {
      setErro(err.message);
      setSalvando(false);
    }
  }

  if (!dados) {
    return <p className="mensagem-vazia">{erro || 'Carregando viagem...'}</p>;
  }

  return (
    <div className="cotacao-form">
      <h2>Editar viagem</h2>

      {erro && <p className="form-erro">{erro}</p>}

      <section className="bloco">
        <h3>Titular</h3>
        <p className="titular-nome">{dados.cliente?.nome}</p>
        <p className="dica">
          O titular vem do cadastro do cliente. Para corrigir o nome, edite em
          Consultar cadastros.
        </p>
      </section>

      <section className="bloco">
        <h3>Dados do check-in</h3>

        <div className="form-grid">
          <label>
            Check-in libera quantas horas antes do voo
            <select
              value={dados.antecedencia_checkin}
              onChange={(e) => alterar('antecedencia_checkin', Number(e.target.value))}
            >
              <option value={24}>24 horas antes</option>
              <option value={48}>48 horas antes</option>
            </select>
          </label>

          <label>
            Localizador / reserva
            <input
              value={dados.localizador || ''}
              onChange={(e) => alterar('localizador', e.target.value.toUpperCase())}
              placeholder="ABC123"
            />
          </label>

          <label className="campo-largo">
            Observações
            <textarea
              rows={3}
              value={dados.observacoes || ''}
              onChange={(e) => alterar('observacoes', e.target.value)}
            />
          </label>
        </div>
      </section>

      {acompanhantes.length > 0 && (
        <section className="bloco">
          <h3>Acompanhantes ({acompanhantes.length})</h3>
          <p className="dica">
            A cotação prevê {dados.adultos} adulto(s), {dados.criancas} criança(s) e{' '}
            {dados.bebes} bebê(s), contando o titular. A faixa de cada acompanhante sai
            da data de nascimento, pela idade no dia do voo
            {dados.data_viagem && ` (${formatarData(dados.data_viagem)})`}.
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
                title="Data de nascimento"
                value={a.data_nascimento}
                onChange={(e) => alterarAcompanhante(i, 'data_nascimento', e.target.value)}
              />
              <FaixaEtaria nascimento={a.data_nascimento} dataViagem={dados.data_viagem} />
            </div>
          ))}
        </section>
      )}

      <div className="form-acoes">
        <button type="button" className="btn btn-secundario" onClick={onCancelar}>
          Cancelar
        </button>
        <button type="button" className="btn btn-primario" onClick={salvar} disabled={salvando}>
          {salvando ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </div>
    </div>
  );
}
