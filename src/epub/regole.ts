import type { Regole } from "./generi";

/**
 * Scaffali tematici e parole chiave, inclusi nel pacchetto.
 *
 * L'app funziona senza server, quindi le regole viaggiano con lei invece di
 * essere scaricate. Non c'è nessuna mappa di titoli precompilata: i libri sono
 * quelli di chi apre l'app, e il criterio principale sono le categorie che
 * l'editore scrive dentro l'EPUB (`dc:subject`). Le parole chiave qui sotto
 * intervengono solo quando quelle mancano.
 */
export const REGOLE: Regole = {
  perTitolo: {},
  perAutore: [],
  nomiSpeciali: {
    sospiri: "Lo Scaffale dei Sospiri",
    recenti: "Appena Arrivati",
  },
  scaffali: [
    {
      id: "draghi",
      nome: "L'Antro dei Draghi",
      parole: ["drago", "draghi", "dragon", "dragonier", "wyvern", "drake"],
    },
    {
      id: "fae",
      nome: "Le Corti dei Fae",
      parole: ["fae", "faerie", "fairy", "fata", "fate", "folletto", "seelie", "elf", "elfi"],
    },
    {
      id: "creature",
      nome: "Creature della Notte",
      parole: [
        "vampir", "licantrop", "lupo", "wolf", "werewolf", "demone", "demoni", "demon",
        "angel", "angelo", "fantasma", "spettr", "ghost", "shifter", "paranormal",
        "horror", "occult", "gotic", "gothic",
      ],
    },
    {
      id: "oscuri",
      nome: "I Patti Oscuri",
      parole: [
        "dark", "oscur", "wicked", "twisted", "psycho", "peccat", "vendetta",
        "mafia", "killer", "sicari", "villain", "cruel", "spietat", "erotic",
      ],
    },
    {
      id: "magia",
      nome: "Magia & Accademie",
      parole: [
        "strega", "streghe", "witch", "wicca", "magia", "magic", "incantesim", "spell",
        "academy", "accademia", "school", "scuola", "sortileg", "rune", "wizard", "mago",
      ],
    },
    {
      id: "miti",
      nome: "Miti & Leggende",
      parole: [
        "mitolog", "mythol", "olimpo", "olymp", "hades", "persefone", "persephone",
        "zeus", "god", "goddess", "mito", "myth", "titan", "medusa", "leggend", "legend",
      ],
    },
    {
      id: "epica",
      nome: "Saghe & Imperi",
      parole: [
        "fantasy", "epic", "impero", "empire", "trono", "throne", "regno", "kingdom",
        "corona", "crown", "guerra", "war", "spada", "sword", "profezia", "prophecy",
        "ribell", "rebel", "quest", "saga",
      ],
    },
    {
      id: "distopie",
      nome: "Mondi Spezzati",
      parole: [
        "distop", "dystop", "apocali", "fantascienza", "science fiction", "sci-fi",
        "scifi", "cyberpunk", "spazio", "space", "robot", "futur",
      ],
    },
    {
      id: "misteri",
      nome: "Gli Enigmi Sussurrati",
      parole: [
        "mistero", "mystery", "giallo", "thriller", "indagin", "detective", "omicidi",
        "murder", "delitto", "crime", "suspense", "noir", "spionaggio", "spy",
      ],
    },
    {
      id: "cuori",
      nome: "I Cuori in Fiamme",
      parole: [
        "romance", "romantic", "romanz", "love", "amore", "kiss", "bacio", "heart",
        "cuore", "sposa", "bride", "wedding", "matrimonio", "chick lit", "sentimental",
      ],
    },
    {
      id: "avventura",
      nome: "Terre da Esplorare",
      parole: [
        "avventur", "adventure", "viaggio", "travel", "storic", "historic", "western",
        "mare", "sea", "pirat", "esplor",
      ],
    },
    {
      id: "pensieri",
      nome: "Pagine di Vita",
      parole: [
        "biograf", "memoir", "saggi", "essay", "filosof", "philosoph", "poesia",
        "poetry", "self-help", "crescita personale", "psicolog",
      ],
    },
  ],
};
