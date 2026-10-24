"""Importa somente identidades reais de um snapshot público, sem completar lacunas com nomes gerados.
Recebe --profiles, --values e --teams (CSVs de salimt/football-datasets).
"""
import argparse,csv,collections,json,re,unicodedata,datetime,pathlib,subprocess
parser=argparse.ArgumentParser();parser.add_argument('--profiles',default='/tmp/legacy-player_profiles.csv');parser.add_argument('--values',default='/tmp/legacy-player_latest_market_value.csv');parser.add_argument('--teams',default='/tmp/legacy-team_details.csv');args=parser.parse_args()
root=pathlib.Path(__file__).resolve().parents[1]
world=json.loads(subprocess.check_output(['node','-e',"process.stdout.write(JSON.stringify(require('./world.js').leagues))"],cwd=root))
profiles=list(csv.DictReader(open(args.profiles,encoding='utf-8-sig')));values={r['player_id']:r for r in csv.DictReader(open(args.values))};teams={r['club_id']:{'id':r['club_id'],'name':r['club_name'],'country':r['country_name']} for r in csv.DictReader(open(args.teams))}
for p in profiles:
 if p['current_club_id'] not in teams:teams[p['current_club_id']]={'id':p['current_club_id'],'name':p['current_club_name'],'country':''}
def clean(s):return re.sub(r'\s*\(\d+\)\s*$','',s).strip()
def norm(s):
 s=unicodedata.normalize('NFKD',clean(s)).encode('ascii','ignore').decode().lower();return re.sub(r'[^a-z0-9]','',s)
country=dict(zip(['br','ar','en','es','it','de','fr','pt','nl','co','cl','uy','ec','pe','py','bo','ve','us','mx','sa','jp'],['Brazil','Argentina','England','Spain','Italy','Germany','France','Portugal','Netherlands','Colombia','Chile','Uruguay','Ecuador','Peru','Paraguay','Bolivia','Venezuela','United States','Mexico','Saudi Arabia','Japan']))
# Identidades explícitas, revisadas pelos nomes da fonte. Não são inferidas por similaridade.
ids={
'br':'614 1023 609 3876 2462 537 10010 585 210 8793 330 221 199 978 2125 6600 2029 10870 10492 8718',
'ar':'209 189 1444 1234 1775 288 1029 1418 1286 3938 2417 333 2063 1030 2402 12574 7097 11831 1106 830 14554 31284 1829 12179 19775 25184 928 12454 10511 12301',
'en':'11 281 31 631 985 148 762 405 1237 703 873 989 1148 931 379 29 543 399 1132 289',
'es':'418 131 13 621 1050 150 940 367 331 237 681 1049 3709 714 1108 12321 368 3368 1531 2497',
'it':'46 6195 5 506 800 12 398 430 1025 1047 416 410 252 276 1390 1005 130 6574 4172 2239',
'de':'27 15 16 24 23826 79 60 39 86 18 82 167 89 35 533 2036 41 3',
'fr':'583 244 162 1082 1041 417 667 826 3911 273 290 415 995 1420 738 1158 10004 347',
'pt':'336 294 720 1075 2420 2423 3329 1465 3268 979 2425 8024 2424 982 110302 2521 7179 2431',
'nl':'383 610 234 200 1090 317 1435 467 306 1269 385 468 202 1304 132 798 724 1434',
'us':'69261 1061 51828 51663 72309 78435 432 51772 1247 813 8816 2440 9168 4284 56089 4078 63966 626 40058 623 45604 25467 4291 6643 114977 677 9636 82686 11141 6321',
'mx':'3631 6711 3711 7633 7055 2407 1804 4035 4941 1403 8590 1146 5662 4961 13353 40188 49283 82696',
'jp':'2241 6632 593 2697 3958 23568 828 9598 596 1022 6631 22171 3828 1066 8344 1062 3734 9597 8457 943',
'sa':'1114 18544 8023 18487 9840 26069 7732 28887 10025 49139 34369 50510 17284 66462 84207 108125 32328 22043',
}
# Nomes inequívocos para os clubes fora das ligas que possuem registro completo de equipes.
alias={
'Junior Barranquilla':'Junior FC','Deportes Tolima':'Deportes Tolima','Deportivo Pasto':'Asociación Deportivo Pasto','Atlético Bucaramanga':'Atlético Bucaramanga','La Equidad':'CD La Equidad Seguros SA','Águilas Doradas':'Águilas Doradas Rionegro','Boyacá Chicó':'Boyacá Chicó FC','Unión Magdalena':'AD Union Magdalena','Colo-Colo':'CSD Colo-Colo','Universidad de Chile':'Club Universidad de Chile','Universidad Católica':'CD Universidad Católica','Everton de Viña del Mar':'CD Everton','Nacional':'Club Nacional','Juventud de Las Piedras':'CA Juventud','Barcelona SC':'Barcelona SC Guayaquil','Aucas':'SD Aucas','Universidad Católica del Ecuador':'CD Universidad Católica','Vinotinto del Ecuador':'Vinotinto FC','Universitario':'Universitario de Deportes','Melgar':'FBC Melgar','Alianza Atlético':'Alianza Atlético Sullana','Sport Boys':'Sport Boys Association','Olimpia':'Olimpia Asunción','Libertad':'Club Libertad Asunción','2 de Mayo':'Club Sportivo 2 de Mayo','Deportivo Recoleta':'Recoleta FC','Bolívar':'Bolívar La Paz','The Strongest':'The Strongest La Paz','Blooming':'Blooming Santa Cruz','Oriente Petrolero':'Club Deportivo Oriente Petrolero','GV San José':'Gualberto Villarroel San José','CDT Real Oruro':'Real Oruro'}
manual={'cl-2':'3277','ec-5':'17584','uy-1':'866','co-15':'22902'}
counts=collections.Counter(p['current_club_id'] for p in profiles)
rosters={};report=[];used=set()
for l in world:
 known=ids.get(l['id'],'').split()
 if known:assert len(known)==len(l['clubs']),(l['id'],len(known))
 for i,name in enumerate(l['clubs']):
  key=f"{l['id']}-{i}";source=manual.get(key) or (known[i] if known else None)
  if source and source not in teams:source=None
  if not source:
   candidates=[t for t in teams.values() if norm(t['name'])==norm(alias.get(name,name))]
   candidates.sort(key=lambda t:(t['country']==country[l['id']],counts[t['id']]),reverse=True)
   source=candidates[0]['id'] if candidates else None
  if source in used:source=None
  if source:used.add(source)
  rows=[]
  for p in profiles:
   if not source or p['current_club_id']!=source or p['date_of_death']:continue
   title=clean(p['player_name']);dob=p['date_of_birth'];position=p['position'].lower()
   if not title or not re.match(r'^\d{4}-\d{2}-\d{2}$',dob):continue
   age=2025-int(dob[:4]);
   if not 14<=age<=46:continue
   pos='GOL' if 'goalkeeper' in position else 'LAT' if any(x in position for x in ['left-back','right-back','wing-back']) else 'ZAG' if 'defender' in position else 'VOL' if 'defensive midfield' in position else 'ATA' if 'attack' in position else 'MEI'
   v=values.get(p['player_id'],{});value=int(float(v.get('value') or 0));stamp=v.get('date_unix') or None;contract=p['contract_expires'] if re.match(r'^\d{4}-\d{2}-\d{2}$',p['contract_expires']) else None
   rows.append([p['player_id'],title,dob,pos,value,stamp,contract,p['citizenship'] or None])
  rosters[key]={'sourceId':source,'sourceName':clean(teams[source]['name']) if source else None,'players':rows}
  report.append({'id':key,'club':name,'sourceId':source,'sourceName':rosters[key]['sourceName'],'players':len(rows),'playable':len(rows)>=11})
metadata={'source':'https://github.com/salimt/football-datasets','commit':'da9227e1f42baf74561324290dbf1ad2e3c00edd','reference':'Snapshot histórico publicado em 2025; não é uma atualização ao vivo','eurBrl':6.2,'teams':rosters}
(root/'roster-data.js').write_text('"use strict";\n(function(root){const data='+json.dumps(metadata,ensure_ascii=False,separators=(',',':'))+';root.LegacyRosterData=data;if(typeof module!=="undefined")module.exports=data;})(globalThis);\n')
(root/'data/roster-coverage.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print('Jogadores reais:',sum(x['players'] for x in report),'clubes com 11+:',sum(x['playable'] for x in report),'/397')
for l in world:
 r=[x for x in report if x['id'].startswith(l['id']+'-')];print(l['id'],sum(x['playable'] for x in r),'/',len(r))
