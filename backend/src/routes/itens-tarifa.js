import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM itens_tarifa ORDER BY titulo ASC').all());
});

router.post('/', (req, res) => {
  const { titulo, descricao, tem_quantidade } = req.body;
  if (!titulo?.trim()) return res.status(400).json({ erro: 'Informe o título do item' });

  const jaExiste = db
    .prepare('SELECT * FROM itens_tarifa WHERE UPPER(titulo) = UPPER(?)')
    .get(titulo.trim());

  if (jaExiste) return res.status(200).json(jaExiste);

  const r = db
    .prepare('INSERT INTO itens_tarifa (titulo, descricao, tem_quantidade) VALUES (?, ?, ?)')
    .run(titulo.trim(), descricao?.trim() || null, tem_quantidade ? 1 : 0);

  res.status(201).json(
    db.prepare('SELECT * FROM itens_tarifa WHERE id = ?').get(Number(r.lastInsertRowid))
  );
});

export default router;
