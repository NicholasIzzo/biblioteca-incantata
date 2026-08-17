/**
 * Smistamento dei libri negli scaffali tematici.
 *
 * Il criterio più affidabile sono le categorie che l'editore scrive dentro
 * l'EPUB (`dc:subject`): dicono il genere meglio di qualunque parola nel
 * titolo. Le parole chiave intervengono solo quando quelle mancano.
 */

export interface DefScaffale {
  id: string;
  nome: string;
  parole: string[];
}

export interface Regole {
  scaffali: DefScaffale[];
  perTitolo: Record<string, string>;
  perAutore: { autore: string; scaffale: string }[];
  nomiSpeciali: Record<string, string>;
}

import { REGOLE } from "./regole";

/**
 * Le regole viaggiano dentro l'app: non c'è nessun server da interrogare.
 */
export async function regole(): Promise<Regole> {
  return REGOLE;
}

export function normalizza(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export interface DaClassificare {
  titolo: string;
  autore: string;
  soggetti: string[];
}

export function scaffaleDi(libro: DaClassificare, r: Regole): string {
  const titolo = normalizza(libro.titolo);

  // 1. mappa curata (stessa del server): titolo esatto o per prefisso
  const chiavi = Object.keys(r.perTitolo).sort((a, b) => b.length - a.length);
  if (r.perTitolo[titolo]) return r.perTitolo[titolo]!;
  for (const chiave of chiavi) {
    if (titolo === chiave || titolo.startsWith(chiave + " ")) return r.perTitolo[chiave]!;
  }

  // 2. autore/serie
  const autore = normalizza(libro.autore);
  for (const regola of r.perAutore) {
    if (autore && autore.includes(normalizza(regola.autore))) return regola.scaffale;
  }

  // 3. categorie dell'editore: più affidabili delle parole nel titolo
  const soggetti = libro.soggetti.map(normalizza).join(" ");
  if (soggetti) {
    for (const def of r.scaffali) {
      if (def.parole.some((p) => soggetti.includes(normalizza(p)))) return def.id;
    }
  }

  // 4. ultima spiaggia: parole chiave nel titolo
  for (const def of r.scaffali) {
    if (def.parole.some((p) => titolo.includes(normalizza(p)))) return def.id;
  }
  return "sospiri";
}

export function nomeScaffale(id: string, r: Regole): string {
  return r.scaffali.find((s) => s.id === id)?.nome ?? r.nomiSpeciali[id] ?? "Lo Scaffale dei Sospiri";
}
