# RoadQuiz country packs

RoadQuiz treats country and language as separate concepts.

Each country pack should live under `countries/<country-code-lowercase>/` and expose at least a `config.js`. Future packs can also provide country-specific question files, UI copy, categories, and validation rules without changing the core game engine.

Current default pack: `TR`.

Suggested pack structure:

- `countries/tr/config.js`
- `countries/tr/questions.js`
- `countries/us/config.js`
- `countries/us/questions.js`
- `countries/gb/config.js`
- `countries/gb/questions.js`

Question IDs should be globally unique and start with the country prefix, for example `TR-HIS-0001`, `US-GEO-0001`, `GB-CUL-0001`.

A room should store the selected country code. The question engine should receive the room country and only select from that country's pack plus any intentionally shared global pool. This keeps same-room no-repeat history isolated to the selected country.

Adding a new country should require only:

1. Add the country folder and config.
2. Add the country question pool.
3. Register the pack in `countries/registry.js`.
4. Enable it when ready for users.
