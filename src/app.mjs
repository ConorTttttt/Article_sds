import { assess, SOURCES, RULESET_VERSION } from "./rules.mjs";

const byId = id => document.getElementById(id);
const value = id => byId(id)?.value ?? "unknown";
const form = byId("assessment-form");
let lastReport = null;

for (const field of document.querySelectorAll("select[data-tri]")) {
  for (const [v, label] of [["unknown", "Unknown / not established"], ["yes", "Yes — confirmed"], ["no", "No — confirmed"]]) {
    const option = document.createElement("option");
    option.value = v;
    option.textContent = label;
    field.append(option);
  }
}

const categories = [
  ["unknown", "Not assessed"],
  ["ordinary_hazard", "Health / environmental hazard — Art 31(3)(a)"],
  ["special_31_3b", "Special hazard — Art 31(3)(b)"],
  ["union_oel", "Union workplace exposure limit — Art 31(3)(c)"],
  ["ed2", "Category 2 endocrine disruptor — CLP note"],
  ["none", "No listed trigger (checked)"]
];

function addIngredient() {
  const row = document.createElement("div");
  row.className = "ingredient-row";
  const name = document.createElement("input");
  name.type = "text";
  name.placeholder = "Ingredient name / CAS";
  name.setAttribute("aria-label", "Ingredient name or CAS");
  name.className = "ingredient-name";
  const amount = document.createElement("input");
  amount.type = "number";
  amount.min = "0";
  amount.max = "100";
  amount.step = "any";
  amount.placeholder = "Concentration %";
  amount.setAttribute("aria-label", "Individual ingredient percentage");
  amount.className = "ingredient-percent";
  const category = document.createElement("select");
  category.className = "ingredient-category";
  category.setAttribute("aria-label", "Ingredient trigger category");
  for (const [v, text] of categories) {
    const option = document.createElement("option");
    option.value = v;
    option.textContent = text;
    category.append(option);
  }
  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "secondary remove-ingredient";
  remove.textContent = "Remove";
  remove.addEventListener("click", () => row.remove());
  row.append(name, amount, category, remove);
  byId("ingredientRows").append(row);
}
byId("addIngredient").addEventListener("click", addIngredient);
addIngredient();

const echaKeys = ["function", "shapeDominates", "separableChemical",
  "q4a", "q4b", "q4c", "q5a", "q5b", "q5c", "q6a", "q6b", "q6c", "q6d"];
const echaFields = ["objectFunction", ...echaKeys.slice(1)];
function majority(arr) {
  const count = val => arr.filter(x => x === val).length;
  if (count("yes") > arr.length / 2) return "yes";
  if (count("no") > arr.length / 2) return "no";
  return "unknown";
}

function visibility() {
  const kind = value("productType");
  byId("articleFields").hidden = kind !== "article";
  byId("chemicalFields").hidden = !["substance", "mixture"].includes(kind);
  byId("substanceFields").hidden = kind !== "substance";
  byId("mixtureFields").hidden = kind !== "mixture";
  byId("professionalFields").hidden = value("pyrotechnicVehicle") !== "yes";
  const deep = value("shapeDominates") === "unknown";
  const sep = value("separableChemical");
  byId("classificationFollowup").hidden = !deep;
  byId("echaStep4").hidden = !(deep && sep === "yes");
  byId("echaStep5").hidden = !(deep && sep === "yes" && majority(["q4a", "q4b", "q4c"].map(value)) === "no");
  byId("echaStep6").hidden = !(deep && sep === "no");
  byId("svhcManual").hidden = value("svhcConcentrationMode") !== "manual";
  byId("svhcMass").hidden = value("svhcConcentrationMode") !== "mass";
}
form.addEventListener("change", visibility);
visibility();

const attrs = ["productType", "pyrotechnicVehicle", "professionalRecipient",
  "separateChemicalPayload", "intendedRelease", "candidateListPresent",
  "maxComponentSvhcPercent", "allComponentsChecked", "clpLabellingDerogation", "clpHazardous",
  "pbtOrVpVb", "substanceCandidateList", "mixturePhysical",
  "allMixtureIngredientsChecked", "offeredToPublic", "publicInformationSufficient",
  "downstreamRequest", "svhcConcentrationMode", "svhcBasis", "svhcMassGrams", "referenceMassGrams"];

function collect() {
  const facts = {};
  for (const id of attrs) facts[id] = value(id);
  facts.classification = {};
  for (let i = 0; i < echaKeys.length; i++)
    facts.classification[echaKeys[i]] = value(echaFields[i]);
  facts.ingredients = [...document.querySelectorAll(".ingredient-row")].map(row => ({
    name: row.querySelector(".ingredient-name").value.trim(),
    percent: row.querySelector(".ingredient-percent").value,
    category: row.querySelector(".ingredient-category").value
  }));
  return facts;
}
function el(tag, cls, text) {
  const element = document.createElement(tag);
  if (cls) element.className = cls;
  if (text !== undefined) element.textContent = text;
  return element;
}
const statusNames = {
  REQUIRED: "Required",
  NOT_REQUIRED: "Not required under assessed rules",
  REQUIRED_ON_REQUEST: "Required on request",
  NOT_REQUIRED_FOR_THIS_SUPPLY: "Not automatically required for this supply",
  REVIEW_REQUIRED: "Further assessment needed",
  ARTICLE: "Article",
  CHEMICAL: "Substance / mixture",
  COMBINATION: "Combination product"
};

function reportCard(title, data) {
  const card = el("section", "decision-card");
  const top = el("div", "decision-top");
  top.append(el("p", "decision-label", title));
  const status = el("span", "status status-" + data.status, statusNames[data.status] ?? data.status);
  top.append(status);
  card.append(top, el("h3", "", data.title), el("p", "decision-explanation", data.detail));
  if (data.next?.length) {
    const more = el("div", "next-steps");
    more.append(el("strong", "", "Evidence to obtain"));
    const list = el("ul");
    data.next.forEach(step => list.append(el("li", "", step)));
    more.append(list);
    card.append(more);
  }
  return card;
}
function render(report) {
  const target = byId("resultBody");
  target.replaceChildren();
  target.append(reportCard("ECHA product classification", {
    status: report.classification.status,
    title: report.classification.status === "REVIEW_REQUIRED" ? "Classification not established" : "Classification evidence recorded",
    detail: report.classification.explanation + " (ECHA Figure 2, step " + report.classification.step + ")",
    next: report.classification.next ?? []
  }));
  target.append(reportCard("SDS legal requirement", report.sds));
  if (report.article33) target.append(reportCard("Separate Article 33 information duty", report.article33));

  if (report.related.length) {
    const related = el("section", "related");
    related.append(el("h3", "", "Related obligations to review"));
    for (const note of report.related) related.append(el("p", "", note));
    target.append(related);
  }

  const keys = [...new Set(["REACH_DEFINITION", "ECHA_ARTICLES", ...(report.sds.rules ?? []), ...(report.article33?.rules ?? [])])];
  const sources = el("section", "citations");
  sources.append(el("h3", "", "Rules applied and legal sources"));
  if (!keys.length) sources.append(el("p", "", "No substantive rule could yet be applied."));
  for (const key of keys) {
    const item = SOURCES[key];
    if (!item) continue;
    const link = el("a", "", item.name + " ↗");
    link.href = item.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    const paragraph = el("p");
    paragraph.append(link, el("span", "", " — " + item.description));
    sources.append(paragraph);
  }
  target.append(sources);
  target.append(el("p", "disclaimer",
    "Assessment based on user-provided facts and fixed legal rules. Not evidence of a verified classification or a legal certification. Version: " + RULESET_VERSION + "."));

  byId("resultPlaceholder").hidden = true;
  target.hidden = false;
  byId("downloadReport").hidden = false;
}

form.addEventListener("submit", event => {
  event.preventDefault();
  lastReport = assess(collect());
  render(lastReport);
  if (window.matchMedia("(max-width: 900px)").matches) {
    byId("resultBody").scrollIntoView({ behavior: "smooth", block: "start" });
  }
});

byId("resetForm").addEventListener("click", () => {
  form.reset();
  byId("ingredientRows").replaceChildren();
  addIngredient();
  lastReport = null;
  byId("resultPlaceholder").hidden = false;
  byId("resultBody").hidden = true;
  byId("downloadReport").hidden = true;
  visibility();
});

byId("downloadReport").addEventListener("click", () => {
  if (!lastReport) return;
  const keys = [...new Set(["REACH_DEFINITION", "ECHA_ARTICLES", ...(lastReport.sds.rules ?? []), ...(lastReport.article33?.rules ?? [])])];
  const record = {
    ...lastReport,
    sources: Object.fromEntries(keys.map(k => [k, SOURCES[k]]).filter(([, v]) => !!v)),
    evidenceNotice: "This record captures user assertions. Attach external evidence before regulatory sign-off."
  };
  const blob = new Blob([JSON.stringify(record, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "eu-sds-assessment.json";
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
});
