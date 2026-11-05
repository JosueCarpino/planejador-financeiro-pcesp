/* Calendário financeiro: datas informadas, sem inventar vencimentos bancários */
(() => {
 'use strict';
 const $=id=>document.getElementById(id),APP=window.FIN_APP;
 const fmt=x=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(x)||0);
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const current=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');};
 let month=current();
 function shift(ym,n){const [y,m]=ym.split('-').map(Number),d=new Date(Date.UTC(y,m-1+n,1));return d.toISOString().slice(0,7);}
 function getItems(s,ym){
  const p=s.premises;
  const diff=(Number(ym.slice(0,4))-Number(p.monthStart.slice(0,4)))*12+(Number(ym.slice(5))-Number(p.monthStart.slice(5)));
  const items=[];
  if(diff>=0){
   for(const [name,payment,due,remain] of [
    ['Empréstimo Nubank',p.nubPmt,p.nubDue,p.nubRemain],['Bradesco 01',p.oldPmt,p.oldDue,p.oldRemain],['Bradesco 02',p.newPmt,p.newDue,p.newRemain]]){
    if(payment>0&&(remain===0||diff<remain))items.push({name,amount:payment,day:due||0,kind:'loan',status:'planned'});
   }
  }
  for(const e of s.entries){
   if(e.month===ym||(e.recurring==='monthly'&&e.month<=ym)){
    items.push({name:e.name,amount:e.amount,day:e.dueDay||0,kind:e.type,status:e.status||'planned'});
   }
  }
  if(s.payroll?.nextDate?.slice(0,7)===ym){
   let amount=0;
   if(ym==='2026-11')amount=p.novIncome||p.acad*p.novComps;
   else if(ym>='2026-12'&&ym<='2027-03')amount=p.acad;
   else if(ym>='2027-04')amount=p.post;
   if(amount>0)items.push({name:'Pagamento informado',amount,day:Number(s.payroll.nextDate.slice(-2)),kind:'income',status:'planned'});
  }
  return items;
 }
 function start(){
  const view=$('view-transacoes');if(!view||!APP)return;
  const sec=document.createElement('section');sec.className='pane v3-calendar';
  sec.innerHTML='<div class="v3-section-head"><div><h2>Calendário de vencimentos</h2><p class="v3-subtle">Datas informadas, incluindo parcelas e lançamentos recorrentes.</p></div>'+
   '<div class="v3-calendar-controls"><button type="button" id="v3CalPrev" aria-label="Mês anterior">‹</button><input type="month" id="v3CalMonth" aria-label="Mês do calendário"><button type="button" id="v3CalNext" aria-label="Próximo mês">›</button></div></div>'+
   '<div class="v3-calendar-grid" id="v3CalendarGrid" aria-label="Calendário mensal"></div>'+
   '<p class="v3-subtle" id="v3CalendarNote"></p>';
  const firstBills=$('billsOverview').closest('.pane');
  view.insertBefore(sec,firstBills);
  $('v3CalPrev').addEventListener('click',()=>{month=shift(month,-1);render();});
  $('v3CalNext').addEventListener('click',()=>{month=shift(month,1);render();});
  $('v3CalMonth').addEventListener('change',e=>{if(/^\d{4}-\d{2}$/.test(e.target.value)){month=e.target.value;render();}});
  document.addEventListener('fin-changed',render);
  render();
 }
 function render(){
  if(!$('v3CalendarGrid'))return;
  $('v3CalMonth').value=month;
  const s=APP.get(),[yy,mm]=month.split('-').map(Number);
  const days=new Date(Date.UTC(yy,mm,0)).getUTCDate();
  const offset=(new Date(Date.UTC(yy,mm-1,1)).getUTCDay()+6)%7;
  const all=getItems(s,month);
  const valid=all.filter(e=>e.day>=1&&e.day<=days);
  const unknown=all.filter(e=>e.day<1||e.day>days);
  const groups={};for(const e of valid){(groups[e.day]??=[]).push(e);}
  const weekdays=['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];
  let html=weekdays.map(d=>'<div class="v3-cal-weekday">'+d+'</div>').join('');
  for(let i=0;i<offset;i++)html+='<div class="v3-cal-cell muted" aria-hidden="true"></div>';
  for(let day=1;day<=days;day++){
   const events=groups[day]||[],iso=month+'-'+String(day).padStart(2,'0');
   const today=new Date(),isToday=today.getFullYear()===yy&&today.getMonth()+1===mm&&today.getDate()===day;
   html+='<div class="v3-cal-cell '+(isToday?'today':'')+'" aria-label="'+day+' de '+mm+' de '+yy+', '+events.length+' evento(s)">'+
    '<b>'+day+'</b>'+
    events.slice(0,2).map(e=>'<div class="v3-cal-event '+esc(e.kind)+(e.status==='paid'?' paid':'')+'" title="'+esc(e.name+' — '+fmt(e.amount))+'">'+esc(e.name)+'</div>').join('')+
    (events.length>2?'<small>+'+(events.length-2)+' compromisso(s)</small>':'')+'</div>';
  }
  $('v3CalendarGrid').innerHTML=html;
  $('v3CalendarNote').textContent=unknown.length?
   unknown.length+' compromisso(s) sem dia válido informado neste mês. Ajuste o vencimento nos contratos ou lançamentos. Nenhum vencimento foi presumido.':
   'Dias do calendário não representam necessariamente datas bancárias compensadas. Marcar pago não movimenta os saldos reais.';
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();