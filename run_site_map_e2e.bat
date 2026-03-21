@echo off
setlocal

cd /d "%~dp0"

if "%E2E_USER%"=="" set "E2E_USER=Administrator"
if "%E2E_PASSWORD%"=="" set "E2E_PASSWORD=admin"
if "%E2E_HEADLESS%"=="" set "E2E_HEADLESS=1"

call npm --prefix frontend run e2e:site-map:ci:warn
set "EXIT_CODE=%ERRORLEVEL%"

if not "%EXIT_CODE%"=="0" (
  echo.
  echo Site-map E2E failed with exit code %EXIT_CODE%.
)

exit /b %EXIT_CODE%