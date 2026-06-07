[CmdletBinding()]
param(
    [string]$Repository = "ayktbrkk/acentem_takipte",
    [string]$Branch = "main",
    [string[]]$RequiredWorkflows = @("Frontend CI", "Coolify GHCR Image"),
    [switch]$FailOnOpenBlockers
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Get-GitValue {
    param([string[]]$Arguments)
    $value = & git @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "git $($Arguments -join ' ') failed with exit code $LASTEXITCODE."
    }
    return ($value | Select-Object -First 1)
}

function Get-GitHubJson {
    param([string]$Path)

    $headers = @{
        Accept       = "application/vnd.github+json"
        "User-Agent" = "acentem-takipte-production-readiness"
    }

    foreach ($name in "GITHUB_TOKEN", "GH_TOKEN", "GITHUB_PAT") {
        $token = [Environment]::GetEnvironmentVariable($name)
        if ($token) {
            $headers.Authorization = "Bearer $token"
            break
        }
    }

    return Invoke-RestMethod -Headers $headers -Uri "https://api.github.com/repos/$Repository/$Path"
}

function Test-EnvPresent {
    param([string]$Name)
    return [bool][Environment]::GetEnvironmentVariable($Name)
}

$headSha = Get-GitValue @("rev-parse", "HEAD")
$originSha = Get-GitValue @("rev-parse", "origin/$Branch")
$branchInfo = Get-GitHubJson "branches/$Branch"
$runs = Get-GitHubJson "actions/runs?head_sha=$headSha&per_page=30"

$workflowResults = foreach ($workflowName in $RequiredWorkflows) {
    $matchingRuns = @($runs.workflow_runs | Where-Object { $_.name -eq $workflowName })
    $latest = $matchingRuns | Sort-Object created_at -Descending | Select-Object -First 1
    [pscustomobject]@{
        name       = $workflowName
        present    = [bool]$latest
        status     = if ($latest) { $latest.status } else { $null }
        conclusion = if ($latest) { $latest.conclusion } else { $null }
        url        = if ($latest) { $latest.html_url } else { $null }
        passed     = [bool]($latest -and $latest.status -eq "completed" -and $latest.conclusion -eq "success")
    }
}

$credentialChecks = @(
    "E2E_BASE_URL",
    "E2E_USER",
    "E2E_PASSWORD",
    "AT_PROD_ADMIN_PASSWORD",
    "SENTRY_DSN",
    "SENTRY_AUTH_TOKEN",
    "SMOKE_WEBHOOK_URL"
) | ForEach-Object {
    [pscustomobject]@{
        name    = $_
        present = Test-EnvPresent $_
    }
}

$openBlockers = New-Object System.Collections.Generic.List[string]
if (-not $branchInfo.protected) {
    [void]$openBlockers.Add("$Branch branch protection is disabled.")
}
if ($headSha -ne $originSha) {
    [void]$openBlockers.Add("Local HEAD does not match origin/$Branch.")
}
foreach ($workflow in $workflowResults) {
    if (-not $workflow.passed) {
        [void]$openBlockers.Add("Required workflow is not green for HEAD: $($workflow.name).")
    }
}
foreach ($name in "E2E_BASE_URL", "E2E_USER", "E2E_PASSWORD") {
    if (-not (Test-EnvPresent $name)) {
        [void]$openBlockers.Add("Authenticated smoke input is missing: $name.")
    }
}
if (-not (Test-EnvPresent "SENTRY_DSN")) {
    [void]$openBlockers.Add("Sentry DSN is not configured in the local validation environment.")
}
if (-not (Test-EnvPresent "SMOKE_WEBHOOK_URL")) {
    [void]$openBlockers.Add("Smoke/ops webhook URL is not configured in the local validation environment.")
}

$report = [pscustomobject]@{
    repository        = $Repository
    branch            = $Branch
    headSha           = $headSha
    originSha         = $originSha
    branchProtected   = [bool]$branchInfo.protected
    workflowResults   = $workflowResults
    credentialChecks  = $credentialChecks
    openBlockers      = @($openBlockers)
    ready             = ($openBlockers.Count -eq 0)
}

$report | ConvertTo-Json -Depth 6

if ($FailOnOpenBlockers -and $openBlockers.Count -gt 0) {
    exit 1
}
