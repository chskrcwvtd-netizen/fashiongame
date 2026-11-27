@echo off
rem Removes the shortcuts and the installed copy. Your saves are kept.
powershell -NoProfile -ExecutionPolicy Bypass -Command "foreach ($dir in @([Environment]::GetFolderPath('Desktop'), [Environment]::GetFolderPath('Programs'))) { Remove-Item -LiteralPath (Join-Path $dir 'Streetwear Tycoon.lnk') -ErrorAction SilentlyContinue }"
if exist "%LOCALAPPDATA%\Programs\Streetwear Tycoon" rmdir /S /Q "%LOCALAPPDATA%\Programs\Streetwear Tycoon"
echo Streetwear Tycoon was removed. Your saves are still there if you install it again.
pause
