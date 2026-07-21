(function(global){
  "use strict";
  if(global.__combinvestAppShell||!document.body)return;
  global.__combinvestAppShell=true;

  if(!document.querySelector('link[href*="platform-polish.css"]')){
    var polish=document.createElement("link");polish.rel="stylesheet";polish.href="platform-polish.css?v=4";document.head.appendChild(polish);
  }

  var crm=global.CombinvestCRM||{};
  var customerId=crm.customerId||"local-demo";
  var analysisId=crm.analysisId||"";
  var page=(location.pathname.split("/").pop()||"").toLowerCase();
  var params=new URLSearchParams(location.search);
  if(["index.html","login.html","dashboard.html","kunde.html"].indexOf(page)>=0)return;

  var css=document.createElement("link");css.rel="stylesheet";css.href="app-shell.css?v=4";document.head.appendChild(css);
  function url(target,extra){return crm.url?crm.url(target,extra):target;}
  function icon(name){
    var paths={
      home:'<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10M9 20v-6h6v6"/>',
      analysis:'<path d="M4 19V9m6 10V5m6 14v-7m4 7H2"/>',
      customer:'<circle cx="12" cy="8" r="4"/><path d="M4.5 21c.8-4.2 3.3-6.3 7.5-6.3s6.7 2.1 7.5 6.3"/>',
      docs:'<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v5h4M9 12h6m-6 4h6"/>'
    };
    return'<svg viewBox="0 0 24 24" aria-hidden="true">'+paths[name]+'</svg>';
  }

  var active=/dokumente/.test(page)?"docs":/analyse|abschluss|thema|rechner|profil|franchise|sealth|vorsorge|empfehlung|freizueg|pk-ausweis|versicherung/.test(page)?"analysis":"";
  var links=[
    ["home","Übersicht",url("dashboard.html")],
    ["analysis","Analyse",url("analyse.html",{step:3})],
    ["customer","Kunde",customerId==="local-demo"?url("dashboard.html"):url("kunde.html")],
    ["docs","Dokumente",url("dokumente.html")]
  ];
  var nav=document.createElement("aside");
  nav.className="ci-rail";
  nav.setAttribute("aria-label","Plattformnavigation");
  nav.innerHTML='<a class="ci-rail-logo" href="'+url("dashboard.html")+'" aria-label="combinvest Übersicht">C</a><nav class="ci-rail-nav">'+links.map(function(item){return'<a class="ci-rail-link '+(active===item[0]?"active":"")+'" href="'+item[2]+'">'+icon(item[0])+'<span>'+item[1]+'</span></a>';}).join("")+'</nav><span class="ci-rail-spacer"></span><span class="ci-rail-id" title="Kunden-ID">'+(customerId==="local-demo"?"Demo":customerId.slice(0,4).toUpperCase())+'</span>';
  document.body.classList.add("ci-shell-active");
  document.body.prepend(nav);

  function profile(){
    var value=crm.data?crm.data("profile",{}):{};
    return value&&typeof value==="object"?value:{};
  }
  function customerName(){
    var value=profile();
    var name=[value.firstName||value.first_name,value.lastName||value.last_name].filter(Boolean).join(" ").trim();
    return name||(customerId==="local-demo"?"Demo-Kunde":"Kunde "+customerId.slice(0,8));
  }
  function pageTitle(){
    var themeNames={investment:"Vermögen",pensiongap:"Vorsorge","property-creation":"Lebensstandard",health:"Gesundheit","real-estate":"Immobilien",children:"Kinder","values-protection":"Versicherungen","tax-advantage":"Steuern"};
    var names={
      "franchise.html":"Franchise-Vergleich","zusatzversicherung.html":"Zusatzversicherungen","versicherungsberatung.html":"Versicherungsübersicht","versicherungscheck.html":"Sach- und Motorfahrzeug",
      "vorsorgerechner.html":"Vorsorgelücke","rentenrechner.html":"AHV-Rente","immobilienrechner.html":"Tragbarkeit","budgetrechner.html":"Budget","vermoegensrechner.html":"Vermögensrechner",
      "anlegerprofil.html":"Anlegerprofil","pk-ausweis.html":"PK-Ausweis","freizuegigkeitskonto.html":"Freizügigkeitskonto","abschluss.html":"Analyseabschluss","dokumente.html":"Dokumente"
    };
    if(page==="thema.html")return themeNames[params.get("t")]||"Themenberatung";
    if(page==="analyse.html")return ["Profiling","Vertragscheck","Risikoanalyse"][Math.max(0,Math.min(2,Number(params.get("step")||1)-1))];
    return names[page]||"Kundenberatung";
  }
  function progressLabel(){
    if(page==="analyse.html")return"Schritt "+Math.max(1,Math.min(3,Number(params.get("step")||1)))+" von 3";
    if(analysisId)return"Risikoanalyse · "+pageTitle();
    return pageTitle();
  }

  var returnTarget=crm.backUrl?crm.backUrl("analyse.html?step=3"):url("analyse.html",{step:3});
  var explicitReturn=params.get("returnTo");
  document.querySelectorAll("a.back,a.back-link").forEach(function(anchor){
    anchor.classList.add("ci-unified-back");
    if(explicitReturn){
      var originalPage=new URL(anchor.getAttribute("href"),location.href).pathname.split("/").pop().toLowerCase();
      var returnPage=new URL(returnTarget,location.href).pathname.split("/").pop().toLowerCase();
      anchor.href=returnTarget;
      if(originalPage!==returnPage){anchor.textContent="← Zurück";anchor.setAttribute("aria-label","Zurück");}
    }
  });

  if(page!=="analyse.html"){
    var context=document.createElement("div");
    context.className="ci-context";
    context.setAttribute("aria-label","Aktueller Beratungskontext");
    context.innerHTML='<a class="ci-context-back" href="'+returnTarget+'" aria-label="Zurück">←</a><div class="ci-context-main"><small>Aktiver Kunde</small><b>'+customerName()+'</b><span>'+progressLabel()+'</span></div><a class="ci-context-analysis" href="'+url("analyse.html",{step:3})+'">Risikoanalyse</a><span class="ci-save">Gespeichert</span>';
    document.body.appendChild(context);
  }

  function normalizeBrand(){
    document.querySelectorAll("header .brand,.topbar .brand").forEach(function(element){
      if(element.classList.contains("ci-brand"))return;
      element.classList.add("ci-brand");
      element.innerHTML='<span class="ci-brand-mark" aria-hidden="true">C</span><span class="ci-brand-type"><b>comb</b><b>invest</b></span>';
    });
  }
  function declutter(){
    document.querySelectorAll(".footer-note,.notice,.demo,.intro").forEach(function(element){
      if(/frontend|backend|lokal beim kunden|folgt später|ohne externen versand|frontend-demo/i.test(element.textContent||""))element.classList.add("ci-implementation-note");
    });
    document.querySelectorAll(".hero p,.page-heading p").forEach(function(element){
      if(/frontend|backend|lokal beim kunden|folgt später/i.test(element.textContent||""))element.textContent="Erfassen Sie die benötigten Angaben. Vor dem Abschluss werden alle Informationen nochmals geprüft.";
    });
  }
  normalizeBrand();
  declutter();

  var saveState=document.querySelector(".ci-context .ci-save");
  var timer;
  function state(kind,text){
    if(!saveState)return;
    clearTimeout(timer);
    saveState.className="ci-save "+(kind||"");
    saveState.textContent=text;
    if(kind==="saving")timer=setTimeout(function(){state("","Gespeichert");},900);
  }
  if(crm.save){
    var originalSave=crm.save;
    crm.save=function(){
      state("saving","Wird gespeichert");
      var ok=originalSave.apply(crm,arguments);
      if(ok===false)state("error","Speichern fehlgeschlagen");
      else state("","Zuletzt gespeichert "+new Date().toLocaleTimeString("de-CH",{hour:"2-digit",minute:"2-digit"}));
      return ok;
    };
  }
})(window);
