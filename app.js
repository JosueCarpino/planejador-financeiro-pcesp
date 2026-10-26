(() => {
'use strict';
const KEY='pcsp_financeiro_v2', VERSION=2;
const ids=['monthStart','horizon','cash','cost','costSep','reserve','fgts','acad','novComps','post','bonus','nubBal','nubPmt','newBal','newPmt','oldBal','oldPmt','bbLoan','bbRate','bbTerm','startPay'];
const nums=new Set(ids.filter(x=>!['monthStart'].includes(x)));
const $=id=>document.getElementById(id);
const brl=v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const defaultP={monthStart:'2026-09',horizon:16,cash:0,cost:0,costSep:0,reserve:0,fgts:0,acad:0,novComps:2,post:0,bonus:0,nubBal:0,nubPmt:0,newBal:0,newPmt:0,oldBal:0,oldPmt:0,bbLoan:0,bbRate:1.8,bbTerm:60,startPay:1};
let state={version:VERSION,premises:{...defaultP},entries:[]},selected='keep',latest=[];
let onUpdate=()=>{};
const money=v=>Math.round((Number(v)+Number.EPSILON)*100)/100;
function validate(s){
 if(!s || typeof s!=='object')throw Error('Arquivo sem estrutura de dados válida.');
 const p={...defaultP};
 for(const id of ids){
  if(id==='monthStart'){const m=String(s.premises?.[id]??p[id]);if(!/^(20\d{2})-(0[1-9]|1[0-2])$/.test(m))throw Error('Mês inicial inválido.');p[id]=m;continue;}
  const v=Number(s.premises?.[id]??p[id]);if(!Number.isFinite(v)||v<0||v>1e9)throw Error('Valor inválido: '+id);p[id]=v;
 }
 if(![12,16,24,36].includes(p.horizon)||![1,2,3].includes(p.novComps)||![36,48,60,72,84].includes(p.bbTerm)||![1,2].includes(p.startPay)||p.bbRate>100)throw Error('Prazo ou taxa fora dos limites.');
 if(!Array.isArray(s.entries)||s.entries.length>250)throw Error('Quantidade inválida de lançamentos.');
 const entries=s.entries.map((x,i)=>{
  const month=String(x.month||''),name=String(x.name||'').trim().slice(0,80),amount=Number(x.amount),type=x.type,recurring=x.recurring;
  if(!/^20\d{2}-(0[1-9]|1[0-2])$/.test(month)||!name||!Number.isFinite(amount)||amount<=0||amount>1e9||!['income','expense'].includes(type)||!['once','monthly'].includes(recurring))throw Error('Lançamento inválido: '+(i+1));
  return {id:String(x.id||('row-'+i)).slice(0,48),month,name,amount:money(amount),type,recurring};
 });
 return {version:VERSION,premises:p,entries};
}
function setForm(p){for(const id of ids)$(id).value=p[id];}
function readForm(){const p={};for(const id of ids){p[id]=id==='monthStart'?$(id).value:Number($(id).value);if(id!=='monthStart'&&(!Number.isFinite(p[id])||p[id]<0))p[id]=0;}return p;}
function store(){try{localStorage.setItem(KEY,JSON.stringify(state));$('saveStatus').textContent='Salvo neste dispositivo';$('saveStatus').className='localstate';}catch(e){$('saveStatus').textContent='Armazenamento local indisponível';$('saveStatus').className='localstate negative';}}
function replace(input){const valid=validate(input);state=valid;setForm(state.premises);store();render();document.dispatchEvent(new CustomEvent('fin-changed'));}
function mm(ym,delta){const [y,m]=ym.split('-').map(Number);const d=new Date(Date.UTC(y,m-1+delta,1));return d.toISOString().slice(0,7);}
function label(ym){const [y,m]=ym.split('-').map(Number);return new Intl.DateTimeFormat('pt-BR',{month:'short',year:'2-digit',timeZone:'UTC'}).format(new Date(Date.UTC(y,m-1,1))).replace('.','');}
function installment(principal,rate,term){if(principal<=0)return 0;const r=rate/100;if(!r)return principal/term;const pow=Math.pow(1+r,term);return principal*r*pow/(pow-1);}
function salary(ym,p){if(ym==='2026-11')return p.acad*p.novComps;if(ym>='2026-12'&&ym<='2027-03')return p.acad;if(ym>='2027-04')return p.post;return 0;}
function simulate(kind,p,entries){
 const months=Array.from({length:p.horizon},(_,i)=>mm(p.monthStart,i));
 const debts=p.nubBal+p.newBal+p.oldBal, exp=p.nubBal+p.newBal, payoff=kind==='all'?debts:kind==='expensive'?exp:0;
 const bb=kind==='keep'?0:p.bbLoan, newPmt=kind==='keep'?0:installment(bb,p.bbRate,p.bbTerm);
 const oldPmt=kind==='keep'?p.nubPmt+p.newPmt+p.oldPmt:kind==='expensive'?p.oldPmt:0;
 let balance=p.cash;
 const rows=months.map((ym,i)=>{
  const income=[],expense=[];
  const add=(to,name,amount)=>{if(amount>0)to.push({name,amount:money(amount)});};
  add(expense,i===0?'Gastos do primeiro mês':'Gastos fixos',i===0?p.costSep:p.cost);
  add(income,'Remuneração prevista',salary(ym,p));
  if(ym==='2026-10')add(income,'FGTS estimado',p.fgts);
  if(ym==='2027-12')add(income,'13º/extra informado',p.bonus);
  for(const e of entries){if(e.month===ym||(e.recurring==='monthly'&&e.month<=ym))add(e.type==='income'?income:expense,e.name,e.amount);}
  if(i===0){add(income,'Crédito BB liberado',bb);add(expense,'Quitação antecipada de contratos',payoff);}
  if(oldPmt>0)add(expense,kind==='keep'?'Parcelas dos 3 contratos':'Parcela do Bradesco antigo',oldPmt);
  if(kind!=='keep'&&i>=p.startPay&&i<p.startPay+p.bbTerm)add(expense,'Parcela consignado BB',newPmt);
  const inc=money(income.reduce((s,x)=>s+x.amount,0)),out=money(expense.reduce((s,x)=>s+x.amount,0));
  balance=money(balance+inc-out);
  return {month:ym,inc,out,net:money(inc-out),balance,income,expense};
 });
 const min=Math.min(...rows.map(r=>r.balance)),end=rows.at(-1).balance;
 const under=rows.filter(r=>r.balance<p.reserve),neg=rows.filter(r=>r.balance<0);
 return {kind,rows,end,min,neg,under,payoff,bb,newPmt,oldPmt,monthlyDebt:newPmt+oldPmt,bbInterest:money(newPmt*p.bbTerm-bb),debtQuit:debts};
}
const details={
 keep:['Manter contratos','Mantém Nubank e os dois Bradescos; nenhuma liberação de crédito novo.','Referência sem nova contratação'],
 expensive:['Consolidar caras','Quita Nubank + Bradesco novo; mantém e paga o Bradesco CLT antigo.','Preserva parcela do Bradesco antigo'],
 all:['Consolidar tudo','Quita os três contratos; eventual diferença entre BB e quitações sai ou sobra do caixa.','Concentra pagamentos no novo BB']
};
function card(s){const d=details[s.kind],active=selected===s.kind;return '<button class="scenario'+(active?' active':'')+'" type="button" data-scenario="'+s.kind+'" aria-pressed="'+active+'"><strong>'+d[0]+'</strong><span class="sub">'+d[2]+'</span><span class="amount '+(s.end<0?'negative':'')+'">'+brl(s.end)+'</span><span class="foot">Caixa final • mínimo '+brl(s.min)+'</span><span class="foot '+(s.neg.length?'negative':s.under.length?'warning':'positive')+'">'+(s.neg.length?s.neg.length+' mês(es) no negativo':s.under.length?s.under.length+' mês(es) abaixo da reserva':'Sem alerta de liquidez')+'</span></button>';}
function metric(value,title,cls=''){return '<div class="metric"><b class="'+cls+'">'+value+'</b><span>'+title+'</span></div>';}
function renderChart(s,p){
 const w=920,h=252,l=68,r=22,t=18,b=36,innerW=w-l-r,innerH=h-t-b;
 const vals=s.rows.map(x=>x.balance),bottom=Math.min(0,p.reserve,...vals),top=Math.max(1,p.reserve,...vals);
 let pad=(top-bottom)*.10||1,minY=bottom-pad,maxY=top+pad;const sy=v=>t+(maxY-v)/(maxY-minY)*innerH,sx=i=>l+(s.rows.length===1?0:i/(s.rows.length-1)*innerW);
 const point=s.rows.map((x,i)=>sx(i).toFixed(1)+','+sy(x.balance).toFixed(1));
 const stroke=s.neg.length?'#ff829c':'#64e9bd';
 let lines='';
 for(let i=0;i<=4;i++){const v=minY+(maxY-minY)*i/4,y=sy(v);lines+='<line x1="'+l+'" y1="'+y+'" x2="'+(w-r)+'" y2="'+y+'" stroke="#28445e" stroke-width="1"/><text x="'+(l-8)+'" y="'+(y+4)+'" text-anchor="end">'+(Math.round(v/1000*10)/10)+'k</text>';}
 const reserveY=sy(p.reserve);
 const axis=s.rows.filter((_,i)=>i===0||i===s.rows.length-1||i%Math.max(1,Math.round(s.rows.length/6))===0).map(x=>{const i=s.rows.indexOf(x);return '<text x="'+sx(i)+'" y="'+(h-8)+'" text-anchor="middle">'+esc(label(x.month))+'</text>';}).join('');
 $('chart').innerHTML='<svg viewBox="0 0 '+w+' '+h+'" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'+lines+'<line x1="'+l+'" y1="'+reserveY+'" x2="'+(w-r)+'" y2="'+reserveY+'" stroke="#f8c974" stroke-width="1.5" stroke-dasharray="6 5"/><polyline fill="none" stroke="'+stroke+'" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" points="'+point.join(' ')+'"/>'+s.rows.map((row,i)=>'<circle cx="'+sx(i)+'" cy="'+sy(row.balance)+'" r="3" fill="'+(row.balance<0?'#ff829c':stroke)+'"/>').join('')+axis+'</svg>';
}
function showEntries(){
 $('entryList').innerHTML=state.entries.length?state.entries.map(e=>'<div class="entry-row"><div><b>'+esc(e.name)+'</b><small>'+esc(label(e.month))+' · '+(e.type==='income'?'Receita':'Despesa')+' · '+(e.recurring==='monthly'?'Mensal':'Uma vez')+'</small></div><div><strong class="'+(e.type==='income'?'positive':'negative')+'">'+(e.type==='income'?'+':'−')+brl(e.amount)+'</strong> <button type="button" data-remove="'+esc(e.id)+'" title="Excluir lançamento" aria-label="Excluir '+esc(e.name)+'">✕</button></div></div>').join(''):'<p class="small">Nenhum lançamento adicional. Adicione um evento para refinar as projeções.</p>';
}
function render(){
 try{
 const p=readForm();state.premises=p;
 let warn=[];
 if(!p.cash&&!p.cost&&!p.acad&&!p.post&&!p.nubBal&&!p.newBal&&!p.oldBal)warn.push('O plano ainda está vazio. Preencha suas premissas ou use o exemplo fictício.');
 if(p.bbLoan>0&&!p.bbTerm)warn.push('Defina o prazo do consignado.');
 if(p.bbLoan===0)warn.push('Sem valor de crédito: as estratégias de consolidação quitam as dívidas diretamente com seu caixa.');
 if(p.nubBal+p.newBal+p.oldBal===0&&p.bbLoan>0)warn.push('Você informou empréstimo novo, mas nenhuma dívida para quitar. O valor fica como crédito de caixa com parcelas futuras.');
 if(p.monthStart<'2026-10')warn.push('O plano começa em um mês passado; substitua as estimativas por lançamentos reais para não confundir projeção com histórico.');
 $('errors').hidden=warn.length===0;$('errors').textContent=warn.join(' ');
 latest=['keep','expensive','all'].map(k=>simulate(k,p,state.entries));
 const s=latest.find(x=>x.kind===selected)||latest[0],d=details[s.kind];
 $('dateSpan').textContent=label(s.rows[0].month)+' a '+label(s.rows.at(-1).month);
 $('scenarioCards').innerHTML=latest.map(card).join('');
 $('scenarioTitle').textContent=d[0];$('scenarioDesc').textContent=d[1];
 $('scenarioRisk').textContent=s.neg.length?'Caixa negativo':s.under.length?'Abaixo da reserva':'Caixa acima da reserva';
 $('scenarioRisk').className='pill '+(s.neg.length?'negative':s.under.length?'warning':'positive');
 $('metrics').innerHTML=metric(brl(s.end),'Caixa no mês final',s.end<0?'negative':'positive')+metric(brl(s.min),'Menor caixa projetado',s.min<0?'negative':s.min<p.reserve?'warning':'')+metric(brl(s.monthlyDebt),'Parcelas mensais após carência')+metric(s.neg.length+' / '+s.rows.length,'Meses com caixa negativo',s.neg.length?'negative':'')+metric(brl(s.bbInterest),'Juros estimados do novo BB')+metric(brl(s.payoff),'Quitações no início')+metric(brl(s.bb),'Crédito BB no início')+metric(brl(s.rows.reduce((a,x)=>a+x.out,0)),'Saídas no horizonte');
 let notes=[];
 if(s.neg.length)notes.push(['danger','Atenção: saldo negativo em '+s.neg.map(r=>label(r.month)).join(', ')+'. Rever despesas, renda ou momento da contratação.']);
 else if(s.under.length)notes.push(['warn','Caixa abaixo da reserva desejada em '+s.under.length+' mês(es). Mínimo: '+brl(s.min)+'.']);
 else notes.push(['','Saldo projetado cobre a reserva informada durante todo o horizonte.']);
 if(s.kind!=='keep'){
  const gap=money(s.payoff-s.bb);
  if(gap>0)notes.push(['warn','O BB é '+brl(gap)+' menor que as quitações. Essa diferença é descontada do caixa inicial.']);
  if(gap<0)notes.push(['','Sobra de crédito de '+brl(-gap)+' após as quitações; ela fica no caixa, mas todo o empréstimo continua devido.']);
  if(s.monthlyDebt>latest[0].monthlyDebt)notes.push(['warn','Comprometimento mensal '+brl(s.monthlyDebt-latest[0].monthlyDebt)+' acima de manter as parcelas atuais.']);
 }
 notes.push(['','Condições do modelo: quitações e liberação do BB no primeiro mês; contratos mantidos pagos desde o primeiro mês; BB a partir de '+p.startPay+' mês(es).']);
 notes.push(['','Não é possível comparar o custo total dos contratos antigos sem juros e prazos remanescentes; os '+brl(s.bbInterest)+' de juros representam só o novo BB (sem tarifas não informadas).']);
 $('insights').innerHTML=notes.map(n=>'<div class="insight '+n[0]+'">'+esc(n[1])+'</div>').join('');
 $('cashflow').innerHTML=s.rows.map(x=>'<tr><td><b>'+esc(label(x.month))+'</b></td><td class="right positive">'+brl(x.inc)+'</td><td class="right negative">'+brl(x.out)+'</td><td class="right '+(x.net<0?'negative':'positive')+'">'+brl(x.net)+'</td><td class="right '+(x.balance<0?'negative':'')+'"><b>'+brl(x.balance)+'</b></td><td class="note-cell">'+esc([...x.income,...x.expense].map(y=>y.name).join(' · ')||'—')+'</td></tr>').join('');
 renderChart(s,p);showEntries();
 }catch(e){$('errors').hidden=false;$('errors').textContent='Falha na simulação: '+e.message;}
}
let task;function changed(){clearTimeout(task);task=setTimeout(()=>{state.premises=readForm();store();render();onUpdate();document.dispatchEvent(new CustomEvent('fin-changed'));},150);}
document.querySelectorAll('aside input,aside select').forEach(e=>e.addEventListener('input',changed));
$('scenarioCards').addEventListener('click',e=>{const n=e.target.closest('[data-scenario]');if(n){selected=n.dataset.scenario;render();}});
$('entryForm').addEventListener('submit',e=>{
 e.preventDefault();
 if(state.entries.length>=250){alert('Máximo de 250 lançamentos.');return;}
 const month=$('entryMonth').value,name=$('entryName').value.trim().slice(0,80),amount=Number($('entryAmount').value);
 if(!/^20\d{2}-(0[1-9]|1[0-2])$/.test(month)||!name||!Number.isFinite(amount)||amount<=0||amount>1e9){alert('Preencha mês, descrição e valor positivo válido.');return;}
 state.entries.push({id:'e'+Date.now().toString(36)+Math.random().toString(36).slice(2,8),month,name,amount:money(amount),type:$('entryType').value,recurring:$('entryRecurring').value});
 store();render();document.dispatchEvent(new CustomEvent('fin-changed'));$('entryName').value='';$('entryAmount').value='';
});
$('entryList').addEventListener('click',e=>{const b=e.target.closest('[data-remove]');if(!b)return;state.entries=state.entries.filter(x=>x.id!==b.dataset.remove);store();render();document.dispatchEvent(new CustomEvent('fin-changed'));});
function download(name,text,mime){const a=document.createElement('a'),u=URL.createObjectURL(new Blob([text],{type:mime}));a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),500);}
$('exportBtn').addEventListener('click',()=>download('financeiro-pcesp-backup.json',JSON.stringify(state,null,2),'application/json'));
$('importFile').addEventListener('change',async e=>{const f=e.target.files?.[0];if(!f)return;try{if(f.size>1000000)throw Error('Arquivo acima de 1 MB.');const data=validate(JSON.parse(await f.text()));if(confirm('Substituir todo o plano local pelo conteúdo do arquivo?'))replace(data);}catch(e){alert('Não foi possível importar: '+e.message);}finally{$('importFile').value='';}});
$('resetBtn').addEventListener('click',()=>{if(confirm('Zerar todas as premissas e lançamentos deste dispositivo? Faça backup primeiro.'))replace({premises:defaultP,entries:[]});});
$('exampleBtn').addEventListener('click',()=>{
 if(!confirm('Substituir seus dados atuais por números fictícios de demonstração?'))return;
 replace({premises:{...defaultP,cash:8500,cost:3250,costSep:3900,reserve:5000,fgts:1200,acad:4600,post:5400,nubBal:9200,nubPmt:420,newBal:4800,newPmt:280,oldBal:6600,oldPmt:390,bbLoan:21500,bbRate:1.65},entries:[]});
});
function csvCell(v){let s=String(v);if(/^[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}
$('csvBtn').addEventListener('click',()=>{
 const s=latest.find(x=>x.kind===selected);if(!s)return;
 const lines=[['Mes','Entradas','Saidas','Resultado','Saldo final','Observacoes'],...s.rows.map(r=>[r.month,r.inc.toFixed(2),r.out.toFixed(2),r.net.toFixed(2),r.balance.toFixed(2),[...r.income,...r.expense].map(x=>x.name).join(' / ')])];
 download('fluxo-pcesp-'+selected+'.csv','\uFEFF'+lines.map(r=>r.map(csvCell).join(';')).join('\r\n'),'text/csv;charset=utf-8');
});
try{const saved=localStorage.getItem(KEY);if(saved)state=validate(JSON.parse(saved));}catch(e){console.warn('Não foi possível restaurar dados locais:',e.message);}
setForm(state.premises);render();
window.FIN_APP={get:()=>JSON.parse(JSON.stringify(state)),replace,changeListener:fn=>{onUpdate=fn;},validate};
})();