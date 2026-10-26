"""Atualiza vínculos a partir de snapshots públicos 2026 e 2026/27.
Entradas em --cache (/tmp por padrão). Preserva o baseline versionado para ligas
sem fonte nova. Não fabrica identidades nem datas de nascimento.
"""
import argparse,csv,json,pathlib,re,unicodedata,collections,hashlib,datetime
p=argparse.ArgumentParser();p.add_argument('--cache',default='/tmp');args=p.parse_args()
root=pathlib.Path(__file__).resolve().parents[1];cache=pathlib.Path(args.cache)
base=json.loads((root/'data/roster-baseline-2025.json').read_text());world=json.loads((root/'data/world-baseline-2025.json').read_text());today='2026-10-23'
def clean(s):return re.sub(r'\s*\(\d+\)\s*$','',s or '').strip()
def norm(s):return re.sub('[^a-z0-9]','',unicodedata.normalize('NFKD',clean(s)).encode('ascii','ignore').decode().lower())
def tokens(s):return set(re.findall('[a-z0-9]+',unicodedata.normalize('NFKD',clean(s)).encode('ascii','ignore').decode().lower()))-{'de','da','do','dos','das','del','la','el','van','von'}
def readcsv(name):return list(csv.DictReader(open(cache/name,encoding='utf-8-sig')))
profiles=readcsv('legacy-player_profiles.csv');values={r['player_id']:r for r in readcsv('legacy-player_latest_market_value.csv')}
byname=collections.defaultdict(set);bytoken=collections.defaultdict(set);profile={r['player_id']:r for r in profiles}
for r in profiles:
 for field in ['player_name','name_in_home_country']:
  if r[field]:
   byname[norm(r[field])].add(r['player_id'])
   for token in tokens(r[field]):bytoken[token].add(r['player_id'])
fifa={};fifakey=collections.defaultdict(list)
for filename,year in [('legacy-fifa2021.csv',2020),('legacy-fifa2019.csv',2018)]:
 path=cache/filename
 if not path.exists():continue
 for r in readcsv(filename):
  if r['ID'] not in fifa:fifa[r['ID']]={**r,'referenceYear':year};fifakey[norm(r['Name'])].append(fifa[r['ID']])
oldrows={r[0]:r for t in base['teams'].values()for r in t['players']}
for pid,row in oldrows.items():
 if pid in profile:byname[norm(row[1])].add(pid)
# Nomes de exibição inequívocos. Não se inferem clubes por similaridade.
labels={'Atlético Madrid':'Atlético de Madrid','Athletic Club':'Athletic Club','Celta Vigo':'Celta de Vigo','Tottenham':'Tottenham Hotspur','Manchester Utd':'Manchester United','Brighton':'Brighton & Hove Albion','Nottingham':'Nottingham Forest','Newcastle':'Newcastle United','Bayern Munich':'Bayern de Munique','Leverkusen':'Bayer Leverkusen','Dortmund':'Borussia Dortmund','Frankfurt':'Eintracht Frankfurt','Gladbach':'Borussia Mönchengladbach','Inter':'Inter de Milão','Paris SG':'Paris Saint-Germain','Marseille':'Olympique de Marseille','Athletico':'Athletico Paranaense','Dep. A Coruña':'Deportivo La Coruña','Racing Sant':'Racing Santander','Paderborn 07':'Paderborn','Schalke 04':'Schalke 04'}
EU={'eng Premier League':'en','es La Liga':'es','it Serie A':'it','de Bundesliga':'de','fr Ligue 1':'fr'}
br=readcsv('legacy-current-br-stats');eu=readcsv('legacy-current-eu-stats');mls=readcsv('legacy-current-mls-stats')
updates={'br':sorted({labels.get(r['team_name'],r['team_name'])for r in br})}
for comp,code in EU.items():updates[code]=sorted({labels.get(r['Squad'],r['Squad'])for r in eu if r['Comp']==comp})
clubmap={};changed={};references={}
for l in world['leagues']:
 old=list(l['clubs']);new=list(old)
 if l['id'] in updates:
  expected=updates[l['id']];assert len(expected)==len(old),(l['id'],len(expected),len(old))
  missing=[i for i,n in enumerate(old)if n not in expected];added=[n for n in expected if n not in old];assert len(missing)==len(added)
  for i,n in zip(missing,added):new[i]=n
  changed[l['id']]=new
 for i,name in enumerate(new):clubmap[(l['id'],norm(name))]=l['id']+'-'+str(i)
# Snapshot-base original permanece para clubes sem cobertura nova.
rows={key:list(t['players'])for key,t in base['teams'].items()};teams=base['teams'];member={};unresolved=[]
country={'br':'Brazil','en':'England','es':'Spain','it':'Italy','de':'Germany','fr':'France','cl':'Chile','uy':'Uruguay','py':'Paraguay','pe':'Peru','us':'United States'}
# Contexto antigo auxilia homônimos; clubes novos não herdam o ID do clube substituído.
oldclubids={(l['id'],norm(n)):base['teams'][f"{l['id']}-{i}"]['sourceId']for l in world['leagues']for i,n in enumerate(l['clubs'])}
def profilematch(name,born=None,club=None,league=None):
 ids=set(byname.get(norm(name),set()))
 if not ids and len(tokens(name))>=2:
  choices=[bytoken[t]for t in tokens(name)];ids=set.intersection(*choices)if born and choices else set()
 ids={pid for pid in ids if profile[pid]['date_of_birth'] and not profile[pid]['date_of_death'] and 1980<=int(profile[pid]['date_of_birth'][:4])<=2012}
 if born:ids={pid for pid in ids if int(profile[pid]['date_of_birth'][:4])==int(born)}
 if len(ids)>1 and club:
  oldid=oldclubids.get((league,norm(club)));local={pid for pid in ids if oldid and profile[pid]['current_club_id']==oldid}
  if len(local)==1:ids=local
 return profile[next(iter(ids))]if len(ids)==1 else None

def position(text):
 text=(text or '').lower().strip()
 if text in ['gk','goalkeeper'] or 'goalkeeper' in text:return 'GOL'
 if any(x in text for x in ['left-back','right-back','wing-back']):return 'LAT'
 if 'defensive midfield'in text:return 'VOL'
 if 'midfield'in text:return 'MEI'
 if text=='df' or 'defender'in text or 'centre-back'in text:return 'ZAG'
 if text=='fw' or any(x in text for x in ['attack','forward','winger']):return 'ATA'
 return 'MEI'

def make(name,sourceid,source,date,club,league,born=None,nation=None,pos=None,raw=None):
 match=profilematch(name,born,club,league);dob=None;unknown=False;estimatedpos=False;referenceage=None;refyear=2026
 if match:
  pid=match['player_id'];dob=match['date_of_birth'];nat=match['citizenship'];pos=position(match['position']);v=values.get(pid,{})
  value=int(float(v.get('value')or 0));stamp=v.get('date_unix')or None;contract=match['contract_expires']if re.match(r'^\d{4}-\d{2}-\d{2}$',match['contract_expires'])else None
 else:
  candidates=fifakey.get(norm(name),[])
  if born:candidates=[x for x in candidates if abs(x['referenceYear']-int(x['Age'])-int(born))<=1]
  candidates={x['ID']:x for x in candidates}
  oldf=next(iter(candidates.values()))if len(candidates)==1 else None
  pid='sf-'+oldf['ID']if oldf else sourceid
  nat=nation or(oldf['Nationality']if oldf else None);value=0;stamp=None;contract=None
  if oldf:
   referenceage=int(oldf['Age']);refyear=oldf['referenceYear'];fp=oldf['Position'];pos='GOL'if fp=='GK'else'LAT'if fp in ['LB','RB','LWB','RWB']else'ZAG'if fp in ['CB','LCB','RCB']else'VOL'if fp in ['CDM','LDM','RDM']else'ATA'if fp in ['ST','LS','RS','CF','LF','RF','RW','LW']else'MEI'
  elif born:referenceage=2026-int(born)
  else:referenceage=22;unknown=True # somente parâmetro interno; a UI informa idade não disponível
  if not pos:
   q=lambda k:float((raw or{}).get(k)or 0)
   pos='GOL'if q('saves')>0 else'ATA'if q('totalShots')>max(5,q('clearances')*.7)else'ZAG'if q('clearances')>max(12,q('keyPasses')*3)else'LAT'if q('accurateCrosses')>6 else'VOL'if q('interceptions')>15 else'MEI';estimatedpos=True
  elif pos in ['DF','MF','FW','GK','Defender','Midfielder','Forward','Goalkeeper']:
   pos=position(pos);estimatedpos=pos in ['ZAG','MEI']
 meta={'sourceKey':source,'reference':date,'ageUnknown':unknown,'positionEstimated':estimatedpos}
 return [pid,name,dob,pos,value,stamp,contract,nat,source,referenceage,refyear,meta]

def add(key,row,date):
 pid=row[0]
 previous=member.get(pid)
 if previous and previous[0]>date:return
 member[pid]=(date,key,row)
# BR: lista de jogadores do clube no snapshot, não só atletas com minutos.
for key in [k for k in rows if k.startswith('br-')]:rows[key]=[];references[key]={'source':'sofascore-br-2026','date':'2026-06-02','kind':'snapshot'}
for r in br:
 label=labels.get(r['team_name'],r['team_name']);key=clubmap[('br',norm(label))]
 row=make(r['player_name'],'ss-'+r['player_id'],'sofascore-br-2026','2026-06-02',label,'br',raw=r);add(key,row,'2026-06-02')
# Europa: atletas com estatísticas nas primeiras rodadas 2026/27. Não completa com antigos.
euGroups=collections.defaultdict(list)
for r in eu:euGroups[(norm(r['Player']),r['Born'])].append(r)
for l in EU.values():
 for k in [k for k in rows if k.startswith(l+'-')]:rows[k]=[];references[k]={'source':'fbref-eu-2026-27','date':'2026-09-27','kind':'appearances'}
for group in euGroups.values():
 if len({r['Squad']for r in group})>1:unresolved.append({'player':group[0]['Player'],'reason':'multiple clubs in European snapshot'});continue
 r=group[0];league=EU[r['Comp']];club=labels.get(r['Squad'],r['Squad']);key=clubmap[(league,norm(club))]
 sourceid='fb-'+hashlib.sha256((r['Player']+'|'+r['Born']).encode()).hexdigest()[:16]
 nationalities={'ARG':'Argentina','BRA':'Brazil','URU':'Uruguay','COL':'Colombia','CHI':'Chile','ECU':'Ecuador','PER':'Peru','PAR':'Paraguay','VEN':'Venezuela','ENG':'England','ESP':'Spain','FRA':'France','GER':'Germany','ITA':'Italy','POR':'Portugal','NED':'Netherlands','USA':'United States','JPN':'Japan','NOR':'Norway','BEL':'Belgium','MAR':'Morocco','SEN':'Senegal','NGA':'Nigeria','POL':'Poland','DEN':'Denmark','SWE':'Sweden','CRO':'Croatia','SRB':'Serbia','SUI':'Switzerland'}
 nat=nationalities.get(r['Nation'].split(' ')[-1]);row=make(r['Player'],sourceid,'fbref-eu-2026-27','2026-09-27',club,league,born=r['Born'],nation=nat,pos=r['Pos'].split(',')[0]);add(key,row,'2026-09-27')
# MLS: fonte reconhece dois IDs com estatísticas de dois clubes, sem informar destino.
mlsLabels={'Atlanta':'Atlanta United','Austin':'Austin FC','Charlotte':'Charlotte FC','Chicago':'Chicago Fire','Cincinnati':'FC Cincinnati','Colorado':'Colorado Rapids','Columbus':'Columbus Crew','D.C. United':'D.C. United','Dallas':'FC Dallas','Houston':'Houston Dynamo','Kansas City':'Sporting Kansas City','LA Galaxy':'LA Galaxy','LAFC':'Los Angeles FC','Miami':'Inter Miami','Minnesota':'Minnesota United','Montréal':'CF Montréal','Nashville':'Nashville SC','New England':'New England Revolution','New York':'New York Red Bulls','New York City':'New York City FC','Orlando':'Orlando City','Philadelphia':'Philadelphia Union','Portland':'Portland Timbers','Salt Lake':'Real Salt Lake','San Diego':'San Diego FC','San Jose':'San Jose Earthquakes','Seattle':'Seattle Sounders','St. Louis':'St. Louis City','Toronto':'Toronto FC','Vancouver':'Vancouver Whitecaps'}
mlsGroups=collections.defaultdict(list)
for r in mls:mlsGroups[r['player_id']].append(r)
for k in [k for k in rows if k.startswith('us-')]:rows[k]=[];references[k]={'source':'mls-2026','date':'2026-06-09','kind':'snapshot'}
for group in mlsGroups.values():
 if len({r['club']for r in group})>1:unresolved.append({'player':group[0]['player'],'reason':'multiple MLS clubs'});continue
 r=group[0];club=mlsLabels[r['club']];key=clubmap[('us',norm(club))]
 row=make((r['first_name']+' '+r['last_name']).strip(),'mls-'+r['player_id'],'mls-2026','2026-06-09',club,'us',pos=r['position']);add(key,row,'2026-06-09')
# Deduplicação entre snapshots e catálogo antigo: um atleta tem um único clube inicial.
for key in rows:rows[key]=[r for r in rows[key]if r[0]not in member]
for date,key,row in member.values():rows[key].append(row)
# Último vínculo observado em quatro bases sul-americanas, cortado na data da consulta.
clubids={str(t['sourceId']):key for key,t in teams.items()if t.get('sourceId') and (key.split('-')[0]not in changed or changed[key.split('-')[0]][int(key.split('-')[1])]==world['leagues'][next(i for i,l in enumerate(world['leagues'])if l['id']==key.split('-')[0])]['clubs'][int(key.split('-')[1])])}
for label,sid in {'Athletico Paranaense':'679','Chapecoense':'17776','Coritiba':'776','Remo':'10997'}.items():clubids[sid]=clubmap[('br',norm(label))]
nameclubs=collections.defaultdict(set)
for (league,n),key in clubmap.items():nameclubs[n].add(key)
for pid,key in clubids.items():
 for prof in profiles:
  if prof['current_club_id']==pid and prof['current_club_name']:nameclubs[norm(prof['current_club_name'])].add(key);break
# Somente equivalências explícitas confirmadas nos dados.
aliases={'CSD Colo-Colo':'Colo-Colo','Club Universidad de Chile':'Universidad de Chile','CD Universidad Católica':'Universidad Católica','CD Palestino':'Palestino','Coquimbo Unido':'Coquimbo Unido','CD Cobresal':'Cobresal','CD Huachipato':'Huachipato','Deportivo Ñublense':'Ñublense','CD Everton':'Everton de Viña del Mar','CD La Serena':'Deportes La Serena','Deportes Limache':'Deportes Limache','Club Nacional':'Nacional','Club Nacional de Football':'Nacional','CA Peñarol':'Peñarol','Cerro Largo FC':'Cerro Largo','CA Juventud':'Juventud de Las Piedras','Montevideo Wanderers':'Montevideo Wanderers','Club Olimpia':'Olimpia','Olimpia Asunción':'Olimpia','Club Cerro Porteño':'Cerro Porteño','Club Libertad Asunción':'Libertad','Club Guaraní':'Guaraní','Club Nacional Asunción':'Nacional de Asunción','Club Universitario de Deportes':'Universitario','Universitario de Deportes':'Universitario','Club Sporting Cristal':'Sporting Cristal','FBC Melgar':'Melgar','Ayacucho FC':'Ayacucho FC','Asociación Deportiva Tarma':'ADT de Tarma','UTC de Cajamarca':'UTC Cajamarca','Universidad Técnica de Cajamarca':'UTC Cajamarca'}
for old,new in aliases.items():
 possible={key for (league,n),key in clubmap.items()if n==norm(new)}
 if len(possible)==1:nameclubs[norm(old)].update(possible)
latest={};bios={}
for label,path,biofile in [('chile','legacy-current-sa-transfers','legacy-current-sa-profiles'),('peru','legacy-current-peru-canonical_transfers.json','legacy-current-peru-player_profiles.json'),('paraguay','legacy-current-paraguay-canonical_transfers.json','legacy-current-paraguay-player_profiles.json'),('uruguay','legacy-current-uruguay-canonical_transfers.json','legacy-current-uruguay-player_profiles.json')]:
 source=json.loads((cache/path).read_text());bio=json.loads((cache/biofile).read_text());bios.update(bio)
 for r in source:
  pid=str(r['player_id']);date=r.get('transfer_date')or'';destination=r.get('to_club')or{};sid=str(destination.get('club_id')or'');name=destination.get('club_name')or''
  events=[(date,sid,name)]
  for move in r.get('subsequent_transfers',[]):events.append((move.get('date_unformatted')or'',None,move.get('to_club')or''))
  for date,sid,name in events:
   if not re.match(r'^\d{4}-\d{2}-\d{2}$',date)or date>today:continue
   if pid not in latest or date>latest[pid][0]:latest[pid]=(date,sid,name,r)
changedPlayers=0
for pid,(date,sid,name,r)in latest.items():
 if date<'2025-09-12':continue
 if pid in member and date<=member[pid][0]:continue
 possible=nameclubs.get(norm(name),set());key=clubids.get(str(sid))or(next(iter(possible))if len(possible)==1 and norm(name)not in {'nacional','riverplate','racing','racingclub','santos','santosfc','alianza','olimpia','universidadcatolica','cduniversidadcatolica'} else None)
 # Se há uma saída posterior confirmada, retira o vínculo anterior mesmo fora do universo do jogo.
 for k in rows:rows[k]=[row for row in rows[k]if row[0]!=pid]
 if not key:continue
 if key in references and references[key]['kind']=='snapshot' and date<=references[key]['date']:continue
 bio=bios.get(pid,{})
 dob=r.get('date_of_birth')or bio.get('date_of_birth')or(profile.get(pid,{})or{}).get('date_of_birth')
 if not dob or not re.match(r'^\d{4}-\d{2}-\d{2}$',dob):continue
 v=r.get('market_value_at_transfer_eur')or 0;nat=r.get('nationality')or None
 if r.get('nationality_2'):nat=(nat or'')+'  '+r['nationality_2']
 metadata={'sourceKey':'sa-transfers-2026','reference':date,'ageUnknown':False,'positionEstimated':False,'membership':'last-known-transfer'}
 row=[pid,r['player_name'],dob,position(r.get('position')),int(v),date if v else None,r.get('contract_end_date'),nat,'sa-transfers-2026',None,2026,metadata]
 rows[key].append(row);changedPlayers+=1
 references.setdefault(key,{'source':'sa-transfers-2026','date':date,'kind':'last-known-transfers'})
 if references[key]['source']=='sa-transfers-2026':references[key]['date']=max(references[key]['date'],date)
print('SOUTH AMERICAN OBSERVED MEMBERSHIPS',changedPlayers)

# Relatório e metadados; detalhes de transferências sul-americanas aplicados em etapa separada.
for key in rows:
 teams[key]['players']=rows[key]
 if key in references:teams[key]['rosterReference']=references[key]
 for league,names in changed.items():
  if key.startswith(league+'-'):teams[key]['sourceName']=names[int(key.split('-')[1])];
  if key.split('-')[0] in changed and teams[key]['sourceName']!=world['leagues'][next(i for i,l in enumerate(world['leagues'])if l['id']==key.split('-')[0])]['clubs'][int(key.split('-')[1])]:teams[key]['sourceId']=None
base.update({'revision':'current-2026-v1','initialSeason':2026,'reference':'Snapshots 2026 e 2026/27; cobertura e datas individuais por clube. Clubes sem fonte nova mantêm referência histórica.','currentSources':{
 'sofascore-br-2026':{'url':'https://github.com/wiUl/scrapping-brasileirao-sofascore','commit':'215c7a31f5645bcbebebfd0d7f4acd37f1a28b35','date':'2026-06-02'},
 'fbref-eu-2026-27':{'url':'https://github.com/payamhabibi/Football_Players_Stats_2026-2027','commit':'846fbca183be1ec2fae294c3d175ea29c7008894','date':'2026-09-27'},
 'sa-transfers-2026':{'url':'https://github.com/Joao1531/south-american-transfers-analysis','commit':'05f62f8614bad126cd6bcc62043f0002a60b5d72','date':'2026-10-23'},
 'mls-2026':{'url':'https://github.com/Leomgama/mls-2026-scout-report','commit':'dde6ecd4adfed441c5711c5ad8843b75757855ad','date':'2026-06-09'}},'unresolvedMemberships':unresolved,'retrievedOn':today})
if (root/'data/player-ratings.json').exists():base['playerRatings']=json.loads((root/'data/player-ratings.json').read_text())
if (root/'data/player-positions.json').exists():base['playerPositions']=json.loads((root/'data/player-positions.json').read_text())
if (root/'data/player-bios.json').exists():base['playerBios']=json.loads((root/'data/player-bios.json').read_text())
(root/'roster-data.js').write_text('"use strict";\n(function(root){const data='+json.dumps(base,ensure_ascii=False,separators=(',',':'))+';root.LegacyRosterData=data;if(typeof module!=="undefined")module.exports=data;})(globalThis);\n')
# Atualiza participantes do Brasil e das cinco grandes ligas; IDs de saves antigos continuam no próprio save.
p=root/'world.js';source=p.read_text();start=source.find('  // CURRENT_ROSTER_CLUBS_START')
if start>=0:
 end=source.index('  // CURRENT_ROSTER_CLUBS_END',start)+len('  // CURRENT_ROSTER_CLUBS_END\n');source=source[:start]+source[end:]
insertion='  // CURRENT_ROSTER_CLUBS_START\n  const currentClubs='+json.dumps(changed,ensure_ascii=False,separators=(',',':'))+';\n  leagues.forEach(l=>{l.historicalClubs=[...l.clubs];if(currentClubs[l.id]){l.clubs=currentClubs[l.id];l.referenceCompatible=l.clubs.every((n,i)=>n===l.historicalClubs[i]);}});\n  // CURRENT_ROSTER_CLUBS_END\n'
source=source.replace('  const data = {',insertion+'  const data = {',1);p.write_text(source)
report=[]
for l in world['leagues']:
 for i,name in enumerate(changed.get(l['id'],l['clubs'])):
  key=f"{l['id']}-{i}";report.append({'id':key,'club':name,'players':len(rows[key]),'playable':len(rows[key])>=11,'reference':references.get(key,{'source':'historical','date':None})})
(root/'data/roster-coverage.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print('TOTAL',sum(len(r)for r in rows.values()),'PLAYABLE',sum(r['playable']for r in report),'UPDATED CLUBS',len(references),'UNKNOWN AGE',sum(bool(r[11].get('ageUnknown'))for rs in rows.values()for r in rs if len(r)>11),'UNRESOLVED',unresolved)
print('CURRENT CLUB CHANGES',changed)
