-- Migración 08: campo notificar_liquidado en reclamos_config
ALTER TABLE reclamos_config ADD COLUMN IF NOT EXISTS notificar_liquidado BOOLEAN DEFAULT TRUE;
