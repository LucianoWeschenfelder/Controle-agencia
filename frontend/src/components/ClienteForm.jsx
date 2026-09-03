import { useState, useEffect } from 'react';

const CAMPOS_VAZIOS = {
  nome: '',
  documento: '',
  email: '',
  telefone: '',
  data_nascimento: '',
  endereco: '',
  observacoes: '',
};

export default function ClienteForm({ clienteEditando, onSalvar, onCancelar }) {
  const [dados, setDados] = useState(CAMPOS_VAZIOS);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (clienteEditando) {
      setDados({ ...CAMPOS_VAZIOS, ...clienteEditando });
    } else {
      setDados(CAMPOS_VAZIOS);
    }
    setErro('');
  }, [clienteEditando]);

  function handleChange(e) {
    const { name, value } = e.target;
    setDados((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!dados.nome.trim()) {
      setErro('O nome é obrigatório.');
      return;
    }

    setSalvando(true);
    setErro('');
    try {
      await onSalvar(dados);
      // Em um cadastro novo, limpa o formulário para o próximo cliente
      if (!clienteEditando) {
        setDados(CAMPOS_VAZIOS);
      }
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form className="cliente-form" onSubmit={handleSubmit}>
      <h2>{clienteEditando ? 'Editar cliente' : 'Novo cliente'}</h2>

      {erro && <p className="form-erro">{erro}</p>}

      <div className="form-grid">
        <label>
          Nome completo *
          <input name="nome" value={dados.nome} onChange={handleChange} required />
        </label>

        <label>
          Documento (CPF/Passaporte)
          <input name="documento" value={dados.documento} onChange={handleChange} />
        </label>

        <label>
          E-mail
          <input type="email" name="email" value={dados.email} onChange={handleChange} />
        </label>

        <label>
          Telefone
          <input name="telefone" value={dados.telefone} onChange={handleChange} />
        </label>

        <label>
          Data de nascimento
          <input type="date" name="data_nascimento" value={dados.data_nascimento || ''} onChange={handleChange} />
        </label>

        <label className="campo-largo">
          Endereço
          <input name="endereco" value={dados.endereco} onChange={handleChange} />
        </label>

        <label className="campo-largo">
          Observações
          <textarea name="observacoes" value={dados.observacoes} onChange={handleChange} rows={3} />
        </label>
      </div>

      <div className="form-acoes">
        <button type="button" className="btn btn-secundario" onClick={onCancelar}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-primario" disabled={salvando}>
          {salvando ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </form>
  );
}
