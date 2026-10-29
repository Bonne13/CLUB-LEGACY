const {test}=require('node:test'),assert=require('node:assert/strict');
const E=require('../engine.js'),S=require('../saves.js');
function career(){const s=E.fresh();E.start(s,'es-1');return s;}
function random(seed=4821){return()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);}
test('IA reage ao placar e a expulsões, e postura manual permanece local à partida',()=>{
 const s=career(),m=E.makeMatch(s),side=m.pair.indexOf(s.clubId),other=1-side,permanent=JSON.stringify(E.team(s).tactics);
 m.minute=76;m.goals[side]=1;m.goals[other]=0;E.dynamics.tick(m);
 assert.equal(m.dynamics.phases[side],'protect');assert.equal(m.dynamics.phases[other],'chase');
 E.setMatchApproach(s,'press');assert.equal(m.dynamics.phases[side],'press');
 assert.equal(JSON.stringify(E.team(s).tactics),permanent);
 assert(E.dynamics.context(m,other).tempo>E.dynamics.context({...m,dynamics:{...m.dynamics,phases:['balanced','balanced']}},other).tempo);
 m.plans[other].starters[2].sentOff=true;E.dynamics.tick(m);assert.equal(m.dynamics.phases[other],'resist');
 assert.throws(()=>E.setMatchApproach(s,'invalid'));
});
test('xG e pressão são consequência das chances, não fabricam gols, e permanecem no save',()=>{
 const s=career(),m=E.makeMatch(s);for(let i=0;i<15;i++){const seq=[0,0,.5,0,.99,.99];E.minute(s,m,()=>seq.shift()??.99);}
 assert(m.dynamics.xg[0]>0);assert.equal(m.goals[0],0);assert(m.dynamics.momentum[0]>0);
 assert(m.dynamics.xg[0]<=m.shots[0]);const re=S.parse(S.serialize(s));assert.deepEqual(re.live.dynamics,m.dynamics);
 const previous=re.live.dynamics.xg[0];E.minute(re,re.live,()=>.99);assert.equal(re.live.dynamics.xg[0],previous);
});
test('adversário usa reservas sem trocar o onze do usuário ou ultrapassar regras',()=>{
 const s=career(),m=E.makeMatch(s),side=m.pair.indexOf(s.clubId),ids=m.plans[side].starters.map(p=>p.id),other=1-side;
 m.plans[other].starters.forEach(p=>p.fitness=55);
 while(m.minute<90)E.minute(s,m,()=>.99);
 assert((m.substitutions||[]).some(c=>c.side===other));assert(!m.substitutions.some(c=>c.side===side));
 assert.deepEqual(m.plans[side].starters.map(p=>p.id),ids);assert(m.substitutions.length<=5);
 assert(new Set(m.plans[other].starters.map(p=>p.id)).size===m.plans[other].starters.length);
 assert(E.leagueRules.substitutionInfo(m,other).windows<=3);
});
test('simulação é reproduzível, difere entre sementes e partidas antigas ganham campos sem reiniciar',()=>{
 const s=career(),base=E.makeMatch(s),a=structuredClone(base),b=structuredClone(base),c=structuredClone(base);
 for(const [m,seed]of [[a,12],[b,12],[c,432]]){const rng=random(seed);while(m.minute<90)E.minute(s,m,rng);}
 assert.deepEqual(a.goals,b.goals);assert.deepEqual(a.dynamics,b.dynamics);assert.notDeepEqual(a.dynamics,c.dynamics);
 const old=structuredClone(base);delete old.dynamics;old.minute=31;old.goals=[1,0];E.minute(s,old,()=>.99);assert.equal(old.minute,32);assert.deepEqual(old.goals,[1,0]);assert(old.dynamics);
});
