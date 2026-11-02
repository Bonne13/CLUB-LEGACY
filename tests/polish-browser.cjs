const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});try{
 const p=await b.newPage({viewport:{width:1365,height:900}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:3000');await p.locator('#start-coach-name').fill('Lucas Silva');await p.locator('[data-action=begin]').click();
 const nav=require('./navigation-helper.cjs').createNavigator(p);
 const snapshot=()=>p.evaluate(()=>JSON.stringify({club:state.clubId,season:state.season,today:state.today,mode:state.mode,money:team().money,players:team().players.map(p=>[p.id,p.ovr,p.price,p.contract])}));const baseline=await snapshot();
 const pages=['Visão geral','Elenco','Transferências','Lista de saídas','Olheiros','Financeiro','Treinamento','Categorias de base','Calendário','Clube','Salvamentos'];
 for(const theme of ['dark','light']){
  if(await p.evaluate(()=>document.documentElement.dataset.theme)!==theme)await p.locator('#theme-toggle').click();
  for(const width of [320,390,768,1365]){
   await p.setViewportSize({width,height:900});
   for(const page of pages){await nav(page,{squadTab:'players'});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${page}: overflow ${width}/${theme}`);assert((await p.locator('#content').innerText()).length>30);}
   if(theme==='dark'&&[390,1365].includes(width)){await nav('Visão geral');await p.screenshot({path:`/tmp/polish-after-${width}.png`});}
  }
 }
 await nav('Elenco',{squadTab:'players'});await p.locator('[data-action=roster-view][data-id=table]').click();assert.equal(await p.locator('.segmented [data-action=roster-view][data-id=table]').getAttribute('aria-pressed'),'true');assert.equal(await p.locator('.segmented [data-action=roster-view][data-id=cards]').getAttribute('aria-pressed'),'false');
 const table=p.locator('.table-wrap').first();assert.equal(await table.getAttribute('tabindex'),'0');assert(await table.getAttribute('aria-label'));await table.focus();assert(await table.evaluate(e=>e===document.activeElement));
 await p.evaluate(()=>notify('Ajuste concluído.'));await p.getByRole('button',{name:'Fechar aviso',exact:true}).click();assert(await p.locator('#notification').isHidden());
 await p.evaluate(()=>notify('Não foi possível concluir.',true));assert.equal(await p.locator('#notification').getAttribute('role'),'alert');await p.getByRole('button',{name:'Fechar aviso',exact:true}).click();assert(await p.locator('#notification').isHidden());
 await nav('Elenco',{squadTab:'players'});await p.locator('[data-action=roster-view][data-id=cards]').click();await p.locator('[data-action=list-loan]').first().click();assert(await p.locator('#deal').isVisible());await p.locator('[data-action=close-dialog]').click();assert(await p.locator('#deal').isHidden());
 assert.equal(await snapshot(),baseline);await p.locator('#save').click();await p.waitForTimeout(700);await p.reload();assert.equal(await snapshot(),baseline);assert.deepEqual(errors,[]);
 console.log('Polish OK: 11 páginas, 4 larguras, temas claro/escuro, tabelas por teclado, estados de botões, avisos, diálogo e save preservado.');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1)});
