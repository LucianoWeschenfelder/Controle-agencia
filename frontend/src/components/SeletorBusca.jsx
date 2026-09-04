import { useState, useRef, useEffect } from 'react';

/*
 * Campo de seleção com busca. Recebe as opções no formato
 * { valor, rotulo, sub } e filtra conforme o usuário digita.
 * Se onCriar for passado, mostra a opção de cadastrar o que foi digitado.
 */
export default function SeletorBusca({
  valor, opcoes, onSelecionar, placeholder = 'Buscar...', onCriar, textoCriar = 'Cadastrar',
  permitirLimpar = false,
}) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState('');
  const container = useRef(null);

  // Fecha a lista ao clicar fora do componente
  useEffect(() => {
    function aoClicarFora(e) {
      if (container.current && !container.current.contains(e.target)) {
        setAberto(false);
        setBusca('');
      }
    }

    document.addEventListener('mousedown', aoClicarFora);
    return () => document.removeEventListener('mousedown', aoClicarFora);
  }, []);

  const selecionada = opcoes.find((o) => o.valor === valor);
  const termo = busca.trim().toLowerCase();

  const filtradas = termo
    ? opcoes.filter(
        (o) =>
          o.rotulo.toLowerCase().includes(termo) ||
          String(o.valor).toLowerCase().includes(termo) ||
          (o.sub || '').toLowerCase().includes(termo)
      )
    : opcoes;

  function escolher(opcao) {
    onSelecionar(opcao.valor);
    setAberto(false);
    setBusca('');
  }

  return (
    <div className="seletor-busca" ref={container}>
      <button
        type="button"
        className={`seletor-busca-campo ${!selecionada && !valor ? 'vazio' : ''}`}
        onClick={() => setAberto(!aberto)}
      >
        <span>{selecionada ? selecionada.rotulo : valor || placeholder}</span>
        <span className="seta-baixo">▾</span>
      </button>

      {aberto && (
        <div className="seletor-busca-lista">
          <input
            autoFocus
            className="seletor-busca-input"
            placeholder="Digite para filtrar..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />

          <div className="seletor-busca-opcoes">
            {permitirLimpar && valor !== '' && valor != null && (
              <button
                type="button"
                className="seletor-busca-opcao limpar"
                onClick={() => escolher({ valor: '' })}
              >
                Limpar seleção
              </button>
            )}

            {filtradas.map((opcao) => (
              <button
                key={opcao.valor}
                type="button"
                className={`seletor-busca-opcao ${opcao.valor === valor ? 'ativa' : ''}`}
                onClick={() => escolher(opcao)}
              >
                <span>{opcao.rotulo}</span>
                {opcao.sub && <small>{opcao.sub}</small>}
              </button>
            ))}

            {filtradas.length === 0 && (
              <p className="seletor-busca-vazio">Nada encontrado.</p>
            )}
          </div>

          {onCriar && (
            <button
              type="button"
              className="seletor-busca-criar"
              disabled={!busca.trim()}
              title={busca.trim() ? '' : 'Digite o nome acima para cadastrar'}
              onClick={() => {
                onCriar(busca.trim());
                setAberto(false);
                setBusca('');
              }}
            >
              + {textoCriar}
              {busca.trim() ? ` "${busca.trim()}"` : ' (digite o nome acima)'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
