(function(global){
  "use strict";
  var DB_KEY="combinvest.advisorPlatform.v1";
  var SESSION_KEY="combinvest.advisorSession.v1";
  var DEMO_PASSWORD="Combinvest2026!";

  function id(prefix){return prefix+"-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,8);}
  function now(){return new Date().toISOString();}
  function directory(){return(global.CombinvestAdvisors||[]).map(function(a){return Object.assign({},a,{password:DEMO_PASSWORD});});}
  function syncAdvisors(db){
    var list=directory();if(!list.length)return db;
    var oldDemo=db.advisors.find(function(a){return a.id==="advisor-demo";});
    db.advisors=list;
    if(oldDemo){
      db.customers.forEach(function(c){if(c.advisorId==="advisor-demo")c.advisorId="advisor-alper-ermis";});
      db.analyses.forEach(function(a){if(a.advisorId==="advisor-demo")a.advisorId="advisor-alper-ermis";});
      db.appointments.forEach(function(a){if(a.advisorId==="advisor-demo")a.advisorId="advisor-alper-ermis";});
    }
    return db;
  }
  function read(){
    try{var db=JSON.parse(localStorage.getItem(DB_KEY)||"null")||seed();return syncAdvisors(db);}catch(e){return seed();}
  }
  function write(db){localStorage.setItem(DB_KEY,JSON.stringify(db));return db;}
  function seed(){
    var db={version:1,advisors:[],customers:[],analyses:[],appointments:[]};
    var advisor=directory().find(function(a){return a.id==="advisor-alper-ermis";})||{id:"advisor-alper-ermis",firstName:"Alper Yusuf",lastName:"Ermis",email:"alper.ermis@combinvest.swiss",password:DEMO_PASSWORD,role:"Aussendienst"};
    db.advisors=directory().length?directory():[advisor];
    db.customers.push(
      {id:"customer-demo-1",advisorId:advisor.id,firstName:"Laura",lastName:"Muster",birthdate:"1988-04-12",email:"laura.muster@example.ch",phone:"+41 79 000 00 01",postcode:"3000",city:"Bern",createdAt:now()},
      {id:"customer-demo-2",advisorId:advisor.id,firstName:"Marco",lastName:"Beispiel",birthdate:"1976-09-03",email:"marco.beispiel@example.ch",phone:"+41 79 000 00 02",postcode:"8000",city:"Zürich",createdAt:now()}
    );
    db.appointments.push(
      {id:"appointment-demo-1",advisorId:advisor.id,customerId:"customer-demo-1",startsAt:new Date(Date.now()+86400000).toISOString(),title:"Datenerhebung",status:"geplant"},
      {id:"appointment-demo-2",advisorId:advisor.id,customerId:"customer-demo-2",startsAt:new Date(Date.now()+3*86400000).toISOString(),title:"Beratungsgespräch",status:"geplant"}
    );
    return write(db);
  }
  function publicAdvisor(a){if(!a)return null;var copy=Object.assign({},a);delete copy.password;return copy;}
  function session(){try{return JSON.parse(sessionStorage.getItem(SESSION_KEY)||"null");}catch(e){return null;}}
  function currentAdvisor(){
    var s=session(),db=read();
    return publicAdvisor(s&&db.advisors.find(function(a){return a.id===s.advisorId;}));
  }
  function login(email,password){
    var db=read(),normalized=String(email||"").trim().toLowerCase();
    var advisor=db.advisors.find(function(a){return a.email.toLowerCase()===normalized&&a.password===password;});
    if(!advisor)return null;
    sessionStorage.setItem(SESSION_KEY,JSON.stringify({advisorId:advisor.id,createdAt:now()}));
    return publicAdvisor(advisor);
  }
  function logout(){sessionStorage.removeItem(SESSION_KEY);}
  function requireAuth(){if(!currentAdvisor()){location.href="login.html?returnTo="+encodeURIComponent(location.pathname.split("/").pop()+location.search);return false;}return true;}
  function customers(){
    var a=currentAdvisor(),db=read();
    return a?db.customers.filter(function(c){return c.advisorId===a.id;}):[];
  }
  function customer(customerId){
    var a=currentAdvisor(),db=read();
    return a?db.customers.find(function(c){return c.id===customerId&&c.advisorId===a.id;})||null:null;
  }
  function saveCustomer(input){
    var a=currentAdvisor();if(!a)throw new Error("Nicht angemeldet.");
    var db=read(),record={
      id:input.id||id("customer"),advisorId:a.id,firstName:String(input.firstName||"").trim(),
      lastName:String(input.lastName||"").trim(),birthdate:input.birthdate||"",email:String(input.email||"").trim(),
      phone:String(input.phone||"").trim(),postcode:String(input.postcode||"").trim(),city:String(input.city||"").trim(),
      createdAt:input.createdAt||now(),updatedAt:now()
    };
    var index=db.customers.findIndex(function(c){return c.id===record.id&&c.advisorId===a.id;});
    if(index>=0)db.customers[index]=Object.assign({},db.customers[index],record);else db.customers.push(record);
    write(db);return record;
  }
  function analyses(){
    var a=currentAdvisor(),db=read();
    return a?db.analyses.filter(function(x){return x.advisorId===a.id;}):[];
  }
  function analysisForCustomer(customerId){return analyses().filter(function(x){return x.customerId===customerId;}).sort(function(a,b){return b.updatedAt.localeCompare(a.updatedAt);});}
  function touchAnalysis(customerId,data){
    var a=currentAdvisor();if(!a)return null;
    var db=read(),record=data.analysisId&&db.analyses.find(function(x){return x.id===data.analysisId&&x.customerId===customerId&&x.advisorId===a.id;});
    if(!record)record=db.analyses.find(function(x){return x.customerId===customerId&&x.advisorId===a.id&&x.status!=="abgeschlossen";});
    if(!record){record={id:id("analysis"),advisorId:a.id,customerId:customerId,createdAt:now(),status:"offen"};db.analyses.push(record);}
    record.step=Number(data.step)||1;record.question=Number(data.question)||0;record.progress=Math.min(100,Math.round(((record.step-1)*19+record.question+1)/57*100));
    record.status=data.completed?"abgeschlossen":"offen";record.updatedAt=now();
    write(db);return record;
  }
  function startAnalysis(customerId){
    var a=currentAdvisor();if(!a)throw new Error("Nicht angemeldet.");
    var db=read(),record={id:id("analysis"),advisorId:a.id,customerId:customerId,createdAt:now(),updatedAt:now(),status:"offen",step:1,question:0,progress:0};
    db.analyses.push(record);write(db);return record;
  }
  function appointments(){
    var a=currentAdvisor(),db=read();
    return a?db.appointments.filter(function(x){return x.advisorId===a.id;}).sort(function(x,y){return x.startsAt.localeCompare(y.startsAt);}):[];
  }
  function exportData(){return read();}
  function advisorDirectory(){return read().advisors.map(publicAdvisor);}

  global.CombinvestAdvisor={
    login:login,logout:logout,currentAdvisor:currentAdvisor,requireAuth:requireAuth,
    customers:customers,customer:customer,saveCustomer:saveCustomer,
    analyses:analyses,analysisForCustomer:analysisForCustomer,touchAnalysis:touchAnalysis,startAnalysis:startAnalysis,
    appointments:appointments,exportData:exportData,advisorDirectory:advisorDirectory
  };
})(window);
