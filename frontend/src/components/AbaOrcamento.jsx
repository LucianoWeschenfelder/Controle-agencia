import { useMemo } from 'react';
import { gerarHtmlOrcamento, gerarPdf, gerarWord } from '../utils/orcamento';

export default function AbaOrcamento({ cotacao, config, aeroportos, pronta, motivo }) {
  const html = useMemo(
    () => (pronta ? gerarHtmlOrcamento(cotacao, config, aeroportos) : ''),
    [cotacao, config, aeroportos, pronta]
  );

  if (!pronta) {
    return (
      <div className="bloco">
        <p className="mensagem-vazia">{motivo}</p>
      </div>
    );
  }

  return (
    <>
      <div className="barra-orcamento">
        <p className="dica-aba">
          Assim o cliente vai receber. Salve a cotação para gravar as alterações.
        </p>
        <div className="barra-orcamento-acoes">
          <button
            type="button"
            className="btn btn-secundario"
            onClick={() => gerarPdf(cotacao, config, aeroportos)}
          >
            Gerar PDF
          </button>
          <button
            type="button"
            className="btn btn-secundario"
            onClick={() => gerarWord(cotacao, config, aeroportos)}
          >
            Baixar Word
          </button>
        </div>
      </div>

      <div className="previa-orcamento">
        <iframe title="Prévia do orçamento" srcDoc={html} />
      </div>
    </>
  );
}
