import { Link } from 'react-router-dom';

const OPCOES = [
  {
    id: '/clientes/novo',
    titulo: 'Cadastrar clientes',
    descricao: 'Incluir um novo cliente na base da agência.',
    icone: '👤',
  },
  {
    id: '/clientes',
    titulo: 'Consultar cadastros',
    descricao: 'Buscar, editar e excluir clientes já cadastrados.',
    icone: '🔍',
  },
  {
    id: '/cotacoes',
    titulo: 'Cotações',
    descricao: 'Montar e acompanhar orçamentos de viagem.',
    icone: '💰',
  },
  {
    id: '/fornecedores',
    titulo: 'Fornecedores',
    descricao: 'Cadastrar quem fornece as milhas, com WhatsApp.',
    icone: '🤝',
  },
  {
    id: '/viagens',
    titulo: 'Administrar viagens',
    descricao: 'Acompanhar viagens confirmadas, datas e check.',
    icone: '✈️',
  },
];

export default function Home() {
  return (
    <div className="home">
      <div className="home-intro">
        <h2>O que você quer fazer?</h2>
        <p>Escolha uma das opções abaixo para começar.</p>
      </div>

      <div className="menu-grid">
        {OPCOES.map((opcao) => (
          <Link key={opcao.id} className="menu-card" to={opcao.id}>
            <span className="menu-card-icone">{opcao.icone}</span>
            <span className="menu-card-titulo">{opcao.titulo}</span>
            <span className="menu-card-descricao">{opcao.descricao}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
