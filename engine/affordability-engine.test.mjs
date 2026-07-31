import { affordability, effectiveHousingCost, maxAffordable, RULES } from './affordability-engine.mjs';
let pass=0, fail=0; const t=(n,c)=>{c?pass++:(fail++,console.log('FAIL:',n));};
const approx=(a,b,e=1e-6)=>Math.abs(a-b)<=e*Math.max(1,Math.abs(b));

// Klassiker: 1'000'000 Wert, 200'000 EK (20%), 150'000 Brutto
const r=affordability({wert:1_000_000, eigenkapital:200_000, bruttoeinkommenJahr:150_000});
t('Hypothek 800k', r.hypothek===800_000);
t('Belehnung 80%', approx(r.belehnung,80));
t('Zinslast 5% von 800k = 40k', approx(r.zinslast,40_000));
t('Nebenkosten 1% von 1M = 10k', approx(r.nebenkosten,10_000));
// 2. Hypothek: 800k - 666'667 = 133'333 ; /15 = 8'889
t('2. Hypothek Betrag', approx(r.zweiteHyp, 800_000-1_000_000*RULES.ersteHypGrenze/100, 1e-6));
t('1. und 2. Hypothek ergeben die Gesamthypothek', approx(r.ersteHyp+r.zweiteHyp,r.hypothek));
t('Amortisation = 2.Hyp/15', approx(r.amortisation, r.zweiteHyp/15));
// Gesamt 40000+10000+8889 = 58'889 ; /150000 = 39.26% -> NICHT tragbar
t('Quote > Limit', r.quote>RULES.tragbarkeitsLimit);
t('nicht tragbar bei 150k Einkommen', r.tragbar===false);

// Mit 200k Einkommen tragbar?
const r2=affordability({wert:1_000_000, eigenkapital:200_000, bruttoeinkommenJahr:200_000});
t('bei 200k: Quote < 30%', r2.quote<30);
t('tragbar bei 200k', r2.tragbar===true);

// maxAffordable monotonie + Constraint
const mx=maxAffordable(150_000, 200_000);
const rm=affordability({wert:mx, eigenkapital:200_000, bruttoeinkommenJahr:150_000});
t('maxAffordable respektiert Limit', rm.quote<=RULES.tragbarkeitsLimit+0.01);
t('maxAffordable > 0 und < byEquity(=1M)', mx>0 && mx<=1_000_000+1);

// Determinismus
t('deterministisch', affordability({wert:800000,eigenkapital:200000,bruttoeinkommenJahr:120000}).quote===affordability({wert:800000,eigenkapital:200000,bruttoeinkommenJahr:120000}).quote);

const actual=effectiveHousingCost({mortgage:800_000,mortgageRatePct:1.75,maintenanceAnnual:6_000,utilitiesAnnual:4_000,amortizationAnnual:8_000,rentMonthly:2_500});
t('effektiver Zins auf Hypothek',approx(actual.interestAnnual,14_000));
t('Eigentümerkosten ohne Amortisation',approx(actual.ownershipCostAnnual,24_000));
t('Cashflow enthält Amortisation',approx(actual.cashOutflowAnnual,32_000));
t('Miete wird auf Jahr gerechnet',approx(actual.rentAnnual,30_000));

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
console.log('Beispiel 1M/200k/150k -> Quote', r.quote.toFixed(2)+'%, tragbar:', r.tragbar, '| max Kaufpreis @150k:', Math.round(mx));
process.exit(fail?1:0);
