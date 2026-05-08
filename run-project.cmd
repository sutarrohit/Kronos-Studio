@echo off
setlocal EnableExtensions

set "ROOT_DIR=%~dp0"
set "SERVER_DIR=%ROOT_DIR%server"
set "FRONTEND_DIR=%ROOT_DIR%frontend"

echo.
echo Kronos Studio runner
echo ====================
echo.

call :require_command node "Node.js is required. Install Node.js 18+ from https://nodejs.org/"
if errorlevel 1 goto :fail

call :require_command npm "npm is required. It is installed with Node.js."
if errorlevel 1 goto :fail

call :require_command uv "uv is required. Install it from https://docs.astral.sh/uv/getting-started/installation/"
if errorlevel 1 goto :fail

if not exist "%SERVER_DIR%\pyproject.toml" (
  echo [ERROR] Cannot find server\pyproject.toml.
  echo Make sure this file is being run from the Kronos Studio root folder.
  goto :fail
)

if not exist "%FRONTEND_DIR%\package.json" (
  echo [ERROR] Cannot find frontend\package.json.
  echo Make sure this file is being run from the Kronos Studio root folder.
  goto :fail
)

echo [1/4] Checking backend dependencies...
if not exist "%SERVER_DIR%\.venv" (
  echo Backend virtual environment was not found. Running uv sync...
  pushd "%SERVER_DIR%" || goto :fail
  call uv sync
  if errorlevel 1 (
    popd
    echo [ERROR] Backend dependency installation failed.
    goto :fail
  )
  popd
) else (
  echo Backend dependencies already appear to be installed.
)

echo.
echo [2/4] Checking frontend dependencies...
if not exist "%FRONTEND_DIR%\node_modules" (
  echo Frontend node_modules was not found. Running npm install...
  pushd "%FRONTEND_DIR%" || goto :fail
  call npm install
  if errorlevel 1 (
    popd
    echo [ERROR] Frontend dependency installation failed.
    goto :fail
  )
  popd
) else (
  echo Frontend dependencies already appear to be installed.
)

echo.
echo [3/4] Building frontend...
pushd "%FRONTEND_DIR%" || goto :fail
call npm run build
if errorlevel 1 (
  popd
  echo [ERROR] Frontend build failed.
  goto :fail
)
popd

echo.
echo [4/4] Starting backend and frontend...
start "Kronos Studio API" cmd /k "cd /d ""%SERVER_DIR%"" && call uv run .\start_server.py"
start "Kronos Studio Frontend" cmd /k "cd /d ""%FRONTEND_DIR%"" && call npm run start"

echo.
echo Started Kronos Studio.
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:8000
echo.
echo You can close this launcher window. The API and frontend are running in separate windows.
echo.
pause

exit /b 0

:fail
echo.
echo The launcher stopped because of the error above.
echo.
pause
exit /b 1

:require_command
where %~1 >nul 2>nul
if errorlevel 1 (
  echo [ERROR] %~1 was not found on PATH.
  echo %~2
  exit /b 1
)
exit /b 0
