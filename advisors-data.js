(function(global){
  "use strict";
  var rows=[
    ["Alina","Moser","alina.moser@combinvest.swiss","F01535031","0794200097","Zürich / Schlieren","Aussendienst","Versicherungsvermittler/-in VBV"],
    ["Alper Yusuf","Ermis","alper.ermis@combinvest.swiss","F01521272","0786987494","Ostermundigen","Aussendienst","Dipl. Finanzberater/in IAF"],
    ["Amine","Biedermann","amine.biedermann@combinvest.swiss","F01461227","0799648253","Egerkingen","Aussendienst","Dipl. Finanzberater/in IAF"],
    ["Andy","Straubhaar","andy.straubhaar@combinvest.swiss","F01506590","0791353242","Ostermundigen","Aussendienst","Versicherungsvermittler/-in VBV"],
    ["Ilijaz","Alijagic","ilijaz.alijagic@combinvest.swiss","F01493999","0763897571","Zürich / Schlieren","Aussendienst","Versicherungsvermittler/-in VBV"],
    ["Dario","Ammann","dario.ammann@combinvest.swiss","F01571396","0797402613","Zürich / Schlieren","Aussendienst","Versicherungsvermittler/-in VBV"],
    ["Boris","Vujtovic","boris.vujtovic@combinvest.swiss","F01447841","0788845411","Egerkingen","Geschäftsleitung","Dipl. Finanzplanungsexperte NDS HF"],
    ["Cédric","Zimolong","cedric.zimolong@combinvest.swiss","F01532802","0793986589","Zürich / Schlieren","Aussendienst","Versicherungsvermittler/-in VBV"],
    ["Daniel","Hamze","daniel.hamze@combinvest.swiss","F01091259","0788408577","Zürich / Schlieren","Geschäftsleitung","Dipl. Finanzberater/in IAF"],
    ["David","Frenkel","david.frenkel@combinvest.swiss","F01458235","0765015102","Zürich / Schlieren","Aussendienst","Dipl. Finanzberater/in IAF"],
    ["Dominic","Kipfer","dominic.kipfer@combinvest.swiss","F01465005","0789238441","Ostermundigen","Aussendienst","Dipl. Finanzberater/in IAF"],
    ["Enikö","Tornai","eniko.tornai@combinvest.swiss","F01506407","0766712440","Zürich / Schlieren","Aussendienst","Versicherungsvermittler/-in VBV"],
    ["Filmon","Kidane","filmon.kidane@combinvest.swiss","F01463361","0764748891","Ostermundigen","Aussendienst","Dipl. Finanzberater/in IAF"],
    ["Gian Melwin","Joss","gian.joss@combinvest.swiss","F01463862","0794497178","Egerkingen","Aussendienst","Dipl. Finanzberater/in IAF"],
    ["Joel Timo","Blum","joel.blum@combinvest.swiss","F01538303","0798253348","Ostermundigen","Aussendienst","Versicherungsvermittler/-in VBV"],
    ["Julia","Kwiatkowski","julia.kwiatkowski@combinvest.swiss","F01493084","0799259601","Zürich / Schlieren","Aussendienst","Dipl. Finanzberater/in IAF"],
    ["Katarina","Babic","katarina.babic@combinvest.swiss","F01487013","0763877486","Zürich / Schlieren","Aussendienst","Versicherungsvermittler/-in VBV"],
    ["Levin","Reznjak","levin.reznjak@combinvest.swiss","F01461190","0795052239","Zürich / Schlieren","Aussendienst","Dipl. Finanzberater/in IAF"],
    ["Michael","Fähndrich","michael.faehndrich@combinvest.swiss","F01456474","0798113132","Zürich / Schlieren","Aussendienst","Versicherungsvermittler/-in VBV"],
    ["Oliver","Steck","oliver.steck@combinvest.swiss","F01461198","0786545584","Ostermundigen","Aussendienst","Dipl. Finanzberater/in IAF"],
    ["Reto","Galli","reto.galli@combinvest.swiss","F01446052","0795230403","Ostermundigen","Innendienst / Aussendienst","Versicherungsvermittler/-in VBV"],
    ["Samuel","Mengisteab","samuel.mengisteab@combinvest.swiss","F01534025","0762835411","Zürich / Schlieren","Aussendienst","Versicherungsvermittler/-in VBV"],
    ["Senad","Pasalic","senad.pasalic@combinvest.swiss","F01457860","0797613837","Zürich / Schlieren","Aussendienst","Dipl. Finanzberater/in IAF"],
    ["Stefan","Haldemann","stefan.haldemann@combinvest.swiss","F01267354","0797915013","Ostermundigen","Aussendienst","Dipl. Finanzberater/in IAF"],
    ["Stefan","Rader","stefan.rader@combinvest.swiss","F01506584","0762952413","Zürich / Schlieren","Aussendienst","Dipl. Finanzberater/in IAF"],
    ["Yohannes","Hailay","yohannes.hailay@combinvest.swiss","F01473655","0782045499","Ostermundigen","Aussendienst","Versicherungsvermittler/-in VBV"],
    ["Yonas","Goitom","yonas.goitom@combinvest.swiss","F01473657","0783185666","Ostermundigen","Aussendienst","Versicherungsvermittler/-in VBV"],
    ["Debora","Wicki","debora.wicki@combinvest.swiss","","0767136113","Egerkingen","Innendienst",""],
    ["Halima","Rasheed","halima.rasheed@combinvest.swiss","F01539209","0765958585","Egerkingen","Innendienst","Versicherungsvermittler/-in VBV"],
    ["Janina","Senn","janina.senn@combinvest.swiss","","0791716010","Egerkingen","Innendienst",""],
    ["Mohammed","Yassine","mohammed.yassine@combinvest.swiss","","0764530874","Egerkingen","Innendienst / Mytrex","Eidg. dipl. Experte Rechnungslegung und Controlling"],
    ["Oliver","Huter","oliver.huter@combinvest.swiss","","0799697449","Egerkingen","Innendienst","Dipl. Finanzberater/in IAF"],
    ["Yannic","Kuhl","yannic.kuhl@combinvest.swiss","F01462124","0786196118","Egerkingen","Betriebsleiter","Dipl. Finanzberater/in IAF"]
  ];
  function slug(email){return"advisor-"+email.split("@")[0].replace(/[^a-z0-9]+/g,"-");}
  function address(location){
    // Offizielle Standortadressen werden später aus dem Backend bezogen.
    return{street:"Hausimollstrasse 3",zipCity:"4622 Egerkingen"};
  }
  global.CombinvestAdvisors=rows.map(function(r){var a=address(r[5]);return{id:slug(r[2]),firstName:r[0],lastName:r[1],fullName:r[0]+" "+r[1],email:r[2],finmaNumber:r[3],phone:r[4],location:r[5],role:r[6],education:r[7],street:a.street,zipCity:a.zipCity};});
})(window);
