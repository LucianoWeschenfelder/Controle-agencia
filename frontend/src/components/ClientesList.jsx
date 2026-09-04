import { abrirWhatsApp } from '../utils/whatsapp';

export default function ClientesList({ clientes, carregando, onEditar, onExcluir }) {
  if (carregando) {
    return <p className="mensagem-vazia">Carregando clientes...</p>;
  }

  if (clientes.length === 0) {
    return <p className="mensagem-vazia">Nenhum cliente encontrado.</p>;
  }

  return (
    <div className="clientes-grid">
      {clientes.map((cliente) => (
        <div className="cliente-card" key={cliente.id}>
          <div className="cliente-card-topo">
            <h3>{cliente.nome}</h3>
          </div>

          <div className="cliente-card-info">
            {cliente.documento && <p><strong>Documento:</strong> {cliente.documento}</p>}
            {cliente.email && <p><strong>E-mail:</strong> {cliente.email}</p>}
            {cliente.telefone && <p><strong>Telefone:</strong> {cliente.telefone}</p>}
            {cliente.data_nascimento && <p><strong>Nascimento:</strong> {cliente.data_nascimento}</p>}
            {cliente.observacoes && <p className="observacoes"><strong>Obs:</strong> {cliente.observacoes}</p>}
          </div>

          <div className="cliente-card-acoes">
            {cliente.telefone && (
              <button
                className="btn btn-whatsapp"
                onClick={() => abrirWhatsApp(cliente.telefone, '')}
                title={`Falar com ${cliente.nome}`}
              >
                WhatsApp
              </button>
            )}
            <button className="btn btn-secundario" onClick={() => onEditar(cliente)}>
              Editar
            </button>
            <button className="btn btn-perigo" onClick={() => onExcluir(cliente)}>
              Excluir
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
