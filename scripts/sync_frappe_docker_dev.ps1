param(
    [string]$ComposeDir = "C:\Users\Aykut\Documents\GitHub\frappe_docker",
    [string]$Site = "localhost",
    [switch]$RecreateServices,
    [switch]$Watch,
    [switch]$WatchNotify,
    [switch]$WatchBeep,
    [int]$WatchPollSeconds = 2,
    [int]$WatchDebounceMilliseconds = 800,
    [int]$WatchMaxIterations = 0,
    [switch]$SkipBuild,
    [switch]$SkipRestart,
    [switch]$SkipCacheClear,
    [switch]$SkipHttpCheck
)

$ErrorActionPreference = "Stop"

$script:ComposeFileArgs = @()
$script:RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$script:IsWindowsHost = $env:OS -eq "Windows_NT"

function Initialize-ComposeFileArgs {
    $script:ComposeFileArgs = @()
    $candidates = @(
        "compose.yaml",
        "overrides/compose.mariadb.yaml",
        "overrides/compose.redis.yaml",
        "overrides/compose.noproxy.yaml",
        "compose.override.yaml"
    )
    foreach ($candidate in $candidates) {
        if (Test-Path (Join-Path $ComposeDir $candidate)) {
            $script:ComposeFileArgs += @("-f", $candidate)
        }
    }
    if (-not $script:ComposeFileArgs.Count) {
        throw "No compose files found under $ComposeDir"
    }
}

function Invoke-Compose {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Args
    )

    $composeBase = @("compose") + $script:ComposeFileArgs
    & docker @composeBase @Args
}

function Get-FrontendManifestPath {
    $candidates = @(
        (Join-Path $PSScriptRoot "..\acentem_takipte\public\frontend\.vite\manifest.json"),
        (Join-Path $PSScriptRoot "..\acentem_takipte\acentem_takipte\public\frontend\.vite\manifest.json"),
        (Join-Path $PSScriptRoot "..\acentem_takipte\public\frontend\manifest.json"),
        (Join-Path $PSScriptRoot "..\acentem_takipte\acentem_takipte\public\frontend\manifest.json")
    )
    $existing = @($candidates | Where-Object { Test-Path $_ })
    if ($existing.Count -gt 0) {
        return ($existing | Sort-Object { (Get-Item $_).LastWriteTimeUtc.Ticks } -Descending | Select-Object -First 1)
    }
    return $candidates[0]
}

function Show-WatchToast {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Title,
        [Parameter(Mandatory = $true)]
        [string]$Message
    )

    if (-not $script:IsWindowsHost) { return $false }

    try {
        Add-Type -AssemblyName System.Runtime.WindowsRuntime -ErrorAction SilentlyContinue | Out-Null
        [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
        [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null

        $safeTitle = [System.Security.SecurityElement]::Escape([string]$Title)
        $safeMessage = [System.Security.SecurityElement]::Escape([string]$Message)
        $xmlString = @"
<toast>
  <visual>
    <binding template="ToastGeneric">
      <text>$safeTitle</text>
      <text>$safeMessage</text>
    </binding>
  </visual>
</toast>
"@
        $xml = New-Object Windows.Data.Xml.Dom.XmlDocument
        $xml.LoadXml($xmlString)
        $toast = [Windows.UI.Notifications.ToastNotification]::new($xml)
        $notifier = [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("PowerShell")
        $notifier.Show($toast)
        return $true
    }
    catch {
        return $false
    }
}

function Invoke-WatchSignal {
    param(
        [Parameter(Mandatory = $true)]
        [ValidateSet("success", "error", "info")]
        [string]$Level,
        [Parameter(Mandatory = $true)]
        [string]$Message
    )

    if ($WatchBeep) {
        try {
            if ($Level -eq "error") {
                [System.Media.SystemSounds]::Hand.Play()
            }
            elseif ($Level -eq "success") {
                [System.Media.SystemSounds]::Asterisk.Play()
            }
            else {
                [System.Media.SystemSounds]::Beep.Play()
            }
        }
        catch {
            # best effort
        }
    }

    if ($WatchNotify) {
        $title = switch ($Level) {
            "success" { "AT Dev Sync Basarili" }
            "error" { "AT Dev Sync Hata" }
            default { "AT Dev Sync" }
        }
        $shown = Show-WatchToast -Title $title -Message $Message
        if (-not $shown) {
            Write-Host "[watch-notify:$Level] $Message"
        }
    }
}

function Get-MainAssetInfo {
    $manifestPath = (Resolve-Path (Get-FrontendManifestPath)).Path
    $manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
    $mainEntry = $manifest.'src/main.js'
    if (-not $mainEntry) {
        throw "src/main.js manifest entry not found in $manifestPath"
    }
    $mainJs = [string]$mainEntry.file
    $mainCss = ""
    if ($mainEntry.css -and $mainEntry.css.Count -gt 0) {
        $mainCss = [string]$mainEntry.css[0]
    }
    return @{
        ManifestPath = $manifestPath
        MainJs       = $mainJs
        MainCss      = $mainCss
    }
}

function Get-WatchScopeEntries {
    param(
        [Parameter(Mandatory = $true)]
        [ValidateSet("frontend", "backend")]
        [string]$Scope
    )

    if ($Scope -eq "frontend") {
        $root = Join-Path $script:RepoRoot "frontend"
        if (-not (Test-Path $root)) { return @() }
        return @(
            Get-ChildItem $root -Recurse -File | Where-Object {
                $full = $_.FullName.Replace("/", "\")
                if ($full -match "\\node_modules\\") { return $false }
                if ($full -match "\\dist\\") { return $false }
                if ($full -match "\\coverage\\") { return $false }
                if ($full -match "\\\.git\\") { return $false }
                return $true
            } | Sort-Object FullName
        )
    }

    $backendRoot = Join-Path $script:RepoRoot "acentem_takipte"
    if (-not (Test-Path $backendRoot)) { return @() }
    return @(
        Get-ChildItem $backendRoot -Recurse -File | Where-Object {
            $full = $_.FullName.Replace("/", "\")
            if ($full -match "\\__pycache__\\") { return $false }
            if ($full -match "\\public\\frontend\\") { return $false } # generated frontend build output (prevents watch loops)
            if ($_.Extension -eq ".pyc") { return $false }
            return $true
        } | Sort-Object FullName
    )
}

function Get-LinesHash {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Lines
    )

    $sha = [System.Security.Cryptography.SHA256]::Create()
    try {
        $payload = [string]::Join("`n", $Lines)
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($payload)
        $hash = $sha.ComputeHash($bytes)
        return -join ($hash | ForEach-Object { $_.ToString("x2") })
    }
    finally {
        $sha.Dispose()
    }
}

function New-WatchSnapshot {
    $frontendEntries = Get-WatchScopeEntries -Scope "frontend"
    $backendEntries = Get-WatchScopeEntries -Scope "backend"

    $frontendLines = @($frontendEntries | ForEach-Object { "{0}|{1}|{2}" -f $_.FullName, $_.LastWriteTimeUtc.Ticks, $_.Length })
    $backendLines = @($backendEntries | ForEach-Object { "{0}|{1}|{2}" -f $_.FullName, $_.LastWriteTimeUtc.Ticks, $_.Length })

    return @{
        frontend = @{
            count = $frontendLines.Count
            hash  = (Get-LinesHash -Lines $frontendLines)
        }
        backend  = @{
            count = $backendLines.Count
            hash  = (Get-LinesHash -Lines $backendLines)
        }
    }
}

function Write-AssetInfoAndHttpChecks {
    if ($SkipHttpCheck -and $SkipBuild) {
        return
    }

    $assetInfo = Get-MainAssetInfo
    Write-Host "Manifest: $($assetInfo.ManifestPath)"
    Write-Host "Main JS : $($assetInfo.MainJs)"
    if ($assetInfo.MainCss) {
        Write-Host "Main CSS: $($assetInfo.MainCss)"
    }

    if ($SkipHttpCheck) {
        Write-Host "Skipping HTTP asset checks."
        return
    }

    if ($assetInfo.MainJs) {
        $jsUrl = "http://localhost:8080/assets/acentem_takipte/frontend/$($assetInfo.MainJs)"
        Write-Host "HTTP check JS : $jsUrl"
        & curl.exe -I $jsUrl | Select-Object -First 8 | Out-Host
    }
    if ($assetInfo.MainCss) {
        $cssUrl = "http://localhost:8080/assets/acentem_takipte/frontend/$($assetInfo.MainCss)"
        Write-Host "HTTP check CSS: $cssUrl"
        & curl.exe -I $cssUrl | Select-Object -First 8 | Out-Host
    }
}

function Restart-DevServices {
    param(
        [switch]$IncludeWorkers,
        [switch]$IncludeFrontend
    )

    if ($SkipRestart) {
        Write-Host "Skipping container restart."
        return
    }

    if ($RecreateServices) {
        $services = @("backend", "websocket")
        if ($IncludeFrontend) { $services += "frontend" }
        if ($IncludeWorkers) { $services += @("queue-short", "queue-long", "scheduler") }
        Write-Host "Recreating services: $($services -join ', ')"
        $env:PULL_POLICY = "never"
        Invoke-Compose -Args (@("up", "-d", "--force-recreate") + $services) | Out-Host
    }
    else {
        $services = @("backend", "websocket")
        if ($IncludeFrontend) { $services += "frontend" }
        if ($IncludeWorkers) { $services += @("queue-short", "queue-long", "scheduler") }
        Write-Host "Restarting services: $($services -join ', ')"
        Invoke-Compose -Args (@("restart") + $services) | Out-Host
    }
    Start-Sleep -Seconds 5
}

function Clear-FrappeCaches {
    if ($SkipCacheClear) {
        Write-Host "Skipping Frappe cache clear."
        return
    }

    Write-Host "Clearing Frappe cache for site '$Site'..."
    Invoke-Compose -Args @("exec", "-T", "backend", "bash", "-lc", "bench --site $Site clear-cache && bench --site $Site clear-website-cache") | Out-Host
}

function Ensure-DockerAssetLinks {
    Write-Host "Ensuring Docker asset links..."
    & powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "ensure_docker_asset_links.ps1")
}

function Build-FrontendHost {
    if ($SkipBuild) {
        Write-Host "Skipping frontend build."
        return
    }

    Write-Host "Building frontend (host)..."
    Push-Location (Join-Path $PSScriptRoot "..\frontend")
    try {
        npm run build
    }
    finally {
        Pop-Location
    }
}

function Invoke-FullDevSync {
    param(
        [string]$Reason = "manual",
        [switch]$IncludeWorkers
    )

    Write-Host ""
    Write-Host "=== Full Sync ($Reason) ==="
    Build-FrontendHost
    Restart-DevServices -IncludeFrontend -IncludeWorkers:$IncludeWorkers
    Ensure-DockerAssetLinks
    Clear-FrappeCaches
    Write-AssetInfoAndHttpChecks
    Write-Host ""
    Write-Host "Done. Hard refresh browser: Ctrl+Shift+R"
}

function Invoke-BackendOnlySync {
    param(
        [string]$Reason = "backend-change"
    )

    Write-Host ""
    Write-Host "=== Backend Sync ($Reason) ==="
    Restart-DevServices -IncludeWorkers -IncludeFrontend:$false
    Ensure-DockerAssetLinks
    Clear-FrappeCaches
    if (-not $SkipHttpCheck) {
        Write-Host "HTTP check /at (auth may redirect)..."
        & curl.exe -I "http://localhost:8080/at" | Select-Object -First 8 | Out-Host
    }
    else {
        Write-Host "Skipping HTTP asset checks."
    }
    Write-Host ""
    Write-Host "Done. Hard refresh browser: Ctrl+Shift+R"
}

function Start-WatchLoop {
    if (-not $PSBoundParameters.ContainsKey("WatchNotify")) { $WatchNotify = $true }
    if (-not $PSBoundParameters.ContainsKey("WatchBeep")) { $WatchBeep = $true }
    if ($WatchPollSeconds -lt 1) { $WatchPollSeconds = 1 }
    if ($WatchDebounceMilliseconds -lt 0) { $WatchDebounceMilliseconds = 0 }

    $baseline = New-WatchSnapshot
    Write-Host ""
    Write-Host "Watch mode active."
    Write-Host "Polling every $WatchPollSeconds sec. Press Ctrl+C to stop."
    Write-Host "Frontend files watched: $($baseline.frontend.count)"
    Write-Host "Backend files watched : $($baseline.backend.count)"
    Invoke-WatchSignal -Level "info" -Message "Watch mode basladi (frontend=$($baseline.frontend.count), backend=$($baseline.backend.count))"

    $iteration = 0
    while ($true) {
        Start-Sleep -Seconds $WatchPollSeconds
        $iteration += 1
        $current = New-WatchSnapshot

        $frontendChanged = $current.frontend.hash -ne $baseline.frontend.hash
        $backendChanged = $current.backend.hash -ne $baseline.backend.hash

        if (-not ($frontendChanged -or $backendChanged)) {
            if ($WatchMaxIterations -gt 0 -and $iteration -ge $WatchMaxIterations) { break }
            continue
        }

        # Debounce burst writes (save, formatter, multi-file updates)
        if ($WatchDebounceMilliseconds -gt 0) {
            Start-Sleep -Milliseconds $WatchDebounceMilliseconds
            $current = New-WatchSnapshot
            $frontendChanged = $current.frontend.hash -ne $baseline.frontend.hash
            $backendChanged = $current.backend.hash -ne $baseline.backend.hash
        }

        $stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        Write-Host ""
        Write-Host "[$stamp] Change detected -> frontend=$frontendChanged backend=$backendChanged"

        try {
            if ($frontendChanged) {
                # If frontend changed, run full sync. Include worker restarts when backend changed too.
                Invoke-FullDevSync -Reason "watch" -IncludeWorkers:$backendChanged
                $syncScope = if ($backendChanged) { "frontend+backend" } else { "frontend" }
                Invoke-WatchSignal -Level "success" -Message "$syncScope degisikligi senkronlandi."
            }
            elseif ($backendChanged) {
                Invoke-BackendOnlySync -Reason "watch"
                Invoke-WatchSignal -Level "success" -Message "Backend degisikligi senkronlandi."
            }
        }
        catch {
            Write-Host "Watch sync failed: $($_.Exception.Message)" -ForegroundColor Red
            Invoke-WatchSignal -Level "error" -Message $_.Exception.Message
        }
        finally {
            $baseline = New-WatchSnapshot
        }

        if ($WatchMaxIterations -gt 0 -and $iteration -ge $WatchMaxIterations) { break }
    }

    Invoke-WatchSignal -Level "info" -Message "Watch mode durdu."
    Write-Host "Watch mode stopped."
}

Write-Host "Compose dir: $ComposeDir"
if (-not (Test-Path (Join-Path $ComposeDir "compose.yaml"))) {
    throw "compose.yaml not found under $ComposeDir"
}
if (-not (Test-Path (Join-Path $ComposeDir "compose.override.yaml"))) {
    throw "compose.override.yaml not found under $ComposeDir"
}
Initialize-ComposeFileArgs

Push-Location $ComposeDir
try {
    if ($Watch) {
        Start-WatchLoop
    }
    else {
        Invoke-FullDevSync -Reason "manual"
    }
}
finally {
    Pop-Location
}
