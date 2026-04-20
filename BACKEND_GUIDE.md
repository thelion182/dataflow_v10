# Guía de integración de backend — Dataflow

**Para el equipo de Cómputos**  
Versión del frontend: v10 · Preparado por: RRHH / Leonel Figuera

---

## 1. Qué es este sistema

Dataflow es una aplicación web interna para la Gerencia de RRHH de Círculo Católico.

| Módulo | Quién lo usa | Qué hace |
|--------|-------------|----------|
| **Información** | RRHH ↔ Sueldos | Subida, descarga y control de archivos de liquidación |
| **Reclamos** | RRHH ↔ Sueldos | Gestión de reclamos de haberes con historial y notas internas |

El frontend es **React 19 + TypeScript + Vite**, SPA, sin servidor propio.  
Funciona con `localStorage` (sin backend) o conectado a un backend real con una sola variable de entorno (`VITE_USE_API=true`).

---

## 2. Estructura del repositorio

```
Dataflow_v10/
├── src/                             ← Frontend React
│   ├── app/DataFlowDemo.tsx         ← Componente raíz
│   ├── hooks/
│   │   ├── useFiles.ts              ← Upload binario al backend en modo API
│   │   ├── useDownloads.ts          ← Descarga con numeración Sueldos vía API
│   │   └── useSSE.ts                ← Notificaciones en tiempo real (SSE)
│   ├── lib/
│   │   ├── auth.ts                  ← login, sesión, usuarios (punto de migración a AD/LDAP)
│   │   └── perms.ts                 ← permisos por rol (ROLE_DEFAULT_PERMISSIONS)
│   └── services/
│       ├── db.ts                    ← PUNTO ÚNICO DE MIGRACIÓN (switch automático)
│       ├── api/                     ← Implementaciones fetch()
│       │   ├── client.ts            ← fetch helper (credentials: include, hostname dinámico)
│       │   ├── filesAPI.ts
│       │   ├── sectorsAPI.ts
│       │   ├── downloadsAPI.ts
│       │   ├── periodsAPI.ts
│       │   ├── usersAPI.ts
│       │   ├── reclamosAPI.ts
│       │   └── reclamosConfigAPI.ts
│       └── localStorage/            ← implementación alternativa sin backend
├── backend/                         ← Node.js/Express — completamente funcional
│   ├── src/
│   │   ├── index.js                 ← entrada Express, CORS dinámico, sesión, rutas
│   │   ├── db.js                    ← pool PostgreSQL
│   │   ├── middleware/auth.js       ← requireAuth, requireRole
│   │   └── routes/
│   │       ├── auth.js              ← login (bcrypt+lockout), logout, /me, /profile, change-password
│   │       ├── users.js             ← CRUD usuarios con rangos y permisos JSONB
│   │       ├── periods.js           ← CRUD liquidaciones
│   │       ├── sectors.js           ← CRUD sectores y sedes
│   │       ├── combinations.js      ← combinaciones sede+sector+CC
│   │       ├── files.js             ← upload binario (multer), download, SSE, audit
│   │       ├── downloads.js         ← contadores atómicos, logs de descarga
│   │       ├── reclamos.js          ← CRUD reclamos + config + historial + notas
│   │       ├── events.js            ← Server-Sent Events (SSE)
│   │       └── audit.js             ← log de auditoría del sistema
│   ├── sql/
│   │   ├── 01_schema.sql            ← esquema completo PostgreSQL (base)
│   │   ├── 02_seed.sql              ← usuarios iniciales (admin/Admin-1234, superadmin/Super-1234)
│   │   ├── 03_combinations.sql      ← tabla combinations
│   │   ├── 04_files_combination.sql ← columnas combination_id y subcategory en files
│   │   ├── 05_combinations_cc.sql   ← columna cc (centro de costo) en combinations
│   │   ├── 06_users_permissions.sql ← columna permissions JSONB en users
│   │   └── 07_users_profile.sql     ← columnas title y avatar_data_url en users
│   ├── package.json
│   ├── Dockerfile
│   └── .env.example
├── docker-compose.yml               ← levanta PostgreSQL + backend con un comando
└── .env.example                     ← variables de entorno del frontend
```

---

## 3. Cómo levantar el sistema (demo en red local)

### Paso 1 — Variables de entorno

```bash
# Frontend (.env.local en la raíz del proyecto)
VITE_USE_API=true
VITE_API_URL=http://localhost:3001/api

# Backend (backend/.env)
DATABASE_URL=postgresql://dataflow:dataflow123@localhost:5432/dataflow
SESSION_SECRET=cadena-aleatoria-32-caracteres
UPLOAD_DIR=./uploads
PORT=3001
```

### Paso 2 — Levantar con Docker

```bash
# Desde la raíz del proyecto
docker compose up -d

# Primera vez: crear esquema y datos iniciales
docker compose exec db psql -U dataflow -d dataflow -f /sql/01_schema.sql
docker compose exec db psql -U dataflow -d dataflow -f /sql/02_seed.sql

# Migraciones incrementales (aplicar en orden si la BD ya existe)
docker compose exec db psql -U dataflow -d dataflow -f /sql/03_combinations.sql
docker compose exec db psql -U dataflow -d dataflow -f /sql/04_files_combination.sql
docker compose exec db psql -U dataflow -d dataflow -f /sql/05_combinations_cc.sql
docker compose exec db psql -U dataflow -d dataflow -f /sql/06_users_permissions.sql
docker compose exec db psql -U dataflow -d dataflow -f /sql/07_users_profile.sql
```

### Paso 3 — Frontend

```bash
npm install
npm run dev   # accesible en http://localhost:5173
              # y en http://<IP-de-la-PC>:5173 desde otros dispositivos de la red
```

### Paso 4 — Verificar

```bash
# Health check
curl http://localhost:3001/api/health
# → {"status":"ok","version":"1.0.0","env":"development"}

# Usuarios iniciales tras el seed:
#   admin      / Admin-1234
#   superadmin / Super-1234

# Si admin queda bloqueado (5 intentos fallidos), desbloquear:
docker compose exec db psql -U dataflow -d dataflow \
  -c "UPDATE users SET login_attempts=0, locked_until=NULL WHERE username='admin';"

# Si hay que resetear la contraseña de admin:
docker compose exec backend node -e \
  "const b=require('bcryptjs'); b.hash('Admin-1234',10).then(h=>console.log(h));"
# Luego:
docker compose exec db psql -U dataflow -d dataflow \
  -c "UPDATE users SET password_hash='<hash>', login_attempts=0, locked_until=NULL WHERE username='admin';"
```

### Acceso desde Mac / iPhone en la misma red WiFi

El frontend reemplaza automáticamente `localhost` por el hostname real del navegador en todas las URLs de API (ver `src/services/api/client.ts`, `src/lib/auth.ts`, `src/hooks/useSSE.ts`, `src/hooks/useDownloads.ts`).

Solo hay que acceder desde el otro dispositivo a `http://<IP-de-la-PC>:5173`.

Para ver la IP de la PC: `ipconfig` → buscar IPv4 en la red WiFi.  
En Windows: verificar que el firewall permite los puertos 5173 y 3001.

---

## 4. Stack

| Componente | Tecnología | Dónde |
|---|---|---|
| **Runtime** | Node.js 20 LTS | backend/ |
| **Framework** | Express 4 | backend/src/index.js |
| **Base de datos** | PostgreSQL 15+ | docker-compose.yml |
| **Auth hashing** | bcryptjs (bcrypt) | routes/auth.js |
| **Sesiones** | express-session + cookie HttpOnly | index.js |
| **Upload** | multer (disco local) | routes/files.js |
| **Notificaciones** | Server-Sent Events (SSE) | routes/events.js |
| **Contenedor** | Docker + Compose | docker-compose.yml |
| **Servidor web prod** | nginx (proxy reverso) | Ver sección 10 |
| **LDAP/AD** | passport-ldapauth (opcional) | Ver sección 8 |

---

## 5. Modelos de datos (PostgreSQL)

El esquema completo está en `backend/sql/01_schema.sql` + migraciones 03–07.

| Tabla | Descripción |
|-------|-------------|
| `users` | Usuarios con roles, rangos numéricos, lockout, perfil (title, avatar) y permisos JSONB |
| `periods` | Liquidaciones (nombre, año, mes, fechas de ventana de carga, bloqueo) |
| `sites` | Sedes (código único, nombre, patrones de detección automática por nombre de archivo) |
| `sectors` | Sectores con patrones, responsable, centro de costo |
| `combinations` | Combinaciones sede+sector+subcategoría+CC para subida de archivos |
| `files` | Archivos subidos con metadatos, versión, ruta en disco, soft-delete |
| `file_history` | Audit log de operaciones sobre archivos (subida, descarga, cambio de estado) |
| `download_counters` | Contador numérico por usuario+período (atómico con SELECT FOR UPDATE) |
| `downloaded_files` | Registro de qué archivos descargó cada usuario |
| `download_logs` | Log completo de descargas |
| `reclamos` | Tickets de reclamos de haberes (adjuntos JSON, historial, notas internas) |
| `reclamo_historial` | Historial de cambios de estado |
| `reclamo_notas_internas` | Notas privadas RRHH/Sueldos |
| `reclamo_notificaciones` | Registro de emails/WhatsApp simulados |
| `reclamos_config` | Configuración del módulo (causales, tipos, email, notificar al liquidar) |
| `audit_log` | Log de auditoría: login, logout, reclamos, etc. |
| `user_selected_period` | Período seleccionado por usuario (preferencia UI) |

**Columnas de la tabla `users`:**
```sql
id                UUID PRIMARY KEY
username          VARCHAR(100) UNIQUE NOT NULL
display_name      VARCHAR(200)
email             VARCHAR(200)
role              VARCHAR(50)          -- 'rrhh' | 'sueldos' | 'admin' | 'superadmin'
password_hash     TEXT
must_change_password BOOLEAN DEFAULT FALSE
active            BOOLEAN DEFAULT TRUE
login_attempts    INTEGER DEFAULT 0
locked_until      TIMESTAMPTZ
last_login_at     TIMESTAMPTZ
range_start       INTEGER              -- inicio del rango de numeración de descarga
range_end         INTEGER
range_txt_start   INTEGER
range_txt_end     INTEGER
permissions       JSONB                -- null = usar defaults de rol; si no null, se fusiona con defaults
title             VARCHAR(200)         -- cargo visible en el perfil (migración 07)
avatar_data_url   TEXT                 -- foto de perfil base64 data URL (migración 07)
created_at        TIMESTAMPTZ DEFAULT NOW()
```

---

## 6. Endpoints de API — referencia completa

### Base URL: `http://servidor/api`
### Autenticación: cookie de sesión HttpOnly (`credentials: 'include'` en todos los fetch)

---

### Autenticación (`/api/auth`)

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| `POST` | `/auth/login` | todos | Login usuario/contraseña. Devuelve objeto de usuario completo. |
| `POST` | `/auth/logout` | autenticado | Destruye la sesión del servidor. |
| `GET`  | `/auth/me` | autenticado | Usuario de la sesión actual (con todos los campos de perfil). |
| `GET`  | `/auth/session` | autenticado | `{ userId }` — usado por el frontend para verificar sesión activa. |
| `PUT`  | `/auth/session` | autenticado | Guardar/limpiar sesión manual. |
| `POST` | `/auth/change-password` | autenticado | Cambiar contraseña propia. Si tiene `must_change_password=true`, no exige contraseña actual. |
| `PUT`  | `/auth/profile` | autenticado | Actualizar perfil propio: `displayName`, `title`, `avatarDataUrl`. **Cualquier rol.** No requiere admin. |

**POST /auth/login — response:**
```json
{
  "id": "uuid",
  "username": "adelgado",
  "displayName": "Ana Delgado",
  "email": "adelgado@cc.com.uy",
  "role": "sueldos",
  "mustChangePassword": false,
  "rangeStart": 600,
  "rangeEnd": 799,
  "rangeTxtStart": null,
  "rangeTxtEnd": null,
  "permissions": null,
  "title": "Analista de Sueldos",
  "avatarDataUrl": "data:image/png;base64,..."
}
```

**Lockout:** 5 intentos fallidos bloquean la cuenta por 5 minutos. Se desbloquea automáticamente o con SQL directo.

**PUT /auth/profile — body:**
```json
{ "displayName": "Ana Delgado", "title": "Analista senior", "avatarDataUrl": "data:image/png;base64,..." }
```
Cualquier campo es opcional. Actualiza `display_name`, `title` y `avatar_data_url` en la BD.

**POST /auth/change-password — body:**
```json
{ "currentPassword": "...", "newPassword": "..." }
```
Si el usuario tiene `must_change_password = true`, `currentPassword` se ignora. Tras el cambio, `must_change_password` se pone en `false` y `login_attempts` en `0`.

---

### Usuarios (`/api/users`)

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| `GET`    | `/users` | admin, superadmin | Lista todos los usuarios |
| `PUT`    | `/users` | superadmin | Sincronización completa (upsert de toda la lista) |
| `GET`    | `/users/:id` | admin, superadmin, propio | Obtiene usuario por ID con todos los campos |
| `PUT`    | `/users/:id` | admin, superadmin | Crea o actualiza usuario (upsert) |

**PUT /users/:id — campos especiales:**
- `plainPassword`: si viene, el backend hashea con bcrypt automáticamente y lo guarda como `password_hash`.
- `permissions`: objeto JSON con la estructura de permisos. Si es `null`, se respeta `null` en la BD (el frontend usará los defaults del rol).
- `title`, `avatarDataUrl`: campos de perfil. Solo el admin los puede editar desde esta ruta. Los propios usuarios deben usar `PUT /auth/profile`.

**Sistema de permisos:**
- El campo `permissions` en la BD puede ser `null` → el frontend usa `ROLE_DEFAULT_PERMISSIONS[role]` de `perms.ts`.
- Si no es `null`, el frontend fusiona los permisos del usuario con los defaults via `getUserEffectivePermissions(user)`.
- Para editar permisos de un usuario: el admin usa el `PermissionEditorModal` → llama `adminSetPermissions()` → `PUT /users/:id`.

---

### Liquidaciones (`/api/periods`)

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| `GET` | `/periods` | todos | Lista períodos |
| `PUT` | `/periods` | admin, superadmin | Sincronización completa |
| `GET` | `/periods/selected` | autenticado | Período seleccionado del usuario actual |
| `PUT` | `/periods/selected` | autenticado | Guardar período seleccionado |

---

### Archivos — Módulo Información (`/api/files`)

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| `GET`    | `/files?periodId=` | todos | Lista archivos (filtrado por liquidación) |
| `PUT`    | `/files` | autenticado | Sync de metadatos — emite SSE si detecta archivos nuevos o bumps de versión |
| `POST`   | `/files/upload` | rrhh, admin, superadmin | **Subida del binario** (multipart/form-data) |
| `GET`    | `/files/audit` | todos | Historial de auditoría de archivos |
| `PUT`    | `/files/audit` | autenticado | Reemplaza audit log |
| `POST`   | `/files/audit` | autenticado | Agrega una entrada al audit log |
| `GET`    | `/files/:id/download` | todos | Descarga el binario |
| `PUT`    | `/files/:id/status` | sueldos, admin | Cambia estado |
| `DELETE` | `/files/:id` | admin (soft), superadmin + `?hard=true` (físico) | Elimina archivo |

**POST /files/upload — multipart/form-data:**
```
file:           <binario>
periodId:       "uuid-de-la-liquidacion"
sector:         "Emergencia"      (opcional)
siteCode:       "SEDE01"          (opcional)
fileId:         "uuid-existente"  (opcional — si se envía, hace UPSERT y sube versión)
combinationId:  "uuid"            (opcional)
subcategory:    "texto"           (opcional)
noNews:         "true" | "false"  (opcional)
```

**Flujo de subida:**
1. El frontend llama `POST /files/upload` con el binario
2. El backend guarda en disco bajo `UPLOAD_DIR/{periodId}/{uuid}.ext`
3. Crea o actualiza el registro en `files` con `version++` si el `fileId` ya existe
4. Registra en `file_history` y `audit_log`
5. Emite evento SSE `file:uploaded` a todos los clientes conectados
6. Devuelve el objeto archivo completo (incluyendo `storagePath`, `id`, `version`)

**GET /files/:id/download:**
El frontend descarga el archivo como blob (fetch con `credentials: include`) y luego crea un `objectURL` local para poder renombrarlo con el número de Sueldos. No usar `<a href>` directo por restricciones cross-origin de `a.download`.

---

### Sectores, Sedes y Combinaciones

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| `GET` | `/sectors` | todos | Lista sectores |
| `PUT` | `/sectors` | admin, superadmin | Sincronización completa |
| `GET` | `/sites` | todos | Lista sedes |
| `PUT` | `/sites` | admin, superadmin | Sincronización completa |
| `GET` | `/combinations` | todos | Lista combinaciones sede+sector+subcategoría+CC |
| `POST` | `/combinations` | rrhh, admin, superadmin | Crea combinación |
| `PUT` | `/combinations/:id` | rrhh, admin, superadmin | Actualiza combinación |
| `DELETE` | `/combinations/:id` | admin, superadmin | Elimina combinación |

---

### Descargas y Numeración (`/api/downloads`)

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| `GET` | `/downloads/counters` | autenticado | Contadores del usuario actual |
| `PUT` | `/downloads/counters` | autenticado | Actualiza contadores |
| `GET` | `/downloads/downloaded` | autenticado | Archivos ya descargados por el usuario |
| `PUT` | `/downloads/downloaded` | autenticado | Marca archivos como descargados |
| `GET` | `/downloads/logs` | admin, superadmin | Historial de descargas |
| `PUT` | `/downloads/logs` | autenticado | Sincroniza logs |

**Flujo de numeración de Sueldos:**
1. Al descargar, el frontend llama `GET /api/users/:id` para obtener `rangeStart`/`rangeEnd` frescos del servidor
2. Calcula el próximo número libre en el rango (separando TXT y no-TXT)
3. Descarga el binario como blob (`fetch` con `credentials: include`)
4. Renombra el archivo localmente: `600 nombre.xlsx`
5. Registra el número usado en contadores

**Atomicidad de contadores:**
```sql
INSERT INTO download_counters (user_id, period_id, current)
VALUES ($1, $2, 1)
ON CONFLICT (user_id, period_id) DO UPDATE
  SET current = download_counters.current + 1;
```

---

### Notificaciones en tiempo real — SSE (`/api/events`)

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| `GET` | `/events` | ninguno (stream abierto) | Stream SSE — mantener abierto |

**El endpoint SSE no requiere autenticación** — es un stream de solo lectura. El frontend lo abre apenas el usuario se loguea y lo mantiene abierto con keep-alive cada 25 segundos.

**Eventos emitidos:**
| Evento | Cuándo | Payload |
|--------|--------|---------|
| `ping` | conexión inicial y cada 25s | `{}` |
| `file:uploaded` | nuevo archivo subido | `{ fileName, uploaderName, periodId }` |
| `file:status` | estado o versión cambiada | `{ fileId, fileName, status }` |
| `reclamo:created` | reclamo nuevo | `{ ticket, nombreFuncionario }` |
| `reclamo:estado` | estado de reclamo cambió | `{ ticket, estado }` |
| `reclamo:nota` | nota interna agregada | `{ ticket }` |

**En el frontend**, los eventos disparan window events (`dataflow:files:refresh`, `dataflow:reclamos:refresh`, `dataflow:toast`) que los hooks escuchan para recargar datos sin refresco manual.

---

### Reclamos (`/api/reclamos`)

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| `GET`    | `/reclamos` | rrhh, sueldos, admin | Lista todos los reclamos |
| `POST`   | `/reclamos` | rrhh, admin | Crea reclamo |
| `GET`    | `/reclamos/config` | todos | Configuración del módulo |
| `PUT`    | `/reclamos/config` | admin, superadmin | Guarda configuración |
| `GET`    | `/reclamos/:id` | todos | Detalle de reclamo |
| `PATCH`  | `/reclamos/:id` | autenticado | Actualiza campos (update parcial) |
| `DELETE` | `/reclamos/:id` | rrhh, admin | Soft delete (permisos por rol) |
| `POST`   | `/reclamos/:id/estado` | autenticado | Cambia estado con nota opcional |
| `POST`   | `/reclamos/:id/notificaciones` | autenticado | Registra notificación simulada |
| `POST`   | `/reclamos/:id/notas` | autenticado | Agrega nota interna |

**Lógica de negocio:**
- **Estados:** `Emitido → En proceso → Liquidado / Rechazado/Duda de reclamo / Eliminado`
- **Permisos eliminar:** `rrhh` solo si `estado === 'Emitido'`; `admin`/`superadmin` cualquier estado activo; `sueldos` no puede
- **Auto En proceso:** cuando sueldos abre un reclamo `Emitido`, cambia automáticamente
- **rrhh** solo puede cambiar estado de `Rechazado/Duda de reclamo` → `Emitido`
- **Campo `adjuntos`:** array JSON con base64 data URLs. En producción considerar S3 o disco
- **Notificar al liquidar:** si `reclamos_config.notificar_liquidado = true` y el estado pasa a `Liquidado`, se registra la notificación y se simula envío de email a `email_funcionario`

---

### Auditoría (`/api/audit`)

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| `GET`    | `/audit` | superadmin | Lista entradas con filtros: `modulo`, `accion`, `resultado`, `usuarioId`, `desde`, `hasta` |
| `POST`   | `/audit` | autenticado | Registra una entrada |
| `DELETE` | `/audit` | superadmin | Limpia el log completo |

**Eventos auditados:** login OK/fallido/bloqueado, logout, subida de archivo, descarga, crear reclamo, cambiar estado de reclamo, eliminar reclamo.

---

## 7. Migraciones SQL incrementales

El esquema base está en `backend/sql/01_schema.sql`. Tras el deploy inicial, se aplican migraciones numeradas en orden:

| Archivo | Qué agrega |
|---------|-----------|
| `01_schema.sql` | Esquema base completo (users, periods, sites, sectors, files, reclamos, etc.) |
| `02_seed.sql` | Usuarios iniciales con bcrypt + configuración base de reclamos |
| `03_combinations.sql` | Tabla `combinations` (sede + sector + subcategoría + CC) |
| `04_files_combination.sql` | Columnas `combination_id` y `subcategory` en tabla `files` |
| `05_combinations_cc.sql` | Columna `cc` (centro de costo) en tabla `combinations` |
| `06_users_permissions.sql` | `ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB` |
| `07_users_profile.sql` | `ALTER TABLE users ADD COLUMN IF NOT EXISTS title VARCHAR(200)` y `avatar_data_url TEXT` |

**Aplicar migraciones en BD existente:**
```bash
docker compose exec db psql -U dataflow -d dataflow -f /sql/06_users_permissions.sql
docker compose exec db psql -U dataflow -d dataflow -f /sql/07_users_profile.sql
```

**Verificar que las columnas existen:**
```bash
docker compose exec db psql -U dataflow -d dataflow -c "\d users" | grep -E "title|avatar|permissions"
```

---

## 8. Autenticación con Active Directory / LDAP

En Círculo Católico los usuarios se autentican con su **cédula de identidad como contraseña** contra el Active Directory de Windows. Para conectar esto:

```bash
cd backend
npm install passport passport-ldapauth
```

```javascript
// backend/src/routes/auth.js — reemplazar la sección bcrypt por:
const LdapStrategy = require('passport-ldapauth');

const LDAP_OPTS = {
  server: {
    url:             process.env.LDAP_URL,
    bindDN:          process.env.LDAP_BIND_DN,
    bindCredentials: process.env.LDAP_BIND_PASSWORD,
    searchBase:      process.env.LDAP_BASE_DN,
    searchFilter:    '(sAMAccountName={{username}})',  // AD usa sAMAccountName
  },
};

router.post('/login', (req, res, next) => {
  passport.authenticate('ldapauth', LDAP_OPTS, (err, adUser) => {
    if (err || !adUser) return res.status(401).json({ error: 'Credenciales inválidas' });

    pool.query('SELECT * FROM users WHERE LOWER(username) = LOWER($1)', [adUser.sAMAccountName])
      .then(result => {
        const user = result.rows[0];
        if (!user || !user.active) return res.status(401).json({ error: 'Usuario no habilitado en Dataflow' });

        req.session.userId      = user.id;
        req.session.role        = user.role;
        req.session.displayName = user.display_name;

        res.json({
          id: user.id, username: user.username, displayName: user.display_name,
          role: user.role, rangeStart: user.range_start, rangeEnd: user.range_end,
          permissions: user.permissions || null,
          title: user.title || null,
          avatarDataUrl: user.avatar_data_url || null,
        });
      });
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

**Con AD, los usuarios NO necesitan contraseña en la tabla `users`** — solo necesitan estar dados de alta con su `username` (= login de Windows), `role` y `range_start`/`range_end`. El AD valida la contraseña.

**Recuperación de contraseña:** con AD no aplica — el usuario recupera su contraseña de Windows por el canal habitual de IT.

---

## 9. Almacenamiento de archivos

Los binarios se guardan en disco bajo `UPLOAD_DIR` (configurado en `.env`).

**Estructura:**
```
uploads/
  {periodId}/
    {uuid}.csv
    {uuid}.xlsx
    {uuid}.txt
```

**Para producción con nginx** (nginx sirve los archivos directamente, más eficiente):

```nginx
location /api/ {
  proxy_pass http://localhost:3001;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
}

# Descarga protegida — nginx sirve directo (más rápido que pasar por Node)
location /files-privados/ {
  internal;
  alias /var/dataflow/uploads/;
}
```

En `backend/src/routes/files.js`, activar el bloque X-Accel-Redirect (actualmente comentado):
```javascript
res.setHeader('X-Accel-Redirect', `/files-privados/${file.storage_path}`);
res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.name)}"`);
return res.send();
```

---

## 10. Configuración de producción

### Variables de entorno (`backend/.env`)

```env
DATABASE_URL=postgresql://dataflow_user:CLAVE@localhost:5432/dataflow
SESSION_SECRET=cadena-aleatoria-de-al-menos-32-caracteres
UPLOAD_DIR=/var/dataflow/uploads
PORT=3001
NODE_ENV=production

# LDAP/AD (cuando se conecte al AD corporativo)
LDAP_URL=ldap://ad.circulocatolico.com.uy
LDAP_BASE_DN=dc=circulocatolico,dc=com,dc=uy
LDAP_BIND_DN=cn=dataflow-service,ou=servicios,...
LDAP_BIND_PASSWORD=...
```

### CORS dinámico

El backend acepta conexiones de `localhost` (cualquier puerto) y de cualquier IP en rango LAN (192.168.x.x, 10.x.x.x, 172.16-31.x.x, 100.x.x.x). En producción, restringir a solo el dominio del servidor:

```javascript
// backend/src/index.js — reemplazar la función CORS dinámica por:
cors({ origin: 'https://dataflow.circulocatolico.com.uy', credentials: true })
```

### Sesiones persistentes en PostgreSQL

```bash
cd backend && npm install connect-pg-simple
```

En `backend/src/index.js`, descomentar las líneas de `pgSession`.

### Seguridad de cookies

Ya configurado en `index.js` para producción:
```javascript
cookie: {
  httpOnly: true,              // protege contra XSS
  secure: true,                // solo HTTPS
  sameSite: 'strict',          // protege contra CSRF
  maxAge: 8 * 60 * 60 * 1000, // 8 horas de sesión
}
```

---

## 11. Checklist para la primera versión en producción

### Infraestructura
- [ ] Servidor con Node.js 20+ y PostgreSQL 15+
- [ ] Ejecutar `01_schema.sql`, `02_seed.sql` y migraciones 03–07 en orden
- [ ] Carpeta `/var/dataflow/uploads/` con permisos de escritura para el proceso Node
- [ ] nginx configurado como proxy reverso (puerto 443, HTTPS)
- [ ] Certificado SSL instalado

### Backend
- [ ] `cd backend && cp .env.example .env` → completar `DATABASE_URL`, `SESSION_SECRET`
- [ ] `npm install && node src/index.js`
- [ ] Verificar: `curl http://localhost:3001/api/health` → `{"status":"ok"}`
- [ ] Verificar login: `POST /api/auth/login` con `admin / Admin-1234`

### Frontend
- [ ] `cp .env.example .env.local` → `VITE_USE_API=true`, `VITE_API_URL=https://dataflow.circulocatolico.com.uy/api`
- [ ] `npm run build` → copiar `dist/` al servidor web
- [ ] Verificar que el login funciona desde el navegador

### Módulos (orden recomendado de verificación)
- [ ] Login / logout / cambio de contraseña forzado
- [ ] Perfil de usuario (nombre visible, cargo, foto)
- [ ] Liquidaciones (crear, bloquear)
- [ ] Subida de archivos desde RRHH
- [ ] Descarga de archivos con numeración desde Sueldos
- [ ] Notificaciones SSE en tiempo real
- [ ] Sectores, sedes y combinaciones CC
- [ ] Gestión de usuarios, rangos y permisos desde admin
- [ ] Reclamos (crear, cambiar estado, notas internas)
- [ ] Auditoría (dashboard superadmin)

### Paso a AD (cuando esté disponible)
- [ ] Instalar `passport passport-ldapauth` en backend
- [ ] Configurar variables LDAP en `.env`
- [ ] Reemplazar sección bcrypt en `routes/auth.js` por validación LDAP (ver sección 8)
- [ ] Crear usuarios en la tabla `users` con `username` = login de Windows, sin `password_hash`
- [ ] Probar login con cédula como contraseña

---

## 12. Migración de datos existentes (localStorage → base de datos)

Si hay datos cargados en localStorage del navegador que se quieren migrar:

1. Abrir la app en el navegador con `VITE_USE_API=false`
2. DevTools → Application → Local Storage → copiar cada clave
3. Crear un script de migración SQL con los JSON extraídos
4. Insertar en las tablas correspondientes
5. Cambiar a `VITE_USE_API=true`

O bien: la primera vez que el usuario use la app con backend, los datos de localStorage quedan huérfanos. Si los datos son importantes, hacer la migración manual antes del go-live.

---

## 13. Notas sobre cambios futuros al frontend

Cuando se implemente una nueva feature que necesite datos del backend:

1. Agregar la función al archivo `src/services/api/xxxAPI.ts` correspondiente
2. Agregar la misma función a `src/services/localStorage/xxxStorage.ts` (versión local)
3. Agregar el mapeo en `src/services/db.ts`
4. El hook o componente usa `db.xxx.nuevaFuncion()` sin saber si es API o localStorage

Este patrón garantiza que el sistema siempre funcione en modo sin backend (útil para demos offline).

---

*Ante cualquier duda sobre la arquitectura del frontend, consultar a Leonel Figuera (RRHH).*  
*Repositorio v10: https://github.com/thelion182/dataflow_v10*
