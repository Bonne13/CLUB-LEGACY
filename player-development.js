"use strict";
(function(root){
  function grow(s,p,academy=false,reason="Treinamento"){
    if(p.injury || p.ovr>=p.potential || (!p.ageUnknown && p.age >= (p.pos==="GOL"?35:31)))return false;
    const club=s.teams?.find(t=>t.id===s.clubId),owned=club && (club.players.includes(p)||club.youth.includes(p));
    if(owned && p.growthSeason!==s.season){p.growthSeason=s.season;p.growthPoints=0;}
    const before=p.ovr;p.ovr=Math.min(p.potential,p.ovr+1);
    if(owned)p.growthPoints+=p.ovr-before;
    p.developmentChange=p.ovr-before;
    p.price=Math.max(10000,Math.round(p.price*Math.pow(1.04,p.ovr-before)));
    if(owned) {
      p.developmentHistory??=[];p.developmentHistory.unshift({season:s.season,offset:s.today,before,after:p.ovr,reason});p.developmentHistory=p.developmentHistory.slice(0,8);
    }
    return true;
  }
  function performance(s,t){
    for(const p of t.players){
      if(p.ageUnknown||p.age>=24)continue;
      const stats=s.performance?.current?.players?.[p.id];
      if(!stats||stats.ratedMatches<5||stats.clubId!==t.id)continue;
      const avg=stats.ratingSum/stats.ratedMatches;
      const earned=avg>=7.2 ? Math.floor(stats.minutes/450)*(avg>=8?2:1) : 0;
      if(!earned)continue;
      if(p.performanceGrowth?.season!==s.season)p.performanceGrowth={season:s.season,claimed:0};
      while(p.performanceGrowth.claimed<earned){if(!grow(s,p,false,"Bom desempenho em jogos oficiais"))break;p.performanceGrowth.claimed++;}
    }
  }
  const api={grow,performance};root.LegacyPlayerDevelopment=api;
  if(typeof module!=="undefined")module.exports=api;
})(globalThis);
