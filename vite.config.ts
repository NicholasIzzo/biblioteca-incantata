import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Il percorso di base cambia con l'ospite: su Cloudflare Pages e Netlify il
 * sito sta nella radice, su GitHub Pages sotto /nome-repo/. Si imposta con
 * BASE al momento del build, senza toccare il codice.
 */
export default defineConfig({
  base: process.env.BASE ?? "/",
  plugins: [react()],
});
