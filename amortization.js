/* Motor de amortização local. Nenhuma informação pessoal no código público. */
(function (root) {
  'use strict';
  const round=v=>Math.round((v+Number.EPSILON)*100)/100;
  function price(principal,rate,months){
    if(!Number.isFinite(principal)||principal<=0) return 0;
    if(!Number.isInteger(months)||months<1) throw Error('Prazo inválido.');
    if(rate===0)return round(principal/months);
    const r=rate/100, pow=Math.pow(1+r,months);
    return round(principal*r*pow/(pow-1));
  }
  function schedule(config){
    const principal=Number(config.financed), net=Number(config.net),rate=Number(config.rate),
      term=Number(config.term),extra=Number(config.extra||0),target=Number(config.target||48),
      override=Number(config.basePayment||0);
    if(![principal,net,rate,term,extra,target,override].every(Number.isFinite)||
      principal<0||net<0||rate<0||rate>100||extra<0||override<0||
      !Number.isInteger(term)||term<1||term>360||
      !Number.isInteger(target)||target<1||target>360)throw Error('Verifique os valores, a taxa e os prazos.');
    if(principal===0)return {empty:true,rows:[],base:0};
    const rateMonth=rate/100;
    const base=override>0?override:price(principal,rate,term);
    if(base<=principal*rateMonth)throw Error('A parcela informada não cobre os juros iniciais. Confira a taxa e o valor financiado.');
    let remaining=round(principal),total=0,interestPaid=0,rows=[],targetBalance=null;
    const MAX=360;
    for(let i=1;i<=MAX&&remaining>0.005;i++){
      const open=remaining,interest=round(open*rateMonth),
        required=round(Math.min(open+interest,base)),
        additional=round(Math.min(Math.max(0,open+interest-required),extra));
      if(required<=interest&&open>0.005)throw Error('O contrato apresenta amortização negativa.');
      const paid=round(required+additional);
      remaining=round(Math.max(0,open+interest-paid));
      total=round(total+paid);interestPaid=round(interestPaid+interest);
      rows.push({month:i,open,interest,contractual:required,extra:additional,paid,balance:remaining});
      if(i===target)targetBalance=remaining;
    }
    if(targetBalance===null)targetBalance=rows.at(-1)?.balance||0;
    return {empty:false,rows,base,term,extra,target,financed:principal,net,
      months:rows.length,remaining:remaining,total,interestPaid,
      costVsNet:net>0?round(total-net):null,
      capitalizedCharges:net>0?round(principal-net):null,
      targetBalance,withinTarget:rows.length<=target&&remaining<=.005};
  }
  function compare(cfg){
    const accelerated=schedule(cfg);
    if(accelerated.empty)return accelerated;
    const standard=schedule({...cfg,extra:0});
    return {...accelerated,standard,interestSaved:round(standard.interestPaid-accelerated.interestPaid),
      paidSaved:round(standard.total-accelerated.total),
      monthsSaved:Math.max(0,standard.months-accelerated.months)};
  }
  root.FIN_AMORT={price,schedule,compare};
})(typeof window==='undefined'?globalThis:window);
