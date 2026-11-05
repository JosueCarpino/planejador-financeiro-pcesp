// Smoke test DOM do painel v3. Dependência jsdom usada apenas no CI.
'use strict';
const {JSDOM}=require('jsdom');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8').replace(/<script\b[^>]*><\/script>/g,'');
const dom=new JSDOM(html,{url:'https://example.org/planejador-financeiro-pcesp/',runScripts:'outside-only'});
const win=dom.window;win.scrollTo=()=>{};win.confirm=()=>true;win.alert=e=>{throw Error('Alerta inesperado: '+e);};
const evalFile=name=>win.eval(fs.readFileSync(path.join(__dirname,name),'utf8'));
evalFile('app.js');
evalFile('amortization.js');
evalFile('v3.js');
evalFile('v3-advanced.js');
evalFile('v3-calendar.js');
win.document.dispatchEvent(new win.Event('DOMContentLoaded'));
const document=win.document;
setTimeout(()=>{
 try{
  const must=id=>{const item=document.getElementById(id);assert.ok(item,'Campo não encontrado: '+id);return item;};
  assert.ok(document.querySelectorAll('[data-nav]').length>=6);
  assert.ok(must('v3Overview').querySelectorAll('.v3-stat').length>=4);
  assert.ok(must('v3Debts').querySelectorAll('.v3-debt-card').length===3);
  assert.ok(must('v3Amort').querySelectorAll('[data-adv]').length>=7);
  assert.ok(must('v3CalendarGrid').querySelectorAll('.v3-cal-cell').length>=28);
  assert.equal(must('view-inicio').hidden,false);
  const app=win.FIN_APP;
  const s=app.get();
  s.entries=[{id:'example-1',month:'2027-02',name:'Conta de exemplo',amount:99.50,type:'expense',recurring:'once',category:'Moradia',dueDay:18,status:'planned'}];
  app.replace(s);
  assert.match(must('v3Ledger').textContent,/Conta de exemplo/);
  assert.ok(must('v3Ledger').querySelector('[data-edit="example-1"]'));
  const changed=app.get();
  changed.advanced={financed:2000,net:1900,rate:1,term:12,extra:100,target:8,basePayment:0};
  app.replace(changed);
  assert.match(must('v3AmortResults').textContent,/Total pago/);
  assert.equal(must('v3CashCards').querySelectorAll('details').length,changed.premises.horizon);
  assert.equal(app.get().entries[0].dueDay,18);
  // Regressão: o Início antes sempre usava "keep", mesmo após clicar em outros cenários.
  const plan=app.get();
  plan.premises={...plan.premises,monthStart:'2026-11',horizon:12,cash:5000,cost:1500,costSep:1500,
    acad:5000,novIncome:6400,nubBal:5000,nubPmt:300,nubRemain:36,
    oldBal:3000,oldPmt:200,oldRemain:20,newBal:2000,newPmt:150,newRemain:40,
    bbLoan:11000,bbRate:1.5,bbTerm:48,startPay:1};
  plan.accounts={nubank:1000,bb:2500,bradesco:500};
  plan.entries=[];
  app.replace(plan);
  const month=app.getScenario('keep').rows[0].month;
  must('v3HomeMonth').value=month;
  must('v3HomeMonth').dispatchEvent(new win.Event('change',{bubbles:true}));
  assert.equal(must('v3HomeScenarios').querySelectorAll('[data-home-scenario]').length,3);
  assert.equal(app.getSelectedScenario(),'keep');
  assert.equal(must('v3HomeScenarios').querySelectorAll('[aria-pressed="true"]').length,1);
  assert.match(must('v3Overview').textContent,/6.400,00/);
  assert.match(must('v3BankBalance').textContent,/4.000,00/);
  must('v3HomeScenarios').querySelector('[data-home-scenario="all"]').click();
  assert.equal(app.getSelectedScenario(),'all','Click no Início deve selecionar consolidação total');
  assert.equal(must('v3HomeScenarios').querySelector('[aria-pressed="true"]').dataset.homeScenario,'all');
  assert.equal(must('scenarioCards').querySelector('[aria-pressed="true"]').dataset.scenario,'all');
  assert.equal(must('v3ScenarioFloor').textContent,
    new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(app.getScenario('all').min));
  assert.match(must('v3Upcoming').textContent,/Quitação antecipada de contratos/);
  assert.equal(must('v3CashCards').querySelectorAll('details').length,12);
  const originalBalance=app.getScenario('keep').rows[0].balance;
  const allBalance=app.getScenario('all').rows[0].balance;
  assert.notEqual(originalBalance,allBalance,'Cenários precisam realmente projetar valores diferentes');
  must('scenarioCards').querySelector('[data-scenario="expensive"]').click();
  assert.equal(app.getSelectedScenario(),'expensive','Click no Simulador deve refletir no Início');
  assert.equal(must('v3HomeScenarios').querySelector('[aria-pressed="true"]').dataset.homeScenario,'expensive');
  assert.match(must('v3ScenarioHeadline').textContent,/parcialmente/);
  const backup=app.get(); app.replace(backup);
  assert.equal(app.getSelectedScenario(),'expensive','Trocar dados não deve redefinir cenário selecionado');
  assert.equal(must('scenarioCards').querySelectorAll('[aria-pressed="true"]').length,1);
  assert.equal(must('v3HomeScenarios').querySelectorAll('[aria-pressed="true"]').length,1);

  console.log('OK: interface 3.0, navegação, cartões, transações e amortização.');
  dom.window.close();
 }catch(err){console.error(err);process.exitCode=1;dom.window.close();}
},50);
