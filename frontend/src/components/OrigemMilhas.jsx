import { useState } from 'react';
import SeletorBusca from './SeletorBusca';
import { definirFornecedor } from '../api/cotacoes';
import { abrirWhatsApp } from '../utils/whatsapp';

/*
 * Aparece só nas cotações vendidas. Registra se as milhas vieram de um
 * fornecedor cadastrado ou das milhas próprias.
 */
export default function OrigemMilhas({ cotacao, fornecedores, onAtualizar }) {
  const [editando, setEditando] = useState(!cotacao.origem_milhas);
  const [origem, setOrigem] = useState(cotacao.origem_milhas || '');
  const [fornecedorId, setFornecedorId] = useState(cotacao.fornecedor_id || '');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    if (!origem) return setErro('Escolha de onde vieram as milhas.');
    if (origem === 'fornecedor' && !fornecedorId) return setErro('Escolha o fornecedor.');

    setSalvando(true);
    setErro('');
    try {
      await definirFornecedor(cotacao.id, {
        origem_milhas: origem,
        fornecedor_id: origem === 'fornecedor' ? Number(fornecedorId) : null,
      });
      setEditando(false);
      onAtualizar();
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  }

  if (!editando) {
    return (
      <div className="origem-milhas definida">
        <span>Milhas de</span>
        <strong>
          {cotacao.origem_milhas === 'proprio'
            ? 'Milhas próprias'
            : cotacao.fornecedor?.nome || 'fornecedor não encontrado'}
        </strong>

        {cotacao.fornecedor?.whatsapp && (
          <button
            className="btn-mini"
            onClick={() => abrirWhatsApp(cotacao.fornecedor.whatsapp, '')}
          >
            WhatsApp
          </button>
        )}

        <button className="btn-link" onClick={() => setEditando(true)}>
          alterar
        </button>
      </div>
    );
  }

  return (
    <div className="origem-milhas">
      <p className="origem-milhas-titulo">De onde vieram as milhas?</p>

      <div className="origem-milhas-opcoes">
        <label>
          <input
            type="radio"
            checked={origem === 'proprio'}
            onChange={() => setOrigem('proprio')}
          />
          Minhas milhas
        </label>

        <label>
          <input
            type="radio"
            checked={origem === 'fornecedor'}
            onChange={() => setOrigem('fornecedor')}
          />
          De um fornecedor
        </label>
      </div>

      {origem === 'fornecedor' && (
        <SeletorBusca
          valor={fornecedorId}
          opcoes={fornecedores.map((f) => ({
            valor: f.id,
            rotulo: f.nome,
            sub: f.whatsapp || '',
          }))}
          onSelecionar={setFornecedorId}
          placeholder="Buscar fornecedor..."
        />
      )}

      {erro && <p className="form-erro">{erro}</p>}

      <div className="origem-milhas-acoes">
        {cotacao.origem_milhas && (
          <button className="btn-mini cancelar" onClick={() => setEditando(false)}>
            Cancelar
          </button>
        )}
        <button className="btn-mini destaque" onClick={salvar} disabled={salvando}>
          {salvando ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </div>
  );
}
