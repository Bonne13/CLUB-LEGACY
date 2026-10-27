"""Snapshot shirt numbers from ESPN, matching existing club and player identities only."""
import concurrent.futures, datetime, difflib, json, pathlib, subprocess, unicodedata, urllib.request, re
ROOT=pathlib.Path(__file__).resolve().parents[1]
DATA=json.loads(subprocess.check_output(['node','-e',"process.stdout.write(JSON.stringify({world:require('./world'),rosters:require('./roster-data')}))"],cwd=ROOT))
LEAGUES=dict(zip(['br','ar','en','es','it','de','fr','pt','nl','co','cl','uy','ec','pe','py','bo','ve','us','mx','sa','jp'],['bra.1','arg.1','eng.1','esp.1','ita.1','ger.1','fra.1','por.1','ned.1','col.1','chi.1','uru.1','ecu.1','per.1','par.1','bol.1','ven.1','usa.1','mex.1','ksa.1','jpn.1']))
def norm(s):return re.sub('[^a-z0-9]','',unicodedata.normalize('NFKD',s.lower()).encode('ascii','ignore').decode())
ALIASES={'Bayern de Munique':'Bayern Munich','Inter de Milão':'Internazionale','Olympique de Marseille':'Marseille','Olympique Lyonnais':'Lyon','Athletic Club':'Athletic Club','Deportivo La Coruña':'Deportivo La Coruna','Vasco da Gama':'Vasco da Gama','Atlético de Madrid':'Atletico Madrid','Paris Saint-Germain':'Paris Saint-Germain','Borussia Mönchengladbach':'Borussia Monchengladbach'}
def get(url):
 request=urllib.request.Request(url,headers={'User-Agent':'DinastiaFC-data-snapshot/1.0'})
 with urllib.request.urlopen(request,timeout=35) as r:return json.load(r)
def catalog(item):
 league=LEAGUES[item['id']]
 try:
  data=get(f'https://site.api.espn.com/apis/site/v2/sports/soccer/{league}/teams?limit=100')
  teams=data['sports'][0]['leagues'][0]['teams'];jobs=[]
  for i,name in enumerate(item['clubs']):
   key=norm(ALIASES.get(name,name));matches=[]
   for row in teams:
    team=row['team'];variants=[team.get(k,'') for k in ['displayName','name','location','shortDisplayName']]
    score=max(difflib.SequenceMatcher(None,key,norm(v)).ratio() for v in variants if v)
    matches.append((score,team))
   matches.sort(key=lambda x:x[0],reverse=True)
   if matches and (matches[0][0]==1 or (matches[0][0]>=.86 and (len(matches)<2 or matches[0][0]-matches[1][0]>.12))):
    jobs.append((item['id']+'-'+str(i),name,league,matches[0][1]))
  return jobs
 except Exception as e:print('Catalog unavailable',league,str(e),flush=True);return []
def roster(job):
 club_id,name,league,team=job
 url=f'https://site.api.espn.com/apis/site/v2/sports/soccer/{league}/teams/{team["id"]}/roster?season=2026'
 try:
  data=get(url);athletes=[]
  for entry in data.get('athletes',[]):athletes.extend(entry.get('items',[entry]))
  byname={}
  for athlete in athletes:
   for key in ['displayName','fullName','shortName']:
    label=athlete.get(key)
    if label:byname.setdefault(norm(label),{})[athlete['id']]=athlete
  rows=DATA['rosters']['teams'].get(club_id,{}).get('players',[]);players=[]
  for row in rows:
   found=byname.get(norm(row[1]),{})
   if len(found)!=1:continue
   a=next(iter(found.values()));jersey=str(a.get('jersey',''))
   if not jersey.isdigit() or not 1<=int(jersey)<=99:continue
   pid='tm-'+row[0] if row[0].isdigit() else row[0]
   players.append({'id':pid,'name':row[1],'number':int(jersey),'sourceId':a['id']})
  # Do not import ambiguous duplicate numbers from a provider's expanded squad.
  counts={p['number']:sum(x['number']==p['number'] for x in players) for p in players}
  players=[p for p in players if counts[p['number']]==1]
  if players:return {'id':club_id,'name':name,'sourceTeam':team['displayName'],'season':data.get('season',{}).get('displayName','2026'),'url':url,'players':players}
 except Exception as e:print('Roster unavailable',name,str(e),flush=True)
 return None
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:jobs=[j for batch in pool.map(catalog,DATA['world']['leagues']) for j in batch]
print('Matched clubs:',len(jobs),flush=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:clubs=[c for c in pool.map(roster,jobs) if c]
clubs.sort(key=lambda c:c['id'])
data={'revision':'shirts-2026-10-v1','checkedAt':'2026-10-27','provider':'ESPN squad listings','clubs':clubs}
(ROOT/'data/shirt-numbers.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
(ROOT/'shirt-numbers-data.js').write_text('"use strict";\n(function(root){const data='+json.dumps(data,ensure_ascii=False,separators=(',',':'))+';root.LegacyShirtNumbers=data;if(typeof module!=="undefined")module.exports=data;})(globalThis);\n')
print('Imported:',len(clubs),'clubs;',sum(len(c['players']) for c in clubs),'existing player identities',flush=True)
