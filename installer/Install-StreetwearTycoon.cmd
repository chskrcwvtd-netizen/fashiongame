@echo off
setlocal
rem Installs Streetwear Tycoon for this Windows user: copies the game and adds Desktop and Start menu shortcuts.
set "SRC=%~dp0StreetwearTycoon.exe"
set "DEST=%LOCALAPPDATA%\Programs\Streetwear Tycoon"
if not exist "%SRC%" (
  echo StreetwearTycoon.exe must be in the same folder as this file.
  pause
  exit /b 1
)
if not exist "%DEST%" mkdir "%DEST%"
copy /Y "%SRC%" "%DEST%\StreetwearTycoon.exe" >nul
if errorlevel 1 (
  echo Could not copy the game. Is it still running? Close it and try again.
  pause
  exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -Command "$w = New-Object -ComObject WScript.Shell; $exe = Join-Path $env:LOCALAPPDATA 'Programs\Streetwear Tycoon\StreetwearTycoon.exe'; foreach ($dir in @([Environment]::GetFolderPath('Desktop'), [Environment]::GetFolderPath('Programs'))) { $l = $w.CreateShortcut((Join-Path $dir 'Streetwear Tycoon.lnk')); $l.TargetPath = $exe; $l.WorkingDirectory = Split-Path $exe; $l.Save() }"
echo.
echo Streetwear Tycoon is installed. Find it on your Desktop and in the Start menu.
pause
