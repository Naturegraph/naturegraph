# =====================================================================
# enrich-families-common-names.ps1 — Enrichit families.common_name_fr
# =====================================================================
#
# Bug : la fetch /v1/taxa?rank=family ne retourne pas toujours
# preferred_common_name (depend de la locale et de la dispo des noms FR
# sur iNat). Resultat : "mygale" -> 0 famille trouvee car Theraphosidae
# a common_name_fr=null.
#
# Fix : fetch chaque famille individuellement via /v1/taxa/{id} qui
# retourne les common names dans toutes les langues. On extrait le FR
# (ou fallback EN, ou translated_name si dispo).
#
# Execution : ~3-5 min pour ~3500 familles, par batchs de 30 IDs.
# =====================================================================

param(
    [string]$SupabaseUrl = "https://hrxgduvworofnrjmgpcj.supabase.co",
    [string]$ServiceRoleKey = $env:SUPABASE_SERVICE_ROLE_KEY
)

$ErrorActionPreference = "Stop"
[System.Net.ServicePointManager]::SecurityProtocol = `
    [System.Net.SecurityProtocolType]::Tls12 -bor `
    [System.Net.SecurityProtocolType]::Tls13

if (-not $ServiceRoleKey) {
    $secure = Read-Host "SUPABASE_SERVICE_ROLE_KEY (legacy eyJ...)" -AsSecureString
    $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try {
        $ServiceRoleKey = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
    } finally {
        [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    }
}

Write-Host "===== ENRICH FAMILIES COMMON_NAME_FR =====" -ForegroundColor Cyan

# 1. Recuperer les familles avec inaturalist_id non null et common_name_fr null
$headers = @{
    "apikey" = $ServiceRoleKey
    "Authorization" = "Bearer $ServiceRoleKey"
    "Content-Type" = "application/json"
}
$userAgent = "Naturegraph-EnrichScript/1.0"

$query = "rank=eq.family&inaturalist_id=not.is.null&common_name_fr=is.null&select=id,inaturalist_id,scientific_name&order=popularity.desc"
$url = "$SupabaseUrl/rest/v1/taxonomy_nodes?$query&limit=10000"
Write-Host "[1/3] Fetch families a enrichir depuis Supabase ..." -ForegroundColor Yellow
$families = Invoke-RestMethod -Uri $url -Headers $headers -UserAgent $userAgent
Write-Host "       $($families.Count) familles a enrichir"

if ($families.Count -eq 0) {
    Write-Host "Aucune famille a enrichir. Termine." -ForegroundColor Green
    exit 0
}

# 2. Batch fetch /v1/taxa avec 30 IDs par appel
Write-Host "[2/3] Fetch noms communs FR via iNat /v1/taxa ..." -ForegroundColor Yellow
$inatIdMap = @{}  # iNat ID -> {preferred_common_name, french_name}
$batchSize = 30
$total = $families.Count

for ($i = 0; $i -lt $total; $i += $batchSize) {
    $end = [Math]::Min($i + $batchSize - 1, $total - 1)
    $batch = $families[$i..$end]
    $idsParam = ($batch | ForEach-Object { $_.inaturalist_id }) -join ','
    $inatUrl = "https://api.inaturalist.org/v1/taxa/$idsParam?locale=fr&preferred_place_id=6753"

    try {
        $resp = Invoke-RestMethod -Uri $inatUrl -UseBasicParsing
        foreach ($t in $resp.results) {
            # iNat retourne preferred_common_name selon locale=fr s il y en a un
            $fr = $t.preferred_common_name
            if ($fr) { $inatIdMap[$t.id] = $fr }
        }
    } catch {
        Write-Host "       Warning batch $i-$end : $_" -ForegroundColor Yellow
    }
    if (($i / $batchSize) % 10 -eq 0) {
        $pct = [Math]::Round(100 * ($i + $batchSize) / $total, 0)
        Write-Host "       Progress : $pct% ($($inatIdMap.Count) noms FR trouves)"
    }
    Start-Sleep -Milliseconds 700
}
Write-Host "       Total noms FR recuperes : $($inatIdMap.Count) / $total"

# 3. UPDATE Supabase par batchs PATCH
Write-Host "[3/3] Update Supabase ..." -ForegroundColor Yellow
$updated = 0
$failed = 0
foreach ($fam in $families) {
    $inatId = $fam.inaturalist_id
    if (-not $inatIdMap.ContainsKey($inatId)) { continue }
    $commonFr = $inatIdMap[$inatId]
    $patchUrl = "$SupabaseUrl/rest/v1/taxonomy_nodes?id=eq.$($fam.id)"
    $body = @{ common_name_fr = $commonFr } | ConvertTo-Json -Compress
    $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($body)
    try {
        Invoke-RestMethod -Uri $patchUrl -Method PATCH -Headers $headers -Body $bodyBytes -ContentType "application/json" -UserAgent $userAgent | Out-Null
        $updated++
        if ($updated % 50 -eq 0) { Write-Host -NoNewline "." }
    } catch {
        $failed++
    }
}
Write-Host ""
Write-Host "       Updated : $updated"
Write-Host "       Failed  : $failed" -ForegroundColor $(if ($failed -gt 0) { 'Red' } else { 'Green' })

Write-Host ""
Write-Host "===== TERMINE =====" -ForegroundColor Green
Write-Host "Verifier : SELECT scientific_name, common_name_fr FROM taxonomy_nodes WHERE rank='family' AND common_name_fr IS NOT NULL LIMIT 20;"
