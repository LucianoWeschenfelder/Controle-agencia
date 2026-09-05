import express from 'express';
import cors from 'cors';
import './db.js';
import clientesRouter from './routes/clientes.js';
import cotacoesRouter from './routes/cotacoes.js';
import configuracoesRouter from './routes/configuracoes.js';
import ciasRouter from './routes/cias.js';
import aeroportosRouter from './routes/aeroportos.js';
import cidadesRouter from './routes/cidades.js';
import itensTarifaRouter from './routes/itens-tarifa.js';
import viagensRouter from './routes/viagens.js';
import fornecedoresRouter from './routes/fornecedores.js';
import classesRouter from './routes/classes.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use('/api/clientes', clientesRouter);
app.use('/api/cotacoes', cotacoesRouter);
app.use('/api/configuracoes', configuracoesRouter);
app.use('/api/cias', ciasRouter);
app.use('/api/aeroportos', aeroportosRouter);
app.use('/api/cidades', cidadesRouter);
app.use('/api/itens-tarifa', itensTarifaRouter);
app.use('/api/viagens', viagensRouter);
app.use('/api/fornecedores', fornecedoresRouter);
app.use('/api/classes', classesRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Devolve os erros em JSON, para o frontend conseguir mostrar a mensagem certa
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ erro: err.message || 'Erro interno no servidor' });
});

/*
 * Escuta só em 127.0.0.1: o servidor aceita conexão apenas da própria
 * máquina. Sem isso ele responderia a qualquer um na mesma rede, que
 * poderia ler os dados dos clientes sem senha nenhuma.
 */
app.listen(PORT, '127.0.0.1', () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
