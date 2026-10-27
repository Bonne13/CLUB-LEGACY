"""Collect real reserve goalkeepers and stadium references, without inventing players."""
import concurrent.futures, difflib, hashlib, html, json, pathlib, re, subprocess, unicodedata, urllib.request
from html.parser import HTMLParser
ROOT=pathlib.Path(__file__).resolve().parents[1]
CACHE=pathlib.Path('/tmp/dinastia-club-context');CACHE.mkdir(exist_ok=True)
RAW=json.loads(subprocess.check_output(['node','-e',"process.stdout.write(JSON.stringify({world:require('./world'),rosters:require('./roster-data')}))"],cwd=ROOT))
def norm(s):return re.sub('[^a-z0-9]','',unicodedata.normalize('NFKD',s.lower()).encode('ascii','ignore').decode())
CODES=dict(zip(['br','ar','en','es','it','de','fr','pt','nl','co','cl','uy','ec','pe','py','bo','ve','us','mx','sa','jp'],['bra.1','arg.1','eng.1','esp.1','ita.1','ger.1','fra.1','por.1','ned.1','col.1','chi.1','uru.1','ecu.1','per.1','par.1','bol.1','ven.1','usa.1','mex.1','ksa.1','jpn.1']))
ALIASES={'Bayern de Munique':'Bayern Munich','Inter de Milão':'Inter Milan','Olympique de Marseille':'Marseille','Olympique Lyonnais':'Lyon','Atlético de Madrid':'Atletico Madrid','Celta de Vigo':'Celta Vigo','Borussia Mönchengladbach':'Borussia Monchengladbach','Athletico Paranaense':'Athletico Paranaense','RB Leipzig':'RB Leipzig','Red Bull Bragantino':'Red Bull Bragantino','São Paulo':'Sao Paulo','Atlético Mineiro':'Atletico Mineiro','Gimnasia La Plata':'Gimnasia y Esgrima','Estudiantes':'Estudiantes de La Plata'}
PAGES=dict(zip(CODES,['2026_Campeonato_Brasileiro_Série_A','2026_Argentine_Primera_División','2026–27_Premier_League','2026–27_La_Liga','2026–27_Serie_A','2026–27_Bundesliga','2026–27_Ligue_1','2026–27_Primeira_Liga','2026–27_Eredivisie','2026_Categoría_Primera_A_season','2026_Chilean_Primera_División','2026_Uruguayan_Primera_División_season','2026_Ecuadorian_Serie_A','2026_Liga_1_(Peru)','2026_Paraguayan_Primera_División_season','2026_Bolivian_Primera_División_season','2026_Venezuelan_Primera_División_season','2026_Major_League_Soccer_season','2026–27_Liga_MX_season','2026–27_Saudi_Pro_League','2026_J1_100_Year_Vision_League']))
class Tables(HTMLParser):
 def __init__(self):super().__init__();self.stack=[];self.tables=[];self.skip=0
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag in ['script','style','sup']:self.skip+=1
  if tag=='table':self.stack.append({'rows':[],'row':None,'cell':None})
  if not self.stack:return
  t=self.stack[-1]
  if tag=='tr':t['row']=[]
  if tag in ['td','th']:t['cell']={'text':'','colspan':int(a.get('colspan','1')) if a.get('colspan','1').isdigit() else 1,'rowspan':int(a.get('rowspan','1')) if a.get('rowspan','1').isdigit() else 1,'links':[]}
  if tag=='a' and t['cell'] is not None and 'href' in a:t['cell']['links'].append(a['href'])
  if tag=='br' and t['cell'] is not None:t['cell']['text']+='; '
 def handle_endtag(self,tag):
  if tag in ['script','style','sup']:self.skip=max(0,self.skip-1)
  if not self.stack:return
  t=self.stack[-1]
  if tag in ['td','th'] and t['cell'] is not None:
   if t['row'] is not None:t['row'].append(t['cell'])
   t['cell']=None
  if tag=='tr' and t['row'] is not None:t['rows'].append(t['row']);t['row']=None
  if tag=='table':self.tables.append(self.stack.pop()['rows'])
 def handle_data(self,data):
  if self.stack and not self.skip and self.stack[-1]['cell'] is not None:self.stack[-1]['cell']['text']+=data

def fetch(url,json_value=False):
 key=CACHE/(hashlib.sha256(url.encode()).hexdigest()+('.json'if json_value else'.html'))
 if key.exists():raw=key.read_bytes()
 else:
  encoded=urllib.parse.quote(url,safe=':/?=&%()–-._')
  req=urllib.request.Request(encoded,headers={'User-Agent':'DinastiaFC reference research/1.0'})
  with urllib.request.urlopen(req,timeout=30)as r:raw=r.read()
  key.write_bytes(raw)
 return json.loads(raw)if json_value else raw.decode('utf-8')
def choose(name,items,keyfn):
 key=norm(ALIASES.get(name,name));ranked=[]
 for item in items:
  variants=keyfn(item);scores=[difflib.SequenceMatcher(None,key,norm(v)).ratio()for v in variants if v]
  if scores:ranked.append((max(scores),item))
 ranked.sort(key=lambda x:x[0],reverse=True)
 if ranked and (ranked[0][0]==1 or(ranked[0][0]>=.88 and(len(ranked)<2 or ranked[0][0]-ranked[1][0]>.12))):return ranked[0][1]
 return None

def league_data(l):
 result={'id':l['id'],'clubs':[],'classification':None,'page':None}
 for title in [PAGES[l['id']],PAGES[l['id']].replace('2026–27','2025–26').replace('2026_','2025_')]:
  url='https://en.wikipedia.org/wiki/'+title
  try:
   raw=fetch(url);parser=Tables();parser.feed(raw)
   flat=re.sub('<[^>]+>',' ',raw);flat=html.unescape(re.sub(r'\s+',' ',flat))
   criteria=re.search(r'Rules for classification:\s*(.{0,1600}?)(?=\s*(?:\(C\)|\(R\)|\(O\)|Source:|Notes:|Results|Positions|External|References))',flat)
   if criteria and not result['classification']:result['classification']=criteria.group(1).strip();result['page']=url
   for table in parser.tables:
    pending={};grid=[]
    for row in table:
     cells=[];col=0;next_pending={k:(v,n-1)for k,(v,n)in pending.items()if n>1}
     for cell in row:
      while col in pending:cells.append(pending[col][0]);col+=1
      for j in range(min(30,cell['colspan'])):
       cells.append(cell)
       if cell['rowspan']>1:next_pending[col]=(cell,cell['rowspan']-1)
       col+=1
     while col in pending:cells.append(pending[col][0]);col+=1
     grid.append(cells);pending=next_pending
    header=None
    for i,row in enumerate(grid):
     labels=[norm(c['text'])for c in row]
     stad=next((j for j,k in enumerate(labels)if k in ['stadium','stadiums','ground','homeground','venue']),None)
     club=next((j for j,k in enumerate(labels)if k in ['team','club','clubs']),None)
     cap=next((j for j,k in enumerate(labels)if k.startswith('capacity')),None)
     if stad is not None and club is not None:header=(i,club,stad,cap);break
    if not header:continue
    start,ci,si,capi=header
    for row in grid[start+1:]:
     if len(row)<=max(ci,si):continue
     name=row[ci]['text'].strip();club=choose(name,[{'name':n,'id':l['id']+'-'+str(i)}for i,n in enumerate(l['clubs'])],lambda t:[t['name'],ALIASES.get(t['name'],t['name'])])
     if not club:continue
     stadium=re.sub(r'\s+',' ',row[si]['text']).strip();capacity=None
     if capi is not None and len(row)>capi:
      m=re.search(r'\d[\d,. ]*',row[capi]['text'])
      if m:
       number=int(re.sub(r'\D','',m.group()));capacity=number if 1000<=number<=150000 else None
     if stadium and stadium not in ['TBD','TBA']and not any(c['id']==club['id']for c in result['clubs']):result['clubs'].append({**club,'venue':{'name':stadium,'capacity':capacity,'url':url,'reference':'2026/27'if '2026–27'in title else'2026'if '2026_'in title else'2025/26'if '2025–26'in title else'2025'}})
  except Exception as e:print('Wiki unavailable',title,str(e),flush=True)
 return result

def team_catalog(l):
 try:
  d=fetch(f'https://site.api.espn.com/apis/site/v2/sports/soccer/{CODES[l["id"]]}/teams?limit=100',True)
  teams=[r['team']for r in d['sports'][0]['leagues'][0]['teams']];result=[]
  for i,name in enumerate(l['clubs']):
   t=choose(name,teams,lambda t:[t.get(k,'')for k in ['displayName','name','location','shortDisplayName']])
   if t:result.append((l['id']+'-'+str(i),name,l['id'],t))
  return result
 except Exception as e:print('Catalog unavailable',l['id'],str(e),flush=True);return []

def reserve(job):
 club_id,name,code,t=job;roster=RAW['rosters']['teams'].get(club_id,{}).get('players',[])
 if sum(p[3]=='GOL'for p in roster)>=3:return None
 url=f'https://site.api.espn.com/apis/site/v2/sports/soccer/{CODES[code]}/teams/{t["id"]}/roster?season=2026'
 try:
  d=fetch(url,True);players=[]
  for a in d.get('athletes',[]):
   for p in a.get('items',[a]):
    if p.get('position',{}).get('abbreviation')not in ['G','GK']:continue
    if not p.get('dateOfBirth')or int(p.get('age',0))<16:continue
    players.append({'sourceId':p['id'],'name':p['displayName'],'birthDate':p['dateOfBirth'][:10],'nationality':p.get('citizenship'),'number':int(p['jersey'])if str(p.get('jersey','')).isdigit()and 1<=int(p['jersey'])<=99 else None})
  return {'id':club_id,'name':name,'sourceTeam':d.get('team',{}).get('displayName'),'url':url,'season':d.get('season',{}).get('displayName'),'players':players}
 except Exception as e:print('Reserve unavailable',name,str(e),flush=True)
 return None

def schedule(job):
 club_id,name,code,t=job;url=f'https://site.api.espn.com/apis/site/v2/sports/soccer/{CODES[code]}/teams/{t["id"]}/schedule?season=2026'
 try:
  d=fetch(url,True);venues=[]
  for event in d.get('events',[]):
   for c in event.get('competitions',[]):
    if any(x.get('homeAway')=='home'and x.get('team',{}).get('id')==t['id']for x in c.get('competitors',[]))and c.get('venue',{}).get('fullName'):
     venues.append((event['date'],c['venue']))
  if venues:
   date,v=max(venues,key=lambda x:x[0]);return {'id':club_id,'name':name,'venue':{'name':v['fullName'],'capacity':v.get('capacity'),'city':v.get('address',{}).get('city'),'url':url,'reference':date[:10]}}
 except Exception as e:print('Venue unavailable',name,str(e),flush=True)
 return None

if __name__=='__main__':
 prior_path=ROOT/'data/club-infrastructure.json'
 prior=json.loads(prior_path.read_text())if prior_path.exists()else{'clubs':[]}
 leagues=RAW['world']['leagues']
 with concurrent.futures.ThreadPoolExecutor(max_workers=5)as pool:pages=list(pool.map(league_data,leagues))
 clubs={c['id']:c for l in pages for c in l['clubs']};print('Wiki venues:',len(clubs),flush=True)
 (ROOT/'data/league-reference-research.json').write_text(json.dumps(pages,ensure_ascii=False,indent=2)+'\n')
 with concurrent.futures.ThreadPoolExecutor(max_workers=6)as pool:jobs=[j for batch in pool.map(team_catalog,leagues)for j in batch]
 with concurrent.futures.ThreadPoolExecutor(max_workers=8)as pool:reserves=[r for r in pool.map(reserve,jobs)if r]
 (ROOT/'data/reserve-goalkeepers.json').write_text(json.dumps({'revision':'keepers-2026-10-v1','checkedAt':'2026-10-27','clubs':reserves},ensure_ascii=False,indent=2)+'\n')
 missing=[j for j in jobs if j[0]not in clubs]
 with concurrent.futures.ThreadPoolExecutor(max_workers=8)as pool:
  for c in pool.map(schedule,missing):
   if c:clubs[c['id']]=c
 # A recent home fixture confirms Barcelona's venue during reconstruction.
 barca=next((j for j in jobs if j[0]=='es-1'),None)
 if barca:
  recent=schedule(barca)
  if recent:
   recent['venue']['capacity']=clubs.get('es-1',{}).get('venue',{}).get('capacity');clubs['es-1']=recent
 for c in prior['clubs']:
  if c['id']not in clubs:clubs[c['id']]=c
 data={'revision':'infrastructure-2026-10-v1','checkedAt':'2026-10-27','clubs':sorted(clubs.values(),key=lambda c:c['id'])}
 (ROOT/'data/club-infrastructure.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
 print('Confirmed venues:',len(clubs),'reserve lists:',len(reserves),flush=True)
