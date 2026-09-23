@echo off
rem Double-click to set up (or update) the fridge dashboard. Windows will ask for admin rights.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup-windows.ps1"
