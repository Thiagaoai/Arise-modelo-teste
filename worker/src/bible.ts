// Referências bíblicas: reconhece "Dn 7:13", "1 João 3:16", "Ap 1:1-3" e busca o texto verificado no D1.

export const ABBR = [
  '', 'Gn', 'Êx', 'Lv', 'Nm', 'Dt', 'Js', 'Jz', 'Rt', '1Sm', '2Sm', '1Rs', '2Rs', '1Cr', '2Cr', 'Ed', 'Ne', 'Et',
  'Jó', 'Sl', 'Pv', 'Ec', 'Ct', 'Is', 'Jr', 'Lm', 'Ez', 'Dn', 'Os', 'Jl', 'Am', 'Ob', 'Jn', 'Mq', 'Na', 'Hc',
  'Sf', 'Ag', 'Zc', 'Ml', 'Mt', 'Mc', 'Lc', 'Jo', 'At', 'Rm', '1Co', '2Co', 'Gl', 'Ef', 'Fp', 'Cl', '1Ts', '2Ts',
  '1Tm', '2Tm', 'Tt', 'Fm', 'Hb', 'Tg', '1Pe', '2Pe', '1Jo', '2Jo', '3Jo', 'Jd', 'Ap',
];

const NAMES = [
  '', 'genesis', 'exodo', 'levitico', 'numeros', 'deuteronomio', 'josue', 'juizes', 'rute', '1samuel', '2samuel',
  '1reis', '2reis', '1cronicas', '2cronicas', 'esdras', 'neemias', 'ester', 'job', 'salmos', 'proverbios',
  'eclesiastes', 'cantares', 'isaias', 'jeremias', 'lamentacoes', 'ezequiel', 'daniel', 'oseias', 'joel', 'amos',
  'obadias', 'jonas', 'miqueias', 'naum', 'habacuque', 'sofonias', 'ageu', 'zacarias', 'malaquias', 'mateus',
  'marcos', 'lucas', 'joao', 'atos', 'romanos', '1corintios', '2corintios', 'galatas', 'efesios', 'filipenses',
  'colossenses', '1tessalonicenses', '2tessalonicenses', '1timoteo', '2timoteo', 'tito', 'filemom', 'hebreus',
  'tiago', '1pedro', '2pedro', '1joao', '2joao', '3joao', 'judas', 'apocalipse',
];

const strip = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]/g, '');

const ALIAS = new Map<string, number>();
for (let nr = 1; nr <= 66; nr++) {
  ALIAS.set(strip(ABBR[nr]), nr);
  ALIAS.set(NAMES[nr], nr);
}
ALIAS.set('salmo', 19);
ALIAS.set('canticos', 22);
ALIAS.set('ct', 22);
ALIAS.set('jo', 43); // "Jo" = João; "Jó" (com acento) é tratado à parte

export interface Ref { book: number; ch: number; v1: number; v2: number; label: string }

export function parseRefs(text: string): Ref[] {
  const out: Ref[] = [];
  const re = /(?<![\p{L}\d])([123]\s?)?(\p{L}{1,14})\.?\s*(\d{1,3})\s*:\s*(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?/gu;
  for (const m of text.matchAll(re)) {
    const word = m[2];
    const key = (m[1] ?? '').replace(/\s/g, '') + strip(word);
    const book = word === 'Jó' && !m[1] ? 18 : ALIAS.get(key);
    if (!book) continue;
    const v1 = Number(m[4]);
    const v2 = m[5] ? Number(m[5]) : v1;
    if (v2 < v1) continue;
    out.push({ book, ch: Number(m[3]), v1, v2: Math.min(v2, v1 + 14), label: `${ABBR[book]} ${m[3]}:${v1}${v2 > v1 ? '-' + Math.min(v2, v1 + 14) : ''}` });
  }
  const seen = new Set<string>();
  return out.filter((r) => !seen.has(r.label) && seen.add(r.label));
}

export async function fetchRef(db: D1Database, r: Ref): Promise<{ label: string; text: string } | null> {
  const rows = await db.prepare('SELECT v, text FROM bible WHERE book = ? AND ch = ? AND v BETWEEN ? AND ? ORDER BY v')
    .bind(r.book, r.ch, r.v1, r.v2).all<{ v: number; text: string }>();
  if (!rows.results.length) return null;
  return { label: r.label, text: rows.results.map((x) => `${x.v}. ${x.text.trim()}`).join(' ') };
}

// Quais referências citadas realmente existem na Bíblia (livro, capítulo e versículos).
export async function missingRefs(db: D1Database, refs: Ref[]): Promise<string[]> {
  const bad: string[] = [];
  for (const r of refs) {
    const row = await db.prepare('SELECT COUNT(*) AS n FROM bible WHERE book = ? AND ch = ? AND v BETWEEN ? AND ?')
      .bind(r.book, r.ch, r.v1, r.v2).first<{ n: number }>();
    if ((row?.n ?? 0) < r.v2 - r.v1 + 1) bad.push(r.label);
  }
  return bad;
}

// Capítulos de Apocalipse citados na mensagem: "cap. 3", "Ap 5", "capítulos 1 ao 3", "Ap 2 e 3", "1-3".
// Versículos depois de ":" não contam ("Ap 1:2 ao 10" é só o capítulo 1).
export function mentionedChapters(text: string): number[] {
  const found = new Set<number>();
  const re = /(?<![\p{L}\d])(?:cap(?:[ií]tulos?)?|ap(?:ocalipse)?)\.?\s*(\d{1,2})(?!\d)(?:\s*(ao?|at[ée]|-|–|e)\s*(?:cap(?:[ií]tulos?)?\.?\s*)?(\d{1,2})(?!\d)(?!\s*:))?/giu;
  for (const m of text.matchAll(re)) {
    const a = Number(m[1]);
    const c = m[3] ? Number(m[3]) : null;
    if (a >= 1 && a <= 22) found.add(a);
    if (c && c >= 1 && c <= 22) {
      if (m[2] === 'e') found.add(c);
      else if (c > a) for (let n = a; n <= c; n++) found.add(n);
    }
  }
  return [...found].sort((x, y) => x - y);
}
