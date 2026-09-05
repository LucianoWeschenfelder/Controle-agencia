import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import ViagemForm from '../components/ViagemForm';
import ViagemEditar from '../components/ViagemEditar';
import EditarBloco from '../components/EditarBloco';
import {
  listarViagens, criarViagem, editarViagem, marcarCheckin, excluirViagem,
  salvarBloco, salvarVoos,
} from '../api/viagens';
import { buscarConfiguracoes } from '../api/configuracoes';
import { abrirWhatsApp, montarMensagem } from '../utils/whatsapp';
import { formatarData, formatarMoeda } from '../utils/formato';
import { minutosEntre, formatarDuracao, dataDeChegada } from '../utils/tempo';

const ETAPAS = [
  { id: 'aguardando_checkin', rotulo: 'Aguardando Check-in' },
  { id: 'realizar_checkin', rotulo: 'Realizar Check-in' },
  { id: 'checkin_realizado', rotulo: 'Check-in Realizado' },
  { id: 'em_viagem', rotulo: 'Em Viagem' },
  { id: 'concluido', rotulo: 'Concluído' },
];

function diasAte(data, hora) {
  if (!data) return null;
  const alvo = new Date(`${data.slice(0, 10)}T${hora || '00:00'}:00`);
  return Math.ceil((alvo - new Date()) / (1000 * 60 * 60 * 24));
}

function textoDias(dias) {
  if (dias === null) return '';
  if (dias < 0) return 'já partiu';
  if (dias === 0) return 'hoje';
  if (dias === 1) return 'amanhã';
  return `em ${dias} dias`;
}

function rotuloUnidade(unidade) {
  const base = unidade.sentido === 'ida' ? 'Ida' : 'Volta';
  if (!unidade.parte) return base;
  return `${base} · parte ${unidade.parte} de ${unidade.total_partes}`;
}

function LinhaCheckin({ linha, config, onCheckin, onSalvarBloco, onEditar, onExcluir }) {
  const { unidade } = linha;
  const [expandido, setExpandido] = useState(false);
  const [editandoBloco, setEditandoBloco] = useState(false);

  const dias = diasAte(unidade.data, unidade.hora_saida);
  const liberaEm = linha.checkin_libera_em ? new Date(linha.checkin_libera_em) : null;

  // O check-in só pode ser marcado depois de liberado pela companhia
  const podeMarcar = linha.etapa === 'realizar_checkin' || linha.etapa === 'em_viagem';

  return (
    <div className="viagem-card">
      <div className="viagem-card-topo">
        <div>
          <span className="unidade-rotulo">{rotuloUnidade(unidade)}</span>
          <h3>
            {unidade.origem || '—'} → {unidade.destino || '—'}
          </h3>
        </div>

        <div className="viagem-card-lado">
          {linha.etapa !== 'concluido' && (
            <span className="etiqueta-dias dias-ok">{textoDias(dias)}</span>
          )}
        </div>
      </div>

      <div className="passageiro-titular">
        <span>Passageiro</span>
        <strong>{linha.cliente?.nome || '—'}</strong>
        {linha.passageiros > 1 && (
          <button type="button" className="btn-link" onClick={() => setExpandido(!expandido)}>
            + {linha.passageiros - 1} acompanhante{linha.passageiros > 2 ? 's' : ''}
          </button>
        )}
      </div>

      <div className="dados-checkin">
        <div>
          <span>Companhia</span>
          <strong>{unidade.cia || '—'}</strong>
        </div>
        <div>
          <span>Localizador</span>
          <strong>{linha.localizador || '—'}</strong>
        </div>
        <div>
          <span>Saída</span>
          <strong>
            {formatarData(unidade.data)} às {unidade.hora_saida || '—'}
          </strong>
        </div>
        <div>
          <span>Passageiros</span>
          <strong>{linha.passageiros}</strong>
        </div>
      </div>

      <button className="btn-link" onClick={() => setExpandido(!expandido)}>
        {expandido ? 'ocultar detalhes' : 'ver detalhes'}
      </button>

      {expandido && (
        <div className="detalhes-expandidos">
          {linha.nao_vinculada && (
            <p className="faixa-alerta">
              Escala não vinculada — este trecho tem companhia própria e exige check-in separado.
            </p>
          )}

          {unidade.conexoes > 0 && (
            <p className="faixa-info">
              Escala vinculada pela {unidade.cia}: um único check-in cobre o percurso.
            </p>
          )}

          <div className="itinerario-bloco">
            {unidade.voos.map((v, i) => {
              const chegada = dataDeChegada(v.data, v.hora_saida, v.hora_chegada);
              const proximo = unidade.voos[i + 1];

              const escala = proximo
                ? minutosEntre(chegada, v.hora_chegada, proximo.data || chegada, proximo.hora_saida)
                : null;

              return (
                <div key={v.id ?? i}>
                  <div className="itinerario-voo">
                    <span className="itinerario-horas">
                      {v.hora_saida || '--:--'} → {v.hora_chegada || '--:--'}
                      {chegada && chegada !== v.data && <sup>+1</sup>}
                    </span>
                    <span className="itinerario-rota">
                      {v.origem} → {v.destino}
                    </span>
                    <span className="itinerario-voo-num">
                      {v.numero_voo || '—'} · {formatarData(v.data)}
                    </span>
                  </div>

                  {escala !== null && (
                    <p className="itinerario-escala">
                      Conexão em {v.destino} · {formatarDuracao(escala)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {linha.etapa === 'aguardando_checkin' && liberaEm && (
            <p className="faixa-info">
              Check-in libera em {liberaEm.toLocaleDateString('pt-BR')} às{' '}
              {liberaEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} (
              {linha.antecedencia_checkin}h antes)
            </p>
          )}

          {linha.passageiros > 1 && (
            <div className="lista-acompanhantes">
              {(linha.acompanhantes || []).length === 0 ? (
                <p>Acompanhantes ainda não cadastrados. Use "Editar viagem" para incluir.</p>
              ) : (
                (linha.acompanhantes || []).map((a) => (
                  <p key={a.id}>
                    <span className={`selo-tipo-passageiro ${a.tipo}`}>
                      {a.tipo === 'bebe' ? 'Bebê' : a.tipo === 'crianca' ? 'Criança' : 'Adulto'}
                    </span>
                    {a.nome}
                    {a.documento && ` · ${a.documento}`}
                    {a.data_nascimento && ` · ${formatarData(a.data_nascimento)}`}
                  </p>
                ))
              )}
            </div>
          )}

          <div className="detalhes-venda">
            <div>
              <span>Data da venda</span>
              <strong>{formatarData(linha.data_venda)}</strong>
            </div>
            <div>
              <span>Valor da venda</span>
              <strong>{formatarMoeda(linha.preco_venda)}</strong>
            </div>
            <div>
              <span>Referência</span>
              <strong>{linha.referencia}</strong>
            </div>
          </div>

          {linha.observacoes && <p className="cotacao-obs">Obs: {linha.observacoes}</p>}
        </div>
      )}

      {linha.etapa === 'realizar_checkin' && (
        <p className="faixa-alerta">Check-in liberado — faça agora e avise o cliente.</p>
      )}

      {editandoBloco && (
        <EditarBloco
          linha={linha}
          onSalvar={async (l, dados) => {
            await onSalvarBloco(l, dados);
            setEditandoBloco(false);
          }}
          onCancelar={() => setEditandoBloco(false)}
        />
      )}

      <div className="cotacao-acoes">
        {linha.url_checkin && (
          <button
            className="btn btn-primario"
            onClick={() => window.open(linha.url_checkin, '_blank')}
            title={`Abrir o check-in da ${unidade.cia}`}
          >
            Check-in {unidade.cia}
          </button>
        )}

        {linha.checkin_feito ? (
          <button className="btn-mini preenchido" onClick={() => onCheckin(linha, false)}>
            ✓ Check-in feito
          </button>
        ) : (
          <button
            className={`btn-mini ${podeMarcar ? 'destaque' : ''}`}
            onClick={() => onCheckin(linha, true)}
            disabled={!podeMarcar}
            title={podeMarcar ? '' : 'O check-in ainda não foi liberado pela companhia'}
          >
            {podeMarcar ? 'Marcar check-in' : '🔒 Check-in bloqueado'}
          </button>
        )}

        <button className="btn btn-secundario" onClick={() => setEditandoBloco(true)}>
          Editar bloco
        </button>

        <button
          className="btn btn-whatsapp"
          onClick={() =>
            abrirWhatsApp(
              linha.cliente?.telefone,
              montarMensagem(config.mensagem_whatsapp, { cliente: linha.cliente }, config)
            )
          }
        >
          WhatsApp
        </button>

        <button className="btn btn-secundario" onClick={() => onEditar(linha)}>
          Editar viagem
        </button>

        <button className="btn btn-perigo" onClick={() => onExcluir(linha)}>
          Excluir viagem
        </button>
      </div>
    </div>
  );
}

function CadastroViagem() {
  const navigate = useNavigate();

  async function salvar(dados) {
    await criarViagem(dados);
    navigate('/viagens');
  }

  return (
    <div className="pagina">
      <ViagemForm onSalvar={salvar} onCancelar={() => navigate('/viagens')} />
    </div>
  );
}

function EdicaoViagem() {
  const navigate = useNavigate();
  const { id } = useParams();

  async function salvar(viagemId, dados) {
    await editarViagem(viagemId, dados);
    navigate('/viagens');
  }

  return (
    <div className="pagina">
      <ViagemEditar
        viagemId={Number(id)}
        onSalvar={salvar}
        onCancelar={() => navigate('/viagens')}
      />
    </div>
  );
}

function ListaViagens() {
  const [linhas, setLinhas] = useState([]);
  const [config, setConfig] = useState({});
  const navigate = useNavigate();
  const [parametros, setParametros] = useSearchParams();

  // A etapa fica na URL, sem criar entrada nova no histórico a cada clique
  const etapa = parametros.get('etapa') || 'realizar_checkin';
  const setEtapa = (valor) => setParametros({ etapa: valor }, { replace: true });
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');


  useEffect(() => {
    buscarConfiguracoes().then(setConfig).catch(() => {});
  }, []);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro('');
    try {
      setLinhas(await listarViagens(busca));
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

  async function alterarCheckin(linha, feito) {
    try {
      await marcarCheckin(linha.viagem_id, linha.chave, feito);
      carregar();
    } catch (err) {
      setErro(err.message);
    }
  }

  // Salva os ajustes daquele bloco e, se algum horário mudou, também os voos
  async function salvarBlocoCompleto(linha, dados) {
    await salvarBloco(linha.viagem_id, {
      chave: linha.chave,
      antecedencia: dados.antecedencia,
      localizador: dados.localizador,
    });

    if (dados.voos?.length) {
      await salvarVoos(linha.viagem_id, dados.voos);
    }

    carregar();
  }

  async function handleExcluir(linha) {
    const ok = window.confirm(
      `Excluir a viagem inteira de ${linha.cliente?.nome}? Todos os check-ins dela saem da lista.`
    );
    if (!ok) return;

    try {
      await excluirViagem(linha.viagem_id);
      carregar();
    } catch (err) {
      setErro(err.message);
    }
  }

  const contagens = {};
  for (const item of ETAPAS) {
    contagens[item.id] = linhas.filter((l) => l.etapa === item.id).length;
  }

  const visiveis = linhas.filter((l) => l.etapa === etapa);

  return (
    <div className="pagina">
      <div className="barra-acoes">
        <input
          type="text"
          className="campo-busca"
          placeholder="Buscar por cliente, rota, companhia ou localizador..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <button className="btn btn-primario" onClick={() => navigate('/viagens/nova')}>
          + Cadastrar viagem
        </button>
      </div>

      <div className="abas">
        {ETAPAS.map((item) => (
          <button
            key={item.id}
            className={`aba ${etapa === item.id ? 'aba-ativa' : ''}`}
            onClick={() => setEtapa(item.id)}
          >
            {item.rotulo}
            <span className="aba-contador">{contagens[item.id] ?? 0}</span>
          </button>
        ))}
      </div>

      {erro && <p className="form-erro">{erro}</p>}

      {carregando ? (
        <p className="mensagem-vazia">Carregando viagens...</p>
      ) : visiveis.length === 0 ? (
        <p className="mensagem-vazia">Nenhum check-in nesta etapa.</p>
      ) : (
        <div className="cotacoes-lista">
          {visiveis.map((linha) => (
            <LinhaCheckin
              key={linha.id}
              linha={linha}
              config={config}
              onCheckin={alterarCheckin}
              onSalvarBloco={salvarBlocoCompleto}
              onEditar={(l) => navigate(`/viagens/${l.viagem_id}/editar`)}
              onExcluir={handleExcluir}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Viagens() {
  return (
    <Routes>
      <Route path="/" element={<ListaViagens />} />
      <Route path="nova" element={<CadastroViagem />} />
      <Route path=":id/editar" element={<EdicaoViagem />} />
    </Routes>
  );
}
