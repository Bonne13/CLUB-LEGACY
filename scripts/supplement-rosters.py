"""Completa lacunas com vínculos históricos explícitos (SoFIFA, edições 2019/2021/2023).
Execute depois de import-rosters.py. Não importa clubes brasileiros dessas fontes,
nem associa nomes de clubes por aproximação. Prioriza o catálogo mais recente.
"""
import csv, json, pathlib, re, unicodedata, collections, subprocess, argparse
root=pathlib.Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--edition2019',default='/tmp/legacy-fifa2019.csv');p.add_argument('--edition2021',default='/tmp/legacy-fifa2021.csv');p.add_argument('--edition2023',default='/tmp/legacy-fifa2023-full.csv');p.add_argument('--profiles',default='/tmp/legacy-player_profiles.csv');args=p.parse_args()
def norm(s): return re.sub('[^a-z0-9]','',unicodedata.normalize('NFKD',re.sub(r'\s*\(\d+\)$','',s)).encode('ascii','ignore').decode().lower())
data=json.loads(subprocess.check_output(['node','-e',"process.stdout.write(JSON.stringify(require('./roster-data.js')))"],cwd=root))
world=json.loads(subprocess.check_output(['node','-e',"process.stdout.write(JSON.stringify(require('./world.js').leagues))"],cwd=root))
profiles=list(csv.DictReader(open(args.profiles,encoding='utf-8-sig')))
byname=collections.defaultdict(list);byabbr=collections.defaultdict(list)
for r in profiles:
 byname[norm(r['player_name'])].append(r)
 clean=re.sub(r'\s*\(\d+\)$','',r['player_name']).strip()
 if clean:byabbr[(norm(clean)[0],norm(clean.split(' ')[-1]))].append(r)
used={r[0] for t in data['teams'].values() for r in t['players']};usednames={norm(r[1]) for t in data['teams'].values() for r in t['players']};seenEA=set()
alias={
'co-1':'Millonarios FC','co-3':'Independiente Medellín','co-4':'Junior FC','co-14':'Rionegro Águilas','co-15':'Alianza Petrolera','co-16':'Boyacá Chicó FC','co-17':'Envigado FC',
'cl-2':'Universidad Católica','cl-3':'CD Palestino','cl-6':"CD O'Higgins",'cl-7':'CD Cobresal','cl-8':'CD Huachipato','cl-11':'CD Everton de Viña del Mar',
'uy-1':'Nacional de Montevideo','uy-2':'Liverpool Fútbol Club','uy-13':'Club Plaza Colonia',
'ec-2':'Barcelona Sporting Club','ec-4':'SD Aucas','ec-8':'Delfín SC',
'pe-0':'Universitario de Deportes','pe-2':'Sporting Cristal','pe-3':'Melgar FBC','pe-8':'Club Atlético Grau',
'py-0':'Olimpia Asunción','py-1':'Cerro Porteño','py-2':'Club Libertad','py-3':'Club Guaraní','py-4':'Nacional Asunción',
'bo-0':'Club Bolívar','bo-3':'Club Blooming',
've-0':'Deportivo Táchira','ve-9':'Zamora FC','ve-10':'Estudiantes de Mérida',
'ar-6':'Vélez Sarsfield','ar-8':"Newell's Old Boys",'ar-17':'Club Atlético Tigre','ar-18':'Gimnasia y Esgrima La Plata','ar-28':'San Martín de San Juan','ar-29':'Club Atlético Aldosivi',
'sa-0':'Al Hilal','sa-1':'Al Nassr','sa-2':'Al Ittihad','sa-3':'Al Ahli','sa-4':'Al Shabab','sa-5':'Al Qadisiyah','sa-6':'Ettifaq FC','sa-7':'Al Taawoun','sa-8':'Al Fateh','sa-9':'Al Fayha','sa-11':'Damac FC','sa-17':'Al Hazem'
}
# Vínculos de Alianza Petrolera preservados como história da instituição hoje Alianza FC.
historical={r['ID']:r for r in csv.DictReader(open(args.edition2021,encoding='utf-8-sig'))}
newalias={'ar-4':'San Lorenzo de Almagro','ar-19':'Club Atlético Banfield','ar-27':'Club Atlético Sarmiento','co-19':'Club Unión Magdalena S.A.','uy-8':'Cerro Largo Fútbol Club','ec-8':'Delfín Sporting Club','pe-0':'Club Universitario de Deportes','pe-2':'Club Sporting Cristal','pe-11':'Universidad Técnica de Cajamarca','pe-16':'Ayacucho','bo-1':'Club Always Ready','bo-2':'Club The Strongest','bo-3':'Club Social, Cultural y Deportivo de Blooming','bo-6':'Club Atlético Nacional Potosí','bo-14':'Club Deportivo Guabirá','ve-6':'Metropolitanos de Caracas FC','ve-9':'Zamora Fútbol Club','sa-10':'Al Khaleej','co-1':'Millonarios FC','co-3':'Independiente Medellín','co-4':'Junior FC','co-14':'Águilas Doradas Rionegro','cl-3':'Club Deportivo Palestino','cl-9':'Deportivo Ñublense','cl-11':'CD Everton de Viña del Mar','uy-1':'Club Nacional de Football','uy-2':'Liverpool Fútbol Club','uy-15':'Montevideo City Torque','ec-2':'Barcelona Sporting Club','ec-4':'SD Aucas','py-0':'Olimpia Asunción','py-1':'Club Cerro Porteño','py-2':'Club Libertad','py-3':'Club Guaraní','py-4':'Nacional Asunción','bo-0':'Club Bolívar','bo-3':'Club Blooming','ve-0':'Deportivo Táchira FC','ve-2':'Deportivo La Guaira FC','ve-9':'Zamora FC','ve-10':'Estudiantes de Mérida'}
added=0
for edition,path,referenceyear in [('2023',args.edition2023,2022),('2021',args.edition2021,2020),('2019',args.edition2019,2018)]:
 rows=list(csv.DictReader(open(path,encoding='utf-8-sig')));groups=collections.defaultdict(list)
 for r in rows: groups[norm(r['Club'])].append(r)
 for l in world:
  if l['id']=='br':continue # edições EA podem incluir identidades não licenciadas no Brasil
  for i,club in enumerate(l['clubs']):
   key=f"{l['id']}-{i}";t=data['teams'][key]
   if len(t['players'])>=22:continue
   candidates=groups[norm(newalias.get(key,alias.get(key,club)) if edition=='2023' else alias.get(key,club))]
   # Prefere jogadores de posições diferentes; não cria goleiros nem altera posições.
   candidates.sort(key=lambda r:(r['Position']!='GK',-float(r['Overall'] or 0)))
   for r in candidates:
    if len(t['players'])>=24:break
    r=dict(r)
    if edition=='2023':
     r['Name']=historical.get(r['ID'],{}).get('Name',r['Name'])
     r['Position']=re.sub('<[^>]+>','',r['Position']).strip()
    if not r['Name'] or r['ID'] in seenEA or norm(r['Name']) in usednames:continue
    age=int(r['Age'])+2025-referenceyear
    if not 16<=age<=43:continue
    matches=[x for x in byname[norm(r['Name'])] if x['date_of_birth'] and abs(int(x['date_of_birth'][:4])-(referenceyear-int(r['Age'])))<=2 and r['Nationality'] in x['citizenship']]
    if edition=='2023' and not matches and re.match(r'^[A-Z]\.',r['Name']):
     surname=norm(r['Name'].split(' ',1)[-1]);initial=norm(r['Name'][0])
     matches=[x for x in byabbr[(initial,surname)] if x['date_of_birth'] and abs(int(x['date_of_birth'][:4])-(referenceyear-int(r['Age'])))<=1 and r['Nationality'] in x['citizenship']]
    dob=None;pid='sf-'+r['ID']
    if len(matches)==1:
     x=matches[0]
     if x['date_of_death'] or x['player_id'] in used:continue
     dob=x['date_of_birth'];pid=x['player_id'];r['Name']=re.sub(r'\s*\(\d+\)$','',x['player_name']).strip()
    position=r['Position']
    if position in ['SUB','RES','']:
     position=historical.get(r['ID'],{}).get('Position','')
     if not position and len(matches)==1:
      main=matches[0]['position'].lower()
      position='GK' if 'goalkeeper' in main else 'LB' if 'left-back' in main else 'RB' if 'right-back' in main else 'CB' if 'defender' in main else 'CDM' if 'defensive midfield' in main else 'ST' if 'attack' in main else 'CM' if 'midfield' in main else ''
    if not position or position in ['SUB','RES']:continue
    pos='GOL' if position=='GK' else 'LAT' if position in ['LB','RB','LWB','RWB'] else 'ZAG' if position in ['CB','LCB','RCB'] else 'VOL' if position in ['CDM','LDM','RDM'] else 'ATA' if position in ['ST','LS','RS','CF','LF','RF','LW','RW'] else 'MEI'
    # Preços de um videogame histórico servem apenas como parâmetros estimados.
    v=(r['Value'] or '0').replace('€','');factor=1e6 if v.endswith('M') else 1e3 if v.endswith('K') else 1
    value=int(float(v.rstrip('MK'))*factor)
    t['players'].append([pid,r['Name'],dob,pos,value,None,None,r['Nationality'],'sofifa-'+edition,int(r['Age']),referenceyear])
    used.add(pid);usednames.add(norm(r['Name']));seenEA.add(r['ID']);added+=1
    t.setdefault('historicalSources',[])
    if edition not in t['historicalSources']:t['historicalSources'].append(edition)
metadata={'additionalSource':{'source':'https://github.com/anselmoaxo/dataset-fifa23','commit':'ad01b925859ddf412d47856ce05d04ba4944dbf2','file':'data/FIFA23_official_data.csv'},'source':'https://github.com/amanthedorkknight/fifa18-all-player-statistics','commit':'dfa2c55b08f9c9dd0fb26e5db9585e026bf263a7','files':['2019/data.csv','2021/data.csv'],'reference':'Compilações históricas SoFIFA 2019/2021/2023; vínculos antigos, não elencos atuais. Idade sem nascimento é aproximada.'}
data['supplement']=metadata
(root/'roster-data.js').write_text('"use strict";\n(function(root){const data='+json.dumps(data,ensure_ascii=False,separators=(',',':'))+';root.LegacyRosterData=data;if(typeof module!=="undefined")module.exports=data;})(globalThis);\n')
report=[]
for l in world:
 for i,club in enumerate(l['clubs']):
  key=f"{l['id']}-{i}";t=data['teams'][key];report.append({'id':key,'club':club,'sourceId':t['sourceId'],'players':len(t['players']),'playable':len(t['players'])>=11,'historicalSources':t.get('historicalSources',[])})
(root/'data/roster-coverage.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print('Adicionados:',added,'Total:',sum(r['players'] for r in report),'Clubes jogáveis:',sum(r['playable'] for r in report))
for l in world:
 rr=[r for r in report if r['id'].startswith(l['id']+'-')];print(l['id'],sum(r['playable'] for r in rr),'/',len(rr))
