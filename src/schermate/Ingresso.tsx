interface Props {
  lettrice: string;
  pronta: boolean;
  /** Quanti libri sono già stati importati su questo dispositivo. */
  nLocali: number;
  onEntra: () => void;
  onImporta: () => void;
}

/** La grande porta: sipario d'ingresso prima di varcare la biblioteca. */
export function Ingresso({ lettrice, pronta, nLocali, onEntra, onImporta }: Props) {
  return (
    <div className="ingresso">
      <div className="ingresso-stelle" aria-hidden />
      <div className="ingresso-cuore">
        <p className="ingresso-occhiello">✦ ✦ ✦</p>
        <h1 className="ingresso-titolo">La Biblioteca Incantata</h1>
        <p className="ingresso-lettrice">
          {nLocali > 0 ? (
            <>
              la <strong>tua</strong> biblioteca · {nLocali} libri
            </>
          ) : (
            <>i tuoi libri, su scaffali incantati</>
          )}
        </p>
        <p className="ingresso-sotto">
          Carica i tuoi EPUB e diventano libri veri su scaffali da sfogliare.
          Quando non sai cosa leggere, lascia scegliere alla{" "}
          <em>Ruota del Destino</em>, poi siediti accanto al camino.
        </p>

        <div className="ingresso-azioni">
          <button
            className="btn-oro grande"
            disabled={!pronta || nLocali === 0}
            onClick={onEntra}
            title={nLocali === 0 ? "Prima carica qualche libro" : undefined}
          >
            {pronta ? "🗝️ Varca la soglia" : "Accendo le candele…"}
          </button>
          <button className="btn-fantasma" onClick={onImporta}>
            📚 {nLocali > 0 ? "Gestisci i tuoi libri" : "Porta i tuoi libri (EPUB)"}
          </button>
        </div>

        <p className="ingresso-nota">
          I tuoi EPUB restano su questo dispositivo: non vengono caricati da nessuna parte,
          e per questo non serve nessun account.
        </p>
      </div>
      <div className="ingresso-fumo" aria-hidden />
    </div>
  );
}
