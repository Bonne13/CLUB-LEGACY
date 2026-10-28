const {test}=require('node:test');
const assert=require('node:assert/strict');
const E=require('../engine.js'),S=require('../saves.js');
const id='tm-1018912';
function career(){const s=E.fresh();E.start(s,'es-1');return s;}
test('Xavi Espart mantém LD principal e atua em LE, VOL e MC sem perda posicional',()=>{
 const s=career(),p=E.team(s).players.find(p=>p.id===id);
 assert.deepEqual(p.naturalPositions,['LD']);
 assert.deepEqual(p.secondaryPositions,['VOL','LE','MC']);
 for(const [target,pos] of [['LD','LAT'],['LE','LAT'],['VOL','VOL'],['MC','MEI']]){
  const fit=E.tactics.adaptation(p,{target,pos});
  assert.equal(fit.effective,p.ovr);assert.equal(fit.penalty,0);
 }
 assert.equal(E.tactics.adaptation(p,{target:'LE',pos:'LAT'}).label,'Habitual');
});
test('atualização de save e de partida retomada preserva overall, clube e escalação',()=>{
 const s=career(),t=E.team(s),p=t.players.find(p=>p.id===id);
 p.secondaryPositions=[];p.positionRevision='positions-2026-10-v2';p.ovr=74;
 E.tactics.select(t,4,id);
 const ids=[...t.lineup],contract=p.contract,bank=t.money;
 s.live=E.makeMatch(s);
 const snapshot=s.live.plans.flatMap(p=>p.starters).find(p=>p.id===id);
 assert(!snapshot.secondaryPositions.includes('LE'));
 E.prepareCareer(s);
 assert(p.secondaryPositions.includes('LE'));
 assert(snapshot.secondaryPositions.includes('LE'));
 assert.equal(p.ovr,74);assert.equal(p.contract,contract);assert.equal(t.money,bank);
 assert.deepEqual(t.lineup,ids);
 const re=S.parse(S.serialize(s)),q=E.team(re).players.find(p=>p.id===id);
 assert(q.secondaryPositions.includes('LE'));assert.equal(q.ovr,74);
 E.prepareCareer(re);assert.equal(q.ovr,74);
});
