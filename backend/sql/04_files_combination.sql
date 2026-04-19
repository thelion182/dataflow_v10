-- Migración: agrega combination_id, subcategory y no_news a la tabla files
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='files' AND column_name='combination_id') THEN
    ALTER TABLE files ADD COLUMN combination_id UUID REFERENCES combinations(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='files' AND column_name='subcategory') THEN
    ALTER TABLE files ADD COLUMN subcategory VARCHAR(200);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='files' AND column_name='no_news') THEN
    ALTER TABLE files ADD COLUMN no_news BOOLEAN DEFAULT FALSE;
  END IF;
END $$;
