"""Resolve shared team endpoints and exclude ambiguous cross-club athlete listings."""
import collections,importlib,json
M=importlib.import_module('import-club-context')
files=['data/reserve-goalkeepers.json','data/young-player-references.json'];data=[json.loads((M.ROOT/f).read_text())for f in files]
byurl=collections.defaultdict(dict)
for source in data:
 for c in source['clubs']:byurl[c['url']][c['id']]=c
rejected=set()
for url,clubs in byurl.items():
 if len(clubs)<2:continue
 payload=M.fetch(url,True);provider=payload.get('team',{}).get('displayName','')
 exact=[c for c in clubs.values()if M.norm(M.ALIASES.get(c['name'],c['name']))==M.norm(provider)]
 keep=exact[0]['id']if len(exact)==1 else None
 rejected.update(c['id']for c in clubs.values()if c['id']!=keep)
 print('Shared endpoint',provider,'kept',keep,'discarded',[c['name']for c in clubs.values()if c['id']!=keep])
for f,source in zip(files,data):
 source['clubs']=[c for c in source['clubs']if c['id']not in rejected]
 (M.ROOT/f).write_text(json.dumps(source,ensure_ascii=False,indent=2)+'\n')
