/**
 * Genera le icone della PWA senza dipendenze grafiche.
 *
 * Un PNG è poco più di una sequenza di scanline compressa con zlib: si può
 * scrivere a mano con fflate, che il progetto usa già per gli EPUB. Evita di
 * aggiungere una libreria di immagini solo per due file.
 */
import { zlibSync } from "fflate";
import { writeFileSync, mkdirSync } from "node:fs";

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

function png(lato, pixel) {
  const righe = Buffer.alloc(lato * (lato * 4 + 1));
  for (let y = 0; y < lato; y++) {
    righe[y * (lato * 4 + 1)] = 0; // filtro "nessuno"
    for (let x = 0; x < lato; x++) {
      const [r, g, b, a] = pixel(x, y);
      const i = y * (lato * 4 + 1) + 1 + x * 4;
      righe[i] = r; righe[i + 1] = g; righe[i + 2] = b; righe[i + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(lato, 0);
  ihdr.writeUInt32BE(lato, 4);
  ihdr[8] = 8;   // 8 bit per canale
  ihdr[9] = 6;   // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlibSync(new Uint8Array(righe), { level: 9 })),
    chunk("IEND", new Uint8Array()),
  ]);
}

/** Un libro dorato aperto su fondo notturno, con una scintilla. */
function disegno(lato, margine) {
  return (x, y) => {
    const u = x / lato, v = y / lato;
    // fondo: notte con alone caldo al centro
    const d = Math.hypot(u - 0.5, v - 0.52);
    const alone = Math.max(0, 1 - d * 2.1);
    let r = 12 + alone * 92, g = 8 + alone * 60, b = 26 + alone * 24;

    if (margine > 0) {
      const bordo = Math.min(u, v, 1 - u, 1 - v);
      if (bordo < margine) return [r * 0.5, g * 0.5, b * 0.7, 255];
    }

    // due pagine aperte a V
    const cy = 0.62, apertura = 0.30, altezza = 0.24;
    const dxv = Math.abs(u - 0.5);
    // Un libro aperto ha il dorso in mezzo, piu basso, e i bordi esterni
    // rialzati: il contrario darebbe una tenda.
    const inclinazione = cy - altezza * (dxv / apertura);
    if (dxv < apertura && v > inclinazione && v < cy + 0.14) {
      const luce = 1 - (v - inclinazione) / (cy + 0.14 - inclinazione);
      r = 236 - luce * 22; g = 222 - luce * 30; b = 178 - luce * 40;
      // solco centrale
      if (dxv < 0.012) { r *= 0.55; g *= 0.5; b *= 0.45; }
      return [r, g, b, 255];
    }
    // costa dorata sotto le pagine
    if (dxv < apertura && v >= cy + 0.14 && v < cy + 0.19) {
      return [198, 156, 74, 255];
    }
    // scintilla in alto
    const ds = Math.hypot(u - 0.5, v - 0.26);
    if (ds < 0.055) {
      const k = 1 - ds / 0.055;
      return [255, 232 - k * 20, 150 + k * 60, 255];
    }
    return [r, g, b, 255];
  };
}

mkdirSync("public", { recursive: true });
for (const lato of [192, 512]) {
  writeFileSync(`public/icona-${lato}.png`, png(lato, disegno(lato, 0)));
}
// versione "maskable": Android ritaglia i bordi, serve margine di sicurezza
writeFileSync("public/icona-maskable-512.png", png(512, disegno(512, 0.12)));
writeFileSync("public/apple-touch-icon.png", png(180, disegno(180, 0)));
console.log("icone generate in public/");
