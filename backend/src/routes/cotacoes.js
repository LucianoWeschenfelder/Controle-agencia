import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

const STATUS_VALIDOS = ['elaboracao', 'enviada', 'vendida', 'cancelada'];

function hoje() {
  return new Date().toISOString().slice(0, 10);
}

// Código de referência mostrado no orçamento, gerado a partir do id
function referenciaDe(cotacao) {
  const ano = (cotacao.criado_em || '').slice(2, 4) || '00';
  return `AG${ano}${String(cotacao.id).padStart(4, '0')}`;
}

// Custo de uma opção de CIA (valor por passageiro, naquele trecho)
function calcularOpcao(opcao, pagantes = 1) {
  const custoMilhas = (opcao.milhas / 1000) * opcao.valor_milheiro;
  const porPassageiro = custoMilhas + opcao.taxa + opcao.bagagem;

  return {
    ...opcao,
    escolhida: Boolean(opcao.escolhida),
    custo_milhas: Number(custoMilhas.toFixed(2)),
    custo_total: Number(porPassageiro.toFixed(2)),
    // Mesmo custo multiplicado pelos passageiros que pagam passagem
    custo_todos: Number((porPassageiro * pagantes).toFixed(2)),
  };
}

// Monta os trechos de um sentido, cada um com suas opções de CIA
function montarTrechos(cotacaoId, sentido, pagantes = 1) {
  const trechos = db
    .prepare('SELECT * FROM cotacao_trechos WHERE cotacao_id = ? AND sentido = ? ORDER BY ordem ASC')
    .all(cotacaoId, sentido);

  const opcoes = db
    .prepare('SELECT * FROM cotacao_opcoes WHERE cotacao_id = ? ORDER BY id ASC')
    .all(cotacaoId)
    .map((o) => calcularOpcao(o, pagantes));

  const voos = db
    .prepare('SELECT * FROM cotacao_voos WHERE cotacao_id = ? ORDER BY ordem ASC')
    .all(cotacaoId);

  const compras = db
    .prepare('SELECT * FROM cotacao_compras WHERE cotacao_id = ? AND sentido = ?')
    .all(cotacaoId, sentido);

  return trechos.map((trecho) => {
    const doTrecho = opcoes
      .filter((o) => o.trecho_id === trecho.id)
      .map((o) => ({ ...o, voos: voos.filter((v) => v.opcao_id === o.id) }));
    const compra = compras.find((c) => c.ordem === trecho.ordem) || null;

    const fornecedor = compra?.fornecedor_id
      ? db.prepare('SELECT * FROM fornecedores WHERE id = ?').get(compra.fornecedor_id)
      : null;

    return {
      ...trecho,
      opcoes: doTrecho,
      opcao_escolhida: doTrecho.find((o) => o.escolhida) || null,
      origem_milhas: compra?.origem_milhas || null,
      fornecedor_id: compra?.fornecedor_id || null,
      fornecedor,
    };
  });
}

// Soma o custo das opções escolhidas de um sentido
function custoDoSentido(trechos) {
  const escolhidas = trechos.map((t) => t.opcao_escolhida).filter(Boolean);
  if (!escolhidas.length) return null;
  return Number(escolhidas.reduce((soma, o) => soma + o.custo_total, 0).toFixed(2));
}

function montarCotacao(cotacao) {
  const cliente = db
    .prepare('SELECT id, nome, email, telefone, documento FROM clientes WHERE id = ?')
    .get(cotacao.cliente_id);

  const itens = db
    .prepare(
      `SELECT ci.item_id, ci.quantidade, ci.por_passageiro,
              i.titulo, i.descricao, i.tem_quantidade, i.fixo, i.icone
       FROM cotacao_itens ci
       JOIN itens_tarifa i ON i.id = ci.item_id
       WHERE ci.cotacao_id = ?
       ORDER BY i.fixo DESC, i.id ASC`
    )
    .all(cotacao.id)
    .map((i) => ({ ...i, por_passageiro: Boolean(i.por_passageiro), fixo: Boolean(i.fixo) }));

  /*
   * Itens fixos entram sempre, mesmo que a cotação não os tenha escolhido:
   * passagem e item pessoal acompanham qualquer tarifa.
   */
  const fixos = db
    .prepare('SELECT * FROM itens_tarifa WHERE fixo = 1 ORDER BY id ASC')
    .all()
    .filter((f) => !itens.some((i) => i.item_id === f.id))
    .map((f) => ({
      item_id: f.id,
      quantidade: 1,
      por_passageiro: false,
      titulo: f.titulo,
      descricao: f.descricao,
      tem_quantidade: false,
      fixo: true,
      icone: f.icone,
    }));

  const itensCompletos = [...fixos, ...itens];

  const pagantesDaCotacao = Math.max(contarPagantes(cotacao.adultos, cotacao.criancas), 1);

  const trechosIda = montarTrechos(cotacao.id, 'ida', pagantesDaCotacao);
  const trechosVolta = montarTrechos(cotacao.id, 'volta', pagantesDaCotacao);

  const custoIda = custoDoSentido(trechosIda);
  const custoVolta = custoDoSentido(trechosVolta);

  const temEscolha = custoIda !== null || custoVolta !== null;

  // Bebê viaja no colo e não gera passagem, então não entra na multiplicação
  const pagantes = Math.max(contarPagantes(cotacao.adultos, cotacao.criancas), 1);

  const custoUnitario = (custoIda ?? 0) + (custoVolta ?? 0);
  const custoTotal = temEscolha ? Number((custoUnitario * pagantes).toFixed(2)) : null;

  const lucro =
    custoTotal !== null && cotacao.preco_venda !== null
      ? Number((cotacao.preco_venda - custoTotal).toFixed(2))
      : null;

  let economia = null;
  let economia_percentual = null;
  if (cotacao.valor_internet && cotacao.preco_venda) {
    economia = Number((cotacao.valor_internet - cotacao.preco_venda).toFixed(2));
    economia_percentual = Number(((economia / cotacao.valor_internet) * 100).toFixed(1));
  }

  let dias_desde_envio = null;
  if (cotacao.data_envio) {
    const envio = new Date(cotacao.data_envio);
    dias_desde_envio = Math.floor((new Date() - envio) / (1000 * 60 * 60 * 24));
  }

  const fornecedor = cotacao.fornecedor_id
    ? db.prepare('SELECT * FROM fornecedores WHERE id = ?').get(cotacao.fornecedor_id)
    : null;

  return {
    ...cotacao,
    referencia: referenciaDe(cotacao),
    cliente,
    fornecedor,
    itens: itensCompletos,
    trechos_ida: trechosIda,
    trechos_volta: trechosVolta,
    custo_ida: custoIda,
    custo_volta: custoVolta,
    pagantes,
    custo_unitario: temEscolha ? Number(custoUnitario.toFixed(2)) : null,
    custo: custoTotal,
    lucro,
    economia,
    economia_percentual,
    dias_desde_envio,
  };
}

/*
 * Regrava trechos e opções. Como as opções dependem do id do trecho,
 * apagamos tudo e recriamos na ordem: primeiro o trecho, depois suas opções.
 */
function salvarTrechos(cotacaoId, trechos = [], sentido) {
  const inserirTrecho = db.prepare(
    `INSERT INTO cotacao_trechos (cotacao_id, sentido, ordem, origem, destino, data)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  const inserirOpcao = db.prepare(
    `INSERT INTO cotacao_opcoes
      (cotacao_id, trecho_id, cia, classe, milhas, valor_milheiro, taxa, bagagem,
       hora_saida, hora_chegada, numero_voo, duracao_min, escolhida)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const inserirVoo = db.prepare(
    `INSERT INTO cotacao_voos
      (cotacao_id, opcao_id, ordem, origem, destino, data, hora_saida, hora_chegada, numero_voo, duracao_min)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  (trechos || []).forEach((trecho, i) => {
    const r = inserirTrecho.run(
      cotacaoId, sentido, i,
      trecho.origem || null, trecho.destino || null, trecho.data || null
    );

    const trechoId = Number(r.lastInsertRowid);

    (trecho.opcoes || []).forEach((opcao) => {
      // O primeiro voo espelha os horários na própria opção, para consultas simples
      const voos = (opcao.voos || []).filter((v) => v.hora_saida || v.hora_chegada || v.numero_voo);
      const primeiro = voos[0] || {};

      const numero = (valor) =>
        valor !== '' && valor != null ? Number(valor) : null;

      const r = inserirOpcao.run(
        cotacaoId, trechoId,
        opcao.cia || null, opcao.classe || null,
        Number(opcao.milhas) || 0, Number(opcao.valor_milheiro) || 0,
        Number(opcao.taxa) || 0, Number(opcao.bagagem) || 0,
        primeiro.hora_saida || null, primeiro.hora_chegada || null, primeiro.numero_voo || null,
        numero(primeiro.duracao_min),
        opcao.escolhida ? 1 : 0
      );

      const opcaoId = Number(r.lastInsertRowid);

      voos.forEach((v, i) => {
        inserirVoo.run(
          cotacaoId, opcaoId, i,
          v.origem || trecho.origem || null,
          v.destino || trecho.destino || null,
          v.data || trecho.data || null,
          v.hora_saida || null, v.hora_chegada || null, v.numero_voo || null,
          numero(v.duracao_min)
        );
      });
    });
  });
}

function salvarItens(cotacaoId, itens = []) {
  db.prepare('DELETE FROM cotacao_itens WHERE cotacao_id = ?').run(cotacaoId);

  const inserir = db.prepare(
    `INSERT INTO cotacao_itens (cotacao_id, item_id, quantidade, por_passageiro)
     VALUES (?, ?, ?, ?)`
  );

  for (const item of itens) {
    if (!item.item_id) continue;

    inserir.run(
      cotacaoId,
      item.item_id,
      Number(item.quantidade) || 1,
      item.por_passageiro ? 1 : 0
    );
  }
}

function regravarTudo(cotacaoId, body) {
  db.prepare('DELETE FROM cotacao_voos WHERE cotacao_id = ?').run(cotacaoId);
  db.prepare('DELETE FROM cotacao_opcoes WHERE cotacao_id = ?').run(cotacaoId);
  db.prepare('DELETE FROM cotacao_trechos WHERE cotacao_id = ?').run(cotacaoId);

  salvarTrechos(cotacaoId, body.trechos_ida, 'ida');

  if (body.tipo_viagem !== 'ida') {
    salvarTrechos(cotacaoId, body.trechos_volta, 'volta');
  }

  salvarItens(cotacaoId, body.itens);
}

/*
 * Bebês não multiplicam o valor: só adultos e crianças contam como pagantes.
 */
export function contarPagantes(adultos, criancas) {
  return Math.max(Number(adultos) || 0, 0) + Math.max(Number(criancas) || 0, 0);
}

function extrairDados(body) {
  const adultos = Number(body.adultos) > 0 ? Number(body.adultos) : 1;
  const criancas = Number(body.criancas) > 0 ? Number(body.criancas) : 0;
  const bebes = Number(body.bebes) > 0 ? Number(body.bebes) : 0;

  const pagantes = contarPagantes(adultos, criancas);

  // O preço de venda e o valor da internet são o total, para todos os passageiros
  const total =
    body.preco_venda !== '' && body.preco_venda != null ? Number(body.preco_venda) : null;

  return {
    cliente_id: body.cliente_id,
    origem: (body.origem || '').trim().toUpperCase(),
    destino: (body.destino || '').trim().toUpperCase(),
    tipo_viagem: body.tipo_viagem === 'ida' ? 'ida' : 'ida_volta',
    data_ida: body.data_ida,
    data_volta: body.data_volta || null,
    adultos, criancas, bebes,
    passageiros: adultos + criancas + bebes,
    valor_internet:
      body.valor_internet !== '' && body.valor_internet != null
        ? Number(body.valor_internet) : null,
    preco_venda: total,
    // Guardado só para exibição: quanto sai por passageiro pagante
    preco_venda_unitario:
      total !== null ? Number((total / Math.max(pagantes, 1)).toFixed(2)) : null,
    observacoes: body.observacoes || null,
    bagagem_mao: Number(body.bagagem_mao) || 0,
    bagagem_despachada: Number(body.bagagem_despachada) || 0,
  };
}

// Um rascunho pode ficar incompleto; uma cotação finalizada não
function validar(dados, rascunho) {
  if (!dados.cliente_id) {
    return rascunho
      ? 'Informe ao menos o cliente para salvar o rascunho'
      : 'Cliente é obrigatório';
  }
  if (rascunho) return null;

  if (!dados.origem) return 'Origem é obrigatória';
  if (!dados.destino) return 'Destino é obrigatório';
  if (!dados.data_ida) return 'Data da ida é obrigatória';
  return null;
}

router.get('/', (req, res) => {
  const { status, busca } = req.query;

  let sql = `
    SELECT c.* FROM cotacoes c
    JOIN clientes cl ON cl.id = c.cliente_id
    WHERE 1 = 1
  `;
  const params = [];

  if (status) {
    sql += ' AND c.status = ?';
    params.push(status);
  }

  if (busca) {
    sql += ' AND (cl.nome LIKE ? OR c.origem LIKE ? OR c.destino LIKE ?)';
    const termo = `%${busca}%`;
    params.push(termo, termo, termo);
  }

  sql += ' ORDER BY c.criado_em DESC';

  res.json(db.prepare(sql).all(...params).map(montarCotacao));
});

router.get('/:id', (req, res) => {
  const cotacao = db.prepare('SELECT * FROM cotacoes WHERE id = ?').get(req.params.id);
  if (!cotacao) return res.status(404).json({ erro: 'Cotação não encontrada' });
  res.json(montarCotacao(cotacao));
});

router.post('/', (req, res) => {
  const dados = extrairDados(req.body);

  const erro = validar(dados, req.body.rascunho);
  if (erro) return res.status(400).json({ erro });

  const cliente = db.prepare('SELECT id FROM clientes WHERE id = ?').get(dados.cliente_id);
  if (!cliente) return res.status(400).json({ erro: 'Cliente não encontrado' });

  const r = db
    .prepare(
      `INSERT INTO cotacoes
        (cliente_id, origem, destino, tipo_viagem, data_ida, data_volta, passageiros,
         adultos, criancas, bebes, valor_internet, preco_venda, preco_venda_unitario,
         observacoes, bagagem_mao, bagagem_despachada, data_conclusao)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      dados.cliente_id, dados.origem, dados.destino, dados.tipo_viagem,
      dados.data_ida, dados.data_volta, dados.passageiros,
      dados.adultos, dados.criancas, dados.bebes,
      dados.valor_internet, dados.preco_venda, dados.preco_venda_unitario,
      dados.observacoes, dados.bagagem_mao, dados.bagagem_despachada,
      // A data de conclusão só é gravada quando a cotação é salva completa
      req.body.rascunho ? null : hoje()
    );

  const id = Number(r.lastInsertRowid);
  regravarTudo(id, req.body);

  res.status(201).json(
    montarCotacao(db.prepare('SELECT * FROM cotacoes WHERE id = ?').get(id))
  );
});

router.put('/:id', (req, res) => {
  const existente = db.prepare('SELECT * FROM cotacoes WHERE id = ?').get(req.params.id);
  if (!existente) return res.status(404).json({ erro: 'Cotação não encontrada' });

  const dados = extrairDados(req.body);
  const erro = validar(dados, req.body.rascunho);
  if (erro) return res.status(400).json({ erro });

  db.prepare(
    `UPDATE cotacoes SET
      cliente_id = ?, origem = ?, destino = ?, tipo_viagem = ?, data_ida = ?, data_volta = ?,
      passageiros = ?, adultos = ?, criancas = ?, bebes = ?,
      valor_internet = ?, preco_venda = ?, preco_venda_unitario = ?, observacoes = ?,
      bagagem_mao = ?, bagagem_despachada = ?, data_conclusao = ?
     WHERE id = ?`
  ).run(
    dados.cliente_id, dados.origem, dados.destino, dados.tipo_viagem,
    dados.data_ida, dados.data_volta, dados.passageiros,
    dados.adultos, dados.criancas, dados.bebes,
    dados.valor_internet, dados.preco_venda, dados.preco_venda_unitario,
    dados.observacoes, dados.bagagem_mao, dados.bagagem_despachada,
    // Mantém a data de conclusão original; grava agora se for a primeira vez
    req.body.rascunho ? existente.data_conclusao : existente.data_conclusao || hoje(),
    req.params.id
  );

  regravarTudo(Number(req.params.id), req.body);

  res.json(
    montarCotacao(db.prepare('SELECT * FROM cotacoes WHERE id = ?').get(req.params.id))
  );
});

router.patch('/:id/status', (req, res) => {
  const { status } = req.body;
  if (!STATUS_VALIDOS.includes(status)) {
    return res.status(400).json({ erro: 'Status inválido' });
  }

  const cotacao = db.prepare('SELECT * FROM cotacoes WHERE id = ?').get(req.params.id);
  if (!cotacao) return res.status(404).json({ erro: 'Cotação não encontrada' });

  const dataEnvio =
    status === 'enviada' && !cotacao.data_envio ? hoje() : cotacao.data_envio;

  // A data da venda é gravada na primeira vez que a cotação vira vendida
  const dataVenda =
    status === 'vendida' && !cotacao.data_venda ? hoje() : cotacao.data_venda;

  db.prepare('UPDATE cotacoes SET status = ?, data_envio = ?, data_venda = ? WHERE id = ?')
    .run(status, dataEnvio, dataVenda, req.params.id);

  res.json(
    montarCotacao(db.prepare('SELECT * FROM cotacoes WHERE id = ?').get(req.params.id))
  );
});

/*
 * Define de onde saíram as milhas: de um fornecedor cadastrado ou das
 * milhas próprias. Só faz sentido depois da cotação ser vendida.
 */
router.patch('/:id/fornecedor', (req, res) => {
  const cotacao = db.prepare('SELECT * FROM cotacoes WHERE id = ?').get(req.params.id);
  if (!cotacao) return res.status(404).json({ erro: 'Cotação não encontrada' });

  const { compras } = req.body;
  if (!Array.isArray(compras)) {
    return res.status(400).json({ erro: 'Informe os trechos comprados' });
  }

  const salvar = db.prepare(
    `INSERT INTO cotacao_compras (cotacao_id, sentido, ordem, origem_milhas, fornecedor_id)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(cotacao_id, sentido, ordem)
     DO UPDATE SET origem_milhas = excluded.origem_milhas, fornecedor_id = excluded.fornecedor_id`
  );

  for (const c of compras) {
    if (!['ida', 'volta'].includes(c.sentido)) continue;

    if (c.origem_milhas && !['propria', 'fornecedor'].includes(c.origem_milhas)) {
      return res.status(400).json({ erro: 'Origem da compra inválida' });
    }

    if (c.origem_milhas === 'fornecedor' && !c.fornecedor_id) {
      return res.status(400).json({ erro: 'Escolha o fornecedor do trecho' });
    }

    salvar.run(
      req.params.id,
      c.sentido,
      Number(c.ordem) || 0,
      c.origem_milhas || null,
      c.origem_milhas === 'fornecedor' ? c.fornecedor_id : null
    );
  }

  res.json(montarCotacao(db.prepare('SELECT * FROM cotacoes WHERE id = ?').get(req.params.id)));
});

// Correção manual das datas de envio e de venda
router.patch('/:id/datas', (req, res) => {
  const cotacao = db.prepare('SELECT * FROM cotacoes WHERE id = ?').get(req.params.id);
  if (!cotacao) return res.status(404).json({ erro: 'Cotação não encontrada' });

  db.prepare('UPDATE cotacoes SET data_envio = ?, data_venda = ? WHERE id = ?').run(
    req.body.data_envio || null,
    req.body.data_venda || null,
    req.params.id
  );

  res.json(montarCotacao(db.prepare('SELECT * FROM cotacoes WHERE id = ?').get(req.params.id)));
});

router.delete('/:id', (req, res) => {
  const existente = db.prepare('SELECT * FROM cotacoes WHERE id = ?').get(req.params.id);
  if (!existente) return res.status(404).json({ erro: 'Cotação não encontrada' });

  db.prepare('DELETE FROM cotacao_voos WHERE cotacao_id = ?').run(req.params.id);
  db.prepare('DELETE FROM cotacao_opcoes WHERE cotacao_id = ?').run(req.params.id);
  db.prepare('DELETE FROM cotacao_trechos WHERE cotacao_id = ?').run(req.params.id);
  db.prepare('DELETE FROM cotacao_itens WHERE cotacao_id = ?').run(req.params.id);
  db.prepare('DELETE FROM cotacao_compras WHERE cotacao_id = ?').run(req.params.id);
  db.prepare('DELETE FROM cotacoes WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

export default router;
