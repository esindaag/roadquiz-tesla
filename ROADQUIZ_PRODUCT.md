# RoadQuiz by ED LAB

RoadQuiz keeps the original Turkish Render experience intact and exposes the
multilingual commercial product through ED LAB at `/roadquiz`.

## Product boundary

- Direct Render traffic is deliberately limited to the original Turkish game.
- ED LAB adds a signed proxy header before English, Spanish, German or Turkish
  product rooms can be created.
- The first completed 20-question game is free. Replaying the same room requires
  a server-validated premium entitlement.
- Participants never need an entitlement; only the room owner is checked.
- Premium tokens are persisted by the browser and checked against ED LAB's D1
  entitlement record on every protected action.

## Runtime settings (Render)

| Variable | Purpose |
| --- | --- |
| `ROADQUIZ_PROXY_SECRET` | Shared high-entropy secret used only between ED LAB and Render |

`ROADQUIZ_QUESTION_MS` and `ROADQUIZ_REVEAL_MS` exist for automated tests. The
production defaults remain 15,000 ms and 4,000 ms.

## Question banks

- Turkish: the existing 1,000-question bank, unchanged.
- English and German: deterministic selections from `node-open-quiz-bank`; its
  data is CC0 and manually fact-checked by that project.
- Spanish: the same fact-checked English source selection translated with the
  Helsinki-NLP OPUS English–Spanish model. It passes structural, uniqueness,
  category and answer-index audits, but should receive native-speaker editorial
  review before the product is advertised as human-reviewed Spanish.

Every production language contains exactly 1,000 unique question texts and uses
the original Turkish category and level-count distribution. Generated files are
committed so production has no model or dataset dependency.

## Verification

Run `npm test`. Tests cover the four room languages, the legacy Turkish boundary,
six-digit rooms, joining, a complete 20-question game, scoring, finished/podium
state, the free-game limit and premium replay.
