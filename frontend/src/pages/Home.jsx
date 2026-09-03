const OPCOES = [
  {
    id: 'cadastrar-cliente',
    titulo: 'Cadastrar clientes',
    descricao: 'Incluir um novo cliente na base da agência.',
    icone: '👤',
  },
  {
    id: 'consultar-clientes',
    titulo: 'Consultar cadastros',
    descricao: 'Buscar, editar e excluir clientes já cadastrados.',
    icone: '🔍',
  },
  {
    id: 'cotacoes',
    titulo: 'Cotações',
    descricao: 'Montar e acompanhar orçamentos de viagem.',
    icone: '💰',
  },
  {
    id: 'ajustes',
    titulo: 'Ajustes',
    descricao: 'Textos que aparecem no orçamento enviado ao cliente.',
    icone: '⚙️',
  },
  {
    id: 'viagens',
    titulo: 'Administrar viagens',
    descricao: 'Acompanhar viagens confirmadas, datas e check.',
    icone: '✈️',
  },
];

export default function Home({ onNavegar }) {
  return (
    <div className="home">
      <div className="home-intro">
        <h2>O que você quer fazer?</h2>
        <p>Escolha uma das opções abaixo para começar.</p>
      </div>

      <div className="menu-grid">
        {OPCOES.map((opcao) => (
          <button
            key={opcao.id}
            className="menu-card"
            onClick={() => onNavegar(opcao.id)}
          >
            <span className="menu-card-icone">{opcao.icone}</span>
            <span className="menu-card-titulo">{opcao.titulo}</span>
            <span className="menu-card-descricao">{opcao.descricao}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
