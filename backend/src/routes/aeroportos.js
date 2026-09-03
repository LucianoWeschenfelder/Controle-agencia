import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

const SQL_LISTA = `
  SELECT a.id, a.sigla, a.cidade_id, c.nome AS cidade
  FROM aeroportos a
  JOIN cidades c ON c.id = a.cidade_id
`;

router.get('/', (req, res) => {
  res.json(db.prepare(`${SQL_LISTA} ORDER BY c.nome ASC, a.sigla ASC`).all());
});

router.post('/', (req, res) => {
  const { sigla, cidade_id, cidade } = req.body;

  if (!sigla?.trim()) return res.status(400).json({ erro: 'Informe a sigla' });

  // Aceita uma cidade já cadastrada (id) ou o nome de uma cidade nova
  let cidadeId = cidade_id;

  if (!cidadeId) {
    if (!cidade?.trim()) return res.status(400).json({ erro: 'Informe a cidade' });

    db.prepare('INSERT OR IGNORE INTO cidades (nome) VALUES (?)').run(cidade.trim());
    cidadeId = db.prepare('SELECT id FROM cidades WHERE nome = ?').get(cidade.trim()).id;
  }

  const siglaLimpa = sigla.trim().toUpperCase();

  const jaExiste = db.prepare(`${SQL_LISTA} WHERE a.sigla = ?`).get(siglaLimpa);
  if (jaExiste) return res.status(200).json(jaExiste);

  const r = db
    .prepare('INSERT INTO aeroportos (sigla, cidade_id) VALUES (?, ?)')
    .run(siglaLimpa, cidadeId);

  res.status(201).json(
    db.prepare(`${SQL_LISTA} WHERE a.id = ?`).get(Number(r.lastInsertRowid))
  );
});

export default router;
