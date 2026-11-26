# RoadQuiz question data notices

The global English and German question banks are derived from
`open-quiz-bank` 1.0.1.

- Question data: CC0 1.0 Universal
- Source code used by the generation pipeline: MIT
- Source repository: https://github.com/tamino-martinius/node-open-quiz-bank

The selected questions preserve the original source question ID in each JSON
record. RoadQuiz filters time-sensitive and Turkey-specific prompts, validates
unique questions and answer choices, and applies the product's fixed category
and difficulty distribution.

The Spanish bank is translated locally from the selected English bank with
`Helsinki-NLP/opus-mt-en-es` and includes source-ID keyed editorial corrections
for ambiguous titles, terminology, and non-idiomatic output. Each translated
record identifies the translation model in its source metadata.
