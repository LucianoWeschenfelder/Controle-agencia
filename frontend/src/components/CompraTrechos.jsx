import { useState } from 'react';
import SeletorBusca from './SeletorBusca';
import { definirFornecedor } from '../api/cotacoes';
import { abrirWhatsApp } from '../utils/whatsapp';

/*
 * Cada trecho pode ter sido comprado de um jeito: de um fornecedor, ou
 * pela própria agência (com milhas próprias ou direto na companhia).
 * Por isso a escolha é por trecho, com um atalho para aplicar a todos.
 */
export default function CompraTrechos({ cotacao, fornecedores, onAtualizar }) {
  // Junta ida e volta numa lista só, guardando de onde cada trecho veio
  const trechos = [
    ...cotacao.trechos_ida.map((t) => ({ ...t, sentido: 'ida' })),
    ...cotacao.trechos_volta.map((t) => ({ ...t, sentido: 'volta' })),
  ];

  const jaDefinido = trechos.length > 0 && trechos.every((t) => t.origem_milhas);

  const [editando, setEditando] = useState(false);
  const [expandido, setExpandido] = useState(false);
  const [compras, setCompras] = useState(() =>
    trechos.map((t) => ({
      sentido: t.sentido,
      ordem: t.ordem,
      origem_milhas: t.origem_milhas || '',
      fornecedor_id: t.fornecedor_id || '',
    }))
  );
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  function alterar(i, campo, valor) {
    setCompras((prev) => prev.map((c, j) => (j === i ? { ...c, [campo]: valor } : c)));
  }

  // Copia a escolha do primeiro trecho para os demais
  function aplicarATodos() {
    const primeiro = compras[0];
    if (!primeiro?.origem_milhas) {
      setErro('Preencha o primeiro trecho antes de aplicar a todos.');
      return;
    }
    setCompras((prev) => prev.map(() => ({ ...prev[0] })));
    setErro('');
  }

  async function salvar() {
    if (compras.some((c) => !c.origem_milhas)) {
      return setErro('Informe a origem de todos os trechos.');
    }
    if (compras.some((c) => c.origem_milhas === 'fornecedor' && !c.fornecedor_id)) {
      return setErro('Escolha o fornecedor dos trechos comprados de terceiros.');
    }

    setSalvando(true);
    setErro('');
    try {
      await definirFornecedor(cotacao.id, {
        compras: compras.map((c) => ({
          ...c,
          fornecedor_id: c.origem_milhas === 'fornecedor' ? Number(c.fornecedor_id) : null,
        })),
      });
      setEditando(false);
      onAtualizar();
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  }

  if (!trechos.length) return null;

  if (!editando) {
    // Resumo curto: quando todos vieram do mesmo lugar, mostra só ele
    const origens = new Set(
      trechos.map((t) =>
        t.origem_milhas === 'propria' ? 'Compra própria' : t.fornecedor?.nome || 'não informado'
      )
    );

    const resumo = !jaDefinido
      ? 'compra não informada'
      : origens.size === 1
        ? [...origens][0]
        : `${origens.size} origens diferentes`;

    return (
      <div className="compra-trechos definida">
        <button className="compra-resumo" onClick={() => setExpandido(!expandido)}>
          <span>Comprado de</span>
          <strong className={jaDefinido ? '' : 'pendente'}>{resumo}</strong>
          <span className="seta-baixo">{expandido ? '▴' : '▾'}</span>
        </button>

        {expandido && (
        <div className="compra-trechos-lista">
          {trechos.map((t) => (
            <div className="compra-linha" key={`${t.sentido}-${t.ordem}`}>
              <span className="compra-rota">
                {t.sentido === 'ida' ? 'Ida' : 'Volta'} · {t.origem} → {t.destino}
              </span>
              <strong>
                {t.origem_milhas === 'propria'
                  ? 'Compra própria'
                  : t.fornecedor?.nome || 'fornecedor não encontrado'}
              </strong>
              {t.fornecedor?.whatsapp && (
                <button
                  className="btn-mini"
                  onClick={() => abrirWhatsApp(t.fornecedor.whatsapp, '')}
                >
                  WhatsApp
                </button>
              )}
            </div>
          ))}
        </div>
        )}

        {expandido && (
          <button className="btn-link" onClick={() => setEditando(true)}>
            alterar
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="compra-trechos">
      <div className="compra-trechos-topo">
        <p className="compra-titulo">Como cada trecho foi comprado?</p>
        {compras.length > 1 && (
          <button className="btn-mini" onClick={aplicarATodos}>
            Aplicar o 1º a todos
          </button>
        )}
      </div>

      {trechos.map((t, i) => (
        <div className="compra-editar" key={`${t.sentido}-${t.ordem}`}>
          <span className="compra-rota">
            {t.sentido === 'ida' ? 'Ida' : 'Volta'} · {t.origem} → {t.destino}
            {t.opcao_escolhida?.cia && ` · ${t.opcao_escolhida.cia}`}
          </span>

          <div className="compra-opcoes">
            <label>
              <input
                type="radio"
                checked={compras[i]?.origem_milhas === 'propria'}
                onChange={() => alterar(i, 'origem_milhas', 'propria')}
              />
              Compra própria
            </label>

            <label>
              <input
                type="radio"
                checked={compras[i]?.origem_milhas === 'fornecedor'}
                onChange={() => alterar(i, 'origem_milhas', 'fornecedor')}
              />
              Fornecedor
            </label>

            {compras[i]?.origem_milhas === 'fornecedor' && (
              <div className="compra-fornecedor">
                <SeletorBusca
                  valor={compras[i].fornecedor_id}
                  opcoes={fornecedores.map((f) => ({
                    valor: f.id,
                    rotulo: f.nome,
                    sub: f.whatsapp || '',
                  }))}
                  onSelecionar={(v) => alterar(i, 'fornecedor_id', v)}
                  placeholder="Buscar fornecedor..."
                />
              </div>
            )}
          </div>
        </div>
      ))}

      <p className="dica">
        "Compra própria" cobre milhas suas ou compra direto na companhia.
      </p>

      {erro && <p className="form-erro">{erro}</p>}

      <div className="origem-milhas-acoes">
        {jaDefinido && (
          <button className="btn-mini cancelar" onClick={() => setEditando(false)}>
            Cancelar
          </button>
        )}
        <button className="btn-mini destaque" onClick={salvar} disabled={salvando}>
          {salvando ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </div>
  );
}
