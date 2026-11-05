/* Finanças PCESP 3.0. Interface sobre o mesmo plano privado. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id);
 const API=window.FIN_APP;
 const fmt=v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v)||0);
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const round=v=>Math.round((Number(v)+Number.EPSILON)*100)/100;
 const pretty=ym=>/^\d{4}-\d{2}$/.test(ym||'')?new Intl.DateTimeFormat('pt-BR',{month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(ym+'-01T00:00:00Z')).replace('.',''):ym||'—';
 const nowMonth=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');};
 const menu=[['inicio','Início','◫'],['transacoes','Transações','↔'],['contas','Contas','▣'],['dividas','Dívidas','▤'],['simulador','Simulador','◈'],['ajustes','Ajustes','⚙']];
 const views={};
 let current='inicio',homeMonth='',query='',statusFilter='all';
 const state=()=>API.get();
 const htmlTag=(tag,cls,html)=>{const e=document.createElement(tag);e.className=cls||'';if(html)e.innerHTML=html;return e;};
 function card(label,value,sub,flag){
  return '<div class="v3-stat '+(flag||'')+'"><span>'+esc(label)+'</span><strong>'+esc(value)+'</strong><small>'+esc(sub)+'</small></div>';
 }
 function navigation(){
  return menu.map(item=>'<a href="#'+item[0]+'" data-nav="'+item[0]+'" class="v3-nav-item"><span aria-hidden="true" class="v3-nav-icon">'+item[2]+'</span><span>'+item[1]+'</span></a>').join('');
 }
 function init(){
  const shell=document.querySelector('.shell'),oldIntro=shell.querySelector('.intro'),layout=shell.querySelector('.layout');
  if(!shell||!layout||!window.FIN_APP)return;
  const oldSidebar=layout.querySelector('.sidebar');
  const pick=id=>{const n=$(id);if(!n)throw Error('Campo ausente: '+id);return n.closest('.pane');};
  const panel={
   month:pick('monthStart'),accounts:pick('accountNubank'),expenses:pick('cost'),income:pick('acad'),
   debts:pick('nubBal'),newLoan:pick('bbLoan'),reset:pick('resetBtn'),
   scenarios:pick('scenarioCards'),metrics:pick('metrics'),chart:pick('chart'),flow:pick('cashflow'),
   bills:pick('billsOverview'),entries:pick('entryForm'),cloud:pick('cloudLogin')
  };
  layout.remove();oldIntro.remove();
  const top=document.querySelector('.top');top.classList.add('v3-top');
  top.querySelector('nav')?.remove();
  const mini=top.querySelector('.brand small');if(mini)mini.textContent='Gestor pessoal • versão 3.0';
  top.append(htmlTag('div','v3-top-actions','<span id="v3CloudState" class="v3-cloud" role="status">● Salvo neste dispositivo</span><button type="button" class="v3-icon-btn" id="v3Theme" aria-label="Alternar aparência">◐</button>'));
  const frame=htmlTag('div','v3-frame'),rail=htmlTag('aside','v3-rail'),workspace=htmlTag('div','v3-workspace');
  rail.innerHTML='<div class="v3-rail-title">MENU PRINCIPAL</div><nav class="v3-rail-nav" aria-label="Navegação principal">'+navigation()+'</nav><div class="v3-rail-tail">Finanças PCESP<small>Uso pessoal • dados privados</small></div>';
  frame.append(rail,workspace);shell.append(frame);
  for(const item of menu){const v=htmlTag('section','v3-view');v.id='view-'+item[0];v.hidden=true;workspace.append(v);views[item[0]]=v;}
  views.inicio.innerHTML=
   '<div class="v3-heading"><div><span class="eyebrow">VISÃO FINANCEIRA</span><h1>Seu dinheiro, em perspectiva.</h1><p>Veja seu caixa, próximos compromissos e decisões importantes.</p></div><label class="v3-month-label">Mês de referência<input type="month" id="v3HomeMonth"></label></div>'+
   '<div id="v3Overview" class="v3-overview"></div><div class="v3-home-grid">'+
   '<section class="pane"><div class="v3-section-head"><h2>Próximos compromissos</h2><button type="button" data-go="transacoes" class="v3-inline-link">Ver transações</button></div><div id="v3Upcoming"></div></section>'+
   '<section class="pane"><div class="v3-section-head"><h2>Fluxo líquido previsto</h2><button type="button" data-go="simulador" class="v3-inline-link">Simular</button></div><div id="v3MiniChart"></div></section></div>'+
   '<section class="pane"><div class="v3-section-head"><h2>Pontos de atenção</h2><small class="v3-subtle">Alertas orientativos</small></div><div id="v3Alerts"></div></section>';
  views.transacoes.innerHTML=
   '<div class="v3-heading"><div><span class="eyebrow">ORGANIZE AS MOVIMENTAÇÕES</span><h1>Transações e faturas</h1><p>Edite, categorize e acompanhe entradas e despesas.</p></div><button type="button" class="v3-secondary" id="v3AddEntry">+ Novo lançamento</button></div>'+
   '<div class="v3-overview" id="v3LedgerSummary"></div>'+
   '<div class="pane"><div class="v3-section-head"><h2>Seus lançamentos</h2><small class="v3-subtle">Marcar pago não altera o saldo bancário</small></div>'+
   '<div class="v3-filters"><input id="v3Search" type="search" placeholder="Buscar descrição ou categoria" aria-label="Buscar"><input id="v3MonthFilter" type="month" aria-label="Filtrar mês"><select id="v3StatusFilter" aria-label="Filtrar situação"><option value="all">Todos</option><option value="planned">Previstos</option><option value="paid">Pagos</option></select><button type="button" class="v3-secondary" id="v3ClearFilter">Limpar</button></div><div id="v3Ledger"></div></div>';
  views.transacoes.append(panel.bills,panel.entries);
  const form=$('entryForm'),extra=htmlTag('div','v3-entry-extras',
   '<label class="field">Categoria<select id="entryCategory"><option>Geral</option><option>Moradia</option><option>Alimentação</option><option>Transporte</option><option>Saúde</option><option>Educação</option><option>Cartão de crédito</option><option>Empréstimos</option><option>Lazer</option><option>Outros</option></select></label>'+
   '<label class="field">Dia do vencimento<input type="number" id="entryDueDay" min="0" max="31" step="1" value="0"><small>0 = não informado</small></label>');
  form.insertBefore(extra,form.querySelector('button[type="submit"]'));
  views.contas.innerHTML='<div class="v3-heading"><div><span class="eyebrow">SALDOS REAIS</span><h1>Suas contas</h1><p>Atualize valores informados pelos bancos. Projeções não movimentam automaticamente as contas.</p></div></div><div id="v3AccountSummary" class="v3-overview"></div>';
  views.contas.append(panel.accounts);
  views.dividas.innerHTML=
   '<div class="v3-heading"><div><span class="eyebrow">COMPROMISSOS FINANCEIROS</span><h1>Contratos e parcelas</h1><p>Consulte quitações, parcelas restantes e evolução dos seus empréstimos.</p></div><button type="button" data-go="simulador" class="v3-secondary">Comparar opções</button></div>'+
   '<div id="v3DebtSummary" class="v3-overview"></div><div id="v3Debts" class="v3-debt-grid"></div>'+
   '<div class="pane"><h2>Quantidade original de parcelas</h2><p class="v3-subtle">Preencha quando souber o prazo total. Isso só modifica a barra de progresso, não a quitação bancária.</p><div class="v3-loan-total-grid">'+
   '<label class="field">Nubank<input type="number" data-total="nub" min="0" max="360" step="1" placeholder="Não informado"></label>'+
   '<label class="field">Bradesco 01<input type="number" data-total="old" min="0" max="360" step="1" placeholder="Não informado"></label>'+
   '<label class="field">Bradesco 02<input type="number" data-total="new" min="0" max="360" step="1" placeholder="Não informado"></label></div></div>';
  views.dividas.append(panel.debts);
  views.simulador.innerHTML='<div class="v3-heading"><div><span class="eyebrow">COMPARAÇÃO DE CENÁRIOS</span><h1>Simulador financeiro</h1><p>Compare os empréstimos atuais com alternativas de consolidação e amortização.</p></div></div>';
  views.simulador.append($('errors'),panel.newLoan,panel.scenarios,panel.metrics,panel.chart,panel.flow);
  const mobileRows=htmlTag('div','v3-mobile-flow');mobileRows.id='v3CashCards';panel.flow.append(mobileRows);
  panel.flow.querySelector('.table-scroll')?.classList.add('v3-flow-table');
  $('scenarioCards').addEventListener('click',()=>setTimeout(renderMobileFlow,0));
  views.ajustes.innerHTML='<div class="v3-heading"><div><span class="eyebrow">CONTROLE DO SEU PLANO</span><h1>Ajustes e segurança</h1><p>Premissas, receitas, gastos, sincronização privada e backup.</p></div></div>';
  views.ajustes.append(oldIntro,panel.month,panel.expenses,panel.income,panel.cloud,panel.reset);
  const mobile=htmlTag('nav','v3-mobile-nav',navigation());mobile.setAttribute('aria-label','Menu inferior');document.body.append(mobile);
  const dialog=htmlTag('dialog','v3-dialog');dialog.id='v3EditDialog';dialog.innerHTML=
   '<form id="v3EditForm" class="v3-dialog-form"><div class="v3-section-head"><h2>Editar lançamento</h2><button type="button" id="v3CloseEdit" class="v3-close" aria-label="Fechar">×</button></div>'+
   '<input type="hidden" id="v3EditId"><label class="field">Descrição<input id="v3EditName" maxlength="80" required></label>'+
   '<div class="v3-dialog-grid"><label class="field">Mês<input type="month" id="v3EditMonth" required></label><label class="field">Valor<input type="number" id="v3EditValue" min=".01" step=".01" required></label></div>'+
   '<div class="v3-dialog-grid"><label class="field">Tipo<select id="v3EditType"><option value="expense">Despesa</option><option value="income">Receita</option></select></label><label class="field">Categoria<input id="v3EditCategory" maxlength="35"></label></div>'+
   '<div class="v3-dialog-grid"><label class="field">Dia do vencimento<input type="number" id="v3EditDue" min="0" max="31" step="1"></label><label class="field">Frequência<select id="v3EditRecurring"><option value="once">Uma vez</option><option value="monthly">Mensal</option></select></label></div>'+
   '<label class="field">Situação<select id="v3EditStatus"><option value="planned">Previsto</option><option value="paid">Pago / recebido</option></select></label>'+
   '<div class="v3-dialog-actions"><button type="button" id="v3CancelEdit" class="v3-secondary">Cancelar</button><button type="submit" class="primary">Salvar alterações</button></div>'+
   '<p class="v3-subtle">Status informativo: atualize os saldos das contas após pagamentos para conciliar os valores.</p></form>';
  document.body.append(dialog);
  $('v3HomeMonth').addEventListener('change',e=>{homeMonth=e.target.value;renderHome();});
  $('v3Theme').addEventListener('click',()=>setTheme(document.documentElement.dataset.theme==='light'?'dark':'light'));
  document.querySelectorAll('[data-nav]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();location.hash=a.dataset.nav;show(a.dataset.nav);}));
  frame.addEventListener('click',handleButton);
  $('v3AddEntry').addEventListener('click',()=>{go('transacoes');$('entryForm').scrollIntoView({behavior:'smooth',block:'center'});$('entryName').focus();});
  $('v3Search').addEventListener('input',e=>{query=e.target.value.toLowerCase();renderLedger();});
  $('v3MonthFilter').addEventListener('change',renderLedger);
  $('v3StatusFilter').addEventListener('change',e=>{statusFilter=e.target.value;renderLedger();});
  $('v3ClearFilter').addEventListener('click',()=>{$('v3Search').value='';$('v3MonthFilter').value='';$('v3StatusFilter').value='all';query='';statusFilter='all';renderLedger();});
  $('v3EditForm').addEventListener('submit',saveEdit);
  $('v3CloseEdit').addEventListener('click',()=>dialog.close());$('v3CancelEdit').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
  views.dividas.querySelectorAll('[data-total]').forEach(i=>i.addEventListener('change',e=>{
   const s=state();s.loanTotals[e.target.dataset.total]=Number(e.target.value);
   try{API.replace(s);}catch(err){alert('Quantidade inválida.');renderDebts();}
  }));
  window.addEventListener('hashchange',()=>show(location.hash.slice(1)));
  document.addEventListener('fin-changed',refresh);
  new MutationObserver(updateSync).observe($('cloudStatus'),{childList:true,characterData:true,subtree:true});
  setTheme(localStorage.getItem('pcsp-theme-v3')==='light'?'light':'dark');
  refresh();show(location.hash.slice(1));
 }
 function setTheme(v){
  document.documentElement.dataset.theme=v;
  $('v3Theme').textContent=v==='light'?'☾':'☼';
  try{localStorage.setItem('pcsp-theme-v3',v);}catch{}
 }
 function show(name){
  current=views[name]?name:'inicio';
  for(const id of Object.keys(views))views[id].hidden=id!==current;
  document.querySelectorAll('[data-nav]').forEach(a=>a.setAttribute('aria-current',a.dataset.nav===current?'page':'false'));
  const title=menu.find(e=>e[0]===current);document.title=(title?title[1]:'Início')+' | Finanças PCESP';
  window.scrollTo(0,0);
 }
 function go(name){location.hash=name;show(name);}
 function updateSync(){
  const t=$('cloudStatus').textContent||'',n=$('v3CloudState');
  const ok=/confirmado|recuperado da nuvem/i.test(t),pending=/pendente|Sincronizando|Conferindo e enviando/i.test(t);
  const error=/Erro|Falha|Conflito|Não foi possível|indisponível|negado/i.test(t);
  n.textContent=ok?'● Sincronizado na nuvem':pending?'◌ Sincronizando':error?'● Atenção ao salvamento':'● Salvo neste dispositivo';
  n.dataset.status=ok?'ok':pending?'pending':error?'error':'local';
  n.title=t;
 }
 function refresh(){renderHome();renderLedger();renderAccounts();renderDebts();renderMobileFlow();updateSync();}
 function renderMobileFlow(){
  const el=$('v3CashCards');if(!el)return;
  const selected=$('scenarioCards').querySelector('[aria-pressed="true"]')?.dataset.scenario||'keep';
  const rows=API.getScenario(selected).rows;
  el.innerHTML=rows.map(x=>'<details class="v3-flow-card"><summary><span>'+esc(pretty(x.month))+'</span><span class="'+(x.net<0?'negative':'positive')+'">'+fmt(x.net)+'</span><b>'+fmt(x.balance)+'</b></summary><div><p>Entradas '+fmt(x.inc)+' · Saídas '+fmt(x.out)+'</p><ul>'+[...x.income,...x.expense].map(a=>'<li>'+esc(a.name)+' — '+fmt(a.amount)+'</li>').join('')+'</ul></div></details>').join('');
 }
 function renderHome(){
  const s=state(),p=s.premises,sc=API.getScenario('keep'),rows=sc.rows;
  if(!homeMonth||!rows.some(e=>e.month===homeMonth))homeMonth=rows.some(e=>e.month===nowMonth())?nowMonth():rows[0]?.month||nowMonth();
  $('v3HomeMonth').value=homeMonth;
  const row=rows.find(r=>r.month===homeMonth),accounts=Object.values(s.accounts||{}).reduce((a,v)=>a+Number(v||0),0);
  const debts=p.nubBal+p.newBal+p.oldBal;
  $('v3Overview').innerHTML=
   card('Saldo bancário informado',fmt(accounts),s.snapshotDate?'Posição em '+s.snapshotDate.split('-').reverse().join('/'):'Preencha suas contas')+
   card('Caixa projetado no mês',fmt(row?.balance||0),pretty(homeMonth),(row?.balance||0)<0?'is-negative':'')+
   card('Entradas / saídas previstas',fmt(row?.inc||0)+' / '+fmt(row?.out||0),'Fluxo mensal estimado')+
   card('Quitação de empréstimos',fmt(debts),'Valores informados pelos bancos');
  const i=rows.findIndex(r=>r.month===homeMonth);
  const dues=[['Nubank',p.nubPmt,p.nubDue,p.nubRemain],['Bradesco 01',p.oldPmt,p.oldDue,p.oldRemain],['Bradesco 02',p.newPmt,p.newDue,p.newRemain]]
   .filter(e=>e[1]>0&&(e[3]===0||i<e[3])).map(e=>({name:e[0],amount:e[1],day:e[2],type:'Empréstimo',status:'planned'}));
  const others=s.entries.filter(e=>(e.month===homeMonth||(e.recurring==='monthly'&&e.month<=homeMonth))).map(e=>({name:e.name,amount:e.amount,day:e.dueDay||0,type:e.type==='income'?'Receita':'Despesa',status:e.status||'planned'}));
  const dueList=[...dues,...others].sort((a,b)=>a.day-b.day);
  $('v3Upcoming').innerHTML=dueList.length?dueList.slice(0,8).map(x=>'<div class="v3-upcoming"><div><b>'+esc(x.name)+'</b><small>'+esc(x.type)+(x.day?' · dia '+x.day:' · sem dia informado')+(x.status==='paid'?' · informado como pago':'')+'</small></div><strong>'+fmt(x.amount)+'</strong></div>').join(''):'<p class="v3-empty">Nenhum compromisso detalhado neste mês.</p>';
  const m=rows.slice(0,Math.min(12,rows.length)),max=Math.max(1,...m.map(e=>Math.abs(e.net)));
  $('v3MiniChart').innerHTML='<div class="v3-bars">'+m.map(x=>'<div class="v3-bar-col" title="'+esc(pretty(x.month)+' — '+fmt(x.net))+'"><div class="v3-bar '+(x.net<0?'down':'up')+'" style="height:'+Math.max(4,Math.round(Math.abs(x.net)/max*102))+'px"></div><small>'+x.month.slice(5)+'/'+x.month.slice(2,4)+'</small></div>').join('')+'</div><p class="v3-subtle">Resultado líquido previsto por mês. Não é extrato bancário.</p>';
  const alerts=[];
  if((row?.balance||0)<0)alerts.push(['danger','O caixa projetado fica negativo em '+pretty(homeMonth)+'.']);
  if(sc.neg.length)alerts.push(['warning','Há '+sc.neg.length+' mês(es) com caixa negativo dentro do horizonte.']);
  if(p.cost===0)alerts.push(['warning','Gastos fixos não informados podem superestimar a sobra.']);
  if(accounts>0&&Math.abs(accounts-p.cash)>.02)alerts.push(['warning','O caixa inicial difere da soma das contas. Confira a data dos saldos.']);
  if(!alerts.length)alerts.push(['','Nenhum alerta crítico encontrado com os dados informados.']);
  $('v3Alerts').innerHTML=alerts.map(a=>'<div class="v3-alert '+a[0]+'">'+esc(a[1])+'</div>').join('');
 }
 function renderAccounts(){
  const a=state().accounts||{},total=Object.values(a).reduce((t,n)=>t+Number(n||0),0);
  $('v3AccountSummary').innerHTML=card('Total nas contas',fmt(total),'Atualizado manualmente')+card('Nubank',fmt(a.nubank),'Saldo informado')+card('Banco do Brasil',fmt(a.bb),'Saldo informado')+card('Bradesco',fmt(a.bradesco),'Saldo informado');
 }
 function loans(){
  const s=state(),p=s.premises;
  return [{id:'nub',name:'Nubank',balance:p.nubBal,payment:p.nubPmt,remaining:p.nubRemain,due:p.nubDue,focus:'nubRemain'},
          {id:'old',name:'Bradesco 01',balance:p.oldBal,payment:p.oldPmt,remaining:p.oldRemain,due:p.oldDue,focus:'oldRemain'},
          {id:'new',name:'Bradesco 02',balance:p.newBal,payment:p.newPmt,remaining:p.newRemain,due:p.newDue,focus:'newRemain'}];
 }
 function renderDebts(){
  const s=state(),ls=loans();
  $('v3DebtSummary').innerHTML=card('Quitação informada',fmt(ls.reduce((a,e)=>a+e.balance,0)),'Sujeita a atualização bancária')+
   card('Parcelas mensais',fmt(ls.reduce((a,e)=>a+e.payment,0)),'Sem faturas de cartão')+
   card('Total restante estimado',fmt(ls.reduce((a,e)=>a+(e.remaining?e.remaining*e.payment:0),0)),'Contratos com prazo conhecido');
  $('v3Debts').innerHTML=ls.map(x=>{
   const total=s.loanTotals?.[x.id]||0,paid=total?Math.max(0,total-x.remaining):null,progress=total?Math.min(100,Math.round(paid/total*100)):0;
   return '<article class="v3-debt-card"><div class="v3-section-head"><h3>'+esc(x.name)+'</h3><span class="v3-pill">Dia '+(x.due||'—')+'</span></div>'+
    '<span class="v3-subtle">Quitação antecipada informada</span><strong class="v3-debt-value">'+fmt(x.balance)+'</strong>'+
    '<div class="v3-debt-pair"><span>Parcela<b>'+fmt(x.payment)+'</b></span><span>Restantes<b>'+(x.remaining||'Não informado')+'</b></span></div>'+
    (total?'<div class="v3-progress"><span style="width:'+progress+'%"></span></div><p class="v3-subtle">'+paid+' de '+total+' pagas, se as parcelas restantes estiverem corretas.</p>':'<p class="v3-subtle">Informe o prazo original para visualizar o progresso.</p>')+
    '<button type="button" class="v3-secondary" data-focus="'+x.focus+'">Editar contrato</button></article>';
  }).join('');
  document.querySelectorAll('[data-total]').forEach(el=>{if(document.activeElement!==el)el.value=s.loanTotals?.[el.dataset.total]||'';});
 }
 function renderLedger(){
  const s=state(),month=$('v3MonthFilter')?.value||'';
  const rows=s.entries.filter(e=>(!month||e.month===month)&&(statusFilter==='all'||e.status===statusFilter)&&
   (!query||(e.name+' '+(e.category||'')).toLowerCase().includes(query))).sort((a,b)=>b.month.localeCompare(a.month)||(a.dueDay||0)-(b.dueDay||0));
  $('v3Ledger').innerHTML=rows.length?rows.map(e=>{
   const paid=e.status==='paid',rec=e.recurring==='monthly';
   return '<div class="v3-ledger-row"><div class="v3-ledger-primary"><b>'+esc(e.name)+'</b><small>'+esc(pretty(e.month))+(e.dueDay?' · dia '+e.dueDay:'')+' · '+esc(e.category||'Geral')+(rec?' · recorrente':'')+'</small></div>'+
    '<strong class="v3-ledger-value '+(e.type==='income'?'positive':'negative')+'">'+(e.type==='income'?'+':'−')+fmt(e.amount)+'</strong>'+
    '<span class="v3-ledger-state '+(paid?'paid':'')+'">'+(paid?'Pago':'Previsto')+'</span><div class="v3-ledger-actions">'+
    '<button type="button" data-edit="'+esc(e.id)+'">Editar</button>'+(!rec?'<button type="button" data-toggle="'+esc(e.id)+'">'+(paid?'Reabrir':'Marcar pago')+'</button>':'')+
    '<button type="button" data-remove="'+esc(e.id)+'" class="v3-danger-action">Excluir</button></div></div>';
  }).join(''):'<p class="v3-empty">Nenhum lançamento encontrado. Tente mudar os filtros ou adicione um registro.</p>';
  $('v3LedgerSummary').innerHTML=card('Lançamentos',String(s.entries.length),'Cadastrados no plano')+
   card('Receitas avulsas',fmt(s.entries.filter(e=>e.type==='income'&&e.recurring==='once').reduce((n,e)=>n+e.amount,0)),'Total cadastrado')+
   card('Despesas avulsas',fmt(s.entries.filter(e=>e.type==='expense'&&e.recurring==='once').reduce((n,e)=>n+e.amount,0)),'Total cadastrado');
 }
 function handleButton(ev){
  const b=ev.target.closest('button');if(!b)return;
  if(b.dataset.go){go(b.dataset.go);return;}
  if(b.dataset.focus){go('dividas');$(b.dataset.focus).focus();$(b.dataset.focus).scrollIntoView({block:'center'});return;}
  if(b.dataset.edit){edit(b.dataset.edit);return;}
  if(b.dataset.remove){if(confirm('Excluir este lançamento?')){const s=state();s.entries=s.entries.filter(e=>e.id!==b.dataset.remove);API.replace(s);}return;}
  if(b.dataset.toggle){const s=state(),e=s.entries.find(x=>x.id===b.dataset.toggle);if(e&&e.recurring==='once'){e.status=e.status==='paid'?'planned':'paid';API.replace(s);}return;}
 }
 function edit(id){
  const e=state().entries.find(x=>x.id===id);if(!e)return;
  $('v3EditId').value=e.id;$('v3EditName').value=e.name;$('v3EditMonth').value=e.month;
  $('v3EditValue').value=e.amount;$('v3EditType').value=e.type;$('v3EditCategory').value=e.category||'Geral';
  $('v3EditDue').value=e.dueDay||0;$('v3EditRecurring').value=e.recurring;$('v3EditStatus').value=e.status||'planned';
  $('v3EditDialog').showModal();
 }
 function saveEdit(ev){
  ev.preventDefault();const s=state(),e=s.entries.find(x=>x.id===$('v3EditId').value);if(!e)return;
  Object.assign(e,{name:$('v3EditName').value.trim(),month:$('v3EditMonth').value,amount:Number($('v3EditValue').value),
   type:$('v3EditType').value,category:$('v3EditCategory').value.trim()||'Geral',dueDay:Number($('v3EditDue').value||0),
   recurring:$('v3EditRecurring').value,status:$('v3EditStatus').value});
  try{API.replace(s);$('v3EditDialog').close();}catch(err){alert('Verifique os dados: '+err.message);}
 }
 function start(){
  try{
   init();
   if(typeof navigator!=='undefined'&&'serviceWorker' in navigator){
    navigator.serviceWorker.register('./sw.js').catch(err=>console.warn('Modo offline indisponível',err));
   }
  }catch(err){console.error('Erro ao montar a interface 3.0; dados preservados na versão anterior.',err);}
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();