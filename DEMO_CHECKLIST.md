# Checklist demo — Dataflow v9

**Objetivo:** Video demo para Gerencia de RRHH y Gerencia Informática de Círculo Católico.  
**Dispositivos:** PC Windows (servidor) · Mac (cliente RRHH) · iPhone (cliente Sueldos)

---

## PARTE 1 — Preparación única (hacer una sola vez)

### 1.1 Crear usuarios de demo en la app

Antes de grabar, iniciar sesión como `admin` y crear:

| Usuario | Contraseña | Rol | Dispositivo en el video |
|---------|-----------|-----|------------------------|
| `admin` | `Admin-1234` | admin | PC — para setup |
| `rrhh.demo` | `Rrhh-1234` | rrhh | Mac |
| `sueldos.demo` | `Sueldos-1234` | sueldos | iPhone |

> Menú → Usuarios → Crear usuario. Asignar rango numérico a sueldos.demo (ej: 1 a 50).

### 1.2 Crear una liquidación de demo

Menú → Liquidaciones → crear "Demo Mayo 2026" (sin bloquear).

### 1.3 Preparar archivo de prueba

Tener listo en el escritorio un archivo CSV o TXT pequeño con nombre descriptivo:  
`liquidacion-demo-mayo2026.csv`

### 1.4 Encontrar la IP de la PC en la red WiFi

```
ipconfig
```
Buscar **Adaptador de red inalámbrica Wi-Fi → Dirección IPv4**.  
Ejemplo: `192.168.1.105`  
**Anotar esta IP** — Mac e iPhone la necesitan.

### 1.5 Abrir el Firewall de Windows para los puertos necesarios

Si Mac o iPhone no pueden acceder, es el firewall. Ejecutar como Administrador:

```powershell
# Puerto frontend (Vite)
netsh advfirewall firewall add rule name="Dataflow Frontend" dir=in action=allow protocol=TCP localport=5173

# Puerto backend (Express)
netsh advfirewall firewall add rule name="Dataflow Backend" dir=in action=allow protocol=TCP localport=3001
```

---

## PARTE 2 — Checklist antes de cada grabación

### 2.1 Levantar el servidor (PC)

```bash
# 1. Levantar base de datos y backend
docker compose up -d

# 2. Verificar que ambos contenedores están corriendo
docker compose ps
# Debe mostrar: dataflow_db (healthy) y dataflow_backend (running)

# 3. Levantar el frontend
npm run dev
```

Vite muestra dos URLs — anotar la de Network:
```
  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.1.105:5173/   ← esta usan Mac e iPhone
```

### 2.2 Verificar los tres dispositivos

| Dispositivo | URL | Login | Verificar |
|-------------|-----|-------|-----------|
| PC | `http://localhost:5173` | `admin / Admin-1234` | App carga, menú visible |
| Mac | `http://192.168.1.105:5173` | `rrhh.demo / Rrhh-1234` | App carga, modo RRHH |
| iPhone | `http://192.168.1.105:5173` | `sueldos.demo / Sueldos-1234` | App carga, modo Sueldos |

> ⚠️ Asegurarse que Mac e iPhone están en la **misma red WiFi** que la PC.  
> En iPhone: Configuración → Wi-Fi → verificar que NO está en datos móviles.

### 2.3 Verificar SSE (notificaciones en tiempo real)

1. Con `sueldos.demo` abierto en el iPhone, dejar la pantalla visible
2. Desde la Mac (rrhh.demo) subir cualquier archivo pequeño
3. En el iPhone debe aparecer un **toast** en la esquina con el nombre del archivo

Si el toast no aparece → ver sección "Qué puede salir mal".

### 2.4 Estado limpio para la grabación

- Borrar archivos de pruebas anteriores (si los hay) en la liquidación "Demo Mayo 2026"
- Cerrar otras pestañas y apps innecesarias en PC y Mac
- iPhone en modo No Molestar (para que no aparezcan notificaciones del sistema encima)
- iPhone en horizontal o vertical según cómo se quiera mostrar en el video

---

## PARTE 3 — Flujo exacto a grabar (guión)

### Escena 1 — Presentación (30 seg)
- Mostrar la PC con la app abierta
- Mencionar: "App web interna, sin instalación en los clientes, funciona en cualquier dispositivo"

### Escena 2 — Login multiusuario (1 min)
1. **iPhone:** Abrir `http://192.168.1.105:5173` → login como `sueldos.demo`
2. **Mac:** Abrir la misma URL → login como `rrhh.demo`
3. Mostrar que son vistas diferentes según el rol

### Escena 3 — Subida de archivo y notificación en tiempo real ⭐ (el momento clave)
1. **Mac (RRHH):** Ir a la liquidación "Demo Mayo 2026"
2. **Mac:** Subir `liquidacion-demo-mayo2026.csv`
3. **iPhone (Sueldos):** En ese momento aparece el toast con el nombre del archivo
4. **iPhone:** La lista de archivos se actualiza sola, sin recargar la página
5. **Destacar:** "Sueldos es notificado automáticamente sin tener que actualizar la pantalla"

### Escena 4 — Descarga con numeración automática (45 seg)
1. **iPhone (Sueldos):** Hacer clic en descargar el archivo
2. Mostrar que el archivo se descarga con nombre numerado automáticamente
3. Mencionar que el número es único por usuario y período

### Escena 5 — Módulo Reclamos (1 min)
1. **Mac (RRHH):** Ir a Reclamos → Nuevo reclamo → completar datos mínimos → Guardar
2. **iPhone (Sueldos):** Toast de nuevo reclamo aparece automáticamente
3. **iPhone:** Cambiar estado del reclamo a "En proceso"
4. **Mac:** Toast de cambio de estado aparece automáticamente

### Escena 6 — Cierre (30 seg)
- Mostrar que desde la PC (admin) se ve actividad de ambos usuarios en tiempo real
- Mencionar: "Listo para conectar al backend corporativo y Active Directory"

**Duración total estimada: 4-5 minutos**

---

## PARTE 4 — Qué puede salir mal y cómo prevenirlo

| Problema | Causa probable | Solución |
|----------|---------------|---------|
| Mac/iPhone no accede a la app | Firewall Windows bloqueando puerto 5173 | Ejecutar comandos netsh de la sección 1.5 |
| App abre pero no carga datos | Backend no conecta a PostgreSQL | `docker compose ps` → si `db` no está `healthy`, esperar 30 seg y reintentarlo |
| Toast no aparece en iPhone | SSE bloqueado o iPhone en datos móviles | Verificar WiFi en iPhone; abrir `http://192.168.1.105:3001/api/health` desde iPhone para comprobar conectividad al backend |
| Docker no levanta | Docker Desktop no está iniciado | Abrir Docker Desktop, esperar que el ícono en la barra de tareas sea verde |
| Error al subir archivo | Permisos de directorio `uploads/` | `docker compose exec backend mkdir -p /app/uploads` |
| La app muestra localStorage en vez de API | `.env` con `VITE_USE_API=false` | Verificar `.env` en la raíz: `VITE_USE_API=true` |
| Login falla | Usuarios de demo no creados | Loguear como `admin/Admin-1234` y crear los usuarios (sección 1.1) |
| Vite muestra solo `localhost` en Network | PC conectada por cable, no WiFi | Conectar la PC a la misma red WiFi que Mac e iPhone |

---

## PARTE 5 — Script de arranque rápido

Crear `iniciar-demo.bat` en la raíz del proyecto para arrancar todo con doble clic:

```bat
@echo off
echo Iniciando Dataflow Demo...
echo.

echo [1/2] Levantando Docker (base de datos + backend)...
docker compose up -d
timeout /t 5 /nobreak > nul

echo [2/2] Levantando frontend...
start cmd /k "npm run dev"

echo.
echo Listo! Abrir en el navegador:
echo   PC:              http://localhost:5173
echo   Mac / iPhone:    Buscar IP con "ipconfig" y usar http://TU-IP:5173
echo.
pause
```

> Guardar como `iniciar-demo.bat` y ejecutar como Administrador la primera vez.

---

## PARTE 6 — Comandos útiles durante la demo

```bash
# Ver si Docker está corriendo bien
docker compose ps

# Ver logs del backend en tiempo real (para diagnosticar)
docker compose logs -f backend

# Ver cuántos clientes SSE están conectados
docker compose logs backend | grep "SSE"

# Reiniciar solo el backend (sin tocar la DB)
docker compose restart backend

# Apagar todo al terminar
docker compose down
```

---

*Última actualización: 2026-04-17*
