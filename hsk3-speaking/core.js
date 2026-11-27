/* Pure domain logic, shared by the UI and the acceptance tests. */
(function (g) {
 'use strict';
 const isDevHost=h=>['','localhost','127.0.0.1','[::1]'].includes(h);
 const isPro=(license,host)=>Boolean(license && ((license.source==='development' && isDevHost(host)) || (license.source==='gumroad' && typeof license.verifiedAt==='string' && !Number.isNaN(Date.parse(license.verifiedAt)))));
 const canAccess=(q,pro)=>Boolean(q&&(q.free||pro));
 const accessible=(qs,pro)=>qs.filter(q=>canAccess(q,pro));
 function score(values){
  if(values.length!==5||values.some(x=>!Number.isInteger(x)||x<1||x>5)) throw Error('Rate all five dimensions from 1 to 5.');
  return Math.round(values.reduce((a,b)=>a+b,0)/25*100);
 }
 function phaseAt(q,elapsed){
  const sec=Math.max(0,Math.floor(elapsed/1000));
  if(sec<q.prep) return {phase:'prepare',remaining:q.prep-sec};
  if(sec<q.prep+q.seconds) return {phase:'answer',remaining:q.prep+q.seconds-sec};
  return {phase:'done',remaining:0};
 }
 function weekStats(history,today){
  const day=new Date(`${today}T12:00:00`);
  return Array.from({length:7},(_,i)=>{const d=new Date(day); d.setDate(d.getDate()-6+i); const date=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; const rows=history.filter(h=>h.date===date); return {date,count:rows.length,average:rows.length?Math.round(rows.reduce((a,r)=>a+r.score,0)/rows.length):0};});
 }
 async function verifyLicense(key,cfg,fetcher=g.fetch){
  key=String(key||'').trim(); if(!key) throw Error('Enter your license key.');
  if(key==='HSK30-DEV-PRO-2026'){
   if(!isDevHost(cfg.hostname)) throw Error('The development key works only on a local copy. Use your purchase key here.');
   return {source:'development',verifiedAt:new Date().toISOString()};
  }
  if(!cfg.productId||cfg.productId==='YOUR_GUMROAD_PRODUCT_ID') throw Error('Paid activation is not configured yet. Contact the seller using your receipt.');
  const abort=new AbortController(); const timer=setTimeout(()=>abort.abort(),12000);
  try{
   const response=await fetcher('https://api.gumroad.com/v2/licenses/verify',{method:'POST',body:new URLSearchParams({product_id:cfg.productId,license_key:key,increment_uses_count:'false'}),signal:abort.signal});
   const data=await response.json(); const p=data.purchase;
   if(!response.ok||data.success!==true||!p||p.product_id!==cfg.productId||p.refunded||p.disputed||p.chargebacked||p.subscription_ended_at||(p.license_key&&p.license_key!==key)) throw Error('This key is invalid, refunded, disputed, or belongs to another product.');
   return {source:'gumroad',verifiedAt:new Date().toISOString()};
  }finally{clearTimeout(timer);}
 }
 g.HSKCore={isDevHost,isPro,canAccess,accessible,score,phaseAt,weekStats,verifyLicense};
})(globalThis);
