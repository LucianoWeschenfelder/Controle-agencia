import { useState, useEffect } from 'react';
import { buscarConfiguracoes, salvarConfiguracoes } from '../api/configuracoes';

const CAMPOS = [
  { chave: 'cabecalho_imagem', rotulo: 'Arte do cabeçalho', tipo: 'imagem',
    dica: 'Ocupa a faixa da esquerda no topo do orçamento. Os dados do cliente ficam ao lado.' },
  { chave: 'agencia_nome', rotulo: 'Nome da agência', tipo: 'texto' },
  { chave: 'agencia_slogan', rotulo: 'Slogan', tipo: 'texto' },
  { chave: 'agencia_contato', rotulo: 'Contato (telefone, WhatsApp, e-mail)', tipo: 'texto' },
  { chave: 'taxa_cartao', rotulo: 'Taxa do cartão', tipo: 'taxa',
    dica: 'Em fração decimal, como aparece na maquininha (ex: 0,096495). Cada quantidade de parcelas tem a sua taxa, então informe a do número de parcelas abaixo.' },
  { chave: 'parcelas_cartao', rotulo: 'Número de parcelas no cartão', tipo: 'texto' },
  { chave: 'mensagem_whatsapp', rotulo: 'Mensagem do WhatsApp', tipo: 'lista',
    dica: 'Marcadores disponíveis: {cliente} {origem} {destino} {ida} {volta} {valor} {agencia}' },
  {
    chave: 'formas_pagamento',
    rotulo: 'Formas de pagamento',
    tipo: 'lista',
    dica: 'Um item por linha.',
  },
  {
    chave: 'por_que_escolher',
    rotulo: 'Por que comprar conosco',
    tipo: 'lista',
    dica: 'Um item por linha.',
  },
  {
    chave: 'rodape_aviso',
    rotulo: 'Aviso do rodapé',
    tipo: 'lista',
    dica: 'Texto que aparece no fim do orçamento.',
  },
];

export default function Configuracoes() {
  const [config, setConfig] = useState({});
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');

  useEffect(() => {
    buscarConfiguracoes()
      .then(setConfig)
      .catch(() => setErro('Não foi possível carregar os ajustes. O backend está rodando?'))
      .finally(() => setCarregando(false));
  }, []);

  // Converte o arquivo escolhido em data URI, para ficar embutido no documento
  function handleArquivo(chave, arquivo) {
    if (!arquivo) return;

    const leitor = new FileReader();
    leitor.onload = () => handleChange(chave, leitor.result);
    leitor.readAsDataURL(arquivo);
  }

  function handleChange(chave, valor) {
    setConfig((prev) => ({ ...prev, [chave]: valor }));
    setMensagem('');
  }

  async function salvar() {
    setSalvando(true);
    setErro('');
    try {
      const atualizado = await salvarConfiguracoes(config);
      setConfig(atualizado);
      setMensagem('Ajustes salvos.');
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  }

  // Mostra o efeito da taxa sobre um valor redondo, para conferência
  function exemploTaxa() {
    const taxa = Number(String(config.taxa_cartao ?? '').replace(',', '.'));
    const parcelas = Number(config.parcelas_cartao) || 1;

    if (!taxa || taxa <= 0) return 'Informe a taxa para ver o exemplo.';

    const base = 4000;
    const total = base * (1 + taxa);
    const moeda = (v) =>
      v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    return `Equivale a ${(taxa * 100).toFixed(4).replace('.', ',')}%. ` +
      `Uma venda de ${moeda(base)} fica em ${moeda(total)}, ` +
      `em ${parcelas}x de ${moeda(total / parcelas)}.`;
  }

  if (carregando) {
    return <p className="mensagem-vazia">Carregando ajustes...</p>;
  }

  return (
    <div className="pagina">
      <div className="cotacao-form">
        <h2>Ajustes do orçamento</h2>
        <p className="dica">
          Estes textos aparecem no PDF e no Word enviados ao cliente.
        </p>

        {erro && <p className="form-erro">{erro}</p>}
        {mensagem && <p className="form-sucesso">{mensagem}</p>}

        {CAMPOS.map((campo) => (
          <label key={campo.chave} className="campo-config">
            {campo.rotulo}
            {campo.tipo === 'taxa' ? (
              <>
                <input
                  value={config[campo.chave] || ''}
                  onChange={(e) => handleChange(campo.chave, e.target.value)}
                  placeholder="0,096495"
                />
                <small className="previa-taxa">{exemploTaxa()}</small>
              </>
            ) : campo.tipo === 'imagem' ? (
              <div className="campo-imagem">
                {config[campo.chave] && (
                  <img src={config[campo.chave]} alt="Arte do cabeçalho" />
                )}
                <div className="campo-imagem-acoes">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleArquivo(campo.chave, e.target.files[0])}
                  />
                  {config[campo.chave] && (
                    <button
                      type="button"
                      className="btn-mini cancelar"
                      onClick={() => handleChange(campo.chave, '')}
                    >
                      Remover
                    </button>
                  )}
                </div>
              </div>
            ) : campo.tipo === 'texto' ? (
              <input
                value={config[campo.chave] || ''}
                onChange={(e) => handleChange(campo.chave, e.target.value)}
              />
            ) : (
              <textarea
                rows={4}
                value={config[campo.chave] || ''}
                onChange={(e) => handleChange(campo.chave, e.target.value)}
              />
            )}
            {campo.dica && <small>{campo.dica}</small>}
          </label>
        ))}

        <div className="form-acoes">
          <button className="btn btn-primario" onClick={salvar} disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar ajustes'}
          </button>
        </div>
      </div>
    </div>
  );
}
