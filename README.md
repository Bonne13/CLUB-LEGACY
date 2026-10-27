# DINASTIA FC

Jogo de carreira individual de treinador e gestor, em português, para navegador, com atletas reais, calendário diário e controle financeiro. Sem dependências de execução além de Python 3 e um navegador moderno. Node.js é usado pelos comandos de validação.

## Executar

```sh
cd /workspace/CLUB-LEGACY
npm start
```

O servidor usa a porta 3000. Também é possível executar `python3 -m http.server 3000`. Não é necessário instalar pacotes para jogar.

A carreira é salva com compressão no armazenamento local desse navegador e dessa origem (incluindo porta). Limpar os dados do site remove o progresso. O botão **Exportar carreira** gera uma cópia JSON para preservação; a restauração fica em **Salvamentos → Importar arquivo**, ou na tela inicial.

## Interface e personalização

A criação da carreira tem uma tela exclusiva de escolha de liga e clube. O menu de gestão, o salvamento e as demais páginas só aparecem depois de começar. Carreiras já salvas abrem diretamente no painel.

As cores do menu e dos destaques acompanham o clube escolhido, inclusive após uma mudança de emprego. A prévia da seleção já mostra as cores do clube. As paletas cobrem todos os 397 clubes; os textos dos controles têm contraste calculado para os dois temas.

O botão **Modo claro / Modo escuro** aparece na entrada e no painel. O modo escuro usa uma base azul-marinho. A preferência é salva no navegador separadamente da carreira.

O **Jornal** reúne acontecimentos da simulação: próximos jogos, resultados, contratações, vendas, contratos, promoções da base, lesões, obras, títulos e trocas de treinador. Os filtros **Meu clube**, **Minha liga** e **Meu continente** usam os clubes envolvidos no acontecimento; uma editoria permite selecionar o assunto. As matérias não são notícias do mundo real. Resultados usam o histórico das últimas seis datas, e as demais notícias têm retenção limitada para manter o salvamento leve. Salvamentos anteriores sem artigos continuam compatíveis.

## Versão para baixar

```sh
npm run build:standalone
```

Esse comando gera `../CLUB-LEGACY-jogavel.html`, com estilos, scripts e dados incorporados. É a versão para abrir no navegador sem servidor. Refaça a geração após alterar o jogo. O caminho de saída pode ser personalizado com `python3 scripts/build-standalone.py /caminho/arquivo.html`.

## Hospedar no GitHub Pages

O jogo é um site estático: não precisa de Node.js/Python no servidor, conta do jogador ou banco de dados. Funciona também sob `/CLUB-LEGACY/`. Os saves continuam no navegador de cada pessoa; não são enviados ao GitHub. Para levar uma carreira do HTML baixado para o site, exporte o JSON e importe no site, pois o armazenamento de cada endereço é separado.

### Publicação automática

Envie os arquivos do projeto, incluindo `.github/workflows/pages.yml`, para a branch `main` de `Bonne13/CLUB-LEGACY`. No repositório, abra **Settings → Pages → Build and deployment → Source** e escolha **GitHub Actions**. Se o repositório for privado, a disponibilidade do Pages depende do plano da conta.

Em **Actions → Publicar jogo no GitHub Pages**, execute **Run workflow** ou faça uma atualização na `main`. O fluxo valida o JavaScript, executa os testes, gera `dist/` e publica somente o site e as licenças. O endereço é mostrado no resultado do deploy; para esse repositório, o endereço padrão será `https://bonne13.github.io/CLUB-LEGACY/` quando a publicação terminar. A configuração local não ativa o site sem enviar os arquivos e executar o deploy.

### Publicação manual pelo navegador

Execute `npm run build:pages`. A pasta `dist/` contém `index.html` autossuficiente, `.nojekyll` e as licenças. Pelo site do GitHub, use **Add file → Upload files** e envie o conteúdo dessa pasta para a raiz da branch `main`. Não envie apenas um ZIP: o GitHub não o extrai para servir o site.

Em **Settings → Pages**, escolha **Deploy from a branch**, branch **main**, pasta **/ (root)** e **Save**. Aguarde o GitHub informar a conclusão da publicação. Use uma das duas formas de publicação; o fluxo Actions pressupõe a opção **GitHub Actions** nas configurações.

## Mundo do jogo

São **397 clubes reais em 21 ligas**. Brasil e as cinco maiores ligas europeias têm participantes atualizados pelas fontes de 2026/2026–27; as demais mantêm participantes históricos:

- Europa: Inglaterra, Espanha, Itália, Alemanha, França, Portugal e Países Baixos.
- América do Sul: Brasil, Argentina, Colômbia, Chile, Uruguai, Equador, Peru, Paraguai, Bolívia e Venezuela.
- Outras regiões: MLS (Estados Unidos e Canadá), México, Arábia Saudita e Japão.

Os jogadores gerados foram removidos. O catálogo contém **7.815 atletas reais**, com **341 clubes disponíveis** para novas carreiras. Os 56 restantes têm cobertura insuficiente e ficam bloqueados na criação. Não há preenchimento com nomes inventados.

As referências novas incluem Brasileirão 2026 (02/06/2026), cinco grandes ligas europeias 2026/27 (27/09/2026), MLS 2026 (09/06/2026) e movimentações observadas em Chile, Uruguai, Paraguai e Peru. São compilações públicas com cobertura parcial: estatísticas de jogadores utilizados não garantem todos os reservas, e transferências observadas não constituem elencos completos. Cada clube mostra sua fonte e data. Os demais conservam a base histórica. Nascimentos ausentes, idades desconhecidas e posições estimadas ficam identificados. A carreira começa em 2026; a base não é atualizada ao vivo.

As avaliações de mercado são históricas, convertidas a uma taxa fixa. Valores das compilações SoFIFA são estimativas do jogo. Salários, atributos, caixa, orçamentos e receitas são estimativas da simulação, não dados contratuais ou saldos oficiais. Consulte [data/SOURCES.md](data/SOURCES.md) e a cobertura detalhada em [data/roster-coverage.json](data/roster-coverage.json).

## Dias, semanas e partidas

A barra de avanço aparece **somente em Visão geral** e permite escolher uma quantidade e avançar por **dias ou semanas**. O jogo percorre cada dia, processando jogos de outras equipes, recuperação, treinos e vencimentos financeiros. A simulação **para antes da próxima partida do seu clube ou seleção**, sem inventar um placar para você. Complete a partida em texto ou 2D e continue o período desejado.

**Dia de jogo** fica fora do menu lateral. O botão do cabeçalho aparece quando há partida na data atual; nos dias livres ele fica oculto. Uma temporada não é virada automaticamente: depois do último evento, o jogador pode avaliar propostas e iniciar o próximo ano.

## Financeiro

**Caixa**, **verba de transferências** e **teto salarial semanal** são controles separados. Compras exigem caixa, espaço no limite de transferências e espaço na folha. Renovações e promoções respeitam o limite salarial. A tela Financeiro permite redistribuir verbas entre contratações e espaço salarial adicional, sem criar dinheiro; também permite destinar caixa livre após reservas ao orçamento.

O extrato registra salários, compras, vendas, luvas, patrocínios, TV, bilheteria, premiações, custos operacionais, base, estrutura e realocações de orçamento. Cada registro tem data, valor e saldo após o movimento. Filtros separam entradas, saídas e categorias. O saldo deve sempre corresponder ao saldo de abertura mais os movimentos.

Contratos de patrocínio master, de uniforme e regional possuem valor anual, duração e eventuais bônus por vitória. Os patrocinadores são fictícios do jogo. Parcelas entram a cada 30 dias; substituir um contrato ativo pode cobrar rescisão. Salários são pagos a cada sete dias, inclusive em semanas sem jogo do clube.

## Sistemas jogáveis

- Escolha entre clubes com elenco disponível; escalação em campo com seis formações, funções, instruções e cobradores; condição física e lesões.
- Jogos em texto/estatísticas ou campo 2D ilustrativo, alternáveis durante a partida; pausa, velocidade e conclusão imediata. Retomada de partidas interrompidas.
- Ligas em paralelo, classificação, premiação, calendário, novas temporadas e qualificação continental por desempenho.
- UEFA Champions League e Europa League: 36 clubes e oito jogos de fase de liga; Conference League: 36 clubes e seis jogos. Mandos equilibrados, top 8 às oitavas, 9º–24º nos playoffs.
- CONMEBOL Libertadores: 32 clubes, oito grupos de quatro, seis partidas e os dois primeiros nas oitavas.
- Mata-matas em jogo único e pênaltis em empates. As vagas são simplificadas e distribuídas por posição entre as ligas disponíveis, sem coeficientes, preliminares ou vagas reservadas de campeões. A primeira temporada usa a ordem inicial da base.
- Compra com proposta de valor, salário e duração de contrato; recusas; vendas para outros clubes com orçamento; jogadores sem clube; janelas de negociação; renovações com aumento e luvas; expiração de vínculos.
- Treino técnico, intensivo ou recuperação; evolução limitada pelo potencial; estrutura influenciando desenvolvimento; base com promoção somente com identidades reais confirmadas; não há geração de atletas por temporada.
- Caixa próprio de cada clube, folha semanal, bilheteria, patrocínios, premiações e melhorias de estádio e centro de treinamento.
- Trocas de treinadores de clubes com desempenho ruim, reputação e ofertas para assumir outro clube entre temporadas. O caixa e o elenco pertencem ao clube.

## Calendários: referência e simulação

`calendar-data.js` contém **2.984 confrontos históricos**, com datas de referência, provenientes de [OpenFootball / football.json](https://github.com/openfootball/football.json), disponibilizados sob **CC0**. A licença está em [data/LICENSE.openfootball.txt](data/LICENSE.openfootball.txt). Cada liga tem o endereço de sua fonte no arquivo e na interface.

Há calendários para as sete ligas europeias (2025/26), o Brasileirão (2025) e a Argentina (2025, apenas a primeira fase do primeiro semestre presente na fonte). Os placares da fonte não são importados: os resultados da carreira são simulados.

Ligas cujos participantes continuam compatíveis com a referência podem usar sua sequência histórica. Brasil e as cinco maiores ligas europeias, com participantes novos, usam confrontos gerados para evitar associar partidas de 2025 aos clubes de 2026. As demais ligas sem referência também usam confrontos gerados. As datas da carreira são um calendário unificado simulado, com 38 datas nacionais e 13 continentais; as datas históricas exatas ficam disponíveis em **Calendário → Consultar datas reais da base**. A referência histórica não muda quando a carreira avança de temporada.

Os formatos nacionais são simplificados: turno e returno, exceto Argentina e MLS em turno único. Ligas com quantidade ímpar de clubes têm folgas. Apertura/Clausura, conferências, playoffs nacionais, copas nacionais e acesso/rebaixamento não estão implementados. Nem todas as ligas do mundo estão representadas.

## Salvamentos anteriores

Carreiras v2 são atualizadas para v3 com uma cópia comprimida em `club-legacy-v2-backup`. O capital inicial é recalibrado pelos novos perfis, preservando a variação líquida em relação ao capital inicial anterior. Elencos gerados são substituídos pelos atletas reais; movimentações reconhecidas de atletas reais são mantidas quando a identidade pode ser conciliada. Tabelas, temporada e progresso são preservados. Notícias e transferências anteriores são arquivadas, e o extrato detalhado começa na atualização. Não são inventados gastos passados.

Se o clube anterior não tiver onze atletas confirmados, são oferecidas opções de clubes com base suficiente para continuar. A mudança também atualiza as cores do menu.

A migração de `club-legacy-v1` mantém o original em `club-legacy-v1-backup` e arquiva a classificação anterior em **Carreira**; elenco e finanças são recalibrados para o modelo novo. Se o carregamento falhar, os dados existentes ficam protegidos.

## Validar

```sh
npm run check
npm test
```

Os testes de regras cobrem identidades, calendários de ida/volta e turno único, folgas, contratos, transferências, finanças, escalação, retomada, temporada completa, classificações, torneios, treinadores, migração integridade dos calendários históricos, notícias por escopo, contraste das cores, jogadores reais, pagamentos semanais e mensais, conciliação, orçamentos, migração e compressão.

Para os testes de navegador, com servidor já rodando e Playwright + Chromium disponíveis:

```sh
npm run test:browser
```

O teste usa Chromium em `/usr/bin/chromium`, quando disponível. `CHROMIUM_PATH` permite indicar outro executável, e `CLUB_LEGACY_URL` muda a origem testada. São exercitadas negociações, promoção, estrutura, partidas, troca de visualização, salvamento/retomada, datas históricas, nova temporada, troca de clube, migração e viewport móvel. As capturas são gravadas em `/tmp/club-desktop.png` e `/tmp/club-mobile.png`.

Os fluxos da interface nova podem ser verificados com `npm run test:interface`. Para testar o HTML único, gere-o e execute `LEGACY_STANDALONE=1 npm run test:interface`; o teste fornece apenas o HTML e bloqueia os demais recursos de rede. A abertura pelo protocolo `file://` depende da política do navegador e não é exercitada nesse teste.

O fluxo de financeiro e progressão diária é verificado com `npm run test:economy-browser`, incluindo pagamento de patrocinador, extrato, menus por data, realocação e migração v2 no Chromium.

## Organização

- `world.js`: clubes e ligas do universo.
- `roster-data.js`, `rosters.js`: referências reais e parâmetros dos atletas.
- `finance.js`: perfis, orçamentos, extrato e patrocínios.
- `calendar-data.js`: calendários históricos e fontes.
- `appearance.js`: paletas dos clubes e cálculo de contraste.
- `scripts/build-standalone.py`: geração do arquivo único para distribuição.
- `engine.js`: simulação e regras, compartilhadas pelo navegador e testes.
- `app.js`, `index.html`, `style.css`: interface e persistência local.
- `tests/`: testes de regras e fluxo de navegador.

## Perfil, seleções e arquivos de carreira

Na criação, informe nome, idade e nacionalidade. O perfil pode ser editado em **Carreira**, e a idade avança por temporada. Em **Seleções**, convites de federações chegam de acordo com resultados e reputação. Após aceitar uma oferta, você pode acumular o cargo com o clube, convocar até 23 atletas reais e disputar até seis amistosos anuais (com possíveis folgas) em texto ou 2D. O calendário para antes dos jogos da seleção. Elegibilidade é simplificada pela cidadania da base; Copa do Mundo e eliminatórias ainda não estão implementadas.

Em **Salvamentos**, salve no navegador, baixe um arquivo JSON, importe uma carreira ou exclua o progresso. Também há importação na tela inicial. A importação aceita arquivos exportados anteriormente (JSON direto), o novo envelope e dados CL3 comprimidos. O arquivo é validado antes de confirmar a substituição; um arquivo inválido não altera o save atual. A partida importada volta pausada. A exclusão pede confirmação e limpa a carreira e os backups locais, preservando o tema; arquivos baixados continuam no dispositivo.

**Saves v3 existentes preservam seus próprios clubes, jogadores e transferências.** Para usar os elencos atualizados, exporte sua carreira em **Salvamentos**, exclua o progresso local e crie outra. A referência histórica permanece disponível em ligas sem fonte nova. Fontes, revisões, cobertura e limites estão em [data/SOURCES.md](data/SOURCES.md).

As regras de perfil, convocação e arquivos são cobertas por `npm test`. Execute `npm run test:career-browser` para testar criação, amistoso 2D, convocação, exportação/importação, arquivo inválido, cancelamento, exclusão e recarga no desktop e celular. Após gerar o HTML único, `LEGACY_STANDALONE=1 npm run test:career-browser` repete esses fluxos sem carregar recursos externos. Os módulos `national.js` e `saves.js` concentram as regras correspondentes.

## Campo tático e orçamento em reais (v0.4)

**Dia de jogo** fica fora do menu lateral. O botão contextual do cabeçalho e o convite **Jogar hoje** aparecem quando existe partida na data atual. Partidas antigas inacabadas fora da data são arquivadas ao carregar, preservando o calendário e sem lançar um resultado adicional.

Em **Financeiro**, edite diretamente o limite de transferências e o teto salarial semanal. A prévia compara os valores atuais e propostos; **Aplicar distribuição** atualiza os limites usados nas negociações e o histórico de alterações. O controle deslizante continua disponível para redistribuição. Aumento de verba depende do caixa livre após as reservas; reduzir limites libera reservas. A distribuição mantém o saldo bancário, que varia com recebimentos e pagamentos.

Em **Elenco**, clique em uma posição do campo e escolha o atleta, ou arraste-o para o local. Uma troca entre titulares permuta os dois sem duplicar jogadores. Há seis formações (4-3-3, 4-2-3-1, 4-4-2, 3-5-2, 5-3-2 e 4-1-4-1), funções, tarefas, mentalidade, estilo, pressão, ritmo, largura e linha defensiva. Até nove reservas recebem prioridade no banco planejado. Também é possível editar o plano da seleção, com configurações independentes do clube.

Capitão, vice, cobradores dos dois lados de escanteio, faltas diretas e pênaltis podem ser escolhidos. O motor usa os responsáveis presentes no onze; indisponíveis recebem substitutos automáticos. Os relatos identificam os cobradores e autores dos gols. Adaptação, tarefas e instruções afetam desempenho, chances e desgaste; liderança e atributos específicos de cobrança são estimativas do jogo. O campo 2D passa a usar as coordenadas da formação escolhida. A edição do plano acontece antes do jogo; ele é preservado no save e congelado para a partida iniciada.

`tactics.js` reúne as regras de escalação e especialidades. `npm run test:tactics-browser` verifica o campo com drag/drop, seleção por toque, instruções, persistência, finanças e visibilidade contextual das partidas em desktop e celular. `LEGACY_STANDALONE=1 npm run test:tactics-browser` verifica a versão de arquivo único sem recursos externos.

A página **Elenco** tem duas abas: **Escalação e táticas** para o campo e instruções, e **Jogadores e contratos** para a lista completa, salários, renovações e vendas. A lista só é renderizada quando sua aba está aberta. As abas funcionam por clique, toque e teclado (setas, Home e End).

## Dois modos de carreira (v0.5)

Na tela inicial, escolha **Normal** ou **Teste**. O normal usa os recursos e receitas simulados do clube. O teste libera **Financeiro → Adicionar dinheiro**, com destino para caixa, transferências ou salários. Em transferências, o aporte aumenta caixa e limite de contratações; em salários, aumenta caixa e o teto semanal em 1/52 do aporte. Caixa sozinho mantém os limites existentes. Todos os aportes são identificados no extrato e salvos no arquivo da carreira.

Uma carreira normal pode ativar o modo teste em **Carreira**, mediante confirmação. A identificação **MODO TESTE** permanece nessa carreira, inclusive após exportar/importar. Para voltar a uma carreira normal, crie outra.

`npm run test:current-browser` verifica os dois modos, aportes, persistência, fontes e exclusividade do avanço na Visão geral em desktop/celular. `LEGACY_STANDALONE=1 npm run test:current-browser` verifica o HTML único com todos os recursos externos bloqueados.

## Mercado, negociações e posições (v0.6)

**Transferências** combina nome (com ou sem acentos), liga, posição, nacionalidade, overall mínimo/máximo, idade mínima/máxima e valor máximo. É possível ordenar por overall, idade, valor ou nome e limpar os filtros. Dupla cidadania também conta; atletas sem idade disponível não entram em intervalos etários. A idade aproximada continua identificada.

A **Central de negociações** separa o acordo com o clube do contrato com o atleta. A proposta ao clube recebe resposta após dois dias da carreira, com aceite, recusa ou contraproposta; há até três ofertas por etapa. Depois do acordo, negocie salário semanal, luvas, duração e papel no elenco com o jogador/empresário. A resposta também leva dois dias. Após o aceite, documentação e exames levam mais um dia para concluir a transferência. Jogadores livres seguem diretamente à etapa contratual.

Avance os dias em **Visão geral**. A simulação para ao chegar uma resposta e também antes de seus jogos. Após encerrar a temporada, **Avançar 1 dia de planejamento** mantém negociações, olheiros e recuperação em andamento antes de iniciar o próximo ano. A Central mostra etapa, previsão de resposta, prazo, valores e histórico. É possível encerrar conversas. Contrapropostas e contratos aguardando resposta expiram após dez dias; fechamento da janela e indisponibilidade do jogador encerram propostas pendentes.

As propostas não reservam dinheiro. Na assinatura, caixa, verba de transferências e folha são conferidos novamente. Se faltarem recursos, ajuste o Financeiro e use **Reavaliar recursos**. O dinheiro só é lançado quando o jogador realmente muda de clube; a operação não é repetida ao recarregar. Acordos pendentes e suas datas fazem parte do save.

Foram corrigidos **259 nascimentos ausentes**, por IDs da SofaScore registrados no Wikidata e por perfis oficiais da MLS com o mesmo `player_id`. Ainda há **103 jogadores sem idade verificável**; esses dados ficam identificados, sem inventar datas. A correção é aplicada a carreiras existentes, inclusive a atletas transferidos, preservando contratos, evolução e escalação. Para Messi, por exemplo, a data é 24/06/1987; a idade exibida é calculada na temporada da carreira.

**5.104 atletas** receberam posição principal detalhada de sua identidade Transfermarkt: esquerda/direita, lateral, ala, meia central/ofensivo, ponta e centroavante. O campo informa posição natural, adaptação e overall efetivo naquele local. Vinicius Júnior tem **PE** como natural; ao colocá-lo na **PD**, aparece **Fora da posição**, com redução de 32% no componente posicional de rendimento. O overall base permanece intacto. A redução entra na força usada pela partida e pela escalação automática. Posições secundárias confirmadas mantêm o overall posicional; onde só existe posição geral, o lado fica como não informado. Os percentuais são parâmetros da simulação, não avaliações oficiais.

Execute `npm run test:market-browser` para testar filtros, correção em save anterior, clube/jogador/assinatura, contrapropostas, persistência e o exemplo de Vini no computador/celular. A opção `LEGACY_STANDALONE=1` testa o HTML único com recursos externos bloqueados.

## Gestão, preparação física e partidas (v0.7)

O **salvamento automático comprime o save em um Web Worker**, com coalescência de mudanças e indicador de progresso. Consultas e seleção de posições não salvam a carreira inteira. O salvamento manual continua imediato; a saída da página grava mudanças pendentes. Formato CL3 e importações anteriores permanecem compatíveis. A busca de jogos consulta apenas os compromissos geridos, e o avanço por dias/semanas processa um dia por vez, mantendo a interface disponível e permitindo **Parar avanço**.

**4.017 identidades** receberam overall, potencial e resistência da compilação pública FC26 de 19/09/2025. Conciliação por ID estável ou nascimento e identidade compatíveis; fotos não são incluídas. O restante usa estimativas calibradas, identificadas no jogo. Overalls deixam de depender somente do valor de mercado. A atualização aplica a referência uma vez e preserva a evolução do save; salários e contratos vigentes não são reescritos. As pretensões de novos contratos consideram habilidade e salário de referência, para evitar recomendações irreais por um salário antigo subestimado. Fontes em [data/SOURCES.md](data/SOURCES.md).

**Energia** é o preparo disponível (condição); **desgaste** é a carga acumulada. Resistência, idade, minutos e intensidade afetam cada atleta. Goleiros e reservas não recebem a mesma perda de um jogador de linha que disputou 90 minutos. O desgaste acumulado reduz rendimento, influencia a escalação automática e aumenta o risco de lesão. Na tela **Treinamento**, há carga automática, normal, leve, intensa e descanso de um a sete dias, com previsão de energia, desgaste e recuperação. O descanso dispensa treino e expira automaticamente; o técnico ainda pode escalar o atleta. Jogar consome energia mesmo durante um período de descanso. Atletas lesionados seguem recuperação e não podem receber treino intenso. As projeções são parâmetros da simulação, não orientações médicas reais.

**Olheiros** tem departamentos de mercado e base. Uma missão custa R$ 10 mil/3 dias no mercado ou R$ 5 mil/5 dias na base. Os relatórios procuram atletas reais, compatíveis com caixa, transferências e teto salarial; jovens sem idade conhecida não são sugeridos para a base. Cada resultado mostra nível, potencial, origem, custos e riscos. A disponibilidade e as verbas são conferidas novamente ao negociar. O avanço para ao chegar um relatório.

A mesa de **propostas** exibe valores em reais, pedido estimado, abertura prudente, recomendação do olheiro, salários anuais, luvas e desembolso na assinatura. O vendedor pode ceder em contrapropostas razoáveis, conforme importância, elenco, situação financeira e vínculo; não existe garantia de aceite. Ofertas muito baixas podem irritar ou encerrar a conversa.

**Renovações do próprio elenco** também passam pelo empresário, com prazo, contrapropostas e assinatura posterior. Podem ser negociadas fora da janela de transferências. O papel contratual inclui indispensável, importante, rotação, reserva e promessa e afeta exigências; a soma salarial considera a substituição do salário anterior, sem duplicá-lo. Luvas e alterações entram apenas na assinatura. No elenco, **Camisa** permite números de 1 a 99, únicos entre profissional e base. A numeração da carreira é simulada e editável; transferidos recebem um número livre no destino. Os números aparecem no campo 2D.

As **seleções** enviam convites, após observar resultados e reputação. Seleções mais fortes exigem desempenho maior. Os convites têm validade de 14 dias e podem ser aceitos ou recusados; o início de carreira não oferece seleção livre para escolha. Cargos já aceitos em saves anteriores são mantidos.

O **Calendário** oferece mês, agenda, navegação entre meses e painel da data selecionada. Mostra clube/seleção, partidas, respostas de negociação, relatórios e abertura/fechamento das janelas. A consulta não avança o tempo. O placar dos novos jogos geridos é arquivado; resultados antigos ausentes não são inventados. As janelas mantêm o modelo unificado da carreira, com datas e contagem visíveis, não calendários oficiais de registro de cada federação.

A **central da partida** desacelera passes, finalizações e gols. A bola percorre uma trajetória ligada ao jogador e à origem do chute; o anúncio e o placar do gol aparecem ao completar a jogada. Há relato com destaque, replays, posse, condição ao vivo, pausa automática no intervalo, início manual do segundo tempo e até cinco substituições sem reentrada. Textos e campo 2D são alternáveis; **Concluir partida** continua disponível. A imagem representa o lance produzido pelo motor, sem pretender ser uma simulação física completa.

Títulos de liga e continentais confirmados geram **troféus**, com clube, competição, temporada e treinador. A conquista do usuário abre uma comemoração animada, e o registro permanece na sala de troféus. Não se criam conquistas antigas sem evidência no save. A preferência de movimento reduzido é respeitada.

`npm run test:management-browser` verifica autosave, responsividade de cliques, gol com origem/autor, intervalo, troca, descanso, relatórios, agenda, propostas, convite, camisa, renovação e troféus. `LEGACY_STANDALONE=1` repete o fluxo no HTML único, com recursos externos bloqueados. Os testes de regras cobrem também validade dos convites, negociação abaixo do valor-base, custo de renovações, recuperação por minutos e preservação dos saves.

## Identidade visual e menu (v0.8)

Emblemas originais substituem os escudos oficiais e as siglas na escolha de clube e na identidade do menu. Também aparecem em classificações, confrontos, jornal, calendário, propostas de carreira e troféus. Os 397 clubes atuais têm SVG original local, com geometria própria e cores de identificação; nomes de participantes anteriores continuam associados ao escudo correto ao carregar um save. As seleções usam suas bandeiras. Os arquivos ficam disponíveis offline na versão de arquivo único e no site publicado, com as fontes em [data/SOURCES.md](data/SOURCES.md).

O menu agrupa **Dia a dia**, **Futebol**, **Competições** e **Gestão**, com ícones vetoriais e estado ativo mais legível. A estrutura, o foco e a posição de rolagem são preservados ao trocar de tela. No celular, as opções ficam numa faixa horizontal. Fundos, superfícies, bordas e destaques acompanham a equipe; avisos, finanças e condição física usam cores semânticas com contraste nos modos claro e azul escuro.

Depois de **receber e aceitar um convite**, o menu oferece a alternância **Clube / Seleção**. Seleções, elenco internacional, calendário da seleção e áreas compartilhadas usam as cores da seleção em gestão. Telas exclusivas do clube, como Financeiro, retornam à identidade do clube. A aba de jogadores no elenco internacional mostra os convocados, sem oferecer contratos pagos pelo clube. Os dois times usam suas cores na partida 2D, com alternativa quando os uniformes ficam parecidos. Não há escolha livre de seleção: as regras de convite por mérito continuam em vigor.

`npm run test:identity-browser` verifica escudos, falha de imagem, estabilidade do menu e foco, convites, troca de contexto, temas, convocados, calendário e celular. `LEGACY_STANDALONE=1` verifica o mesmo fluxo com rede bloqueada. `npm test` confere a cobertura, integridade dos arquivos e contraste das paletas de todos os clubes e seleções.

Na **v0.8.3**, posições alternativas confirmadas aparecem como **Habitual**, com o mesmo overall posicional da posição principal. A antiga redução automática de 8% foi removida. Pontas/meias abertos e laterais/alas do mesmo lado também são compatíveis, considerando as alternativas do jogador. Raphinha atua em PE e PD sem essa perda, com referência oficial do Barcelona. ATA é a função de ataque genérica no centro: recebe atacantes móveis e meias ofensivos sem transformá-los em centroavantes. Escolher a função **Centroavante** exige a posição específica CA. As pontas continuam respeitando o lado PE/PD e as posições confirmadas. Os filtros do elenco, mercado e olheiros reconhecem as posições detalhadas e suas famílias, mesmo quando a categoria genérica antiga era diferente. Carreiras existentes recebem a revisão de posições por identidade, sem desfazer evolução, transferências ou escalação. Saves com partida iniciada conservam placar e relógio ao atualizar a força posicional. Condição física e instruções continuam influenciando o desempenho da equipe.


## Campo e gestão detalhada (v0.9)

A central da partida tem placar simétrico e três visualizações: relato, campo 2D e **campo 3D**, com câmeras transmissão, tática aérea e atrás do gol. Jogadores, bola e finalizações seguem os mesmos lances do motor; a animação 3D é estilizada e leve, sem física de contato completa. As trajetórias, o destaque do participante e as marcações também foram melhorados no 2D. O renderizador é liberado ao sair da partida; se WebGL não estiver disponível, a interface retorna ao 2D. O Three.js é distribuído localmente, inclusive no HTML único.

Valores aparecem em reais com separadores brasileiros. Cartões mostram a quantia abreviada e o valor exato, e campos monetários aceitam, por exemplo, **1.000.000** ou **1.000.000,00**, com prévia do valor em reais. Transferências, salários e caixa continuam separados.

**Olheiros** oferece filtros de liga, continente, nacionalidade, posição, faixa etária, overall, preço e salário. Há perfis de titular, potencial e oportunidade; análise rápida (2 dias, 60% do custo), normal (3 dias para mercado ou 5 para base) e detalhada (7 dias, dobro do custo). Custos normais continuam R$ 10.000 no mercado e R$ 5.000 na base. Relatórios mostram confiança, comparação com jogadores da posição, pontos fortes, riscos e custo do primeiro ano. É possível comparar até três atletas e manter uma lista de observação de até trinta. Previsões de negócio são parâmetros da simulação, sem garantia de aceite.

**Treinamento** tem agenda de segunda a domingo e focos individuais, incluindo técnica, finalização, defesa, bola parada, físico e liderança. A carga automática considera a proximidade do jogo. O progresso vem de dias efetivamente treinados e melhora fundamentos gradualmente; descanso, recuperação, lesão e participação na partida não produzem esse progresso. O diário registra sessões e resultados. Energia e desgaste continuam sujeitos às regras físicas existentes.

**Elenco** permite filtrar e ordenar jogadores, alternar tabela/cartões e abrir uma grade de camisas de 1 a 99. Números ocupados ficam identificados e bloqueados; a confirmação preserva a unicidade no profissional e na base. Paletas de clubes como Barcelona, Sevilla, Real Madrid, Liverpool, Manchester City, Flamengo e Palmeiras receberam ajustes, com modo claro e azul escuro e identidade de seleção preservados.

`npm run test:coaching-browser` verifica WebGL real, câmeras, gol, 2D, valores localizados, observação, comparações, treinamento, numeração, save e celular. `LEGACY_STANDALONE=1 npm run test:coaching-browser` repete o fluxo offline com toda requisição externa bloqueada.


## Capitania, navegação e pré-temporada (v0.10)

A escolha automática de capitão usa referências consultadas em 26/10/2026 para **31 clubes e 69 jogadores identificados pelo ID**, respeitando a presença no elenco e no onze em campo. Barcelona usa Raphinha, Pedri, Eric García e Lamine Yamal, com os postos da fonte; Frenkie de Jong não é reintroduzido caso não pertença ao elenco do save. A liderança de Raphinha passa a 94/100. As notas são estimativas do jogo orientadas pela capitania, e não atributos oficiais. Sua escolha manual tem prioridade; o vice assume a ausência do capitão. As fontes ficam acessíveis na tela de escalação e em `data/captains.json`.

A mudança de liderança vale para saves existentes, inclusive planos de partida recuperados, sem reiniciar placar, minuto ou transferências. Não se afirma atualização de capitania para todos os 397 clubes. Onde não há referência confirmada, a seleção automática considera a liderança estimada. `python3 scripts/build-captains.py` regenera o pacote offline a partir das referências revisadas.

**Menu e busca** reúne todas as páginas, também pelo atalho **Ctrl/⌘ + K**, com busca por nome ou assunto e fechamento por Esc. O menu lateral pode ser recolhido no computador. Cabeçalhos, superfícies, controles e espaçamentos foram ajustados nas páginas; os temas do clube e da seleção continuam ativos. Treinamento usa cartões responsivos com carga e foco separados, mantendo a tabela como alternativa com rolagem própria.

Na criação de carreira, **Pré-temporada** é o padrão. Na Europa, o calendário começa em **1º de julho de 2026**, identifica a temporada **2026/27** e deixa 45 dias para preparação antes da primeira rodada de liga. As Américas começam em **1º de janeiro de 2026**, com 24 dias de preparação. Há pausa de inverno no modelo europeu e janelas coerentes com o novo eixo anual. As datas e o espaçamento são um calendário de simulação inspirado nos períodos das regiões; não representam as tabelas oficiais completas de cada federação. O mundo mantém o ciclo compartilhado da carreira.

**Calendário → Marcar amistoso** permite escolher data, adversário por liga e mando de campo. O motor confere os dois clubes, data futura, partidas já marcadas e datas de copas reservadas, exigindo três dias entre jogos. É possível cancelar antes do dia do amistoso. A simulação para na data e permite acompanhar em texto, 2D ou 3D. Preparação gera carga física e receita estimada de bilheteria reduzida, sem alterar pontos das ligas nem gerar bônus de vitória de patrocínio.

**Organizar torneio de pré-temporada** convida três clubes para um quadrangular de pontos corridos: três rodadas separadas por quatro dias, seis jogos no total. A tabela é independente e desempata por pontos, saldo e gols, com critério estável final pelo ID. O vencedor ganha troféu de preparação, sem vaga continental ou premiação inventada. Toda a agenda é validada antes de gravar; pode-se cancelar o torneio inteiro antes de começar. Amistosos, resultados e torneio são preservados no save.

Carreiras antigas mantêm suas datas e resultados. O calendário regional é escolhido ao criar a carreira; a opção **Calendário clássico** preserva a variante com jogos imediatos. Não se volta o tempo de um save existente para acrescentar uma pré-temporada retroativa.

`npm run test:preseason-browser` verifica capitania, treinamento em quatro larguras, navegação nas quinze páginas em desktop/celular, pré-temporada europeia, amistoso e cancelamento, torneio completo, passagem do calendário para janeiro de 2027 e persistência. Use `LEGACY_STANDALONE=1` para testar o arquivo único com rede bloqueada. As suítes anteriores escolhem o calendário clássico e continuam verificando seus fluxos originais.

## Notas, estatísticas e prêmios individuais (v0.11)

**Prêmios** reúne a classificação provisória da Bola de Ouro, melhor goleiro, melhor jogador do campeonato e melhor jogador do mês, além dos resultados confirmados e relatórios das partidas. A tabela apresenta notas médias, minutos, gols, assistências, melhores em campo, defesas, eficiência e jogos sem sofrer gol. Cada candidato tem uma explicação da pontuação. No celular, os candidatos aparecem em cartões. O histórico mantém pódio, clube e período; não há pagamento em dinheiro por esses prêmios.

A **central da partida** mostra notas de 1 a 10 para os dois times, também no modo de relato. O melhor em campo é confirmado no encerramento. Gols e assistências vêm do mesmo lance, e o passe da animação identifica o assistente. Pênaltis e faltas diretas não geram assistência; parte das jogadas individuais também fica sem assistente. Chutes para fora não contam como defesas: chutes no alvo são gols ou bolas efetivamente defendidas. A simulação de passes e ações defensivas considera os participantes e a posse a cada minuto. São eventos do motor, não estatísticas de partidas reais.

As notas de jogadores de linha consideram gols, assistências, chances criadas, passes, recuperações, duelos, resultado e atuação defensiva; defensores têm pesos próprios. As dos goleiros consideram principalmente defesas, proporção de chutes defendidos, gols sofridos e jogos sem sofrer gol. SG exige pelo menos 60 minutos sem sofrer gol enquanto o atleta esteve em campo. Reservas que não entraram não recebem nota; participações inferiores a 20 minutos sem gols, assistências ou três defesas ficam sem nota final. Substituídos mantêm seus minutos e ações. A categoria de goleiros exige minutos efetivamente jogados no gol.

**Bola de Ouro:** considera desempenho pela nota média, gols (2,2 pontos cada), assistências (1,6), regularidade, melhores em campo e contribuição para títulos. O componente de desempenho é `máximo(0, nota média − 5) × 30`; minutos e melhores em campo acrescentam pontos com limites. Liga vale até 30 pontos, Champions 40, Libertadores 35, Europa League 25 e Conference 18, proporcionais aos minutos do atleta no clube campeão naquela competição. Um reserva sem participação não ganha pontos pelo simples vínculo com o vencedor; transferências preservam a contribuição realizada. A fórmula é a mesma para todas as identidades, sem escolher vencedores por nome ou overall.

**Melhor goleiro:** usa a média das atuações no gol, defesas (0,16 cada), jogos sem sofrer gol (2,6), proporção de defesas e taxa de gols sofridos por 90 minutos, além de regularidade e títulos. Gols e assistências não somam o componente de produção nesse prêmio. A pontuação total tem piso zero. Os prêmios anuais exigem dez jogos avaliados e 900 minutos e são confirmados ao fechar a temporada da carreira, inclusive no ciclo europeu 2026/27; não reproduzem o calendário nem o voto oficial da France Football.

**Melhor do campeonato:** utiliza somente a atuação naquela liga ou copa, com pelo menos três jogos e 180 minutos. É confirmado depois da definição do campeão, incluindo a final. **Melhor do mês:** utiliza somente as partidas oficiais daquele mês civil e competição, com pelo menos dois jogos e 120 minutos, sem bônus de títulos. É anunciado na mudança do mês; o último mês também é fechado ao terminar a temporada. Não há vencedor se faltar a amostra mínima. Desempates usam pontos, média, gols e ID estável.

Amistosos de clubes, torneios de preparação e amistosos internacionais recebem notas e melhor em campo, mas não alimentam os rankings oficiais, mensais ou anuais. Clubes controlados pela IA usam o mesmo motor de eventos e avaliação. Jogos anteriores à atualização não são reconstruídos: saves existentes começam o acompanhamento na data em que forem atualizados. Partidas antigas recuperadas no meio do jogo contam apenas os minutos observados depois disso, preservando placar e calendário.

Totais, prêmios e últimas 60 partidas geridas acompanham o save. Os rankings são reiniciados na próxima temporada, mantendo as premiações e resumos de até cinco temporadas anteriores. O histórico de prêmios tem limite de 2.000 registros. Uma temporada inteira foi verificada com save comprimido abaixo da cota de armazenamento do navegador. Importações validam limites, contagens e períodos dos novos dados.

`npm run test:performance-browser` acompanha um jogo, verifica notas e melhor em campo e completa uma temporada no motor do navegador, incluindo premiações, goleiros, critérios, histórico, paginação, desktop/celular e persistência após começar a temporada seguinte. `LEGACY_STANDALONE=1` verifica o HTML único com rede externa bloqueada. Os testes de regras também conferem autoria de assistências, defesas, substituições, amostra mínima, separação de períodos, títulos por participação, ausência de crédito em duplicidade e saves anteriores.

## Imprensa fictícia e critérios de premiação (v0.14)

O Jornal usa nove redações fictícias: Gazeta Dinastia, Panorama 90, Tribuna del Balón, Línea de Fondo, Horizonte Fútbol, The Touchline Chronicle, Goalfield Review, Le Onze Imaginaire e Mercato Orbital. Os oito jornalistas são personagens inventados. Não há nomes, perfis ou links de veículos e jornalistas reais no catálogo editorial. As reportagens são geradas pelos acontecimentos da carreira, com a autoria do personagem ou da redação fictícia. Filtros por jornal, jornalista, texto, região e assunto continuam funcionando, assim como os saves anteriores.

Os critérios de Bola de Ouro continuam inspirados na referência oficial dos três pilares: desempenho individual, resultados coletivos e classe/fair play. Os pesos são próprios do jogo. Gol da vitória vale 1,5 ponto, assistência nesse gol vale 1 e destaque no mata-mata continental vale 3, com teto de 20 pontos para atuações decisivas. Cartões oficiais acompanhados reduzem fair play. Prêmios já entregues e dados anteriores são preservados.

`data/press.json` documenta a imprensa fictícia e, separadamente, a referência dos critérios. `python3 scripts/build-press.py` regenera o catálogo offline. `npm run test:press-browser` verifica autores fictícios, filtros, busca, diretório, premiações, temas, celular e persistência.

## Cartões e sanções (v0.13)

O motor acompanha faltas, amarelos, segundo amarelo, vermelho direto e conduta violenta, tanto nos jogos geridos quanto nos jogos da IA. Pressão alta aumenta o risco. Os incidentes usam uma sequência determinística própria, preservada ao salvar, sem consumir o gerador dos lances de gol.

O expulso sai das jogadas e dos campos 2D e 3D; não pode ser substituído, cobrar bolas paradas ou continuar acumulando minutos, gols e desgaste. Se o goleiro for expulso, um atleta de linha o cobre até uma substituição válida. Com menos de sete jogadores, o jogo termina com placar administrativo, sem inventar gols individuais. A carga física dos jogos da IA considera os minutos efetivos.

**Disciplina** mostra suspensões por competição, cartões da temporada, pendurados e histórico do clube. Elenco e escalação sinalizam a indisponibilidade e impedem escalar suspensos. Penas são cumpridas nos próximos jogos da mesma competição, independentemente de o atleta estar no banco ou lesionado. Dias corridos, amistosos e outras competições não cumprem uma pena oficial. Transferências mantêm a sanção; a temporada seguinte zera o acúmulo de amarelos, mantendo penas pendentes.

Regras simplificadas desta simulação: Brasileirão suspende a cada três amarelos; outras ligas, a cada cinco; competições continentais, a cada três. Segundo amarelo gera um jogo; vermelho direto, dois; conduta violenta, três. Os amarelos da expulsão também contam no acumulado, e as penas se somam quando há dois motivos. Amistosos têm cartões e expulsões apenas naquela partida. Esses perfis não reproduzem integralmente os regulamentos oficiais.

Cartões reduzem a nota individual: −0,15 por amarelo e −0,7 pela expulsão, com −0,3 adicional no vermelho direto. Nas premiações oficiais, fair play desconta −0,15 por amarelo, −1,25 adicional por expulsão com dois amarelos e −2,5 por vermelho direto; o desconto tem teto de 20 pontos por apuração. Notas e fair play aparecem nos detalhes. Prêmios já entregues são preservados e cartões anteriores não são reconstruídos.

`npm run test:discipline-browser` verifica expulsões no 2D/3D, substituições, sanções, escalação, jornal, critérios, temas, celular e persistência. `LEGACY_STANDALONE=1` verifica o arquivo único com a rede bloqueada. Os testes de regras incluem acúmulo e cumprimento por competição, idempotência, troca de temporada, transferência, goleiro expulso, placar administrativo, IA, fair play e validação dos saves.


## Navegação simplificada e identidade original (v0.14)

O projeto se apresenta como **Dinastia FC**. O repositório e as chaves internas de armazenamento mantêm a compatibilidade com as carreiras anteriores. O menu lateral passou de 17 entradas para oito:

| Menu | Abas internas |
| --- | --- |
| Visão geral | Resumo e avanço do tempo |
| Jornal | Notícias e filtros de cobertura |
| Calendário | Agenda, amistosos e pré-temporada |
| Elenco | Escalação, jogadores, treinamento, base e disciplina |
| Transferências | Mercado e olheiros |
| Competições | Campeonatos e prêmios/estatísticas |
| Carreira | Treinador, troféus, seleções e salvamentos |
| Clube | Estrutura e financeiro/patrocínios |

Uma única aba carrega por vez. Os links antigos dentro das páginas levam à seção correta, e o menu principal indica o grupo ativo. O menu lembra a última seção visitada durante a sessão. A busca por Ctrl/⌘+K pesquisa todas as funções; setas, Home e End percorrem as abas pelo teclado. No celular, as abas deslizam horizontalmente sem alargar a página. Ações de navegação não avançam datas nem movimentam dinheiro.

Foram substituídas as 415 identidades de escudos, incluindo clubes de saves antigos, por SVGs originais, com fundo exterior transparente e margens para evitar cortes. Os arquivos oficiais foram removidos do catálogo e dos ativos distribuídos. As bandeiras dos países foram mantidas. `npm run build:badges` gera o catálogo sem buscar imagens externas. Desenhos originais não equivalem a uma declaração de licença de nomes ou de marcas.

O arquivo `netlify.toml` configura o comando `npm run build:pages`, pasta `dist` e Node 22. No painel do Netlify, o projeto deve estar conectado a Bonne13/CLUB-LEGACY, com produção na branch main e publicações automáticas habilitadas. Após essa conexão, os pushes para main geram o mesmo site em https://dinastiafc.netlify.app/ . A versão GitHub Pages mantém o endereço anterior.

`npm run test:navigation-browser` verifica os oito menus, agrupamentos, teclado, busca, identidade original, redações fictícias, temas, telas pequenas e continuidade do save. `LEGACY_STANDALONE=1` faz a mesma verificação com rede bloqueada.
