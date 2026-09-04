@echo off
echo Restarting PostgreSQL...
net stop postgresql-x64-18
timeout /t 2
net start postgresql-x64-18
echo.
echo Done! You can close this window now.
pause
