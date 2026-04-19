-- Agrega columna cc (centro de costo) a la tabla combinations
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='combinations' AND column_name='cc') THEN
    ALTER TABLE combinations ADD COLUMN cc VARCHAR(100);
  END IF;
END $$;
