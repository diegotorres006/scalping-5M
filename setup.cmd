@echo off
setlocal
cd /d "%~dp0"

echo Preparando backend...
if not exist "backend\.venv\Scripts\python.exe" (
  python -m venv "backend\.venv"
)
"backend\.venv\Scripts\python.exe" -m pip install --upgrade pip
"backend\.venv\Scripts\python.exe" -m pip install -r "backend\requirements.txt"
if not exist "backend\.env" copy "backend\.env.example" "backend\.env" >nul

echo Preparando frontend...
cd /d "%~dp0frontend"
call npm.cmd install
if not exist ".env.local" copy ".env.example" ".env.local" >nul

echo.
echo Preparacion terminada.
echo Configure frontend\.env.local y backend\.env antes de iniciar.
pause
