"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const path = require("node:path");
const globalBank = require("../countries/global");

const port = 43000 + Math.floor(Math.random() * 1000);
const origin = `http://127.0.0.1:${port}`;
const proxySecret = "test-proxy-secret";
let server;

const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function request(pathname, options = {}) {
  const response = await fetch(`${origin}${pathname}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  return { response, body: await response.json().catch(() => ({})) };
}
const productHeaders = access => ({
  "x-roadquiz-proxy-secret": proxySecret,
  "x-roadquiz-product-mode": "1",
  "x-roadquiz-access": access,
});

test.before(async () => {
  server = spawn(process.execPath, ["app-server.js"], {
    cwd: path.join(__dirname, ".."),
    env: {
      ...process.env,
      PORT: String(port),
      ROADQUIZ_PROXY_SECRET: proxySecret,
      ROADQUIZ_QUESTION_MS: "2000",
      ROADQUIZ_REVEAL_MS: "4",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let ready = false;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`${origin}/api/config`);
      if (response.ok) { ready = true; break; }
    } catch {}
    await pause(25);
  }
  assert.equal(ready, true, "test server did not start");
});

test.after(() => server?.kill("SIGTERM"));

test("each global language has 1,000 structurally valid unique questions", () => {
  for (const language of ["en", "es", "de"]) {
    const questions = globalBank.questions(language);
    assert.equal(questions.length, 1000, language);
    assert.equal(new Set(questions.map(question => question.id)).size, 1000, language);
    assert.equal(new Set(questions.map(question => question.q.toLocaleLowerCase(language))).size, 1000, language);
    assert.ok(questions.every(question => question.options.length === 4));
    assert.ok(questions.every(question => Number.isInteger(question.answer) && question.answer >= 0 && question.answer < 4));
    assert.ok(questions.every(question => question.level >= 1 && question.level <= 20));
  }
});

test("legacy Render flow stays Turkish while product proxy supports all four languages", async () => {
  const legacy = await request("/api/rooms", { method: "POST", body: JSON.stringify({ language: "de" }) });
  assert.equal(legacy.response.status, 200);
  assert.equal(legacy.body.language, "tr");

  for (const language of ["en", "es", "de", "tr"]) {
    const created = await request("/api/rooms", {
      method: "POST",
      headers: productHeaders("trial"),
      body: JSON.stringify({ language }),
    });
    assert.equal(created.response.status, 200, language);
    assert.equal(created.body.language, language);
    const state = await request(`/api/rooms/${created.body.code}`);
    assert.equal(state.body.language, language);
    const page = await fetch(`${origin}/join/${created.body.code}`);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /RoadQuiz by ED LAB/);
  }
});

test("QR join, 20-question free game, scoring, podium state and premium replay", async () => {
  const created = await request("/api/rooms", {
    method: "POST",
    headers: productHeaders("trial"),
    body: JSON.stringify({ language: "en" }),
  });
  const { code, hostId } = created.body;
  assert.match(code, /^\d{6}$/);

  const joined = await request(`/api/rooms/${code}/join`, {
    method: "POST",
    body: JSON.stringify({ name: "Tester~2" }),
  });
  assert.equal(joined.response.status, 200);
  const playerId = joined.body.playerId;

  const started = await request(`/api/rooms/${code}/start`, {
    method: "POST",
    body: JSON.stringify({ hostId }),
  });
  assert.equal(started.body.gameCount, 1);

  for (let index = 0; index < 20; index += 1) {
    let state = (await request(`/api/rooms/${code}?playerId=${playerId}`)).body;
    assert.equal(state.questionIndex, index);
    assert.equal(state.total, 20);
    assert.equal(state.question.options.length, 4);
    assert.equal(state.question.answer, undefined, "answer leaked before reveal");
    const answered = await request(`/api/rooms/${code}/answer`, {
      method: "POST",
      body: JSON.stringify({ playerId, option: 0 }),
    });
    assert.equal(answered.response.status, 200);
    for (let attempt = 0; attempt < 50; attempt += 1) {
      await pause(5);
      state = (await request(`/api/rooms/${code}?playerId=${playerId}`)).body;
      if (state.phase === "finished" || state.questionIndex > index) break;
    }
  }

  const finished = (await request(`/api/rooms/${code}?playerId=${playerId}`)).body;
  assert.equal(finished.phase, "finished");
  assert.equal(finished.players.length, 1);
  assert.equal(finished.me.id, playerId);

  const blocked = await request(`/api/rooms/${code}/start`, {
    method: "POST",
    body: JSON.stringify({ hostId }),
  });
  assert.equal(blocked.response.status, 402);
  assert.equal(blocked.body.error, "payment_required");

  const replay = await request(`/api/rooms/${code}/start`, {
    method: "POST",
    headers: productHeaders("premium"),
    body: JSON.stringify({ hostId }),
  });
  assert.equal(replay.response.status, 200);
  assert.equal(replay.body.premium, true);
  assert.equal(replay.body.gameCount, 2);
});
