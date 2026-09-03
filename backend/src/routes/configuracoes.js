import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

// Devolve todas as configurações como um objeto simples
router.get('/', (req, res) => {
  const linhas = db.prepare('SELECT chave, valor FROM configuracoes').all();

  const config = {};
  for (const linha of linhas) {
    config[linha.chave] = linha.valor;
  }

  res.json(config);
});

// Salva várias configurações de uma vez
router.put('/', (req, res) => {
  const upsert = db.prepare(
    `INSERT INTO configuracoes (chave, valor) VALUES (?, ?)
     ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor`
  );

  for (const [chave, valor] of Object.entries(req.body || {})) {
    upsert.run(chave, String(valor ?? ''));
  }

  const linhas = db.prepare('SELECT chave, valor FROM configuracoes').all();
  const config = {};
  for (const linha of linhas) {
    config[linha.chave] = linha.valor;
  }

  res.json(config);
});

export default router;
