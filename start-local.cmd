@echo off
setlocal
cd /d "%~dp0"

if not exist "backend\.venv\Scripts\python.exe" (
  echo Falta la preparacion inicial. Ejecute setup.cmd primero.
  pause
  exit /b 1
)
if not exist "backend\.env" (
  echo Falta backend\.env. Ejecute setup.cmd primero.
  pause
  exit /b 1
)
if not exist "frontend\.env.local" (
  echo Falta frontend\.env.local. Ejecute setup.cmd primero.
  pause
  exit /b 1
)

start "AI Trading - Backend" cmd /k "cd /d ""%~dp0backend"" && .venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"
start "AI Trading - Frontend" cmd /k "cd /d ""%~dp0frontend"" && npm.cmd run dev"

echo Backend y frontend iniciados en dos ventanas.
echo Abra http://localhost:5173
timeout /t 4 >nul
