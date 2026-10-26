"""Concilia avaliações de referência por nascimento + identidade, nunca por preço."""
import argparse,csv,json,re,unicodedata,collections
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--players',required=True);p.add_argument('--profiles',required=True);a=p.parse_args()
root=Path(__file__).resolve().parents[1]
norm=lambda x: re.sub('[^a-z0-9]','',unicodedata.normalize('NFKD',x or'').encode('ascii','ignore').decode().lower())
tokens=lambda x:set(re.findall('[a-z0-9]+',unicodedata.normalize('NFKD',x or'').encode('ascii','ignore').decode().lower()))-{'de','da','dos','do','jr','junior'}
text=(root/'roster-data.js').read_text();data=json.loads(re.search(r'const data\s*=\s*(\{.*\});\s*root\.LegacyRosterData',text,re.S)[1])
profiles={r['player_id']:r for r in csv.DictReader(open(a.profiles,encoding='utf-8-sig'))}
rows=list(csv.DictReader(open(a.players,encoding='utf-8-sig')));bydob=collections.defaultdict(list);byid={}
for r in rows:
 if not r['overall'] or not r['dob']:continue
 bydob[r['dob']].append(r);byid[r['player_id']]=r
mapped={};positions={'GK':'GOL','RB':'LD','LB':'LE','CB':'ZAG','RWB':'AD','LWB':'AE','CDM':'VOL','CM':'MC','CAM':'MEI','RM':'MD','LM':'ME','RW':'PD','LW':'PE','ST':'CA','CF':'SA'}
for team in data['teams'].values():
 for r in team['players']:
  id='tm-'+r[0] if r[0].isdigit()else r[0];bio=data.get('playerBios',{}).get('players',{}).get(id,{})
  dob=r[2]or bio.get('birthDate');candidates=[]
  if id.startswith('sf-')and id[3:]in byid:candidates=[byid[id[3:]]]
  elif dob:
   profile=profiles.get(r[0],{});names=[r[1],profile.get('name_in_home_country','')]
   if r[1]=='Leo Messi':names.append('Lionel Messi')
   for e in bydob.get(dob,[]):
    exact=any(norm(n)and norm(n)in [norm(e['short_name']),norm(e['long_name'])]for n in names)
    subset=any(len(tokens(n))>=2 and tokens(n).issubset(tokens(e['long_name']))for n in names)
    if exact or subset:candidates.append(e)
  candidates={e['player_id']:e for e in candidates}
  if len(candidates)!=1:continue
  e=next(iter(candidates.values()))
  if dob and e['dob']!=dob:continue
  mapped[id]={'overall':int(e['overall']),'potential':int(e['potential']),'stamina':int(float(e['power_stamina']))if e['power_stamina']else 65,'positions':list(dict.fromkeys(positions[p.strip()]for p in e['player_positions'].split(',')if p.strip()in positions)),'sourceId':e['player_id'],'reference':e['fifa_update_date'],'url':'https://sofifa.com'+e['player_url']}
source={'revision':'ratings-fc26-2025-09','source':'https://github.com/ismailoksuz/EAFC26-DataHub','commit':'8724af5803a787c9c262eee2ac8f942651b0e4b9','reference':'FC26 / 19-09-2025; referência histórica, não avaliação oficial atualizada em 2026.','players':mapped}
(root/'data/player-ratings.json').write_text(json.dumps(source,ensure_ascii=False,indent=2)+'\n')
print('AVALIAÇÕES CONCILIADAS',len(mapped))
for id in ['tm-371998','tm-342229','tm-418560','tm-68290','mls-MLS-OBJ-000396','tm-8198']:print(id,mapped.get(id))
