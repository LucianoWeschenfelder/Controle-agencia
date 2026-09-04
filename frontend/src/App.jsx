import { useState } from 'react';
import Home from './pages/Home';
import CadastrarCliente from './pages/CadastrarCliente';
import ConsultarClientes from './pages/ConsultarClientes';
import Cotacoes from './pages/Cotacoes';
import Configuracoes from './pages/Configuracoes';
import Viagens from './pages/Viagens';
import Fornecedores from './pages/Fornecedores';
import EmConstrucao from './pages/EmConstrucao';
import './App.css';

const TITULOS = {
  home: 'Controle da agência',
  'cadastrar-cliente': 'Cadastrar clientes',
  'consultar-clientes': 'Consultar cadastros',
  cotacoes: 'Cotações',
  ajustes: 'Ajustes',
  fornecedores: 'Fornecedores',
  viagens: 'Administrar viagens',
};

export default function App() {
  const [tela, setTela] = useState('home');

  function renderizarTela() {
    switch (tela) {
      case 'cadastrar-cliente':
        return <CadastrarCliente onVoltar={() => setTela('home')} />;

      case 'consultar-clientes':
        return <ConsultarClientes />;

      case 'cotacoes':
        return <Cotacoes />;

      case 'ajustes':
        return <Configuracoes />;

      case 'fornecedores':
        return <Fornecedores />;

      case 'viagens':
        return <Viagens />;

      default:
        return <Home onNavegar={setTela} />;
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-conteudo">
          <div>
            <h1>Agência de Viagens</h1>
            <p className="subtitulo">{TITULOS[tela]}</p>
          </div>

          <div className="app-header-acoes">
            {tela !== 'home' && (
              <button className="btn btn-voltar" onClick={() => setTela('home')}>
                ← Voltar ao início
              </button>
            )}

            <button
              className={`btn btn-voltar ${tela === 'ajustes' ? 'ativo' : ''}`}
              onClick={() => setTela(tela === 'ajustes' ? 'home' : 'ajustes')}
              title="Ajustes do orçamento"
            >
              ⚙️ Ajustes
            </button>
          </div>
        </div>
      </header>

      <main className="app-main">{renderizarTela()}</main>

      <footer className="app-footer">
        <p>By Luciano Weschenfelder</p>
      </footer>
    </div>
  );
}
