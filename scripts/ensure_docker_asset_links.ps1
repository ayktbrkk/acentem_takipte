param(
    [string[]]$Containers = @("frappe_docker-backend-1", "frappe_docker-frontend-1"),
    [string]$AppPublicPath = "/home/frappe/frappe-bench/apps/acentem_takipte/public",
    [string]$AssetLinkPath = "/home/frappe/frappe-bench/sites/assets/acentem_takipte",
    [switch]$ClearCache
)

$ErrorActionPreference = "Stop"

foreach ($container in $Containers) {
    Write-Host "Ensuring asset link in $container"
    docker exec $container sh -lc "ln -sfn $AppPublicPath $AssetLinkPath"
}

if ($ClearCache) {
    Write-Host "Clearing Frappe cache on backend container"
    docker exec frappe_docker-backend-1 sh -lc "cd /home/frappe/frappe-bench && bench --site localhost clear-cache && bench --site localhost clear-website-cache"
}

Write-Host "Asset link check completed."
