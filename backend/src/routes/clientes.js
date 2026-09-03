import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

// Listar clientes (com busca opcional por nome, email ou documento)
router.get('/', (req, res) => {
  const { busca } = req.query;

  let clientes;
  if (busca) {
    const termo = `%${busca}%`;
    clientes = db
      .prepare(
        `SELECT * FROM clientes
         WHERE nome LIKE ? OR email LIKE ? OR documento LIKE ?
         ORDER BY nome ASC`
      )
      .all(termo, termo, termo);
  } else {
    clientes = db.prepare('SELECT * FROM clientes ORDER BY nome ASC').all();
  }

  res.json(clientes);
});

// Buscar um cliente pelo id
router.get('/:id', (req, res) => {
  const cliente = db
    .prepare('SELECT * FROM clientes WHERE id = ?')
    .get(req.params.id);

  if (!cliente) {
    return res.status(404).json({ erro: 'Cliente não encontrado' });
  }

  res.json(cliente);
});

// Cadastrar cliente
router.post('/', (req, res) => {
  const { nome, documento, email, telefone, data_nascimento, endereco, observacoes } = req.body;

  if (!nome || !nome.trim()) {
    return res.status(400).json({ erro: 'Nome é obrigatório' });
  }

  const resultado = db
    .prepare(
      `INSERT INTO clientes (nome, documento, email, telefone, data_nascimento, endereco, observacoes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      nome.trim(),
      documento || null,
      email || null,
      telefone || null,
      data_nascimento || null,
      endereco || null,
      observacoes || null
    );

  const novoCliente = db
    .prepare('SELECT * FROM clientes WHERE id = ?')
    .get(resultado.lastInsertRowid);

  res.status(201).json(novoCliente);
});

// Editar cliente
router.put('/:id', (req, res) => {
  const { nome, documento, email, telefone, data_nascimento, endereco, observacoes } = req.body;

  const existente = db.prepare('SELECT * FROM clientes WHERE id = ?').get(req.params.id);
  if (!existente) {
    return res.status(404).json({ erro: 'Cliente não encontrado' });
  }

  if (!nome || !nome.trim()) {
    return res.status(400).json({ erro: 'Nome é obrigatório' });
  }

  db.prepare(
    `UPDATE clientes SET
      nome = ?, documento = ?, email = ?, telefone = ?,
      data_nascimento = ?, endereco = ?, observacoes = ?
     WHERE id = ?`
  ).run(
    nome.trim(),
    documento || null,
    email || null,
    telefone || null,
    data_nascimento || null,
    endereco || null,
    observacoes || null,
    req.params.id
  );

  const clienteAtualizado = db
    .prepare('SELECT * FROM clientes WHERE id = ?')
    .get(req.params.id);

  res.json(clienteAtualizado);
});

// Excluir cliente
router.delete('/:id', (req, res) => {
  const existente = db.prepare('SELECT * FROM clientes WHERE id = ?').get(req.params.id);
  if (!existente) {
    return res.status(404).json({ erro: 'Cliente não encontrado' });
  }

  db.prepare('DELETE FROM clientes WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

export default router;
