import { useState, useEffect } from 'react';
import SeletorCliente from './SeletorCliente';
import BlocoSentido, { calcularCusto } from './BlocoSentido';
import SeletorAeroporto from './SeletorAeroporto';
import { formatarMoeda } from '../utils/formato';
import { listarCias } from '../api/cias';
import { listarAeroportos, listarCidades, listarItensTarifa } from '../api/cadastros';
import AbaDadosVoo from './AbaDadosVoo';
import AbaOrcamento from './AbaOrcamento';
import SeletorBusca from './SeletorBusca';
import { buscarConfiguracoes } from '../api/configuracoes';

const OPCAO_VAZIA = {
  cia: '', classe: '', milhas: '', valor_milheiro: '', taxa: '', bagagem: '',
  hora_saida: '', hora_chegada: '', numero_voo: '', aeronave: '', duracao_min: '',
  escolhida: false,
};

const TRECHO_VAZIO = { origem: '', destino: '', data: '', opcoes: [{ ...OPCAO_VAZIA }] };

const COTACAO_VAZIA = {
  cliente_id: '', origem: '', destino: '', tipo_viagem: 'ida_volta',
  data_ida: '', data_volta: '', adultos: 1, criancas: 0, bebes: 0,
  valor_internet: '', preco_venda_unitario: '', observacoes: '',
};

// Converte os trechos vindos da API para o formato dos campos do formulário
function trechosParaFormulario(trechos) {
  if (!trechos?.length) return [];

  return trechos.map((t) => ({
    origem: t.origem || '',
    destino: t.destino || '',
    data: t.data || '',
    opcoes: t.opcoes.length
      ? t.opcoes.map((o) => ({
          cia: o.cia || '',
          classe: o.classe || '',
          milhas: o.milhas ?? '',
          valor_milheiro: o.valor_milheiro ?? '',
          taxa: o.taxa ?? '',
          bagagem: o.bagagem ?? '',
          hora_saida: o.hora_saida || '',
          hora_chegada: o.hora_chegada || '',
          numero_voo: o.numero_voo || '',
          aeronave: o.aeronave || '',
          duracao_min: o.duracao_min ?? '',
          escolhida: !!o.escolhida,
        }))
      : [{ ...OPCAO_VAZIA }],
  }));
}

export default function CotacaoForm({ cotacaoEditando, onSalvar, onCancelar }) {
  const [dados, setDados] = useState(() =>
    cotacaoEditando
      ? {
          ...COTACAO_VAZIA,
          ...cotacaoEditando,
          data_volta: cotacaoEditando.data_volta || '',
          valor_internet: cotacaoEditando.valor_internet ?? '',
          preco_venda_unitario: cotacaoEditando.preco_venda_unitario ?? '',
          observacoes: cotacaoEditando.observacoes || '',
        }
      : COTACAO_VAZIA
  );

  const [trechosIda, setTrechosIda] = useState(() =>
    trechosParaFormulario(cotacaoEditando?.trechos_ida)
  );
  const [trechosVolta, setTrechosVolta] = useState(() =>
    trechosParaFormulario(cotacaoEditando?.trechos_volta)
  );

  const [cias, setCias] = useState([]);
  const [aeroportos, setAeroportos] = useState([]);
  const [cidades, setCidades] = useState([]);
  const [catalogoItens, setCatalogoItens] = useState([]);
  const [config, setConfig] = useState({});
  const [aba, setAba] = useState('cotacao');

  const [itens, setItens] = useState(() =>
    (cotacaoEditando?.itens || []).map((i) => ({
      item_id: i.item_id,
      quantidade: i.quantidade,
    }))
  );
  const [nomeCliente, setNomeCliente] = useState(cotacaoEditando?.cliente?.nome || '');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    listarCias().then(setCias).catch(() => {});
    listarAeroportos().then(setAeroportos).catch(() => {});
    listarCidades().then(setCidades).catch(() => {});
    listarItensTarifa().then(setCatalogoItens).catch(() => {});
    buscarConfiguracoes().then(setConfig).catch(() => {});
  }, []);

  function adicionarCidadeNaLista(nova) {
    setCidades((prev) =>
      prev.some((c) => c.id === nova.id) ? prev : [...prev, nova].sort((a, b) => a.nome.localeCompare(b.nome))
    );
  }

  function adicionarAeroportoNaLista(novo) {
    setAeroportos((prev) =>
      prev.some((a) => a.id === novo.id)
        ? prev
        : [...prev, novo].sort((a, b) => a.cidade.localeCompare(b.cidade))
    );
  }

  function adicionarCiaNaLista(nova) {
    setCias((prev) =>
      prev.some((c) => c.id === nova.id)
        ? prev
        : [...prev, nova].sort((a, b) => a.nome.localeCompare(b.nome))
    );
  }

  const idaEVolta = dados.tipo_viagem === 'ida_volta';

  function handleChange(e) {
    const { name, value } = e.target;
    setDados((prev) => ({ ...prev, [name]: value }));
  }

  /*
   * Um conjunto de funções por sentido. Todas trabalham sobre a mesma
   * lista de trechos, mudando só o pedaço necessário.
   */
  function criarHandlers(setLista, sentido) {
    return {
      alterarTrecho: (iT, campo, valor) =>
        setLista((prev) =>
          prev.map((t, i) => {
            if (i === iT) return { ...t, [campo]: valor };
            // O destino de um trecho é sempre a origem do seguinte
            if (i === iT + 1 && campo === 'destino') return { ...t, origem: valor };
            return t;
          })
        ),

      adicionarTrecho: () =>
        setLista((prev) => {
          const anterior = prev[prev.length - 1];

          // O novo trecho começa onde o anterior terminou e vai até o destino final
          return [
            ...prev,
            {
              ...TRECHO_VAZIO,
              origem: anterior?.destino || '',
              destino: sentido === 'ida' ? dados.destino : dados.origem,
              data: anterior?.data || (sentido === 'ida' ? dados.data_ida : dados.data_volta),
              opcoes: [{ ...OPCAO_VAZIA }],
            },
          ];
        }),

      removerTrecho: (iT) => setLista((prev) => prev.filter((_, i) => i !== iT)),

      alterarOpcao: (iT, iO, campo, valor) =>
        setLista((prev) =>
          prev.map((t, i) =>
            i === iT
              ? {
                  ...t,
                  opcoes: t.opcoes.map((o, j) => (j === iO ? { ...o, [campo]: valor } : o)),
                }
              : t
          )
        ),

      adicionarOpcao: (iT) =>
        setLista((prev) =>
          prev.map((t, i) => (i === iT ? { ...t, opcoes: [...t.opcoes, { ...OPCAO_VAZIA }] } : t))
        ),

      removerOpcao: (iT, iO) =>
        setLista((prev) =>
          prev.map((t, i) =>
            i === iT ? { ...t, opcoes: t.opcoes.filter((_, j) => j !== iO) } : t
          )
        ),

      // Só uma opção pode ficar escolhida por trecho
      escolherOpcao: (iT, iO) =>
        setLista((prev) =>
          prev.map((t, i) =>
            i === iT
              ? { ...t, opcoes: t.opcoes.map((o, j) => ({ ...o, escolhida: j === iO })) }
              : t
          )
        ),
    };
  }

  function alterarOpcaoPorSentido(sentido, iT, iO, campo, valor) {
    const setLista = sentido === 'ida' ? setTrechosIda : setTrechosVolta;

    setLista((prev) =>
      prev.map((t, i) =>
        i === iT
          ? { ...t, opcoes: t.opcoes.map((o, j) => (j === iO ? { ...o, [campo]: valor } : o)) }
          : t
      )
    );
  }

  const hIda = criarHandlers(setTrechosIda, 'ida');
  const hVolta = criarHandlers(setTrechosVolta, 'volta');

  // Cria o primeiro trecho já preenchido com a rota da cotação
  function iniciarSentido(sentido) {
    const trecho = {
      ...TRECHO_VAZIO,
      origem: sentido === 'ida' ? dados.origem : dados.destino,
      destino: sentido === 'ida' ? dados.destino : dados.origem,
      data: sentido === 'ida' ? dados.data_ida : dados.data_volta,
      opcoes: [{ ...OPCAO_VAZIA }],
    };

    if (sentido === 'ida') setTrechosIda((p) => [...p, trecho]);
    else setTrechosVolta((p) => [...p, trecho]);
  }

  // Fechamento
  function subtotalDe(trechos) {
    const escolhidas = trechos.map((t) => t.opcoes.find((o) => o.escolhida)).filter(Boolean);
    return escolhidas.reduce((s, o) => s + calcularCusto(o), 0);
  }

  const subtotalIda = subtotalDe(trechosIda);
  const subtotalVolta = idaEVolta ? subtotalDe(trechosVolta) : 0;

  const temEscolha =
    trechosIda.some((t) => t.opcoes.some((o) => o.escolhida)) ||
    (idaEVolta && trechosVolta.some((t) => t.opcoes.some((o) => o.escolhida)));

  const adultos = Number(dados.adultos) || 0;
  const criancas = Number(dados.criancas) || 0;
  const bebes = Number(dados.bebes) || 0;

  const totalPassageiros = adultos + criancas + bebes;
  // Bebê viaja no colo: não gera passagem e não entra na multiplicação
  const pagantes = Math.max(adultos + criancas, 1);

  const custoUnitario = subtotalIda + subtotalVolta;
  const custoTotal = temEscolha ? custoUnitario * pagantes : null;

  const vendaUnitaria =
    dados.preco_venda_unitario === '' ? null : Number(dados.preco_venda_unitario);
  const precoVenda = vendaUnitaria !== null ? vendaUnitaria * pagantes : null;

  const lucro = custoTotal !== null && precoVenda !== null ? precoVenda - custoTotal : null;

  const valorInternet = dados.valor_internet === '' ? null : Number(dados.valor_internet);
  const economia = valorInternet !== null && precoVenda !== null ? valorInternet - precoVenda : null;
  const economiaPct =
    economia !== null && valorInternet > 0 ? ((economia / valorInternet) * 100).toFixed(1) : null;

  async function enviar(rascunho) {
    if (!dados.cliente_id) return setErro('Selecione o cliente.');

    if (!rascunho) {
      if (!dados.origem.trim()) return setErro('Informe a origem.');
      if (!dados.destino.trim()) return setErro('Informe o destino.');
      if (!dados.data_ida) return setErro('Informe a data da ida.');
    }

    setSalvando(true);
    setErro('');
    try {
      await onSalvar({
        ...dados,
        rascunho,
        trechos_ida: trechosIda,
        trechos_volta: idaEVolta ? trechosVolta : [],
        itens,
      });
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    enviar(false);
  }

  // --- Itens incluídos na tarifa ---
  function adicionarItem(itemId) {
    if (!itemId || itens.some((i) => i.item_id === itemId)) return;
    setItens((prev) => [...prev, { item_id: itemId, quantidade: 1 }]);
  }

  function alterarQuantidade(itemId, quantidade) {
    setItens((prev) =>
      prev.map((i) => (i.item_id === itemId ? { ...i, quantidade } : i))
    );
  }

  function removerItem(itemId) {
    setItens((prev) => prev.filter((i) => i.item_id !== itemId));
  }

  /*
   * Monta um objeto no mesmo formato que a API devolve, para a prévia do
   * orçamento mostrar exatamente o que está na tela agora.
   */
  function montarCotacaoParaPrevia() {
    function paraApi(trechos) {
      return trechos.map((t) => ({
        ...t,
        opcao_escolhida: t.opcoes.find((o) => o.escolhida) || null,
      }));
    }

    const cliente = { nome: nomeCliente };

    return {
      ...dados,
      ...(cotacaoEditando || {}),
      ...dados,
      passageiros: totalPassageiros,
      pagantes,
      preco_venda: precoVenda,
      cliente,
      referencia: cotacaoEditando?.referencia || 'PRÉVIA',
      data_conclusao: cotacaoEditando?.data_conclusao || new Date().toISOString().slice(0, 10),
      trechos_ida: paraApi(trechosIda),
      trechos_volta: idaEVolta ? paraApi(trechosVolta) : [],
      itens: itens
        .map((i) => {
          const doCatalogo = catalogoItens.find((c) => c.id === i.item_id);
          return doCatalogo ? { ...doCatalogo, ...i } : null;
        })
        .filter(Boolean),
    };
  }

  // Só dá para montar o orçamento com horários preenchidos
  const vooPreenchido = [...trechosIda, ...(idaEVolta ? trechosVolta : [])].some((t) => {
    const o = t.opcoes.find((x) => x.escolhida);
    return o?.hora_saida && o?.hora_chegada;
  });

  const motivoOrcamento = !temEscolha
    ? 'Escolha uma companhia em cada trecho na aba "Cotação".'
    : 'Preencha os horários de saída e chegada na aba "Dados do voo".';

  return (
    <form className="cotacao-form" onSubmit={handleSubmit}>
      <h2>{cotacaoEditando ? 'Editar cotação' : 'Nova cotação'}</h2>

      <div className="abas abas-form">
        {[
          { id: 'cotacao', rotulo: 'Cotação' },
          { id: 'voo', rotulo: 'Dados do voo' },
          { id: 'orcamento', rotulo: 'Orçamento' },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            className={`aba ${aba === item.id ? 'aba-ativa' : ''}`}
            onClick={() => setAba(item.id)}
          >
            {item.rotulo}
          </button>
        ))}
      </div>

      {erro && <p className="form-erro">{erro}</p>}

      <div style={{ display: aba === 'cotacao' ? 'block' : 'none' }}>

      <section className="bloco">
        <h3>1. Dados da viagem</h3>

        <SeletorCliente
          clienteId={dados.cliente_id}
          onSelecionar={(id, nome) => {
            setDados((prev) => ({ ...prev, cliente_id: id }));
            if (nome !== undefined) setNomeCliente(nome);
          }}
        />

        <div className="form-grid">
          <div className="campo-seletor">
            <span className="campo-seletor-rotulo">Origem *</span>
            <SeletorAeroporto
              valor={dados.origem}
              aeroportos={aeroportos}
              onSelecionar={(v) => setDados((p) => ({ ...p, origem: v }))}
              onNovoAeroporto={adicionarAeroportoNaLista}
              cidades={cidades}
              onNovaCidade={adicionarCidadeNaLista}
            />
          </div>
          <div className="campo-seletor">
            <span className="campo-seletor-rotulo">Destino *</span>
            <SeletorAeroporto
              valor={dados.destino}
              aeroportos={aeroportos}
              onSelecionar={(v) => setDados((p) => ({ ...p, destino: v }))}
              onNovoAeroporto={adicionarAeroportoNaLista}
              cidades={cidades}
              onNovaCidade={adicionarCidadeNaLista}
            />
          </div>
          <label>
            Tipo de viagem
            <select name="tipo_viagem" value={dados.tipo_viagem} onChange={handleChange}>
              <option value="ida_volta">Ida e volta</option>
              <option value="ida">Somente ida</option>
            </select>
          </label>
          <label>
            Adultos (acima de 16 anos)
            <input type="number" min="0" name="adultos" value={dados.adultos} onChange={handleChange} />
          </label>

          <label>
            Crianças (até 16 anos)
            <input type="number" min="0" name="criancas" value={dados.criancas} onChange={handleChange} />
          </label>

          <label>
            Bebês (até 2 anos)
            <input type="number" min="0" name="bebes" value={dados.bebes} onChange={handleChange} />
            <small>Bebê no colo não paga passagem</small>
          </label>
          <label>
            Data da ida *
            <input type="date" name="data_ida" value={dados.data_ida} onChange={handleChange} />
          </label>
          {idaEVolta && (
            <label>
              Data da volta
              <input type="date" name="data_volta" value={dados.data_volta} onChange={handleChange} />
            </label>
          )}
        </div>
      </section>

      <h3 className="titulo-etapa">2. Trechos e companhias</h3>

      {trechosIda.length === 0 ? (
        <div className="bloco chamada-inicio">
          <p>A ida ainda não tem trechos.</p>
          <button type="button" className="btn btn-primario" onClick={() => iniciarSentido('ida')}>
            Criar trecho da ida
          </button>
        </div>
      ) : (
        <BlocoSentido
          titulo="Ida"
          icone="🛫"
          rota={`${dados.origem || '—'} → ${dados.destino || '—'}`}
          trechos={trechosIda}
          cias={cias}
          onNovaCia={adicionarCiaNaLista}
          aeroportos={aeroportos}
          onNovoAeroporto={adicionarAeroportoNaLista}
          cidades={cidades}
          onNovaCidade={adicionarCidadeNaLista}
          onAlterarTrecho={hIda.alterarTrecho}
          onAdicionarTrecho={hIda.adicionarTrecho}
          onRemoverTrecho={hIda.removerTrecho}
          onAlterarOpcao={hIda.alterarOpcao}
          onAdicionarOpcao={hIda.adicionarOpcao}
          onRemoverOpcao={hIda.removerOpcao}
          onEscolherOpcao={hIda.escolherOpcao}
        />
      )}

      {idaEVolta &&
        (trechosVolta.length === 0 ? (
          <div className="bloco chamada-inicio">
            <p>A volta ainda não tem trechos.</p>
            <button type="button" className="btn btn-primario" onClick={() => iniciarSentido('volta')}>
              Criar trecho da volta
            </button>
          </div>
        ) : (
          <BlocoSentido
            titulo="Volta"
            icone="🛬"
            rota={`${dados.destino || '—'} → ${dados.origem || '—'}`}
            trechos={trechosVolta}
            cias={cias}
            onNovaCia={adicionarCiaNaLista}
            aeroportos={aeroportos}
            onNovoAeroporto={adicionarAeroportoNaLista}
            cidades={cidades}
            onNovaCidade={adicionarCidadeNaLista}
            onAlterarTrecho={hVolta.alterarTrecho}
            onAdicionarTrecho={hVolta.adicionarTrecho}
            onRemoverTrecho={hVolta.removerTrecho}
            onAlterarOpcao={hVolta.alterarOpcao}
            onAdicionarOpcao={hVolta.adicionarOpcao}
            onRemoverOpcao={hVolta.removerOpcao}
            onEscolherOpcao={hVolta.escolherOpcao}
          />
        ))}

      <h3 className="titulo-etapa">3. Fechamento</h3>

      <section className="bloco">
        <div className="form-grid">
          <label>
            Valor da passagem na internet
            <input
              type="number"
              step="0.01"
              name="valor_internet"
              value={dados.valor_internet}
              onChange={handleChange}
            />
          </label>
          <label>
            Preço de venda por passageiro
            <input
              type="number"
              step="0.01"
              name="preco_venda_unitario"
              value={dados.preco_venda_unitario}
              onChange={handleChange}
            />
            <small>
              {pagantes > 1
                ? `Multiplicado por ${pagantes} pagantes`
                : 'Valor cobrado de cada passageiro pagante'}
            </small>
          </label>
        </div>

        <p className="dica">
          {totalPassageiros} passageiro{totalPassageiros === 1 ? '' : 's'} no total
          {bebes > 0 && `, sendo ${bebes} bebê${bebes === 1 ? '' : 's'} que não paga${bebes === 1 ? '' : 'm'} passagem`}
          .
        </p>

        <div className="resumo-financeiro">
          <div className="resumo-item">
            <span>Custo por passageiro</span>
            <strong>{temEscolha ? formatarMoeda(custoUnitario) : '—'}</strong>
          </div>
          <div className="resumo-item">
            <span>Custo total ({pagantes}x)</span>
            <strong>{custoTotal !== null ? formatarMoeda(custoTotal) : '—'}</strong>
          </div>
          <div className="resumo-item">
            <span>Venda total ({pagantes}x)</span>
            <strong>{precoVenda !== null ? formatarMoeda(precoVenda) : '—'}</strong>
          </div>
          <div className={`resumo-item ${lucro !== null && lucro < 0 ? 'negativo' : 'positivo'}`}>
            <span>Lucro</span>
            <strong>{lucro !== null ? formatarMoeda(lucro) : '—'}</strong>
          </div>
        </div>

        {economia !== null && economia > 0 && (
          <p className="faixa-economia">
            Economia do cliente: {formatarMoeda(economia)} ({economiaPct}% abaixo da internet)
          </p>
        )}

        {lucro !== null && lucro < 0 && (
          <p className="form-erro">Atenção: o preço de venda está abaixo do custo total.</p>
        )}
      </section>

      <label className="campo-largo">
        Observações
        <textarea name="observacoes" value={dados.observacoes} onChange={handleChange} rows={3} />
      </label>

      </div>

      <div style={{ display: aba === 'voo' ? 'block' : 'none' }}>
        <AbaDadosVoo
          trechosIda={trechosIda}
          trechosVolta={trechosVolta}
          idaEVolta={idaEVolta}
          onAlterarOpcao={alterarOpcaoPorSentido}
        />

        <section className="bloco">
          <h3>Incluído na tarifa</h3>
          <p className="dica">Escolha o que acompanha a passagem nesta cotação.</p>

          <SeletorBusca
            valor=""
            opcoes={catalogoItens
              .filter((c) => !itens.some((i) => i.item_id === c.id))
              .map((c) => ({ valor: c.id, rotulo: c.titulo, sub: c.descricao }))}
            onSelecionar={adicionarItem}
            placeholder="Adicionar item incluído..."
          />

          <div className="itens-escolhidos">
            {itens.map((i) => {
              const doCatalogo = catalogoItens.find((c) => c.id === i.item_id);
              if (!doCatalogo) return null;

              return (
                <div className="item-escolhido" key={i.item_id}>
                  <div>
                    <strong>{doCatalogo.titulo}</strong>
                    {doCatalogo.descricao && <small>{doCatalogo.descricao}</small>}
                  </div>

                  <div className="item-escolhido-acoes">
                    {Boolean(doCatalogo.tem_quantidade) && (
                      <input
                        type="number"
                        min="1"
                        value={i.quantidade}
                        onChange={(e) => alterarQuantidade(i.item_id, Number(e.target.value))}
                      />
                    )}
                    <button type="button" className="btn-remover" onClick={() => removerItem(i.item_id)}>
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}

            {itens.length === 0 && (
              <p className="mensagem-vazia">Nenhum item incluído ainda.</p>
            )}
          </div>
        </section>
      </div>

      <div style={{ display: aba === 'orcamento' ? 'block' : 'none' }}>
        {aba === 'orcamento' && (
          <AbaOrcamento
            cotacao={montarCotacaoParaPrevia()}
            config={config}
            aeroportos={aeroportos}
            pronta={vooPreenchido}
            motivo={motivoOrcamento}
          />
        )}
      </div>

      <div className="form-acoes">
        <button type="button" className="btn btn-secundario" onClick={onCancelar}>
          Cancelar
        </button>
        <button
          type="button"
          className="btn btn-secundario"
          onClick={() => enviar(true)}
          disabled={salvando}
        >
          Salvar rascunho
        </button>
        <button type="submit" className="btn btn-primario" disabled={salvando}>
          {salvando ? 'Salvando...' : 'Salvar cotação'}
        </button>
      </div>
    </form>
  );
}
