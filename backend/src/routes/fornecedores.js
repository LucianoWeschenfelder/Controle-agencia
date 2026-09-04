import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM fornecedores ORDER BY nome ASC').all());
});

router.post('/', (req, res) => {
  const { nome, whatsapp, observacoes } = req.body;
  if (!nome?.trim()) return res.status(400).json({ erro: 'Informe o nome do fornecedor' });

  const jaExiste = db
    .prepare('SELECT * FROM fornecedores WHERE UPPER(nome) = UPPER(?)')
    .get(nome.trim());

  if (jaExiste) return res.status(200).json(jaExiste);

  const r = db
    .prepare('INSERT INTO fornecedores (nome, whatsapp, observacoes) VALUES (?, ?, ?)')
    .run(nome.trim(), whatsapp?.trim() || null, observacoes?.trim() || null);

  res.status(201).json(
    db.prepare('SELECT * FROM fornecedores WHERE id = ?').get(Number(r.lastInsertRowid))
  );
});

router.put('/:id', (req, res) => {
  const { nome, whatsapp, observacoes } = req.body;
  if (!nome?.trim()) return res.status(400).json({ erro: 'Informe o nome do fornecedor' });

  const existente = db.prepare('SELECT * FROM fornecedores WHERE id = ?').get(req.params.id);
  if (!existente) return res.status(404).json({ erro: 'Fornecedor não encontrado' });

  db.prepare('UPDATE fornecedores SET nome = ?, whatsapp = ?, observacoes = ? WHERE id = ?')
    .run(nome.trim(), whatsapp?.trim() || null, observacoes?.trim() || null, req.params.id);

  res.json(db.prepare('SELECT * FROM fornecedores WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const emUso = db
    .prepare('SELECT COUNT(*) AS total FROM cotacoes WHERE fornecedor_id = ?')
    .get(req.params.id).total;

  if (emUso > 0) {
    return res.status(400).json({
      erro: `Este fornecedor está em ${emUso} cotação(ões) e não pode ser excluído`,
    });
  }

  db.prepare('DELETE FROM fornecedores WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

export default router;
