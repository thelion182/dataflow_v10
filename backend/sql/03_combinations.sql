-- ─────────────────────────────────────────────────────────────────────────────
-- Dataflow v10 — Migración: tabla combinations
-- Ejecutar sobre una DB ya con 01_schema.sql aplicado.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Simplificar sectors: ya no usamos patrones, la detección es por nombre
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='sectors' AND column_name='patterns'
  ) THEN
    ALTER TABLE sectors DROP COLUMN patterns;
  END IF;
END $$;

-- 2. Simplificar sites: ya no usamos patrones, la sede se detecta por código
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='sites' AND column_name='patterns'
  ) THEN
    ALTER TABLE sites DROP COLUMN patterns;
  END IF;
END $$;

-- 3. Tabla combinations: combinación (sede + sector + subcategoría)
--    Es la tabla núcleo de validación: solo se aceptan archivos cuya
--    combinación (sede+sector+subcategoría) exista aquí.
CREATE TABLE IF NOT EXISTS combinations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_code        VARCHAR(50) NOT NULL REFERENCES sites(code) ON DELETE CASCADE,
  sector_name      VARCHAR(200) NOT NULL,
  subcategory      VARCHAR(200),           -- NULL o vacío = "sin subcategoría"
  owner_user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  owner_username   VARCHAR(200),
  allow_no_news    BOOLEAN DEFAULT TRUE,
  active           BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(site_code, sector_name, subcategory)
);

CREATE INDEX IF NOT EXISTS idx_combinations_site ON combinations(site_code);
CREATE INDEX IF NOT EXISTS idx_combinations_active ON combinations(active);
