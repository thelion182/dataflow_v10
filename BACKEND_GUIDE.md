# Guía de integración de backend — Dataflow

**Para el equipo de Cómputos**  
Versión del frontend: v8 · Preparado por: RRHH / Leonel Figuera

---

## 1. Qué es este sistema

Dataflow es una aplicación web interna para la Gerencia de RRHH de Círculo Católico.

| Módulo | Quién lo usa | Qué hace |
|--------|-------------|----------|
| **Información** | RRHH ↔ Sueldos | Subida, descarga y control de archivos de liquidación |
| **Reclamos** | RRHH ↔ Sueldos | Gestión de reclamos de haberes con historial y notas internas |

El frontend es **React 19 + TypeScript + Vite**, SPA, sin servidor propio.  
Actualmente funciona con `localStorage` (sin backend). Esta versión (v8) tiene **toda la capa de datos abstracta y lista para conectar** a un backend real con una sola variable de entorno.

---

## 2. Estructura del repositorio

```
Dataflow_v8/
├── src/                         ← Frontend React (no tocar para conectar backend)
│   └── services/
│       ├── db.ts                ← PUNTO ÚNICO DE MIGRACIÓN (switch automático)
│       ├── api/                 ← Skeletons de fetch() — ya creados y documentados
│       │   ├── client.ts        ← fetch helper con Bearer token
│       │   ├── filesAPI.ts
│       │   ├── sectorsAPI.ts
│       │   ├── downloadsAPI.ts
│       │   ├── periodsAPI.ts
│       │   ├── usersAPI.ts
│       │   ├── reclamosAPI.ts
│       │   └── reclamosConfigAPI.ts
│       └── localStorage/        ← implementación actual (sin backend)
├── backend/                     ← Skeleton de Node.js/Express — YA CREADO
│   ├── src/
│   │   ├── index.js             ← entrada Express, CORS, sesión, rutas
│   │   ├── db.js                ← pool PostgreSQL
│   │   ├── middleware/auth.js   ← requireAuth, requireRole
│   │   └── routes/
│   │       ├── auth.js          ← POST login, POST logout, GET me
│   │       ├── users.js         ← CRUD usuarios
│   │       ├── periods.js       ← CRUD liquidaciones
│   │       ├── sectors.js       ← CRUD sectores y sedes
│   │       ├── files.js         ← archivos: upload, download, status, audit
│   │       ├── downloads.js     ← contadores atómicos, logs
│   │       └── reclamos.js      ← CRUD reclamos + config
│   ├── sql/
│   │   ├── 01_schema.sql        ← esquema completo PostgreSQL
│   │   └── 02_seed.sql          ← datos iniciales (usuarios, períodos, config)
│   ├── package.json
│   ├── Dockerfile
│   └── .env.example
├── docker-compose.yml           ← levanta PostgreSQL + backend con un comando
└── .env.example                 ← variables de entorno del frontend
```

---

## 3. Cómo conectar el backend en 5 pasos

### Paso 1 — Clonar y preparar entornos

```bash
# Frontend
cp .env.example .env.local
# Editar .env.local:
#   VITE_USE_API=true
#   VITE_API_URL=http://localhost:3000/api

# Backend
cd backend
cp .env.example .env
# Editar .env con la URL de la base de datos y SESSION_SECRET
```

### Paso 2 — Levantar con Docker (recomendado)

```bash
# Desde la raíz del proyecto
docker compose up -d

# Crear esquema y datos iniciales
docker compose exec db psql -U dataflow_user -d dataflow -f /sql/01_schema.sql
docker compose exec db psql -U dataflow_user -d dataflow -f /sql/02_seed.sql
```

### Paso 3 — O levantar manualmente sin Docker

```bash
# Requiere: Node.js 20+, PostgreSQL 15+
cd backend
npm install

# Crear la base de datos
createdb dataflow
psql dataflow -f sql/01_schema.sql
psql dataflow -f sql/02_seed.sql

# Levantar el backend
node src/index.js
# → http://localhost:3000
```

### Paso 4 — Levantar el frontend

```bash
# Desde la raíz
npm install
npm run dev
# → http://localhost:5173
```

### Paso 5 — Verificar

```bash
# Health check del backend:
curl http://localhost:3000/api/health
# → {"status":"ok","version":"1.0.0"}

# Login de prueba:
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin-1234"}'
```

**Todo el frontend cambia automáticamente de localStorage a API** — sin tocar ningún componente, hook ni modal.

---

## 4. Stack recomendado

| Componente | Recomendación | Ya incluido |
|---|---|---|
| **Runtime** | Node.js 20 LTS | ✅ package.json |
| **Framework** | Express 4 | ✅ backend/src/index.js |
| **Base de datos** | PostgreSQL 15+ | ✅ sql/01_schema.sql |
| **Auth hashing** | bcryptjs | ✅ routes/auth.js |
| **Sesiones** | express-session | ✅ (en memoria dev, pg en prod) |
| **Upload** | multer | ✅ routes/files.js |
| **Contenedor** | Docker + Compose | ✅ docker-compose.yml |
| **Servidor web** | nginx (proxy) | Ver sección 9 |
| **LDAP/AD** | passport-ldapauth | Ver sección 7 |

---

## 5. Modelos de datos (PostgreSQL)

El esquema completo está en `backend/sql/01_schema.sql`.  
Resumen de tablas:

| Tabla | Descripción |
|-------|-------------|
| `users` | Usuarios del sistema con roles, rangos numéricos y lockout |
| `periods` | Liquidaciones (nombre, año, mes, fechas de carga, bloqueo) |
| `sites` | Sedes (código único, nombre, patrones de detección) |
| `sectors` | Sectores con patrones, responsable, centro de costo |
| `files` | Archivos subidos con metadatos, versión, soft-delete |
| `file_history` | Audit log de operaciones sobre archivos |
| `observation_threads` | Hilos de dudas/arreglos por archivo |
| `observation_rows` | Filas individuales de cada duda |
| `download_counters` | Contador numérico por usuario+período (atómico) |
| `downloaded_files` | Registro de qué archivos descargó cada usuario |
| `download_logs` | Log completo de descargas |
| `reclamos` | Tickets de reclamos de haberes (incluye campo `adjuntos` JSON y `para_liquidacion`) |
| `reclamo_historial` | Historial de cambios de estado |
| `reclamo_notas_internas` | Notas privadas RRHH/Sueldos |
| `reclamo_notificaciones` | Registro de emails/WhatsApp simulados |
| `reclamos_config` | Configuración del módulo (incluye campo `notificar_liquidado` boolean) |
| `audit_log` | Log de auditoría: login, logout, reclamos, etc. (ver sección 6 — Auditoría) |
| `user_selected_period` | Período seleccionado por usuario (preferencia UI) |

---

## 6. Endpoints de API — referencia completa

### Base URL: `http://servidor/api`
### Autenticación: cookie de sesión HttpOnly (o `Authorization: Bearer <token>`)

---

### Autenticación

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| `POST` | `/auth/login` | todos | Login usuario/contraseña |
| `POST` | `/auth/logout` | autenticado | Cerrar sesión |
| `GET`  | `/auth/me` | autenticado | Usuario de la sesión actual |
| `GET`  | `/auth/session` | autenticado | `{ userId }` — usado por el frontend |
| `PUT`  | `/auth/session` | autenticado | Guardar/limpiar sesión |

**POST /auth/login — body:**
```json
{ "username": "admin", "password": "Admin-1234" }
```
**Response:**
```json
{
  "id": "uuid", "username": "admin", "displayName": "Administrador",
  "role": "admin", "mustChangePassword": true
}
```

---

### Usuarios

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| `GET`    | `/users` | admin, superadmin | Lista todos los usuarios |
| `PUT`    | `/users` | superadmin | Sincronización completa |
| `GET`    | `/users/:id` | admin, propio | Obtiene usuario por ID |
| `PUT`    | `/users/:id` | admin, superadmin | Crea o actualiza usuario |

---

### Liquidaciones (Períodos)

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| `GET` | `/periods` | todos | Lista períodos |
| `PUT` | `/periods` | admin, superadmin | Sincronización completa |
| `GET` | `/periods/selected` | autenticado | Período seleccionado del usuario |
| `PUT` | `/periods/selected` | autenticado | Guardar período seleccionado |

**Nota:** El campo `locked` solo puede modificarlo `admin` o `superadmin`.

---

### Archivos — Módulo Información ⭐ (prioridad máxima)

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| `GET`    | `/files?periodId=` | todos | Lista archivos (filtrar por período) |
| `PUT`    | `/files` | admin, superadmin | Sincronización de metadatos |
| `POST`   | `/files/upload` | rrhh, admin | Subida de archivo (multipart) |
| `GET`    | `/files/audit` | todos | Historial de auditoría |
| `PUT`    | `/files/audit` | superadmin | No-op (el backend escribe el audit) |
| `POST`   | `/files/audit` | autenticado | No-op (ídem) |
| `GET`    | `/files/:id/download` | todos | Descarga el binario |
| `PUT`    | `/files/:id/status` | sueldos, admin | Cambia estado |
| `DELETE` | `/files/:id` | admin (soft), superadmin + `?hard=true` (físico) | Elimina archivo |

**POST /files/upload — multipart/form-data:**
```
file:     <binario>
periodId: "uuid-de-la-liquidacion"
sector:   "Emergencia"
siteCode: "SEDE01"
fileId:   "uuid-opcional"   ← si se conoce de antemano
```

---

### Sectores y Sedes

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| `GET` | `/sectors` | todos | Lista sectores |
| `PUT` | `/sectors` | admin, superadmin | Sincronización completa |
| `GET` | `/sites` | todos | Lista sedes |
| `PUT` | `/sites` | admin, superadmin | Sincronización completa |

---

### Descargas y Contadores de Numeración

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| `GET` | `/downloads/counters` | autenticado | Contadores del usuario actual |
| `PUT` | `/downloads/counters` | autenticado | Actualiza contadores |
| `GET` | `/downloads/downloaded` | autenticado | Archivos ya descargados |
| `PUT` | `/downloads/downloaded` | autenticado | Marca archivos como descargados |
| `GET` | `/downloads/logs` | admin, superadmin | Historial de descargas |
| `PUT` | `/downloads/logs` | admin, superadmin | No-op (el backend escribe los logs) |

**Atomicidad de contadores — CRÍTICO:**
```sql
-- En routes/downloads.js — función incrementCounter()
-- SELECT FOR UPDATE garantiza unicidad entre descargas simultáneas
INSERT INTO download_counters (user_id, period_id, current)
VALUES ($1, $2, 1)
ON CONFLICT (user_id, period_id) DO UPDATE
  SET current = download_counters.current + 1;

SELECT current FROM download_counters
WHERE user_id = $1 AND period_id = $2 FOR UPDATE;
```

---

### Reclamos

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| `GET`    | `/reclamos` | rrhh, sueldos, admin | Lista todos los reclamos |
| `POST`   | `/reclamos` | rrhh, admin | Crea reclamo |
| `GET`    | `/reclamos/config` | todos | Configuración del módulo |
| `PUT`    | `/reclamos/config` | admin, superadmin | Guarda configuración |
| `GET`    | `/reclamos/:id` | todos | Detalle de reclamo |
| `PATCH`  | `/reclamos/:id` | autenticado | Actualiza campos |
| `DELETE` | `/reclamos/:id` | rrhh, admin | Soft delete (permisos por rol — ver nota) |
| `POST`   | `/reclamos/:id/estado` | autenticado | Cambia estado |
| `POST`   | `/reclamos/:id/notificaciones` | autenticado | Registra notificación |
| `POST`   | `/reclamos/:id/notas` | autenticado | Agrega nota interna |

**Notas sobre lógica de negocio para el backend:**

- **Estados válidos:** `Emitido`, `En proceso`, `Liquidado`, `Rechazado/Duda de reclamo`, `Eliminado`
- **Permisos de eliminar:** `rrhh` solo puede eliminar si `estado === 'Emitido'`; `admin`/`superadmin` pueden eliminar cualquier estado activo; `sueldos` no puede eliminar
- **Permisos de cambiar estado:** `sueldos` puede cambiar a `En proceso`, `Liquidado`, `Rechazado/Duda de reclamo`; `rrhh` solo puede cambiar de `Rechazado/Duda de reclamo` → `Emitido`; `admin`/`superadmin` sin restricción
- **Auto En proceso:** cuando `sueldos` visualiza un reclamo en estado `Emitido`, el frontend lo cambia automáticamente a `En proceso` — el backend debe aceptar este cambio normalmente
- **Campo `adjuntos`:** array JSON `[{ id, nombre, tipo, tamaño, datos }]` donde `datos` es un base64 data URL. En producción considerar moverlos a almacenamiento de archivos (S3, disco)
- **Campo `para_liquidacion`:** nombre de la liquidación en la que se acreditará el reclamo (texto libre)
- **Notificar al liquidar:** `reclamos_config.notificar_liquidado` (boolean). Si es `true` y el estado pasa a `Liquidado`, el backend debería enviar email real al `email_funcionario` del reclamo

---

### Auditoría

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| `GET`    | `/audit` | superadmin | Lista entradas del log (soportar query params: `modulo`, `accion`, `resultado`, `usuarioId`, `desde`, `hasta`) |
| `POST`   | `/audit` | autenticado | Registra una entrada (body: `AuditEntry`) |
| `DELETE` | `/audit` | superadmin | Limpia el log completo |

**Estructura de `AuditEntry`:**
```json
{
  "id": "uuid",
  "timestamp": "2026-04-10T14:30:00.000Z",
  "usuarioId": "uuid-del-usuario",
  "usuarioNombre": "Leonel Figuera",
  "usuarioRol": "rrhh",
  "modulo": "reclamos",
  "accion": "crear_reclamo",
  "entidadId": "uuid-del-reclamo",
  "entidadRef": "RC-20260410-4521",
  "detalles": "Funcionario: Juan Pérez · Tipo: Diferencia de haberes",
  "ip": "192.168.1.10",
  "ambiente": "Windows 10/11 · Chrome 124",
  "resultado": "ok"
}
```

**Valores de `modulo`:** `auth` | `reclamos` | `archivos` | `usuarios` | `liquidaciones` | `sectores` | `config`  
**Valores de `accion`:** `login` | `login_fallido` | `login_bloqueado` | `logout` | `crear_reclamo` | `cambiar_estado` | `eliminar_reclamo` | `hard_delete` | `reset_period`  
**Valores de `resultado`:** `ok` | `error` | `bloqueado`

**Nota sobre IP:** En el frontend la IP siempre llega como `"N/D"`. El backend puede sobreescribir este campo con `req.ip` o `X-Forwarded-For` al recibir el POST, así la IP real queda registrada sin depender del cliente.

**Tabla SQL sugerida:**
```sql
CREATE TABLE audit_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  usuario_id    UUID,
  usuario_nombre TEXT,
  usuario_rol   TEXT,
  modulo        TEXT NOT NULL,
  accion        TEXT NOT NULL,
  entidad_id    UUID,
  entidad_ref   TEXT,
  detalles      TEXT,
  ip            TEXT,
  ambiente      TEXT,
  resultado     TEXT NOT NULL DEFAULT 'ok'
);

CREATE INDEX idx_audit_timestamp  ON audit_log (timestamp DESC);
CREATE INDEX idx_audit_usuario    ON audit_log (usuario_id);
CREATE INDEX idx_audit_modulo     ON audit_log (modulo);
CREATE INDEX idx_audit_accion     ON audit_log (accion);
```

---

## 7. Autenticación con Active Directory / LDAP

Si la empresa tiene Active Directory, reemplazar la sección de validación de contraseña en `backend/src/routes/auth.js`:

```bash
cd backend
npm install passport passport-ldapauth
```

```javascript
// backend/src/routes/auth.js — reemplazar la validación bcrypt por:
const LdapStrategy = require('passport-ldapauth');

const LDAP_OPTS = {
  server: {
    url:           process.env.LDAP_URL,
    bindDN:        process.env.LDAP_BIND_DN,
    bindCredentials: process.env.LDAP_BIND_PASSWORD,
    searchBase:    process.env.LDAP_BASE_DN,
    searchFilter:  '(sAMAccountName={{username}})',   // AD
  },
};

router.post('/login', (req, res, next) => {
  passport.authenticate('ldapauth', { session: false }, (err, user) => {
    if (err || !user) return res.status(401).json({ error: 'Credenciales inválidas' });
    req.session.userId = user.id;   // mapear atributo LDAP al ID de la tabla users
    req.session.role   = user.role;
    res.json({ id: user.id, username: user.sAMAccountName, role: user.role });
  })(req, res, next);
});
```

Variables en `backend/.env`:
```env
LDAP_URL=ldap://ad.circulocatolico.com.uy
LDAP_BASE_DN=dc=circulocatolico,dc=com,dc=uy
LDAP_BIND_DN=cn=dataflow-service,ou=servicios,dc=circulocatolico,dc=com,dc=uy
LDAP_BIND_PASSWORD=clave-del-usuario-de-servicio
```

---

## 8. Almacenamiento de archivos

Los archivos binarios se guardan en disco bajo `UPLOAD_DIR` (configurado en `.env`).

**Estructura de directorios:**
```
uploads/
  {periodId}/
    {uuid}.csv
    {uuid}.xlsx
    {uuid}.txt
```

**Para producción con nginx** (más eficiente — nginx sirve los archivos directamente):

```nginx
# nginx.conf
location /api/ {
  proxy_pass http://localhost:3000;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
}

# Descarga de archivos protegida — nginx sirve directamente
location /files-privados/ {
  internal;
  alias /var/dataflow/uploads/;
}
```

En `backend/src/routes/files.js`, activar el bloque X-Accel-Redirect (comentado):
```javascript
// Reemplazar res.sendFile() por:
res.setHeader('X-Accel-Redirect', `/files-privados/${file.storage_path}`);
res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
res.send();
```

---

## 9. Configuración de producción

### Variables de entorno del backend (`backend/.env`)

```env
DATABASE_URL=postgresql://dataflow_user:CLAVE@localhost:5432/dataflow
SESSION_SECRET=cadena-aleatoria-de-al-menos-32-caracteres
UPLOAD_DIR=/var/dataflow/uploads
FRONTEND_URL=https://dataflow.circulocatolico.com.uy
PORT=3000
NODE_ENV=production

# LDAP/AD (si aplica)
LDAP_URL=ldap://ad.circulocatolico.com.uy
LDAP_BASE_DN=dc=circulocatolico,dc=com,dc=uy
LDAP_BIND_DN=cn=dataflow-service,ou=servicios,...
LDAP_BIND_PASSWORD=...
```

### Sesiones persistentes en PostgreSQL (recomendado para producción)

```bash
cd backend && npm install connect-pg-simple
```

En `backend/src/index.js`, descomentar las líneas de `pgSession`.

### CORS

Ya configurado en `index.js` para aceptar el dominio del frontend:
```javascript
cors({ origin: process.env.FRONTEND_URL, credentials: true })
```

### Seguridad de cookies

Ya configurado en `index.js`:
```javascript
cookie: {
  httpOnly: true,         // protege contra XSS
  secure: true,           // solo HTTPS (en producción)
  sameSite: 'strict',     // protege contra CSRF
  maxAge: 8 * 60 * 60 * 1000,  // 8 horas
}
```

---

## 10. Checklist para la primera versión funcional

### Infraestructura
- [ ] Servidor con Node.js 20+ y PostgreSQL 15+
- [ ] Ejecutar `01_schema.sql` y `02_seed.sql`
- [ ] Carpeta `/var/dataflow/uploads/` con permisos de escritura
- [ ] nginx configurado como proxy reverso (puerto 443, HTTPS)

### Backend
- [ ] `cd backend && cp .env.example .env` (completar DATABASE_URL y SESSION_SECRET)
- [ ] `npm install`
- [ ] Verificar: `curl http://localhost:3000/api/health` → `{"status":"ok"}`
- [ ] Verificar login: `POST /api/auth/login` con `admin / Admin-1234`

### Frontend
- [ ] `cp .env.example .env.local`
- [ ] Editar: `VITE_USE_API=true` y `VITE_API_URL=http://tu-servidor/api`
- [ ] `npm run dev` (desarrollo) o `npm run build` (producción)
- [ ] Verificar que el login funciona en el navegador

### Módulos (orden recomendado de verificación)
- [ ] Login / logout
- [ ] Liquidaciones (crear, bloquear)
- [ ] Subida de archivos (módulo Información)
- [ ] Descarga de archivos + numeración
- [ ] Sectores y sedes
- [ ] Usuarios (admin)
- [ ] Reclamos (crear, cambiar estado, adjuntos, notas internas)
- [ ] Auditoría (POST /audit desde frontend, GET /audit en dashboard superadmin)

---

## 11. Migración de datos existentes (localStorage → base de datos)

Si hay datos cargados en localStorage del navegador que se quieren migrar:

1. Abrir la app en el navegador (con `VITE_USE_API=false` todavía)
2. Abrir DevTools → Application → Local Storage
3. Copiar el valor de cada clave (ver mapa en CLAUDE.md sección "Persistencia")
4. Crear un script de migración SQL con los JSON extraídos
5. Insertar en las tablas correspondientes
6. Cambiar a `VITE_USE_API=true`

O alternativamente: la primera vez que el usuario use la app con backend, los datos de localStorage quedan huérfanos en el navegador — no pasan al backend. Si los datos son importantes, hacer la migración manual.

---

## 12. Notas sobre cambios futuros al frontend

Cuando se implemente una nueva feature que necesite datos del backend:

1. Agregar la función al archivo `src/services/api/xxxAPI.ts` correspondiente
2. Agregar la misma función a `src/services/localStorage/xxxStorage.ts` (versión local)
3. Agregar el mapeo en `src/services/db.ts`
4. El hook o componente usa `db.xxx.nuevaFuncion()` sin saber si es API o localStorage

Este patrón garantiza que el sistema siempre funcione en modo sin backend.

---

*Ante cualquier duda sobre la arquitectura del frontend, consultar a Leonel Figuera (RRHH).*  
*Repositorio: https://github.com/thelion182/Dataflow_v8*
