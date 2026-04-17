@echo off
echo.
echo  ====================================
echo   Dataflow Demo — Iniciando servidor
echo  ====================================
echo.

echo [1/3] Levantando Docker (base de datos + backend)...
docker compose up -d
timeout /t 3 /nobreak > nul

echo [2/3] Verificando backend...
timeout /t 2 /nobreak > nul
docker compose logs backend --tail=2

echo.
echo [3/3] Levantando frontend...
start cmd /k "cd /d %~dp0 && npm run dev"

echo.
echo  ====================================
echo   Listo!
echo.
echo   PC:           http://localhost:5173
echo   Mac / iPhone: http://192.168.1.51:5173
echo.
echo   Login demo:
echo     admin        /  Admin-1234
echo     rrhh.demo    /  Rrhh-1234
echo     sueldos.demo /  Sueldos-1234
echo  ====================================
echo.
pause
