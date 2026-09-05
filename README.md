# Voya Co — Sistema da agência

Projeto de portfólio para acompanhamento de uma agência de viagens (clientes, cotações, check-in etc).
Primeira etapa: cadastro e listagem de clientes.

## Navegação e segurança
Cada tela tem seu endereço (`/cotacoes`, `/viagens/3/editar`, e assim por diante), então o botão de voltar do navegador funciona e atualizar a página (F5) não perde o lugar. A aba selecionada vai na URL como `?situacao=` ou `?etapa=`, sem encher o histórico.

O backend escuta apenas em `127.0.0.1`, ou seja, só aceita conexão da própria máquina. Ninguém na mesma rede consegue abrir a API e ler os dados dos clientes. Para acessar de outro aparelho seria preciso remover essa restrição — e, nesse caso, colocar login antes.

## Identidade visual
O sistema usa a paleta da marca: navy, dourado e creme, com títulos em serifa. O selo fica no cabeçalho (`frontend/public/selo.jpg`) e serve também como ícone da aba. Nome e slogan da agência são editáveis em Ajustes.

## Stack
- Frontend: React (Vite) + React Router + CSS puro
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
- Botão de WhatsApp em cada cliente com telefone cadastrado

### Cotações
A cotação é dividida em três abas:

**Aba Cotação** — dados da viagem (cliente, origem, destino, tipo, datas, passageiros) e os trechos com as opções de companhia. A ida pode ser montada por vários trechos, cada um com sua CIA, então POA→GRU pode ser uma companhia e GRU→MAO outra. O destino de um trecho vira automaticamente a origem do seguinte.

**Aba Dados do voo** — só o que não dá para saber pela cotação: horário de saída e chegada, nº do voo, classe (lista, com cadastro de novas) e duração. Um trecho pode ter mais de um voo: "Adicionar conexão neste trecho" inclui o voo seguinte da mesma companhia, formando uma escala vinculada. Origem, destino, data e companhia já vêm da aba anterior. Quando dois trechos seguidos têm companhias diferentes, o sistema marca sozinho como "escala não vinculada". Também é aqui que se escolhe o que está incluído na tarifa.

**Aba Orçamento** — mostra o documento exatamente como o cliente vai receber, com os botões de gerar PDF e baixar Word.

Outros recursos:
- Custo por trecho: (milhas / 1000 x valor do milheiro) + taxa + bagagem. O custo do sentido é a soma dos trechos escolhidos
- Custo e venda são multiplicados pelo número de pagantes. Bebê viaja no colo, não gera passagem e por isso fica fora da multiplicação
- Tempo de voo, tempo de escala e duração total calculados pelos horários, com campo de correção para voos que trocam de fuso
- Cadastros com busca: cidades, aeroportos (a cidade é escolhida da lista, só a sigla é digitada), companhias aéreas e itens da tarifa
- Salvar como rascunho (permite ficar incompleto) ou salvar a cotação completa
- Economia do cliente calculada sobre o preço da internet
- Acompanhamento por situação: Em elaboração, Enviada, Vendida, Cancelada, com contador de dias desde o envio
- Ao marcar como vendida, o sistema grava a data da venda e pede a origem da compra de cada trecho: compra própria (milhas suas ou compra direto na companhia) ou um fornecedor cadastrado. Um atalho aplica a escolha do primeiro trecho a todos. No card fica só o resumo, que expande para mostrar trecho por trecho
- Datas de envio e de venda podem ser corrigidas à mão no card
- Pagamento: o preço de venda é o valor à vista no PIX; o valor no cartão é o preço de venda multiplicado por (1 + taxa), e a parcela é esse total dividido pelo número de parcelas. A taxa é informada em fração decimal (0,096495 = 9,6495%) e vale para aquele número de parcelas
- O banco se atualiza sozinho na inicialização, sem precisar apagar o agencia.db

### Ajustes
Acessível pelo botão fixo no cabeçalho de qualquer tela. Guarda a arte do cabeçalho (imagem enviada pela própria tela, embutida no documento como data URI — ocupa 70% do topo, encostada à esquerda, com os dados do cliente ao lado em Montserrat), além dos textos e valores que aparecem no orçamento: nome e slogan da agência, contato, taxa do cartão (%), número de parcelas, formas de pagamento, por que comprar conosco e aviso do rodapé. O "incluído na tarifa" saiu daqui e passou a ser escolhido em cada cotação.

### Fornecedores
Cadastro de quem fornece as milhas: nome, WhatsApp e observações. Cada card tem botão de WhatsApp. Um fornecedor usado em alguma cotação não pode ser excluído.

### Administrar viagens
Acompanhamento das viagens já vendidas, em cinco etapas: Aguardando Check-in, Realizar Check-in, Check-in Realizado, Em Viagem (só para ida e volta) e Concluído.

A lista é por unidade de check-in, não por viagem. Cada card é um check-in a fazer:
- Ida com escala vinculada (mesma companhia nos dois trechos) = um card só, porque um check-in cobre o percurso todo
- Ida com escala não vinculada (companhias diferentes) = um card por trecho, cada um com seu check-in
- A volta é sempre um card à parte, então marcar o check-in da ida não move a volta de etapa

- Cadastro parte de uma cotação vendida. Cliente, telefone, e-mail, rota, datas e horários vêm dela automaticamente, e a tela mostra quais check-ins serão criados
- Preenchimento manual: quantas horas antes do voo o check-in libera (24 ou 48), um localizador por reserva (voos separados têm reservas diferentes) e observações
- Com mais de um passageiro, o cadastro pede os acompanhantes na quantidade certa. A faixa etária não é escolhida: sai da data de nascimento, pela idade que a pessoa terá no dia do voo — bebê até completar 2 anos, criança até os 16, adulto acima disso. A etiqueta aparece enquanto se digita
- A etapa não é gravada: o sistema calcula pela data do voo, pela antecedência escolhida e pelo check-in marcado, então cada card anda sozinho com o tempo
- Cada card mostra em destaque o nome completo do passageiro titular, mais companhia, localizador e horário de saída — os dados pedidos no check-in
- Quando a cotação tem mais de um passageiro, o cadastro pede os acompanhantes (nome, documento e nascimento). No card, um botão mostra a lista deles
- "Editar bloco" altera só aquele check-in: a antecedência (companhias liberam em prazos diferentes), o localizador da reserva e os horários dos voos, inclusive os da conexão vinculada. Os demais blocos não são afetados
- "Editar viagem" continua para o que é comum: observações e acompanhantes
- O card mostra só o essencial: rota, passageiro, companhia, localizador, saída e quantidade. "Ver detalhes" abre o itinerário completo com as conexões, a liberação do check-in, os acompanhantes e os dados da venda
- Botão que abre o site de check-in da companhia do bloco. O endereço fica cadastrado em cada companhia (Azul, GOL e LATAM já vêm preenchidas)
- "Ver detalhes da venda" mostra data da venda, valor e de quem vieram as milhas, com botão de WhatsApp do fornecedor
- O botão de check-in fica bloqueado até a companhia liberar (pela antecedência escolhida)
- Botão de WhatsApp para falar com o cliente

## Próximos passos
- Relatórios de lucro e cotações por mês
