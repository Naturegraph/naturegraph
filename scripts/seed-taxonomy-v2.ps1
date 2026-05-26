# =====================================================================
# seed-taxonomy-v2.ps1 — Seed complet taxonomy_nodes (V1.1.0)
# =====================================================================
#
# Strategie (validee Nicolas 2026-05-26) :
#   - Aves + Mammalia + Amphibia + Reptilia : ESPECES precises FR + CA
#   - Insecta : FAMILLES seulement (FR + CA)
#   - Hierarchie complete : class -> order -> family -> [genus] -> species
#
# Sources :
#   - TAXREF v17 (INPN/MNHN) pour France (CC-BY)
#   - iNaturalist API pour Canada (place_id 6712)
#
# Execution typique : 15-30 min (depend du reseau)
# Pre-requis :
#   - PowerShell 5.1+ (Windows)
#   - SUPABASE_SERVICE_ROLE_KEY (Settings > API > service_role)
#   - ~500 MB d espace disque pour TAXREF
# =====================================================================

param(
    [string]$SupabaseUrl = "https://hrxgduvworofnrjmgpcj.supabase.co",
    [string]$ServiceRoleKey = $env:SUPABASE_SERVICE_ROLE_KEY,
    [switch]$DryRun = $false,
    [switch]$SkipDownload = $false
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "Continue"

# ─── Validation prerequis ──────────────────────────────────────
if (-not $ServiceRoleKey) {
    $ServiceRoleKey = Read-Host "SUPABASE_SERVICE_ROLE_KEY (Settings > API)" -AsSecureString
    $ServiceRoleKey = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($ServiceRoleKey)
    )
}

$workDir = Join-Path $PSScriptRoot ".taxonomy-seed-cache"
New-Item -ItemType Directory -Force -Path $workDir | Out-Null

Write-Host "===== SEED TAXONOMY V2 (V1.1.0) =====" -ForegroundColor Cyan
Write-Host "Supabase    : $SupabaseUrl"
Write-Host "Cache       : $workDir"
Write-Host "DryRun      : $DryRun"
Write-Host ""

# ─── 1. Download TAXREF v17 ────────────────────────────────────
$taxrefZip = Join-Path $workDir "TAXREFv17.zip"
$taxrefTxt = Join-Path $workDir "TAXREFv17.txt"

if (-not $SkipDownload -and -not (Test-Path $taxrefTxt)) {
    Write-Host "[1/6] Download TAXREF v17 (~80 MB) ..." -ForegroundColor Yellow
    # URL TAXREF v17. Si erreur 404, recuperer la derniere version sur :
    # https://inpn.mnhn.fr/telechargement/referentielEspece/taxref
    $taxrefUrl = "https://inpn.mnhn.fr/docs-web/docs/download/501920"
    Invoke-WebRequest -Uri $taxrefUrl -OutFile $taxrefZip -UseBasicParsing

    Write-Host "       Unzip ..." -ForegroundColor Yellow
    Expand-Archive -Path $taxrefZip -DestinationPath $workDir -Force
    # Le fichier dezippe peut s appeler TAXREFv17.txt ou similaire
    $found = Get-ChildItem $workDir -Filter "TAXREF*.txt" | Select-Object -First 1
    if ($found -and $found.FullName -ne $taxrefTxt) {
        Move-Item $found.FullName $taxrefTxt -Force
    }
}

if (-not (Test-Path $taxrefTxt)) {
    Write-Host "ERROR: TAXREF file missing. Telecharger manuellement depuis :" -ForegroundColor Red
    Write-Host "  https://inpn.mnhn.fr/telechargement/referentielEspece/taxref"
    Write-Host "  Puis placer le TXT dans : $workDir"
    exit 1
}

# ─── 2. Parse TAXREF ────────────────────────────────────────────
Write-Host "[2/6] Parse TAXREF (depend de la taille, ~2-3 min) ..." -ForegroundColor Yellow

# Lit le fichier comme tab-separated avec encoding UTF-8 / Latin-1 fallback
$taxrefRows = Import-Csv -Path $taxrefTxt -Delimiter "`t" -Encoding UTF8
Write-Host "       $($taxrefRows.Count) lignes brutes TAXREF"

# Filtres :
#   - 4 classes vertebrees -> RANG = ES (espece) + FR present (P, Pc, B, ?)
#   - Insecta -> RANG = FM (famille)
#   - Hierarchie (CL, OR, FM des 4 vertebres + tous les OR d Insecta)
$frPresent = @('P', 'Pc', 'B', '?', 'C')  # statuts territoire FR consideres presents
$targetClasses = @('Aves', 'Mammalia', 'Amphibia', 'Reptilia')

$frSpecies = $taxrefRows | Where-Object {
    $_.RANG -eq 'ES' -and
    $_.CLASSE -in $targetClasses -and
    $_.FR -in $frPresent
}
$frInsectFamilies = $taxrefRows | Where-Object {
    $_.RANG -eq 'FM' -and
    $_.CLASSE -eq 'Insecta' -and
    $_.FR -in $frPresent
}
$frInsectOrders = $taxrefRows | Where-Object {
    $_.RANG -eq 'OR' -and
    $_.CLASSE -eq 'Insecta'
}
$vertOrders = $taxrefRows | Where-Object {
    $_.RANG -eq 'OR' -and $_.CLASSE -in $targetClasses
}
$vertFamilies = $taxrefRows | Where-Object {
    $_.RANG -eq 'FM' -and $_.CLASSE -in $targetClasses
}
$classes = $taxrefRows | Where-Object {
    $_.RANG -eq 'CL' -and $_.CLASSE -in (@('Insecta') + $targetClasses)
}

Write-Host "       FR especes vertebres : $($frSpecies.Count)"
Write-Host "       FR familles insectes : $($frInsectFamilies.Count)"
Write-Host "       FR ordres insectes   : $($frInsectOrders.Count)"
Write-Host "       Hierarchie classes   : $($classes.Count)"
Write-Host "       Hierarchie ordres    : $($vertOrders.Count)"
Write-Host "       Hierarchie familles  : $($vertFamilies.Count)"

# ─── 3. Fetch iNaturalist Canada ──────────────────────────────
Write-Host "[3/6] Fetch iNaturalist Canada (place_id=6712) ..." -ForegroundColor Yellow

function Get-INatSpecies {
    param([string]$IconicTaxon, [int]$PlaceId = 6712, [int]$MaxPages = 30)
    $allTaxa = @()
    $perPage = 500
    for ($page = 1; $page -le $MaxPages; $page++) {
        $url = "https://api.inaturalist.org/v1/observations/species_counts?place_id=$PlaceId&iconic_taxa=$IconicTaxon&per_page=$perPage&page=$page&locale=fr"
        try {
            $resp = Invoke-RestMethod -Uri $url -UseBasicParsing
            if (-not $resp.results -or $resp.results.Count -eq 0) { break }
            $allTaxa += $resp.results
            Start-Sleep -Milliseconds 600   # rate limit iNat : 60 req/min
            if ($resp.results.Count -lt $perPage) { break }
        } catch {
            Write-Host "       Warning page $page : $_" -ForegroundColor Yellow
            break
        }
    }
    return $allTaxa
}

$caAves       = Get-INatSpecies -IconicTaxon "Aves"
$caMammalia   = Get-INatSpecies -IconicTaxon "Mammalia"
$caAmphibia   = Get-INatSpecies -IconicTaxon "Amphibia"
$caReptilia   = Get-INatSpecies -IconicTaxon "Reptilia"
$caInsecta    = Get-INatSpecies -IconicTaxon "Insecta"

Write-Host "       CA Aves      : $($caAves.Count)"
Write-Host "       CA Mammalia  : $($caMammalia.Count)"
Write-Host "       CA Amphibia  : $($caAmphibia.Count)"
Write-Host "       CA Reptilia  : $($caReptilia.Count)"
Write-Host "       CA Insecta   : $($caInsecta.Count) (sera dedupe par famille)"

# ─── 4. Build merged dataset ──────────────────────────────────
Write-Host "[4/6] Build merged dataset (FR + CA + hierarchy) ..." -ForegroundColor Yellow

# Helper : normalise un nom (trim, capitalize first)
function Normalize-Name {
    param([string]$Name)
    if ([string]::IsNullOrWhiteSpace($Name)) { return $null }
    $n = $Name.Trim()
    if ($n.Length -gt 0) { return $n }
    return $null
}

# Map cle = "RANK::scientific_name" -> node
$nodesByKey = @{}

function Add-Node {
    param(
        [string]$Rank, [string]$ScientificName,
        [string]$CommonFr, [string]$CommonEn,
        [string]$Kingdom, [string]$Phylum, [string]$Class,
        [string]$Order, [string]$Family, [string]$Genus,
        [string]$InpnId, [int]$INatId,
        [bool]$InFr, [bool]$InCa,
        [string]$TaxrefStatusFr,  # P, Pc, B, W, C, E, I, D
        [string]$INatEstablishment,  # native, introduced, endemic
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
        if (-not $node.inpn_taxref_id -and $InpnId) { $node.inpn_taxref_id = $InpnId }
        if (-not $node.inaturalist_id -and $INatId) { $node.inaturalist_id = $INatId }
        # Merge metadata.migration
        if ($TaxrefStatusFr -or $INatEstablishment) {
            if (-not $node.metadata.migration) { $node.metadata.migration = @{} }
            if ($TaxrefStatusFr -and -not $node.metadata.migration.fr) {
                $node.metadata.migration.fr = @{ status = $TaxrefStatusFr; label = (Get-TaxrefStatusLabel $TaxrefStatusFr) }
            }
            if ($INatEstablishment -and -not $node.metadata.migration.ca) {
                $node.metadata.migration.ca = @{ establishment = $INatEstablishment }
            }
        }
        # Boost popularite si obs CA
        if ($INatObservationsCount -gt $node.popularity) {
            $node.popularity = $INatObservationsCount
        }
        return
    }
    # Construit metadata initial
    $metadata = @{}
    if ($TaxrefStatusFr -or $INatEstablishment) {
        $metadata.migration = @{}
        if ($TaxrefStatusFr) {
            $metadata.migration.fr = @{ status = $TaxrefStatusFr; label = (Get-TaxrefStatusLabel $TaxrefStatusFr) }
        }
        if ($INatEstablishment) {
            $metadata.migration.ca = @{ establishment = $INatEstablishment }
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
        inpn_taxref_id = $InpnId
        inaturalist_id = $INatId
        available_in_fr = $InFr
        available_in_ca = $InCa
        popularity = $INatObservationsCount
        is_active = $true
        metadata = $metadata
        data_version = "TAXREF_v17+iNat_$(Get-Date -Format 'yyyy-MM')"
        data_source = if ($InpnId) { "TAXREF" } elseif ($INatId) { "iNaturalist" } else { "manual" }
    }
}

# Label francais pour les statuts TAXREF (FR column)
function Get-TaxrefStatusLabel {
    param([string]$Status)
    switch ($Status) {
        'P'  { 'Resident' }
        'Pc' { 'Migrateur saisonnier' }
        'B'  { 'Nicheur (reproduction)' }
        'W'  { 'Hivernant' }
        'C'  { 'Cantonnement (population partielle)' }
        'E'  { 'Endemique' }
        'I'  { 'Introduit' }
        'D'  { 'Disparu' }
        '?'  { 'Presence incertaine' }
        default { $Status }
    }
}

# 4.1 Classes (les 5)
foreach ($c in $classes) {
    Add-Node -Rank 'class' -ScientificName $c.LB_NOM -CommonFr ($c.NOM_VERN -split ',')[0] `
        -Kingdom $c.REGNE -Phylum $c.PHYLUM -Class $c.CLASSE `
        -InpnId $c.CD_NOM -InFr ($c.FR -in $frPresent) -InCa $false
}

# 4.2 Ordres (vertebres + insectes)
foreach ($o in ($vertOrders + $frInsectOrders)) {
    Add-Node -Rank 'order' -ScientificName $o.LB_NOM -CommonFr ($o.NOM_VERN -split ',')[0] `
        -Kingdom $o.REGNE -Phylum $o.PHYLUM -Class $o.CLASSE -Order $o.ORDRE `
        -InpnId $o.CD_NOM -InFr ($o.FR -in $frPresent) -InCa $false
}

# 4.3 Familles (vertebres + insectes)
foreach ($f in ($vertFamilies + $frInsectFamilies)) {
    Add-Node -Rank 'family' -ScientificName $f.LB_NOM -CommonFr ($f.NOM_VERN -split ',')[0] `
        -Kingdom $f.REGNE -Phylum $f.PHYLUM -Class $f.CLASSE -Order $f.ORDRE -Family $f.FAMILLE `
        -InpnId $f.CD_NOM -InFr ($f.FR -in $frPresent) -InCa $false
}

# 4.4 Especes FR (vertebres uniquement, avec statut migration TAXREF)
foreach ($s in $frSpecies) {
    $commonFr = if ($s.NOM_VERN) { ($s.NOM_VERN -split ',')[0].Trim() } else { $null }
    Add-Node -Rank 'species' -ScientificName $s.LB_NOM -CommonFr $commonFr -CommonEn $s.NOM_VERN_ENG `
        -Kingdom $s.REGNE -Phylum $s.PHYLUM -Class $s.CLASSE -Order $s.ORDRE -Family $s.FAMILLE `
        -InpnId $s.CD_NOM -InFr $true -InCa $false `
        -TaxrefStatusFr $s.FR
}

# 4.5 Especes CA (4 vertebres uniquement)
function Add-INatSpecies {
    param([Parameter(ValueFromPipeline=$true)]$Item, [string]$ClassName)
    process {
        $t = $Item.taxon
        if (-not $t.name) { return }
        $ancestors = @{}
        foreach ($a in $t.ancestors) {
            switch ($a.rank) {
                'kingdom' { $ancestors.kingdom = $a.name }
                'phylum'  { $ancestors.phylum = $a.name }
                'class'   { $ancestors.class = $a.name }
                'order'   { $ancestors.order = $a.name }
                'family'  { $ancestors.family = $a.name }
                'genus'   { $ancestors.genus = $a.name }
            }
        }
        Add-Node -Rank 'species' -ScientificName $t.name `
            -CommonFr $t.preferred_common_name -CommonEn $t.english_common_name `
            -Kingdom $ancestors.kingdom -Phylum $ancestors.phylum `
            -Class ($ancestors.class ?? $ClassName) -Order $ancestors.order `
            -Family $ancestors.family -Genus $ancestors.genus `
            -INatId $t.id -InFr $false -InCa $true `
            -INatEstablishment $t.establishment_means `
            -INatObservationsCount ([int]$Item.count)
    }
}
$caAves     | Add-INatSpecies -ClassName 'Aves'
$caMammalia | Add-INatSpecies -ClassName 'Mammalia'
$caAmphibia | Add-INatSpecies -ClassName 'Amphibia'
$caReptilia | Add-INatSpecies -ClassName 'Reptilia'

# 4.6 Familles CA d insectes (extrait depuis observations CA)
foreach ($i in $caInsecta) {
    $t = $i.taxon
    if (-not $t.ancestors) { continue }
    $famAncestor = $t.ancestors | Where-Object { $_.rank -eq 'family' } | Select-Object -First 1
    if (-not $famAncestor) { continue }
    $orderAncestor = $t.ancestors | Where-Object { $_.rank -eq 'order' } | Select-Object -First 1
    Add-Node -Rank 'family' -ScientificName $famAncestor.name `
        -Kingdom 'Animalia' -Phylum 'Arthropoda' -Class 'Insecta' `
        -Order $orderAncestor.name -Family $famAncestor.name `
        -InFr $false -InCa $true
}

Write-Host "       Total nodes preparees : $($nodesByKey.Count)"
$breakdown = $nodesByKey.Values | Group-Object rank | Sort-Object Name | Select-Object Name, Count
$breakdown | ForEach-Object { Write-Host "         $($_.Name.PadRight(10)) : $($_.Count)" }

# ─── 5. Bulk insert Supabase ──────────────────────────────────
if ($DryRun) {
    Write-Host "[5/6] DRY-RUN, pas d insert. Export CSV pour review." -ForegroundColor Yellow
    $nodesByKey.Values | Export-Csv -Path (Join-Path $workDir "taxonomy_preview.csv") -NoTypeInformation -Encoding UTF8
    Write-Host "       Exported : $workDir\taxonomy_preview.csv"
    exit 0
}

Write-Host "[5/6] Bulk insert dans Supabase taxonomy_nodes ..." -ForegroundColor Yellow
$headers = @{
    "apikey" = $ServiceRoleKey
    "Authorization" = "Bearer $ServiceRoleKey"
    "Content-Type" = "application/json"
    "Prefer" = "resolution=merge-duplicates"
}
$endpoint = "$SupabaseUrl/rest/v1/taxonomy_nodes"
$batch = @()
$batchSize = 200
$inserted = 0
$failed = 0

foreach ($node in $nodesByKey.Values) {
    $batch += $node
    if ($batch.Count -ge $batchSize) {
        try {
            $body = ConvertTo-Json $batch -Depth 5 -Compress
            Invoke-RestMethod -Uri $endpoint -Method POST -Headers $headers -Body $body | Out-Null
            $inserted += $batch.Count
            Write-Host -NoNewline "."
        } catch {
            $failed += $batch.Count
            Write-Host "`n       ERROR batch : $_" -ForegroundColor Red
        }
        $batch = @()
    }
}
if ($batch.Count -gt 0) {
    try {
        $body = ConvertTo-Json $batch -Depth 5 -Compress
        Invoke-RestMethod -Uri $endpoint -Method POST -Headers $headers -Body $body | Out-Null
        $inserted += $batch.Count
    } catch {
        $failed += $batch.Count
        Write-Host "`n       ERROR final batch : $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "       Inseres : $inserted"
Write-Host "       Echecs  : $failed" -ForegroundColor $(if ($failed -gt 0) { 'Red' } else { 'Green' })

# ─── 6. Resolve parent_id (post-insert) ───────────────────────
Write-Host "[6/6] Resolve parent_id (hierarchie)..." -ForegroundColor Yellow
# Cette etape se fait cote DB via une fonction SQL (plus rapide que round-trips PowerShell)
# A executer manuellement dans Supabase SQL editor :
$resolveSQL = @"
-- Resolve parent_id : pour chaque node, trouver son parent dans la hierarchie
UPDATE public.taxonomy_nodes child
SET parent_id = parent.id
FROM public.taxonomy_nodes parent
WHERE child.parent_id IS NULL
  AND (
    -- species -> genus, sinon -> family
    (child.rank = 'species' AND child.family IS NOT NULL
     AND parent.rank = 'family' AND parent.scientific_name = child.family)
    OR
    -- family -> order
    (child.rank = 'family' AND child.""order"" IS NOT NULL
     AND parent.rank = 'order' AND parent.scientific_name = child.""order"")
    OR
    -- order -> class
    (child.rank = 'order' AND child.class IS NOT NULL
     AND parent.rank = 'class' AND parent.scientific_name = child.class)
  );

-- Compter combien restent orphelins (devrait etre 0 ou tres peu)
SELECT rank, COUNT(*) AS orphans
FROM public.taxonomy_nodes
WHERE parent_id IS NULL AND rank <> 'class'
GROUP BY rank;
"@
$resolveSQL | Out-File -FilePath (Join-Path $workDir "resolve_parents.sql") -Encoding UTF8
Write-Host "       SQL genere : $workDir\resolve_parents.sql"
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
Write-Host "Familles d insectes seedees : $insectFams (FR + CA combinees)" -ForegroundColor Green

Write-Host ""
Write-Host "===== TERMINE =====" -ForegroundColor Green
Write-Host "Prochaines etapes :"
Write-Host "  1. Executer scripts\.taxonomy-seed-cache\resolve_parents.sql dans Supabase SQL editor"
Write-Host "  2. Verifier dans le SQL editor : SELECT rank, COUNT(*) FROM public.taxonomy_nodes GROUP BY rank;"
Write-Host "  3. Tester la recherche : SELECT * FROM public.search_taxonomy('Calopteryx', 'fr');"
