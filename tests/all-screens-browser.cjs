const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const NAV=require('../navigation.js');
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});try{
 const p=await browser.newPage({viewport:{width:1440,height:960}}),errors=[],issues=[];p.on('pageerror',e=>errors.push(e.message));
 if(process.argv.includes('--standalone')){
  const html=fs.readFileSync(require('node:path').join(__dirname,'../dist/index.html'),'utf8');
  await p.route('**/*',route=>route.request().url()==='http://127.0.0.1:3000/' ? route.fulfill({contentType:'text/html',body:html}) : route.abort());
 }
 await p.goto('http://127.0.0.1:3000');await p.locator('#start-coach-name').fill('Lucas Silva');await p.locator('[data-action=begin]').click();
 const nav=require('./navigation-helper.cjs').createNavigator(p);
 const stateSnapshot=()=>p.evaluate(()=>JSON.stringify({club:state.clubId,season:state.season,today:state.today,money:team().money,mode:state.mode,players:team().players.map(p=>[p.id,p.ovr,p.price,p.contract])}));const baseline=await stateSnapshot();
 const sections=NAV.groups.flatMap(g=>g.sections);
 for(const theme of ['dark','light']){
  if(await p.evaluate(()=>document.documentElement.dataset.theme)!==theme)await p.locator('#theme-toggle').click();
  for(const width of [320,390,768,1024,1440,1920]){
   await p.setViewportSize({width,height:960});
   for(const section of sections){
    await nav(section.page,{squadTab:section.squadTab});
    const problems=await p.evaluate(()=>{
     const bad=[];if(document.documentElement.scrollWidth>innerWidth+1)bad.push('document overflow');
     for(const e of document.querySelectorAll('#content form,#content .card,#content input,#content select,#content button')){
      const r=e.getBoundingClientRect();if(!r.width||!r.height||!e.checkVisibility())continue;
      if(e.closest('.workspace-tabs,.scope-filters,.table-wrap,.bench-strip,.calendar-strip'))continue;
      if(r.left < -1 || r.right>innerWidth+1)bad.push(`${e.tagName}.${e.className}: ${Math.round(r.left)}..${Math.round(r.right)}`);
     }
     return bad.slice(0,5);
    });
    if(problems.length)issues.push({theme,width,page:section.page,tab:section.squadTab,problems});
    assert((await p.locator('#content').innerText()).length>20);
    if(section.squadTab==='tactics'){
      assert(await p.locator('#formation').evaluate(e=>e.getBoundingClientRect().width>=100),'formation control too narrow');
      assert(await p.locator('#tactical-scope').evaluate(e=>e.getBoundingClientRect().width>=100),'team control too narrow');
    }
    if(theme==='dark'&&[390,1440].includes(width)&&['Treinamento','Financeiro','Olheiros','Elenco'].includes(section.page))await p.screenshot({path:`/tmp/screens-${section.key}-${width}.png`});
   }
  }
 }
 for(const width of [320,390,1024,1440]){
  await p.setViewportSize({width,height:960});await nav('Elenco',{squadTab:'players'});
  for(const action of ['list-loan','sell','renew','edit-shirt']){
   await p.locator(`[data-action="${action}"]`).first().click();
   assert(await p.locator('#deal').isVisible());
   assert(await p.locator('#deal').evaluate(e=>e.scrollWidth<=e.clientWidth+1),`dialog overflow: ${action}/${width}`);
   await p.locator('[data-action=close-dialog]').click();
  }
  await p.locator('#navigation-search').click();assert(await p.locator('#quick-menu').isVisible());await p.keyboard.press('Escape');
 }
 fs.writeFileSync('/tmp/all-screens-issues.json',JSON.stringify(issues,null,2));
 assert.deepEqual(errors,[]);assert.equal(await stateSnapshot(),baseline);
 if(!process.env.LAYOUT_AUDIT_ONLY)assert.deepEqual(issues,[],'See /tmp/all-screens-issues.json');
 console.log(JSON.stringify({sections:sections.length,viewports:6,themes:2,checks:sections.length*12,issues:issues.length}));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
