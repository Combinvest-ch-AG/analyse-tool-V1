(function(global){
  "use strict";
  if(global.__combinvestCalculatorShell)return;global.__combinvestCalculatorShell=true;
  var page=(location.pathname.split("/").pop()||"").toLowerCase(),params=new URLSearchParams(location.search),mode=params.get("tool")||"";
  var META={
    "vermoegensrechner.html":{key:"wealth"+(mode?"-"+mode:""),basis:"Planungswert",source:"Ihre Eingaben zu Sparbetrag, Laufzeit und Rendite.",explain:"Sie sehen Einzahlungen und mögliche Entwicklung getrennt."},
    "rentenrechner.html":{key:"ahv-retirement",basis:"Planungswert",source:"AHV-Rentenskala, Beitragsjahre und Ihre Angaben.",explain:"Sie sehen die erwartete AHV-Rente und die verbleibende Lücke."},
    "vorsorgerechner.html":{key:"pension-gap",basis:"Angaben & Modellwerte",source:"AHV/IV, BVG, UVG sowie Ihre Ausweis- und Policenwerte.",explain:"Vorhandene Renten werden dem gewünschten Einkommen gegenübergestellt."},
    "franchise.html":{key:"health-franchise",basis:"Prämien 2026 · Kostenszenario",source:"BAG / opendata.swiss, Prämien 2026; exakte Auswahl über Priminfo.",explain:"Sie sehen Prämie und Kostenbeteiligung je Franchise getrennt."},
    "budgetrechner.html":{key:"budget",basis:"Erfasste Monatswerte",source:"Ihre monatlichen Einnahmen und Ausgaben.",explain:"Sie sehen den monatlichen Überschuss und die Sparquote."},
    "immobilienrechner.html":{key:"real-estate-affordability",basis:"Modellrechnung",source:"Banken-Praxis: 5 % Zins, 1 % Nebenkosten und rund 33 % Tragbarkeit.",explain:"Die Quote zeigt die kalkulatorische Belastung Ihres Einkommens."}
  };
  var meta=META[page];if(!meta)return;
  if(!document.querySelector('link[href*="calculator-shell.css"]')){var css=document.createElement("link");css.rel="stylesheet";css.href="calculator-shell.css?v=6";document.head.appendChild(css);}
  function ready(fn){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",fn);else fn();}
  function text(el){return el?(el.innerText||el.textContent||"").trim():"";}
  function head(){return document.querySelector("main .head,main>.head,.page-heading,.head");}
  function inputRoot(){return document.querySelector('[aria-label="Eingaben"],.input-panel,.inputs,#form,#bdgForm,.grid>section:first-child');}
  function resultRoot(){return document.querySelector('.result,[aria-live="polite"],.results-panel,#bdgMetrics,.grid>section.card:nth-child(2),.grid>section:nth-child(2)');}
  function addId(el,id){if(!el)return;if(!document.getElementById(id)){if(!el.id)el.id=id;else{var anchor=document.createElement("span");anchor.id=id;anchor.className="calc-anchor calc-anchor-alias";el.parentNode.insertBefore(anchor,el);}}el.classList.add("calc-anchor");}
  function collect(){var fields={},results=[];document.querySelectorAll("input[id],select[id],textarea[id]").forEach(function(el){if(el.type==="button"||el.type==="submit")return;fields[el.id]=el.type==="checkbox"?el.checked:el.value;});document.querySelectorAll(".metric,.tile,.fact,.hero,.bdg-metric,.result-hero").forEach(function(el){var value=text(el);if(value&&results.length<14)results.push(value.replace(/\s+/g," "));});return {calculator:meta.key,page:page,calculationYear:2026,inputs:fields,results:results,source:meta.source,basis:meta.basis,savedAt:new Date().toISOString()};}
  var RICH=["budgetrechner.html","vorsorgerechner.html","franchise.html"];/* speichern eigenes Rich-Modul */
  var isRich=RICH.indexOf(page)>=0;
  function indexCalculator(payload){
    if(isRich||!global.CombinvestCRM)return;
    var idx=CombinvestCRM.data("calculator-index",{})||{};
    idx[meta.key]={title:pageTitle(),page:page,updatedAt:payload.savedAt};
    CombinvestCRM.save("calculator-index",idx);
  }
  function persist(transfer){var payload=collect(),ok=false;if(global.CombinvestCRM){ok=CombinvestCRM.save("calculator."+meta.key,payload);indexCalculator(payload);if(transfer&&CombinvestCRM.analysisId){var module="analysis."+CombinvestCRM.analysisId,current=CombinvestCRM.data(module,{})||{};current.calculatorResults=current.calculatorResults||{};current.calculatorResults[meta.key]=payload;ok=CombinvestCRM.save(module,current)&&ok;}}else{try{localStorage.setItem("combinvest.calculator."+meta.key,JSON.stringify(payload));ok=true;}catch(e){}}return ok;}
  var saveTimer;
  function scheduleSave(){clearTimeout(saveTimer);saveTimer=setTimeout(function(){var ok=persist(true),el=document.querySelector(".calc-save-state");if(el){el.textContent=ok?"Automatisch gespeichert":"Übernahme optional";el.className="calc-save-state"+(ok?" ok":"");}},700);}
  function toast(message){var el=document.querySelector(".calc-toast");el.textContent=message;el.classList.add("show");clearTimeout(toast.timer);toast.timer=setTimeout(function(){el.classList.remove("show");},2600);}
  function reset(){var own=document.querySelector("#bdgReset,#resetButton");if(own){own.click();return;}document.querySelectorAll("input,select,textarea").forEach(function(el){if(el.classList.contains("calc-direct-input"))return;if(el.type==="checkbox"||el.type==="radio")el.checked=el.defaultChecked;else el.value=el.defaultValue;el.dispatchEvent(new Event(el.tagName==="SELECT"?"change":"input",{bubbles:true}));});toast("Eingaben wurden zurückgesetzt.");}
  function details(){var main=document.querySelector("main")||document.body,card=document.createElement("section");card.className="calc-standard-card";card.innerHTML='<div class="calc-standard-grid"><div class="calc-standard-block calc-anchor" id="calc-explanation"><small>Kurz erklärt</small><h2>Das zeigt das Ergebnis</h2><p>'+meta.explain+'</p></div></div>';main.appendChild(card);if(!document.querySelector(".data-source")){var source=document.createElement("footer");source.className="calc-source";source.innerHTML='<span><b>Berechnungsgrundlage</b>'+meta.source+'</span><span class="calc-year">Stand 2026</span>';main.appendChild(source);}}
  function pageTitle(){var h=document.querySelector("#title,main .head h1,.head h1,main h1,h1");return text(h)||"Berechnung";}
  function groupNum(v){var s=String(v);if(!/^-?\d+(\.\d+)?$/.test(s))return s;var parts=s.split("."),sign=parts[0][0]==="-"?"-":"",int=sign?parts[0].slice(1):parts[0];int=int.replace(/\B(?=(\d{3})+(?!\d))/g,"\u2019");return sign+int+(parts[1]?"."+parts[1]:"");}
  function fmtVal(el){if(el.tagName==="SELECT"){var o=el.options[el.selectedIndex];return o?(o.text||"").trim():el.value;}if(el.type==="checkbox")return el.checked?"Ja":"Nein";var v=(el.value||"").trim();return groupNum(v);}
  function collectMetrics(){
    var out=[];
    document.querySelectorAll("main .fact,main .hero,main .metric,main .tile,main .result-hero,main .bdg-metric").forEach(function(el){
      if(out.length>=6)return;
      var v=el.querySelector(".fv,.num,b,strong,.value"),l=el.querySelector(".fl,small,.k,.label"),s=el.querySelector(".fs,.sub")||el.querySelector("span");
      var value=v?text(v):"",label=l?text(l):"",sub=s?text(s):"";
      if(v&&value&&value!=="—"){if(sub===value)sub="";out.push([label||"Ergebnis",value,sub]);}
      else{var t=text(el).replace(/\s+/g," ");if(t)out.push([t,"",""]);}
    });
    return out.slice(0,6);
  }
  function collectInputs(){
    var rows=[],seen={};
    /* Muster A: .field mit .lab (z. B. Immobilien) */
    document.querySelectorAll("main .field").forEach(function(f){
      var lab=f.querySelector(".lab>span")||f.querySelector(".lab")||f.querySelector("label>span")||f.querySelector("label"),input=f.querySelector("input,select,textarea");
      if(!lab||!input||input.type==="button"||input.type==="submit"||input.classList.contains("calc-direct-input"))return;
      var name=text(lab).replace(/\s+/g," ");if(!name||seen[name])return;var val=fmtVal(input);if(val===""||val==null)return;
      seen[name]=1;rows.push([name,val]);
    });
    /* Muster B: <label>Text <span class="value">…</span></label> (z. B. Slider) */
    document.querySelectorAll("main label").forEach(function(l){
      var valEl=l.querySelector(".value,.val,output");if(!valEl)return;
      var clone=l.cloneNode(true),v=clone.querySelector(".value,.val,output");if(v)v.parentNode.removeChild(v);
      var name=text(clone).replace(/\s+/g," "),val=text(valEl).replace(/\s+/g," ");
      if(!name||seen[name]||!val)return;seen[name]=1;rows.push([name,val]);
    });
    return rows;
  }
  function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});}
  function buildPrintReport(){
    if(document.getElementById("bdgReport"))return;/* Budget hat eigenen Report */
    var host=document.getElementById("calcReport");if(!host)return;
    var dateStr;try{dateStr=new Date().toLocaleDateString("de-CH",{day:"2-digit",month:"long",year:"numeric"});}catch(e){dateStr=new Date().toLocaleDateString("de-CH");}
    var metrics=collectMetrics(),inputs=collectInputs();
    var h='<div class="rep-top"><div class="rep-brand">comb<span>invest</span><small>'+esc(meta.basis)+'</small></div>'+
      '<div class="rep-title"><h2>'+esc(pageTitle())+'</h2><div class="rep-date">Erstellt am '+esc(dateStr)+'</div></div></div>';
    if(metrics.length){h+='<div class="rep-sec">Ergebnis</div><div class="rep-metrics">';metrics.forEach(function(m){h+='<div class="rep-metric"><div class="rl">'+esc(m[0])+'</div>'+(m[1]?'<div class="rv">'+esc(m[1])+'</div>':'')+(m[2]?'<div class="rs">'+esc(m[2])+'</div>':'')+'</div>';});h+='</div>';}
    if(inputs.length){h+='<div class="rep-sec">Ihre Eingaben</div><div class="rep-table">';inputs.forEach(function(r){h+='<div class="rep-row"><span class="rn">'+esc(r[0])+'</span><span class="ra">'+esc(r[1])+'</span></div>';});h+='</div>';}
    h+='<div class="rep-foot"><b>Berechnungsgrundlage:</b> '+esc(meta.source)+' Stand 2026. Combinvest &middot; Diese Übersicht wurde aus Ihren Eingaben erstellt und dient der Orientierung. Keine Anlage- oder Steuerberatung.</div>';
    host.innerHTML=h;document.body.classList.add("calc-has-report");
  }
  function actions(){var main=document.querySelector("main")||document.body,bar=document.createElement("div"),canTransfer=!!(global.CombinvestCRM&&CombinvestCRM.analysisId),anchor=document.querySelector("main .tabs")||head();bar.className="calc-actions";bar.innerHTML='<button type="button" data-calc="reset">Zurücksetzen</button><button type="button" class="primary" data-calc="transfer" '+(canTransfer?'':'disabled title="Rechner aus einer Kundenanalyse öffnen"')+'>In Analyse übernehmen</button><button type="button" data-calc="pdf">PDF-Bericht</button><a href="'+(global.CombinvestCRM?CombinvestCRM.url("analyse.html",{step:3}):"analyse.html?step=3")+'">Zur Risikoanalyse</a><span class="calc-save-state" aria-live="polite">'+(canTransfer?"Automatisch gespeichert":"Übernahme optional")+'</span>';if(anchor&&anchor.parentNode)anchor.parentNode.insertBefore(bar,anchor.nextSibling);else main.insertBefore(bar,main.firstChild);bar.addEventListener("click",function(e){var b=e.target.closest("[data-calc]");if(!b)return;e.preventDefault();var action=b.dataset.calc,state=bar.querySelector(".calc-save-state");if(action==="reset")return reset();if(action==="pdf"){buildPrintReport();return global.print();}if(action==="transfer"){var ok=persist(true);state.textContent=ok?"Ergebnis übernommen":"Übernahme nicht möglich";state.className="calc-save-state "+(ok?"ok":"warn");toast(state.textContent+".");}});}
  function enhanceRanges(){document.querySelectorAll('input[type="range"]').forEach(function(range){if(range.dataset.calcEnhanced)return;range.dataset.calcEnhanced="1";var field=range.closest(".field"),paired=field&&field.querySelector('input[type="number"]');if(paired){range.addEventListener("input",function(){paired.value=range.value;});paired.addEventListener("input",function(){range.value=paired.value;});return;}var wrap=document.createElement("div"),direct=document.createElement("input");wrap.className="calc-range-control";range.parentNode.insertBefore(wrap,range);wrap.appendChild(range);direct.type="number";direct.className="calc-direct-input";direct.value=range.value;direct.min=range.min;direct.max=range.max;direct.step=range.step||"1";direct.setAttribute("aria-label","Wert direkt eingeben");wrap.appendChild(direct);range.addEventListener("input",function(){direct.value=range.value;});direct.addEventListener("input",function(){range.value=direct.value;range.dispatchEvent(new Event("input",{bubbles:true}));});});}
  function basisChip(){var h=head();if(!h||h.querySelector(".calc-basis-chip"))return;var chip=document.createElement("span");chip.className="calc-basis-chip";chip.textContent=meta.basis+" · Stand 2026";h.appendChild(chip);}
  function tooltips(){document.querySelectorAll("svg [data-value],.segment,.stack span,.fill").forEach(function(el){if(!el.getAttribute("title")){var label=el.getAttribute("aria-label")||text(el)||"Diagrammwert";el.setAttribute("title",label);}});}
  function hoverTips(){var tip=document.createElement("div");tip.className="calc-hover-tip";tip.setAttribute("role","status");document.body.appendChild(tip);function target(e){return e.target.closest&&e.target.closest('.stack [title],.segment[title],.bar-chart [aria-label]');}document.addEventListener("pointerover",function(e){var t=target(e);if(!t)return;tip.textContent=t.getAttribute("title")||t.getAttribute("aria-label");tip.classList.add("show");});document.addEventListener("pointermove",function(e){if(!tip.classList.contains("show"))return;tip.style.left=Math.max(8,Math.min(innerWidth-tip.offsetWidth-12,e.clientX+14))+"px";tip.style.top=Math.max(8,Math.min(innerHeight-tip.offsetHeight-12,e.clientY+14))+"px";});document.addEventListener("pointerout",function(e){if(target(e))tip.classList.remove("show");});}
  ready(function(){
    document.body.classList.add("calc-unified");addId(inputRoot(),"calc-input");addId(resultRoot(),"calc-result");basisChip();enhanceRanges();if(page!=="vorsorgerechner.html")details();actions();tooltips();hoverTips();setTimeout(tooltips,300);
    var toastEl=document.createElement("div");toastEl.className="calc-toast";toastEl.setAttribute("role","status");document.body.appendChild(toastEl);
    if(!document.getElementById("bdgReport")){var rep=document.createElement("section");rep.className="calc-report";rep.id="calcReport";rep.setAttribute("aria-hidden","true");(document.querySelector("main")||document.body).appendChild(rep);}
    /* Report kurz vor dem Druck aufbauen: deckt Button, Ctrl+P und das
       mobile Teilen-/Drucken-Menue (Safari) ab. */
    window.addEventListener("beforeprint",buildPrintReport);
    if(window.matchMedia){var mq=window.matchMedia("print"),onMq=function(m){if(m.matches)buildPrintReport();};if(mq.addEventListener)mq.addEventListener("change",onMq);else if(mq.addListener)mq.addListener(onMq);}
    window.addEventListener("afterprint",function(){document.body.classList.remove("calc-has-report");});
    /* Automatische Uebernahme in die Analyse (debounced), damit jede
       Bearbeitung im Gesamt-Beratungsbericht landet. */
    if(!isRich){var root=document.querySelector("main")||document.body;var onEdit=function(e){var t=e.target;if(t&&/^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)&&t.type!=="button"&&t.type!=="submit")scheduleSave();};root.addEventListener("input",onEdit);root.addEventListener("change",onEdit);}
  });
})(window);
