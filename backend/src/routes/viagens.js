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

      const voosPrimeiro = primeiro.opcao_escolhida.voos || [];
      const voosUltimo = ultimo.opcao_escolhida.voos || [];

      const horaSaida = voosPrimeiro[0]?.hora_saida || primeiro.opcao_escolhida.hora_saida;
      const horaChegada =
        voosUltimo.at(-1)?.hora_chegada || ultimo.opcao_escolhida.hora_chegada;

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
        // Um trecho pode ter mais de um voo (conexão vinculada dentro dele)
        voos: grupo.flatMap((t) => {
          const lista = t.opcao_escolhida.voos?.length
            ? t.opcao_escolhida.voos
            : [{
                origem: t.origem,
                destino: t.destino,
                data: t.data,
                hora_saida: t.opcao_escolhida.hora_saida,
                hora_chegada: t.opcao_escolhida.hora_chegada,
                numero_voo: t.opcao_escolhida.numero_voo,
              }];

          return lista.map((v) => ({
            ...v,
            cia: t.opcao_escolhida.cia,
            classe: t.opcao_escolhida.classe,
          }));
        }),
        data: primeiro.data,
        hora_saida: horaSaida,
        conexoes: grupo.reduce(
          (soma, t) => soma + Math.max((t.opcao_escolhida.voos?.length || 1) - 1, 0),
          0
        ) + grupo.length - 1,
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
      .map((t) => {
        const opcao = db
          .prepare('SELECT * FROM cotacao_opcoes WHERE trecho_id = ? AND escolhida = 1')
          .get(t.id);

        if (!opcao) return { ...t, opcao_escolhida: null };

        const voos = db
          .prepare('SELECT * FROM cotacao_voos WHERE opcao_id = ? ORDER BY ordem ASC')
          .all(opcao.id);

        return { ...t, opcao_escolhida: { ...opcao, voos } };
      });
  }

  // Mesma regra usada nas rotas de cotação: ano + número
  const ano = (cotacao.criado_em || '').slice(2, 4) || '00';

  return {
    ...cotacao,
    referencia: `AG${ano}${String(cotacao.id).padStart(4, '0')}`,
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
    `INSERT INTO viagem_passageiros (viagem_id, ordem, nome, documento, data_nascimento, tipo)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  (lista || []).forEach((p, i) => {
    if (!p.nome?.trim()) return;

    const tipo = ['adulto', 'crianca', 'bebe'].includes(p.tipo) ? p.tipo : 'adulto';

    inserir.run(
      viagemId, i, p.nome.trim(),
      p.documento?.trim() || null, p.data_nascimento || null, tipo
    );
  });
}

// Um localizador por unidade de check-in
function salvarLocalizadores(viagemId, localizadores = {}) {
  const salvar = db.prepare(
    `INSERT INTO viagem_checkins (viagem_id, chave, localizador)
     VALUES (?, ?, ?)
     ON CONFLICT(viagem_id, chave) DO UPDATE SET localizador = excluded.localizador`
  );

  for (const [chave, valor] of Object.entries(localizadores || {})) {
    salvar.run(viagemId, chave, valor?.trim().toUpperCase() || null);
  }
}

function acompanhantesDe(viagemId) {
  return db
    .prepare('SELECT * FROM viagem_passageiros WHERE viagem_id = ? ORDER BY ordem ASC')
    .all(viagemId);
}

function checkinsDe(viagemId) {
  const linhas = db
    .prepare(
      'SELECT chave, feito, feito_em, localizador, antecedencia FROM viagem_checkins WHERE viagem_id = ?'
    )
    .all(viagemId);

  const mapa = {};
  for (const l of linhas) {
    mapa[l.chave] = {
      feito: Boolean(l.feito),
      feito_em: l.feito_em,
      localizador: l.localizador,
      antecedencia: l.antecedencia,
    };
  }
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
    const registro = marcados[unidade.chave] || {
      feito: false, feito_em: null, localizador: null, antecedencia: null,
    };

    // Sem valor próprio, o bloco usa a antecedência geral da viagem
    const antecedencia = registro.antecedencia ?? viagem.antecedencia_checkin;

    const janela = unidade.partida
      ? new Date(unidade.partida - antecedencia * 3600000)
      : null;

    // Endereço do check-in da companhia que opera este bloco
    const cia = unidade.cia
      ? db.prepare('SELECT * FROM cias WHERE UPPER(nome) = UPPER(?)').get(unidade.cia)
      : null;

    return {
      id: `${viagem.id}:${unidade.chave}`,
      viagem_id: viagem.id,
      chave: unidade.chave,
      etapa: calcularEtapa(unidade, unidades, { antecedencia_checkin: antecedencia }, registro.feito),
      checkin_feito: registro.feito,
      checkin_feito_em: registro.feito_em,
      checkin_libera_em: janela ? janela.toISOString() : null,
      antecedencia_checkin: antecedencia,
      url_checkin: cia?.url_checkin || null,
      // Voo separado tem reserva própria, então o localizador é por unidade
      localizador: registro.localizador || viagem.localizador,
      observacoes: viagem.observacoes,
      cliente: cotacao.cliente,
      acompanhantes,
      referencia: cotacao.referencia,
      tipo_viagem: cotacao.tipo_viagem,
      passageiros: cotacao.passageiros,
      adultos: cotacao.adultos,
      criancas: cotacao.criancas,
      bebes: cotacao.bebes,
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
    adultos: cotacao.adultos,
    criancas: cotacao.criancas,
    bebes: cotacao.bebes,
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
    adultos: cotacao?.adultos ?? 1,
    criancas: cotacao?.criancas ?? 0,
    bebes: cotacao?.bebes ?? 0,
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

  const viagemId = Number(r.lastInsertRowid);
  salvarAcompanhantes(viagemId, req.body.acompanhantes);
  salvarLocalizadores(viagemId, req.body.localizadores);

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

  if (req.body.localizadores) {
    salvarLocalizadores(Number(req.params.id), req.body.localizadores);
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

// Localizador de uma unidade de check-in
router.patch('/:id/localizador', (req, res) => {
  const { chave, localizador } = req.body;
  if (!chave) return res.status(400).json({ erro: 'Informe a unidade de check-in' });

  const viagem = db.prepare('SELECT * FROM viagens WHERE id = ?').get(req.params.id);
  if (!viagem) return res.status(404).json({ erro: 'Viagem não encontrada' });

  db.prepare(
    `INSERT INTO viagem_checkins (viagem_id, chave, localizador)
     VALUES (?, ?, ?)
     ON CONFLICT(viagem_id, chave) DO UPDATE SET localizador = excluded.localizador`
  ).run(req.params.id, chave, localizador?.trim().toUpperCase() || null);

  res.json(montarLinhas(viagem));
});

/*
 * Ajustes do bloco: cada unidade tem seu prazo de check-in e sua reserva,
 * porque companhias diferentes liberam em momentos diferentes.
 */
router.patch('/:id/bloco', (req, res) => {
  const { chave, antecedencia, localizador } = req.body;
  if (!chave) return res.status(400).json({ erro: 'Informe a unidade de check-in' });

  const viagem = db.prepare('SELECT * FROM viagens WHERE id = ?').get(req.params.id);
  if (!viagem) return res.status(404).json({ erro: 'Viagem não encontrada' });

  const horas = [24, 48].includes(Number(antecedencia)) ? Number(antecedencia) : null;

  db.prepare(
    `INSERT INTO viagem_checkins (viagem_id, chave, antecedencia, localizador)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(viagem_id, chave)
     DO UPDATE SET antecedencia = excluded.antecedencia, localizador = excluded.localizador`
  ).run(req.params.id, chave, horas, localizador?.trim().toUpperCase() || null);

  res.json(montarLinhas(viagem));
});

/*
 * Horário de voo muda. Aqui os voos daquele bloco são corrigidos direto,
 * inclusive os de uma conexão vinculada.
 */
router.patch('/:id/voos', (req, res) => {
  const viagem = db.prepare('SELECT * FROM viagens WHERE id = ?').get(req.params.id);
  if (!viagem) return res.status(404).json({ erro: 'Viagem não encontrada' });

  const { voos } = req.body;
  if (!Array.isArray(voos)) return res.status(400).json({ erro: 'Informe os voos' });

  const atualizar = db.prepare(
    `UPDATE cotacao_voos SET
      origem = ?, destino = ?, data = ?, hora_saida = ?, hora_chegada = ?,
      numero_voo = ?, duracao_min = ?
     WHERE id = ? AND cotacao_id = ?`
  );

  for (const v of voos) {
    if (!v.id) continue;

    atualizar.run(
      v.origem || null, v.destino || null, v.data || null,
      v.hora_saida || null, v.hora_chegada || null, v.numero_voo || null,
      v.duracao_min !== '' && v.duracao_min != null ? Number(v.duracao_min) : null,
      v.id, viagem.cotacao_id
    );
  }

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
