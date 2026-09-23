@echo off
rem Starts the fridge dashboard and opens it full-screen.
rem setup-windows.bat puts a shortcut to this file in the Startup folder.
cd /d "%~dp0"

rem Defaults, then your own settings (settings.cmd is created by setup and never overwritten).
set SCREEN_OFF_MINUTES=10
if exist "%~dp0settings.cmd" call "%~dp0settings.cmd"

rem Find Node.js even if this sign-in started before it was installed.
set "PATH=%ProgramFiles%\nodejs;%PATH%"

rem Restarts the server automatically if it ever crashes.
start "Fridge dashboard server" /min cmd /c "for /l %%i in (0,0,1) do (node server.js & timeout /t 5 /nobreak >nul)"
timeout /t 3 /nobreak >nul

rem A separate browser profile, so kiosk mode works even if Chrome is already open.
set URL=http://localhost:3000
set FLAGS=--kiosk --app=%URL% --user-data-dir="%LOCALAPPDATA%\FridgeKiosk" --no-first-run --no-default-browser-check --use-fake-ui-for-media-stream --autoplay-policy=no-user-gesture-required --disable-pinch --overscroll-history-navigation=0 --noerrdialogs --disable-session-crashed-bubble --disable-features=Translate

if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
  start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" %FLAGS%
) else if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
  start "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" %FLAGS%
) else if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" (
  start "" "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" %FLAGS%
) else (
  start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" %FLAGS% --edge-kiosk-type=fullscreen
)
