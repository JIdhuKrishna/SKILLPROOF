@echo off
REM Add Node to PATH for this script and run server.js with redirected logs
set "PATH=C:\Program Files\nodejs;%PATH%"
"C:\Program Files\nodejs\node.exe" server.js > backend_log.txt 2>&1
exit /b %ERRORLEVEL%
