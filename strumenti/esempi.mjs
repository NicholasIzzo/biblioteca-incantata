/**
 * Genera i libri d'esempio inclusi nel sito.
 *
 * Chi apre il link non ha sempre un EPUB a portata di mano: senza qualcosa da
 * caricare vedrebbe una biblioteca vuota e non capirebbe a cosa serve. Questi
 * sono EPUB veri e completi — testi originali scritti apposta, quindi liberi da
 * qualunque diritto altrui — così la prova è immediata.
 */
import { zipSync, strToU8 } from "fflate";
import { writeFileSync, mkdirSync } from "node:fs";

/** Copertina: una tinta piena con una cornice, generata come PNG. */
import { zlibSync } from "fflate";

const crcTab = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (b) => {
  let c = 0xffffffff;
  for (const x of b) c = crcTab[(c ^ x) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
function chunk(tipo, dati) {
  const t = Buffer.from(tipo, "ascii");
  const lung = Buffer.alloc(4);
  lung.writeUInt32BE(dati.length);
  const corpo = Buffer.concat([t, Buffer.from(dati)]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(corpo));
  return Buffer.concat([lung, corpo, crc]);
}
function copertina(lato, [r0, g0, b0], [r1, g1, b1]) {
  const righe = Buffer.alloc(lato * 1.5 * (lato * 4 + 1));
  const alt = Math.round(lato * 1.5);
  const out = Buffer.alloc(alt * (lato * 4 + 1));
  for (let y = 0; y < alt; y++) {
    out[y * (lato * 4 + 1)] = 0;
    for (let x = 0; x < lato; x++) {
      const v = y / alt;
      const bordo = Math.min(x, y, lato - x, alt - y) < lato * 0.05;
      const i = y * (lato * 4 + 1) + 1 + x * 4;
      out[i] = bordo ? 201 : r0 + (r1 - r0) * v;
      out[i + 1] = bordo ? 162 : g0 + (g1 - g0) * v;
      out[i + 2] = bordo ? 75 : b0 + (b1 - b0) * v;
      out[i + 3] = 255;
    }
  }
  void righe;
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(lato, 0);
  ihdr.writeUInt32BE(alt, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlibSync(new Uint8Array(out), { level: 9 })),
    chunk("IEND", new Uint8Array()),
  ]);
}

function epub({ file, titolo, autore, soggetti, descrizione, anno, tinta, capitoli }) {
  const manifestCap = capitoli
    .map((_, i) => `<item id="c${i}" href="c${i}.xhtml" media-type="application/xhtml+xml"/>`)
    .join("");
  const spine = capitoli.map((_, i) => `<itemref idref="c${i}"/>`).join("");
  const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:identifier id="id">esempio-${file}</dc:identifier>
<dc:title>${titolo}</dc:title><dc:creator>${autore}</dc:creator>
<dc:language>it</dc:language><dc:date>${anno}-01-01</dc:date>
<dc:description>${descrizione}</dc:description>
${soggetti.map((s) => `<dc:subject>${s}</dc:subject>`).join("")}
<meta name="cover" content="cop"/></metadata>
<manifest><item id="cop" href="cover.png" media-type="image/png" properties="cover-image"/>${manifestCap}</manifest>
<spine>${spine}</spine></package>`;

  const contenuti = {
    mimetype: strToU8("application/epub+zip"),
    "META-INF/container.xml": strToU8(
      '<?xml version="1.0"?><container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>',
    ),
    "OEBPS/content.opf": strToU8(opf),
    "OEBPS/cover.png": new Uint8Array(copertina(240, tinta[0], tinta[1])),
  };
  capitoli.forEach((c, i) => {
    contenuti[`OEBPS/c${i}.xhtml`] = strToU8(`<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml"><head><title>${c.titolo}</title></head>
<body><h1>${c.titolo}</h1>${c.paragrafi.map((p) => `<p>${p}</p>`).join("")}</body></html>`);
  });

  mkdirSync("public/esempi", { recursive: true });
  writeFileSync(`public/esempi/${file}`, Buffer.from(zipSync(contenuti)));
  console.log("creato", file);
}

epub({
  file: "il-drago-di-vetro.epub",
  titolo: "Il Drago di Vetro",
  autore: "Esempio d'Autrice",
  soggetti: ["Fantasy", "Draghi"],
  descrizione: "Un drago di vetro dorme sotto il lago, e qualcuno ha appena bussato.",
  anno: 2024,
  tinta: [[36, 60, 84], [14, 22, 34]],
  capitoli: [
    {
      titolo: "La porta sul lago",
      paragrafi: [
        "Il lago gelava sempre dal centro verso le rive, il contrario di ogni altro lago del regno, e questo bastava a tenere lontani i forestieri.",
        "Mira ci andava lo stesso, ogni inverno, perché sotto quel ghiaccio c'era una forma lunga che nelle notti chiare mandava riflessi azzurri.",
        "Quella mattina la forma si era spostata di un palmo. Un palmo soltanto: abbastanza perché lei capisse che il drago non era morto, ma stava aspettando.",
      ],
    },
    {
      titolo: "Ciò che si sveglia",
      paragrafi: [
        "Il ghiaccio si aprì senza rumore, come una pagina che si volta.",
        "«Hai bussato tu», disse una voce che veniva da sotto, e non era una domanda. «Nessuno bussa due volte per sbaglio.»",
        "Mira si accorse di avere ancora la mano alzata, e di non ricordare di averla mossa.",
      ],
    },
  ],
});

epub({
  file: "un-cuore-in-prestito.epub",
  titolo: "Un Cuore in Prestito",
  autore: "Esempio d'Autrice",
  soggetti: ["Romance", "Contemporaneo"],
  descrizione: "Un patto di sei mesi fra due estranei, scritto male e firmato peggio.",
  anno: 2025,
  tinta: [[120, 44, 74], [40, 12, 26]],
  capitoli: [
    {
      titolo: "Clausola quattro",
      paragrafi: [
        "Il contratto era di due pagine e mezzo, e la clausola quattro diceva che nessuno dei due avrebbe dovuto innamorarsi.",
        "«L'hai scritta tu», disse lui, con l'aria di chi ha già perso una discussione che non è ancora cominciata.",
        "«L'ho scritta perché mi sembrava ovvia», rispose lei. «Le cose ovvie si scrivono lo stesso, altrimenti succedono.»",
      ],
    },
  ],
});

epub({
  file: "indagine-a-mezzanotte.epub",
  titolo: "Indagine a Mezzanotte",
  autore: "Esempio d'Autrice",
  soggetti: ["Thriller", "Mystery"],
  descrizione: "Una stanza chiusa dall'interno, e una finestra che nessuno aveva aperto.",
  anno: 2023,
  tinta: [[40, 44, 52], [12, 14, 18]],
  capitoli: [
    {
      titolo: "La stanza chiusa",
      paragrafi: [
        "La chiave era nella toppa, girata dall'interno, e questo secondo tutti chiudeva il caso prima ancora di aprirlo.",
        "L'ispettore Vela guardò invece la polvere sul davanzale: era intatta ovunque tranne che in due punti, larghi quanto due pollici.",
        "«Nessuno è entrato dalla finestra», disse il sergente. «Infatti», rispose lei. «Qualcuno è uscito.»",
      ],
    },
  ],
});
