#!/usr/bin/env pwsh
# Authenticated production smoke for import/export and critical /at routes.

param(
    [string]$PublicBaseUrl = "https://kipsigorta.acentemtakipte.com",
    [string]$AdminUser = "Administrator",
    [string]$AdminPassword = $env:AT_PROD_ADMIN_PASSWORD
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not $AdminPassword) {
    throw "Set AT_PROD_ADMIN_PASSWORD before running production API smoke."
}

function Write-Step([string]$Message) {
    Write-Host "==> $Message"
}

Write-Step "Login to $PublicBaseUrl"
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$login = Invoke-WebRequest -Uri "$PublicBaseUrl/api/method/login" -Method Post -WebSession $session `
    -Body @{ usr = $AdminUser; pwd = $AdminPassword } `
    -ContentType "application/x-www-form-urlencoded"
if ($login.StatusCode -ne 200) {
    throw "Login failed with status $($login.StatusCode)"
}

$loggedUser = Invoke-WebRequest -UseBasicParsing -Uri "$PublicBaseUrl/api/method/frappe.auth.get_logged_user" -WebSession $session
$userPayload = $loggedUser.Content | ConvertFrom-Json
if ($userPayload.message -eq "Guest") {
    throw "Login did not establish an authenticated session."
}
Write-Host "Logged in as $($userPayload.message)"

$spaRoutes = @(
    "/at/payments",
    "/at/tasks",
    "/at/at-documents",
    "/at/reports?report=policy_list",
    "/at/data-import",
    "/at/data-export"
)

foreach ($path in $spaRoutes) {
    $response = Invoke-WebRequest -Uri ($PublicBaseUrl + $path) -WebSession $session -UseBasicParsing
    $hasValidationError = $response.Content -match "ValidationError|Traceback|PermissionError"
    if ($response.StatusCode -ne 200 -or $hasValidationError) {
        throw "SPA smoke failed for $path (status=$($response.StatusCode), validationError=$hasValidationError)"
    }
    Write-Host "OK $path"
}

Write-Step "Checking export API download_export"
$exportUrl = "$PublicBaseUrl/api/method/acentem_takipte.acentem_takipte.api.list_exports.download_export?screen=customer_list&export_format=xlsx&limit=5&filename=prod_smoke"
$exportResponse = Invoke-WebRequest -Uri $exportUrl -WebSession $session -UseBasicParsing
if ($exportResponse.StatusCode -ne 200) {
    throw "download_export failed with status $($exportResponse.StatusCode)"
}
$contentType = $exportResponse.Headers["Content-Type"]
$bytes = $exportResponse.RawContentLength
if (-not $contentType) { $contentType = "unknown" }
Write-Host "OK download_export contentType=$contentType bytes=$bytes"

Write-Step "Checking import API list_import_jobs"
$jobsResponse = Invoke-WebRequest -Uri "$PublicBaseUrl/api/method/acentem_takipte.acentem_takipte.api.data_import.list_import_jobs" -WebSession $session -UseBasicParsing
if ($jobsResponse.StatusCode -ne 200) {
    throw "list_import_jobs failed with status $($jobsResponse.StatusCode)"
}
$jobsPayload = $jobsResponse.Content | ConvertFrom-Json
if ($null -eq $jobsPayload.message) {
    throw "list_import_jobs returned unexpected payload"
}
Write-Host "OK list_import_jobs count=$($jobsPayload.message.Count)"

Write-Step "PROD SMOKE OK"
