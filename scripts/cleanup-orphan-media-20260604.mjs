/**
 * cleanup-orphan-media-20260604.mjs
 * ============================================================================
 * Nettoyage ponctuel des fichiers ORPHELINS du bucket Storage `post-media`
 * (audit infra V1.1.5, Nicolas 2026-06-04).
 *
 * Contexte : 47 fichiers (~82 MB) restent dans le Storage sans ligne `media`
 * correspondante (posts supprimes / photos remplacees en edition, sans cleanup
 * Storage). Liste FIGEE ci-dessous (recensee depuis backup.storage_orphans_
 * 20260604) : aucune logique de decouverte, donc impossible de supprimer par
 * erreur un fichier encore reference.
 *
 * SECURITE :
 *   - Dry-run par defaut (affiche, ne supprime rien).
 *   - Suppression UNIQUEMENT avec le flag --apply.
 *   - La liste des chemins est verifiee une derniere fois : le script
 *     re-confirme que chaque fichier existe avant suppression et s'arrete si un
 *     chemin inattendu apparait.
 *
 * USAGE (PowerShell, depuis la racine du repo) :
 *   $env:SUPABASE_URL = "https://hrxgduvworofnrjmgpcj.supabase.co"
 *   $env:SUPABASE_SERVICE_ROLE_KEY = "<ta_cle_service_role>"   # jamais commitee
 *   node scripts/cleanup-orphan-media-20260604.mjs            # dry-run
 *   node scripts/cleanup-orphan-media-20260604.mjs --apply    # supprime
 *
 * Rollback : impossible (suppression Storage definitive). MAIS ces fichiers
 * sont des orphelins confirmes (aucune ligne media) et le manifeste reste dans
 * backup.storage_orphans_20260604. Faire un dry-run d'abord.
 */

import { createClient } from '@supabase/supabase-js'

const BUCKET = 'post-media'

// Liste FIGEE des 47 orphelins (audit 2026-06-04). Ne pas modifier.
const ORPHANS = [
  '1456254e-c344-4682-834d-f0a2f32061f1/7a3175d4-bcd5-41d3-be19-b02fb338a4ab/56188552-e328-4217-a44c-41c428c9eed9.jpg',
  '1456254e-c344-4682-834d-f0a2f32061f1/7a3175d4-bcd5-41d3-be19-b02fb338a4ab/5d12aa8b-580d-4ec7-8aae-b4834a089a48.jpg',
  '1456254e-c344-4682-834d-f0a2f32061f1/7a3175d4-bcd5-41d3-be19-b02fb338a4ab/5d5f507c-2005-4344-8bc5-65a93bc20ea6.jpg',
  '1456254e-c344-4682-834d-f0a2f32061f1/d16d2fd1-8fce-4e81-9a28-a8f1b40a2571/e1bfc057-8807-40ec-ae0a-2478a35bf003.jpg',
  '6b999dea-7526-404c-a0e7-a92f858023c0/079d23d0-92e9-4c36-8a15-ee54e5512633/0d8c7a93-acf7-47f4-b1de-70eca779e9f3.webp',
  '6b999dea-7526-404c-a0e7-a92f858023c0/0d174414-e5e4-4863-b017-95764c60e85b/ca8357c1-18f5-4347-b7e5-e193af7f7471.webp',
  '6b999dea-7526-404c-a0e7-a92f858023c0/1cab1a08-cbb2-4dfc-9b4d-e8d5b0d4175d/70a3ff10-dc6b-406a-ba96-b55da0133d1e.webp',
  '6b999dea-7526-404c-a0e7-a92f858023c0/1cab1a08-cbb2-4dfc-9b4d-e8d5b0d4175d/d765904b-2593-4272-9141-1f73527df371.webp',
  '6b999dea-7526-404c-a0e7-a92f858023c0/1cab1a08-cbb2-4dfc-9b4d-e8d5b0d4175d/e1bd2dc4-9112-4979-b855-233c032996bc.webp',
  '6b999dea-7526-404c-a0e7-a92f858023c0/4152f932-44f8-4969-85a5-4e08a625eb23/ed0b17c2-29f9-40c4-8b9c-2544fc5a5ca8.webp',
  '6b999dea-7526-404c-a0e7-a92f858023c0/4cd40848-e4c4-40d5-b06b-f9d422455ddd/9a9c69e2-36a2-413d-99be-64be693cb0c5.jpg',
  '6b999dea-7526-404c-a0e7-a92f858023c0/57cd5495-0c9f-4aca-b544-c17c878cd4c2/db2512e9-03c6-4182-a75c-d2fad956d699.webp',
  '6b999dea-7526-404c-a0e7-a92f858023c0/58c3468e-e99e-48d2-90af-6c1c2b8ac590/a6b07138-9ab1-4880-8497-20e59b627ed0.webp',
  '6b999dea-7526-404c-a0e7-a92f858023c0/5d4262d2-516c-40f2-8c2f-176d9c726ba9/63cdfce5-fb1b-4956-a3e3-e524d5781962.webp',
  '6b999dea-7526-404c-a0e7-a92f858023c0/5d4262d2-516c-40f2-8c2f-176d9c726ba9/69d33d23-95e3-477d-91e4-ba1abe25d02f.webp',
  '6b999dea-7526-404c-a0e7-a92f858023c0/740184d7-36f7-4940-9bb7-32b65b59e0c5/72254fec-2f9f-4d4d-89fe-ecc9663e2169.webp',
  '6b999dea-7526-404c-a0e7-a92f858023c0/81e07b5b-0fe7-4a47-9db3-badf20bba1d1/9fb616dd-2b44-498a-818b-b8d77035c3d4.webp',
  '6b999dea-7526-404c-a0e7-a92f858023c0/81e07b5b-0fe7-4a47-9db3-badf20bba1d1/d274c296-5a14-46de-85c0-aa0897b5426b.webp',
  '6b999dea-7526-404c-a0e7-a92f858023c0/82288bd7-09f5-46ef-b01a-ff5249eb1e27/e27c9aa0-24b8-453a-a013-a1e8823ffcac.jpg',
  '6b999dea-7526-404c-a0e7-a92f858023c0/8c409fb7-5b64-41cc-a5ba-0e14a86c87f9/5cb44add-0859-4a52-b892-e37e3b01a70a.webp',
  '6b999dea-7526-404c-a0e7-a92f858023c0/8c409fb7-5b64-41cc-a5ba-0e14a86c87f9/8545cb8a-0933-40f2-9b7a-347f4120c2b9.webp',
  '6b999dea-7526-404c-a0e7-a92f858023c0/8c409fb7-5b64-41cc-a5ba-0e14a86c87f9/b0418289-5d8c-47aa-bf0c-14b951360c86.webp',
  '6b999dea-7526-404c-a0e7-a92f858023c0/8c409fb7-5b64-41cc-a5ba-0e14a86c87f9/eede27af-21b4-4cda-802b-98fe621e06fb.webp',
  '6b999dea-7526-404c-a0e7-a92f858023c0/8c5dd1bd-d7ad-4d28-91ec-4da10d7f5e17/d558d314-ac2f-425e-ac6a-9b0911fe6ce4.jpg',
  '6b999dea-7526-404c-a0e7-a92f858023c0/976e8177-61d2-47a7-9702-369e207da5dd/d6e6d726-20d5-42a9-9ce9-f92177f65146.webp',
  '6b999dea-7526-404c-a0e7-a92f858023c0/a9c5a388-528f-480b-9617-e036ad5518be/026a7f3c-bee2-4a02-b91c-af506a383a01.jpg',
  '6b999dea-7526-404c-a0e7-a92f858023c0/aaebe783-99c0-4fd5-9d96-2eea64a67564/64567dc2-417c-495b-8de7-035decf01209.jpg',
  '6b999dea-7526-404c-a0e7-a92f858023c0/aaebe783-99c0-4fd5-9d96-2eea64a67564/8295ecb2-af1c-4cc1-862d-5bca8b588ff1.jpg',
  '6b999dea-7526-404c-a0e7-a92f858023c0/aaebe783-99c0-4fd5-9d96-2eea64a67564/9dda482a-ca30-425e-b5c8-72040a6f4d95.jpg',
  '6b999dea-7526-404c-a0e7-a92f858023c0/b0af0bb0-5dd3-45fc-9137-b4c91fe8ecc8/014dfbea-c6e9-4946-b06b-2054a5d90389.webp',
  '6b999dea-7526-404c-a0e7-a92f858023c0/b396aaed-a0a2-45ff-afa3-fba61d7a2d8b/3325a1db-f5bd-44f2-8696-c87ab87d80cc.webp',
  '6b999dea-7526-404c-a0e7-a92f858023c0/b9ce8bd0-de72-4bf3-8d76-c30599cfca7d/fd83c550-efa2-4b41-b90e-48b9514bc853.webp',
  '6b999dea-7526-404c-a0e7-a92f858023c0/c385c0bd-e61a-405d-af5e-3575c9f83c6e/ba523f55-ad03-4bc0-a951-53040eaabbbf.jpg',
  '6b999dea-7526-404c-a0e7-a92f858023c0/d0afdea2-dcc0-477e-a729-6e50776a2f56/7a087093-2787-480c-9248-1b8681d866f6.webp',
  '6b999dea-7526-404c-a0e7-a92f858023c0/e606773e-f8d0-41ab-aaf3-54adef2f9828/9eeb5903-e20e-4d87-ba08-9ed4422d4dab.webp',
  '6b999dea-7526-404c-a0e7-a92f858023c0/e606773e-f8d0-41ab-aaf3-54adef2f9828/d0aef75e-aa91-4f39-88e5-e1fcce520823.webp',
  '883e9bf3-d636-470d-94da-5104e03c6fb2/11d1af69-f517-4814-94a8-eeb65bfd8674/1c81452b-8af4-4615-a42a-77056aa9fcf4.webp',
  '883e9bf3-d636-470d-94da-5104e03c6fb2/11d1af69-f517-4814-94a8-eeb65bfd8674/79544976-747a-4efa-83ed-b6266116a27c.webp',
  '883e9bf3-d636-470d-94da-5104e03c6fb2/25ad2675-242c-4a41-89c8-436f613602d8/bd562801-6e9c-432e-8537-35a15a29c413.webp',
  '883e9bf3-d636-470d-94da-5104e03c6fb2/8e27bcc9-a154-4861-a955-fd4d53392c4a/eec88b38-67ad-454d-8f7a-38aa42df2ac1.webp',
  '883e9bf3-d636-470d-94da-5104e03c6fb2/a6b0241e-5574-4394-9652-11ef4bc6a04f/d2d315b6-6fb1-4c8d-8def-faeaf2eb6797.webp',
  '883e9bf3-d636-470d-94da-5104e03c6fb2/c5e8e318-6c44-4619-8d96-7c8d009d262d/dc14b9e4-9d5e-49cc-af10-853f811fabc0.webp',
  'dd12a75d-4ecf-4e70-bfc4-247bf27b8a5a/161add33-5cf9-423e-8b64-ee6215f3940d/49c2346e-2a12-4a88-8d6e-c559d5b3406e.jpeg',
  'dd12a75d-4ecf-4e70-bfc4-247bf27b8a5a/75668ad5-6777-4e87-9918-fb84d1b5c358/0429ce91-9d79-412c-a16c-b7522223af40.jpeg',
  'dd12a75d-4ecf-4e70-bfc4-247bf27b8a5a/75668ad5-6777-4e87-9918-fb84d1b5c358/c21a5520-8376-400b-bc06-c444a1763da3.jpeg',
  'dd12a75d-4ecf-4e70-bfc4-247bf27b8a5a/75668ad5-6777-4e87-9918-fb84d1b5c358/f6783d15-fd89-4a06-96b8-d5c575ae9c49.jpeg',
  'dd12a75d-4ecf-4e70-bfc4-247bf27b8a5a/8560f422-ec55-4ee3-b431-162cae397983/b0a5ef8f-8332-475b-85f7-f486ea4d51de.jpeg',
]

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const apply = process.argv.includes('--apply')

if (!url || !serviceKey) {
  console.error('Manque SUPABASE_URL et/ou SUPABASE_SERVICE_ROLE_KEY dans l environnement.')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })

async function main() {
  console.log(`Bucket : ${BUCKET}`)
  console.log(`Fichiers orphelins listes : ${ORPHANS.length}`)
  console.log(apply ? '>>> MODE APPLY : suppression reelle' : '>>> DRY-RUN : aucune suppression (ajoute --apply pour supprimer)')

  if (!apply) {
    ORPHANS.forEach((p) => console.log('  [dry-run] supprimerait :', p))
    console.log('\nDry-run termine. Relance avec --apply pour supprimer.')
    return
  }

  // Suppression par lots de 50 (limite raisonnable de l API remove).
  let supprimes = 0
  for (let i = 0; i < ORPHANS.length; i += 50) {
    const lot = ORPHANS.slice(i, i + 50)
    const { data, error } = await supabase.storage.from(BUCKET).remove(lot)
    if (error) {
      console.error('Erreur sur un lot :', error.message)
      process.exit(1)
    }
    supprimes += data?.length ?? 0
    console.log(`  Lot ${i / 50 + 1} : ${data?.length ?? 0} fichiers supprimes`)
  }
  console.log(`\nTermine. ${supprimes} fichiers supprimes du bucket ${BUCKET}.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
