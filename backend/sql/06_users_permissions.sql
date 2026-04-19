-- Migración 06: columna permissions JSONB en users
-- Permite persistir permisos personalizados por usuario en la base de datos.

ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB;
