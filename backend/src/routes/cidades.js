import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM cidades ORDER BY nome ASC').all());
});

router.post('/', (req, res) => {
  const { nome } = req.body;
  if (!nome?.trim()) return res.status(400).json({ erro: 'Informe o nome da cidade' });

  const jaExiste = db
    .prepare('SELECT * FROM cidades WHERE UPPER(nome) = UPPER(?)')
    .get(nome.trim());

  if (jaExiste) return res.status(200).json(jaExiste);

  const r = db.prepare('INSERT INTO cidades (nome) VALUES (?)').run(nome.trim());
  res.status(201).json(db.prepare('SELECT * FROM cidades WHERE id = ?').get(Number(r.lastInsertRowid)));
});

export default router;
