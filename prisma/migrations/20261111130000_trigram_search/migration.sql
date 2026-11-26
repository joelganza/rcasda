CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "Verse_text_trgm_idx"
  ON "Verse" USING GIN ("text" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Hymn_title_trgm_idx"
  ON "Hymn" USING GIN ("title" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Hymn_firstLine_trgm_idx"
  ON "Hymn" USING GIN ("firstLine" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "HymnStanza_text_trgm_idx"
  ON "HymnStanza" USING GIN ("text" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Lesson_title_trgm_idx"
  ON "Lesson" USING GIN ("title" gin_trgm_ops);
