const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
  const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  try {
    const page=await browser.newPage({viewport:{width:1280,height:900}}), errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(process.env.CLUB_LEGACY_URL || 'http://127.0.0.1:3000');
    await page.locator('#start-league').selectOption('es');
    await page.locator('#start-club').selectOption('es-1');
    await page.locator('#start-coach-name').fill('Lucas Silva');
    await page.locator('#start-calendar').selectOption('classic');
    await page.locator('[data-action=begin]').click();
    const nav=require('./navigation-helper.cjs').createNavigator(page);
    const candidate=await page.evaluate(()=>team().players.find(p=>p.id==='tm-1018912').id);
    assert.equal(await page.evaluate(id=>team().players.find(p=>p.id===id).ovr,candidate),71);
    await nav('Elenco',{squadTab:'players'});
    await page.locator(`[data-action=sell][data-id="${candidate}"]`).click();
    assert.match(await page.locator('#deal').innerText(),/Lista de venda/);
    assert.equal(await page.getByRole('button',{name:'Aceitar venda',exact:true}).count(),0);
    await page.getByRole('button',{name:'Colocar na lista',exact:true}).click();
    assert(await page.evaluate(id=>team().players.some(p=>p.id===id),candidate));
    async function receive(){await page.evaluate(()=>{state.today+=3;state.day=E.calendar(state).findIndex(d=>d.offset>=state.today);E.processOutgoingMarket(state);render();});}
    await receive();
    assert((await page.locator('.outgoing-offer').count())>=2);
    await page.locator('[data-action=reject-outgoing]').first().click();
    await page.locator('[data-action=accept-outgoing]').first().click();
    assert.equal(await page.evaluate(id=>team().players.some(p=>p.id===id),candidate),false);
    await nav('Elenco',{squadTab:'players'});
    const loanId=await page.evaluate(()=>team().players.filter(p=>p.contract>=state.season+2&&!p.loan).sort((a,b)=>a.ovr-b.ovr)[0].id);
    await page.locator(`[data-action=list-loan][data-id="${loanId}"]`).click();
    await page.locator('#deal [name=withOption]').selectOption('yes');
    await page.getByRole('button',{name:'Colocar na lista',exact:true}).click();
    assert(await page.evaluate(id=>team().players.some(p=>p.id===id&&!p.loan),loanId));
    await receive();
    assert((await page.locator('.outgoing-offer').count())>=2);
    for(const width of [320,390,768,1280]){
      await page.setViewportSize({width,height:900});
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`page overflow ${width}`);
      assert(await page.locator('.outgoing-offer').evaluateAll(els=>els.every(el=>el.getBoundingClientRect().right<=innerWidth+1)),`offer overflow ${width}`);
    }
    await page.getByRole('button',{name:'Aceitar empréstimo',exact:true}).first().click();
    const loan=await page.evaluate(id=>state.teams.flatMap(t=>t.players).find(p=>p.id===id)?.loan,loanId);
    assert(loan?.option>0);
    assert.equal(await page.evaluate(id=>team().players.some(p=>p.id===id),loanId),false);
    assert.match(await page.locator('#content').innerText(),/Salário pago pelo destino/);
    await page.getByRole('button',{name:'Salvar carreira',exact:true}).click();
    await page.waitForTimeout(1000);
    await page.reload();
    await page.waitForFunction(()=>!!state.clubId);
    assert(await page.evaluate(id=>state.teams.flatMap(t=>t.players).some(p=>p.id===id&&p.loan?.ownerId===state.clubId),loanId));
    assert.equal(await page.evaluate(id=>team().players.some(p=>p.id===id),candidate),false);
    assert.deepEqual(errors,[]);
    console.log('Browser OK: listar sem venda imediata, múltiplas propostas, recusa, venda, empréstimo com opção, responsividade e save/recarga.');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
