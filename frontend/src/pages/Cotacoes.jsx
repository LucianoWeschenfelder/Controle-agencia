import { useState, useEffect, useCallback } from 'react';
import CotacaoForm from '../components/CotacaoForm';
import {
  listarCotacoes, criarCotacao, editarCotacao, alterarStatus, excluirCotacao,
} from '../api/cotacoes';
import { buscarConfiguracoes } from '../api/configuracoes';
import { listarAeroportos } from '../api/cadastros';
import { listarFornecedores } from '../api/fornecedores';
import OrigemMilhas from '../components/OrigemMilhas';
import { gerarPdf, gerarWord } from '../utils/orcamento';
import { abrirWhatsApp, montarMensagem } from '../utils/whatsapp';
import { formatarMoeda, formatarData, formatarNumero } from '../utils/formato';

const ABAS = [
  { id: 'elaboracao', rotulo: 'Em elaboração' },
  { id: 'enviada', rotulo: 'Enviada' },
  { id: 'vendida', rotulo: 'Vendida' },
  { id: 'cancelada', rotulo: 'Cancelada' },
];

const ACOES_STATUS = {
  elaboracao: [{ status: 'enviada', rotulo: 'Marcar como enviada' }],
  enviada: [
    { status: 'vendida', rotulo: 'Marcar como vendida' },
    { status: 'cancelada', rotulo: 'Cancelar' },
  ],
  vendida: [{ status: 'enviada', rotulo: 'Voltar para enviada' }],
  cancelada: [{ status: 'elaboracao', rotulo: 'Reabrir' }],
};

// Monta "2 adultos, 1 criança e 1 bebê" a partir das faixas etárias
function composicaoPassageiros(c) {
  const partes = [
    [c.adultos, 'adulto', 'adultos'],
    [c.criancas, 'criança', 'crianças'],
    [c.bebes, 'bebê', 'bebês'],
  ]
    .filter(([qtd]) => Number(qtd) > 0)
    .map(([qtd, um, varios]) => `${qtd} ${Number(qtd) === 1 ? um : varios}`);

  if (!partes.length) return `${c.passageiros} passageiro(s)`;
  if (partes.length === 1) return partes[0];

  return `${partes.slice(0, -1).join(', ')} e ${partes.at(-1)}`;
}

function EtiquetaDias({ dias }) {
  if (dias === null || dias === undefined) return null;

  let classe = 'dias-ok';
  if (dias >= 7) classe = 'dias-grave';
  else if (dias >= 3) classe = 'dias-alerta';

  const texto = dias === 0 ? 'enviada hoje' : dias === 1 ? 'há 1 dia' : `há ${dias} dias`;
  return <span className={`etiqueta-dias ${classe}`}>{texto}</span>;
}

function TabelaTrechos({ titulo, trechos }) {
  if (!trechos.length) return null;

  return (
    <>
      <p className="subtitulo-tabela">{titulo}</p>
      {trechos.map((trecho) => (
        <div className="trecho-resumo" key={trecho.id}>
          <p className="trecho-resumo-titulo">
            {trecho.origem || '—'} → {trecho.destino || '—'}
            {trecho.data && ` · ${formatarData(trecho.data)}`}
          </p>
          <table className="tabela-comparativo compacta">
            <thead>
              <tr>
                <th></th><th>CIA</th><th>Milhas</th><th>Milheiro</th>
                <th>Taxa</th><th>Bagagem</th><th>Custo</th>
              </tr>
            </thead>
            <tbody>
              {trecho.opcoes.map((o) => (
                <tr key={o.id} className={o.escolhida ? 'linha-escolhida' : ''}>
                  <td>{o.escolhida ? '✓' : ''}</td>
                  <td>{o.cia || '—'}</td>
                  <td>{formatarNumero(o.milhas)}</td>
                  <td>{formatarMoeda(o.valor_milheiro)}</td>
                  <td>{formatarMoeda(o.taxa)}</td>
                  <td>{formatarMoeda(o.bagagem)}</td>
                  <td className="destaque">{formatarMoeda(o.custo_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </>
  );
}

function CotacaoCard({ cotacao, config, aeroportos, fornecedores, onAtualizar, onEditar, onStatus, onExcluir }) {
  const [expandida, setExpandida] = useState(false);

  const todosTrechos = [...cotacao.trechos_ida, ...cotacao.trechos_volta];
  const totalOpcoes = todosTrechos.reduce((s, t) => s + t.opcoes.length, 0);

  // Só dá para gerar o orçamento com os horários do voo preenchidos
  const temVooDetalhado = todosTrechos.some(
    (t) => t.opcao_escolhida?.hora_saida && t.opcao_escolhida?.hora_chegada
  );

  return (
    <div className="cotacao-card">
      <div className="cotacao-card-topo">
        <div>
          <h3>
            {cotacao.origem} → {cotacao.destino}
            {cotacao.tipo_viagem === 'ida' && <span className="selo-tipo">só ida</span>}
          </h3>
          <p className="cotacao-cliente">
            {cotacao.cliente?.nome} · {composicaoPassageiros(cotacao)}
          </p>
        </div>

        <div className="cotacao-card-datas">
          <p>Ida: <strong>{formatarData(cotacao.data_ida)}</strong></p>
          {cotacao.data_volta && (
            <p>Volta: <strong>{formatarData(cotacao.data_volta)}</strong></p>
          )}
          {cotacao.status === 'enviada' && <EtiquetaDias dias={cotacao.dias_desde_envio} />}
        </div>
      </div>

      <div className="cotacao-resumo">
        <div>
          <span>Custo total</span>
          <strong>{formatarMoeda(cotacao.custo)}</strong>
        </div>
        <div>
          <span>Venda</span>
          <strong>{formatarMoeda(cotacao.preco_venda)}</strong>
        </div>
        <div className={cotacao.lucro < 0 ? 'negativo' : 'positivo'}>
          <span>Lucro</span>
          <strong>{formatarMoeda(cotacao.lucro)}</strong>
        </div>
        <div>
          <span>Internet</span>
          <strong>{formatarMoeda(cotacao.valor_internet)}</strong>
        </div>
      </div>

      {cotacao.economia > 0 && (
        <p className="faixa-economia">
          Economia do cliente: {formatarMoeda(cotacao.economia)} ({cotacao.economia_percentual}%)
        </p>
      )}

      {cotacao.data_envio && (
        <p className="cotacao-envio">
          Enviada em {formatarData(cotacao.data_envio)}
          {cotacao.data_venda && ` · vendida em ${formatarData(cotacao.data_venda)}`}
        </p>
      )}

      {cotacao.status === 'vendida' && (
        <OrigemMilhas
          cotacao={cotacao}
          fornecedores={fornecedores}
          onAtualizar={onAtualizar}
        />
      )}

      <button className="btn-link" onClick={() => setExpandida(!expandida)}>
        {expandida ? 'ocultar detalhes' : `ver comparativo (${totalOpcoes} opções)`}
      </button>

      {expandida && (
        <div className="tabela-wrapper">
          <TabelaTrechos titulo="Ida" trechos={cotacao.trechos_ida} />
          <TabelaTrechos titulo="Volta" trechos={cotacao.trechos_volta} />
          {cotacao.observacoes && <p className="cotacao-obs">Obs: {cotacao.observacoes}</p>}
        </div>
      )}

      <div className="cotacao-acoes">
        <button className="btn btn-secundario" onClick={() => onEditar(cotacao)}>
          Editar
        </button>

        <button
          className="btn btn-secundario"
          onClick={() => gerarPdf(cotacao, config, aeroportos)}
          disabled={!temVooDetalhado}
          title={temVooDetalhado ? '' : 'Preencha os horários do voo primeiro'}
        >
          Gerar PDF
        </button>

        <button
          className="btn btn-secundario"
          onClick={() => gerarWord(cotacao, config, aeroportos)}
          disabled={!temVooDetalhado}
          title={temVooDetalhado ? '' : 'Preencha os horários do voo primeiro'}
        >
          Gerar Word
        </button>

        <button
          className="btn btn-whatsapp"
          onClick={() =>
            abrirWhatsApp(
              cotacao.cliente?.telefone,
              montarMensagem(config.mensagem_whatsapp, cotacao, config)
            )
          }
          title={
            cotacao.cliente?.telefone
              ? `Falar com ${cotacao.cliente.nome}`
              : 'Cliente sem telefone cadastrado — o WhatsApp vai pedir o contato'
          }
        >
          WhatsApp
        </button>

        {(ACOES_STATUS[cotacao.status] || []).map((acao) => (
          <button
            key={acao.status}
            className="btn btn-secundario"
            onClick={() => onStatus(cotacao, acao.status)}
          >
            {acao.rotulo}
          </button>
        ))}

        <button className="btn btn-perigo" onClick={() => onExcluir(cotacao)}>
          Excluir
        </button>
      </div>
    </div>
  );
}

export default function Cotacoes() {
  const [cotacoes, setCotacoes] = useState([]);
  const [config, setConfig] = useState({});
  const [aeroportos, setAeroportos] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [contagens, setContagens] = useState({});
  const [aba, setAba] = useState('elaboracao');
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [modo, setModo] = useState('lista');
  const [cotacaoEditando, setCotacaoEditando] = useState(null);

  useEffect(() => {
    buscarConfiguracoes().then(setConfig).catch(() => {});
    listarAeroportos().then(setAeroportos).catch(() => {});
    listarFornecedores().then(setFornecedores).catch(() => {});
  }, []);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro('');
    try {
      const todas = await listarCotacoes({ busca });

      const novas = {};
      for (const item of ABAS) {
        novas[item.id] = todas.filter((c) => c.status === item.id).length;
      }

      setContagens(novas);
      setCotacoes(todas);
    } catch {
      setErro('Não foi possível conectar ao servidor. Verifique se o backend está rodando.');
    } finally {
      setCarregando(false);
    }
  }, [busca]);

  useEffect(() => {
    const timeout = setTimeout(carregar, 300);
    return () => clearTimeout(timeout);
  }, [carregar]);

  async function salvar(dados) {
    if (cotacaoEditando) {
      await editarCotacao(cotacaoEditando.id, dados);
    } else {
      await criarCotacao(dados);
    }
    setModo('lista');
    setCotacaoEditando(null);
    carregar();
  }

  async function mudarStatus(cotacao, status) {
    try {
      await alterarStatus(cotacao.id, status);
      setAba(status);
      carregar();
    } catch (err) {
      setErro(err.message);
    }
  }

  async function handleExcluir(cotacao) {
    const ok = window.confirm(
      `Excluir a cotação ${cotacao.origem} → ${cotacao.destino} de ${cotacao.cliente?.nome}?`
    );
    if (!ok) return;

    try {
      await excluirCotacao(cotacao.id);
      carregar();
    } catch (err) {
      setErro(err.message);
    }
  }

  if (modo === 'form') {
    return (
      <div className="pagina">
        <CotacaoForm
          cotacaoEditando={cotacaoEditando}
          onSalvar={salvar}
          onCancelar={() => {
            setModo('lista');
            setCotacaoEditando(null);
          }}
        />
      </div>
    );
  }

  const visiveis = cotacoes.filter((c) => c.status === aba);

  return (
    <div className="pagina">
      <div className="barra-acoes">
        <input
          type="text"
          className="campo-busca"
          placeholder="Buscar por cliente, origem ou destino..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <button
          className="btn btn-primario"
          onClick={() => {
            setCotacaoEditando(null);
            setModo('form');
          }}
        >
          + Nova cotação
        </button>
      </div>

      <div className="abas">
        {ABAS.map((item) => (
          <button
            key={item.id}
            className={`aba ${aba === item.id ? 'aba-ativa' : ''}`}
            onClick={() => setAba(item.id)}
          >
            {item.rotulo}
            <span className="aba-contador">{contagens[item.id] ?? 0}</span>
          </button>
        ))}
      </div>

      {erro && <p className="form-erro">{erro}</p>}

      {carregando ? (
        <p className="mensagem-vazia">Carregando cotações...</p>
      ) : visiveis.length === 0 ? (
        <p className="mensagem-vazia">Nenhuma cotação nesta situação.</p>
      ) : (
        <div className="cotacoes-lista">
          {visiveis.map((cotacao) => (
            <CotacaoCard
              key={cotacao.id}
              cotacao={cotacao}
              config={config}
              aeroportos={aeroportos}
              fornecedores={fornecedores}
              onAtualizar={carregar}
              onEditar={(c) => {
                setCotacaoEditando(c);
                setModo('form');
              }}
              onStatus={mudarStatus}
              onExcluir={handleExcluir}
            />
          ))}
        </div>
      )}
    </div>
  );
}
