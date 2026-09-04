import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

export const ETAPAS = [
  'aguardando_checkin',
  'realizar_checkin',
  'checkin_realizado',
  'em_viagem',
  'concluido',
];

function momento(data, hora) {
  if (!data) return null;
  const d = new Date(`${data.slice(0, 10)}T${hora || '00:00'}:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function somarDias(data, dias) {
  const d = new Date(`${data.slice(0, 10)}T12:00:00`);
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

/*
 * Divide a viagem em unidades de check-in.
 *
 * Trechos seguidos do mesmo sentido operados pela MESMA companhia formam
 * uma escala vinculada: um único check-in cobre todos. Se a companhia muda,
 * a escala é não vinculada e cada parte exige o seu próprio check-in.
 * A volta sempre começa uma unidade nova.
 */
function montarUnidades(cotacao) {
  const unidades = [];

  for (const sentido of ['ida', 'volta']) {
    if (sentido === 'volta' && cotacao.tipo_viagem !== 'ida_volta') continue;

    const trechos = (sentido === 'ida' ? cotacao.trechos_ida : cotacao.trechos_volta)
      .filter((t) => t.opcao_escolhida);

    if (!trechos.length) continue;

    const grupos = [[trechos[0]]];

    for (let i = 1; i < trechos.length; i++) {
      const anterior = grupos[grupos.length - 1].at(-1);
      const atual = trechos[i];

      const ciaAnterior = anterior.opcao_escolhida.cia;
      const ciaAtual = atual.opcao_escolhida.cia;
      const vinculada = ciaAnterior && ciaAtual && ciaAnterior === ciaAtual;

      if (vinculada) grupos[grupos.length - 1].push(atual);
      else grupos.push([atual]);
    }

    grupos.forEach((grupo, indice) => {
      const primeiro = grupo[0];
      const ultimo = grupo.at(-1);

      const horaSaida = primeiro.opcao_escolhida.hora_saida;
      const horaChegada = ultimo.opcao_escolhida.hora_chegada;

      const viraODia = horaSaida && horaChegada && horaChegada <= horaSaida;
      const dataChegada = viraODia ? somarDias(ultimo.data, 1) : ultimo.data;

      unidades.push({
        chave: `${sentido}-${indice}`,
        sentido,
        indice,
        // Numeração dentro do sentido, para rotular "Ida · parte 2"
        parte: grupos.length > 1 ? indice + 1 : null,
        total_partes: grupos.length,
        origem: primeiro.origem,
        destino: ultimo.destino,
        cia: primeiro.opcao_escolhida.cia,
        classe: primeiro.opcao_escolhida.classe,
        voos: grupo.map((t) => ({
          origem: t.origem,
          destino: t.destino,
          data: t.data,
          hora_saida: t.opcao_escolhida.hora_saida,
          hora_chegada: t.opcao_escolhida.hora_chegada,
          numero_voo: t.opcao_escolhida.numero_voo,
          cia: t.opcao_escolhida.cia,
        })),
        conexoes: grupo.length - 1,
        data: primeiro.data,
        hora_saida: horaSaida,
        data_chegada: dataChegada,
        hora_chegada: horaChegada,
        partida: momento(primeiro.data, horaSaida),
        chegada: momento(dataChegada, horaChegada),
      });
    });
  }

  return unidades;
}

function cotacaoDe(cotacaoId) {
  const cotacao = db.prepare('SELECT * FROM cotacoes WHERE id = ?').get(cotacaoId);
  if (!cotacao) return null;

  const cliente = db
    .prepare('SELECT id, nome, email, telefone, documento FROM clientes WHERE id = ?')
    .get(cotacao.cliente_id);

  const fornecedor = cotacao.fornecedor_id
    ? db.prepare('SELECT * FROM fornecedores WHERE id = ?').get(cotacao.fornecedor_id)
    : null;

  function trechosDe(sentido) {
    return db
      .prepare(
        'SELECT * FROM cotacao_trechos WHERE cotacao_id = ? AND sentido = ? ORDER BY ordem ASC'
      )
      .all(cotacaoId, sentido)
      .map((t) => ({
        ...t,
        opcao_escolhida:
          db
            .prepare('SELECT * FROM cotacao_opcoes WHERE trecho_id = ? AND escolhida = 1')
            .get(t.id) || null,
      }));
  }

  return {
    ...cotacao,
    cliente,
    fornecedor,
    trechos_ida: trechosDe('ida'),
    trechos_volta: trechosDe('volta'),
  };
}

/*
 * A etapa é calculada por unidade, não pela viagem inteira. Assim marcar o
 * check-in da ida não arrasta a volta junto.
 */
function calcularEtapa(unidade, unidades, viagem, feito) {
  const agora = new Date();
  const ultima = unidades.at(-1);

  // Chegou o último voo: a viagem acabou
  if (ultima.chegada && agora >= ultima.chegada) return 'concluido';

  if (unidade.partida && agora >= unidade.partida) return 'em_viagem';

  const janela = unidade.partida
    ? new Date(unidade.partida - viagem.antecedencia_checkin * 3600000)
    : null;

  if (feito) return 'checkin_realizado';
  if (janela && agora >= janela) return 'realizar_checkin';
  return 'aguardando_checkin';
}

function salvarAcompanhantes(viagemId, lista = []) {
  db.prepare('DELETE FROM viagem_passageiros WHERE viagem_id = ?').run(viagemId);

  const inserir = db.prepare(
    'INSERT INTO viagem_passageiros (viagem_id, ordem, nome, documento, data_nascimento) VALUES (?, ?, ?, ?, ?)'
  );

  (lista || []).forEach((p, i) => {
    if (!p.nome?.trim()) return;
    inserir.run(viagemId, i, p.nome.trim(), p.documento?.trim() || null, p.data_nascimento || null);
  });
}

function acompanhantesDe(viagemId) {
  return db
    .prepare('SELECT * FROM viagem_passageiros WHERE viagem_id = ? ORDER BY ordem ASC')
    .all(viagemId);
}

function checkinsDe(viagemId) {
  const linhas = db
    .prepare('SELECT chave, feito, feito_em FROM viagem_checkins WHERE viagem_id = ?')
    .all(viagemId);

  const mapa = {};
  for (const l of linhas) mapa[l.chave] = { feito: Boolean(l.feito), feito_em: l.feito_em };
  return mapa;
}

/*
 * Devolve uma linha por unidade de check-in. A tela lista essas linhas,
 * então cada check-in aparece na sua própria aba.
 */
function montarLinhas(viagem) {
  const cotacao = cotacaoDe(viagem.cotacao_id);
  if (!cotacao) return [];

  const unidades = montarUnidades(cotacao);
  const marcados = checkinsDe(viagem.id);
  const acompanhantes = acompanhantesDe(viagem.id);

  return unidades.map((unidade) => {
    const registro = marcados[unidade.chave] || { feito: false, feito_em: null };

    const janela = unidade.partida
      ? new Date(unidade.partida - viagem.antecedencia_checkin * 3600000)
      : null;

    return {
      id: `${viagem.id}:${unidade.chave}`,
      viagem_id: viagem.id,
      chave: unidade.chave,
      etapa: calcularEtapa(unidade, unidades, viagem, registro.feito),
      checkin_feito: registro.feito,
      checkin_feito_em: registro.feito_em,
      checkin_libera_em: janela ? janela.toISOString() : null,
      antecedencia_checkin: viagem.antecedencia_checkin,
      localizador: viagem.localizador,
      observacoes: viagem.observacoes,
      cliente: cotacao.cliente,
      acompanhantes,
      referencia: cotacao.referencia,
      tipo_viagem: cotacao.tipo_viagem,
      passageiros: cotacao.passageiros,
      data_venda: cotacao.data_venda,
      preco_venda: cotacao.preco_venda,
      origem_milhas: cotacao.origem_milhas,
      fornecedor: cotacao.fornecedor,
      // Aviso de que esta unidade existe por causa de escala não vinculada
      nao_vinculada: unidade.total_partes > 1,
      unidade,
    };
  });
}

// Resumo usado na tela de cadastro
function resumoDaCotacao(cotacaoId) {
  const cotacao = cotacaoDe(cotacaoId);
  const unidades = montarUnidades(cotacao);

  return {
    id: cotacaoId,
    cliente: cotacao.cliente,
    tipo_viagem: cotacao.tipo_viagem,
    passageiros: cotacao.passageiros,
    unidades,
  };
}

router.get('/disponiveis', (req, res) => {
  const cotacoes = db
    .prepare(
      `SELECT c.id FROM cotacoes c
       LEFT JOIN viagens v ON v.cotacao_id = c.id
       WHERE c.status = 'vendida' AND v.id IS NULL
       ORDER BY c.data_ida ASC`
    )
    .all();

  res.json(cotacoes.map(({ id }) => resumoDaCotacao(id)));
});

router.get('/', (req, res) => {
  const viagens = db.prepare('SELECT * FROM viagens ORDER BY criado_em DESC').all();

  let linhas = viagens.flatMap(montarLinhas);

  const { etapa, busca } = req.query;

  if (etapa) linhas = linhas.filter((l) => l.etapa === etapa);

  if (busca) {
    const termo = String(busca).toLowerCase();
    linhas = linhas.filter(
      (l) =>
        l.cliente?.nome?.toLowerCase().includes(termo) ||
        l.unidade.origem?.toLowerCase().includes(termo) ||
        l.unidade.destino?.toLowerCase().includes(termo) ||
        l.unidade.cia?.toLowerCase().includes(termo) ||
        l.localizador?.toLowerCase().includes(termo) ||
        l.acompanhantes?.some((a) => a.nome.toLowerCase().includes(termo))
    );
  }

  // Quem parte antes aparece primeiro
  linhas.sort((a, b) => {
    const pa = a.unidade.partida ? new Date(a.unidade.partida) : new Date(8640000000000000);
    const pb = b.unidade.partida ? new Date(b.unidade.partida) : new Date(8640000000000000);
    return pa - pb;
  });

  res.json(linhas);
});

// Dados de uma viagem, para a tela de edição
router.get('/:id', (req, res) => {
  const viagem = db.prepare('SELECT * FROM viagens WHERE id = ?').get(req.params.id);
  if (!viagem) return res.status(404).json({ erro: 'Viagem não encontrada' });

  const cotacao = cotacaoDe(viagem.cotacao_id);

  res.json({
    ...viagem,
    cliente: cotacao?.cliente || null,
    passageiros: cotacao?.passageiros || 1,
    acompanhantes: acompanhantesDe(viagem.id),
  });
});

router.post('/', (req, res) => {
  const { cotacao_id, antecedencia_checkin, localizador, observacoes } = req.body;

  if (!cotacao_id) return res.status(400).json({ erro: 'Escolha a cotação vendida' });

  const cotacao = db.prepare('SELECT * FROM cotacoes WHERE id = ?').get(cotacao_id);
  if (!cotacao) return res.status(400).json({ erro: 'Cotação não encontrada' });

  if (cotacao.status !== 'vendida') {
    return res.status(400).json({ erro: 'Só cotações vendidas viram viagem' });
  }

  const jaExiste = db.prepare('SELECT id FROM viagens WHERE cotacao_id = ?').get(cotacao_id);
  if (jaExiste) return res.status(400).json({ erro: 'Esta cotação já tem viagem cadastrada' });

  const horas = Number(antecedencia_checkin) === 48 ? 48 : 24;

  const r = db
    .prepare(
      `INSERT INTO viagens (cotacao_id, antecedencia_checkin, localizador, observacoes)
       VALUES (?, ?, ?, ?)`
    )
    .run(cotacao_id, horas, localizador?.trim() || null, observacoes?.trim() || null);

  salvarAcompanhantes(Number(r.lastInsertRowid), req.body.acompanhantes);

  res.status(201).json(
    montarLinhas(db.prepare('SELECT * FROM viagens WHERE id = ?').get(Number(r.lastInsertRowid)))
  );
});

router.put('/:id', (req, res) => {
  const viagem = db.prepare('SELECT * FROM viagens WHERE id = ?').get(req.params.id);
  if (!viagem) return res.status(404).json({ erro: 'Viagem não encontrada' });

  const horas = Number(req.body.antecedencia_checkin) === 48 ? 48 : 24;

  db.prepare(
    'UPDATE viagens SET antecedencia_checkin = ?, localizador = ?, observacoes = ? WHERE id = ?'
  ).run(
    horas,
    req.body.localizador?.trim() || null,
    req.body.observacoes?.trim() || null,
    req.params.id
  );

  if (req.body.acompanhantes) {
    salvarAcompanhantes(Number(req.params.id), req.body.acompanhantes);
  }

  res.json(montarLinhas(db.prepare('SELECT * FROM viagens WHERE id = ?').get(req.params.id)));
});

// Marca ou desmarca o check-in de uma unidade
router.patch('/:id/checkin', (req, res) => {
  const { chave, feito } = req.body;

  if (!chave) return res.status(400).json({ erro: 'Informe a unidade de check-in' });

  const viagem = db.prepare('SELECT * FROM viagens WHERE id = ?').get(req.params.id);
  if (!viagem) return res.status(404).json({ erro: 'Viagem não encontrada' });

  db.prepare(
    `INSERT INTO viagem_checkins (viagem_id, chave, feito, feito_em)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(viagem_id, chave) DO UPDATE SET feito = excluded.feito, feito_em = excluded.feito_em`
  ).run(req.params.id, chave, feito ? 1 : 0, feito ? new Date().toISOString() : null);

  res.json(montarLinhas(viagem));
});

router.delete('/:id', (req, res) => {
  const viagem = db.prepare('SELECT * FROM viagens WHERE id = ?').get(req.params.id);
  if (!viagem) return res.status(404).json({ erro: 'Viagem não encontrada' });

  db.prepare('DELETE FROM viagem_checkins WHERE viagem_id = ?').run(req.params.id);
  db.prepare('DELETE FROM viagem_passageiros WHERE viagem_id = ?').run(req.params.id);
  db.prepare('DELETE FROM viagens WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

export default router;
