# =====================================================================
# seed-taxonomy-v2.ps1 — Seed taxonomy_nodes via iNaturalist API
# =====================================================================
#
# Strategie (Nicolas 2026-05-26, pivot depuis TAXREF apres INPN 403) :
#   - Source unique : iNaturalist API (place_id FR=6753, CA=6712)
#   - 4 classes vertebrees : ESPECES precises FR + CA
#   - Insecta : FAMILLES seulement (FR + CA)
#   - Hierarchie complete : class > order > family > genus > species
#   - Migration patterns : iNat establishment_means (native/introduced/endemic)
#
# Avantages vs TAXREF :
#   - Meme API pour les 2 territoires (uniformite)
#   - Donnees actives (vs TAXREF 1x/an)
#   - Pas de download lourd
#   - Extension facile a d autres pays (changer place_id)
#
# Execution : 10-15 min (API rate limit 60 req/min)
# Pre-requis : PowerShell 5.1+
# =====================================================================

param(
    [string]$SupabaseUrl = "https://hrxgduvworofnrjmgpcj.supabase.co",
    [string]$ServiceRoleKey = $env:SUPABASE_SERVICE_ROLE_KEY,
    [switch]$DryRun = $false
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "Continue"

# PowerShell 5.1 defaut TLS 1.0, modernes sites refusent. Force TLS 1.2+.
[System.Net.ServicePointManager]::SecurityProtocol = `
    [System.Net.SecurityProtocolType]::Tls12 -bor `
    [System.Net.SecurityProtocolType]::Tls13

# ─── Validation prerequis ──────────────────────────────────────
if (-not $DryRun -and -not $ServiceRoleKey) {
    $secure = Read-Host "SUPABASE_SERVICE_ROLE_KEY (Settings > API Keys > Secret keys)" -AsSecureString
    $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try {
        $ServiceRoleKey = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
    } finally {
        [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    }
}

$workDir = Join-Path $PSScriptRoot ".taxonomy-seed-cache"
New-Item -ItemType Directory -Force -Path $workDir | Out-Null

Write-Host "===== SEED TAXONOMY V2 (V1.1.0) =====" -ForegroundColor Cyan
Write-Host "Source      : iNaturalist API (FR=6753, CA=6712)"
Write-Host "Supabase    : $SupabaseUrl"
Write-Host "Cache       : $workDir"
Write-Host "DryRun      : $DryRun"
Write-Host ""

# ─── Helpers ──────────────────────────────────────────────────
function Normalize-Name {
    param([string]$Name)
    if ([string]::IsNullOrWhiteSpace($Name)) { return $null }
    $n = $Name.Trim()
    if ($n.Length -gt 0) { return $n }
    return $null
}

function Get-TaxrefStatusLabel {
    param([string]$Status)
    switch ($Status) {
        'P'  { 'Resident' }
        'Pc' { 'Migrateur saisonnier' }
        'B'  { 'Nicheur (reproduction)' }
        'W'  { 'Hivernant' }
        'native'     { 'Indigene' }
        'introduced' { 'Introduit' }
        'endemic'    { 'Endemique' }
        default { $Status }
    }
}

# Cache des taxa iNat pour eviter re-fetch ancestors
$inatTaxonCache = @{}

# ─── 1. Fetch iNaturalist par territoire + classe ──────────────
function Get-INatSpecies {
    param(
        [string]$IconicTaxon,
        [int]$PlaceId,
        [int]$MaxPages = 60
    )
    $allTaxa = @()
    $perPage = 500
    for ($page = 1; $page -le $MaxPages; $page++) {
        $url = "https://api.inaturalist.org/v1/observations/species_counts?place_id=$PlaceId&iconic_taxa=$IconicTaxon&per_page=$perPage&page=$page&locale=fr"
        try {
            $resp = Invoke-RestMethod -Uri $url -UseBasicParsing
            if (-not $resp.results -or $resp.results.Count -eq 0) { break }
            $allTaxa += $resp.results
            Start-Sleep -Milliseconds 700
            if ($resp.results.Count -lt $perPage) { break }
        } catch {
            Write-Host "       Warning page $page : $_" -ForegroundColor Yellow
            Start-Sleep -Seconds 5
            break
        }
    }
    return $allTaxa
}

Write-Host "[1/4] Fetch iNaturalist France (place_id=6753) ..." -ForegroundColor Yellow
$frAves     = Get-INatSpecies -IconicTaxon "Aves"     -PlaceId 6753
$frMammalia = Get-INatSpecies -IconicTaxon "Mammalia" -PlaceId 6753
$frAmphibia = Get-INatSpecies -IconicTaxon "Amphibia" -PlaceId 6753
$frReptilia = Get-INatSpecies -IconicTaxon "Reptilia" -PlaceId 6753
$frInsecta  = Get-INatSpecies -IconicTaxon "Insecta"  -PlaceId 6753
Write-Host "       FR Aves      : $($frAves.Count)"
Write-Host "       FR Mammalia  : $($frMammalia.Count)"
Write-Host "       FR Amphibia  : $($frAmphibia.Count)"
Write-Host "       FR Reptilia  : $($frReptilia.Count)"
Write-Host "       FR Insecta   : $($frInsecta.Count) (sera dedupe par famille)"

Write-Host "[2/4] Fetch iNaturalist Canada (place_id=6712) ..." -ForegroundColor Yellow
$caAves     = Get-INatSpecies -IconicTaxon "Aves"     -PlaceId 6712
$caMammalia = Get-INatSpecies -IconicTaxon "Mammalia" -PlaceId 6712
$caAmphibia = Get-INatSpecies -IconicTaxon "Amphibia" -PlaceId 6712
$caReptilia = Get-INatSpecies -IconicTaxon "Reptilia" -PlaceId 6712
$caInsecta  = Get-INatSpecies -IconicTaxon "Insecta"  -PlaceId 6712
Write-Host "       CA Aves      : $($caAves.Count)"
Write-Host "       CA Mammalia  : $($caMammalia.Count)"
Write-Host "       CA Amphibia  : $($caAmphibia.Count)"
Write-Host "       CA Reptilia  : $($caReptilia.Count)"
Write-Host "       CA Insecta   : $($caInsecta.Count) (sera dedupe par famille)"

# ─── 3. Build merged dataset ──────────────────────────────────
Write-Host "[3/4] Build merged dataset ..." -ForegroundColor Yellow

$nodesByKey = @{}

function Add-Node {
    param(
        [string]$Rank, [string]$ScientificName,
        [string]$CommonFr, [string]$CommonEn,
        [string]$Kingdom, [string]$Phylum, [string]$Class,
        [string]$Order, [string]$Family, [string]$Genus,
        [int]$INatId,
        [bool]$InFr, [bool]$InCa,
        [string]$INatEstablishment,
        [int]$INatObservationsCount = 0
    )
    $sci = Normalize-Name $ScientificName
    if (-not $sci) { return }
    $key = "$Rank::$sci"
    if ($nodesByKey.ContainsKey($key)) {
        $node = $nodesByKey[$key]
        $node.available_in_fr = $node.available_in_fr -or $InFr
        $node.available_in_ca = $node.available_in_ca -or $InCa
        if (-not $node.common_name_fr -and $CommonFr) { $node.common_name_fr = $CommonFr }
        if (-not $node.common_name_en -and $CommonEn) { $node.common_name_en = $CommonEn }
        if (-not $node.inaturalist_id -and $INatId) { $node.inaturalist_id = $INatId }
        if ($INatEstablishment) {
            if (-not $node.metadata.migration) {
                $node.metadata.migration = @{}
            }
            $territory = if ($InFr) { 'fr' } elseif ($InCa) { 'ca' } else { $null }
            if ($territory -and -not $node.metadata.migration[$territory]) {
                $node.metadata.migration[$territory] = @{
                    establishment = $INatEstablishment
                    label = (Get-TaxrefStatusLabel $INatEstablishment)
                }
            }
        }
        if ($INatObservationsCount -gt $node.popularity) {
            $node.popularity = $INatObservationsCount
        }
        return
    }
    $metadata = @{}
    if ($INatEstablishment) {
        $territory = if ($InFr) { 'fr' } elseif ($InCa) { 'ca' } else { $null }
        if ($territory) {
            $metadata.migration = @{
                $territory = @{
                    establishment = $INatEstablishment
                    label = (Get-TaxrefStatusLabel $INatEstablishment)
                }
            }
        }
    }
    $nodesByKey[$key] = [PSCustomObject]@{
        rank = $Rank
        scientific_name = $sci
        common_name_fr = Normalize-Name $CommonFr
        common_name_en = Normalize-Name $CommonEn
        kingdom = Normalize-Name $Kingdom
        phylum = Normalize-Name $Phylum
        class = Normalize-Name $Class
        order = Normalize-Name $Order
        family = Normalize-Name $Family
        genus = Normalize-Name $Genus
        inaturalist_id = $INatId
        available_in_fr = $InFr
        available_in_ca = $InCa
        popularity = $INatObservationsCount
        is_active = $true
        metadata = $metadata
        data_version = "iNat_$(Get-Date -Format 'yyyy-MM')"
        data_source = "iNaturalist"
    }
}

# Extract ancestors helper
function Get-AncestorAtRank {
    param($Ancestors, [string]$Rank)
    if (-not $Ancestors) { return $null }
    $found = $Ancestors | Where-Object { $_.rank -eq $Rank } | Select-Object -First 1
    if ($found) { return $found.name } else { return $null }
}

# Insere une liste d especes iNat pour un territoire donne.
# V2 : utilise iconic_taxon_name pour class (toujours present dans species_counts)
# au lieu d ancestors (qui n est pas inclus dans cette response API).
function Add-INatVertebrateSpecies {
    param($Items, [string]$ClassName, [bool]$InFr, [bool]$InCa)
    foreach ($item in $Items) {
        $t = $item.taxon
        if (-not $t.name) { continue }

        # rank dans iNat peut etre species, subspecies, hybrid, etc.
        # On garde seulement les vraies especes pour le MVP
        if ($t.rank -and $t.rank -ne 'species') { continue }

        # iconic_taxon_name est le nom de la classe (Aves, Mammalia, etc.)
        $class = if ($t.iconic_taxon_name) { $t.iconic_taxon_name } else { $ClassName }

        # Phylum + Kingdom inferes (toujours les memes pour ces 4 classes)
        $phylum  = 'Chordata'
        $kingdom = 'Animalia'

        Add-Node -Rank 'species' -ScientificName $t.name `
            -CommonFr $t.preferred_common_name -CommonEn $t.english_common_name `
            -Kingdom $kingdom -Phylum $phylum -Class $class `
            -INatId $t.id -InFr $InFr -InCa $InCa `
            -INatEstablishment $t.establishment_means `
            -INatObservationsCount ([int]$item.count)
    }

    # Ajouter la classe elle-meme
    Add-Node -Rank 'class' -ScientificName $ClassName `
        -Kingdom 'Animalia' -Phylum 'Chordata' -Class $ClassName `
        -InFr $InFr -InCa $InCa
}

# Pour les insectes, on utilise un endpoint different : /v1/taxa avec rank=family
# Donne directement les familles d insectes d un territoire sans passer par les ancestors
function Get-INatInsectFamilies {
    param([int]$PlaceId, [int]$MaxPages = 15)
    $allFamilies = @()
    $perPage = 100
    for ($page = 1; $page -le $MaxPages; $page++) {
        $url = "https://api.inaturalist.org/v1/taxa?rank=family&iconic_taxa=Insecta&is_active=true&place_id=$PlaceId&per_page=$perPage&page=$page&locale=fr"
        try {
            $resp = Invoke-RestMethod -Uri $url -UseBasicParsing
            if (-not $resp.results -or $resp.results.Count -eq 0) { break }
            $allFamilies += $resp.results
            Start-Sleep -Milliseconds 700
            if ($resp.results.Count -lt $perPage) { break }
        } catch {
            Write-Host "       Warning page $page : $_" -ForegroundColor Yellow
            Start-Sleep -Seconds 5
            break
        }
    }
    return $allFamilies
}

function Add-INatInsectFamilies {
    param($Families, [bool]$InFr, [bool]$InCa)
    foreach ($t in $Families) {
        if (-not $t.name) { continue }
        if ($t.rank -ne 'family') { continue }
        Add-Node -Rank 'family' -ScientificName $t.name `
            -CommonFr $t.preferred_common_name -CommonEn $t.english_common_name `
            -Kingdom 'Animalia' -Phylum 'Arthropoda' -Class 'Insecta' -Family $t.name `
            -INatId $t.id -InFr $InFr -InCa $InCa
    }
    # Ajout class Insecta
    Add-Node -Rank 'class' -ScientificName 'Insecta' `
        -Kingdom 'Animalia' -Phylum 'Arthropoda' -Class 'Insecta' `
        -InFr $InFr -InCa $InCa
}

# Fetch dedies pour insectes (familles)
Write-Host "[2.5/4] Fetch iNat insect families FR + CA via /v1/taxa ..." -ForegroundColor Yellow
$frInsectFamiliesData = Get-INatInsectFamilies -PlaceId 6753
$caInsectFamiliesData = Get-INatInsectFamilies -PlaceId 6712
Write-Host "       FR insect families : $($frInsectFamiliesData.Count)"
Write-Host "       CA insect families : $($caInsectFamiliesData.Count)"

# FR vertebres
Add-INatVertebrateSpecies -Items $frAves     -ClassName 'Aves'     -InFr $true -InCa $false
Add-INatVertebrateSpecies -Items $frMammalia -ClassName 'Mammalia' -InFr $true -InCa $false
Add-INatVertebrateSpecies -Items $frAmphibia -ClassName 'Amphibia' -InFr $true -InCa $false
Add-INatVertebrateSpecies -Items $frReptilia -ClassName 'Reptilia' -InFr $true -InCa $false
# FR insectes : especes precises + familles (les 2)
# Note : phylum=Arthropoda pour insectes mais Add-INatVertebrateSpecies l override
# via iconic_taxon_name + on patch phylum apres
Add-INatVertebrateSpecies -Items $frInsecta  -ClassName 'Insecta' -InFr $true -InCa $false
Add-INatInsectFamilies    -Families $frInsectFamiliesData -InFr $true -InCa $false

# CA vertebres
Add-INatVertebrateSpecies -Items $caAves     -ClassName 'Aves'     -InFr $false -InCa $true
Add-INatVertebrateSpecies -Items $caMammalia -ClassName 'Mammalia' -InFr $false -InCa $true
Add-INatVertebrateSpecies -Items $caAmphibia -ClassName 'Amphibia' -InFr $false -InCa $true
Add-INatVertebrateSpecies -Items $caReptilia -ClassName 'Reptilia' -InFr $false -InCa $true
# CA insectes : especes precises + familles
Add-INatVertebrateSpecies -Items $caInsecta  -ClassName 'Insecta' -InFr $false -InCa $true
Add-INatInsectFamilies    -Families $caInsectFamiliesData -InFr $false -InCa $true

# Patch : phylum Arthropoda pour les insectes (Add-INatVertebrateSpecies met Chordata par defaut)
foreach ($key in $nodesByKey.Keys) {
    $node = $nodesByKey[$key]
    if ($node.class -eq 'Insecta') {
        $node.phylum = 'Arthropoda'
    }
}

Write-Host "       Total nodes preparees : $($nodesByKey.Count)"
$breakdown = $nodesByKey.Values | Group-Object rank | Sort-Object Name | Select-Object Name, Count
$breakdown | ForEach-Object { Write-Host "         $($_.Name.PadRight(10)) : $($_.Count)" }

# ─── 4. Bulk insert (ou export CSV si DryRun) ──────────────────
if ($DryRun) {
    Write-Host "[4/4] DRY-RUN, pas d insert. Export CSV pour review." -ForegroundColor Yellow
    $previewPath = Join-Path $workDir "taxonomy_preview.csv"
    # Flatten metadata pour CSV (JSONB ne s exporte pas bien en CSV)
    $flat = $nodesByKey.Values | ForEach-Object {
        $migrationFr = if ($_.metadata.migration.fr) { ($_.metadata.migration.fr | ConvertTo-Json -Compress) } else { '' }
        $migrationCa = if ($_.metadata.migration.ca) { ($_.metadata.migration.ca | ConvertTo-Json -Compress) } else { '' }
        [PSCustomObject]@{
            rank = $_.rank
            scientific_name = $_.scientific_name
            common_name_fr = $_.common_name_fr
            common_name_en = $_.common_name_en
            class = $_.class
            order = $_.order
            family = $_.family
            available_in_fr = $_.available_in_fr
            available_in_ca = $_.available_in_ca
            popularity = $_.popularity
            inaturalist_id = $_.inaturalist_id
            migration_fr = $migrationFr
            migration_ca = $migrationCa
        }
    }
    $flat | Export-Csv -Path $previewPath -NoTypeInformation -Encoding UTF8
    Write-Host "       Exported : $previewPath"
    exit 0
}

Write-Host "[4/4] Bulk insert dans Supabase taxonomy_nodes ..." -ForegroundColor Yellow
# Les nouvelles cles sb_secret_xxx bloquent les requetes "browser-like".
# PowerShell envoie User-Agent: Mozilla... par defaut, donc Supabase rejette.
# Fix : User-Agent non-browser + headers explicites
$headers = @{
    "apikey" = $ServiceRoleKey
    "Authorization" = "Bearer $ServiceRoleKey"
    "Content-Type" = "application/json"
    "Prefer" = "resolution=merge-duplicates"
}
$userAgent = "Naturegraph-SeedScript/1.0 (server-side admin tool)"
# on_conflict explicite pour que PostgREST honore resolution=merge-duplicates
# sur notre contrainte UNIQUE(rank, scientific_name) (pas le PK qui est id UUID)
$endpoint = "$SupabaseUrl/rest/v1/taxonomy_nodes?on_conflict=rank,scientific_name"
$batch = @()
$batchSize = 200
$inserted = 0
$failed = 0
$lastError = $null

# Helper : build une JSON array string sans le bug ConvertTo-Json de PS 5.1
# (single-element array sort comme object, encoding BOM, etc.)
function Build-JsonArray {
    param([array]$Items)
    $parts = foreach ($it in $Items) {
        ConvertTo-Json $it -Depth 5 -Compress
    }
    return "[" + ($parts -join ",") + "]"
}

function Send-Batch {
    param([array]$Batch, [string]$Endpoint, [hashtable]$Headers, [string]$UA)
    $bodyStr = Build-JsonArray $Batch
    # Force UTF-8 sans BOM pour eviter parser issues PostgREST
    $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($bodyStr)
    Invoke-RestMethod -Uri $Endpoint -Method POST -Headers $Headers `
        -Body $bodyBytes -ContentType "application/json" -UserAgent $UA | Out-Null
}

foreach ($node in $nodesByKey.Values) {
    $batch += $node
    if ($batch.Count -ge $batchSize) {
        try {
            Send-Batch -Batch $batch -Endpoint $endpoint -Headers $headers -UA $userAgent
            $inserted += $batch.Count
            Write-Host -NoNewline "."
        } catch {
            $failed += $batch.Count
            $lastError = $_
            if ($failed -le 600) { Write-Host "`n       ERROR batch : $_" -ForegroundColor Red }
        }
        $batch = @()
    }
}
if ($batch.Count -gt 0) {
    try {
        Send-Batch -Batch $batch -Endpoint $endpoint -Headers $headers -UA $userAgent
        $inserted += $batch.Count
    } catch {
        $failed += $batch.Count
        $lastError = $_
        Write-Host "`n       ERROR final batch : $_" -ForegroundColor Red
    }
}

if ($failed -gt 0 -and $inserted -eq 0) {
    Write-Host ""
    Write-Host "===========================================================" -ForegroundColor Yellow
    Write-Host "  ECHEC TOTAL : verifie le type de cle Supabase utilisee" -ForegroundColor Yellow
    Write-Host "===========================================================" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Si tu vois 'Forbidden use of secret API key in browser' :"
    Write-Host "  -> La cle sb_secret_xxx est bloquee meme avec User-Agent custom"
    Write-Host "  -> Utilise la cle LEGACY service_role (eyJ...) a la place"
    Write-Host "  -> Settings > API Keys > onglet 'Legacy anon, service_role API keys'"
    Write-Host ""
}

Write-Host ""
Write-Host "       Inseres : $inserted"
Write-Host "       Echecs  : $failed" -ForegroundColor $(if ($failed -gt 0) { 'Red' } else { 'Green' })

# ─── Resolve parent_id (post-insert SQL) ───────────────────────
# Single-quoted here-string @'...'@ : pas d interpolation, pas d echappement.
# On peut ecrire les quotes naturellement, ce qui evite le bug ""order"".
$resolveSQL = @'
-- Resolve parent_id pour la hierarchie
-- species -> family si possible, sinon -> order
UPDATE public.taxonomy_nodes child
SET parent_id = parent.id
FROM public.taxonomy_nodes parent
WHERE child.parent_id IS NULL
  AND (
    (child.rank = 'species' AND child.family IS NOT NULL
     AND parent.rank = 'family' AND parent.scientific_name = child.family)
    OR
    (child.rank = 'family' AND child."order" IS NOT NULL
     AND parent.rank = 'order' AND parent.scientific_name = child."order")
    OR
    (child.rank = 'order' AND child.class IS NOT NULL
     AND parent.rank = 'class' AND parent.scientific_name = child.class)
  );

-- Orphelins (devrait etre 0 ou tres peu)
SELECT rank, COUNT(*) AS orphans
FROM public.taxonomy_nodes
WHERE parent_id IS NULL AND rank <> 'class'
GROUP BY rank;
'@
$resolveSQL | Out-File -FilePath (Join-Path $workDir "resolve_parents.sql") -Encoding UTF8
Write-Host "       SQL genere : $workDir\resolve_parents.sql" -ForegroundColor Cyan
Write-Host "       => A executer dans Supabase SQL editor pour finaliser hierarchie"

# ─── Coverage report ──────────────────────────────────────────
Write-Host ""
Write-Host "===== COVERAGE REPORT =====" -ForegroundColor Cyan

# Targets de reference (sources GBIF / IUCN / iNat estimates 2024-2025)
$gbifTargets = @{
    'FR_Aves'     = 570
    'FR_Mammalia' = 140
    'FR_Amphibia' = 50
    'FR_Reptilia' = 50
    'CA_Aves'     = 700
    'CA_Mammalia' = 210
    'CA_Amphibia' = 50
    'CA_Reptilia' = 50
}

$report = @()
foreach ($class in @('Aves', 'Mammalia', 'Amphibia', 'Reptilia')) {
    $frCount = ($nodesByKey.Values | Where-Object { $_.rank -eq 'species' -and $_.class -eq $class -and $_.available_in_fr }).Count
    $caCount = ($nodesByKey.Values | Where-Object { $_.rank -eq 'species' -and $_.class -eq $class -and $_.available_in_ca }).Count
    $report += [PSCustomObject]@{
        Class = $class
        "FR seedees" = $frCount
        "FR target" = $gbifTargets["FR_$class"]
        "FR %" = if ($gbifTargets["FR_$class"]) { [math]::Round(100 * $frCount / $gbifTargets["FR_$class"], 1) } else { 0 }
        "CA seedees" = $caCount
        "CA target" = $gbifTargets["CA_$class"]
        "CA %" = if ($gbifTargets["CA_$class"]) { [math]::Round(100 * $caCount / $gbifTargets["CA_$class"], 1) } else { 0 }
    }
}

$report | Format-Table -AutoSize

$insectFams = ($nodesByKey.Values | Where-Object { $_.rank -eq 'family' -and $_.class -eq 'Insecta' }).Count
$insectFamsFr = ($nodesByKey.Values | Where-Object { $_.rank -eq 'family' -and $_.class -eq 'Insecta' -and $_.available_in_fr }).Count
$insectFamsCa = ($nodesByKey.Values | Where-Object { $_.rank -eq 'family' -and $_.class -eq 'Insecta' -and $_.available_in_ca }).Count
Write-Host "Familles d insectes seedees :" -ForegroundColor Green
Write-Host "   Total unique : $insectFams"
Write-Host "   FR           : $insectFamsFr"
Write-Host "   CA           : $insectFamsCa"

Write-Host ""
Write-Host "===== TERMINE =====" -ForegroundColor Green
Write-Host "Prochaines etapes :"
Write-Host "  1. Executer scripts\.taxonomy-seed-cache\resolve_parents.sql dans Supabase SQL editor"
Write-Host "  2. Verifier : SELECT rank, COUNT(*) FROM public.taxonomy_nodes GROUP BY rank;"
Write-Host "  3. Tester : SELECT * FROM public.search_taxonomy('calopteryx', 'fr');"
