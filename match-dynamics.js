"use strict";
(function(root){
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const labels={balanced:"Equilibrado",press:"Pressionar",protect:"Proteger resultado",chase:"Buscar o resultado",settle:"Controlar a posse",resist:"Reorganizar com um a menos"};
  function ensure(m){
    const d=m.dynamics??={version:1,momentum:[0,0],xg:[0,0],bigChances:[0,0],approaches:[null,null],phases:["balanced","balanced"],history:[]};
    return d;
  }
  function phase(m,side){
    const d=ensure(m),plan=m.plans[side],opp=m.plans[1-side],difference=m.goals[side]-m.goals[1-side];
    if(d.approaches[side])return d.approaches[side];
    const available=p=>p.starters.filter(p=>!p.sentOff).length;
    if(available(plan)<available(opp))return "resist";
    if(m.minute>=60&&difference<0)return "chase";
    if(m.minute>=72&&difference>0)return "protect";
    if(m.minute>=60&&plan.instructions.style==="Posse de bola")return "settle";
    if(plan.instructions.pressing==="Alta"&&m.minute<60)return "press";
    return "balanced";
  }
  function tick(m, advance=true){
    const d=ensure(m);
    for(let side=0;side<2;side++){
      if(advance)d.momentum[side]*=.94;
      const next=phase(m,side);
      if(next!==d.phases[side]){
        d.phases[side]=next;
        const text=`${m.minute}' — ${m.plans[side].name}: ${labels[next].toLowerCase()}.`;
        m.events.unshift(text);d.history.unshift({minute:m.minute,side,phase:next});d.history=d.history.slice(0,20);
      }
    }
    return d;
  }
  function context(m,side){
    const d=ensure(m),p=d.phases[side],op=d.phases[1-side];
    const opening=m.minute<15,late=m.minute>=75;
    const initiative=p==="chase"?.035:p==="press"?.02:p==="protect"?-.025:p==="resist"?-.035:0;
    const exposure=p==="chase"?.02:p==="press"?(late?.02:.012):p==="protect"?-.015:0;
    return {tempo:initiative+(opening?-.01:0),quality:(d.momentum[side]-d.momentum[1-side])*.00015+(side===0?.006:0)+(op==="chase"?.012:0),exposure,control:(p==="settle"?5:p==="protect"?-3:p==="chase"?3:p==="resist"?-7:0)};
  }
  function shot(m,side,chance,goal){
    const d=ensure(m);d.xg[side]=Math.round((d.xg[side]+chance)*1000)/1000;
    if(chance>=.3)d.bigChances[side]++;
    d.momentum[side]=clamp(d.momentum[side]+(goal?18:7),0,65);
    d.momentum[1-side]*=goal?.6:.95;
  }
  function approach(m,side,key){
    if(![null,"balanced","press","protect","chase","settle"].includes(key))throw Error("Postura inválida.");
    if(!m||m.done||m.minute>=90)throw Error("A partida não está em andamento.");
    ensure(m).approaches[side]=key;
    tick(m,false);
  }
  const api={ensure,tick,context,shot,approach,labels};root.LegacyMatchDynamics=api;
  if(typeof module!=="undefined")module.exports=api;
})(globalThis);
