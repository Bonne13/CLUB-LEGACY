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

IDs preservam a origem: `tm-`, `sf-`, `ss-`, `fb-` e `mls-`. A origem do vínculo, data e caráter parcial são mantidos. Não se baixam fotos nem escudos.

Nascimento conhecido é preservado. Quando existe apenas ano ou idade histórica, a idade é aproximada. Sem referência suficiente, a interface mostra **Não informada**; o motor usa um parâmetro interno, sem apresentá-lo como dado real. Parte das posições brasileiras é estimada a partir das estatísticas e marcada **est.**; posições gerais de outras fontes podem ser complementadas por referências históricas. Elegibilidade de seleções é simplificada pela cidadania disponível, sem verificar vínculos oficiais FIFA. A base oferece 45 seleções elegíveis, até seis amistosos simulados por ano e folgas em calendários ímpares.

## Base histórica preservada

[salimt/football-datasets](https://github.com/salimt/football-datasets/tree/da9227e1f42baf74561324290dbf1ad2e3c00edd), revisão `da9227e1f42baf74561324290dbf1ad2e3c00edd`:

- `datalake/transfermarkt/player_profiles/player_profiles.csv`: identificador, nome, nascimento, posição, clube, cidadania e fim de contrato.
- `datalake/transfermarkt/player_latest_market_value/player_latest_market_value.csv`: avaliação histórica e data, até setembro de 2025.
- `datalake/transfermarkt/team_details/team_details.csv`: identidade dos clubes.

Complementos históricos de SoFIFA: `2019/data.csv` e `2021/data.csv` de [amanthedorkknight/fifa18-all-player-statistics](https://github.com/amanthedorkknight/fifa18-all-player-statistics/tree/dfa2c55b08f9c9dd0fb26e5db9585e026bf263a7), e `data/FIFA23_official_data.csv` de [anselmoaxo/dataset-fifa23](https://github.com/anselmoaxo/dataset-fifa23/tree/ad01b925859ddf412d47856ce05d04ba4944dbf2). São identidades e vínculos antigos, não elencos atuais; alguns atletas podem estar aposentados. Preços SoFIFA são parâmetros estimados, sem `referenceValueEuro`. Não se usam identidades brasileiras genéricas dessas edições.

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
