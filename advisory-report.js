(function(global){
  "use strict";

  var BLUE=[.247,.486,.953],NAVY=[.067,.125,.239],MUTED=[.39,.46,.57],LINE=[.86,.90,.95],SOFT=[.957,.972,.992],PALE=[.925,.953,1],GREEN=[.09,.52,.35],ORANGE=[.96,.56,.25],RED=[.83,.25,.29],WHITE=[1,1,1];
  var PAGE=[595.28,841.89],M=48,CONTENT=PAGE[0]-M*2;
  var AREA_COPY={
    health:"Prämien, Franchise und gewünschte Zusatzdeckungen aufeinander abstimmen.",
    pensiongap:"Leistungen bei Invalidität, Pensionierung und Tod mit dem Zielbedarf vergleichen.",
    investment:"Liquiditätsreserve, Anlagehorizont und passendes Risikoprofil strukturieren.",
    "real-estate":"Eigenkapital, Tragbarkeit und langfristige Finanzierung nachvollziehbar prüfen.",
    "values-protection":"Bestehende Policen auf Lücken, Doppelversicherungen und Abläufe kontrollieren.",
    children:"Versorgung und langfristigen Vermögensaufbau für Kinder absichern.",
    "property-creation":"Einkommensausfall und notwendigen Lebensstandard gegenüberstellen.",
    "tax-advantage":"Steuerpotenzial bei Vorsorge, Vermögen und Wohneigentum gezielt nutzen."
  };
  var ANSWER_GROUPS=[
    ["Person und Haushalt",["geschlecht","alter","zivilstand","kinder","abhaengige","wohnen","plz"]],
    ["Beruf und Finanzen",["ausbildung","erwerb","brutto","fixkosten"]],
    ["Gesundheit und Alltag",["sport","rauchen","motorfahrzeug","haustiere","kk_prio"]],
    ["Ziele und Prioritäten",["zukunft","ziele","konfession"]]
  ];

  function safe(value){return String(value==null?"":value).replace(/[–—−]/g,"-").replace(/[’‘]/g,"'").replace(/[“”]/g,'"').replace(/→/g,">").replace(/✓/g,"OK").replace(/•/g,"-").replace(/[^\x20-\x7E\u00A0-\u00FF]/g," ").replace(/\s+/g," ").trim();}
  function chf(value){return "CHF "+Math.round(Number(value)||0).toLocaleString("de-CH");}
  function date(value){var d=value?new Date(value):new Date();return Number.isNaN(d.valueOf())?safe(value):d.toLocaleDateString("de-CH",{day:"2-digit",month:"2-digit",year:"numeric"});}
  function annualPremium(contract){var n=Number(contract.premium)||0,m={monthly:12,quarterly:4,semiannual:2,annual:1,oneoff:0};return n*(m[contract.interval]??12);}
  function sumValues(obj){return Object.keys(obj||{}).reduce(function(total,key){return total+(Number(obj[key])||0);},0);}

  async function build(data){
    if(!global.PDFLib)throw new Error("PDF-Bibliothek nicht verfügbar.");
    var PDFDocument=PDFLib.PDFDocument,rgb=PDFLib.rgb,StandardFonts=PDFLib.StandardFonts;
    var doc=await PDFDocument.create(),regular=await doc.embedFont(StandardFonts.Helvetica),bold=await doc.embedFont(StandardFonts.HelveticaBold);
    doc.setTitle("Combinvest Beratungsbericht - "+safe(data.customerName));doc.setAuthor("Combinvest AG");doc.setSubject("Zusammenfassung der Finanz- und Risikoanalyse");doc.setCreator("Combinvest Beratungsplattform");doc.setCreationDate(new Date());
    var pages=[],ctx={doc:doc,regular:regular,bold:bold,page:null,y:0,section:""};
    function color(c){return rgb(c[0],c[1],c[2]);}
    function rect(x,y,w,h,fill,border,width){ctx.page.drawRectangle({x:x,y:y,width:w,height:h,color:fill?color(fill):undefined,borderColor:border?color(border):undefined,borderWidth:width||0});}
    function line(x1,y1,x2,y2,c,w){ctx.page.drawLine({start:{x:x1,y:y1},end:{x:x2,y:y2},color:color(c||LINE),thickness:w||1});}
    function width(text,font,size){return font.widthOfTextAtSize(safe(text),size);}
    function wrap(text,font,size,maxWidth){var words=safe(text).split(" "),lines=[],current="";words.forEach(function(word){var next=current?current+" "+word:word;if(width(next,font,size)<=maxWidth||!current)current=next;else{lines.push(current);current=word;}});if(current)lines.push(current);return lines.length?lines:[""];}
    function drawText(text,x,y,opts){opts=opts||{};ctx.page.drawText(safe(text),{x:x,y:y,size:opts.size||10,font:opts.bold?bold:regular,color:color(opts.color||NAVY),maxWidth:opts.maxWidth});}
    function paragraph(text,x,y,maxWidth,opts){opts=opts||{};var size=opts.size||10,leading=opts.leading||size*1.45,lines=wrap(text,opts.bold?bold:regular,size,maxWidth);lines.forEach(function(value,index){drawText(value,x,y-index*leading,{size:size,bold:opts.bold,color:opts.color});});return y-lines.length*leading;}
    function brand(page,y,dark){page.drawText("comb",{x:M,y:y,size:15,font:bold,color:color(dark?WHITE:NAVY)});page.drawText("invest",{x:M+37,y:y,size:15,font:bold,color:color(dark?WHITE:BLUE)});}
    function addPage(section,title,intro){ctx.page=doc.addPage(PAGE);pages.push(ctx.page);ctx.section=section||"BERATUNGSBERICHT";brand(ctx.page,803,false);drawText(ctx.section.toUpperCase(),PAGE[0]-M-180,806,{size:7,bold:true,color:BLUE});line(M,789,PAGE[0]-M,789,LINE,1);ctx.y=754;if(title){drawText(title,M,ctx.y,{size:25,bold:true});ctx.y-=34;}if(intro){ctx.y=paragraph(intro,M,ctx.y,CONTENT,{size:10,color:MUTED,leading:15})-15;}return ctx.page;}
    function ensure(height,title){if(ctx.y-height<58)addPage(ctx.section,title||"Fortsetzung");}
    function sectionTitle(kicker,title,desc){ensure(72);drawText(kicker.toUpperCase(),M,ctx.y,{size:7,bold:true,color:BLUE});ctx.y-=18;drawText(title,M,ctx.y,{size:18,bold:true});ctx.y-=19;if(desc)ctx.y=paragraph(desc,M,ctx.y,CONTENT,{size:9,color:MUTED,leading:13})-10;}
    function miniCard(x,y,w,h,label,value,sub,accent){rect(x,y-h,w,h,accent||SOFT,accent?accent:LINE,accent?0:1);drawText(label.toUpperCase(),x+13,y-18,{size:6.5,bold:true,color:accent?WHITE:MUTED});drawText(value,x+13,y-42,{size:18,bold:true,color:accent?WHITE:NAVY});if(sub)paragraph(sub,x+13,y-58,w-26,{size:7.5,color:accent?WHITE:MUTED,leading:10});}
    function statusLabel(status){return status==="done"?"Abgeschlossen":status==="progress"?"In Bearbeitung":"Offen";}
    function statusColor(status){return status==="done"?GREEN:status==="progress"?ORANGE:MUTED;}

    // Cover
    ctx.page=doc.addPage(PAGE);pages.push(ctx.page);rect(0,0,PAGE[0],PAGE[1],NAVY);rect(0,0,20,PAGE[1],BLUE);rect(360,0,235,PAGE[1],BLUE);rect(390,610,170,170,PALE);rect(420,640,110,110,WHITE);brand(ctx.page,785,true);drawText("PERSÖNLICHE FINANZ- UND RISIKOANALYSE",M,690,{size:8,bold:true,color:WHITE});paragraph("Klarheit für Ihre nächsten finanziellen Entscheidungen.",M,645,285,{size:29,bold:true,color:WHITE,leading:35});line(M,495,320,495,WHITE,1);drawText(safe(data.customerName)||"Kundin / Kunde",M,462,{size:18,bold:true,color:WHITE});drawText("Beratung vom "+date(data.createdAt),M,438,{size:10,color:[.82,.88,.98]});drawText("Vertraulich",M,76,{size:8,bold:true,color:[.82,.88,.98]});drawText("Analyse-ID "+safe(data.analysisId).slice(0,24),M,58,{size:7,color:[.72,.8,.93]});drawText("combinvest",402,699,{size:17,bold:true,color:BLUE});drawText("BERATUNGSBERICHT",401,673,{size:7,bold:true,color:NAVY});

    // Executive summary
    addPage("01 / Überblick","Ihre Beratung auf einen Blick","Die wichtigsten Erkenntnisse, Prioritäten und nächsten Schritte für Kunde und Innendienst.");
    var ranked=(data.areas||[]).slice().sort(function(a,b){return b.score-a.score;}),done=ranked.filter(function(a){return a.status==="done";}).length;
    miniCard(M,ctx.y,155,82,"Profiling",(data.answerCount||0)+" / "+(data.questionCount||19),"Fragen beantwortet");miniCard(M+172,ctx.y,155,82,"Themen",done+" / "+ranked.length,"Bereiche abgeschlossen");miniCard(M+344,ctx.y,155,82,"Verträge",String(Object.keys(data.contracts||{}).length),"Bestehende Produkte");ctx.y-=108;
    sectionTitle("Höchste Relevanz","Drei zentrale Beratungsfelder","Diese Rangfolge basiert auf den Antworten im Financial Profiling.");
    ranked.slice(0,3).forEach(function(item,index){ensure(66);rect(M,ctx.y-52,CONTENT,52,index===0?PALE:SOFT,index===0?BLUE:LINE,1);drawText(String(index+1),M+14,ctx.y-31,{size:17,bold:true,color:index===0?BLUE:MUTED});drawText(item.name,M+48,ctx.y-20,{size:11,bold:true});drawText(AREA_COPY[item.key]||"Persönlichen Handlungsbedarf prüfen.",M+48,ctx.y-37,{size:7.5,color:MUTED});drawText(item.score+" / 5",PAGE[0]-M-67,ctx.y-24,{size:12,bold:true,color:statusColor(item.status)});drawText(statusLabel(item.status),PAGE[0]-M-86,ctx.y-40,{size:6.5,color:MUTED});ctx.y-=62;});
    ctx.y-=10;sectionTitle("Beratungskontext","Kunde und Beratung","Die Angaben dienen der eindeutigen Zuordnung und internen Weiterbearbeitung.");
    var customer=data.customer||{},advisor=data.advisor||{};var infoRows=[["Kunde",data.customerName],["Geburtsdatum",date(customer.birthdate)],["Kontakt",[customer.email,customer.phone].filter(Boolean).join(" · ")||"Nicht erfasst"],["Wohnort",[customer.postcode,customer.city].filter(Boolean).join(" ")||"Nicht erfasst"],["Kundenberater",advisor.display_name||[advisor.first_name,advisor.last_name].filter(Boolean).join(" ")||"Nicht erfasst"],["Beraterkontakt",advisor.email||"Nicht erfasst"]];
    infoRows.forEach(function(row,index){var y=ctx.y-index*25;drawText(row[0],M,y,{size:7,bold:true,color:MUTED});drawText(row[1],M+126,y,{size:9,bold:index===0});line(M,y-9,PAGE[0]-M,y-9,LINE,.7);});ctx.y-=infoRows.length*25+8;

    // Profile
    addPage("02 / Financial Profiling","Persönliche Ausgangslage","Die Antworten wurden thematisch gebündelt, damit die Ausgangslage schnell nachvollziehbar bleibt.");
    var answerMap={};(data.answers||[]).forEach(function(item){answerMap[item.id]=item;});
    ANSWER_GROUPS.forEach(function(group){ensure(55+group[1].length*24,group[0]);drawText(group[0],M,ctx.y,{size:13,bold:true});ctx.y-=15;group[1].forEach(function(id){var item=answerMap[id];if(!item)return;drawText(item.question,M,ctx.y,{size:7.5,color:MUTED,maxWidth:245});var lines=wrap(item.answer||"Nicht beantwortet",bold,8.2,230);lines.slice(0,2).forEach(function(t,i){drawText(t,M+268,ctx.y-i*10,{size:8.2,bold:true});});ctx.y-=Math.max(24,lines.length*10+8);line(M,ctx.y+7,PAGE[0]-M,ctx.y+7,LINE,.6);});ctx.y-=15;});

    // Risk profile
    addPage("03 / Risikoanalyse","Relevanz und Bearbeitungsstand","Die Skala zeigt den relativen Beratungsbedarf von 1 (tief) bis 5 (sehr hoch). Sie ist keine Produktbewertung.");
    ranked.forEach(function(item,index){ensure(72);var y=ctx.y;drawText(String(index+1).padStart(2,"0"),M,y,{size:8,bold:true,color:MUTED});drawText(item.name,M+30,y,{size:11,bold:true});drawText(statusLabel(item.status),PAGE[0]-M-95,y,{size:7,bold:true,color:statusColor(item.status)});var barX=M+30,barY=y-24,barW=235;rect(barX,barY,barW,8,LINE);rect(barX,barY,barW*Math.max(0,Math.min(5,item.score))/5,8,item.score>=4?BLUE:item.score===3?ORANGE:MUTED);drawText(item.score+" / 5",barX+barW+12,barY,{size:8,bold:true});paragraph(AREA_COPY[item.key]||"Persönlichen Handlungsbedarf prüfen.",M+30,y-42,CONTENT-30,{size:7.5,color:MUTED,leading:10});ctx.y-=70;});

    // Contracts
    addPage("04 / Vertragscheck","Bestehende Verträge","Erfasste Produkte als Arbeitsgrundlage für Prüfung, Rückfragen und allfällige Offerten.");
    var contractKeys=Object.keys(data.contracts||{}),annualTotal=contractKeys.reduce(function(sum,key){return sum+annualPremium(data.contracts[key]||{});},0);
    miniCard(M,ctx.y,240,75,"Erfasste Produkte",String(contractKeys.length),"Vertragspositionen");miniCard(M+258,ctx.y,241,75,"Prämienvolumen",chf(annualTotal),"Hochrechnung pro Jahr");ctx.y-=100;
    if(!contractKeys.length){paragraph("Im Vertragscheck wurden noch keine bestehenden Produkte erfasst.",M,ctx.y,CONTENT,{size:10,color:MUTED});ctx.y-=30;}else{
      [["Produkt",0],["Gesellschaft",140],["Prämie",310],["Ablauf",407]].forEach(function(h){drawText(h[0],M+h[1],ctx.y,{size:7,bold:true,color:MUTED});});ctx.y-=15;line(M,ctx.y,PAGE[0]-M,ctx.y,LINE,1);ctx.y-=15;
      contractKeys.forEach(function(key){ensure(44,"Bestehende Verträge");var c=data.contracts[key]||{};drawText(key,M,ctx.y,{size:8.5,bold:true,maxWidth:130});drawText(c.company||"Nicht erfasst",M+140,ctx.y,{size:8,maxWidth:155});drawText(c.premium!=null?chf(c.premium)+" / "+({monthly:"Monat",quarterly:"Quartal",semiannual:"Halbjahr",annual:"Jahr",oneoff:"einmalig"}[c.interval]||"Monat"):"-",M+310,ctx.y,{size:7.5});drawText(c.abl||"-",M+407,ctx.y,{size:8});if(c.pol)drawText("Police "+c.pol,M,ctx.y-14,{size:6.5,color:MUTED});if(c.notes)drawText(c.notes,M+140,ctx.y-14,{size:6.5,color:MUTED,maxWidth:260});ctx.y-=35;line(M,ctx.y+9,PAGE[0]-M,ctx.y+9,LINE,.6);});
    }

    // Calculators
    addPage("05 / Berechnungen","Ergebnisse aus der Beratung","Nur tatsächlich gespeicherte Rechner und Bedarfschecks werden in diesem Abschnitt dokumentiert.");
    var modules=data.modules||{},hasModule=false;
    function resultBlock(title,source,metrics,description){hasModule=true;ensure(105,title);drawText(title,M,ctx.y,{size:13,bold:true});drawText(source,M,ctx.y-14,{size:6.5,color:MUTED});ctx.y-=30;var count=Math.min(3,metrics.length),w=(CONTENT-(count-1)*8)/Math.max(1,count);metrics.slice(0,3).forEach(function(metric,index){miniCard(M+index*(w+8),ctx.y,w,62,metric[0],metric[1],metric[2]||"");});ctx.y-=74;if(description){ctx.y=paragraph(description,M,ctx.y,CONTENT,{size:8,color:MUTED,leading:12})-14;}}
    if(modules.franchise&&modules.franchise.recommendation){var fr=modules.franchise.recommendation;resultBlock("Franchise-Vergleich","BAG / Priminfo 2026",[["Empfehlung",chf(fr.franchise),"Franchise"],["Monatsprämie",chf(fr.monthlyPremium),"gewählter Tarif"],["Jahrestotal",chf(fr.annualTotal),"inkl. Kostenbeteiligung"]],"Szenarioberechnung mit den erfassten Gesundheitskosten. Spitalbeitrag, Prämienverbilligung und gesetzliche Sonderfälle sind nicht eingerechnet.");}
    if(modules.pension&&modules.pension.values){var risk=modules.pension.risk||"iv",vals=modules.pension.values[risk]||{},target=(Number(modules.pension.salary)||0)*(Number(modules.pension.targetPct)||0)/100,total=sumValues(vals),gap=Math.max(0,target-total);resultBlock("Vorsorgelückenanalyse","Erfasste AHV/IV-, BVG-, UVG- und private Leistungen",[["Zielbedarf",chf(target),"pro Jahr"],["Leistungen",chf(total),"pro Jahr"],["Verbleibende Lücke",chf(gap),"pro Jahr"]],"Fall: "+({iv:"Invalidität",retirement:"Pensionierung",death:"Todesfall"}[risk]||risk)+". Verbindlich sind die Entscheide und Ausweise der zuständigen Einrichtungen.");}
    if(modules.budget&&Array.isArray(modules.budget.income)){var inc=modules.budget.income.reduce(function(s,x){return s+(Number(x.amount)||0);},0),exp=(modules.budget.cats||[]).reduce(function(s,c){return s+(c.subs||[]).reduce(function(a,x){return a+(Number(x.amount)||0);},0);},0),bal=inc-exp;resultBlock("Budget","Monatliche Einnahmen und Ausgaben",[["Einnahmen",chf(inc),"pro Monat"],["Ausgaben",chf(exp),"pro Monat"],["Überschuss",chf(bal),"pro Monat"]],"Der freie Betrag dient als Grundlage für Reserve, Sparziele und weitere Empfehlungen.");}
    if(modules.supplementary&&modules.supplementary.selected&&modules.supplementary.selected.length){resultBlock("Zusatzversicherungs-Bedarf","Persönliche Auswahl des Kunden",[["Auswahl",String(modules.supplementary.selected.length),"Leistungsbereiche"],["Spital",modules.supplementary.hospital?"Gewünscht":"Nicht gewählt",modules.supplementary.hospitalLevel||""],["Ambulant",String(modules.supplementary.selected.length-(modules.supplementary.hospital?1:0)),"Ergänzungen"]],"Gewählt: "+modules.supplementary.selected.join(", ")+". Leistungen, Limiten, Wartefristen und Aufnahmebedingungen sind produktbezogen zu prüfen.");}
    if(modules.insurance&&modules.insurance.selected&&modules.insurance.selected.length){var ins=modules.insurance;resultBlock("Sach- und Motorfahrzeug-Bedarf","Persönliche Auswahl des Kunden",[["Auswahl",String(ins.selected.length),"Deckungen"],["Hausrat",ins.household&&ins.household.enabled?"Gewünscht":"Nicht gewählt",ins.household&&ins.household.covers?String(ins.household.covers.length)+" Bausteine":""],["Motorfahrzeug",ins.motor&&ins.motor.enabled?"Gewünscht":"Nicht gewählt",ins.motor&&ins.motor.covers?String(ins.motor.covers.length)+" Bausteine":""]],"Gewählt: "+ins.selected.join(", ")+". Der definitive Umfang richtet sich nach Police, Allgemeinen Versicherungsbedingungen, Limiten und Ausschlüssen.");}
    if(modules.sealth&&(modules.sealth.selectedPackage||modules.sealth.recommendation)){var pack=modules.sealth.selectedPackage||modules.sealth.recommendation;resultBlock("Sealth-Bedarfscheck","Self · Health · Wealth",[["Auswahl",String(pack).replace(/^./,function(c){return c.toUpperCase();}),"Service-Paket"],["Preis",chf(modules.sealth.annualPrice),"pro Jahr"],["Potenzial",chf(modules.sealth.scenario&&modules.sealth.scenario.potentialNet),"Kundenszenario"]],"Die finanzielle Darstellung basiert auf den erfassten ersetzbaren Ausgaben und stellt keine garantierte Rückerstattung dar.");}
    Object.keys(modules.calculators||{}).slice(0,4).forEach(function(key){var c=modules.calculators[key];if(!c||!Array.isArray(c.results)||!c.results.length)return;resultBlock("Rechner: "+key,"Stand "+(c.calculationYear||2026),c.results.slice(0,3).map(function(value,index){return["Ergebnis "+(index+1),safe(value).slice(0,42),""];}),c.source||"");});
    if(!hasModule){paragraph("Es wurden noch keine Rechnerresultate ausdrücklich in diese Analyse übernommen.",M,ctx.y,CONTENT,{size:10,color:MUTED});}

    // Recommendations
    addPage("06 / Empfehlungen","Empfehlungen und nächste Schritte","Der Bericht trennt zwischen abgeschlossenen, laufenden und offenen Beratungsthemen.");
    ranked.forEach(function(item,index){ensure(61);var st=item.status||"open",c=statusColor(st);rect(M,ctx.y-49,5,49,c);drawText(item.name,M+17,ctx.y-16,{size:10,bold:true});drawText(statusLabel(st),PAGE[0]-M-91,ctx.y-16,{size:7,bold:true,color:c});paragraph(AREA_COPY[item.key]||"Persönlichen Handlungsbedarf prüfen.",M+17,ctx.y-32,CONTENT-17,{size:7.5,color:MUTED,leading:10});ctx.y-=59;});
    if(modules.supplementary&&modules.supplementary.selected&&modules.supplementary.selected.length){ctx.y-=7;sectionTitle("Gesundheit","Gewünschte Zusatzdeckungen");ctx.y=paragraph(modules.supplementary.selected.join(" · "),M,ctx.y,CONTENT,{size:9,bold:true,leading:13})-15;}

    // Handover
    addPage("07 / Innendienst","Übergabe und Vollständigkeitskontrolle","Kompakte Arbeitsgrundlage für Nachbearbeitung, Dokumentation und Folgetermin.");
    var checklist=[
      ["Kundendaten und Identität",data.customerName?"Vorhanden":"Prüfen"],
      ["Financial Profiling",(data.answerCount||0)===(data.questionCount||19)?"Vollständig":"Unvollständig"],
      ["Vertragscheck",contractKeys.length?contractKeys.length+" Produkte":"Keine Verträge erfasst"],
      ["Risikoanalyse",done+" von "+ranked.length+" Themen abgeschlossen"],
      ["Rechnerresultate",hasModule?"Im Bericht enthalten":"Keine übernommen"],
      ["Beratungsdokumente",modules.documents&&modules.documents.status?modules.documents.status:"Separat prüfen"],
      ["Nächster Termin",modules.appointment&&modules.appointment.date?date(modules.appointment.date)+" "+(modules.appointment.time||""):"Noch nicht erfasst"]
    ];
    checklist.forEach(function(item,index){var y=ctx.y-index*38,ok=/Vorhanden|Vollständig|enthalten|abgeschlossen|Produkte/.test(item[1]);rect(M,y-25,24,24,ok?GREEN:SOFT,ok?GREEN:LINE,1);drawText(ok?"OK":"!",M+(ok?5:9),y-18,{size:8,bold:true,color:ok?WHITE:ORANGE});drawText(item[0],M+38,y-9,{size:9,bold:true});drawText(item[1],M+250,y-9,{size:8,color:ok?GREEN:MUTED});line(M+38,y-25,PAGE[0]-M,y-25,LINE,.6);});ctx.y-=checklist.length*38+12;
    sectionTitle("Notizen","Beratungsnotizen");var noteText=(data.notes||[]).map(function(n){return typeof n==="string"?n:(n.text||n.note||"");}).filter(Boolean).join("\n");if(!noteText)noteText="Keine zusätzlichen Beratungsnotizen erfasst.";noteText.split(/\n+/).slice(0,10).forEach(function(note){ensure(28);drawText("-",M,ctx.y,{size:9,bold:true,color:BLUE});ctx.y=paragraph(note,M+15,ctx.y,CONTENT-15,{size:8.5,color:MUTED,leading:12})-6;});

    // Methodology
    addPage("08 / Dokumentation","Hinweise und Berechnungsgrundlagen","Transparenz zu Datenstand, Aussagekraft und weiterer Verwendung dieses Berichts.");
    var legal=[
      ["Zweck des Berichts","Dieser Bericht fasst die im Beratungsgespräch erfassten Angaben, Prioritäten, Verträge und ausgewählten Rechnerresultate zusammen. Er unterstützt Kunde, Berater und Innendienst bei der Nachbearbeitung."],
      ["Datenqualität","Die Resultate hängen von der Vollständigkeit und Richtigkeit der Kundendaten sowie von vorhandenen Originalunterlagen ab. Schätzungen und automatisch berechnete Werte sind als solche im jeweiligen Rechner kenntlich gemacht."],
      ["Versicherungen und Vorsorge","Verbindlich sind Policen, Versicherungsbedingungen, Vorsorgeausweise sowie Entscheide der zuständigen Versicherer, Vorsorgeeinrichtungen und Behörden."],
      ["Keine Produktzusage","Empfehlungen in diesem Bericht sind Beratungs- und Prüfaufträge. Eine Annahme, Leistung, Prämie oder Rendite ist erst nach Prüfung und Bestätigung durch den jeweiligen Anbieter verbindlich."],
      ["Vertraulichkeit","Das Dokument enthält Personendaten und ist vertraulich zu behandeln. Die Zustellung an Dritte erfolgt nur im Rahmen des Beratungsauftrags und der anwendbaren Datenschutzvorgaben."]
    ];
    legal.forEach(function(item){ensure(95);drawText(item[0],M,ctx.y,{size:11,bold:true});ctx.y=paragraph(item[1],M,ctx.y-18,CONTENT,{size:8.5,color:MUTED,leading:13})-18;});
    drawText("Erstellt mit der Combinvest Beratungsplattform · Datenstand 2026",M,70,{size:7,bold:true,color:BLUE});

    // Footers
    pages.forEach(function(page,index){if(index===0)return;line(M,38,PAGE[0]-M,38,LINE,.7);page.drawText("COMBINVEST · VERTRAULICH",{x:M,y:22,size:6,font:bold,color:color(MUTED)});var pageText=(index)+" / "+(pages.length-1);page.drawText(pageText,{x:PAGE[0]-M-width(pageText,bold,6),y:22,size:6,font:bold,color:color(MUTED)});});
    return doc.save({useObjectStreams:true});
  }

  async function download(data){var bytes=await build(data),blob=new Blob([bytes],{type:"application/pdf"}),url=URL.createObjectURL(blob),a=document.createElement("a"),name=safe(data.customerName||"Kunde").replace(/[^a-zA-Z0-9äöüÄÖÜéèàç -]/g,"").replace(/\s+/g,"-");a.href=url;a.download="Combinvest-Beratungsbericht-"+(name||"Kunde")+"-"+new Date().toISOString().slice(0,10)+".pdf";document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url);},30000);if(global.CombinvestCRM)CombinvestCRM.save("analysis-report",{fileName:a.download,createdAt:new Date().toISOString(),analysisId:data.analysisId,pageType:"customer-and-backoffice"});return bytes;}
  global.CombinvestReport={build:build,download:download};
})(window);
