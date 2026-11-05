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
  console.log('OK: interface 3.0, navegação, cartões, transações e amortização.');
  dom.window.close();
 }catch(err){console.error(err);process.exitCode=1;dom.window.close();}
},50);
