[CmdletBinding()]
param(
    [string]$CommitSha,
    [string]$RepoOwner = "ayktbrkk",
    [string]$RepoName = "acentem_takipte",
    [string]$WorkflowName = "Coolify GHCR Image",
    [string]$ImageName = "ghcr.io/ayktbrkk/acentem-worker:latest",
    [string]$SshTarget = "root@77.42.72.44",
    [string]$SshKeyPath = "$HOME\.ssh\id_ed25519_hetzner_deploy",
    [string]$CoolifyAppDir = "/data/coolify/applications/h1d0pwvazwy9u59vrca160q9",
    [string]$SiteName = "kipsigorta.acentemtakipte.com",
    [string]$PublicBaseUrl = "https://kipsigorta.acentemtakipte.com",
    [string]$AdminUser = "Administrator",
    [PSCredential]$AdminCredential,
    [string]$AdminPasswordEnvVar = "AT_PROD_ADMIN_PASSWORD",
    [int]$WorkflowTimeoutMinutes = 30,
    [int]$WorkflowPollSeconds = 15,
    [switch]$DryRun,
    [switch]$SkipWorkflowWait,
    [switch]$SkipAuthenticatedSmokeTest,
    [switch]$AllowDirtyWorktree
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host "==> $Message"
}

function Write-DryRun {
    param([string]$Message)
    Write-Host "[dry-run] $Message"
}

function Get-ResolvedCommitSha {
    if ($CommitSha) {
        return $CommitSha.Trim()
    }

    $resolved = (& git rev-parse HEAD).Trim()
    if (-not $resolved) {
        throw "Unable to resolve HEAD commit SHA."
    }

    return $resolved
}

function Assert-CleanWorktree {
    if ($AllowDirtyWorktree -or $DryRun) {
        return
    }

    $status = & git status --short
    if ($LASTEXITCODE -ne 0) {
        throw "git status failed."
    }

    if ($status) {
        throw "Working tree is dirty. Commit or stash changes first, or rerun with -AllowDirtyWorktree."
    }
}

function Invoke-GitHubApi {
    param([string]$Path)

    $uri = "https://api.github.com/repos/$RepoOwner/$RepoName/$Path"
    $response = Invoke-WebRequest -UseBasicParsing -Uri $uri
    return $response.Content | ConvertFrom-Json
}

function Wait-ForGhcrWorkflow {
    param([string]$TargetCommitSha)

    $deadline = (Get-Date).AddMinutes($WorkflowTimeoutMinutes)

    while ((Get-Date) -lt $deadline) {
        $payload = Invoke-GitHubApi -Path "actions/runs?per_page=20"
        $run = $payload.workflow_runs | Where-Object {
            $_.name -eq $WorkflowName -and $_.head_sha -eq $TargetCommitSha
        } | Select-Object -First 1

        if ($null -eq $run) {
            Write-Host "Workflow run not found yet for $TargetCommitSha. Waiting $WorkflowPollSeconds seconds..."
            Start-Sleep -Seconds $WorkflowPollSeconds
            continue
        }

        Write-Host "Workflow $($run.id): status=$($run.status) conclusion=$($run.conclusion)"

        if ($run.status -eq "completed") {
            if ($run.conclusion -ne "success") {
                throw "Workflow $($run.id) completed with conclusion '$($run.conclusion)'. See $($run.html_url)"
            }

            return $run
        }

        Start-Sleep -Seconds $WorkflowPollSeconds
    }

    throw "Timed out waiting for workflow '$WorkflowName' for commit $TargetCommitSha."
}

function Invoke-Ssh {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments,
        [Parameter(Mandatory = $false)]
        [string]$StandardInput
    )

    if (-not (Test-Path $SshKeyPath)) {
        throw "SSH key not found at '$SshKeyPath'."
    }

    if ($PSBoundParameters.ContainsKey("StandardInput")) {
        $tempFile = [System.IO.Path]::GetTempFileName()
        try {
            $normalizedInput = $StandardInput -replace "`r`n", "`n"
            Set-Content -Path $tempFile -Value $normalizedInput -NoNewline
            Get-Content -Path $tempFile -Raw | & ssh -i $SshKeyPath $SshTarget @Arguments
        }
        finally {
            Remove-Item -Path $tempFile -Force -ErrorAction SilentlyContinue
        }
    }
    else {
        & ssh -i $SshKeyPath $SshTarget @Arguments
    }

    if ($LASTEXITCODE -ne 0) {
        throw "SSH command failed with exit code $LASTEXITCODE."
    }
}

function Get-AdminLoginValues {
    if ($null -ne $AdminCredential) {
        return @{
            User = $AdminCredential.UserName
            Password = $AdminCredential.GetNetworkCredential().Password
        }
    }

    if ($AdminPasswordEnvVar -and (Test-Path "Env:$AdminPasswordEnvVar")) {
        return @{
            User = $AdminUser
            Password = (Get-Item "Env:$AdminPasswordEnvVar").Value
        }
    }

    return $null
}

function Invoke-RemoteDeploy {
    if ($DryRun) {
        Write-Step "Dry-run: remote deploy plan"
        Write-DryRun "Would connect to $SshTarget using key '$SshKeyPath'."
        Write-DryRun "Would pull image $ImageName inside $CoolifyAppDir."
        Write-DryRun "Would update APP_IMAGE in .env and recreate backend, frontend, websocket, worker-short, worker-long, and scheduler services."
        Write-DryRun "Would verify production safety flags, run bench migrate, ensure_role_permissions, clear-cache, clear-website-cache, and bench doctor for site $SiteName."
        return
    }

    $remoteScript = @'
set -euo pipefail

coolify_app_dir="$1"
site_name="$2"
image_name="$3"

cd "$coolify_app_dir"
docker pull "$image_name"
sed -i "s#^APP_IMAGE=.*#APP_IMAGE=$image_name#" .env
docker compose --env-file .env -f docker-compose.yaml up -d backend frontend websocket worker-short worker-long scheduler

backend_container_id="$(docker compose --env-file .env -f docker-compose.yaml ps -q backend)"
if [ -z "$backend_container_id" ]; then
  echo "Backend container not found after compose up." >&2
  exit 1
fi

docker exec "$backend_container_id" bash -lc "cd /home/frappe/frappe-bench/sites && SITE_NAME='$site_name' python3 -" <<'PY'
import json
import os
from pathlib import Path

site_name = os.environ["SITE_NAME"]
config = {}
for path in (Path("common_site_config.json"), Path(site_name) / "site_config.json"):
    if path.exists():
        config.update(json.loads(path.read_text()))

def enabled(value):
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value != 0
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "on"}
    return False

developer_mode = config.get("developer_mode", 0)
demo_endpoints = config.get("at_enable_demo_endpoints", 0)
if enabled(developer_mode) or enabled(demo_endpoints):
    raise SystemExit(
        "Unsafe production flags: "
        f"developer_mode={developer_mode!r}, "
        f"at_enable_demo_endpoints={demo_endpoints!r}"
    )

print(
    "Production safety flags OK: "
    f"developer_mode={developer_mode!r}, "
    f"at_enable_demo_endpoints={demo_endpoints!r}, "
    f"sentry_dsn_set={bool(config.get('sentry_dsn'))}"
)
PY

docker exec "$backend_container_id" bench --site "$site_name" migrate
docker exec "$backend_container_id" bench --site "$site_name" execute acentem_takipte.acentem_takipte.setup_utils.ensure_role_permissions
docker exec "$backend_container_id" bench --site "$site_name" clear-cache
docker exec "$backend_container_id" bench --site "$site_name" clear-website-cache

echo "APP_IMAGE=$(awk -F= '/^APP_IMAGE=/{print $2}' .env)"
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}' | grep 'h1d0pwvazwy9u59vrca160q9'
docker exec "$backend_container_id" bench --site "$site_name" doctor
'@

    Write-Step "Redeploying Coolify app services on $SshTarget"
    Invoke-Ssh -Arguments @(
        "bash",
        "-s",
        "--",
        $CoolifyAppDir,
        $SiteName,
        $ImageName
    ) -StandardInput $remoteScript
}

function Invoke-SmokeTest {
    if ($DryRun) {
        Write-Step "Dry-run: smoke test plan"
        Write-DryRun "Would request $PublicBaseUrl/api/method/ping."

        if ($SkipAuthenticatedSmokeTest) {
            Write-DryRun "Would skip authenticated route smoke tests because -SkipAuthenticatedSmokeTest was provided."
            return
        }

        $adminLogin = Get-AdminLoginValues
        if (-not $adminLogin) {
            Write-DryRun "Would skip authenticated route smoke tests because no admin credential was provided."
            return
        }

        foreach ($path in @(
            "/at/payments",
            "/at/tasks",
            "/at/at-documents",
            "/at/reports?report=policy_list"
        )) {
            Write-DryRun "Would request $PublicBaseUrl$path with authenticated session."
        }

        return
    }

    $adminLogin = Get-AdminLoginValues

    Write-Step "Checking /api/method/ping"
    $ping = Invoke-WebRequest -UseBasicParsing -Uri "$PublicBaseUrl/api/method/ping"
    if ($ping.StatusCode -ne 200) {
        throw "Ping check failed with status $($ping.StatusCode)."
    }

    if ($SkipAuthenticatedSmokeTest) {
        Write-Host "Skipping authenticated smoke test because -SkipAuthenticatedSmokeTest was provided."
        return
    }

    if (-not $adminLogin) {
        Write-Host "Skipping authenticated smoke test because no admin credential was provided. Set AT_PROD_ADMIN_PASSWORD or pass -AdminCredential."
        return
    }

    Write-Step "Running authenticated smoke test on critical AT routes"
    $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    Invoke-WebRequest -Uri "$PublicBaseUrl/api/method/login" -Method Post -Body @{ usr = $adminLogin.User; pwd = $adminLogin.Password } -WebSession $session -ContentType "application/x-www-form-urlencoded" | Out-Null

    $paths = @(
        "/at/payments",
        "/at/tasks",
        "/at/at-documents",
        "/at/reports?report=policy_list"
    )

    foreach ($path in $paths) {
        $response = Invoke-WebRequest -Uri ($PublicBaseUrl + $path) -WebSession $session
        $hasValidationError = $response.Content -match "ValidationError|Traceback|PermissionError"
        if ($response.StatusCode -ne 200 -or $hasValidationError) {
            throw "Smoke check failed for $path. Status=$($response.StatusCode) ValidationError=$hasValidationError"
        }

        Write-Host "OK $path"
    }
}

$resolvedCommitSha = Get-ResolvedCommitSha
Write-Step "Using commit $resolvedCommitSha"
Assert-CleanWorktree

if (-not $SkipWorkflowWait) {
    if ($DryRun) {
        Write-Step "Dry-run: workflow wait plan"
        Write-DryRun "Would wait for workflow '$WorkflowName' to publish the GHCR image for commit $resolvedCommitSha."
    }
    else {
        Write-Step "Waiting for workflow '$WorkflowName' to publish the GHCR image"
        $run = Wait-ForGhcrWorkflow -TargetCommitSha $resolvedCommitSha
        Write-Host "Workflow succeeded: $($run.html_url)"
    }
}

Invoke-RemoteDeploy
Invoke-SmokeTest

if ($DryRun) {
    Write-Step "Dry-run completed successfully"
}
else {
    Write-Step "Production deploy completed successfully"
}
