# La Biblioteca Incantata 📚✨

Carica i tuoi **EPUB** e diventano libri veri su scaffali incantati, che puoi
percorrere in 3D. Quando non sai cosa leggere c'è una **Ruota del Destino** che
sceglie per te, e un **angolo col camino** dove aprire il libro e leggerlo
davvero.

**I tuoi file non vengono caricati da nessuna parte.** Restano nel browser, sul
tuo dispositivo. Per questo non c'è registrazione, non c'è login e non c'è
nessun account da creare: la tua libreria è già tua.

## Come funziona

1. Apri il sito e premi **Porta i tuoi libri**.
2. Scegli i tuoi file `.epub` (anche molti insieme).
3. Titolo, autore, copertina, trama e capitoli vengono letti **nel browser**, e
   i libri finiscono sugli scaffali divisi per genere.
4. Cammina fra gli scaffali, apri un libro, girala ruota, siediti al camino.

Funziona da telefono e da computer. Su telefono puoi **installarla** come
un'app: dal menu del browser scegli "Aggiungi a schermata Home". Nessuno store,
nessun costo.

## Cosa fa, in breve

- **Scaffali per genere** dedotti dalle categorie che l'editore scrive dentro
  l'EPUB (`dc:subject`), con le parole chiave come ripiego.
- **Ruota del Destino**: sorteggio con animazione, per gli indecisi.
- **Angolo di lettura**: camino acceso, poltrona, e il libro aperto in grembo —
  con i **capitoli veri**, non un riassunto.
- **Arreda**: sei essenze di legno, tre luci per i ripiani, quattro atmosfere,
  decori fantasy, e il **taglio decorato** dei volumi in due varianti.

## Privacy

- I file EPUB e i loro dati stanno in **IndexedDB**, nel tuo browser.
- Non esiste un server a cui mandarli: il sito è statico.
- Svuotando i dati del browser la libreria si svuota. Su iPhone, se il sistema
  ha bisogno di spazio, può cancellarli: in quel caso vanno reimportati.

## Sviluppo

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # genera dist/
npm run icone    # rigenera le icone della PWA
```

Il percorso di base si imposta al momento del build, per adattarsi all'ospite:

```bash
BASE=/nome-repo/ npm run build   # GitHub Pages sotto sottocartella
npm run build                    # Cloudflare Pages, Netlify, radice del dominio
```

## Struttura

```
src/
  epub/          lettura EPUB, archivio locale, generi, testo dei capitoli
  biblioteca3d/  scena, layout scaffali, materiali, tagli decorati
  angolo3d/      la stanza col camino e il libro aperto
  schermate/     ingresso, import, schede, ruota, personalizzazione
strumenti/
  icone.mjs      genera le icone PNG della PWA senza dipendenze grafiche
```

Il cuore è `biblioteca3d/layout.ts`: matematica pura, senza Three.js, che dalle
misure del mobile ricava i ripiani e dispone i libri in file centrate senza mai
farli uscire dal vano o sovrapporsi (`verificaPosti()` lo verifica).

Aprendo con `?diag=1` la console stampa conteggi e controlli.

## Licenza

MIT — vedi [LICENSE](LICENSE).
