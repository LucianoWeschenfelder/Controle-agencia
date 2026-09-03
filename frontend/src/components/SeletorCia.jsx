import { useState } from 'react';
import { criarCia } from '../api/cias';

export default function SeletorCia({ valor, cias, onSelecionar, onNovaCia }) {
  const [cadastrando, setCadastrando] = useState(false);
  const [nome, setNome] = useState('');
  const [codigo, setCodigo] = useState('');
  const [erro, setErro] = useState('');

  async function salvarCia() {
    if (!nome.trim()) {
      setErro('Informe o nome.');
      return;
    }

    try {
      const nova = await criarCia({ nome, codigo });
      onNovaCia(nova);
      onSelecionar(nova.nome);
      setCadastrando(false);
      setNome('');
      setCodigo('');
      setErro('');
    } catch (err) {
      setErro(err.message);
    }
  }

  if (cadastrando) {
    return (
      <div className="cia-nova">
        <input
          autoFocus
          placeholder="Nome da CIA"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
        <input
          placeholder="Sigla"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
        />
        <div className="cia-nova-acoes">
          <button type="button" className="btn-mini" onClick={salvarCia}>
            Salvar
          </button>
          <button type="button" className="btn-mini cancelar" onClick={() => setCadastrando(false)}>
            ✕
          </button>
        </div>
        {erro && <small className="cia-erro">{erro}</small>}
      </div>
    );
  }

  return (
    <div className="cia-seletor">
      <select
        value={valor || ''}
        onChange={(e) => {
          if (e.target.value === '__nova__') {
            setCadastrando(true);
          } else {
            onSelecionar(e.target.value);
          }
        }}
      >
        <option value="">Selecione...</option>
        {valor && !cias.some((c) => c.nome === valor) && (
          <option value={valor}>{valor}</option>
        )}
        {cias.map((cia) => (
          <option key={cia.id} value={cia.nome}>
            {cia.nome}
            {cia.codigo ? ` (${cia.codigo})` : ''}
          </option>
        ))}
        <option value="__nova__">+ Cadastrar nova CIA</option>
      </select>
    </div>
  );
}
