const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});try{
 const p=await browser.newPage({viewport:{width:1440,height:960}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 const html=fs.readFileSync(path.join(__dirname,'../dist/index.html'),'utf8');await p.route('**/*',r=>r.request().url()==='http://127.0.0.1:3000/'?r.fulfill({contentType:'text/html',body:html}):r.abort());
 await p.goto('http://127.0.0.1:3000');let cases=0;
 for(const theme of ['dark','light']){
  if(await p.evaluate(()=>document.documentElement.dataset.theme)!==theme)await p.locator('[data-action=toggle-theme]').first().click();
  for(const width of [320,390,768,1024,1440,1920]){await p.setViewportSize({width,height:960});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`entry overflow ${width}`);cases++;}
 }
 await p.locator('#start-league').selectOption('es');await p.locator('#start-club').selectOption('es-1');await p.locator('#start-calendar').selectOption('classic');await p.locator('#start-coach-name').fill('Lucas Silva');await p.locator('[data-action=begin]').click();
 await p.evaluate(()=>{E.makeMatch(state,'text');matchMode='text';page='Dia de jogo';paused=true;render();});
 for(const theme of ['dark','light']){
  if(await p.evaluate(()=>document.documentElement.dataset.theme)!==theme)await p.locator('#theme-toggle').click();
  for(const width of [320,390,768,1024,1440,1920]){
   await p.setViewportSize({width,height:960});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`match overflow ${width}`);
   assert(await p.locator('.match-controls').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
   if(theme==='dark'&&width===390)await p.screenshot({path:'/tmp/screens-match-390.png'});cases++;
  }
 }
 assert.equal(await p.evaluate(()=>state.live.minute),0);assert.deepEqual(errors,[]);console.log(JSON.stringify({screens:['entry','match'],cases,errors:0}));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
