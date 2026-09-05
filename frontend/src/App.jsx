import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import Home from './pages/Home';
import CadastrarCliente from './pages/CadastrarCliente';
import ConsultarClientes from './pages/ConsultarClientes';
import Cotacoes from './pages/Cotacoes';
import Configuracoes from './pages/Configuracoes';
import Viagens from './pages/Viagens';
import Fornecedores from './pages/Fornecedores';
import './App.css';

// Cada tela tem seu endereço, então o título vem do caminho atual
const TITULOS = {
  '/': 'Controle da agência',
  '/clientes/novo': 'Cadastrar clientes',
  '/clientes': 'Consultar cadastros',
  '/cotacoes': 'Cotações',
  '/ajustes': 'Ajustes',
  '/fornecedores': 'Fornecedores',
  '/viagens': 'Administrar viagens',
};

// Pega o título do caminho mais específico que casar
function tituloDaRota(caminho) {
  const chave = Object.keys(TITULOS)
    .filter((c) => c !== '/' && caminho.startsWith(c))
    .sort((a, b) => b.length - a.length)[0];

  return TITULOS[chave] || TITULOS['/'];
}

export default function App() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const naHome = pathname === '/';
  const nosAjustes = pathname.startsWith('/ajustes');

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-conteudo">
          <Link to="/" className="app-marca">
            <img src="/selo.jpg" alt="Voya Co" />
            <div>
              <h1>Voya Co</h1>
              <p className="subtitulo">{tituloDaRota(pathname)}</p>
            </div>
          </Link>

          <div className="app-header-acoes">
            {!naHome && (
              <button className="btn btn-voltar" onClick={() => navigate(-1)}>
                ← Voltar
              </button>
            )}

            <Link
              to={nosAjustes ? '/' : '/ajustes'}
              className={`btn btn-voltar ${nosAjustes ? 'ativo' : ''}`}
              title="Ajustes do orçamento"
            >
              ⚙️ Ajustes
            </Link>
          </div>
        </div>
      </header>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/clientes" element={<ConsultarClientes />} />
          <Route path="/clientes/novo" element={<CadastrarCliente />} />
          <Route path="/cotacoes/*" element={<Cotacoes />} />
          <Route path="/viagens/*" element={<Viagens />} />
          <Route path="/fornecedores" element={<Fornecedores />} />
          <Route path="/ajustes" element={<Configuracoes />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>

      <footer className="app-footer">
        <p>By Luciano Weschenfelder</p>
      </footer>
    </div>
  );
}
