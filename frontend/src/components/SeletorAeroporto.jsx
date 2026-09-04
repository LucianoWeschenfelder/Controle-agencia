import { useState } from 'react';
import SeletorBusca from './SeletorBusca';
import { criarAeroporto, criarCidade } from '../api/cadastros';

export default function SeletorAeroporto({
  valor, aeroportos, cidades, onSelecionar, onNovoAeroporto, onNovaCidade,
}) {
  const [cadastrando, setCadastrando] = useState(false);
  const [sigla, setSigla] = useState('');
  const [cidadeId, setCidadeId] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const opcoes = aeroportos.map((a) => ({
    valor: a.sigla,
    rotulo: `${a.cidade} (${a.sigla})`,
    sub: a.sigla,
  }));

  // Mantém visível um valor que ainda não esteja na lista
  if (valor && !opcoes.some((o) => o.valor === valor)) {
    opcoes.unshift({ valor, rotulo: valor });
  }

  /*
   * Cria a cidade na hora e já a deixa selecionada, para não precisar
   * de um segundo campo só para "cidade nova".
   */
  async function cadastrarCidade(nome) {
    if (!nome?.trim()) {
      setErro('Digite o nome da cidade antes de cadastrar.');
      return;
    }

    try {
      const nova = await criarCidade({ nome });
      onNovaCidade?.(nova);
      setCidadeId(nova.id);
      setErro('');
    } catch (err) {
      setErro(err.message);
    }
  }

  async function salvar() {
    if (!cidadeId) return setErro('Escolha ou cadastre a cidade.');
    if (!sigla.trim()) return setErro('Informe a sigla do aeroporto.');

    setSalvando(true);
    setErro('');
    try {
      const novo = await criarAeroporto({ sigla, cidade_id: Number(cidadeId) });
      onNovoAeroporto(novo);
      onSelecionar(novo.sigla);
      fechar();
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  }

  function fechar() {
    setCadastrando(false);
    setSigla('');
    setCidadeId('');
    setErro('');
  }

  if (cadastrando) {
    const cidadeEscolhida = cidades.find((c) => c.id === Number(cidadeId));

    return (
      <div className="cadastro-inline">
        <p className="cadastro-inline-titulo">Novo aeroporto</p>

        <div className="campo-seletor">
          <span className="campo-seletor-rotulo">Cidade</span>
          <SeletorBusca
            valor={cidadeId}
            opcoes={cidades.map((c) => ({ valor: c.id, rotulo: c.nome }))}
            onSelecionar={setCidadeId}
            placeholder="Buscar ou cadastrar cidade..."
            onCriar={cadastrarCidade}
            textoCriar="Cadastrar cidade"
            permitirLimpar
          />
          {cidadeEscolhida && (
            <small className="cidade-ok">Cidade: {cidadeEscolhida.nome}</small>
          )}
        </div>

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
          <button type="button" className="btn-mini" onClick={salvar} disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar aeroporto'}
          </button>
          <button type="button" className="btn-mini cancelar" onClick={fechar}>
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
      permitirLimpar
    />
  );
}
