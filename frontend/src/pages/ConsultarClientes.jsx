import { useState, useEffect, useCallback } from 'react';
import ClientesList from '../components/ClientesList';
import ClienteForm from '../components/ClienteForm';
import { listarClientes, editarCliente, excluirCliente } from '../api/clientes';

export default function ConsultarClientes() {
  const [clientes, setClientes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [clienteEditando, setClienteEditando] = useState(null);
  const [erroGeral, setErroGeral] = useState('');

  const carregarClientes = useCallback(async (termo = '') => {
    setCarregando(true);
    setErroGeral('');
    try {
      const dados = await listarClientes(termo);
      setClientes(dados);
    } catch (err) {
      setErroGeral('Não foi possível conectar ao servidor. Verifique se o backend está rodando.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      carregarClientes(busca);
    }, 300);
    return () => clearTimeout(timeout);
  }, [busca, carregarClientes]);

  async function salvarEdicao(dados) {
    await editarCliente(clienteEditando.id, dados);
    setClienteEditando(null);
    carregarClientes(busca);
  }

  async function handleExcluir(cliente) {
    const confirmar = window.confirm(`Excluir o cliente "${cliente.nome}"?`);
    if (!confirmar) return;

    try {
      await excluirCliente(cliente.id);
      carregarClientes(busca);
    } catch (err) {
      setErroGeral('Erro ao excluir cliente.');
    }
  }

  if (clienteEditando) {
    return (
      <div className="pagina">
        <ClienteForm
          clienteEditando={clienteEditando}
          onSalvar={salvarEdicao}
          onCancelar={() => setClienteEditando(null)}
        />
      </div>
    );
  }

  return (
    <div className="pagina">
      <div className="barra-acoes">
        <input
          type="text"
          className="campo-busca"
          placeholder="Buscar por nome, e-mail ou documento..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      {erroGeral && <p className="form-erro">{erroGeral}</p>}

      <ClientesList
        clientes={clientes}
        carregando={carregando}
        onEditar={setClienteEditando}
        onExcluir={handleExcluir}
      />
    </div>
  );
}
