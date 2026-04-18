-- ─────────────────────────────────────────────────────────────────────────────
-- Dataflow — Datos iniciales (seed)
-- Ejecutar DESPUÉS de 01_schema.sql.
-- IMPORTANTE: cambiar las contraseñas antes de pasar a producción.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Usuarios iniciales ────────────────────────────────────────────────────
-- Las contraseñas son bcrypt hashes de 'Admin-1234' y 'Super-1234'.
-- Para regenerarlos: node -e "const b=require('bcryptjs'); console.log(b.hashSync('Admin-1234',10));"

INSERT INTO users (username, display_name, role, password_hash, must_change_password, active)
VALUES
  ('admin',
   'Administrador',
   'admin',
   '$2a$10$undY.b4PtTl0mQ5lPGMZ8OQ4UK5tBRlcUelHQf1GMHHo/5oMI4Bie',  -- Admin-1234
   FALSE,
   TRUE),
  ('superadmin',
   'Super Administrador',
   'superadmin',
   '$2a$10$10Lise5MfpRt9zKExdbCDO4P1wjw4GIrkfg6IHKlt1Lr3gX43xtkW',  -- Super-1234
   FALSE,
   TRUE)
ON CONFLICT (username) DO UPDATE SET
  password_hash        = EXCLUDED.password_hash,
  must_change_password = EXCLUDED.must_change_password,
  login_attempts       = 0,
  locked_until         = NULL,
  active               = TRUE;

-- ─── Liquidaciones de ejemplo ──────────────────────────────────────────────

INSERT INTO periods (name, year, month, locked)
VALUES
  ('Enero 2026',   2026, 1,  FALSE),
  ('Febrero 2026', 2026, 2,  FALSE),
  ('Marzo 2026',   2026, 3,  FALSE),
  ('Abril 2026',   2026, 4,  FALSE)
ON CONFLICT (year, month) DO NOTHING;

-- ─── Configuración inicial de Reclamos ────────────────────────────────────

INSERT INTO reclamos_config (
  id,
  cargos,
  centros_costo,
  liquidaciones,
  causales,
  tipos_reclamo,
  email_sueldos,
  whatsapp_activo
)
VALUES (
  1,
  ARRAY[
    'Auxiliar Administrativo', 'Técnico Administrativo', 'Analista de RRHH',
    'Jefe de Departamento', 'Coordinador de Área', 'Asistente Contable',
    'Técnico en Salud', 'Médico', 'Enfermero/a', 'Auxiliar de Servicio'
  ],
  ARRAY[
    'CC-001 Administración Central', 'CC-002 Recursos Humanos',
    'CC-003 Sueldos y Jornales', 'CC-004 Sanatorio Galicia',
    'CC-005 Sanatorio Central', 'CC-006 Juan Pablo II',
    'CC-007 Informática', 'CC-008 Contabilidad',
    'CC-009 Gerencia General', 'CC-010 Logística'
  ],
  ARRAY[
    'Enero 2025', 'Febrero 2025', 'Marzo 2025', 'Abril 2025',
    'Mayo 2025', 'Junio 2025', 'Julio 2025', 'Agosto 2025',
    'Setiembre 2025', 'Octubre 2025', 'Noviembre 2025', 'Diciembre 2025',
    'Enero 2026', 'Febrero 2026', 'Marzo 2026'
  ],
  ARRAY[
    'Error en cálculo de horas extras', 'Diferencia en salario base',
    'Descuento incorrecto', 'Licencia no procesada',
    'Aguinaldo incorrecto', 'Prima de antigüedad no aplicada',
    'Error en datos personales', 'Asignación familiar no incluida',
    'Retención de IRPF incorrecta', 'BPS mal calculado'
  ],
  ARRAY[
    'Reclamo salarial', 'Reclamo de licencia', 'Reclamo de datos personales',
    'Reclamo de beneficio', 'Reclamo de descuento', 'Reclamo de horas extra',
    'Reclamo de aguinaldo', 'Otro'
  ],
  'reclamos@circulocatolico.com.uy',
  FALSE
)
ON CONFLICT (id) DO NOTHING;
