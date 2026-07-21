import { ageGroupFromBirthYear, compareFranchises } from "./engine/franchise-engine.mjs";

const $ = (selector) => document.querySelector(selector);
const elements = {
  form: $("#calculatorForm"), location: $("#locationSearch"), locationResults: $("#locationResults"),
  locationError: $("#locationError"), birthYear: $("#birthYear"), personSummary: $("#personSummary"),
  insurer: $("#insurerSelect"), tariff: $("#tariffSelect"), currentFranchise: $("#currentFranchise"),
  healthCosts: $("#healthCosts"), reserve: $("#reserve"), empty: $("#emptyState"), content: $("#resultContent"),
  bestFranchise: $("#bestFranchise"), recommendationText: $("#recommendationText"), regionLabel: $("#regionLabel"),
  bestMonthly: $("#bestMonthly"), selectedTariffShort: $("#selectedTariffShort"), bestTotal: $("#bestTotal"),
  savings: $("#savings"), savingsContext: $("#savingsContext"), reserveMessage: $("#reserveMessage"),
  chart: $("#costChart"), chartDetail: $("#chartDetail"), body: $("#comparisonBody"),
  saveButton: $("#saveButton"), saveStatus: $("#saveStatus"),
};

const modelNames = { BASE: "Standardmodell", HAM: "Hausarztmodell", HMO: "HMO-Modell", DIV: "Alternatives Modell" };
const ageNames = { KIN: "Kind (bis 18)", JUG: "junge erwachsene Person (19–25)", ERW: "erwachsene Person (ab 26)" };
const state = { location: null, ageGroup: null, accident: "MIT", offers: [], offerMap: new Map(), selectedOffer: null, comparison: [] };
const cache = new Map();
let locations = [];
let insurers = {};

const formatCHF = (value, decimals = 0) => `CHF ${new Intl.NumberFormat("de-CH", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value)}`;
const compactLocation = (location) => `${location.p} ${location.o}`;
const offerKey = (offer) => [offer.i, offer.y, offer.t, offer.n, offer.s].join("|");

async function getJSON(path) {
  if (!cache.has(path)) cache.set(path, fetch(path).then((response) => {
    if (!response.ok) throw new Error(`Datensatz konnte nicht geladen werden (${response.status}).`);
    return response.json();
  }));
  return cache.get(path);
}

async function initialise() {
  try {
    [locations, insurers] = await Promise.all([
      getJSON("data/priminfo-2026/locations.json"),
      getJSON("data/priminfo-2026/insurers.json"),
    ]);
    restoreDraft();
  } catch (error) {
    elements.empty.innerHTML = `<h2>Die BAG-Daten konnten nicht geladen werden</h2><p>${error.message} Bitte die Seite über den lokalen Server oder Vercel öffnen.</p>`;
  }
}

function restoreDraft() {
  const saved = window.CombinvestCRM?.data("franchiseDraft", null) || window.CombinvestCRM?.data("franchise", null);
  if (!saved) return;
  elements.birthYear.value = saved.birthYear || "";
  elements.healthCosts.value = saved.healthCosts ?? 1200;
  elements.reserve.value = saved.reserve ?? 3000;
  setAccident(saved.accident || "MIT", false);
  if (saved.location) {
    const match = locations.find((item) => item.b === saved.location.b && item.p === saved.location.p && item.o === saved.location.o);
    if (match) selectLocation(match, { insurerId: saved.insurerId, offerKey: saved.offerKey, franchise: saved.currentFranchise });
  }
}

function searchLocations() {
  state.location = null;
  const query = elements.location.value.trim().toLocaleLowerCase("de-CH");
  if (query.length < 2) return hideLocations();
  const numeric = /^\d+$/.test(query);
  const matches = locations.filter((item) => numeric
    ? String(item.p).startsWith(query)
    : `${item.o} ${item.g} ${item.p}`.toLocaleLowerCase("de-CH").includes(query)).slice(0, 14);
  elements.locationResults.innerHTML = matches.length ? matches.map((item, index) => `
    <button type="button" class="location-option" role="option" data-index="${index}">
      <b>${item.p} ${item.o}</b><span>Gemeinde ${item.g} · ${item.c} · Prämienregion ${item.r}</span>
    </button>`).join("") : `<div class="location-option"><b>Kein Ort gefunden</b><span>Bitte PLZ oder Ortsname prüfen.</span></div>`;
  elements.locationResults.hidden = false;
  elements.locationResults.querySelectorAll("button").forEach((button) => button.addEventListener("click", () => selectLocation(matches[Number(button.dataset.index)])));
}

function hideLocations() { elements.locationResults.hidden = true; }

async function selectLocation(location, restore = null) {
  state.location = location;
  elements.location.value = compactLocation(location);
  elements.locationError.hidden = true;
  hideLocations();
  await refreshOffers(restore);
}

function setAccident(value, refresh = true) {
  state.accident = value;
  document.querySelectorAll("#accidentChoice button").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.value === value)));
  if (refresh) refreshOffers();
}

async function refreshOffers(restore = null) {
  state.ageGroup = ageGroupFromBirthYear(elements.birthYear.value, 2026);
  updatePersonSummary();
  if (!state.location || !state.ageGroup) {
    resetOfferControls();
    render();
    return;
  }
  elements.insurer.disabled = true;
  elements.insurer.innerHTML = `<option>Lade offizielle Angebote …</option>`;
  try {
    const cantonOffers = await getJSON(`data/priminfo-2026/premiums/${state.location.c}.json`);
    state.offers = cantonOffers.filter((offer) => offer.r === state.location.r && offer.a === state.ageGroup && offer.u === state.accident);
    state.offerMap = new Map(state.offers.map((offer) => [offerKey(offer), offer]));
    const insurerIds = [...new Set(state.offers.map((offer) => offer.i))].sort((a, b) => (insurers[a] || "").localeCompare(insurers[b] || "", "de-CH"));
    elements.insurer.innerHTML = `<option value="">Versicherer auswählen</option>${insurerIds.map((id) => `<option value="${id}">${insurers[id] || `Versicherer ${id}`}</option>`).join("")}`;
    elements.insurer.disabled = false;
    if (restore?.insurerId && insurerIds.includes(Number(restore.insurerId))) {
      elements.insurer.value = String(restore.insurerId);
      refreshTariffs(restore);
    } else {
      resetTariffControls();
      render();
    }
  } catch (error) {
    resetOfferControls();
    elements.insurer.innerHTML = `<option>${error.message}</option>`;
  }
  saveDraft();
}

function updatePersonSummary() {
  if (!state.ageGroup) {
    elements.personSummary.textContent = "Bitte ein gültiges Geburtsjahr zwischen 1900 und 2026 eingeben.";
    return;
  }
  elements.personSummary.textContent = `Berechnet als ${ageNames[state.ageGroup]}; Prämienkategorie ${state.ageGroup}.`;
}

function resetOfferControls() {
  elements.insurer.disabled = true;
  elements.insurer.innerHTML = `<option value="">Zuerst Wohnort und Geburtsjahr wählen</option>`;
  resetTariffControls();
}

function resetTariffControls() {
  elements.tariff.disabled = true;
  elements.tariff.innerHTML = `<option value="">Zuerst Versicherer wählen</option>`;
  elements.currentFranchise.disabled = true;
  elements.currentFranchise.innerHTML = "";
  state.selectedOffer = null;
}

function refreshTariffs(restore = null) {
  const id = Number(elements.insurer.value);
  const offers = state.offers.filter((offer) => offer.i === id).sort((a, b) => {
    const aMin = Math.min(...a.p.map((pair) => pair[1]));
    const bMin = Math.min(...b.p.map((pair) => pair[1]));
    return a.y.localeCompare(b.y) || aMin - bMin || a.n.localeCompare(b.n, "de-CH");
  });
  elements.tariff.innerHTML = `<option value="">Modell / Tarif auswählen</option>${offers.map((offer) => {
    const key = offerKey(offer);
    const childGroup = offer.s ? ` · ${offer.s}` : "";
    return `<option value="${encodeURIComponent(key)}">${modelNames[offer.y] || offer.y} · ${offer.n || offer.t}${childGroup}</option>`;
  }).join("")}`;
  elements.tariff.disabled = false;
  if (restore?.offerKey && state.offerMap.has(restore.offerKey)) {
    elements.tariff.value = encodeURIComponent(restore.offerKey);
    selectTariff(restore.franchise);
  } else {
    state.selectedOffer = null;
    elements.currentFranchise.disabled = true;
    render();
  }
  saveDraft();
}

function selectTariff(preferredFranchise = null) {
  const key = decodeURIComponent(elements.tariff.value || "");
  state.selectedOffer = state.offerMap.get(key) || null;
  if (!state.selectedOffer) {
    elements.currentFranchise.disabled = true;
    return render();
  }
  const franchises = state.selectedOffer.p.map(([franchise]) => franchise);
  elements.currentFranchise.innerHTML = franchises.map((franchise) => `<option value="${franchise}">CHF ${franchise.toLocaleString("de-CH")}</option>`).join("");
  elements.currentFranchise.disabled = false;
  const fallback = franchises.includes(300) ? 300 : franchises[0];
  elements.currentFranchise.value = String(franchises.includes(Number(preferredFranchise)) ? preferredFranchise : fallback);
  render();
  saveDraft();
}

function render() {
  if (!state.location || !state.ageGroup || !state.selectedOffer) {
    elements.empty.hidden = false;
    elements.content.hidden = true;
    return;
  }
  const costs = Math.max(0, Number(elements.healthCosts.value) || 0);
  state.comparison = compareFranchises(state.selectedOffer.p, costs, state.ageGroup);
  if (!state.comparison.length) return;
  const best = state.comparison[0];
  const currentFranchise = Number(elements.currentFranchise.value);
  const current = state.comparison.find((row) => row.franchise === currentFranchise) || best;
  const savings = Math.max(0, current.annualTotal - best.annualTotal);
  const reserve = Math.max(0, Number(elements.reserve.value) || 0);
  const riskCap = best.maximumCostSharing;
  const tariffName = state.selectedOffer.n || state.selectedOffer.t;
  elements.empty.hidden = true;
  elements.content.hidden = false;
  elements.bestFranchise.textContent = formatCHF(best.franchise);
  elements.recommendationText.textContent = costs === 0
    ? "Bei keinen erwarteten Behandlungskosten zählt vor allem die tiefere Prämie."
    : `Bei erwarteten Gesundheitskosten von ${formatCHF(costs)} ergibt diese Franchise im Modell die tiefsten Gesamtkosten.`;
  elements.regionLabel.textContent = `${state.location.g} · Region ${state.location.r}`;
  elements.bestMonthly.textContent = formatCHF(best.monthlyPremium, 2);
  elements.bestTotal.textContent = formatCHF(best.annualTotal);
  elements.selectedTariffShort.textContent = `${insurers[state.selectedOffer.i]} · ${modelNames[state.selectedOffer.y] || state.selectedOffer.y}`;
  elements.savings.textContent = savings > 0 ? formatCHF(savings) : "CHF 0";
  elements.savingsContext.textContent = best.franchise === current.franchise ? "Ihre aktuelle Franchise ist hier bereits optimal" : `gegenüber Franchise ${formatCHF(current.franchise)}`;
  elements.reserveMessage.classList.toggle("warn", reserve < riskCap);
  elements.reserveMessage.textContent = reserve >= riskCap
    ? `Reserve ausreichend: Die maximale Kostenbeteiligung bei Franchise ${formatCHF(best.franchise)} beträgt ${formatCHF(riskCap)}.`
    : `Reserve beachten: Für Franchise ${formatCHF(best.franchise)} sollten bis zu ${formatCHF(riskCap)} verfügbar sein. Aktuell erfasst: ${formatCHF(reserve)}.`;
  renderChart(best);
  renderTable(best);
  saveDraft();
}

function renderChart(best) {
  const ordered = [...state.comparison].sort((a, b) => a.franchise - b.franchise);
  const max = Math.max(...ordered.map((row) => row.annualTotal));
  elements.chart.innerHTML = ordered.map((row) => {
    const premiumWidth = row.annualPremium / max * 100;
    const sharingWidth = row.costSharing / max * 100;
    return `<button type="button" class="chart-row${row.franchise === best.franchise ? " best" : ""}" data-franchise="${row.franchise}" aria-label="Franchise ${formatCHF(row.franchise)}: Total ${formatCHF(row.annualTotal)} pro Jahr">
      <span class="chart-label">${formatCHF(row.franchise)}</span>
      <span class="chart-track"><span class="chart-premium" style="width:${premiumWidth}%"></span><span class="chart-sharing" style="width:${sharingWidth}%"></span></span>
      <span class="chart-value">${formatCHF(row.annualTotal)}</span>
    </button>`;
  }).join("");
  elements.chart.querySelectorAll(".chart-row").forEach((button) => {
    const show = () => {
      const row = ordered.find((item) => item.franchise === Number(button.dataset.franchise));
      elements.chartDetail.textContent = `Franchise ${formatCHF(row.franchise)}: ${formatCHF(row.annualPremium)} Prämie + ${formatCHF(row.costSharing)} Kostenbeteiligung = ${formatCHF(row.annualTotal)} pro Jahr.`;
    };
    button.addEventListener("mouseenter", show);
    button.addEventListener("focus", show);
    button.addEventListener("click", show);
  });
}

function renderTable(best) {
  elements.body.innerHTML = [...state.comparison].sort((a, b) => a.franchise - b.franchise).map((row) => `<tr class="${row.franchise === best.franchise ? "best" : ""}">
    <td>${formatCHF(row.franchise)}${row.franchise === best.franchise ? " · empfohlen" : ""}</td>
    <td>${formatCHF(row.monthlyPremium, 2)}</td><td>${formatCHF(row.annualPremium)}</td>
    <td>${formatCHF(row.costSharing)}</td><td>${formatCHF(row.annualTotal)}</td>
  </tr>`).join("");
}

function draftData() {
  return {
    year: 2026,
    location: state.location,
    birthYear: Number(elements.birthYear.value) || null,
    ageGroup: state.ageGroup,
    accident: state.accident,
    insurerId: Number(elements.insurer.value) || null,
    offerKey: state.selectedOffer ? offerKey(state.selectedOffer) : null,
    currentFranchise: Number(elements.currentFranchise.value) || null,
    healthCosts: Number(elements.healthCosts.value) || 0,
    reserve: Number(elements.reserve.value) || 0,
  };
}

function saveDraft() { window.CombinvestCRM?.save("franchiseDraft", draftData()); }

function saveResult() {
  if (!state.comparison.length) return;
  const payload = { ...draftData(), insurerName: insurers[state.selectedOffer.i] || "", modelName: modelNames[state.selectedOffer.y] || state.selectedOffer.y, selectedOffer: state.selectedOffer, recommendation: state.comparison[0], comparison: state.comparison, source: "BAG / Priminfo 2026" };
  const saved = window.CombinvestCRM?.save("franchise", payload) ?? (localStorage.setItem("combinvest.franchise.v2", JSON.stringify(payload)), true);
  elements.saveStatus.textContent = saved ? `Übernommen um ${new Date().toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit" })}` : "Speichern nicht möglich";
}

elements.location.addEventListener("input", searchLocations);
elements.location.addEventListener("focus", searchLocations);
document.addEventListener("click", (event) => { if (!event.target.closest(".location-field")) hideLocations(); });
elements.birthYear.addEventListener("input", () => refreshOffers());
document.querySelectorAll("#accidentChoice button").forEach((button) => button.addEventListener("click", () => setAccident(button.dataset.value)));
elements.insurer.addEventListener("change", () => refreshTariffs());
elements.tariff.addEventListener("change", () => selectTariff());
[elements.currentFranchise, elements.healthCosts, elements.reserve].forEach((element) => element.addEventListener("input", render));
document.querySelectorAll("[data-cost]").forEach((button) => button.addEventListener("click", () => { elements.healthCosts.value = button.dataset.cost; render(); }));
elements.saveButton.addEventListener("click", saveResult);
$("#resetButton").addEventListener("click", () => {
  elements.form.reset(); state.location = null; state.selectedOffer = null; setAccident("MIT", false); elements.location.value = ""; elements.healthCosts.value = 1200; elements.reserve.value = 3000; resetOfferControls(); updatePersonSummary(); render(); elements.location.focus();
});

initialise();
