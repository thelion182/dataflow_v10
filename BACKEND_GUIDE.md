# Guía de integración de backend — Dataflow

**Para el equipo de Cómputos**  
Versión del frontend: v9 · Preparado por: RRHH / Leonel Figuera

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
Dataflow_v9pruebas/
├── src/                         ← Frontend React
│   ├── app/DataFlowDemo.tsx     ← Componente raíz
│   ├── hooks/
│   │   ├── useFiles.ts          ← Upload binario al backend en modo API
│   │   ├── useDownloads.ts      ← Descarga con numeración Sueldos vía API
│   │   └── useSSE.ts            ← Notificaciones en tiempo real (SSE)
│   └── services/
│       ├── db.ts                ← PUNTO ÚNICO DE MIGRACIÓN (switch automático)
│       ├── api/                 ← Implementaciones fetch()
│       │   ├── client.ts        ← fetch helper (credentials: include, hostname dinámico)
│       │   ├── filesAPI.ts
│       │   ├── sectorsAPI.ts
│       │   ├── downloadsAPI.ts
│       │   ├── periodsAPI.ts
│       │   ├── usersAPI.ts
│       │   ├── reclamosAPI.ts
│       │   └── reclamosConfigAPI.ts
│       └── localStorage/        ← implementación alternativa sin backend
├── backend/                     ← Node.js/Express — completamente funcional
│   ├── src/
│   │   ├── index.js             ← entrada Express, CORS dinámico, sesión, rutas
│   │   ├── db.js                ← pool PostgreSQL
│   │   ├── middleware/auth.js   ← requireAuth, requireRole
│   │   └── routes/
│   │       ├── auth.js          ← POST login (bcrypt+lockout), logout, GET me
│   │       ├── users.js         ← CRUD usuarios con rangos numéricos
│   │       ├── periods.js       ← CRUD liquidaciones
│   │       ├── sectors.js       ← CRUD sectores y sedes
│   │       ├── files.js         ← upload binario (multer), download, SSE, audit
│   │       ├── downloads.js     ← contadores atómicos, logs
│   │       ├── reclamos.js      ← CRUD reclamos + config
│   │       └── events.js        ← Server-Sent Events (SSE)
│   ├── sql/
│   │   ├── 01_schema.sql        ← esquema completo PostgreSQL
│   │   └── 02_seed.sql          ← usuarios iniciales (admin/Admin-1234, superadmin/Super-1234)
│   ├── package.json
│   ├── Dockerfile
│   └── .env.example
├── docker-compose.yml           ← levanta PostgreSQL + backend con un comando
└── .env.example                 ← variables de entorno del frontend
```

---

## 3. Cómo levantar el sistema (demo en red local)

### Paso 1 — Variables de entorno

```bash
# Frontend (.env.local en la raíz)
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
```

### Paso 3 — Frontend

```bash
npm install
npm run dev   # accesible en http://localhost:5173
              # y en http://<IP-de-la-PC>:5173 desde otros dispositivos de la red
```

### Paso 4 — Verificar

```bash
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
En Windows: verificar que el firewall permite el puerto 5173 y 3001.

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
| **Servidor web prod** | nginx (proxy reverso) | Ver sección 9 |
| **LDAP/AD** | passport-ldapauth (opcional) | Ver sección 7 |

---

## 5. Modelos de datos (PostgreSQL)

El esquema completo está en `backend/sql/01_schema.sql`.

| Tabla | Descripción |
|-------|-------------|
| `users` | Usuarios del sistema con roles, rangos numéricos de descarga y lockout por intentos |
| `periods` | Liquidaciones (nombre, año, mes, fechas de ventana de carga, bloqueo) |
| `sites` | Sedes (código único, nombre, patrones de detección automática por nombre de archivo) |
| `sectors` | Sectores con patrones, responsable, centro de costo |
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

**Campos de rangos en `users`:**
```sql
range_start     INTEGER   -- inicio del rango de numeración (ej: 600)
range_end       INTEGER   -- fin del rango (ej: 799)
range_txt_start INTEGER   -- inicio para archivos .txt (calculado automáticamente si NULL)
range_txt_end   INTEGER   -- fin para archivos .txt
```
El frontend divide el rango: los últimos ~100 números se reservan para `.txt`, el resto para otros formatos. Si `range_txt_start`/`range_txt_end` son NULL, se calcula en el cliente.

---

## 6. Endpoints de API — referencia completa

### Base URL: `http://servidor/api`
### Autenticación: cookie de sesión HttpOnly (`credentials: 'include'` en todos los fetch)

---

### Autenticación

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| `POST` | `/auth/login` | todos | Login usuario/contraseña |
| `POST` | `/auth/logout` | autenticado | Cerrar sesión |
| `GET`  | `/auth/me` | autenticado | Usuario de la sesión actual |
| `GET`  | `/auth/session` | autenticado | `{ userId }` |
| `PUT`  | `/auth/session` | autenticado | Guardar/limpiar sesión |
| `POST` | `/auth/change-password` | autenticado | Cambiar contraseña propia |
| `PUT`  | `/auth/profile` | autenticado | Actualizar perfil propio (displayName, title, avatarDataUrl) |

**POST /auth/login — response incluye rangos, perfil y permisos:**
```json
{
  "id": "uuid", "username": "adelgado", "displayName": "Ana Delgado",
  "role": "sueldos", "mustChangePassword": false,
  "rangeStart": 600, "rangeEnd": 799,
  "rangeTxtStart": null, "rangeTxtEnd": null,
  "permissions": null,
  "title": "Analista de Sueldos",
  "avatarDataUrl": "data:image/png;base64,..."
}
```

**Lockout:** 5 intentos fallidos bloquean la cuenta por 5 minutos. Se desbloquea automáticamente o con SQL directo.

**PUT /auth/profile** — cualquier usuario autenticado puede actualizar su propio nombre visible, cargo y foto. No requiere rol admin. El frontend usa este endpoint desde `ProfileModal` para que los cambios persistan en la BD.

**POST /auth/change-password** — si el usuario tiene `must_change_password = true`, no exige la contraseña actual. Tras el cambio, `must_change_password` se resetea a `false`.

---

### Usuarios

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| `GET`    | `/users` | admin, superadmin | Lista todos los usuarios |
| `PUT`    | `/users` | superadmin | Sincronización completa |
| `GET`    | `/users/:id` | admin, propio | Obtiene usuario por ID (incluye rangos frescos) |
| `PUT`    | `/users/:id` | admin, superadmin | Crea o actualiza usuario |

**PUT /users/:id — si viene `plainPassword`, el backend hashea con bcrypt automáticamente.**

**Campos de perfil:** `title` (VARCHAR 200) y `avatar_data_url` (TEXT) son parte de la respuesta de todos los endpoints de usuarios. Guardar estos campos requiere `PUT /auth/profile` (cualquier usuario) o `PUT /users/:id` (admin/superadmin).

**Permisos por usuario:** el campo `permissions` es JSONB. Si es `null`, el frontend usa los defaults del rol (`ROLE_DEFAULT_PERMISSIONS`). Si no es `null`, se fusionan con los defaults vía `getUserEffectivePermissions(user)`.

**IMPORTANTE:** Todas las mutaciones de usuario desde el frontend (crear, cambiar rol, asignar rango, resetear contraseña, editar permisos) llaman a este endpoint además de actualizar localStorage. Garantiza que todos los dispositivos vean los datos frescos.

---

### Liquidaciones (Períodos)

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| `GET` | `/periods` | todos | Lista períodos |
| `PUT` | `/periods` | admin, superadmin | Sincronización completa |
| `GET` | `/periods/selected` | autenticado | Período seleccionado del usuario |
| `PUT` | `/periods/selected` | autenticado | Guardar período seleccionado |

---

### Archivos — Módulo Información

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| `GET`    | `/files?periodId=` | todos | Lista archivos |
| `PUT`    | `/files` | autenticado | Sync de metadatos — emite SSE si detecta archivos nuevos o bumps de versión |
| `POST`   | `/files/upload` | rrhh, admin, superadmin | **Subida del binario** (multipart/form-data) |
| `GET`    | `/files/audit` | todos | Historial de auditoría |
| `GET`    | `/files/:id/download` | todos | Descarga el binario |
| `PUT`    | `/files/:id/status` | sueldos, admin | Cambia estado |
| `DELETE` | `/files/:id` | admin (soft), superadmin + `?hard=true` (físico) | Elimina archivo |

**POST /files/upload — multipart/form-data:**
```
file:     <binario>
periodId: "uuid-de-la-liquidacion"
sector:   "Emergencia"     (opcional)
siteCode: "SEDE01"         (opcional)
fileId:   "uuid-existente" (opcional — si se envía, hace UPSERT y sube la versión)
```
**El frontend envía siempre el binario a este endpoint** antes de crear el registro en el estado local. Si `fileId` ya existe en la BD, se hace UPSERT y se incrementa automáticamente la versión.

**GET /files/:id/download:**
El frontend descarga el archivo como blob (fetch con `credentials: include`) y luego crea un objectURL local para poder renombrarlo con el número de Sueldos. No usar `<a href>` directo por restricciones cross-origin de `a.download`.

---

### Sectores y Sedes

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| `GET` | `/sectors` | todos | Lista sectores |
| `PUT` | `/sectors` | admin, superadmin | Sincronización completa |
| `GET` | `/sites` | todos | Lista sedes |
| `PUT` | `/sites` | admin, superadmin | Sincronización completa |

---

### Descargas y Numeración

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| `GET` | `/downloads/counters` | autenticado | Contadores del usuario actual |
| `PUT` | `/downloads/counters` | autenticado | Actualiza contadores |
| `GET` | `/downloads/downloaded` | autenticado | Archivos ya descargados |
| `PUT` | `/downloads/downloaded` | autenticado | Marca archivos como descargados |
| `GET` | `/downloads/logs` | admin, superadmin | Historial de descargas |

**Flujo de numeración de Sueldos:**
1. Al descargar, el frontend llama `GET /api/users/:id` para obtener `rangeStart`/`rangeEnd` frescos del servidor
2. Calcula el próximo número libre en el rango (separando TXT y no-TXT)
3. Descarga el binario como blob (`fetch` con `credentials: include`)
4. Renombra el archivo: `600 nombre.xlsx`
5. Registra el número usado en contadores

**Atomicidad de contadores:**
```sql
INSERT INTO download_counters (user_id, period_id, current)
VALUES ($1, $2, 1)
ON CONFLICT (user_id, period_id) DO UPDATE
  SET current = download_counters.current + 1;
```

---

### Notificaciones en tiempo real (SSE)

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| `GET` | `/events` | ninguno (stream abierto) | Stream SSE |

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

### Reclamos

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| `GET`    | `/reclamos` | rrhh, sueldos, admin | Lista todos los reclamos |
| `POST`   | `/reclamos` | rrhh, admin | Crea reclamo |
| `GET`    | `/reclamos/config` | todos | Configuración del módulo |
| `PUT`    | `/reclamos/config` | admin, superadmin | Guarda configuración |
| `GET`    | `/reclamos/:id` | todos | Detalle de reclamo |
| `PATCH`  | `/reclamos/:id` | autenticado | Actualiza campos |
| `DELETE` | `/reclamos/:id` | rrhh, admin | Soft delete (permisos por rol) |
| `POST`   | `/reclamos/:id/estado` | autenticado | Cambia estado |
| `POST`   | `/reclamos/:id/notificaciones` | autenticado | Registra notificación |
| `POST`   | `/reclamos/:id/notas` | autenticado | Agrega nota interna |

**Lógica de negocio:**
- **Estados:** `Emitido → En proceso → Liquidado / Rechazado/Duda de reclamo / Eliminado`
- **Permisos eliminar:** `rrhh` solo si `estado === 'Emitido'`; `admin`/`superadmin` cualquier estado activo; `sueldos` no puede
- **Auto En proceso:** cuando sueldos abre un reclamo `Emitido`, se cambia automáticamente
- **Campo `adjuntos`:** array JSON con base64 data URLs. En producción considerar S3 o disco
- **Notificar al liquidar:** si `reclamos_config.notificar_liquidado = true` y estado pasa a `Liquidado`, enviar email a `email_funcionario`

---

### Auditoría

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| `GET`    | `/audit` | superadmin | Lista entradas (filtros: `modulo`, `accion`, `resultado`, `usuarioId`, `desde`, `hasta`) |
| `POST`   | `/audit` | autenticado | Registra una entrada |
| `DELETE` | `/audit` | superadmin | Limpia el log |

---

## 7. Autenticación con Active Directory / LDAP

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

    // Buscar el usuario local por username para obtener rol y rango
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

**Recuperación de contraseña:** con AD no aplica — el usuario recupera su contraseña de Windows por el canal habitual de IT. En modo bcrypt local, el admin puede hacer reset desde el panel de gestión de usuarios.

---

## 8. Almacenamiento de archivos

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

# Descarga protegida — nginx sirve directo
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

## 9. Configuración de producción

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

El backend acepta conexiones de cualquier `localhost` (cualquier puerto) y de cualquier IP en rango LAN (192.168.x.x, 10.x.x.x, 172.16-31.x.x). En producción, restringir a solo el dominio del servidor:

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

## 10. Checklist para la primera versión en producción

### Infraestructura
- [ ] Servidor con Node.js 20+ y PostgreSQL 15+
- [ ] Ejecutar `01_schema.sql` y `02_seed.sql`
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
- [ ] Login / logout
- [ ] Liquidaciones (crear, bloquear)
- [ ] Subida de archivos desde RRHH
- [ ] Descarga de archivos con numeración desde Sueldos
- [ ] Notificaciones SSE en tiempo real (subir desde PC, ver toast en Mac)
- [ ] Sectores y sedes
- [ ] Gestión de usuarios y rangos desde admin
- [ ] Reclamos (crear, cambiar estado, notas internas)
- [ ] Auditoría (dashboard superadmin)

### Paso a AD (cuando esté disponible)
- [ ] Instalar `passport passport-ldapauth` en backend
- [ ] Configurar variables LDAP en `.env`
- [ ] Reemplazar sección bcrypt en `routes/auth.js` por validación LDAP (ver sección 7)
- [ ] Crear usuarios en la tabla `users` con `username` = login de Windows, sin `password_hash`
- [ ] Probar login con cédula como contraseña

---

## 11. Migraciones SQL incrementales

El esquema base está en `backend/sql/01_schema.sql`. Tras el deploy inicial, se aplican migraciones numeradas:

| Archivo | Qué agrega |
|---------|-----------|
| `03_download_logs.sql` | Tabla `download_logs` completa con campos de auditoría |
| `04_audit_log.sql` | Tabla `audit_log` para login/logout/reclamos |
| `05_user_selected_period.sql` | Tabla `user_selected_period` (preferencia UI por usuario) |
| `06_users_permissions.sql` | `ALTER TABLE users ADD COLUMN permissions JSONB` |
| `07_users_profile.sql` | `ALTER TABLE users ADD COLUMN title VARCHAR(200)` y `avatar_data_url TEXT` |

**Cómo aplicar una migración:**
```bash
docker compose exec db psql -U dataflow -d dataflow -f /sql/06_users_permissions.sql
docker compose exec db psql -U dataflow -d dataflow -f /sql/07_users_profile.sql
```

Si la BD ya tiene datos y hay que verificar que las columnas existen:
```bash
docker compose exec db psql -U dataflow -d dataflow \
  -c "\d users" | grep -E "title|avatar|permissions"
```

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

## 12. Notas sobre cambios futuros al frontend

Cuando se implemente una nueva feature que necesite datos del backend:

1. Agregar la función al archivo `src/services/api/xxxAPI.ts` correspondiente
2. Agregar la misma función a `src/services/localStorage/xxxStorage.ts` (versión local)
3. Agregar el mapeo en `src/services/db.ts`
4. El hook o componente usa `db.xxx.nuevaFuncion()` sin saber si es API o localStorage

Este patrón garantiza que el sistema siempre funcione en modo sin backend (útil para demos offline).

---

*Ante cualquier duda sobre la arquitectura del frontend, consultar a Leonel Figuera (RRHH).*  
*Repositorio v9: https://github.com/thelion182/dataflow_v9pruebas*
