"""Snapshot U21 players listed by their real clubs, with a confirmed birth date."""
import concurrent.futures,datetime,importlib,json,pathlib
M=importlib.import_module('import-club-context')
TODAY=datetime.date(2026,10,27)
def collect(job):
 club,name,code,t=job;url=f'https://site.api.espn.com/apis/site/v2/sports/soccer/{M.CODES[code]}/teams/{t["id"]}/roster?season=2026'
 try:
  d=M.fetch(url,True);players=[]
  for entry in d.get('athletes',[]):
   for a in entry.get('items',[entry]):
    dob=(a.get('dateOfBirth')or'')[:10]
    try:born=datetime.date.fromisoformat(dob)
    except ValueError:continue
    age=TODAY.year-born.year-((TODAY.month,TODAY.day)<(born.month,born.day))
    if not 16<=age<=21:continue
    p=a.get('position',{}).get('abbreviation');position={'G':'GOL','GK':'GOL','D':'ZAG','M':'MEI','F':'ATA'}.get(p)
    if not position:continue
    jersey=str(a.get('jersey',''))
    players.append({'sourceId':a['id'],'name':a['displayName'],'birthDate':dob,'nationality':a.get('citizenship'),'number':int(jersey)if jersey.isdigit()and 1<=int(jersey)<=99 else None,'position':position,'positionEstimated':position!='GOL','ageAtReference':age})
  return {'id':club,'name':name,'sourceTeam':d.get('team',{}).get('displayName'),'url':url,'season':d.get('season',{}).get('displayName'),'players':players}
 except Exception as e:print('Unavailable',name,str(e),flush=True)
 return None
with concurrent.futures.ThreadPoolExecutor(max_workers=6)as pool:jobs=[job for batch in pool.map(M.team_catalog,M.RAW['world']['leagues'])for job in batch]
with concurrent.futures.ThreadPoolExecutor(max_workers=8)as pool:clubs=[c for c in pool.map(collect,jobs)if c and c['players']]
data={'revision':'young-2026-10-v1','checkedAt':TODAY.isoformat(),'clubs':clubs}
(M.ROOT/'data/young-player-references.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n');print(len(clubs),'clubs;',sum(len(c['players'])for c in clubs),'published U21 identities',flush=True)
