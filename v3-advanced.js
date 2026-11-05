/* Calculadora de amortização independente das projeções tradicionais */
(() => {
 'use strict';
 const $=id=>document.getElementById(id);
 const APP=window.FIN_APP;
 const format=v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v)||0);
 const escape=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function stat(title,value,desc,negative){
  return '<div class="v3-stat '+(negative?'is-negative':'')+'"><span>'+title+'</span><strong>'+value+'</strong><small>'+desc+'</small></div>';
 }
 function start(){
  const host=$('view-simulador');
  if(!host||!APP||!window.FIN_AMORT)return;
  const section=document.createElement('section');section.className='pane v3-advanced';section.id='v3Amort';
  section.innerHTML=
   '<div class="v3-section-head"><div><span class="eyebrow">ANÁLISE DE FINANCIAMENTO</span><h2>Simulador de amortização antecipada</h2><p class="v3-subtle">Para propostas Price com prazo contratual longo e antecipações mensais extras, como 96 meses com objetivo de quitação antecipada.</p></div><span class="v3-pill">Cenário hipotético</span></div>'+
   '<div class="v3-amort-fields">'+
    '<label class="field">Valor financiado (R$)<input type="number" data-adv="financed" step=".01" min="0" placeholder="Valor do contrato"></label>'+
    '<label class="field">Valor líquido na conta (R$)<input type="number" data-adv="net" step=".01" min="0" placeholder="Crédito recebido"></label>'+
    '<label class="field">Taxa de juros (% ao mês)<input type="number" data-adv="rate" step=".01" min="0" max="100"></label>'+
    '<label class="field">Prazo original (meses)<input type="number" data-adv="term" step="1" min="1" max="360"></label>'+
    '<label class="field">Parcela contratual (R$)<input type="number" data-adv="basePayment" step=".01" min="0" placeholder="0 = calcular Price"></label>'+
    '<label class="field">Amortização extra mensal (R$)<input type="number" data-adv="extra" step=".01" min="0"></label>'+
    '<label class="field">Meta de quitação (meses)<input type="number" data-adv="target" step="1" min="1" max="360"></label>'+
   '</div>'+
   '<div id="v3AmortResults" aria-live="polite"></div>'+
   '<div id="v3AmortChart" class="v3-amort-chart" role="img" aria-label="Evolução do saldo devedor projetado"></div>'+
   '<details class="v3-amort-details"><summary>Visualizar cronograma completo</summary><div class="table-scroll"><table><thead><tr><th>Mês</th><th class="right">Juros</th><th class="right">Parcela base</th><th class="right">Extra</th><th class="right">Total pago</th><th class="right">Saldo devedor</th></tr></thead><tbody id="v3AmortRows"></tbody></table></div></details>'+
   '<p class="v3-disclaimer">A amortização extra é simulada como redução direta do principal, visando encurtar o prazo. O banco pode usar calendário, regras de cálculo e processo de antecipação diferentes. A taxa de juros informada não equivale ao CET. Solicite a memória de cálculo oficial e confirme o saldo final.</p>';
  host.append(section);
  section.querySelectorAll('[data-adv]').forEach(input=>input.addEventListener('change',ev=>{
   const model=APP.get();model.advanced[ev.target.dataset.adv]=Number(ev.target.value);
   try{APP.replace(model);}catch(err){alert('Revise a informação: '+err.message);render();}
  }));
  document.addEventListener('fin-changed',render);
  render();
 }
 function chart(result){
  const el=$('v3AmortChart');
  if(!result||!result.rows.length){el.innerHTML='';return;}
  const rows=result.rows,w=860,h=240,left=56,right=16,top=20,bottom=35;
  const max=Math.max(1,result.financed);
  const x=i=>left+(i/(rows.length))* (w-left-right);
  const y=value=>top+(1-value/max)*(h-top-bottom);
  const points=[[x(0),y(result.financed)],...rows.map(r=>[x(r.month),y(r.balance)])];
  const path=points.map(p=>p.map(v=>v.toFixed(2)).join(',')).join(' ');
  el.innerHTML='<svg viewBox="0 0 '+w+' '+h+'" aria-hidden="true">'+
   '<line x1="'+left+'" y1="'+(h-bottom)+'" x2="'+(w-right)+'" y2="'+(h-bottom)+'" stroke="#6d899a" stroke-width="1"/>'+
   '<line x1="'+left+'" y1="'+top+'" x2="'+left+'" y2="'+(h-bottom)+'" stroke="#6d899a" stroke-width="1"/>'+
   '<text x="'+left+'" y="14" fill="currentColor" font-size="12">'+escape(format(result.financed))+'</text>'+
   '<text x="'+left+'" y="'+(h-8)+'" fill="currentColor" font-size="12">Início</text>'+
   '<text x="'+(w-right)+'" y="'+(h-8)+'" fill="currentColor" text-anchor="end" font-size="12">Mês '+result.months+'</text>'+
   '<polyline fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="'+path+'"/>'+
   '<circle cx="'+x(result.months)+'" cy="'+y(rows.at(-1).balance)+'" r="5" fill="currentColor"><title>Saldo final: '+escape(format(rows.at(-1).balance))+'</title></circle></svg>'+
   '<p class="v3-subtle">Curva do saldo devedor calculada sobre os valores informados.</p>';
 }
 function render(){
  const host=$('v3Amort');if(!host)return;
  const a=APP.get().advanced||{};
  host.querySelectorAll('[data-adv]').forEach(el=>{if(document.activeElement!==el)el.value=Number(a[el.dataset.adv]??0);});
  const res=$('v3AmortResults'),table=$('v3AmortRows');
  try{
   const r=window.FIN_AMORT.compare(a);
   if(r.empty){
    res.innerHTML='<div class="v3-empty">Informe o valor financiado, taxa mensal e prazo para gerar a projeção. A simulação não contrata crédito nem altera suas dívidas atuais.</div>';
    table.innerHTML='';$('v3AmortChart').innerHTML='';return;
   }
   const targetText=r.targetBalance<=.005?'Dívida projetada quitada até a meta':'Saldo residual após '+r.target+' meses';
   res.innerHTML='<div class="v3-amort-overview">'+
    stat('Parcela base',format(r.base),'Valor Price ou parcela informada')+
    stat('Pagamento mensal com extra',format(r.base+r.extra),'Até o mês da quitação')+
    stat('Prazo projetado',r.months+' meses','Contrato original: '+r.term+' meses')+
    stat('Saldo após '+r.target+' meses',format(r.targetBalance),targetText,r.targetBalance>.005)+
    stat('Juros estimados',format(r.interestPaid),'Economia em juros: '+format(r.interestSaved))+
    stat('Total pago',format(r.total),'Principal + juros simulados')+
    stat('Custo acima do líquido',r.costVsNet===null?'Não informado':format(r.costVsNet),'Exige valor liberado')+
    stat('Financiado menos líquido',r.capitalizedCharges===null?'Não informado':format(r.capitalizedCharges),'Pode envolver IOF e custos')+
    '</div>'+
    '<div class="v3-alert warning">Este resultado não garante quitação antecipada junto ao banco. O pagamento extra pode exigir solicitação mensal. Confirme a ausência de saldo residual e o CET na proposta contratual.</div>';
   table.innerHTML=r.rows.map(v=>'<tr><td>'+v.month+'</td><td class="right">'+format(v.interest)+'</td><td class="right">'+format(v.contractual)+'</td><td class="right">'+format(v.extra)+'</td><td class="right">'+format(v.paid)+'</td><td class="right">'+format(v.balance)+'</td></tr>').join('');
   chart(r);
  }catch(err){
   res.innerHTML='<div class="v3-alert danger">'+escape(err.message)+'</div>';table.innerHTML='';$('v3AmortChart').innerHTML='';
  }
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();