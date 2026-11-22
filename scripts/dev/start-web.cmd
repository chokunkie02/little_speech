@echo off
rem Starts the Speech Adventure dev server in its own window (http://localhost:3000).
rem Double-click this file. Docker Desktop must be running for sign-in and saved results.
rem Close this window (or press Ctrl+C) to stop the server.
title Speech Adventure web - http://localhost:3000 (close to stop)
cd /d "%~dp0..\.."
docker info >nul 2>&1 || echo [!] Docker Desktop is not running: the site opens, but sign-in and saving results need it.
call npm run dev
echo.
echo The server stopped. Press any key to close this window.
pause >nul
