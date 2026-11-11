import { useEffect, useRef, useState } from "react";
import {
  LIMITE_FILE,
  archivioVolatile,
  elencoVoci,
  idLibro,
  salvaVoce,
  persistenzaConcessa,
  richiediPersistenza,
  spazio,
  svuotaArchivio,
  type VoceArchivio,
} from "../epub/archivio";
import { regole, scaffaleDi } from "../epub/generi";
import { leggiEpub } from "../epub/leggiEpub";

interface Props {
  onFatto: () => void;
  onChiudi: () => void;
}

interface Esito {
  nome: string;
  stato: "ok" | "salta" | "errore";
  dettaglio?: string;
}

/** Una libreria appena nata pesa pochi KB: "0.0 MB" sembrerebbe un errore. */
const peso = (b: number) =>
  b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;

/** Import degli EPUB dal dispositivo: i file non lasciano il browser. */
export function ImportaEpub({ onFatto, onChiudi }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [inCorso, setInCorso] = useState(false);
  const [fatti, setFatti] = useState(0);
  const [totale, setTotale] = useState(0);
  const [corrente, setCorrente] = useState("");
  const [esiti, setEsiti] = useState<Esito[]>([]);
  const [presenti, setPresenti] = useState(0);
  const [occupato, setOccupato] = useState(0);
  const [persistente, setPersistente] = useState(false);
  const [volatile, setVolatile] = useState(false);

  const aggiorna = async () => {
    const voci = await elencoVoci();
    setPresenti(voci.length);
    setOccupato((await spazio()).usati);
    setPersistente(await persistenzaConcessa());
    setVolatile(archivioVolatile());
  };

  useEffect(() => {
    void aggiorna();
    // Gancio di prova (?diag=1): permette di verificare l'import senza passare
    // dal selettore di file, che per sicurezza non è pilotabile da script.
    if (new URLSearchParams(location.search).get("diag") === "1") {
      (window as unknown as { __importaEpub?: unknown }).__importaEpub = (f: File[]) =>
        importa(f as unknown as FileList);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function importa(files: FileList) {
    const scelti = Array.from(files);
    if (scelti.length === 0) return;
    /*
     * Si preferiscono i file che si dichiarano EPUB, ma se nessuno lo fa si
     * provano comunque tutti: da alcuni gestori di file su telefono il nome
     * arriva senza estensione, e rifiutarli a priori significava dire "nessun
     * file .epub selezionato" a chi ne aveva appena scelto uno valido.
     */
    const dichiarati = scelti.filter(
      (f) => /\.epub$/i.test(f.name) || /epub/i.test(f.type),
    );
    const epub = dichiarati.length > 0 ? dichiarati : scelti;
    setInCorso(true);
    setTotale(epub.length);
    setFatti(0);
    setEsiti([]);

    const r = await regole();
    const giaPresenti = new Set((await elencoVoci()).map((v) => v.id));
    const nuoviEsiti: Esito[] = [];

    for (let i = 0; i < epub.length; i++) {
      const file = epub[i]!;
      setCorrente(file.name);
      try {
        const dati = await leggiEpub(file);
        const id = idLibro(dati.titolo, dati.autore);
        if (giaPresenti.has(id)) {
          nuoviEsiti.push({ nome: dati.titolo, stato: "salta", dettaglio: "già in libreria" });
        } else {
          const voce: VoceArchivio = {
            id,
            titolo: dati.titolo,
            autore: dati.autore,
            soggetti: dati.soggetti,
            lingua: dati.lingua,
            anno: dati.anno,
            descrizione: dati.descrizione,
            scaffale: scaffaleDi(
              { titolo: dati.titolo, autore: dati.autore, soggetti: dati.soggetti },
              r,
            ),
            copertina: dati.copertina,
            capitoli: dati.capitoli,
            // Sopra la soglia si tiene solo la scheda: un archivio di file
            // enormi riempirebbe lo spazio concesso al browser.
            file: file.size <= LIMITE_FILE ? file : null,
            nomeFile: file.name,
            byte: file.size <= LIMITE_FILE ? file.size : (dati.copertina?.size ?? 0),
            aggiunto: new Date().toISOString(),
          };
          await salvaVoce(voce);
          giaPresenti.add(id);
          nuoviEsiti.push({
            nome: dati.titolo,
            stato: "ok",
            dettaglio: voce.file ? undefined : "troppo grande: salvata solo la scheda",
          });
        }
      } catch (e) {
        nuoviEsiti.push({ nome: file.name, stato: "errore", dettaglio: String(e).slice(0, 90) });
      }
      setFatti(i + 1);
      setEsiti([...nuoviEsiti]);
      // un respiro al browser, così la barra si muove davvero
      await new Promise((r2) => setTimeout(r2, 0));
    }

    setCorrente("");
    setInCorso(false);
    // Ora che c'è qualcosa da perdere, si chiede al browser di conservarlo.
    if (nuoviEsiti.some((e) => e.stato === "ok")) await richiediPersistenza();
    await aggiorna();
  }

  /**
   * Libri d'esempio inclusi nel sito: chi arriva senza un EPUB a portata
   * vedrebbe una biblioteca vuota e non capirebbe a cosa serve.
   */
  async function provaEsempi() {
    const nomi = [
      "il-drago-di-vetro.epub",
      "un-cuore-in-prestito.epub",
      "indagine-a-mezzanotte.epub",
    ];
    setInCorso(true);
    try {
      const files: File[] = [];
      const guasti: Esito[] = [];
      for (const nome of nomi) {
        try {
          // niente cache: se il service worker ne tiene una vecchia o monca,
          // il tasto "esempi" fallirebbe per sempre senza dire perché
          const risposta = await fetch(`${import.meta.env.BASE_URL}esempi/${nome}`, {
            cache: "no-store",
          });
          if (!risposta.ok) {
            guasti.push({ nome, stato: "errore", dettaglio: `scaricamento HTTP ${risposta.status}` });
            continue;
          }
          files.push(new File([await risposta.blob()], nome, { type: "application/epub+zip" }));
        } catch (e) {
          guasti.push({ nome, stato: "errore", dettaglio: `rete: ${String(e).slice(0, 60)}` });
        }
      }
      setInCorso(false);
      if (files.length > 0) await importa(files as unknown as FileList);
      else setEsiti(guasti.length > 0 ? guasti : [{ nome: "esempi", stato: "errore", dettaglio: "non scaricabili" }]);
    } catch (e) {
      setInCorso(false);
      setEsiti([{ nome: "esempi", stato: "errore", dettaglio: String(e).slice(0, 80) }]);
    }
  }

  const ok = esiti.filter((e) => e.stato === "ok").length;
  const saltati = esiti.filter((e) => e.stato === "salta").length;
  const errori = esiti.filter((e) => e.stato === "errore");

  return (
    <div className="importa">
      <button className="scheda-chiudi" onClick={onChiudi} aria-label="Chiudi">✕</button>
      <h1 className="importa-titolo">📚 Porta i tuoi libri</h1>
      <p className="importa-sotto">
        Scegli i tuoi file <strong>EPUB</strong>: titolo, autore, copertina e genere vengono
        letti qui nel browser e i libri finiscono sugli scaffali.
        <br />
        <strong>I file non vengono caricati da nessuna parte</strong>: restano su questo
        dispositivo, e per questo non serve alcun account.
      </p>
      <p className="importa-durata">
        La libreria resta anche dopo aver chiuso: non dovrai reimportarla ogni volta.
        Sparisce solo se cancelli i dati di navigazione. Su iPhone, per non perderla,
        conviene aggiungere il sito alla schermata Home.
      </p>

      {volatile && (
        <p className="importa-allarme">
          ⚠️ <strong>Questo browser non ci lascia salvare i libri.</strong> Succede quasi
          sempre quando il sito è aperto dentro un'altra app (TikTok, Instagram, Facebook)
          o in navigazione privata. Puoi guardarti attorno lo stesso, ma la libreria
          sparirà chiudendo la pagina. Per tenerla: apri questo indirizzo in{" "}
          <strong>Chrome</strong> o <strong>Safari</strong> — dal menù ⋯ in alto, «Apri nel
          browser».
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        /*
         * Elenco largo di proposito. Android non filtra per estensione ma per
         * tipo MIME, e molti gestori di file dichiarano un EPUB come zip o come
         * octet-stream: con il solo "application/epub+zip" i libri appaiono in
         * grigio e non si riesce a sceglierne nemmeno uno.
         */
        accept=".epub,application/epub+zip,application/zip,application/x-zip-compressed,application/octet-stream"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files) void importa(e.target.files);
        }}
      />

      <div className="importa-azioni">
        <button className="btn-oro" disabled={inCorso} onClick={() => inputRef.current?.click()}>
          {inCorso ? "Sto leggendo…" : "📂 Scegli i file EPUB"}
        </button>
        {presenti === 0 && !inCorso && (
          <button className="btn-fantasma" onClick={() => void provaEsempi()}>
            ✨ Prova con tre libri d'esempio
          </button>
        )}
        {presenti > 0 && !inCorso && (
          <button className="btn-fantasma" onClick={onFatto}>
            ✨ Entra nella tua biblioteca ({presenti})
          </button>
        )}
      </div>

      {presenti > 0 && (
        <p className="importa-spazio">
          {presenti} libri {volatile ? "aperti ora" : "sul dispositivo"} · {peso(occupato)} occupati ·{" "}
          {volatile ? (
            <span className="importa-fragile" title="Il browser non concede l'archivio: i libri vivono solo finché resta aperta questa pagina">
              solo per questa visita
            </span>
          ) : persistente ? (
            <span className="importa-sicuro">conservati stabilmente</span>
          ) : (
            <span className="importa-fragile" title="Il browser può liberare lo spazio se il disco si riempie">
              conservazione non garantita
            </span>
          )}
          {!inCorso && (
            <button
              className="importa-svuota"
              aria-label="Svuota la biblioteca di questo dispositivo"
              onClick={async () => {
                if (!confirm("Svuotare la biblioteca di questo dispositivo?")) return;
                await svuotaArchivio();
                setEsiti([]);
                await aggiorna();
              }}
            >
              · svuota
            </button>
          )}
        </p>
      )}

      {inCorso && (
        <div className="importa-barra">
          <div className="importa-barra-piena" style={{ width: `${(fatti / totale) * 100}%` }} />
          <span>
            {fatti} / {totale} — {corrente}
          </span>
        </div>
      )}

      {esiti.length > 0 && !inCorso && (
        <div className="importa-esito">
          <p>
            <strong>{ok}</strong> importati
            {saltati > 0 && <> · {saltati} già presenti</>}
            {errori.length > 0 && <> · {errori.length} non letti</>}
          </p>
          {errori.length > 0 && (
            <ul className="importa-errori">
              {errori.slice(0, 6).map((e, i) => (
                <li key={i}>
                  {e.nome}: {e.dettaglio}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
