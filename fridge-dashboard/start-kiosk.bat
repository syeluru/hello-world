@echo off
rem Starts the fridge dashboard and opens it full-screen.
rem Put a shortcut to this file in shell:startup to launch it at boot.
cd /d "%~dp0"

rem Minutes without a tap before the dashboard blacks out the screen (0 = never).
set SCREEN_OFF_MINUTES=10

rem Restarts the server automatically if it ever crashes.
start "Fridge dashboard server" /min cmd /c "for /l %%i in (0,0,1) do (node server.js & timeout /t 5 /nobreak >nul)"
timeout /t 3 /nobreak >nul

set URL=http://localhost:3000
set FLAGS=--kiosk --app=%URL% --use-fake-ui-for-media-stream --autoplay-policy=no-user-gesture-required --disable-pinch --overscroll-history-navigation=0 --noerrdialogs --disable-session-crashed-bubble

if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
  start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" %FLAGS%
) else if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
  start "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" %FLAGS%
) else (
  start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" %FLAGS% --edge-kiosk-type=fullscreen
)
