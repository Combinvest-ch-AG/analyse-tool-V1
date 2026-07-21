(function(global){
  "use strict";

  var VERSION=1;
  var ACTIVE="combinvest.crm.activeCustomer.v1";
  var ACTIVE_ANALYSIS="combinvest.crm.activeAnalysis.v1";
  var PREFIX="combinvest.crm.customer.";
  var params=new URLSearchParams(location.search);
  var customerId=(params.get("customerId")||params.get("cid")||"").trim();
  var analysisId=(params.get("analysisId")||"").trim();

  if(!customerId){try{customerId=sessionStorage.getItem(ACTIVE)||"";}catch(e){}}
  if(!analysisId){try{analysisId=sessionStorage.getItem(ACTIVE_ANALYSIS)||"";}catch(e){}}
  if(!customerId)customerId="local-demo";

  function safeId(value){
    return String(value).replace(/[^a-zA-Z0-9_-]/g,"_").slice(0,80)||"local-demo";
  }
  customerId=safeId(customerId);
  analysisId=analysisId?safeId(analysisId):"";
  try{
    sessionStorage.setItem(ACTIVE,customerId);
    if(analysisId)sessionStorage.setItem(ACTIVE_ANALYSIS,analysisId);
  }catch(e){}

  function storageKey(module){return PREFIX+customerId+"."+safeId(module)+".v"+VERSION;}
  function load(module,fallback){
    try{var raw=localStorage.getItem(storageKey(module));return raw?JSON.parse(raw):fallback;}catch(e){return fallback;}
  }
  function save(module,data){
    var record={customerId:customerId,module:module,updatedAt:new Date().toISOString(),data:data};
    try{localStorage.setItem(storageKey(module),JSON.stringify(record));}catch(e){return false;}
    return true;
  }
  function data(module,fallback){var record=load(module,null);return record&&record.data!=null?record.data:fallback;}

  function url(target,extra){
    var result=new URL(target,location.href);
    if(result.origin!==location.origin)return target;
    result.searchParams.set("customerId",customerId);
    if(analysisId)result.searchParams.set("analysisId",analysisId);
    Object.keys(extra||{}).forEach(function(key){
      if(extra[key]===null||extra[key]===undefined||extra[key]==="")result.searchParams.delete(key);
      else result.searchParams.set(key,extra[key]);
    });
    return result.pathname.split("/").pop()+result.search+result.hash;
  }

  function safeReturnTarget(value,fallback){
    var raw=value||fallback||"analyse.html?step=3";
    try{
      var result=new URL(raw,location.href);
      if(result.origin!==location.origin||!/\.html$/i.test(result.pathname))throw new Error("invalid return target");
      return url(result.pathname.split("/").pop()+result.search+result.hash);
    }catch(e){return url("analyse.html",{step:3});}
  }
  function backUrl(fallback){return safeReturnTarget(params.get("returnTo"),fallback);}

  function normalizeInternalUrl(raw){
    if(!raw||raw[0]==="#"||/^(mailto:|tel:|javascript:)/i.test(raw))return null;
    try{
      var result=new URL(raw,location.href);
      if(result.origin!==location.origin||!/\.html$/i.test(result.pathname))return null;
      var page=result.pathname.split("/").pop().toLowerCase();
      if(analysisId&&page==="index.html"){
        result=new URL("analyse.html",location.href);
        result.searchParams.set("step","3");
      }
      result.searchParams.set("customerId",customerId);
      if(analysisId)result.searchParams.set("analysisId",analysisId);
      if(analysisId&&result.pathname.toLowerCase().endsWith("/analyse.html")&&!result.searchParams.has("step"))result.searchParams.set("step","3");
      return result.pathname.split("/").pop()+result.search+result.hash;
    }catch(e){return null;}
  }

  function propagateLinks(root){
    (root||document).querySelectorAll('a[href]').forEach(function(anchor){
      var target=normalizeInternalUrl(anchor.getAttribute("href"));
      if(target)anchor.setAttribute("href",target);
    });
  }

  function syncCurrentUrl(){
    var page=(location.pathname.split("/").pop()||"").toLowerCase();
    if(["index.html","login.html","dashboard.html"].indexOf(page)>=0)return;
    var current=new URL(location.href);
    var changed=false;
    if(!current.searchParams.has("customerId")){current.searchParams.set("customerId",customerId);changed=true;}
    if(analysisId&&!current.searchParams.has("analysisId")){current.searchParams.set("analysisId",analysisId);changed=true;}
    if(changed)history.replaceState(history.state,"",current.pathname.split("/").pop()+current.search+current.hash);
  }

  document.addEventListener("click",function(event){
    var anchor=event.target.closest&&event.target.closest("a[href]");
    if(!anchor||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    var target=normalizeInternalUrl(anchor.getAttribute("href"));
    if(target)anchor.setAttribute("href",target);
  },true);

  if("MutationObserver" in global){
    new MutationObserver(function(records){
      records.forEach(function(record){
        Array.from(record.addedNodes||[]).forEach(function(node){
          if(node.nodeType!==1)return;
          if(node.matches&&node.matches("a[href]")){
            var target=normalizeInternalUrl(node.getAttribute("href"));
            if(target)node.setAttribute("href",target);
          }
          if(node.querySelectorAll)propagateLinks(node);
        });
      });
    }).observe(document.documentElement,{childList:true,subtree:true});
  }

  global.CombinvestCRM={
    customerId:customerId,
    analysisId:analysisId,
    storageKey:storageKey,
    load:load,
    data:data,
    save:save,
    url:url,
    backUrl:backUrl,
    propagateLinks:propagateLinks
  };

  function loadShell(){
    if(!document.querySelector('script[data-combinvest-shell]')){
      var shell=document.createElement("script");shell.src="app-shell.js?v=10";shell.dataset.combinvestShell="true";document.body.appendChild(shell);
    }
    if(!document.querySelector('script[data-combinvest-forms]')){
      var forms=document.createElement("script");forms.src="form-experience.js?v=7";forms.dataset.combinvestForms="true";document.body.appendChild(forms);
    }
  }
  function ready(){syncCurrentUrl();propagateLinks();loadShell();}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",ready);else ready();
})(window);
