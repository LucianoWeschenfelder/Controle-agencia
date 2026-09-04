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
    adultos INTEGER NOT NULL DEFAULT 1,
    criancas INTEGER NOT NULL DEFAULT 0,
    bebes INTEGER NOT NULL DEFAULT 0,
    preco_venda_unitario REAL,
    valor_internet REAL,
    preco_venda REAL,
    opcao_ida_id INTEGER,
    opcao_volta_id INTEGER,
    status TEXT NOT NULL DEFAULT 'elaboracao',
    data_envio TEXT,
    data_conclusao TEXT,
    data_venda TEXT,
    origem_milhas TEXT,
    fornecedor_id INTEGER,
    bagagem_mao INTEGER NOT NULL DEFAULT 0,
    bagagem_despachada INTEGER NOT NULL DEFAULT 0,
    observacoes TEXT,
    criado_em TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Um trecho é uma perna da viagem (POA -> GRU). A ida pode ter vários.
/*
 * Voos de uma opção. Um trecho comercial (POA -> REC) pode ser operado em
 * mais de um voo pela mesma companhia, com conexão vinculada no meio.
 */
db.exec(`
  CREATE TABLE IF NOT EXISTS cotacao_voos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cotacao_id INTEGER NOT NULL,
    opcao_id INTEGER NOT NULL,
    ordem INTEGER NOT NULL DEFAULT 0,
    origem TEXT,
    destino TEXT,
    data TEXT,
    hora_saida TEXT,
    hora_chegada TEXT,
    numero_voo TEXT,
    duracao_min INTEGER
  );
`);

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

/*
 * De onde veio cada trecho comprado. Guardado por sentido + ordem em vez de
 * pelo id do trecho, porque os trechos são recriados a cada salvamento da
 * cotação e o fornecedor é definido depois, na venda.
 */
db.exec(`
  CREATE TABLE IF NOT EXISTS cotacao_compras (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cotacao_id INTEGER NOT NULL,
    sentido TEXT NOT NULL,
    ordem INTEGER NOT NULL,
    origem_milhas TEXT,
    fornecedor_id INTEGER,
    UNIQUE (cotacao_id, sentido, ordem)
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

// Quem forneceu as milhas da passagem
db.exec(`
  CREATE TABLE IF NOT EXISTS fornecedores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL UNIQUE,
    whatsapp TEXT,
    observacoes TEXT
  );
`);

// Classes de voo, para o campo virar lista em vez de texto livre
db.exec(`
  CREATE TABLE IF NOT EXISTS classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL UNIQUE
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS cias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL UNIQUE,
    codigo TEXT,
    url_checkin TEXT
  );
`);

// Viagem nasce de uma cotação vendida; guarda só o que a cotação não tem
db.exec(`
  CREATE TABLE IF NOT EXISTS viagens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cotacao_id INTEGER NOT NULL UNIQUE,
    antecedencia_checkin INTEGER NOT NULL DEFAULT 24,
    checkin_ida INTEGER NOT NULL DEFAULT 0,
    checkin_ida_em TEXT,
    checkin_volta INTEGER NOT NULL DEFAULT 0,
    checkin_volta_em TEXT,
    localizador TEXT,
    observacoes TEXT,
    criado_em TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

/*
 * Cada check-in é feito separadamente: a ida com escala vinculada é um só,
 * mas escala não vinculada (companhias diferentes) e a volta são à parte.
 * A chave identifica a unidade, no formato "ida-0", "ida-1", "volta-0".
 */
db.exec(`
  CREATE TABLE IF NOT EXISTS viagem_checkins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    viagem_id INTEGER NOT NULL,
    chave TEXT NOT NULL,
    feito INTEGER NOT NULL DEFAULT 0,
    feito_em TEXT,
    UNIQUE (viagem_id, chave)
  );
`);

// Acompanhantes da viagem. O titular é o cliente da cotação e não entra aqui.
db.exec(`
  CREATE TABLE IF NOT EXISTS viagem_passageiros (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    viagem_id INTEGER NOT NULL,
    ordem INTEGER NOT NULL DEFAULT 0,
    nome TEXT NOT NULL,
    documento TEXT,
    data_nascimento TEXT
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

/*
 * IMPORTANTE: todas as colunas precisam ser garantidas ANTES das migrações
 * de dados abaixo, senão uma consulta que use coluna nova quebra em banco
 * criado por versão anterior.
 */
garantirColuna('cotacoes', 'tipo_viagem', "TEXT NOT NULL DEFAULT 'ida_volta'");
garantirColuna('cotacoes', 'passageiros', 'INTEGER NOT NULL DEFAULT 1');
garantirColuna('cotacoes', 'opcao_ida_id', 'INTEGER');
garantirColuna('cotacoes', 'opcao_volta_id', 'INTEGER');

garantirColuna('cotacoes', 'data_conclusao', 'TEXT');
garantirColuna('cotacoes', 'adultos', 'INTEGER NOT NULL DEFAULT 1');
garantirColuna('cotacoes', 'criancas', 'INTEGER NOT NULL DEFAULT 0');
garantirColuna('cotacoes', 'bebes', 'INTEGER NOT NULL DEFAULT 0');
garantirColuna('cotacoes', 'preco_venda_unitario', 'REAL');
garantirColuna('cotacoes', 'data_venda', 'TEXT');
garantirColuna('cotacoes', 'origem_milhas', 'TEXT');
garantirColuna('cotacoes', 'fornecedor_id', 'INTEGER');
garantirColuna('cotacoes', 'bagagem_mao', 'INTEGER NOT NULL DEFAULT 0');
garantirColuna('cotacoes', 'bagagem_despachada', 'INTEGER NOT NULL DEFAULT 0');

// Localizador por unidade de check-in: voo separado tem reserva própria
garantirColuna('viagem_checkins', 'localizador', 'TEXT');

// Cada companhia libera o check-in num prazo, então a antecedência é por bloco
garantirColuna('viagem_checkins', 'antecedencia', 'INTEGER');

// Endereço do check-in de cada companhia, para abrir direto pelo sistema
garantirColuna('cias', 'url_checkin', 'TEXT');

// Cada acompanhante precisa dizer se é adulto, criança ou bebê
garantirColuna('viagem_passageiros', 'tipo', "TEXT NOT NULL DEFAULT 'adulto'");

garantirColuna('cotacao_opcoes', 'cia', 'TEXT');
garantirColuna('cotacao_opcoes', 'classe', 'TEXT');
garantirColuna('cotacao_opcoes', 'trecho_id', 'INTEGER NOT NULL DEFAULT 0');
garantirColuna('cotacao_opcoes', 'hora_saida', 'TEXT');
garantirColuna('cotacao_opcoes', 'hora_chegada', 'TEXT');
garantirColuna('cotacao_opcoes', 'numero_voo', 'TEXT');
garantirColuna('cotacao_opcoes', 'escolhida', 'INTEGER NOT NULL DEFAULT 0');

/*
 * Os check-ins ficavam em duas colunas fixas (ida e volta). Agora cada
 * unidade tem a sua linha, então trazemos o que já estava marcado.
 */
const colunasViagem = colunasDe('viagens');

if (colunasViagem.includes('checkin_ida')) {
  const antigas = db.prepare('SELECT id, checkin_ida, checkin_ida_em, checkin_volta, checkin_volta_em FROM viagens').all();
  const inserir = db.prepare(
    'INSERT OR IGNORE INTO viagem_checkins (viagem_id, chave, feito, feito_em) VALUES (?, ?, ?, ?)'
  );

  // Conta só o que realmente entrou, para a migração não se repetir a cada partida
  let migrados = 0;
  for (const v of antigas) {
    if (v.checkin_ida) migrados += inserir.run(v.id, 'ida-0', 1, v.checkin_ida_em).changes;
    if (v.checkin_volta) migrados += inserir.run(v.id, 'volta-0', 1, v.checkin_volta_em).changes;
  }

  if (migrados) console.log(`[migração] ${migrados} check-in(s) movidos para a nova tabela`);
}

/*
 * O fornecedor era único para a cotação inteira. Agora é por trecho, então
 * o que já estava definido passa a valer para todos os trechos.
 */
const comFornecedorAntigo = db
  .prepare(
    `SELECT c.id, c.origem_milhas, c.fornecedor_id FROM cotacoes c
     LEFT JOIN cotacao_compras cc ON cc.cotacao_id = c.id
     WHERE c.origem_milhas IS NOT NULL AND cc.id IS NULL`
  )
  .all();

if (comFornecedorAntigo.length) {
  const inserirCompra = db.prepare(
    `INSERT OR IGNORE INTO cotacao_compras (cotacao_id, sentido, ordem, origem_milhas, fornecedor_id)
     VALUES (?, ?, ?, ?, ?)`
  );

  for (const c of comFornecedorAntigo) {
    const trechos = db
      .prepare('SELECT sentido, ordem FROM cotacao_trechos WHERE cotacao_id = ?')
      .all(c.id);

    for (const t of trechos) {
      inserirCompra.run(c.id, t.sentido, t.ordem, c.origem_milhas, c.fornecedor_id);
    }
  }

  console.log(`[migração] fornecedor replicado nos trechos de ${comFornecedorAntigo.length} cotação(ões)`);
}

// O localizador da viagem passa a valer para cada unidade de check-in
const semLocalizador = db
  .prepare(
    `SELECT vc.id, v.localizador FROM viagem_checkins vc
     JOIN viagens v ON v.id = vc.viagem_id
     WHERE vc.localizador IS NULL AND v.localizador IS NOT NULL`
  )
  .all();

if (semLocalizador.length) {
  const atualizar = db.prepare('UPDATE viagem_checkins SET localizador = ? WHERE id = ?');
  for (const l of semLocalizador) atualizar.run(l.localizador, l.id);
  console.log(`[migração] localizador copiado para ${semLocalizador.length} check-in(s)`);
}

/*
 * Os horários ficavam direto na opção. Agora cada opção tem uma lista de
 * voos, para comportar conexão vinculada dentro do mesmo trecho.
 */
const opcoesSemVoo = db
  .prepare(
    `SELECT o.id, o.cotacao_id, o.hora_saida, o.hora_chegada, o.numero_voo, o.duracao_min,
            t.origem, t.destino, t.data
     FROM cotacao_opcoes o
     JOIN cotacao_trechos t ON t.id = o.trecho_id
     LEFT JOIN cotacao_voos v ON v.opcao_id = o.id
     WHERE v.id IS NULL AND o.hora_saida IS NOT NULL`
  )
  .all();

if (opcoesSemVoo.length) {
  const inserirVoo = db.prepare(
    `INSERT INTO cotacao_voos
      (cotacao_id, opcao_id, ordem, origem, destino, data, hora_saida, hora_chegada, numero_voo, duracao_min)
     VALUES (?, ?, 0, ?, ?, ?, ?, ?, ?, ?)`
  );

  for (const o of opcoesSemVoo) {
    inserirVoo.run(
      o.cotacao_id, o.id, o.origem, o.destino, o.data,
      o.hora_saida, o.hora_chegada, o.numero_voo, o.duracao_min
    );
  }

  console.log(`[migração] ${opcoesSemVoo.length} voo(s) movidos para a tabela própria`);
}

// Classes que já foram digitadas viram registro, para aparecerem na lista
const classesDigitadas = db
  .prepare("SELECT DISTINCT classe FROM cotacao_opcoes WHERE classe IS NOT NULL AND TRIM(classe) <> ''")
  .all();

for (const { classe } of classesDigitadas) {
  db.prepare('INSERT OR IGNORE INTO classes (nome) VALUES (?)').run(classe.trim());
}

/*
 * Antes havia só a quantidade total de passageiros. Agora ela é dividida em
 * adultos, crianças e bebês, e o preço de venda é guardado por passageiro.
 * Nas cotações antigas todos viram adultos e o unitário sai do total.
 */
const semFaixaEtaria = db
  .prepare('SELECT COUNT(*) AS total FROM cotacoes WHERE adultos = 1 AND criancas = 0 AND bebes = 0 AND passageiros > 1')
  .get().total;

if (semFaixaEtaria > 0) {
  db.exec('UPDATE cotacoes SET adultos = passageiros WHERE passageiros > 1 AND adultos = 1 AND criancas = 0 AND bebes = 0');
  console.log(`[migração] ${semFaixaEtaria} cotação(ões) com passageiros passaram a contar como adultos`);
}

const semUnitario = db
  .prepare('SELECT COUNT(*) AS total FROM cotacoes WHERE preco_venda IS NOT NULL AND preco_venda_unitario IS NULL')
  .get().total;

if (semUnitario > 0) {
  db.exec(`
    UPDATE cotacoes
    SET preco_venda_unitario = ROUND(preco_venda / MAX(adultos + criancas, 1), 2)
    WHERE preco_venda IS NOT NULL AND preco_venda_unitario IS NULL
  `);
  console.log(`[migração] preço por passageiro calculado em ${semUnitario} cotação(ões)`);
}

/*
 * A mensagem do WhatsApp passou a ser genérica. Substitui o texto antigo
 * de quem ainda não personalizou a sua.
 */
const msgGravada = db
  .prepare("SELECT valor FROM configuracoes WHERE chave = 'mensagem_whatsapp'")
  .get();

if (msgGravada && msgGravada.valor.includes('Segue a cotação da sua viagem')) {
  db.prepare("UPDATE configuracoes SET valor = ? WHERE chave = 'mensagem_whatsapp'")
    .run('Olá {cliente}, tudo bem?');
  console.log('[migração] mensagem do WhatsApp simplificada');
}

/*
 * A taxa do cartão passou a ser guardada em fração decimal (0,096495).
 * Bancos anteriores guardavam em percentual (9,6495), o que multiplicaria
 * o valor por 10. Converte uma única vez quem estiver no formato antigo.
 */
const taxaGravada = db
  .prepare("SELECT valor FROM configuracoes WHERE chave = 'taxa_cartao'")
  .get();

if (taxaGravada && Number(String(taxaGravada.valor).replace(',', '.')) >= 1) {
  const convertida = Number(String(taxaGravada.valor).replace(',', '.')) / 100;
  db.prepare("UPDATE configuracoes SET valor = ? WHERE chave = 'taxa_cartao'")
    .run(String(convertida));
  console.log('[migração] taxa do cartão convertida para fração decimal');
}

// Aeroportos da versão anterior guardavam a cidade como texto.
// Aqui cada cidade vira registro próprio e o aeroporto passa a apontar para ela.
if (colunasDe('aeroportos').includes('cidade')) {
  // Passo 1: cada cidade que estava em texto vira registro próprio
  if (!colunasDe('aeroportos').includes('cidade_id')) {
    db.exec('ALTER TABLE aeroportos ADD COLUMN cidade_id INTEGER NOT NULL DEFAULT 0');
  }

  const inserirCidade = db.prepare('INSERT OR IGNORE INTO cidades (nome) VALUES (?)');
  const buscarCidade = db.prepare('SELECT id FROM cidades WHERE nome = ?');
  const atualizar = db.prepare('UPDATE aeroportos SET cidade_id = ? WHERE id = ?');

  for (const a of db.prepare('SELECT id, cidade FROM aeroportos').all()) {
    if (!a.cidade) continue;
    inserirCidade.run(a.cidade);
    atualizar.run(buscarCidade.get(a.cidade).id, a.id);
  }

  /*
   * Passo 2: a coluna antiga "cidade" continuava obrigatória, e como agora
   * gravamos só o cidade_id, todo cadastro novo falhava com NOT NULL.
   * O SQLite não remove coluna, então a tabela é recriada sem ela.
   */
  db.exec('PRAGMA foreign_keys = OFF');

  db.exec(`
    CREATE TABLE aeroportos_novo (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sigla TEXT NOT NULL UNIQUE,
      cidade_id INTEGER NOT NULL
    );
  `);

  db.exec(
    'INSERT INTO aeroportos_novo (id, sigla, cidade_id) SELECT id, sigla, cidade_id FROM aeroportos WHERE cidade_id > 0'
  );

  db.exec('DROP TABLE aeroportos');
  db.exec('ALTER TABLE aeroportos_novo RENAME TO aeroportos');
  db.exec('PRAGMA foreign_keys = ON');

  console.log('[migração] tabela de aeroportos recriada sem a coluna antiga de cidade');
}


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

// Endereços de check-in conhecidos, aplicados a quem ainda não tem
const CHECKIN_CONHECIDOS = {
  Azul: 'https://www.voeazul.com.br/br/pt/home/azulwebcheckin',
  GOL: 'https://b2c.voegol.com.br/check-in',
  LATAM: 'https://www.latamairlines.com/br/pt/check-in',
};

const definirCheckin = db.prepare(
  'UPDATE cias SET url_checkin = ? WHERE UPPER(nome) = UPPER(?) AND url_checkin IS NULL'
);

for (const [nome, url] of Object.entries(CHECKIN_CONHECIDOS)) {
  definirCheckin.run(url, nome);
}

// Classes iniciais
const totalClasses = db.prepare('SELECT COUNT(*) AS total FROM classes').get().total;

if (totalClasses === 0) {
  const inserirClasse = db.prepare('INSERT OR IGNORE INTO classes (nome) VALUES (?)');
  for (const nome of ['Econômica', 'Econômica Premium', 'Executiva', 'Primeira Classe']) {
    inserirClasse.run(nome);
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
  mensagem_whatsapp: 'Olá {cliente}, tudo bem?',
  taxa_cartao: '0.096495',
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
