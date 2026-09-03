import { useState, useEffect } from 'react';
import { listarClientes, criarCliente } from '../api/clientes';

export default function SeletorCliente({ clienteId, onSelecionar }) {
  const [clientes, setClientes] = useState([]);
  const [busca, setBusca] = useState('');
  const [mostrarCadastro, setMostrarCadastro] = useState(false);
  const [novoCliente, setNovoCliente] = useState({ nome: '', email: '', telefone: '' });
  const [erro, setErro] = useState('');

  async function carregar() {
    try {
      const dados = await listarClientes();
      setClientes(dados);
    } catch {
      setErro('Não foi possível carregar os clientes.');
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  const filtrados = clientes.filter((c) =>
    c.nome.toLowerCase().includes(busca.toLowerCase())
  );

  const selecionado = clientes.find((c) => c.id === Number(clienteId));

  async function cadastrarRapido() {
    if (!novoCliente.nome.trim()) {
      setErro('Informe o nome do cliente.');
      return;
    }

    try {
      const criado = await criarCliente(novoCliente);
      await carregar();
      onSelecionar(criado.id, criado.nome);
      setMostrarCadastro(false);
      setNovoCliente({ nome: '', email: '', telefone: '' });
      setBusca('');
      setErro('');
    } catch (err) {
      setErro(err.message);
    }
  }

  return (
    <div className="seletor-cliente">
      <label className="rotulo">Cliente *</label>

      {selecionado && !mostrarCadastro ? (
        <div className="cliente-selecionado">
          <span>{selecionado.nome}</span>
          <button type="button" className="btn-link" onClick={() => onSelecionar('', '')}>
            trocar
          </button>
        </div>
      ) : (
        <>
          <input
            type="text"
            className="campo-busca"
            placeholder="Digite o nome do cliente..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />

          {busca && (
            <div className="lista-sugestoes">
              {filtrados.length > 0 ? (
                filtrados.slice(0, 6).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="sugestao"
                    onClick={() => {
                      onSelecionar(c.id, c.nome);
                      setBusca('');
                    }}
                  >
                    {c.nome}
                    {c.email && <small> — {c.email}</small>}
                  </button>
                ))
              ) : (
                <div className="sugestao-vazia">
                  <p>Nenhum cliente encontrado.</p>
                  <button
                    type="button"
                    className="btn btn-secundario"
                    onClick={() => {
                      setNovoCliente({ nome: busca, email: '', telefone: '' });
                      setMostrarCadastro(true);
                    }}
                  >
                    Cadastrar "{busca}"
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {mostrarCadastro && (
        <div className="cadastro-rapido">
          <h4>Cadastro rápido de cliente</h4>
          <input
            placeholder="Nome *"
            value={novoCliente.nome}
            onChange={(e) => setNovoCliente({ ...novoCliente, nome: e.target.value })}
          />
          <input
            placeholder="E-mail"
            value={novoCliente.email}
            onChange={(e) => setNovoCliente({ ...novoCliente, email: e.target.value })}
          />
          <input
            placeholder="Telefone"
            value={novoCliente.telefone}
            onChange={(e) => setNovoCliente({ ...novoCliente, telefone: e.target.value })}
          />
          <div className="form-acoes">
            <button
              type="button"
              className="btn btn-secundario"
              onClick={() => setMostrarCadastro(false)}
            >
              Cancelar
            </button>
            <button type="button" className="btn btn-primario" onClick={cadastrarRapido}>
              Salvar cliente
            </button>
          </div>
        </div>
      )}

      {erro && <p className="form-erro">{erro}</p>}
    </div>
  );
}
