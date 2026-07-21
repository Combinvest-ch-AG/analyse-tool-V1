(function(){
  "use strict";
  var routeParams=new URLSearchParams(location.search),parentReturn=routeParams.get("returnTo")||"",hubReturn="versicherungsberatung.html"+(parentReturn?"?returnTo="+encodeURIComponent(parentReturn):"");
  [["franchise","franchise.html"],["supplementary","zusatzversicherung.html"],["insurance","versicherungscheck.html"]].forEach(function(route){var link=document.querySelector('[data-module="'+route[0]+'"] a.primary');if(link&&window.CombinvestCRM)link.href=CombinvestCRM.url(route[1],{returnTo:hubReturn});});
  function data(key){return window.CombinvestCRM?CombinvestCRM.data(key,null):null;}
  function labels(items){return(items||[]).map(function(x){return typeof x==="string"?x:x.label||x.id;}).filter(Boolean);}
  var franchise=data("franchise"),supp=data("supplementaryInsurance"),insurance=data("insurance-needs");
  var modules=[
    {key:"franchise",data:franchise,done:!!(franchise&&franchise.recommendation)},
    {key:"supplementary",data:supp,done:!!supp},
    {key:"insurance",data:insurance,done:!!insurance}
  ];
  var done=modules.filter(function(x){return x.done;}).length,ring=document.querySelector(".progress-ring");
  document.getElementById("progressValue").textContent=done+"/3";ring.style.setProperty("--progress",Math.round(done/3*100)+"%");
  modules.forEach(function(module){var card=document.querySelector('[data-module="'+module.key+'"]'),status=document.getElementById(module.key+"Status");card.classList.toggle("done",module.done);status.textContent=module.done?"Bearbeitet":"Offen";});
  function row(name,value){return'<div class="comparison-row"><span>'+name+'</span><b>'+value+'</b></div>';}
  var f=document.getElementById("franchiseComparison");
  if(franchise&&franchise.recommendation){var rec=franchise.recommendation,insurer=(franchise.selectedOffer&&franchise.selectedOffer.insurerName)||"Gewählter Versicherer";f.innerHTML=row("Bestand","Franchise CHF "+Number(franchise.currentFranchise||300).toLocaleString("de-CH"))+row("Ergebnis","Franchise CHF "+Number(rec.franchise||0).toLocaleString("de-CH"))+row("Prämie","CHF "+Number(rec.monthlyPremium||0).toLocaleString("de-CH",{minimumFractionDigits:2,maximumFractionDigits:2})+" / Monat");}else f.innerHTML='<div class="comparison-empty">Wohnort, Modell und aktuelle Franchise noch nicht erfasst.</div>';
  var wantedSupp=supp?labels(supp.selected):[],existingSupp=supp?labels(supp.existingSelected):[];
  document.getElementById("supplementaryComparison").innerHTML=supp?(row("Bestand",existingSupp.length+" Deckungen")+row("Gewünscht",wantedSupp.length+" Deckungen")):'<div class="comparison-empty">Zusatzdeckungen noch nicht erfasst.</div>';
  var wantedIns=insurance?labels(insurance.selected):[],existingIns=insurance?labels(insurance.existingSelected):[];
  document.getElementById("insuranceComparison").innerHTML=insurance?(row("Bestand",existingIns.length+" Deckungen")+row("Gewünscht",wantedIns.length+" Deckungen")):'<div class="comparison-empty">Hausrat, Haftpflicht und Auto noch nicht erfasst.</div>';
  var existing=existingSupp.concat(existingIns),wanted=wantedSupp.concat(wantedIns),gaps=wanted.filter(function(x){return existing.indexOf(x)<0;});
  document.getElementById("existingCount").textContent=existing.length;document.getElementById("wantedCount").textContent=wanted.length;document.getElementById("gapCount").textContent=gaps.length;
  document.getElementById("gapList").innerHTML=gaps.slice(0,8).map(function(x){return"<span>Prüfen: "+x+"</span>";}).join("");
  var summaryState=document.getElementById("summaryState");summaryState.textContent=done===3?"Vollständig erfasst":"Noch nicht vollständig";summaryState.classList.toggle("complete",done===3);
  document.getElementById("saveSummary").addEventListener("click",function(){var payload={version:1,completed:done,existing:existing,wanted:wanted,gaps:gaps,franchise:franchise&&franchise.recommendation||null,updatedAt:new Date().toISOString()},ok=window.CombinvestCRM&&CombinvestCRM.save("insurance-summary",payload);document.getElementById("saveStatus").textContent=ok?"In Analyse übernommen":"Speichern nicht möglich";});
})();
