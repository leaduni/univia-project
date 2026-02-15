@echo off
echo ========================================
echo    UNIVIA - INICIO RAPIDO
echo ========================================
echo.

REM Obtener la ruta del directorio del script
set "PROJECT_DIR=%~dp0"

echo [1/2] Iniciando Backend (FastAPI)...
start "UniVia Backend" cmd /k "cd /d "%PROJECT_DIR%backend" && python -m uvicorn main:app --reload --port 8000"

timeout /t 3 /nobreak > nul

echo [2/2] Iniciando Frontend (Next.js)...
start "UniVia Frontend" cmd /k "cd /d "%PROJECT_DIR%frontend" && npm run dev"

echo.
echo ========================================
echo  UNIVIA ESTA INICIANDO...
echo ========================================
echo.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:3000
echo Docs API: http://localhost:8000/docs
echo.
echo Presiona cualquier tecla para cerrar esta ventana
echo (Los servicios seguiran corriendo en sus propias ventanas)
pause > nul
