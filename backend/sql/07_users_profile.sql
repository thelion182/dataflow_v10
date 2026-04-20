-- Migración 07: columnas de perfil de usuario (título y avatar)
ALTER TABLE users ADD COLUMN IF NOT EXISTS title VARCHAR(200);
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_data_url TEXT;
