#!/usr/bin/env python3
"""Translate a generated Open Quiz Bank JSON file with a local CT2 model."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import ctranslate2
import sentencepiece as spm


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--model", type=Path, required=True)
    parser.add_argument("--language", default="es")
    args = parser.parse_args()

    rows = json.loads(args.input.read_text())
    translator = ctranslate2.Translator(str(args.model), device="cpu", compute_type="int8")
    source = spm.SentencePieceProcessor(model_file=str(args.model / "source.spm"))
    target = spm.SentencePieceProcessor(model_file=str(args.model / "target.spm"))
    values = [value for row in rows for value in [row["q"], *row["options"]]]
    translated: list[str] = []
    batch_size = 64
    for offset in range(0, len(values), batch_size):
        batch = values[offset:offset + batch_size]
        tokens = [source.encode(value, out_type=str) + ["</s>"] for value in batch]
        results = translator.translate_batch(tokens, beam_size=4, max_batch_size=batch_size)
        translated.extend(target.decode(result.hypotheses[0]).strip() for result in results)
        print(f"translated {min(offset + batch_size, len(values))}/{len(values)}", flush=True)

    cursor = 0
    seen = set()
    output = []
    disambiguated = 0
    for index, row in enumerate(rows, start=1):
        question = translated[cursor]
        options = translated[cursor + 1:cursor + 5]
        cursor += 5
        # OPUS occasionally translates an ambiguous proper noun literally.
        # These source-aware overrides preserve language names, brands and
        # established historical battle names without changing fruit uses of
        # words such as "Apple".
        protected = {
            "English": "Inglés",
            "Spanish": "Español",
            "the Battle of the Little Bighorn": "la batalla de Little Bighorn",
            "the Battle of Wounded Knee": "la batalla de Wounded Knee",
            "the Battle of Fallen Timbers": "la batalla de Fallen Timbers",
        }
        options = [protected.get(source_value, translated_value) for source_value, translated_value in zip(row["options"], options)]
        if row["category"] == "TEC":
            options = ["Apple" if source_value == "Apple" else translated_value for source_value, translated_value in zip(row["options"], options)]
        key = question.casefold()
        if not question or key in seen:
            raise RuntimeError(f"Duplicate or empty question at {row['id']}: {question}")
        seen.add(key)
        if len(options) != 4 or any(not option for option in options):
            raise RuntimeError(f"Invalid translated options at {row['id']}: {options}")
        counts = {option.casefold(): sum(value.casefold() == option.casefold() for value in options) for option in options}
        if any(count > 1 for count in counts.values()):
            options = [f"{option} ({row['options'][index]})" if counts[option.casefold()] > 1 else option for index, option in enumerate(options)]
            disambiguated += 1
        if len({option.casefold() for option in options}) != 4:
            raise RuntimeError(f"Could not disambiguate translated options at {row['id']}: {options}")
        output.append({
            **row,
            "id": f"{args.language.upper()}-{row['category']}-{index:04d}",
            "q": question,
            "options": options,
            "source": {
                **row["source"],
                "translation": "Helsinki-NLP/opus-mt-en-es",
            },
        })
    args.output.write_text(json.dumps(output, ensure_ascii=False, separators=(",", ":")) + "\n")
    print(f"wrote {len(output)} questions to {args.output}; disambiguated option sets: {disambiguated}")


if __name__ == "__main__":
    main()
