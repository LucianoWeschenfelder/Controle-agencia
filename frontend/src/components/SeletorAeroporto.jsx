import { useState } from 'react';
import SeletorBusca from './SeletorBusca';
import { criarAeroporto } from '../api/cadastros';

export default function SeletorAeroporto({
  valor, aeroportos, cidades, onSelecionar, onNovoAeroporto, onNovaCidade,
}) {
  const [cadastrando, setCadastrando] = useState(false);
  const [sigla, setSigla] = useState('');
  const [cidadeId, setCidadeId] = useState('');
  const [cidadeNova, setCidadeNova] = useState('');
  const [erro, setErro] = useState('');

  const opcoes = aeroportos.map((a) => ({
    valor: a.sigla,
    rotulo: `${a.cidade} (${a.sigla})`,
    sub: a.sigla,
  }));

  // Mantém visível um valor que ainda não esteja na lista
  if (valor && !opcoes.some((o) => o.valor === valor)) {
    opcoes.unshift({ valor, rotulo: valor });
  }

  async function salvar() {
    if (!sigla.trim()) return setErro('Informe a sigla.');
    if (!cidadeId && !cidadeNova.trim()) return setErro('Escolha ou informe a cidade.');

    try {
      const novo = await criarAeroporto(
        cidadeId
          ? { sigla, cidade_id: Number(cidadeId) }
          : { sigla, cidade: cidadeNova }
      );

      onNovoAeroporto(novo);
      if (!cidadeId && onNovaCidade) onNovaCidade({ id: novo.cidade_id, nome: novo.cidade });

      onSelecionar(novo.sigla);
      setCadastrando(false);
      setSigla('');
      setCidadeId('');
      setCidadeNova('');
      setErro('');
    } catch (err) {
      setErro(err.message);
    }
  }

  if (cadastrando) {
    return (
      <div className="cadastro-inline">
        <p className="cadastro-inline-titulo">Novo aeroporto</p>

        <label>
          Cidade já cadastrada
          <SeletorBusca
            valor={cidadeId}
            opcoes={cidades.map((c) => ({ valor: c.id, rotulo: c.nome }))}
            onSelecionar={(v) => {
              setCidadeId(v);
              setCidadeNova('');
            }}
            placeholder="Buscar cidade..."
          />
        </label>

        <label>
          ou cidade nova
          <input
            placeholder="Nome da cidade"
            value={cidadeNova}
            onChange={(e) => {
              setCidadeNova(e.target.value);
              setCidadeId('');
            }}
          />
        </label>

        <label>
          Sigla do aeroporto
          <input
            placeholder="GRU"
            maxLength={4}
            value={sigla}
            onChange={(e) => setSigla(e.target.value.toUpperCase())}
          />
        </label>

        <div className="cia-nova-acoes">
          <button type="button" className="btn-mini" onClick={salvar}>
            Salvar
          </button>
          <button type="button" className="btn-mini cancelar" onClick={() => setCadastrando(false)}>
            Cancelar
          </button>
        </div>

        {erro && <small className="cia-erro">{erro}</small>}
      </div>
    );
  }

  return (
    <SeletorBusca
      valor={valor}
      opcoes={opcoes}
      onSelecionar={onSelecionar}
      placeholder="Buscar aeroporto..."
      onCriar={(texto) => {
        setSigla(texto.length <= 4 ? texto.toUpperCase() : '');
        setCadastrando(true);
      }}
      textoCriar="Cadastrar aeroporto"
    />
  );
}
