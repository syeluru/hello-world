@echo off
rem One-time setup for an always-on fridge PC. Right-click this file -> "Run as administrator".
rem Everything here can be undone in Settings; see docs/WINDOWS-SETUP.md.

net session >nul 2>&1
if errorlevel 1 (
  echo Please right-click setup-windows.bat and choose "Run as administrator".
  pause
  exit /b 1
)

echo Plugged in: never turn off the screen, never sleep, never hibernate...
powercfg /change monitor-timeout-ac 0
powercfg /change standby-timeout-ac 0
powercfg /change hibernate-timeout-ac 0

echo Don't ask for a password when the PC wakes up...
powercfg /setacvalueindex SCHEME_CURRENT SUB_NONE CONSOLELOCK 0
powercfg /setactive SCHEME_CURRENT

echo Turn off edge swipes, so a stray swipe can't open widgets or notifications over the dashboard...
reg add "HKLM\SOFTWARE\Policies\Microsoft\Windows\EdgeUI" /v AllowEdgeSwipe /t REG_DWORD /d 0 /f >nul

echo.
echo Done. Your PC's standby type is listed below. "S0 Low Power Idle" means Modern Standby:
echo leave the screen timeout at Never and let the dashboard black out the screen instead.
echo.
powercfg /a
echo.
pause
