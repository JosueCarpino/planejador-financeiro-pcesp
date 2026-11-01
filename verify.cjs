// Executar: node financeiro/verify.cjs
// Sem dependencias externas. Smoke tests de interface e invariantes do fluxo.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {join}=require('node:path');
const els=new Map();
const get=id=>{
 if(!els.has(id))els.set(id,{
  id,value:'',innerHTML:'',textContent:'',hidden:false,className:'',
  listeners:{},addEventListener(type,cb){this.listeners[type]=cb;},setAttribute(){},append(){},remove(){},
 });
 return els.get(id);
};
const local=new Map();
const document={
 getElementById:get,querySelectorAll(){return[];},
 addEventListener(){},dispatchEvent(){},
 createElement(){return {click(){},remove(){}};}
};
const ctx={
 window:{},document,localStorage:{
  getItem:k=>local.get(k)||null,setItem:(k,v)=>local.set(k,v)
 },console,Intl,Math,Number,Date,String,Array,JSON,Object,
 setTimeout(){return 1;},clearTimeout(){},CustomEvent:class{},
 confirm(){return true;},
};
vm.runInNewContext(fs.readFileSync(join(__dirname,'app.js'),'utf8'),ctx,{timeout:10000,filename:'app.js'});
const app=ctx.window.FIN_APP;
assert.ok(app,'O aplicativo deve expor API de backup');
const p={
 monthStart:'2028-01',horizon:12,cash:1000,cost:100,costSep:200,reserve:0,
 fgts:0,acad:0,novComps:2,post:0,bonus:0,
 nubBal:500,nubPmt:30,newBal:300,newPmt:20,oldBal:200,oldPmt:10,
 bbLoan:800,bbRate:0,bbTerm:36,startPay:1
};
function firstRow(){
 const html=get('cashflow').innerHTML.match(/<tr>[\s\S]*?<\/tr>/)?.[0]||'';
 return [...html.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(m=>m[1].replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim());
}
app.replace({premises:p,entries:[]});
assert.match(get('scenarioCards').innerHTML,/Consolidar caras/);
assert.match(get('scenarioCards').innerHTML,/Consolidar tudo/);
assert.match(firstRow()[4],/740,00/,'Manter deve descontar 3 parcelas e gastos do mes 1');
function changeScenario(kind){
 get('scenarioCards').listeners.click({target:{closest:()=>({dataset:{scenario:kind}})}});
}
changeScenario('expensive');
assert.match(firstRow()[4],/790,00/,'Consolidacao parcial deve manter a parcela do Bradesco antigo');
assert.match(get('cashflow').innerHTML,/Parcela Bradesco 01/);
changeScenario('all');
assert.match(firstRow()[4],/600,00/,'Consolidacao total deve quitar 1000 com credito de 800');
changeScenario('keep');
const btn=get('scenarioCards');
assert.ok(btn.innerHTML.includes('data-scenario="expensive"'));
assert.match(get('cashflow').innerHTML,/Parcelas dos 3 contratos/);
assert.ok(app.get().premises.nubBal===500);
assert.throws(()=>app.validate({premises:{...p,monthStart:'2028-99'},entries:[]}),/Mês inicial inválido/);
assert.throws(()=>app.validate({premises:p,entries:[{month:'2028-01',name:'x',amount:-10,type:'income',recurring:'once'}]}),/Lançamento inválido/);
app.replace({premises:{...p,nubPmt:0,newPmt:0,oldPmt:0},entries:[
 {id:'x',month:'2028-01',name:'<img src=x onerror=alert(1)>',amount:25,type:'expense',recurring:'once'}
]});
assert.ok(get('entryList').innerHTML.includes('&lt;img'),'Deve escapar o nome do lancamento');
assert.ok(!get('entryList').innerHTML.includes('<img '),'Nao pode injetar tag HTML nos lancamentos');
assert.match(firstRow()[4],/775,00/,'Lancamento ad hoc deve afetar caixa');
// Valores de teste inteiramente ficticios (nao usar dados financeiros reais no GitHub).
const updated={
 premises:{...p,monthStart:'2026-11',cash:3100,costSep:0,cost:0,acad:4900,
  novIncome:7000,post:4900,nubPmt:500,nubRemain:1,newPmt:0,oldPmt:0,
  nubDue:27,newDue:30,oldDue:25},
 accounts:{nubank:1000,bb:2000,bradesco:100},snapshotDate:'2028-01-01',
 loanRefs:{nub:'12 parcelas',new:'inicio do contrato',old:'em andamento'},
 entries:[
  {id:'bill1',month:'2026-11',name:'Fatura Nubank',amount:500,type:'expense',recurring:'once'},
  {id:'bill2',month:'2026-12',name:'Fatura Nubank',amount:400,type:'expense',recurring:'once'}
 ]
};
app.replace(updated);
assert.match(firstRow()[4],/9.100,00/,'Novembro recebe salario especial uma unica vez, desconta fatura e emprestimo');
const nextRow=(get('cashflow').innerHTML.split('</tr>')[1]||'');
assert.match(nextRow,/13.600,00/,'O emprestimo com uma parcela restante deve terminar antes de dezembro');
assert.match(get('billsOverview').innerHTML,/500,00/,'Calendario de faturas deve aparecer');
assert.match(get('accountsTotal').textContent,/3.100,00/,'Contas somadas sem misturar quitacoes');
assert.equal(app.get().accounts.bb,2000);
assert.equal(app.get().premises.novIncome,7000);

console.log('OK: app inicializa; tres estrategias; parcelas mantidas; entrada avulsa; validacao; escaping.');
