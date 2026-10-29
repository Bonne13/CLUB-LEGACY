const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});try{
 const p=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:3000');await p.locator('#start-league').selectOption('es');await p.locator('#start-club').selectOption('es-1');await p.locator('#start-coach-name').fill('Lucas Silva');await p.locator('[data-action=begin]').click();
 const nav=require('./navigation-helper.cjs').createNavigator(p);
 assert(await p.locator('.club-priorities').isVisible());await nav('Financeiro');assert(await p.locator('.finance-forecast').isVisible());assert.match(await p.locator('.finance-forecast').innerText(),/CAIXA PROJETADO/);
 const id='tm-1018912';const before=await p.evaluate(id=>team().players.find(p=>p.id===id).ovr,id);await p.evaluate(id=>{const p=team().players.find(p=>p.id===id);for(let i=0;i<6;i++)E.development.grow(state,p);render();},id);assert.equal(await p.evaluate(id=>team().players.find(p=>p.id===id).ovr,id),before+6);
 await nav('Elenco',{squadTab:'players'});assert.match(await p.locator('#content').innerText(),/Potencial/);
 for(const width of [320,390,768,1280]){await p.setViewportSize({width,height:900});await nav('Visão geral');assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await nav('Financeiro');assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
 await p.evaluate(()=>{globalThis.originalSetItem=Storage.prototype.setItem;globalThis.failedWrites=0;Storage.prototype.setItem=function(key,value){if(key===KEY){failedWrites++;throw Error('Quota exceeded');}return originalSetItem.call(this,key,value);};autosaver.request();});
 await p.waitForFunction(()=>document.querySelector('#save-status')?.textContent==='Não salvo');await p.waitForTimeout(800);assert.equal(await p.evaluate(()=>failedWrites),1);
 await p.evaluate(()=>{Storage.prototype.setItem=originalSetItem;autosaver.flush();});await p.reload();assert.equal(await p.evaluate(id=>team().players.find(p=>p.id===id).ovr,id),before+6);
 assert.deepEqual(errors,[]);console.log('Browser OK: central, projeção, evolução sem teto, celular e recuperação de falha no salvamento.');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
