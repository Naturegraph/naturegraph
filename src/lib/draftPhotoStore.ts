/**
 * draftPhotoStore : Persistance des PHOTOS de brouillon via IndexedDB (NG-038)
 * ===========================================================================
 *
 * Probleme : l'auto-save brouillon (useContributeDraft) ecrit le texte en
 * localStorage mais PAS les `File` (photos) : localStorage ne stocke que des
 * strings et les images sont trop volumineuses. Resultat : apres un refresh
 * accidentel en pleine contribution, le texte revient mais les photos sont
 * perdues (symptome NG-038 #4).
 *
 * Solution : IndexedDB stocke nativement des `Blob`/`File` (structured clone),
 * sans limite ~5 Mo de localStorage. On y conserve les photos du brouillon,
 * cle par formulaire (ex: 'encounter', 'instant'), et on les restaure au mount.
 *
 * Tout est best-effort + safe : si IndexedDB est indisponible (mode prive
 * Safari ancien, quota, navigateur exotique), les fonctions degradent
 * silencieusement (Promise resolue, pas de crash). La perte de photo de
 * brouillon n'est jamais bloquante.
 */

const DB_NAME = 'naturegraph-drafts'
const STORE_NAME = 'photos'
const DB_VERSION = 1

/** Ouvre (ou cree) la base. Resout `null` si IndexedDB indisponible. */
function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null)
      return
    }
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME)
        }
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(null)
      req.onblocked = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

/** Execute une transaction sur le store et resout quand elle est terminee. */
function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T | undefined> {
  return openDb().then(
    (db) =>
      new Promise<T | undefined>((resolve) => {
        if (!db) {
          resolve(undefined)
          return
        }
        try {
          const tx = db.transaction(STORE_NAME, mode)
          const store = tx.objectStore(STORE_NAME)
          const req = fn(store)
          tx.oncomplete = () => {
            db.close()
            resolve(req && 'result' in req ? (req.result as T) : undefined)
          }
          tx.onerror = () => {
            db.close()
            resolve(undefined)
          }
          tx.onabort = () => {
            db.close()
            resolve(undefined)
          }
        } catch {
          resolve(undefined)
        }
      }),
  )
}

/**
 * Sauvegarde les photos du brouillon `label`. Remplace les precedentes.
 * No-op si la liste est vide (on supprime alors l'entree pour ne pas garder
 * de photos orphelines).
 */
export async function saveDraftPhotos(label: string, files: File[]): Promise<void> {
  if (!files || files.length === 0) {
    await clearDraftPhotos(label)
    return
  }
  // On stocke un tableau de { name, type, blob } : reconstruction fidele du
  // File au chargement (le nom est utile pour l'affichage et l'upload).
  const payload = files.map((f) => ({ name: f.name, type: f.type, blob: f as Blob }))
  await withStore('readwrite', (store) => store.put(payload, label))
}

/** Restaure les photos du brouillon `label` en `File[]`. Vide si rien/erreur. */
export async function loadDraftPhotos(label: string): Promise<File[]> {
  const raw = await withStore<Array<{ name: string; type: string; blob: Blob }>>(
    'readonly',
    (store) => store.get(label),
  )
  if (!raw || !Array.isArray(raw)) return []
  try {
    return raw.map((item) => new File([item.blob], item.name, { type: item.type }))
  } catch {
    return []
  }
}

/** Purge les photos du brouillon `label` (a appeler a la publication / reset). */
export async function clearDraftPhotos(label: string): Promise<void> {
  await withStore('readwrite', (store) => store.delete(label))
}
