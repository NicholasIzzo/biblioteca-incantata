import type { CapitoloEpub } from "./leggiEpub";

/**
 * Archivio della biblioteca personale, su questo dispositivo.
 *
 * Niente va sul server: metadati, copertine e file EPUB restano in IndexedDB,
 * nel browser di chi li importa. È la ragione per cui non serve un account —
 * ogni visitatore ha già la propria libreria — e per cui non custodiamo i libri
 * di nessuno.
 */

const DB = "biblioteca-incantata";
const VERSIONE = 1;
const LIBRI = "libri";

/** Oltre questa soglia si tiene solo la scheda, non il file: leggerlo richiederà di riaprirlo. */
export const LIMITE_FILE = 24 * 1024 * 1024;

export interface VoceArchivio {
  id: string;
  titolo: string;
  autore: string;
  soggetti: string[];
  lingua: string | null;
  anno: number | null;
  descrizione: string;
  /** Scaffale tematico assegnato all'import. */
  scaffale: string;
  copertina: Blob | null;
  capitoli: CapitoloEpub[];
  /** Il file originale, se sotto la soglia: serve a leggere i capitoli. */
  file: Blob | null;
  nomeFile: string;
  byte: number;
  aggiunto: string;
}

/**
 * Quando il browser non concede IndexedDB.
 *
 * Succede davvero, e non per colpa di chi usa il sito: nei browser interni
 * delle app (TikTok, Instagram, Facebook) e nella navigazione privata di iOS
 * l'archivio può essere negato — oppure, caso peggiore, `open()` non chiama né
 * `onsuccess` né `onerror` e resta muta per sempre. Senza una scadenza l'app
 * aspetterebbe all'infinito: nessun errore, nessun libro, nessuna spiegazione.
 *
 * In quel caso si ripiega sulla memoria: i libri funzionano per questa visita
 * e spariscono chiudendo la pagina. Meglio una biblioteca che dura poco di una
 * schermata che non fa nulla — purché lo si dica, ed è ciò che fa `motivo()`.
 */
const ATTESA_APERTURA_MS = 8000;
const memoria = new Map<string, VoceArchivio>();
let soloInMemoria = false;
let motivoRipiego: string | null = null;

/** True se i libri stanno solo in RAM: la UI deve avvisare chi li importa. */
export const archivioVolatile = (): boolean => soloInMemoria;
/** Perché si è ripiegati sulla memoria, in italiano leggibile. */
export const motivoArchivio = (): string | null => motivoRipiego;

function ripiega(causa: unknown): void {
  if (soloInMemoria) return;
  soloInMemoria = true;
  const testo = causa instanceof Error ? causa.message : String(causa);
  motivoRipiego = testo;
  console.warn("archivio su disco non disponibile, si continua in memoria:", testo);
}

function apri(): Promise<IDBDatabase> {
  return new Promise((risolvi, rifiuta) => {
    if (typeof indexedDB === "undefined" || !indexedDB) {
      rifiuta(new Error("questo browser non espone IndexedDB"));
      return;
    }
    let concluso = false;
    const scadenza = setTimeout(() => {
      if (concluso) return;
      concluso = true;
      rifiuta(new Error("l'archivio del browser non risponde"));
    }, ATTESA_APERTURA_MS);
    const finisci = (azione: () => void) => {
      if (concluso) return;
      concluso = true;
      clearTimeout(scadenza);
      azione();
    };

    let richiesta: IDBOpenDBRequest;
    try {
      // in navigazione privata e in certe webview questa riga lancia subito
      richiesta = indexedDB.open(DB, VERSIONE);
    } catch (e) {
      finisci(() => rifiuta(e));
      return;
    }
    richiesta.onupgradeneeded = () => {
      const db = richiesta.result;
      if (!db.objectStoreNames.contains(LIBRI)) db.createObjectStore(LIBRI, { keyPath: "id" });
    };
    richiesta.onsuccess = () => finisci(() => risolvi(richiesta.result));
    richiesta.onerror = () =>
      finisci(() => rifiuta(richiesta.error ?? new Error("apertura rifiutata")));
    richiesta.onblocked = () =>
      finisci(() => rifiuta(new Error("archivio bloccato da un'altra scheda aperta")));
  });
}

/** Esegue il lavoro su IndexedDB, e se non si può lo esegue in memoria. */
async function conArchivio<T>(suDisco: () => Promise<T>, inMemoria: () => T): Promise<T> {
  if (soloInMemoria) return inMemoria();
  try {
    return await suDisco();
  } catch (e) {
    ripiega(e);
    return inMemoria();
  }
}

function transazione<T>(
  modo: IDBTransactionMode,
  lavoro: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return apri().then(
    (db) =>
      new Promise<T>((risolvi, rifiuta) => {
        const tx = db.transaction(LIBRI, modo);
        const richiesta = lavoro(tx.objectStore(LIBRI));
        richiesta.onsuccess = () => risolvi(richiesta.result);
        richiesta.onerror = () => rifiuta(richiesta.error);
        tx.oncomplete = () => db.close();
      }),
  );
}

export const salvaVoce = (v: VoceArchivio) =>
  conArchivio(
    () => transazione("readwrite", (s) => s.put(v) as IDBRequest<IDBValidKey>),
    () => {
      memoria.set(v.id, v);
      return v.id as IDBValidKey;
    },
  );

export const elencoVoci = () =>
  conArchivio(
    () => transazione<VoceArchivio[]>("readonly", (s) => s.getAll()),
    () => [...memoria.values()],
  );

export const leggiVoce = (id: string) =>
  conArchivio(
    () => transazione<VoceArchivio | undefined>("readonly", (s) => s.get(id)),
    () => memoria.get(id),
  );

export const eliminaVoce = (id: string) =>
  conArchivio(
    () => transazione("readwrite", (s) => s.delete(id) as unknown as IDBRequest<undefined>),
    () => {
      memoria.delete(id);
      return undefined;
    },
  );

export async function svuotaArchivio(): Promise<void> {
  await conArchivio(
    () => transazione("readwrite", (s) => s.clear() as unknown as IDBRequest<undefined>),
    () => {
      memoria.clear();
      return undefined;
    },
  );
}

/** Quanto occupa la biblioteca locale, e quanto spazio concede il browser. */
export async function spazio(): Promise<{ usati: number; disponibili: number | null }> {
  const voci = await elencoVoci();
  const usati = voci.reduce((t, v) => t + v.byte, 0);
  let disponibili: number | null = null;
  try {
    const stima = await navigator.storage?.estimate?.();
    if (stima?.quota) disponibili = stima.quota - (stima.usage ?? 0);
  } catch {
    /* stima non disponibile: pazienza */
  }
  return { usati, disponibili };
}

/**
 * Identificativo stabile del libro: serve a non reimportare due volte lo stesso
 * titolo e a ricordare la scelta del taglio decorato. Si basa su titolo e
 * autore, non sul nome del file, che cambia da un dispositivo all'altro.
 */
export function idLibro(titolo: string, autore: string): string {
  const base = `${titolo}|${autore}`.toLowerCase().normalize("NFKD").replace(/[^a-z0-9|]+/g, "");
  let h = 2166136261;
  for (let i = 0; i < base.length; i++) {
    h ^= base.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `ep-${(h >>> 0).toString(36)}`;
}

/**
 * Chiede al browser di conservare davvero questi dati.
 *
 * Senza questo permesso lo spazio dei siti è "a discrezione": quando il disco
 * si riempie il browser può liberarlo, e su iPhone Safari lo cancella dopo
 * sette giorni senza visite. Con il permesso concesso la libreria resta finché
 * non è l'utente a cancellarla.
 *
 * Si chiede **dopo** il primo import, non all'apertura: Firefox mostra una
 * richiesta esplicita, e ha senso porla a chi ha già caricato qualcosa da
 * perdere, non a chi ha appena aperto il sito.
 */
export async function richiediPersistenza(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

/** Se il browser si è già impegnato a conservare i dati. */
export async function persistenzaConcessa(): Promise<boolean> {
  try {
    return (await navigator.storage?.persisted?.()) ?? false;
  } catch {
    return false;
  }
}
