# Fridge dashboard - one-time Windows 11 setup (safe to run again to update).
# Start it by double-clicking setup-windows.bat. It asks for admin rights on its own.
#
# What it does:
#   1. Installs Node.js and Google Chrome (and Lenovo Vantage on Lenovo PCs) with winget
#   2. Copies the dashboard to C:\fridge-dashboard (your lists and settings are kept)
#   3. Asks your town for the weather (first run only)
#   4. Power: never sleep, never turn the screen off, lid does nothing, no password on wake
#   5. Quiets Windows: notifications, tips, screen saver, edge swipes; allows the microphone
#   6. Starts the dashboard automatically when you sign in
#   7. Sets up automatic sign-in (Sysinternals Autologon)
#   8. Lets phones on your home Wi-Fi open the dashboard

$ErrorActionPreference = 'Stop'

# ---------- run as administrator ----------

$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  Start-Process powershell.exe -Verb RunAs -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
  exit
}

$Source = $PSScriptRoot
$Dest = 'C:\fridge-dashboard'
$Failed = New-Object System.Collections.Generic.List[string]

function Step([string]$Name, [scriptblock]$Body) {
  Write-Host ''
  Write-Host "== $Name" -ForegroundColor Cyan
  try { & $Body }
  catch {
    Write-Host "   Problem: $($_.Exception.Message)" -ForegroundColor Yellow
    $Failed.Add($Name)
  }
}

function Set-Reg([string]$Path, [string]$Name, $Value, [string]$Type = 'DWord') {
  if (-not (Test-Path $Path)) { New-Item -Path $Path -Force | Out-Null }
  New-ItemProperty -Path $Path -Name $Name -Value $Value -PropertyType $Type -Force | Out-Null
}

function Ask-Yes([string]$Question) {
  $answer = Read-Host "$Question [Y/n]"
  return ($answer -eq '' -or $answer -match '^[Yy]')
}

function Winget-Install([string]$Id, [string]$Label, [string]$Source = 'winget') {
  Write-Host "   Installing $Label..."
  & winget install --id $Id --exact --source $Source --silent --accept-package-agreements --accept-source-agreements | Out-Host
  # 0 = installed; -1978335189 = already installed / no newer version
  if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne -1978335189) { throw "winget could not install $Label (code $LASTEXITCODE)" }
}

Write-Host 'Fridge dashboard setup' -ForegroundColor Green
Write-Host "Copying from: $Source"

# ---------- 1. apps ----------

Step 'Install Node.js and Google Chrome' {
  if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    throw 'winget is not ready yet. Open the Microsoft Store > Library > "Get updates", wait for it to finish, then run setup again.'
  }
  $nodeExe = Join-Path $env:ProgramFiles 'nodejs\node.exe'
  if ((Test-Path $nodeExe) -or (Get-Command node -ErrorAction SilentlyContinue)) { Write-Host '   Node.js is already installed.' }
  else { Winget-Install 'OpenJS.NodeJS.LTS' 'Node.js' }

  $chrome = @(
    (Join-Path $env:ProgramFiles 'Google\Chrome\Application\chrome.exe'),
    (Join-Path ${env:ProgramFiles(x86)} 'Google\Chrome\Application\chrome.exe'),
    (Join-Path $env:LOCALAPPDATA 'Google\Chrome\Application\chrome.exe')
  ) | Where-Object { Test-Path $_ }
  if ($chrome) { Write-Host '   Chrome is already installed.' }
  else { Winget-Install 'Google.Chrome' 'Google Chrome' }
}

$isLenovo = (Get-CimInstance Win32_ComputerSystem).Manufacturer -match 'LENOVO'
if ($isLenovo) {
  Step 'Install Lenovo Vantage (battery conservation mode and drivers)' {
    if (Get-AppxPackage -Name 'E046963F.LenovoCompanion' -ErrorAction SilentlyContinue) { Write-Host '   Lenovo Vantage is already installed.' }
    else { Winget-Install '9WZDNCRFJ4MV' 'Lenovo Vantage' 'msstore' }
  }
}

# ---------- 2. files ----------

Step "Copy the dashboard to $Dest" {
  Get-ChildItem -Path $Source -Recurse -File | Unblock-File
  if ((Resolve-Path $Source).Path.TrimEnd('\') -ieq $Dest) {
    Write-Host '   Already running from there.'
  } else {
    # Keep the family's lists (data\) and settings.cmd if this is an update.
    & robocopy $Source $Dest /E /XD data /XF settings.cmd /NFL /NDL /NJH /NJS /NP | Out-Null
    if ($LASTEXITCODE -ge 8) { throw "robocopy failed (code $LASTEXITCODE)" }
    Write-Host '   Copied.'
  }
}

# ---------- 3. settings ----------

Step 'Weather location' {
  $settings = Join-Path $Dest 'settings.cmd'
  if (Test-Path $settings) { Write-Host "   Keeping your existing $settings"; return }

  $lines = @(
    '@echo off',
    'rem Your dashboard settings. Setup never overwrites this file.',
    'rem Minutes without a tap before the screen goes black (0 = never).',
    'set SCREEN_OFF_MINUTES=10',
    'rem Uncomment for a 24-hour clock:',
    'rem set CLOCK_24H=1'
  )

  $town = Read-Host '   Town or ZIP code for the weather (press Enter to skip)'
  if ($town) {
    $url = 'https://geocoding-api.open-meteo.com/v1/search?count=1&language=en&name=' + [uri]::EscapeDataString($town)
    $place = (Invoke-RestMethod -Uri $url -UseBasicParsing).results | Select-Object -First 1
    if ($place) {
      $inv = [Globalization.CultureInfo]::InvariantCulture
      $units = 'celsius'
      if ($place.country_code -in @('US', 'LR', 'MM')) { $units = 'fahrenheit' }
      Write-Host "   Found: $($place.name), $($place.admin1), $($place.country)"
      $lines += "set LAT=$(([double]$place.latitude).ToString($inv))"
      $lines += "set LON=$(([double]$place.longitude).ToString($inv))"
      $lines += "set UNITS=$units"
    } else {
      Write-Host "   Couldn't find '$town'. You can add LAT and LON to settings.cmd later." -ForegroundColor Yellow
    }
  }
  Set-Content -Path $settings -Value $lines -Encoding ASCII
  Write-Host "   Saved $settings"
}

# ---------- 4. power ----------

Step 'Power: never sleep, screen always on, lid does nothing (when plugged in)' {
  powercfg /change monitor-timeout-ac 0
  powercfg /change standby-timeout-ac 0
  powercfg /change hibernate-timeout-ac 0
  powercfg /setacvalueindex SCHEME_CURRENT SUB_BUTTONS LIDACTION 0
  powercfg /setacvalueindex SCHEME_CURRENT SUB_NONE CONSOLELOCK 0
  powercfg /setactive SCHEME_CURRENT
  Write-Host '   Done. The dashboard blacks the screen out itself and wakes on a tap.'
}

# ---------- 5. quiet Windows ----------

Step 'Quiet Windows and allow the microphone' {
  $cdm = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager'
  # Notification pop-ups off
  Set-Reg 'HKCU:\Software\Microsoft\Windows\CurrentVersion\PushNotifications' 'ToastEnabled' 0
  # "Welcome experience", "tips and suggestions", "finish setting up your device" off
  Set-Reg $cdm 'SubscribedContent-310093Enabled' 0
  Set-Reg $cdm 'SubscribedContent-338389Enabled' 0
  Set-Reg $cdm 'SoftLandingEnabled' 0
  Set-Reg 'HKCU:\Software\Microsoft\Windows\CurrentVersion\UserProfileEngagement' 'ScoobeSystemSettingEnabled' 0
  # Screen saver off
  Set-Reg 'HKCU:\Control Panel\Desktop' 'ScreenSaveActive' '0' 'String'
  # Edge swipes off (they'd open widgets / notifications over the dashboard)
  Set-Reg 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\EdgeUI' 'AllowEdgeSwipe' 0
  # Microphone allowed, including for desktop apps like Chrome
  $mic = 'SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\microphone'
  Set-Reg "HKLM:\$mic" 'Value' 'Allow' 'String'
  Set-Reg "HKCU:\$mic" 'Value' 'Allow' 'String'
  Set-Reg "HKCU:\$mic\NonPackaged" 'Value' 'Allow' 'String'
  # Windows Update restarts only outside 6am-11pm
  Set-Reg 'HKLM:\SOFTWARE\Microsoft\WindowsUpdate\UX\Settings' 'ActiveHoursStart' 6
  Set-Reg 'HKLM:\SOFTWARE\Microsoft\WindowsUpdate\UX\Settings' 'ActiveHoursEnd' 23
  Write-Host '   Done.'
}

# ---------- 6. start at sign-in ----------

Step 'Start the dashboard when you sign in' {
  $startup = [Environment]::GetFolderPath('Startup')
  $shell = New-Object -ComObject WScript.Shell
  $link = $shell.CreateShortcut((Join-Path $startup 'Fridge Dashboard.lnk'))
  $link.TargetPath = Join-Path $Dest 'start-kiosk.bat'
  $link.WorkingDirectory = $Dest
  $link.WindowStyle = 7
  $link.Save()
  Write-Host "   Shortcut added to $startup"
}

# ---------- 7. automatic sign-in ----------

Step 'Automatic sign-in' {
  $winlogon = Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon'
  if ($winlogon.AutoAdminLogon -eq '1') { Write-Host "   Already set up for $($winlogon.DefaultUserName)."; return }
  if (-not (Ask-Yes '   Sign in automatically after restarts and power cuts? (recommended)')) { return }

  # Autologon doesn't work while "only allow Windows Hello sign-in" is on.
  Set-Reg 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\PasswordLess\Device' 'DevicePasswordLessBuildVersion' 0

  $tools = Join-Path $Dest 'tools'
  New-Item -ItemType Directory -Path $tools -Force | Out-Null
  $zip = Join-Path $tools 'AutoLogon.zip'
  Invoke-WebRequest -Uri 'https://download.sysinternals.com/files/AutoLogon.zip' -OutFile $zip -UseBasicParsing
  Expand-Archive -Path $zip -DestinationPath $tools -Force
  $exe = switch ($env:PROCESSOR_ARCHITECTURE) { 'ARM64' { 'Autologon64a.exe' } 'AMD64' { 'Autologon64.exe' } default { 'Autologon.exe' } }

  Write-Host ''
  Write-Host '   An Autologon window will open:' -ForegroundColor Green
  Write-Host '     Username: for a Microsoft account, type the account EMAIL address'
  Write-Host '     Domain:   leave as it is'
  Write-Host '     Password: the account PASSWORD (not your PIN)'
  Write-Host '     Then click Enable, then OK.'
  Start-Process -FilePath (Join-Path $tools $exe) -ArgumentList '/accepteula' -Wait
}

# ---------- 8. phones on the same Wi-Fi ----------

Step 'Let phones on your Wi-Fi open the dashboard' {
  if (-not (Ask-Yes '   Allow phones on this home Wi-Fi to open the dashboard?')) { return }
  # New Windows installs treat Wi-Fi as "Public", which blocks this. Home networks should be "Private".
  Get-NetConnectionProfile | Where-Object { $_.NetworkCategory -eq 'Public' } | ForEach-Object {
    Set-NetConnectionProfile -InterfaceIndex $_.InterfaceIndex -NetworkCategory Private
    Write-Host "   '$($_.Name)' is now a Private (home) network."
  }
  Get-NetFirewallRule -DisplayName 'Fridge dashboard' -ErrorAction SilentlyContinue | Remove-NetFirewallRule
  New-NetFirewallRule -DisplayName 'Fridge dashboard' -Direction Inbound -Action Allow -Profile Private `
    -Program (Join-Path $env:ProgramFiles 'nodejs\node.exe') | Out-Null
  Write-Host '   Firewall rule added (home networks only).'
}

# ---------- summary ----------

Write-Host ''
Write-Host '============================================================' -ForegroundColor Green
$standby = (powercfg /a) -join "`n"
if ($standby -match 'S0 Low Power Idle') {
  Write-Host 'This PC uses Modern Standby, so leave the Windows screen timeout at Never.'
}
if ($Failed.Count) {
  Write-Host 'Finished, but these steps need another look:' -ForegroundColor Yellow
  $Failed | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
  Write-Host 'Fix them (see docs\WINDOWS-SETUP.md), then run setup again. Finished steps are skipped or harmless to repeat.'
} else {
  Write-Host 'All done.' -ForegroundColor Green
}
$ips = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
  Where-Object { $_.IPAddress -notmatch '^(127\.|169\.254\.)' -and $_.PrefixOrigin -ne 'WellKnown' } |
  Select-Object -ExpandProperty IPAddress
if ($ips) {
  Write-Host ''
  Write-Host 'On a phone on the same Wi-Fi, open:' -ForegroundColor Green
  $ips | ForEach-Object { Write-Host "  http://$($_):3000" -ForegroundColor Green }
}
Write-Host ''
Write-Host 'Still to do by hand (docs\WINDOWS-SETUP.md, step 5):'
Write-Host '  - Lenovo Vantage: turn on Conservation Mode'
Write-Host '  - Settings > Display: Rotation lock ON once it is mounted'
Write-Host ''
if (Ask-Yes 'Restart now to test that everything starts on its own?') { Restart-Computer -Force }
