# Session History

## Completed

- Added persistent Docker bind mounts for project-root `archives/` and `outputs/` folders.
- Configured Docker to use `/app/archives` as the default dataset root.
- Started the Docker API successfully on `http://localhost:8000`.
- Added speaker-aware NER handling so screenplay dialogue speakers are promoted to `PERSON` instead of being misclassified as `ORGANIZATION`.
- Added an optional semantic entity-resolution layer. When an LLM API key is configured, it reviews high-priority NER candidates using screenplay context and can classify entities as `PERSON`, `LOCATION`, `ORGANIZATION`, `OBJECT`, or `OTHER`.
- Confirmed that corrupted/OCR-heavy Hindi screenplay text (for example, *3 Idiots*) produces invalid English spaCy NER results. These garbage strings should not be shown as organizations.

## Important Current Limitations

- The raw dataset is not currently present in `archives/`; the corpus index still contains old Windows paths for some scripts.
- English spaCy NER is unsuitable for Hindi, transliterated Hindi, and heavily OCR-corrupted screenplay text.
- Some screenplay action lines can resemble speaker headings. Speaker matching must remain conservative so action phrases are not promoted to character names.
- Existing cached output files may contain older NER labels and should only be regenerated deliberately after the raw dataset is available.

## Next Session Priorities

1. **Semantic layer for Named Entity organizations**
   - Add quality filtering before NER to drop OCR garbage and unreadable fragments.
   - Detect script language and use multilingual/Indic NER, or transliterate/translate Hindi before analysis.
   - Add semantic entity validation for `ORGANIZATION` candidates, so roles, objects, locations, sound effects, and malformed text are not shown as organizations.
   - Keep the entity types explicit: `PERSON`, `LOCATION`, `ORGANIZATION`, `OBJECT`, `ROLE`, and `OTHER`.

2. **Semantic analysis for topics and keywords**
   - Add a script-level semantic topic pass after the existing KeyBERT/RAKE extraction.
   - Consolidate duplicate and near-duplicate keywords into canonical topics.
   - Remove names, OCR noise, generic screenplay terms, and isolated fragments from topics.
   - Generate a small set of meaningful narrative themes using scene context and the overall script arc.

## Recommended Order

1. Restore/copy the raw dataset into the project-root `archives/` directory.
2. Implement text-quality and language detection.
3. Improve named-entity filtering and semantic entity resolution.
4. Add semantic topic and keyword consolidation.
5. Retag selected scripts and compare their cached outputs before retagging the full corpus.

## Latest session changes

- Organization entities are now filtered out of the frontend Named Entities explorer; people and places remain visible.
- Added `src/semantic_topics.py`, an optional whole-script semantic refinement pass for canonical narrative topics and searchable keywords. It filters screenplay/OCR noise and falls back to the existing extractive output when no LLM is configured or the response is invalid.
