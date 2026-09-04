import { useState, useEffect } from 'react';
import {
  listarFornecedores, criarFornecedor, editarFornecedor, excluirFornecedor,
} from '../api/fornecedores';
import { abrirWhatsApp } from '../utils/whatsapp';

const VAZIO = { nome: '', whatsapp: '', observacoes: '' };

export default function Fornecedores() {
  const [fornecedores, setFornecedores] = useState([]);
  const [dados, setDados] = useState(VAZIO);
  const [editandoId, setEditandoId] = useState(null);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  async function carregar() {
    setCarregando(true);
    setErro('');
    try {
      setFornecedores(await listarFornecedores());
    } catch {
      setErro('Não foi possível conectar ao servidor. Verifique se o backend está rodando.');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function salvar() {
    if (!dados.nome.trim()) return setErro('Informe o nome do fornecedor.');

    try {
      if (editandoId) await editarFornecedor(editandoId, dados);
      else await criarFornecedor(dados);

      setDados(VAZIO);
      setEditandoId(null);
      setErro('');
      carregar();
    } catch (err) {
      setErro(err.message);
    }
  }

  async function remover(fornecedor) {
    const ok = window.confirm(`Excluir o fornecedor "${fornecedor.nome}"?`);
    if (!ok) return;

    try {
      await excluirFornecedor(fornecedor.id);
      carregar();
    } catch (err) {
      setErro(err.message);
    }
  }

  const filtrados = fornecedores.filter((f) =>
    f.nome.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="pagina">
      <div className="cotacao-form">
        <h2>{editandoId ? 'Editar fornecedor' : 'Novo fornecedor'}</h2>

        {erro && <p className="form-erro">{erro}</p>}

        <div className="form-grid">
          <label>
            Nome *
            <input
              value={dados.nome}
              onChange={(e) => setDados({ ...dados, nome: e.target.value })}
              placeholder="Nome de quem fornece as milhas"
            />
          </label>

          <label>
            WhatsApp
            <input
              value={dados.whatsapp}
              onChange={(e) => setDados({ ...dados, whatsapp: e.target.value })}
              placeholder="(51) 98888-7777"
            />
          </label>

          <label className="campo-largo">
            Observações
            <textarea
              rows={2}
              value={dados.observacoes}
              onChange={(e) => setDados({ ...dados, observacoes: e.target.value })}
            />
          </label>
        </div>

        <div className="form-acoes">
          {editandoId && (
            <button
              className="btn btn-secundario"
              onClick={() => {
                setEditandoId(null);
                setDados(VAZIO);
              }}
            >
              Cancelar
            </button>
          )}
          <button className="btn btn-primario" onClick={salvar}>
            {editandoId ? 'Salvar alterações' : 'Cadastrar fornecedor'}
          </button>
        </div>
      </div>

      <div className="barra-acoes" style={{ marginTop: 24 }}>
        <input
          type="text"
          className="campo-busca"
          placeholder="Buscar fornecedor..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      {carregando ? (
        <p className="mensagem-vazia">Carregando fornecedores...</p>
      ) : filtrados.length === 0 ? (
        <p className="mensagem-vazia">Nenhum fornecedor cadastrado.</p>
      ) : (
        <div className="clientes-grid">
          {filtrados.map((f) => (
            <div className="cliente-card" key={f.id}>
              <div className="cliente-card-topo">
                <h3>{f.nome}</h3>
              </div>

              <div className="cliente-card-info">
                {f.whatsapp && <p><strong>WhatsApp:</strong> {f.whatsapp}</p>}
                {f.observacoes && <p className="observacoes">{f.observacoes}</p>}
              </div>

              <div className="cliente-card-acoes">
                {f.whatsapp && (
                  <button
                    className="btn btn-whatsapp"
                    onClick={() => abrirWhatsApp(f.whatsapp, '')}
                  >
                    WhatsApp
                  </button>
                )}
                <button
                  className="btn btn-secundario"
                  onClick={() => {
                    setEditandoId(f.id);
                    setDados({
                      nome: f.nome,
                      whatsapp: f.whatsapp || '',
                      observacoes: f.observacoes || '',
                    });
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  Editar
                </button>
                <button className="btn btn-perigo" onClick={() => remover(f)}>
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
