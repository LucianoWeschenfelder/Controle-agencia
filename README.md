# Agência de Viagens - Controle de Clientes

Projeto de portfólio para acompanhamento de uma agência de viagens (clientes, cotações, check-in etc).
Primeira etapa: cadastro e listagem de clientes.

## Stack
- Frontend: React (Vite) + CSS puro
- Backend: Node.js + Express
- Banco de dados: SQLite (better-sqlite3)

## Como rodar

### 1. Backend
```
cd backend
npm install
npm run dev
```
Sobe em http://localhost:3001 e cria o arquivo `agencia.db` automaticamente.

### 2. Frontend (em outro terminal)
```
cd frontend
npm install
npm run dev
```
Sobe em http://localhost:5173

## Telas
- Tela inicial com menu: Cadastrar clientes, Consultar cadastros, Cotações, Administrar viagens

## Funcionalidades atuais

### Clientes
- Cadastrar, listar (com busca), editar e excluir

### Cotações
A cotação é dividida em três abas:

**Aba Cotação** — dados da viagem (cliente, origem, destino, tipo, datas, passageiros) e os trechos com as opções de companhia. A ida pode ser montada por vários trechos, cada um com sua CIA, então POA→GRU pode ser uma companhia e GRU→MAO outra. O destino de um trecho vira automaticamente a origem do seguinte.

**Aba Dados do voo** — só o que não dá para saber pela cotação: horário de saída e chegada, nº do voo, classe, aeronave e duração. Origem, destino, data e companhia já vêm da aba anterior. Quando dois trechos seguidos têm companhias diferentes, o sistema marca sozinho como "escala não vinculada". Também é aqui que se escolhe o que está incluído na tarifa.

**Aba Orçamento** — mostra o documento exatamente como o cliente vai receber, com os botões de gerar PDF e baixar Word.

Outros recursos:
- Custo por trecho: (milhas / 1000 x valor do milheiro) + taxa + bagagem. O custo do sentido é a soma dos trechos escolhidos, e o total multiplica pela quantidade de passageiros
- Tempo de voo, tempo de escala e duração total calculados pelos horários, com campo de correção para voos que trocam de fuso
- Cadastros com busca: cidades, aeroportos (a cidade é escolhida da lista, só a sigla é digitada), companhias aéreas e itens da tarifa
- Salvar como rascunho (permite ficar incompleto) ou salvar a cotação completa
- Economia do cliente calculada sobre o preço da internet
- Acompanhamento por situação: Em elaboração, Enviada, Vendida, Cancelada, com contador de dias desde o envio
- Pagamento: o preço de venda é o valor à vista no PIX; o valor no cartão é calculado pela taxa configurada
- O banco se atualiza sozinho na inicialização, sem precisar apagar o agencia.db

### Ajustes
Arte do cabeçalho (imagem enviada pela própria tela, embutida no documento como data URI — ocupa 70% do topo, encostada à esquerda, com os dados do cliente ao lado em Montserrat), além dos textos e valores que aparecem no orçamento: nome e slogan da agência, contato, taxa do cartão (%), número de parcelas, formas de pagamento, por que comprar conosco e aviso do rodapé. O "incluído na tarifa" saiu daqui e passou a ser escolhido em cada cotação.

## Próximos passos
- Administrar viagens
- Relatórios de lucro e cotações por mês
