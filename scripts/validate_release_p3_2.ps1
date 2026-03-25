param(
    [string]$Distro = "Ubuntu-24.04",
    [string]$User = "aykut"
)

$bashCommand = "set -euo pipefail; if [ -d /home/aykut/frappe-bench ]; then cd /home/aykut/frappe-bench; elif [ -d /mnt/c/Users/Aykut/frappe-bench ]; then cd /mnt/c/Users/Aykut/frappe-bench; else echo 'frappe-bench not found' >&2; exit 1; fi; bash apps/acentem_takipte/scripts/validate_release_p3_2.sh"

wsl -d $Distro -u $User -- bash -lc $bashCommand
exit $LASTEXITCODE