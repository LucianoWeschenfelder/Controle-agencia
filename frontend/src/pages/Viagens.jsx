import { useState, useEffect, useCallback } from 'react';
import ViagemForm from '../components/ViagemForm';
import ViagemEditar from '../components/ViagemEditar';
import {
  listarViagens, criarViagem, editarViagem, marcarCheckin, excluirViagem,
} from '../api/viagens';
import { buscarConfiguracoes } from '../api/configuracoes';
import { abrirWhatsApp, montarMensagem } from '../utils/whatsapp';
import { formatarData, formatarMoeda } from '../utils/formato';

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

function LinhaCheckin({ linha, config, onCheckin, onAntecedencia, onEditar, onExcluir }) {
  const { unidade } = linha;
  const [mostrarPassageiros, setMostrarPassageiros] = useState(false);
  const [mostrarDetalhes, setMostrarDetalhes] = useState(false);

  // O check-in só pode ser marcado depois de liberado pela companhia
  const podeMarcar = linha.etapa === 'realizar_checkin' || linha.etapa === 'em_viagem';
  const dias = diasAte(unidade.data, unidade.hora_saida);

  const liberaEm = linha.checkin_libera_em ? new Date(linha.checkin_libera_em) : null;

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
          <span className="viagem-ref">{linha.referencia}</span>
        </div>
      </div>

      {/* Dados pedidos na hora de fazer o check-in */}
      <div className="passageiro-titular">
        <span>Passageiro</span>
        <strong>{linha.cliente?.nome || '—'}</strong>
        {linha.passageiros > 1 && (
          <button
            type="button"
            className="btn-link"
            onClick={() => setMostrarPassageiros(!mostrarPassageiros)}
          >
            {mostrarPassageiros
              ? 'ocultar acompanhantes'
              : `+ ${linha.passageiros - 1} acompanhante${linha.passageiros > 2 ? 's' : ''}`}
          </button>
        )}
      </div>

      {mostrarPassageiros && (
        <div className="lista-acompanhantes">
          {(linha.acompanhantes || []).length === 0 ? (
            <p>Acompanhantes ainda não cadastrados. Use "Editar" para incluir.</p>
          ) : (
            (linha.acompanhantes || []).map((a) => (
              <p key={a.id}>
                {a.nome}
                {a.documento && ` · ${a.documento}`}
                {a.data_nascimento && ` · ${formatarData(a.data_nascimento)}`}
              </p>
            ))
          )}
        </div>
      )}

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

      {linha.nao_vinculada && (
        <p className="faixa-alerta">
          Escala não vinculada — este trecho tem companhia própria e exige check-in separado.
        </p>
      )}

      {unidade.conexoes > 0 && (
        <p className="faixa-info">
          Escala vinculada pela {unidade.cia}: um único check-in cobre{' '}
          {unidade.voos.map((v) => `${v.origem}→${v.destino}`).join(' e ')}.
        </p>
      )}

      {linha.etapa === 'aguardando_checkin' && liberaEm && (
        <p className="faixa-info">
          Check-in libera em {liberaEm.toLocaleDateString('pt-BR')} às{' '}
          {liberaEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} (
          {linha.antecedencia_checkin}h antes)
        </p>
      )}

      {linha.etapa === 'realizar_checkin' && (
        <p className="faixa-alerta">Check-in liberado — faça agora e avise o cliente.</p>
      )}

      <button className="btn-link" onClick={() => setMostrarDetalhes(!mostrarDetalhes)}>
        {mostrarDetalhes ? 'ocultar detalhes da venda' : 'ver detalhes da venda'}
      </button>

      {mostrarDetalhes && (
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
            <span>Milhas de</span>
            <strong>
              {linha.origem_milhas === 'proprio'
                ? 'Milhas próprias'
                : linha.fornecedor?.nome || 'não informado'}
            </strong>
            {linha.fornecedor?.whatsapp && (
              <button
                className="btn-mini"
                onClick={() => abrirWhatsApp(linha.fornecedor.whatsapp, '')}
              >
                WhatsApp do fornecedor
              </button>
            )}
          </div>
          {linha.observacoes && (
            <div className="campo-largo-auto">
              <span>Observações</span>
              <strong>{linha.observacoes}</strong>
            </div>
          )}
        </div>
      )}

      <div className="cotacao-acoes">
        {linha.checkin_feito ? (
          <button className="btn-mini preenchido" onClick={() => onCheckin(linha, false)}>
            ✓ Check-in feito
          </button>
        ) : (
          <button
            className={`btn-mini ${podeMarcar ? 'destaque' : ''}`}
            onClick={() => onCheckin(linha, true)}
            disabled={!podeMarcar}
            title={
              podeMarcar
                ? ''
                : 'O check-in ainda não foi liberado pela companhia'
            }
          >
            {podeMarcar ? 'Marcar check-in' : '🔒 Check-in bloqueado'}
          </button>
        )}

        <label className="antecedencia-inline">
          Libera
          <select
            value={linha.antecedencia_checkin}
            onChange={(e) => onAntecedencia(linha, Number(e.target.value))}
          >
            <option value={24}>24h antes</option>
            <option value={48}>48h antes</option>
          </select>
        </label>

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
          Editar
        </button>

        <button className="btn btn-perigo" onClick={() => onExcluir(linha)}>
          Excluir viagem
        </button>
      </div>
    </div>
  );
}

export default function Viagens() {
  const [linhas, setLinhas] = useState([]);
  const [config, setConfig] = useState({});
  const [etapa, setEtapa] = useState('realizar_checkin');
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [modo, setModo] = useState('lista');
  const [viagemEditando, setViagemEditando] = useState(null);

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

  async function salvar(dados) {
    await criarViagem(dados);
    setModo('lista');
    carregar();
  }

  async function alterarCheckin(linha, feito) {
    try {
      await marcarCheckin(linha.viagem_id, linha.chave, feito);
      carregar();
    } catch (err) {
      setErro(err.message);
    }
  }

  async function alterarAntecedencia(linha, horas) {
    try {
      await editarViagem(linha.viagem_id, {
        antecedencia_checkin: horas,
        localizador: linha.localizador,
        observacoes: linha.observacoes,
      });
      carregar();
    } catch (err) {
      setErro(err.message);
    }
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

  async function salvarEdicao(id, dados) {
    await editarViagem(id, dados);
    setModo('lista');
    setViagemEditando(null);
    carregar();
  }

  if (modo === 'form') {
    return (
      <div className="pagina">
        <ViagemForm onSalvar={salvar} onCancelar={() => setModo('lista')} />
      </div>
    );
  }

  if (modo === 'editar') {
    return (
      <div className="pagina">
        <ViagemEditar
          viagemId={viagemEditando}
          onSalvar={salvarEdicao}
          onCancelar={() => {
            setModo('lista');
            setViagemEditando(null);
          }}
        />
      </div>
    );
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
        <button className="btn btn-primario" onClick={() => setModo('form')}>
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
              onAntecedencia={alterarAntecedencia}
              onEditar={(l) => {
                setViagemEditando(l.viagem_id);
                setModo('editar');
              }}
              onExcluir={handleExcluir}
            />
          ))}
        </div>
      )}
    </div>
  );
}
