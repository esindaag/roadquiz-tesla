#!/usr/bin/env node
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);
const [sourceRoot, outputDir] = process.argv.slice(2);
if (!sourceRoot || !outputDir) {
  console.error("Usage: node scripts/build-open-quiz-bank.mjs <compiled-open-bank-root> <output-dir>");
  process.exit(2);
}

const TARGETS = { GEO: 150, HIS: 160, SCI: 150, CUL: 150, GEN: 140, TEC: 100, SPO: 70, MAT: 80 };
const LEVELS = [35, 74, 39, 94, 40, 89, 84, 68, 76, 71, 42, 60, 44, 82, 33, 25, 19, 10, 10, 5];
const CATEGORY = {
  geography: "GEO",
  history: "HIS",
  science: "SCI",
  nature: "SCI",
  space: "SCI",
  arts: "CUL",
  film: "CUL",
  music: "CUL",
  food: "GEN",
  language: "GEN",
  mythology: "GEN",
  popculture: "GEN",
  videogames: "GEN",
  technology: "TEC",
  sports: "SPO",
  math: "MAT",
};
const unstable = /\b(current|currently|today|now|latest|most recent|derzeit|aktuell|heute|jetzt|neueste|wie alt|how old)\b/i;
const localTurkey = /\b(turkey|turkish|istanbul|ankara|ataturk|türkei|türkisch)\b/i;
const stable = value => Number.parseInt(createHash("sha256").update(value).digest("hex").slice(0, 12), 16);

function sourceCategory(question) {
  const fromId = question.id.split("-")[1];
  return CATEGORY[fromId] ? fromId : question.tags.find(tag => CATEGORY[tag]);
}

function build(language, excludedRaw = new Set()) {
  const bank = require(resolve(sourceRoot, `dist/${language}.js`));
  const unique = new Set();
  const pools = Object.fromEntries(Object.keys(TARGETS).map(category => [category, []]));
  for (const question of bank.getQuestions({ count: 100_000, seed: 834117 })) {
    const rawCategory = sourceCategory(question);
    if (excludedRaw.has(rawCategory)) continue;
    const category = CATEGORY[rawCategory];
    const prompt = String(question.prompt || "").trim().replace(/\s+/g, " ");
    const options = [question.answer, ...(question.distractors || [])].map(value => String(value).trim().replace(/\s+/g, " "));
    const key = prompt.toLocaleLowerCase(language === "de" ? "de-DE" : "en-US");
    if (!category || unique.has(key) || prompt.length < 8 || prompt.length > 190 || unstable.test(prompt) || localTurkey.test(prompt)) continue;
    if (options.length !== 4 || options.some(value => !value || value.length > 100) || new Set(options.map(value => value.toLocaleLowerCase())).size !== 4) continue;
    unique.add(key);
    pools[category].push({
      sourceId: question.id,
      category,
      q: prompt,
      options,
      answer: 0,
      difficulty: Number(question.difficulty || 3) + prompt.length / 220,
    });
  }

  const selected = [];
  for (const [category, target] of Object.entries(TARGETS)) {
    const pool = pools[category].sort((a, b) => a.difficulty - b.difficulty || stable(a.sourceId) - stable(b.sourceId));
    if (pool.length < target) throw new Error(`${language} ${category}: need ${target}, found ${pool.length}`);
    for (let i = 0; i < target; i++) selected.push(pool[Math.round(i * (pool.length - 1) / (target - 1))]);
  }

  const ordered = [...selected].sort((a, b) => a.difficulty - b.difficulty || stable(a.sourceId) - stable(b.sourceId));
  let offset = 0;
  LEVELS.forEach((count, index) => {
    ordered.slice(offset, offset + count).forEach(question => { question.level = index + 1; });
    offset += count;
  });

  return selected
    .sort((a, b) => a.level - b.level || a.category.localeCompare(b.category) || a.sourceId.localeCompare(b.sourceId))
    .map((question, index) => {
      const order = [0, 1, 2, 3].sort((a, b) => stable(`${question.sourceId}:${a}`) - stable(`${question.sourceId}:${b}`));
      return {
        id: `${language.toUpperCase()}-${question.category}-${String(index + 1).padStart(4, "0")}`,
        category: question.category,
        level: question.level,
        answer: order.indexOf(0),
        q: question.q,
        options: order.map(option => question.options[option]),
        source: { dataset: "open-quiz-bank", id: question.sourceId },
      };
    });
}

for (const language of ["en", "de"]) {
  const rows = build(language);
  writeFileSync(resolve(outputDir, `questions.${language}.json`), `${JSON.stringify(rows)}\n`);
  console.log(`${language}: ${rows.length} questions`);
}
const spanishSource = build("en", new Set(["language"]));
writeFileSync(resolve(outputDir, "questions.en-for-es.json"), `${JSON.stringify(spanishSource)}\n`);
console.log(`en-for-es: ${spanishSource.length} questions`);
