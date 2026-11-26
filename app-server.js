"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { questions: trQuestions, audit: trAudit } = require("./countries/tr/questions");
const globalBank = require("./countries/global");

const PORT = Number(process.env.PORT || 4173);
const PUBLIC = path.join(__dirname, "public");
const LANGUAGES = new Set(["en", "es", "de", "tr"]);
const GAME_CATEGORIES = ["GEO", "GEO", "GEO", "HIS", "HIS", "HIS", "SCI", "SCI", "SCI", "CUL", "CUL", "CUL", "GEN", "GEN", "TEC", "TEC", "MAT", "MAT", "SPO", "SPO"];
const TR_CATEGORY_CODES = { "Coğrafya": "GEO", "Tarih": "HIS", "Bilim": "SCI", "Kültür & Sanat": "CUL", "Genel Kültür": "GEN", "Teknoloji": "TEC", "Spor": "SPO", "Matematik": "MAT" };
const LEVELS = {
  tr: ["KOLAY", "ORTA", "ZOR", "ÇOK ZOR", "UZMAN", "1.000.000"],
  en: ["EASY", "MEDIUM", "HARD", "VERY HARD", "EXPERT", "1,000,000"],
  es: ["FÁCIL", "MEDIO", "DIFÍCIL", "MUY DIFÍCIL", "EXPERTO", "1.000.000"],
  de: ["LEICHT", "MITTEL", "SCHWER", "SEHR SCHWER", "EXPERTE", "1.000.000"],
};
const rooms = new Map();

const shuffle = values => {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index--) {
    const swap = crypto.randomInt(index + 1);
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
};
const safeEqual = (left, right) => {
  const a = Buffer.from(String(left || ""));
  const b = Buffer.from(String(right || ""));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};
const isTrustedProxy = req => Boolean(process.env.ROADQUIZ_PROXY_SECRET) && safeEqual(req.headers["x-roadquiz-proxy-secret"], process.env.ROADQUIZ_PROXY_SECRET);
const json = (res, status, data) => {
  const body = JSON.stringify(data);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(body);
};
const readBody = req => new Promise((resolve, reject) => {
  let data = "";
  req.on("data", chunk => {
    data += chunk;
    if (data.length > 64_000) req.destroy(new Error("body_too_large"));
  });
  req.on("end", () => {
    try { resolve(data ? JSON.parse(data) : {}); } catch (error) { reject(error); }
  });
  req.on("error", reject);
});
const cleanName = value => String(value || "").trim().slice(0, 18).replace(/[<>]/g, "");
const identifier = () => crypto.randomBytes(12).toString("base64url");
const roomCode = () => {
  let code;
  do code = String(crypto.randomInt(100000, 1000000)); while (rooms.has(code));
  return code;
};
const levelLabel = (language, index) => LEVELS[language][index < 5 ? 0 : index < 10 ? 1 : index < 14 ? 2 : index < 17 ? 3 : index < 19 ? 4 : 5];
const normalizeQuestion = (question, language) => {
  if (language !== "tr") return question;
  return { ...question, category: TR_CATEGORY_CODES[question.cat], cat: question.cat };
};

function questionsFor(language) {
  return language === "tr" ? trQuestions.map(question => normalizeQuestion(question, language)) : globalBank.questions(language);
}

function family(question) {
  const text = question.q.toLocaleLowerCase();
  if (/capital|başkent|hauptstadt|capital de/.test(text)) return "capital";
  if (/chemical symbol|kimyasal sembol|símbolo químico|chemische symbol/.test(text)) return "element";
  if (/currency|para birimi|moneda|währung/.test(text)) return "currency";
  return `${question.category}|${text.replace(/[^\p{L}\p{N} ]/gu, "").split(/\s+/).slice(0, 5).join("-")}`;
}

function pickQuestions(language, excludedIds = new Set()) {
  const all = questionsFor(language);
  const categories = shuffle(GAME_CATEGORIES);
  const picked = [];
  const usedFamilies = new Set();
  for (let level = 1; level <= 20; level++) {
    const category = categories[level - 1];
    let candidates = all.filter(question => question.category === category && !excludedIds.has(question.id) && !picked.some(item => item.id === question.id));
    if (!candidates.length) candidates = all.filter(question => !excludedIds.has(question.id) && !picked.some(item => item.id === question.id));
    if (!candidates.length) throw new Error("question_pool_exhausted");
    const distance = Math.min(...candidates.map(question => Math.abs(question.level - level)));
    candidates = candidates.filter(question => Math.abs(question.level - level) === distance);
    const fresh = candidates.filter(question => !usedFamilies.has(family(question)));
    if (fresh.length) candidates = fresh;
    const selected = candidates[crypto.randomInt(candidates.length)];
    picked.push(selected);
    usedFamilies.add(family(selected));
  }
  return picked;
}

function syncPhase(room) {
  const now = Date.now();
  if (room.phase === "question" && now - room.questionStartedAt >= room.durationMs) {
    room.phase = "reveal";
    room.revealStartedAt = now;
  }
  if (room.phase === "reveal" && now - room.revealStartedAt >= room.revealMs) {
    if (room.questionIndex >= room.questions.length - 1) {
      room.phase = "finished";
      room.revealStartedAt = null;
      room.finishedAt = now;
    } else {
      room.questionIndex += 1;
      room.answers.clear();
      room.phase = "question";
      room.questionStartedAt = now;
      room.revealStartedAt = null;
    }
  }
}

function publicState(room, playerId) {
  syncPhase(room);
  const now = Date.now();
  const question = room.questions[room.questionIndex];
  const players = [...room.players.values()].map(player => ({
    id: player.id,
    name: player.name,
    score: player.score,
    answered: room.answers.has(player.id),
  })).sort((a, b) => b.score - a.score);
  const state = {
    code: room.code,
    phase: room.phase,
    language: room.language,
    questionIndex: room.questionIndex,
    total: room.questions.length,
    players,
    remainingMs: room.questionStartedAt ? Math.max(0, room.durationMs - (now - room.questionStartedAt)) : room.durationMs,
    revealRemainingMs: room.revealStartedAt ? Math.max(0, room.revealMs - (now - room.revealStartedAt)) : room.revealMs,
    level: levelLabel(room.language, room.questionIndex),
    bankSize: room.language === "tr" ? trAudit.uniqueTexts : globalBank.count(room.language),
    gameCount: room.gameCount,
    premium: room.accessPlan === "premium",
  };
  if (!new Set(["lobby", "closed"]).has(room.phase) && question) {
    state.question = { cat: globalBank.label(room.language, question.category, question.cat), q: question.q, options: question.options };
    if (["reveal", "finished"].includes(room.phase)) {
      state.question.answer = question.answer;
      state.answerCounts = question.options.map((_, option) => [...room.answers.values()].filter(answer => answer.option === option).length);
    }
  }
  if (playerId && room.players.has(playerId)) {
    state.me = { ...room.players.get(playerId), answered: room.answers.has(playerId) };
    const answer = room.answers.get(playerId);
    if (answer) state.me.option = answer.option;
  }
  return state;
}

async function api(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/config") {
    const productMode = isTrustedProxy(req) && req.headers["x-roadquiz-product-mode"] === "1";
    return json(res, 200, { productMode, price: "4.99", currency: "USD" });
  }
  if (req.method === "POST" && url.pathname === "/api/rooms") {
    const body = await readBody(req).catch(() => null);
    if (!body) return json(res, 400, { error: "bad_json" });
    const productMode = isTrustedProxy(req) && req.headers["x-roadquiz-product-mode"] === "1";
    // The public Render URL remains the original Turkish experience.  The
    // multilingual commercial product is only reachable through ED LAB's
    // authenticated reverse proxy, so the upstream URL cannot bypass access
    // controls.
    const language = productMode && LANGUAGES.has(body.language) ? body.language : "tr";
    const accessPlan = productMode ? String(req.headers["x-roadquiz-access"] || "") : "legacy";
    if (productMode && !["trial", "premium"].includes(accessPlan)) return json(res, 402, { error: "payment_required" });
    const code = roomCode();
    const hostId = identifier();
    rooms.set(code, {
      code, hostId, language, accessPlan, productMode, createdAt: Date.now(), players: new Map(), answers: new Map(),
      phase: "lobby", questionIndex: 0,
      durationMs: Number(process.env.ROADQUIZ_QUESTION_MS || 15000),
      revealMs: Number(process.env.ROADQUIZ_REVEAL_MS || 4000), questionStartedAt: null,
      revealStartedAt: null, questions: pickQuestions(language), usedQuestionIds: new Set(), gameCount: 0,
    });
    return json(res, 200, { code, hostId, language, premium: accessPlan === "premium" });
  }
  const match = url.pathname.match(/^\/api\/rooms\/(\d{6})(?:\/(\w+))?$/);
  if (!match) return json(res, 404, { error: "not_found" });
  const room = rooms.get(match[1]);
  if (!room) return json(res, 404, { error: "room_not_found" });
  syncPhase(room);
  const action = match[2];
  if (req.method === "GET" && !action) return json(res, 200, publicState(room, url.searchParams.get("playerId")));
  const body = await readBody(req).catch(() => null);
  if (!body) return json(res, 400, { error: "bad_json" });
  const hostOk = safeEqual(body.hostId, room.hostId);
  if (req.method === "POST" && action === "join") {
    if (room.phase === "closed") return json(res, 410, { error: "room_closed" });
    if (room.phase !== "lobby") return json(res, 409, { error: "game_started" });
    const name = cleanName(body.name);
    if (!name) return json(res, 400, { error: "name_required" });
    const playerId = identifier();
    room.players.set(playerId, { id: playerId, name, score: 0 });
    return json(res, 200, { playerId, language: room.language });
  }
  if (req.method === "POST" && action === "start") {
    if (!hostOk) return json(res, 403, { error: "forbidden" });
    if (!room.players.size) return json(res, 409, { error: "need_player" });
    if (!["lobby", "finished"].includes(room.phase)) return json(res, 409, { error: "already_started" });
    if (room.productMode && room.gameCount >= 1) {
      const upgraded = isTrustedProxy(req) && req.headers["x-roadquiz-access"] === "premium";
      if (!upgraded && room.accessPlan !== "premium") return json(res, 402, { error: "payment_required" });
      if (upgraded) room.accessPlan = "premium";
    }
    for (const player of room.players.values()) player.score = 0;
    if (room.phase === "finished") room.questions = pickQuestions(room.language, room.usedQuestionIds);
    room.questions.forEach(question => room.usedQuestionIds.add(question.id));
    room.gameCount += 1;
    room.phase = "question";
    room.questionIndex = 0;
    room.answers.clear();
    room.questionStartedAt = Date.now();
    room.revealStartedAt = null;
    return json(res, 200, { ok: true, gameCount: room.gameCount, premium: room.accessPlan === "premium" });
  }
  if (req.method === "POST" && action === "answer") {
    syncPhase(room);
    if (room.phase !== "question") return json(res, 409, { error: "not_accepting" });
    if (!room.players.has(body.playerId)) return json(res, 403, { error: "player_not_found" });
    if (room.answers.has(body.playerId)) return json(res, 409, { error: "already_answered" });
    const option = Number(body.option);
    if (!Number.isInteger(option) || option < 0 || option > 3) return json(res, 400, { error: "bad_option" });
    const elapsed = Date.now() - room.questionStartedAt;
    if (elapsed > room.durationMs) return json(res, 409, { error: "time_up" });
    const question = room.questions[room.questionIndex];
    const correct = option === question.answer;
    const points = correct ? Math.round(500 + 500 * Math.max(0, room.durationMs - elapsed) / room.durationMs) : 0;
    room.answers.set(body.playerId, { option, correct, points });
    room.players.get(body.playerId).score += points;
    if (room.answers.size === room.players.size) {
      room.phase = "reveal";
      room.revealStartedAt = Date.now();
    }
    return json(res, 200, { correct, points });
  }
  if (req.method === "POST" && action === "close") {
    if (!hostOk) return json(res, 403, { error: "forbidden" });
    room.phase = "closed";
    room.questionStartedAt = null;
    room.revealStartedAt = null;
    return json(res, 200, { ok: true });
  }
  return json(res, 404, { error: "not_found" });
}

function serve(req, res, url) {
  let file = url.pathname === "/" ? "index.html" : url.pathname.replace(/^\//, "");
  if (file.startsWith("host/") || file.startsWith("join/")) file = "index.html";
  const filePath = path.normalize(path.join(PUBLIC, file));
  if (!filePath.startsWith(PUBLIC)) { res.writeHead(403); return res.end("Forbidden"); }
  fs.readFile(filePath, (error, data) => {
    if (error) { res.writeHead(404); return res.end("Not found"); }
    const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml", ".webp": "image/webp" };
    res.writeHead(200, { "Content-Type": types[path.extname(filePath)] || "application/octet-stream", "Cache-Control": "no-store" });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  if (url.pathname.startsWith("/api/")) return api(req, res, url).catch(error => {
    console.error("RoadQuiz API error", error);
    json(res, 500, { error: "server_error" });
  });
  return serve(req, res, url);
});

setInterval(() => {
  const cutoff = Date.now() - 12 * 60 * 60 * 1000;
  for (const [code, room] of rooms) if (room.createdAt < cutoff) rooms.delete(code);
}, 60 * 60 * 1000).unref();

server.listen(PORT, "0.0.0.0", () => console.log(`RoadQuiz running on ${PORT}; TR=${trAudit.uniqueTexts}; EN/ES/DE=1000 each`));

