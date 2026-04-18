-- ─────────────────────────────────────────────────────────────────────────────
-- Dataflow — Esquema de base de datos (PostgreSQL 15+)
-- Ejecutar una sola vez al crear la base de datos.
-- Orden: sin dependencias primero, luego tablas con FK.
-- ─────────────────────────────────────────────────────────────────────────────

-- Extensión para gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── Usuarios ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username             VARCHAR(100) UNIQUE NOT NULL,
  display_name         VARCHAR(200),
  email                VARCHAR(200),
  role                 VARCHAR(20) NOT NULL
                         CHECK (role IN ('rrhh', 'sueldos', 'admin', 'superadmin')),
  password_hash        VARCHAR(100),        -- bcrypt hash (no SHA-256 plano)
  must_change_password BOOLEAN DEFAULT TRUE,
  range_start          INTEGER,             -- rango numérico Sueldos inicio
  range_end            INTEGER,             -- rango numérico Sueldos fin
  range_txt_start      INTEGER,
  range_txt_end        INTEGER,
  login_attempts       INTEGER DEFAULT 0,
  locked_until         TIMESTAMPTZ,
  last_login_at        TIMESTAMPTZ,
  active               BOOLEAN DEFAULT TRUE,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ─── Liquidaciones (períodos) ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS periods (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL,
  year        INTEGER NOT NULL,
  month       INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  upload_from DATE,
  upload_to   DATE,
  locked      BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(year, month)
);

-- Período seleccionado por usuario (preferencia de UI)
CREATE TABLE IF NOT EXISTS user_selected_period (
  user_id   UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  period_id UUID REFERENCES periods(id) ON DELETE SET NULL
);

-- ─── Sedes ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sites (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code     VARCHAR(50) UNIQUE NOT NULL,
  name     VARCHAR(200) NOT NULL,
  patterns TEXT[],       -- patrones de detección por nombre de archivo
  active   BOOLEAN DEFAULT TRUE
);

-- ─── Sectores ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sectors (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           VARCHAR(200) NOT NULL,
  patterns       TEXT[],
  site_code      VARCHAR(50) REFERENCES sites(code) ON DELETE SET NULL,
  owner_user_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  owner_username VARCHAR(200),
  cc             VARCHAR(100),
  required_count INTEGER DEFAULT 0,
  allow_no_news  BOOLEAN DEFAULT FALSE,
  active         BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sectors_site ON sectors(site_code);

-- ─── Archivos ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS files (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id       UUID REFERENCES periods(id) ON DELETE CASCADE,
  name            VARCHAR(500) NOT NULL,
  size            BIGINT NOT NULL,
  mime_type       VARCHAR(200),
  status          VARCHAR(50) DEFAULT 'cargado',
  status_override VARCHAR(50),
  sector          VARCHAR(200),
  site_code       VARCHAR(50),
  uploader_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  uploader_name   VARCHAR(200),
  version         INTEGER DEFAULT 1,
  parent_id       UUID REFERENCES files(id) ON DELETE SET NULL,
  storage_path    VARCHAR(500),            -- ruta relativa dentro de UPLOAD_DIR
  eliminated      BOOLEAN DEFAULT FALSE,
  eliminated_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  eliminated_at   TIMESTAMPTZ,
  observations    JSONB DEFAULT '[]'::jsonb, -- dudas y arreglos (trazabilidad)
  history         JSONB DEFAULT '[]'::jsonb, -- historial de cambios de estado
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Migración segura: agrega columnas si no existen (para DBs creadas antes de esta versión)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='files' AND column_name='observations') THEN
    ALTER TABLE files ADD COLUMN observations JSONB DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='files' AND column_name='history') THEN
    ALTER TABLE files ADD COLUMN history JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_files_period ON files(period_id);
CREATE INDEX IF NOT EXISTS idx_files_status ON files(status);
CREATE INDEX IF NOT EXISTS idx_files_eliminated ON files(eliminated);

-- ─── Historial de archivos (audit log) ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS file_history (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id      UUID REFERENCES files(id) ON DELETE CASCADE,
  action       VARCHAR(100) NOT NULL,
  by_user_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  by_username  VARCHAR(200),
  details      TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_file_history_file ON file_history(file_id);
CREATE INDEX IF NOT EXISTS idx_file_history_date ON file_history(created_at DESC);

-- ─── Observaciones / Dudas ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS observation_threads (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id     UUID REFERENCES files(id) ON DELETE CASCADE,
  type        VARCHAR(20) NOT NULL CHECK (type IN ('duda', 'arreglo')),
  by_user_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  by_username VARCHAR(200),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS observation_rows (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id           UUID REFERENCES observation_threads(id) ON DELETE CASCADE,
  nro                 VARCHAR(20),
  nombre              VARCHAR(200),
  duda                TEXT,
  sector              VARCHAR(200),
  cc                  VARCHAR(100),
  answered            BOOLEAN DEFAULT FALSE,
  answer_text         TEXT,
  answered_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  answered_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Contadores de numeración (descargas Sueldos) ─────────────────────────────

CREATE TABLE IF NOT EXISTS download_counters (
  user_id   UUID REFERENCES users(id) ON DELETE CASCADE,
  period_id UUID REFERENCES periods(id) ON DELETE CASCADE,
  current   INTEGER DEFAULT 0,
  PRIMARY KEY (user_id, period_id)
);

-- Registro de archivos ya descargados por usuario
CREATE TABLE IF NOT EXISTS downloaded_files (
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  file_id       UUID REFERENCES files(id) ON DELETE CASCADE,
  downloaded_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, file_id)
);

-- Log completo de descargas
CREATE TABLE IF NOT EXISTS download_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  file_id       UUID REFERENCES files(id) ON DELETE SET NULL,
  file_name     VARCHAR(500),
  numero        INTEGER,
  downloaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_download_logs_user ON download_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_download_logs_date ON download_logs(downloaded_at DESC);

-- ─── Reclamos ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reclamos (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket             VARCHAR(30) UNIQUE NOT NULL,
  nro_funcionario    VARCHAR(20) NOT NULL,
  nombre_funcionario VARCHAR(200) NOT NULL,
  email_funcionario  VARCHAR(200),
  cargo              VARCHAR(200),
  centro_costo       VARCHAR(100),
  liquidacion        VARCHAR(100),
  para_liquidacion   VARCHAR(100),
  causal             VARCHAR(200),
  tipo_reclamo       VARCHAR(200),
  descripcion        TEXT,
  emisor_id          UUID REFERENCES users(id) ON DELETE SET NULL,
  emisor_nombre      VARCHAR(200),
  estado             VARCHAR(50) DEFAULT 'Emitido'
                       CHECK (estado IN ('Emitido', 'En proceso',
                                         'Liquidado', 'Rechazado/Duda de reclamo', 'Eliminado')),
  eliminado          BOOLEAN DEFAULT FALSE,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reclamos_estado ON reclamos(estado);
CREATE INDEX IF NOT EXISTS idx_reclamos_eliminado ON reclamos(eliminado);
CREATE INDEX IF NOT EXISTS idx_reclamos_ticket ON reclamos(ticket);

CREATE TABLE IF NOT EXISTS reclamo_historial (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reclamo_id     UUID REFERENCES reclamos(id) ON DELETE CASCADE,
  estado         VARCHAR(50) NOT NULL,
  usuario_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  usuario_nombre VARCHAR(200),
  nota           TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reclamo_historial_reclamo ON reclamo_historial(reclamo_id);

CREATE TABLE IF NOT EXISTS reclamo_notas_internas (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reclamo_id   UUID REFERENCES reclamos(id) ON DELETE CASCADE,
  texto        TEXT NOT NULL,
  autor_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  autor_nombre VARCHAR(200),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reclamo_notificaciones (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reclamo_id   UUID REFERENCES reclamos(id) ON DELETE CASCADE,
  tipo         VARCHAR(20),               -- 'email' | 'whatsapp'
  destinatario VARCHAR(200),
  contenido    TEXT,
  enviada_en   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Configuración de Reclamos ─────────────────────────────────────────────────

-- ─── Log de auditoría del sistema ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp     TIMESTAMPTZ DEFAULT NOW(),
  usuario_id    UUID,
  usuario_nombre VARCHAR(200),
  usuario_rol   VARCHAR(50),
  modulo        VARCHAR(100),
  accion        VARCHAR(100),
  entidad_id    VARCHAR(200),
  entidad_ref   VARCHAR(200),
  detalles      TEXT,
  ip            VARCHAR(100),
  ambiente      VARCHAR(200),
  resultado     VARCHAR(50) DEFAULT 'ok'
);

CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_usuario   ON audit_log(usuario_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_modulo    ON audit_log(modulo);

-- ─── Config reclamos ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reclamos_config (
  id             INTEGER PRIMARY KEY DEFAULT 1,  -- fila única
  cargos         TEXT[],
  centros_costo  TEXT[],
  liquidaciones  TEXT[],
  causales       TEXT[],
  tipos_reclamo  TEXT[],
  email_sueldos  VARCHAR(200) DEFAULT 'reclamos@circulocatolico.com.uy',
  whatsapp_activo BOOLEAN DEFAULT FALSE,
  CHECK (id = 1)   -- garantiza fila única
);
