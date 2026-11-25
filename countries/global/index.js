"use strict";

const banks = {
  en: require("./questions.en.json"),
  es: require("./questions.es.json"),
  de: require("./questions.de.json"),
};
const labels = {
  en: { GEO: "Geography", HIS: "History", SCI: "Science", CUL: "Arts & Culture", GEN: "General Knowledge", TEC: "Technology", SPO: "Sports", MAT: "Mathematics" },
  es: { GEO: "Geografía", HIS: "Historia", SCI: "Ciencia", CUL: "Arte y cultura", GEN: "Cultura general", TEC: "Tecnología", SPO: "Deportes", MAT: "Matemáticas" },
  de: { GEO: "Geografie", HIS: "Geschichte", SCI: "Wissenschaft", CUL: "Kunst & Kultur", GEN: "Allgemeinwissen", TEC: "Technologie", SPO: "Sport", MAT: "Mathematik" },
  tr: { GEO: "Coğrafya", HIS: "Tarih", SCI: "Bilim", CUL: "Kültür & Sanat", GEN: "Genel Kültür", TEC: "Teknoloji", SPO: "Spor", MAT: "Matematik" },
};
const targetCounts = { GEO: 150, HIS: 160, SCI: 150, CUL: 150, GEN: 140, TEC: 100, SPO: 70, MAT: 80 };

function audit(language, rows) {
  const ids = new Set();
  const texts = new Set();
  const categories = {};
  const levels = {};
  for (const row of rows) {
    if (!row.id || ids.has(row.id)) throw new Error(`${language}: duplicate or missing id ${row.id}`);
    ids.add(row.id);
    const text = String(row.q || "").trim().toLocaleLowerCase(language);
    if (!text || texts.has(text)) throw new Error(`${language}: duplicate or missing question ${row.id}`);
    texts.add(text);
    if (!targetCounts[row.category]) throw new Error(`${language}: invalid category ${row.id}`);
    if (!Number.isInteger(row.level) || row.level < 1 || row.level > 20) throw new Error(`${language}: invalid level ${row.id}`);
    if (!Array.isArray(row.options) || row.options.length !== 4 || new Set(row.options.map(option => String(option).trim().toLocaleLowerCase(language))).size !== 4) throw new Error(`${language}: invalid options ${row.id}`);
    if (!Number.isInteger(row.answer) || row.answer < 0 || row.answer > 3) throw new Error(`${language}: invalid answer ${row.id}`);
    categories[row.category] = (categories[row.category] || 0) + 1;
    levels[row.level] = (levels[row.level] || 0) + 1;
  }
  if (rows.length !== 1000) throw new Error(`${language}: expected 1000 questions, got ${rows.length}`);
  for (const [category, target] of Object.entries(targetCounts)) if (categories[category] !== target) throw new Error(`${language}: ${category} expected ${target}, got ${categories[category]}`);
  return { total: rows.length, uniqueTexts: texts.size, categories, levels };
}

const audits = Object.fromEntries(Object.entries(banks).map(([language, rows]) => [language, audit(language, rows)]));

module.exports = {
  languages: Object.keys(banks),
  questions(language) {
    if (!banks[language]) throw new Error("unsupported_language");
    return banks[language];
  },
  count(language) { return banks[language]?.length || 0; },
  label(language, category, fallback) { return labels[language]?.[category] || fallback || category; },
  labels,
  audits,
  targetCounts,
};
