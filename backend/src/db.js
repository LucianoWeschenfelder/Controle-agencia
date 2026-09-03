import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CABECALHO_PADRAO } from './assets/cabecalho-padrao.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'agencia.db');

export const db = new DatabaseSync(dbPath);

db.exec('PRAGMA journal_mode = WAL;');

db.exec(`
  CREATE TABLE IF NOT EXISTS clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    documento TEXT,
    email TEXT,
    telefone TEXT,
    data_nascimento TEXT,
    endereco TEXT,
    observacoes TEXT,
    criado_em TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS cotacoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id INTEGER,
    origem TEXT,
    destino TEXT,
    tipo_viagem TEXT NOT NULL DEFAULT 'ida_volta',
    data_ida TEXT,
    data_volta TEXT,
    passageiros INTEGER NOT NULL DEFAULT 1,
    valor_internet REAL,
    preco_venda REAL,
    opcao_ida_id INTEGER,
    opcao_volta_id INTEGER,
    status TEXT NOT NULL DEFAULT 'elaboracao',
    data_envio TEXT,
    data_conclusao TEXT,
    bagagem_mao INTEGER NOT NULL DEFAULT 0,
    bagagem_despachada INTEGER NOT NULL DEFAULT 0,
    observacoes TEXT,
    criado_em TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Um trecho é uma perna da viagem (POA -> GRU). A ida pode ter vários.
db.exec(`
  CREATE TABLE IF NOT EXISTS cotacao_trechos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cotacao_id INTEGER NOT NULL,
    sentido TEXT NOT NULL,
    ordem INTEGER NOT NULL DEFAULT 0,
    origem TEXT,
    destino TEXT,
    data TEXT
  );
`);

// Cada trecho tem uma ou mais opções de companhia. Os dados do voo
// (horários, número) ficam aqui, porque variam de uma CIA para outra.
db.exec(`
  CREATE TABLE IF NOT EXISTS cotacao_opcoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cotacao_id INTEGER NOT NULL,
    trecho_id INTEGER NOT NULL,
    cia TEXT,
    classe TEXT,
    milhas REAL NOT NULL DEFAULT 0,
    valor_milheiro REAL NOT NULL DEFAULT 0,
    taxa REAL NOT NULL DEFAULT 0,
    bagagem REAL NOT NULL DEFAULT 0,
    hora_saida TEXT,
    hora_chegada TEXT,
    numero_voo TEXT,
    aeronave TEXT,
    duracao_min INTEGER,
    escolhida INTEGER NOT NULL DEFAULT 0
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS cidades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL UNIQUE
  );
`);

// O aeroporto guarda só a sigla e aponta para a cidade, para não repetir cidade
db.exec(`
  CREATE TABLE IF NOT EXISTS aeroportos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sigla TEXT NOT NULL UNIQUE,
    cidade_id INTEGER NOT NULL
  );
`);

// Itens que podem ser marcados como incluídos na tarifa de cada cotação
db.exec(`
  CREATE TABLE IF NOT EXISTS itens_tarifa (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo TEXT NOT NULL UNIQUE,
    descricao TEXT,
    tem_quantidade INTEGER NOT NULL DEFAULT 0
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS cotacao_itens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cotacao_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    quantidade INTEGER NOT NULL DEFAULT 1
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS cias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL UNIQUE,
    codigo TEXT
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS configuracoes (
    chave TEXT PRIMARY KEY,
    valor TEXT
  );
`);

/*
 * Migração: bancos criados por versões anteriores não têm as colunas novas.
 * CREATE TABLE IF NOT EXISTS não altera tabela já existente, então aqui
 * conferimos coluna por coluna e adicionamos o que estiver faltando.
 */
function colunasDe(tabela) {
  return db.prepare(`PRAGMA table_info(${tabela})`).all().map((c) => c.name);
}

function garantirColuna(tabela, coluna, definicao) {
  if (!colunasDe(tabela).includes(coluna)) {
    db.exec(`ALTER TABLE ${tabela} ADD COLUMN ${coluna} ${definicao}`);
    console.log(`[migração] coluna ${tabela}.${coluna} adicionada`);
  }
}

garantirColuna('cotacoes', 'tipo_viagem', "TEXT NOT NULL DEFAULT 'ida_volta'");
garantirColuna('cotacoes', 'passageiros', 'INTEGER NOT NULL DEFAULT 1');
garantirColuna('cotacoes', 'opcao_ida_id', 'INTEGER');
garantirColuna('cotacoes', 'opcao_volta_id', 'INTEGER');

garantirColuna('cotacao_opcoes', 'cia', 'TEXT');
garantirColuna('cotacao_opcoes', 'classe', 'TEXT');
garantirColuna('cotacao_opcoes', 'trecho_id', 'INTEGER NOT NULL DEFAULT 0');
garantirColuna('cotacao_opcoes', 'hora_saida', 'TEXT');
garantirColuna('cotacao_opcoes', 'hora_chegada', 'TEXT');
garantirColuna('cotacao_opcoes', 'numero_voo', 'TEXT');
garantirColuna('cotacao_opcoes', 'escolhida', 'INTEGER NOT NULL DEFAULT 0');

// Aeroportos da versão anterior guardavam a cidade como texto.
// Aqui cada cidade vira registro próprio e o aeroporto passa a apontar para ela.
const colunasAeroporto = colunasDe('aeroportos');

if (colunasAeroporto.includes('cidade') && !colunasAeroporto.includes('cidade_id')) {
  db.exec('ALTER TABLE aeroportos ADD COLUMN cidade_id INTEGER NOT NULL DEFAULT 0');

  const antigos = db.prepare('SELECT id, sigla, cidade FROM aeroportos').all();
  const inserirCidade = db.prepare('INSERT OR IGNORE INTO cidades (nome) VALUES (?)');
  const buscarCidade = db.prepare('SELECT id FROM cidades WHERE nome = ?');
  const atualizar = db.prepare('UPDATE aeroportos SET cidade_id = ? WHERE id = ?');

  for (const a of antigos) {
    inserirCidade.run(a.cidade);
    atualizar.run(buscarCidade.get(a.cidade).id, a.id);
  }

  console.log('[migração] aeroportos ligados à tabela de cidades');
}

garantirColuna('cotacoes', 'data_conclusao', 'TEXT');
garantirColuna('cotacoes', 'bagagem_mao', 'INTEGER NOT NULL DEFAULT 0');
garantirColuna('cotacoes', 'bagagem_despachada', 'INTEGER NOT NULL DEFAULT 0');

garantirColuna('cotacao_opcoes', 'duracao_min', 'INTEGER');
garantirColuna('cotacao_opcoes', 'aeronave', 'TEXT');

garantirColuna('cotacao_trechos', 'origem', 'TEXT');
garantirColuna('cotacao_trechos', 'destino', 'TEXT');
garantirColuna('cotacao_trechos', 'data', 'TEXT');

// Companhias aéreas iniciais (só entram se a tabela estiver vazia)
const totalCias = db.prepare('SELECT COUNT(*) AS total FROM cias').get().total;

if (totalCias === 0) {
  const inserirCia = db.prepare('INSERT OR IGNORE INTO cias (nome, codigo) VALUES (?, ?)');
  const iniciais = [
    ['LATAM', 'LA'], ['GOL', 'G3'], ['Azul', 'AD'], ['TAP', 'TP'],
    ['Ibéria', 'IB'], ['Air France', 'AF'], ['KLM', 'KL'],
    ['American Airlines', 'AA'], ['United', 'UA'], ['Copa', 'CM'],
  ];
  for (const [nome, codigo] of iniciais) inserirCia.run(nome, codigo);
}

// Cidades e aeroportos iniciais
const totalAeroportos = db.prepare('SELECT COUNT(*) AS total FROM aeroportos').get().total;

if (totalAeroportos === 0) {
  const inserirCidade = db.prepare('INSERT OR IGNORE INTO cidades (nome) VALUES (?)');
  const buscarCidade = db.prepare('SELECT id FROM cidades WHERE nome = ?');
  const inserirAeroporto = db.prepare(
    'INSERT OR IGNORE INTO aeroportos (sigla, cidade_id) VALUES (?, ?)'
  );

  const iniciais = [
    ['GRU', 'São Paulo'], ['CGH', 'São Paulo'], ['GIG', 'Rio de Janeiro'],
    ['SDU', 'Rio de Janeiro'], ['POA', 'Porto Alegre'], ['BSB', 'Brasília'],
    ['CNF', 'Belo Horizonte'], ['SSA', 'Salvador'], ['REC', 'Recife'],
    ['FOR', 'Fortaleza'], ['MAO', 'Manaus'], ['CWB', 'Curitiba'],
    ['FLN', 'Florianópolis'], ['LIS', 'Lisboa'], ['OPO', 'Porto'],
    ['MAD', 'Madri'], ['BCN', 'Barcelona'], ['FCO', 'Roma'],
    ['CDG', 'Paris'], ['LHR', 'Londres'], ['AMS', 'Amsterdã'],
    ['MIA', 'Miami'], ['JFK', 'Nova York'], ['MCO', 'Orlando'],
    ['EZE', 'Buenos Aires'], ['SCL', 'Santiago'], ['PTY', 'Cidade do Panamá'],
  ];
  for (const [sigla, cidade] of iniciais) {
    inserirCidade.run(cidade);
    inserirAeroporto.run(sigla, buscarCidade.get(cidade).id);
  }
}

// Itens de tarifa iniciais
const totalItens = db.prepare('SELECT COUNT(*) AS total FROM itens_tarifa').get().total;

if (totalItens === 0) {
  const inserirItem = db.prepare(
    'INSERT OR IGNORE INTO itens_tarifa (titulo, descricao, tem_quantidade) VALUES (?, ?, ?)'
  );
  const itens = [
    ['Item Pessoal', 'Bolsa / Mochila pequena', 0],
    ['Passagens Aéreas & Taxas', 'Tarifas de embarque incluídas', 0],
    ['Remarcação', 'Com taxa + diferença de preço', 0],
    ['Bagagem de mão', 'Até 10 kg por passageiro', 1],
    ['Bagagem despachada', 'Até 23 kg por passageiro', 1],
    ['Marcação de assento', 'Assento padrão incluído', 0],
    ['Cancelamento', 'Com retenção de taxa', 0],
  ];
  for (const [titulo, descricao, temQtd] of itens) inserirItem.run(titulo, descricao, temQtd);
}

// Textos que aparecem no orçamento enviado ao cliente
const PADROES = {
  agencia_nome: 'Milhas 4U',
  agencia_slogan: 'Agência de viagem',
  agencia_contato: '',
  formas_pagamento: ['À vista via PIX', 'Parcelado em até 10x sem juros'].join('\n'),
  por_que_escolher: [
    'Assistência Pós Venda',
    'Contato facilitado via WhatsApp, para sanar suas dúvidas',
    'Realização do seu Check-in',
  ].join('\n'),
  cabecalho_imagem: CABECALHO_PADRAO,
  taxa_cartao: '8.59',
  parcelas_cartao: '4',
  rodape_aviso:
    'Isto é apenas uma cotação. Os preços estão sujeitos a alteração a qualquer momento pela companhia. Não fazemos pré-reserva sem aprovação.',
};

const inserirPadrao = db.prepare(
  'INSERT OR IGNORE INTO configuracoes (chave, valor) VALUES (?, ?)'
);

for (const [chave, valor] of Object.entries(PADROES)) {
  inserirPadrao.run(chave, valor);
}
