import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM cias ORDER BY nome ASC').all());
});

router.post('/', (req, res) => {
  const { nome, codigo, url_checkin } = req.body;

  if (!nome || !nome.trim()) {
    return res.status(400).json({ erro: 'Informe o nome da companhia' });
  }

  const jaExiste = db
    .prepare('SELECT * FROM cias WHERE UPPER(nome) = UPPER(?)')
    .get(nome.trim());

  if (jaExiste) return res.status(200).json(jaExiste);

  const r = db
    .prepare('INSERT INTO cias (nome, codigo, url_checkin) VALUES (?, ?, ?)')
    .run(nome.trim(), codigo?.trim() || null, url_checkin?.trim() || null);

  res.status(201).json(
    db.prepare('SELECT * FROM cias WHERE id = ?').get(Number(r.lastInsertRowid))
  );
});

router.put('/:id', (req, res) => {
  const { nome, codigo, url_checkin } = req.body;
  if (!nome?.trim()) return res.status(400).json({ erro: 'Informe o nome da companhia' });

  const existente = db.prepare('SELECT * FROM cias WHERE id = ?').get(req.params.id);
  if (!existente) return res.status(404).json({ erro: 'Companhia não encontrada' });

  db.prepare('UPDATE cias SET nome = ?, codigo = ?, url_checkin = ? WHERE id = ?')
    .run(nome.trim(), codigo?.trim() || null, url_checkin?.trim() || null, req.params.id);

  res.json(db.prepare('SELECT * FROM cias WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM cias WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

export default router;
