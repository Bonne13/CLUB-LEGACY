"""Package reviewed league ranking criteria, with explicit limits for special formats."""
import json,pathlib
root=pathlib.Path(__file__).resolve().parents[1];research=json.loads((root/'data/league-reference-research.json').read_text())
criteria={
'br':['points','wins','goalDifference','goalsFor','headPoints','redCards','yellowCards'],
'en':['points','goalDifference','goalsFor','headPoints','headAwayGoals'],
'es':['points','headPoints','headDifference','goalDifference','goalsFor','fairPlay'],
'it':['points','headPoints','headDifference','goalDifference','goalsFor'],
'de':['points','goalDifference','goalsFor','headDifference','headAwayGoals','awayGoals'],
'fr':['points','goalDifference','headPoints','headDifference','goalsFor','wins','awayWins','fairPlay'],
'pt':['points','headPoints','headDifference','goalDifference','wins','goalsFor'],
'nl':['points','lessLostPoints','goalDifference','goalsFor','headPoints','headDifference','headAwayGoals'],
'ar':['points','goalDifference','goalsFor','fairPlay'],
'co':['points','goalDifference','goalsFor','awayGoals','goalsAgainst','awayAgainst'],
'cl':['points','goalDifference','wins','goalsFor','awayGoals','redCards','yellowCards'],
'uy':['points','goalDifference','goalsFor','headPoints'],
'ec':['points','goalDifference','goalsFor','awayGoals','headPoints'],
'pe':['points','goalDifference','goalsFor','fairPlay'],
'py':['points','headPoints','headDifference','goalDifference','goalsFor'],
'bo':['points','goalDifference','goalsFor','awayGoals','yellowCards'],
've':['points','goalDifference','goalsFor','headPoints'],
'us':['points','wins','goalDifference','goalsFor','fairPlay','awayDifference','awayGoals','homeDifference','homeGoals'],
'mx':['points','goalDifference','goalsFor','headPoints','awayGoals','fairPlay'],
'sa':['points','headPoints','headDifference','goalDifference','goalsFor','fairPlay'],
'jp':['points','goalDifference','goalsFor','headPoints','headDifference','fairPlay']}
formats={'ar':'Apertura e Clausura, com grupos e fases eliminatórias.','co':'Apertura e Finalización, com fases de classificação e decisão.','uy':'Apertura, Intermedio e Clausura, com decisões de título.','ec':'Fase regular e etapas finais, conforme a edição.','pe':'Apertura e Clausura, tabela acumulada e possíveis decisões.','py':'Apertura e Clausura como campeonatos separados.','bo':'Formato e decisões definidos pelas bases da edição.','ve':'Apertura e Clausura, fases finais e decisão do campeonato.','us':'Temporada regular por conferências, seguida da MLS Cup.','mx':'Apertura e Clausura, com Liguilla.'}
notes={'it':'Empates em pontos pelo título ou pela permanência podem exigir partidas de desempate.','cl':'Empate em pontos pelo título pode exigir uma partida de desempate.','uy':'Há decisões de fase e título, além da classificação acumulada.','de':'A zona de acesso/permanência inclui playoff contra a divisão inferior.','nl':'Há playoffs de vagas e acesso/permanência.','pt':'Acesso/permanência pode envolver playoff com a divisão inferior.','jp':'A base usa o formato regular da J1 de 2025. A edição de transição de 2026 tem grupos e decisões por pênaltis e ainda não é reproduzida.'}
benches={'br':12,'ar':12,'en':9,'es':12,'it':15,'de':9,'fr':9,'pt':9,'nl':12}
rows=[]
for ref in research:
 k=ref['id'];url=ref['page'];text=ref['classification']or''
 if k=='jp':url='https://en.wikipedia.org/wiki/2025_J1_League';text='J1 League 2025: points, goal difference, goals scored, head-to-head and disciplinary record.'
 for stop in [' (E) ',' (Q) ',' (T) ','Updated to']:
  text=text.split(stop)[0]
 row={'id':k,'referenceUrl':url,'referenceText':text[:1300],'checkedAt':'2026-10-27','winPoints':3,'drawPoints':1,'criteria':criteria[k],'substitutions':5,'opportunities':3,'bench':benches.get(k,9),'benchReference':k in benches,'format':formats.get(k,'Pontos corridos em turno e returno.'),'specialFormat':k in formats,'specialNotes':notes.get(k),'applied':['pontuação','critérios de classificação com dados disponíveis','cinco substituições em três oportunidades, mais o intervalo'],'limitations':'Playoffs, troca de divisões, inscrição de atletas e decisões por sorteio não são reproduzidos integralmente. Nas ligas com fases, o calendário da carreira continua adaptado.'}
 if k=='es':row['officialSources']=['https://rfef.es/sites/default/files/2025-11/20251112_Reglamento_de_Competiciones_2025.pdf'];row['officialArticle']='Artigo 29 · sistema de pontos e desempates'
 row['substitutionSource']='https://www.theifab.com/laws/latest/the-players/'
 rows.append(row)
d={'revision':'league-rules-2026-10-v1','leagues':rows};(root/'data/league-rules.json').write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n');(root/'league-rules-data.js').write_text('"use strict";\n(function(root){const data='+json.dumps(d,ensure_ascii=False,separators=(',',':'))+';root.LegacyLeagueRulesData=data;if(typeof module!=="undefined")module.exports=data;})(globalThis);\n')
