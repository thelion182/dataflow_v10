# Dataflow v9 pruebas — Contexto del proyecto para Claude Code

## Qué es esto
App web interna para la Gerencia de RRHH de Círculo Católico (mutual uruguaya).
Coordina el intercambio de archivos entre el equipo de **Información/RRHH** y el equipo de **Sueldos**,
y gestiona reclamos de haberes de funcionarios.
Frontend-only SPA. Sin backend todavía — todo en `localStorage` via capa de abstracción `services/db.ts`.

## Stack
- React 19 + TypeScript + Vite 7
- Tailwind CSS via CDN (en `index.html`, no como paquete npm)
- Sin librerías de estado externas (solo useState/useMemo/useCallback)
- `// @ts-nocheck` en la mayoría de archivos — intencional, no tocar

## Cómo correr
```bash
npm install
npm run dev        # desarrollo en localhost:5173
npm run build      # build de producción
```

Login inicial: `admin / Admin-1234` · `superadmin / Super-1234`

## Historial de versiones
- **v1–v4**: módulo Información (archivos, observaciones, sectores, períodos, usuarios, superadmin, audit log)
- **v5**: módulo Reclamos completo, capa `services/db.ts` para reclamos
- **v6**: mejoras visuales (modo reclamos azul, modales con portal, filtros colapsables, Kanban)
- **v7**: 8 mejoras al módulo Reclamos (antigüedad, contadores, notas internas, Kanban, multi-selección, borrador, plantillas de rechazo, aviso al bloquear)
- **v8**: abstracción completa + API skeletons + backend Node.js/Express completo + Docker
- **v9pruebas** (actual): rama de pruebas con backend activo por defecto (VITE_USE_API=true) + sistema de auditoría completo

## Arquitectura del frontend
```
src/
├── app/DataFlowDemo.tsx          ← componente raíz (~2.800 líneas) — DEUDA TÉCNICA CONOCIDA
├── hooks/
│   ├── useFiles.ts               ← archivos: upload, delete, status, history → usa db.files.*
│   ├── useDownloads.ts           ← descarga + numeración Sueldos + ZIP → usa db.downloads.*
│   ├── useObservations.ts        ← dudas, arreglos, respuestas (no accede localStorage directo)
│   ├── useReports.ts             ← exportación CSV
│   └── useSectors.ts             ← sectores, sedes → usa db.sectors.*
├── features/
│   ├── files/                    ← tabla, detalle, modales de archivo
│   ├── observations/             ← dudas funcionario (ObserveModal), arreglos, respuestas
│   ├── reclamos/                 ← módulo completo de reclamos de haberes
│   │   ├── components/           ← ReclamosPanel, TablaReclamos, TablaReclamosView,
│   │   │                            KanbanReclamos, FormularioReclamo, DetalleReclamo,
│   │   │                            ReclamosConfig, ReportesReclamos
│   │   ├── hooks/                ← useReclamos, useReclamosConfig, useNotificaciones
│   │   └── types/                ← reclamo.types.ts (EstadoReclamo, Reclamo, NotaInterna, etc.)
│   ├── sectors/                  ← gestión sectores/sedes+CC, resumen por sector
│   ├── periods/                  ← liquidaciones (con bloqueo por admin Y superadmin)
│   ├── reports/                  ← modales exportación CSV
│   └── users/                    ← admin usuarios, permisos, perfil, SuperadminDashboard
├── services/                     ← CAPA DE ABSTRACCIÓN — PUNTO DE MIGRACIÓN AL BACKEND
│   ├── db.ts                     ← switch automático: VITE_USE_API=true → api/*, false → localStorage/*
│   ├── api/                      ← skeletons fetch() — YA CREADOS, misma interfaz que localStorage/*
│   │   ├── client.ts             ← fetch helper: base URL, Bearer token, error handling
│   │   ├── filesAPI.ts
│   │   ├── sectorsAPI.ts
│   │   ├── downloadsAPI.ts
│   │   ├── periodsAPI.ts
│   │   ├── usersAPI.ts
│   │   ├── reclamosAPI.ts
│   │   └── reclamosConfigAPI.ts
│   └── localStorage/
│       ├── filesStorage.ts
│       ├── sectorsStorage.ts
│       ├── downloadsStorage.ts
│       ├── periodsStorage.ts
│       ├── usersStorage.ts
│       ├── reclamosStorage.ts
│       └── reclamosConfigStorage.ts
├── components/                   ← UI genéricos reutilizables
└── lib/
    ├── auth.ts                   ← login, sesión, usuarios (PUNTO DE MIGRACIÓN a AD/LDAP)
    ├── perms.ts                  ← permisos por rol
    ├── storage.ts                ← claves de localStorage (centralizado)
    ├── time.ts / bytes.ts / ids.ts / cls.ts
    └── types.ts (vacío, tipos en src/types.ts)
```

## Arquitectura del backend (ya creado en backend/)
```
backend/
├── src/
│   ├── index.js                  ← Express, CORS, sesión, todas las rutas montadas
│   ├── db.js                     ← pool PostgreSQL con dotenv
│   ├── middleware/auth.js        ← requireAuth, requireRole
│   └── routes/
│       ├── auth.js               ← POST login (bcrypt+lockout), logout, GET me
│       ├── users.js              ← CRUD usuarios
│       ├── periods.js            ← CRUD liquidaciones
│       ├── sectors.js            ← sync sectores y sedes
│       ├── files.js              ← upload multer, download, audit log, soft/hard delete
│       ├── downloads.js          ← contadores atómicos (SELECT FOR UPDATE), logs
│       └── reclamos.js           ← CRUD completo + historial + notas + config
├── sql/
│   ├── 01_schema.sql             ← esquema PostgreSQL completo con índices
│   └── 02_seed.sql               ← usuarios iniciales (bcrypt) + config reclamos
├── package.json                  ← express, pg, bcryptjs, multer, express-session, uuid
├── Dockerfile
└── .env.example
docker-compose.yml                ← en raíz: levanta PostgreSQL + backend con un comando
```

## Roles del sistema
- **superadmin** — todo: hard delete, reset liquidaciones, dashboard SA, backup, bloqueo de períodos
- **admin** — gestión usuarios, períodos, sectores, sedes; bloqueo de períodos; borrado lógico archivos
- **rrhh** (Información) — sube archivos, responde dudas, crea arreglos, emite reclamos
- **sueldos** — descarga archivos, marca dudas, recibe numeración automática, gestiona estados de reclamos

**IMPORTANTE:** El rol `admin` puede bloquear/desbloquear liquidaciones (igual que superadmin).
La condición es `isSuperAdmin || isAdmin`.

## Persistencia actual (localStorage vía db.ts)
- `db.files.*` → `fileflow-demo-v1` + `dataflow-audit-log-v1`
- `db.downloads.*` → `dataflow-downloadCounters`, `dataflow-downloadedFiles`, `dataflow-downloadLogs`
- `db.sectors.*` → `dataflow-sectors-v1`, `fileflow-sites-v1`
- `db.periods.*` → `fileflow-periods-v1`, `fileflow-period-selected-v1`
- `db.users.*` → `fileflow-users`, `fileflow-session`
- `db.reclamos.*` → `dataflow_reclamos`
- `db.reclamosConfig.*` → `dataflow_reclamos_config`
- `db.audit.*` → `dataflow-audit-v2` (nuevo, max 5000 entradas FIFO)
  - Legado: `dataflow-audit-log-v1` (solo hard_delete/reset — seguirá leyéndose en el dashboard)

## Módulo Reclamos
- Ticket formato: `RC-YYYYMMDD-XXXX`
- Estados: `Emitido → En proceso → Liquidado / Rechazado/Duda de reclamo / Eliminado`
- Historial de estados con usuario, fecha y nota
- Notas internas (hilo privado RRHH/Sueldos) — campo `notasInternas: NotaInterna[]`
- Adjuntos (imágenes, PDF, Word, Excel) — almacenados como base64 data URLs, máx 5 MB/archivo
- Vista tabla y vista Kanban (toggle)
- Multi-selección + eliminación en lote (tab Información)
- Borrador auto-guardado en FormularioReclamo (`dataflow_reclamo_borrador` en localStorage)
- Plantillas de motivos de rechazo en popup de cambio de estado
- Aviso al bloquear liquidación con reclamos pendientes
- Contadores en header: Emitidos, En proceso, Este mes, Total
- Notificaciones simuladas (email/whatsapp) con HTML templates
- Toggle "Notificar al funcionario al liquidar" en Configuración (campo `notificarLiquidado`)
- Permisos por rol para eliminar: rrhh→solo 'Emitido'; admin/super→cualquier estado activo; sueldos→no puede
- Estado auto "En proceso" cuando sueldos abre un reclamo 'Emitido'
- rrhh solo puede cambiar estado de 'Rechazado/Duda de reclamo' → 'Emitido'
- Configurable: causales, tipos, email Sueldos, logo corporativo

## Sistema de Auditoría
- `src/lib/audit.ts` — `logAudit()` fire-and-forget + `AuditEntry` type + `parseAmbiente()` (OS/browser)
- `src/services/localStorage/auditStorage.ts` — persiste en `dataflow-audit-v2`, máx 5000 FIFO
- `src/services/api/auditAPI.ts` — skeleton API (endpoints: GET/POST/DELETE /api/audit)
- `db.audit.getAll()` / `db.audit.append()` / `db.audit.clear()`
- Eventos capturados: login OK/fallido/bloqueado, logout, crear reclamo, cambiar estado, eliminar reclamo
- IP siempre "N/D" en modo frontend — será real cuando se conecte el backend
- Ambiente: "Windows 10/11 · Chrome 120" (parseado de userAgent)
- `SuperadminDashboard.tsx` reescrito: tabla rica con filtros (módulo, acción, resultado, usuario, fecha desde/hasta), exportar CSV, backward-compatible con log legado v1

## Cómo conectar el backend (para Cómputos)
Ver `BACKEND_GUIDE.md` — guía completa con pasos, SQL, endpoints, LDAP, nginx, checklist.

**Pasos mínimos:**
1. `docker compose up -d` (desde raíz)
2. Ejecutar `backend/sql/01_schema.sql` y `02_seed.sql`
3. `cp .env.example .env.local` → editar `VITE_USE_API=true` y `VITE_API_URL=http://servidor/api`
4. `npm run dev` — el switch es automático, sin tocar ningún otro archivo

## Deuda técnica conocida
- `DataFlowDemo.tsx` tiene ~2.800 líneas y 40+ estados — funciona pero difícil de mantener
- TypeScript `strict: false` — intencional para velocidad de desarrollo
- Sin tests unitarios
- Tailwind via CDN (no npm) — sin tree-shaking pero funciona correctamente

## Repositorio GitHub
- v8 (producción): https://github.com/thelion182/Dataflow_v8
- v9pruebas (esta versión): https://github.com/thelion182/dataflow_v9pruebas
- Branch principal: `master`
- Cada cambio de código se commitea y pushea automáticamente a GitHub

## Convenciones importantes
- `// @ts-nocheck` en casi todos los archivos — NO agregar tipos estrictos salvo que ya existan
- Los modales en `features/` reciben todo por props — no acceden a estado global directamente
- Modales sobre `document.body` usando `createPortal` para z-index correcto
- `useSectors` y `useFiles` inicializan y persisten su propio estado via `db.*`
- Nunca usar `localStorage` directamente en hooks o componentes — siempre via `db.*`
- El email por defecto de Sueldos es `reclamos@circulocatolico.com.uy`
- Nunca agregar tipos estrictos TypeScript a archivos con `// @ts-nocheck`
- Todo cambio de código → actualizar CLAUDE.md → commit + push a GitHub

## Demo en red local

**Objetivo:** Demo funcional en casa para mostrar a gerencia de RRHH e informática de Círculo Católico.
PC Windows como servidor, Mac y iPhone como clientes en la misma red WiFi.

**Estado actual:**
- Docker resuelto, credenciales sincronizadas (usuario `dataflow:dataflow123`)
- Vite configurado con `host: true` → accesible desde cualquier dispositivo en la red
- Backend Express corriendo en puerto `3001`
- Frontend en puerto `5173`

**Secuencia para levantar:**
```bash
docker compose up -d
docker compose exec db psql -U dataflow -d dataflow -f /sql/01_schema.sql
docker compose exec db psql -U dataflow -d dataflow -f /sql/02_seed.sql
npm install && npm run dev
```

Acceso desde Mac/iPhone: `http://<IP-de-la-PC>:5173`  
Para ver la IP de la PC: `ipconfig` → buscar IPv4 en la red WiFi.

**Pendiente:**
Implementar notificaciones en tiempo real con SSE (Server-Sent Events) para que cuando RRHH suba un archivo, Sueldos vea la notificación sin recargar la página.
