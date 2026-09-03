import { useState } from 'react';
import ClienteForm from '../components/ClienteForm';
import { criarCliente } from '../api/clientes';

export default function CadastrarCliente({ onVoltar }) {
  const [sucesso, setSucesso] = useState('');

  async function salvar(dados) {
    const novo = await criarCliente(dados);
    setSucesso(`Cliente "${novo.nome}" cadastrado com sucesso!`);
  }

  return (
    <div className="pagina">
      {sucesso && <p className="form-sucesso">{sucesso}</p>}

      <ClienteForm
        clienteEditando={null}
        onSalvar={salvar}
        onCancelar={onVoltar}
      />
    </div>
  );
}
