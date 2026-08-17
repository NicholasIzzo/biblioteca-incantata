/**
 * Copertine.
 *
 * L'app non ha un server: le immagini arrivano dagli EPUB dell'utente, già in
 * memoria come blob. Quando un libro non ne dichiara una si disegna un
 * segnaposto, così non resta mai un rettangolo vuoto sullo scaffale.
 */

const segnaposti = new Map<string, string>();

const TINTE: [string, string][] = [
  ["#3a1f2a", "#1a0e14"],
  ["#22304a", "#101725"],
  ["#3d2a18", "#1b120a"],
  ["#2c3a2a", "#131a13"],
  ["#3a2440", "#180f1c"],
  ["#402020", "#1c0e0e"],
];

function impronta(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Copertina disegnata per i libri che non ne hanno una. */
function segnaposto(id: string, titolo: string): string {
  const gia = segnaposti.get(id);
  if (gia) return gia;

  const c = document.createElement("canvas");
  c.width = 320;
  c.height = 480;
  const ctx = c.getContext("2d");
  if (!ctx) return "";

  const [alto, basso] = TINTE[impronta(id) % TINTE.length]!;
  const sfumatura = ctx.createLinearGradient(0, 0, 0, 480);
  sfumatura.addColorStop(0, alto);
  sfumatura.addColorStop(1, basso);
  ctx.fillStyle = sfumatura;
  ctx.fillRect(0, 0, 320, 480);

  ctx.strokeStyle = "rgba(201,162,75,0.6)";
  ctx.lineWidth = 4;
  ctx.strokeRect(14, 14, 292, 452);

  ctx.fillStyle = "rgba(201,162,75,0.85)";
  ctx.textAlign = "center";
  ctx.font = "34px serif";
  ctx.fillText("✦", 160, 96);

  // titolo mandato a capo, al massimo sei righe
  ctx.fillStyle = "#f3e9d2";
  ctx.font = "24px Georgia, serif";
  const righe: string[] = [];
  let riga = "";
  for (const parola of titolo.split(/s+/)) {
    if ((riga + " " + parola).trim().length > 14) {
      if (riga) righe.push(riga.trim());
      riga = parola;
    } else {
      riga += " " + parola;
    }
  }
  if (riga.trim()) righe.push(riga.trim());
  righe.slice(0, 6).forEach((r, i) => ctx.fillText(r, 160, 180 + i * 38, 280));

  const url = c.toDataURL("image/png");
  segnaposti.set(id, url);
  return url;
}

export const coverUrl = (libro: {
  id: string;
  titolo?: string;
  titoloBreve?: string;
  copertinaUrl?: string;
}) => libro.copertinaUrl ?? segnaposto(libro.id, libro.titoloBreve ?? libro.titolo ?? "Libro");
