# Fontes e critérios dos dados

## Base atual: 2026 / 2026–27

A revisão `current-2026-v1` contém **7.815 atletas reais** em 397 clubes. **341 clubes** têm pelo menos onze profissionais; 56 ficam indisponíveis para iniciar carreira. Não há preenchimento com nomes gerados. O relatório por clube está em `data/roster-coverage.json`. Consulta/importação em 23/10/2026; isso não significa que todos os vínculos representem essa data.

| Cobertura | Fonte pública e revisão fixa | Referência e limite |
| --- | --- | --- |
| Brasileirão, 20 clubes | [wiUl/scrapping-brasileirao-sofascore](https://github.com/wiUl/scrapping-brasileirao-sofascore/tree/215c7a31f5645bcbebebfd0d7f4acd37f1a28b35), `data/brasileirao_2026_player_stats.csv` | Publicado em 02/06/2026. Estatísticas de atletas utilizados; não garante todos os reservas. |
| Inglaterra, Espanha, Itália, Alemanha e França, 96 clubes | [payamhabibi/Football_Players_Stats_2026-2027](https://github.com/payamhabibi/Football_Players_Stats_2026-2027/tree/846fbca183be1ec2fae294c3d175ea29c7008894), `data/players_data-2026_2027.csv` | Commit de 27/09/2026; estatísticas 2026/27, cobertura parcial do começo da temporada. |
| MLS, 30 clubes | [Leomgama/mls-2026-scout-report](https://github.com/Leomgama/mls-2026-scout-report/tree/dde6ecd4adfed441c5711c5ad8843b75757855ad), `mls_2026_all_players_master.csv` | A documentação da fonte informa coleta em 09/06/2026. |
| Movimentações de Chile, Uruguai, Paraguai e Peru, inclusive destinos em outras ligas | [Joao1531/south-american-transfers-analysis](https://github.com/Joao1531/south-american-transfers-analysis/tree/05f62f8614bad126cd6bcc62043f0002a60b5d72), `data/processed/` | Último vínculo observado, com corte em 23/10/2026. O commit é de 12/10/2026. Transferências futuras são ignoradas. Não representa um censo completo de elencos. |

146 clubes têm uma referência estatística nova; outros recebem atualizações parciais de transferências. Os demais preservam uma base histórica, explicitamente identificada na interface. Um clube parcialmente atualizado pode conservar atletas históricos não abrangidos pela fonte nova. Datas de transferência representam o último movimento observado, não confirmação de permanência em outubro.

Brasil e as cinco grandes ligas europeias têm os participantes ajustados aos nomes dessas fontes. Uma carreira nova começa em 2026. Calendários da carreira são simulados; não se atribuem confrontos históricos a clubes promovidos novos. Saves v3 anteriores preservam seus nomes de clubes, jogadores, transferências e progresso; a base nova é aplicada ao criar outra carreira.

## Identidade, idade e posição

A importação usa identificadores estáveis quando disponíveis. A conciliação com o catálogo anterior exige nome inequívoco, nascimento compatível quando fornecido e contexto de clube para desambiguar. Similaridade de palavras sem nascimento não basta. Registros ambíguos com múltiplos clubes no mesmo snapshot (32 europeus e dois atletas da MLS) não recebem um destino arbitrário. Movimentações antigas não acrescentam ausentes a um snapshot posterior do clube.

IDs preservam a origem: `tm-`, `sf-`, `ss-`, `fb-` e `mls-`. A origem do vínculo, data e caráter parcial são mantidos. A importação de atletas não baixa fotos nem escudos; o catálogo visual separado está descrito abaixo.

Nascimento conhecido é preservado. Quando existe apenas ano ou idade histórica, a idade é aproximada. Sem referência suficiente, a interface mostra **Não informada**; o motor usa um parâmetro interno, sem apresentá-lo como dado real. Parte das posições brasileiras é estimada a partir das estatísticas e marcada **est.**; posições gerais de outras fontes podem ser complementadas por referências históricas. Elegibilidade de seleções é simplificada pela cidadania disponível, sem verificar vínculos oficiais FIFA. A base oferece 46 seleções elegíveis, até seis amistosos simulados por ano e folgas em calendários ímpares.

## Base histórica preservada

[salimt/football-datasets](https://github.com/salimt/football-datasets/tree/da9227e1f42baf74561324290dbf1ad2e3c00edd), revisão `da9227e1f42baf74561324290dbf1ad2e3c00edd`:

- `datalake/transfermarkt/player_profiles/player_profiles.csv`: identificador, nome, nascimento, posição, clube, cidadania e fim de contrato.
- `datalake/transfermarkt/player_latest_market_value/player_latest_market_value.csv`: avaliação histórica e data, até setembro de 2025.
- `datalake/transfermarkt/team_details/team_details.csv`: identidade dos clubes.

Complementos históricos de SoFIFA: `2019/data.csv` e `2021/data.csv` de [amanthedorkknight/fifa18-all-player-statistics](https://github.com/amanthedorkknight/fifa18-all-player-statistics/tree/dfa2c55b08f9c9dd0fb26e5db9585e026bf263a7), e `data/FIFA23_official_data.csv` de [anselmoaxo/dataset-fifa23](https://github.com/anselmoaxo/dataset-fifa23/tree/ad01b925859ddf412d47856ce05d04ba4944dbf2). São identidades e vínculos antigos, não elencos atuais; alguns atletas podem estar aposentados. Preços SoFIFA são parâmetros estimados, sem `referenceValueEuro`. Não se usam identidades brasileiras genéricas dessas edições.

## Nascimentos complementares e posições detalhadas (24/10/2026)

`player-bios.json` mantém 259 correções, com data de nascimento, URL, data da consulta e prova de identidade. 115 usam a propriedade **P12302 (Sofascore player ID)** do [Wikidata](https://www.wikidata.org/) e **P569** com precisão de dia; datas conflitantes não são aplicadas. 144 vêm de perfis públicos de [MLSsoccer.com](https://www.mlssoccer.com/players/), aceitos somente quando o `player_id` principal da página coincide exatamente com o identificador importado. O nome ou a URL, sozinhos, não confirmam a identidade. A idade mostrada no perfil atual não é copiada: usa-se a data de nascimento para calcular a idade na temporada da carreira.

Cidadanias complementares usam o Wikidata **P27**, com a mesma identidade confirmada; para perfis MLS, a URL **P2398** e o nascimento também precisam coincidir. O campo oficial **National Team**, quando presente, serve como nacionalidade de referência simplificada, não como prova de todas as cidadanias. Esses casos mantêm a origem do campo. Wikidata disponibiliza seus dados estruturados em CC0. Os perfis MLS fornecem somente fatos biográficos; imagens e conteúdo editorial não são copiados.

Restam **103 registros sem nascimento ou idade verificáveis**, explicitamente identificados na interface. A correção não inventa datas, não muda IDs, nem recoloca jogadores nos clubes anteriores. Saves existentes recebem nascimento/idade e posições faltantes ao carregar, sem desfazer evolução, transferências ou contratos.

`player-positions.json` contém a posição principal específica e o pé de 5.104 identidades já existentes, vinculadas por ID à revisão Transfermarkt descrita acima. Não se deduz a posição do jogador apenas por seu pé dominante. São referências históricas de posição principal, sem alegar um levantamento completo de posições alternativas em 2026. O motor aceita alternativas quando houver dados, mas não fabrica posições secundárias para preencher lacunas.

`python3 scripts/apply-player-bios.py` incorpora esses dois arquivos factuais em `roster-data.js`. O atualizador de elencos também os preserva. Adaptação, queda de overall efetivo e preferência por posições na escalação são regras de `tactics.js`, não números fornecidos pelas fontes. Posições principais e alternativas confirmadas recebem fator 1, sem redução automática do overall por serem alternativas. Improvisações dependem da distância entre as posições e o lado; PE → PD recebe 0,68 quando não há habilitação para o corredor direito (PD/MD) entre as posições confirmadas do atleta.

Na revisão `positions-2026-10-v2`, Raphinha mantém PE como principal histórica e recebe PD como alternativa confirmada pelo [perfil oficial do Barcelona](https://www.fcbarcelona.com/en/football/first-team/players/24156/raphael-dias-belloli), cujo dado estruturado informa **Right Winger**, Raphael Dias Belloli e nascimento em 14/12/1996. Consulta em 26/10/2026; evidência em `secondarySources`. Ambas as pontas mantêm o overall posicional. Isso não atribui automaticamente a posição específica de centroavante ao atleta. Na tática, o papel genérico ATA admite perfis de ataque e meias ofensivos no centro sem penalidade de posição; é uma regra de simulação, não um dado biográfico adicional. A função Centroavante mantém a avaliação específica CA, e as pontas mantêm a avaliação de lado PE/PD.

Os 4.017 perfis conciliados da referência FC26 também usam as posições válidas de escalação no clube/seleção do mesmo CSV, além de `player_positions`; rótulos de banco ou reserva são descartados. São fatos históricos da mesma referência, sem preencher alternativas por pé dominante, lado simétrico ou semelhança nominal. O modelo também trata PD/MD, PE/ME, LD/AD e LE/AE como corredores compatíveis do mesmo lado, sem penalidade posicional, usando tanto a posição principal quanto as alternativas. Essa equivalência é uma regra de simulação; não acrescenta posições biográficas nem habilita automaticamente o lado oposto. A regra de posições habituais beneficia todos os atletas com alternativas confirmadas na base, incluindo os que já tinham suas alternativas preenchidas em saves anteriores. A atualização substitui metadados de posição conhecidos por ID e revisão, preservando transferência, salário, contrato, evolução e escalação. Partidas em andamento atualizam a força posicional sem reiniciar placar, relógio ou relatos.

## Reprodução da atualização

`scripts/update-current-rosters.py` parte dos snapshots versionados `data/roster-baseline-2025.json` e `data/world-baseline-2025.json`. Os arquivos brutos externos não ficam no repositório. Coloque os arquivos das revisões acima em uma pasta de cache, com os nomes:

- `legacy-player_profiles.csv`, `legacy-player_latest_market_value.csv`.
- `legacy-current-br-stats`, `legacy-current-eu-stats`, `legacy-current-mls-stats`: CSVs da tabela.
- `legacy-current-sa-transfers`, `legacy-current-sa-profiles`: JSONs `canonical_transfers.json` e `player_profiles.json` de `data/processed/` (Chile).
- `legacy-current-{peru,paraguay,uruguay}-canonical_transfers.json` e `legacy-current-{peru,paraguay,uruguay}-player_profiles.json`: JSONs das subpastas correspondentes.
- Opcionais: `legacy-fifa2019.csv` e `legacy-fifa2021.csv`, para complementar referências históricas de idade e posição.

Execute `python3 scripts/update-current-rosters.py --cache /caminho/cache`. Isso gera `roster-data.js`, o bloco de participantes de `world.js` e a cobertura JSON. O jogo executa offline com os arquivos gerados; não consulta APIs durante a carreira. Os scripts antigos `import-rosters.py` e `supplement-rosters.py` recriam somente o baseline histórico e não devem sobrescrever a revisão atual.

## Valores monetários e atributos

Avaliações históricas em euros são convertidas por **R$ 6,20/€**, taxa fixa de simulação. Não houve consulta a preços atuais oficiais. Valores ausentes são modelados pela referência do clube; valores antigos e dados oriundos de estatísticas recentes continuam sinalizados como estimativas. O campo original `referenceValueEuro` fica disponível quando há referência monetária pública conhecida.

Salários, potencial, atributos, prazos contratuais estimados, caixa inicial, orçamento e receitas são parâmetros do jogo, não contratos ou balanços oficiais. Uma fonte nova de pertencimento ao clube não prova as condições do novo contrato. Patrocínios usam marcas fictícias.

Salários são pagos a cada sete dias; patrocínio, TV e operação a cada trinta. Bilheteria e premiações acompanham eventos. Transferências são fluxo integral de caixa, sem amortização contábil. No modo teste, aportes manuais ficam explicitamente separados no extrato e alteram o caixa e a verba escolhida; o modo normal não aceita esses aportes.

## Calendários e compressão

OpenFootball / football.json (CC0): 2.984 confrontos históricos de nove ligas, referências de 2025/2025–26. Fontes em `calendar-data.js`, licença em `LICENSE.openfootball.txt`. Os nomes históricos permanecem na consulta; as datas da carreira seguem calendário unificado simulado. Ligas com participantes diferentes geram seus confrontos.

LZ-String 1.5.0, MIT, em `vendor/lz-string.js`; licença em `vendor/LICENSE.lz-string.txt`. Não é necessária rede para jogar ou salvar.

## Habilidades e resistência: referência FC26

[ismailoksuz/EAFC26-DataHub](https://github.com/ismailoksuz/EAFC26-DataHub/tree/8724af5803a787c9c262eee2ac8f942651b0e4b9), arquivo `data/players.csv`, revisão fixa `8724af5803a787c9c262eee2ac8f942651b0e4b9`. A compilação traz atualização FC26 de **19/09/2025**, não avaliações ao vivo de outubro de 2026. Foram conciliadas **4.017 identidades**, por ID SoFIFA estável ou nascimento exato e nome/legal compatíveis; candidatos ambíguos são descartados. São usados overall, potencial, resistência e posições. Nenhuma imagem, rosto, escudo ou ativo visual do produto é distribuído.

`data/player-ratings.json` preserva origem, revisão, data e ID de cada referência. O jogo usa posições secundárias dessa fonte quando a identidade foi conciliada. `python3 scripts/import-ratings.py --players /caminho/players.csv --profiles /caminho/player_profiles.csv` reproduz a conciliação; `scripts/apply-player-bios.py` incorpora o resultado ao catálogo offline.

Avaliações ausentes são estimadas, com calibrações explícitas para alguns atletas, e marcadas **Estimativa do jogo**. Não se declara cobertura oficial de todos os brasileiros ou atualização completa de 2026. A nova revisão preserva o crescimento acumulado ao migrar saves e não sobrescreve salários/contratos vigentes. Pretensões de negociação têm um piso modelado por habilidade, contexto e referências salariais; não são demandas contratuais reais verificadas.

## Escudos e bandeiras (26/10/2026)

`data/badges.json` registra **415 identidades de clubes**, cobrindo os 397 participantes atuais e 18 nomes de participantes anteriores, e **53 bandeiras de seleções**. Cada registro contém nome, fornecedor, identificador, URL e SHA-256 do arquivo. As imagens ficam em `assets/badges/`; não são carregadas de terceiros durante a carreira. O HTML único e o site publicado incorporam o catálogo uma única vez.

Os escudos vêm de miniaturas públicas do Transfermarkt, conciliadas com os IDs do baseline e com `team_details`/`player_profiles` da revisão histórica acima. Nomes abreviados diferentes têm aliases revisados explicitamente. Complementos usam o catálogo de equipes da ESPN e suas miniaturas de 80 px, com identificador e endpoint registrados. Yaracuyanos usa o arquivo [Yaracuyanos FC.png](https://en.wikipedia.org/wiki/File:Yaracuyanos_FC.png), identificado na [página do clube](https://en.wikipedia.org/wiki/Yaracuyanos_F.C.). Bandeiras usam as imagens de 80 px do [Flagcdn](https://flagcdn.com/). Os desenhos são preservados; não há mudança de cores dos escudos nem uso de imagens do EA FC. Marcas pertencem aos respectivos titulares; a inclusão não declara licença ou parceria oficial.

O vínculo visual usa o nome do clube, sem depender apenas da posição na liga: uma carreira antiga com Ceará não recebe o escudo do Athletico que ocupa sua vaga no catálogo novo. Identidades desconhecidas ou imagens indisponíveis usam um pequeno escudo neutro nas cores da equipe. Bandeiras identificam seleções; não são apresentadas como escudos oficiais de federações.

`python3 scripts/import-badges.py` baixa arquivos ausentes, verifica os formatos e gera `badges-data.js`. `--refresh` baixa novamente as mesmas URLs. Os hashes versionados documentam a cópia distribuída, sem alegar que as URLs dos fornecedores sejam imutáveis. O build incorpora os arquivos locais sem depender dessas URLs.

Energia, carga acumulada, recuperação, risco de lesão, observação de atletas, tolerância a propostas, convites de federações e papéis no elenco são regras da simulação. Números de uniforme são atribuídos pela carreira e podem ser editados; não constituem uma base oficial de camisas atuais. Janelas de transferência seguem os dias da temporada unificada, com datas explícitas na interface. A animação do campo deriva do autor e da trajetória de cada evento gerado, sem imagens reais de partidas.


## Renderização 3D e regras de gestão (v0.9)

[Three.js 0.160.1](https://github.com/mrdoob/three.js/tree/r160), licença MIT, distribuído em `vendor/three.min.js` com `vendor/LICENSE.three.txt`. Campo, arquibancadas, jogadores e bola são formas procedurais do próprio jogo; não são modelos, texturas ou animações extraídos de EA FC ou Football Manager. O renderizador acompanha eventos do motor local, sem pretender reproduzir física completa de futebol. A cópia local não exige CDN ou rede durante a partida.

Focos e ganhos de treino, confiança dos relatórios, perfis de contratação e comparações de elenco são parâmetros da simulação. A lista de observação usa identidades reais já presentes no catálogo; não amplia a cobertura oficial dos dados nem inventa atletas. O custo do primeiro ano é uma estimativa de transferência, luvas e 52 salários semanais, não um balanço contábil oficial.


## Capitania: consulta de 26/10/2026

`data/captains.json` registra o clube, ID estável dos atletas, posto de capitania, endereço da página de referência e data da consulta: **31 clubes e 69 identidades presentes no catálogo**. As hierarquias vêm das seções de elenco atuais das páginas de clubes na Wikipedia em inglês; links ficam registrados individualmente. São dados publicados nessas referências, não uma alegação de cobertura oficial ou atualizada de todos os clubes. A [notícia do próprio Barcelona sobre Raphinha](https://www.fcbarcelona.com/en/football/first-team/news/4598953/raphinha-scores-again) o identifica como capitão no relato do Clásico. O artigo da Wikipedia do clube o lista como capitão, Pedri como vice, Eric García como terceiro e Lamine Yamal como quinto. Postos não presentes no elenco do jogo não são preenchidos por atletas gerados nem por homônimos.

A liderança atribuída (de 84 a 94 antes do treino) é uma regra da simulação, orientada pelo posto da referência. Não é uma nota extraída de Football Manager, EA FC ou da fonte de capitania. Capitães conhecidos mantêm essa referência pessoal se transferidos, mas a braçadeira automática do destino usa a hierarquia do próprio clube ou a escolha do treinador. As fontes não são consultadas ao carregar a carreira; o pacote é local e pode ser reproduzido com `scripts/build-captains.py`.

O novo eixo de calendário usa início regional e preparação em 2026/27, com datas simuladas. Não há importação de calendários oficiais 2026/27 completos. Amistosos e quadrangulares são compromissos criados pelo usuário, com atletas reais já existentes; nomes de torneios personalizados não representam competições reais licenciadas.

## Avaliações e premiações da simulação (v0.11)

Notas de partidas, gols, assistências, chutes no alvo, defesas, eficiência, jogos sem sofrer gol, ações defensivas e passes são produzidos pelo motor local a partir dos jogos da carreira. Não são dados esportivos históricos importados nem notas oficiais de EA FC ou Football Manager. Os candidatos usam as identidades reais já presentes no catálogo, inclusive quando são transferidos; o sistema não gera atletas para premiações.

A Bola de Ouro, os prêmios de goleiro, de melhor em campo, do mês e do campeonato usam fórmulas próprias de desempenho e amostra mínima, documentadas no README e na interface. Não representam votações reais, resultados oficiais da France Football ou um serviço de dados ao vivo. A temporada europeia pode atravessar o ano civil; a premiação anual do jogo encerra o ciclo da carreira. Títulos de preparação e amistosos não pontuam para os rankings oficiais.

Não se atribuem estatísticas a jogos anteriores à implantação. Em saves atualizados, apenas novos lances observados são contabilizados, inclusive no restante de uma partida recuperada. O sistema usa os mesmos eventos para texto, 2D, 3D e jogos simulados da IA.

## Imprensa e referência dos critérios da Bola de Ouro (26/10/2026)

`data/press.json` registra nove veículos e oito perfis reais, com seus links públicos e a data de consulta. Foram conferidos os portais do ge, UOL, MARCA, AS, Mundo Deportivo, BBC Sport, France Football e Gianluca Di Marzio; os perfis de [PVC](https://www.uol.com.br/esporte/colunas/pvc/), [Juca Kfouri](https://www.uol.com.br/esporte/colunas/juca-kfouri/), [Alexandre Lozetti](https://ge.globo.com/blogs/blog-do-lozetti/), [Sid Lowe](https://www.theguardian.com/profile/sidlowe), [Jonathan Wilson](https://www.theguardian.com/profile/jonathanwilson), [Philippe Auclair](https://www.theguardian.com/profile/philippe-auclair) e [Fabrizio Romano](https://www.theguardian.com/profile/fabrizio-romano); e o [portal de Gianluca Di Marzio](https://www.gianlucadimarzio.com/). Uma página de contribuição pode ser histórica: o catálogo não afirma emprego atual ou participação num júri.

São referências nominais e links, sem fotografias, reprodução de matérias ou declarações atribuídas a essas pessoas. Notícias e resultados da carreira são ficção da simulação, identificados como tal e assinados pela Redação Legacy. O catálogo não importa uma notícia real para transformá-la em notícia da carreira, nem atribui votos de premiação a pessoas reais.

A [página oficial sobre o Ballon d’Or](https://ballondor.com/pt/the-ballon-dor), consultada em 26/10/2026, apresenta a ordem de critérios: desempenho individual, conquistas coletivas e classe/fair play. A página da [UEFA sobre a edição de 2026](https://www.uefa.com/ballondor/news/02aa-21dcfc743210-2786daba77d8-1000--2026-ballon-d-or-ceremony-when-and-where-all-the-nominees-/) foi usada como contexto do evento. A pontuação estatística da carreira, incluindo os novos bônus por decisões, é própria do jogo e não uma fórmula oficial. Não se presume fair play a partir de dados ausentes. Desde a v0.13, os cartões oficiais acompanhados alimentam esse pilar com pesos próprios; dados anteriores continuam neutros.


## Disciplina e fair play (v0.13)

Referência conceitual: IFAB, Lei 12 — faltas e conduta, https://www.theifab.com/laws/latest/fouls-and-misconduct/ ; Lei 3 — número de jogadores, https://www.theifab.com/laws/latest/the-players/ . Amarelos, expulsões e incidentes desta carreira são simulados, sem alegar acontecimentos reais ou sanções reais a esses atletas.

Limites por competição e duração das penas são regras simplificadas próprias, descritas em Disciplina e no README, não uma base integral de regulamentos das federações. Desde a v0.13 o pilar de fair play inspirado no Ballon d’Or usa os cartões oficiais efetivamente acompanhados, com pesos próprios e teto de desconto. Resultados históricos são preservados. Nenhum voto é atribuído a jornalista real.
