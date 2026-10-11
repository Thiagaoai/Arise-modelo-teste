// Opções depois da resposta (raiz, original, outras passagens, música).
// Tudo vem de tabelas verificadas no banco; o modelo não escolhe passagem nem inventa música.
import { ABBR, parseRefs, fetchRef } from './bible';

export interface Anchor { ch: number; v: number }

// Versículos de Apocalipse citados na resposta (ou, se não houver, na pergunta). No máximo 6.
export function anchorsOf(question: string, answer: string): Anchor[] {
  const pick = (t: string) => parseRefs(t).filter((r) => r.book === 66);
  const refs = pick(answer).length ? pick(answer) : pick(question);
  const out: Anchor[] = [];
  for (const r of refs) {
    for (let v = r.v1; v <= r.v2 && out.length < 6; v++) {
      if (!out.some((a) => a.ch === r.ch && a.v === v)) out.push({ ch: r.ch, v });
    }
  }
  return out;
}

const label = (a: Anchor) => `Ap ${a.ch}:${a.v}`;
export const anchorTitle = (as: Anchor[]) => as.map(label).join(', ');

export async function buildOriginal(db: D1Database, as: Anchor[]): Promise<string> {
  const lines: string[] = [];
  for (const a of as) {
    const r = await db.prepare('SELECT text FROM greek WHERE ch = ? AND v = ?').bind(a.ch, a.v).first<{ text: string }>();
    if (r) lines.push(`${label(a)}\n${r.text}`);
  }
  return lines.length
    ? `📜 Original em grego (Tischendorf, 8ª ed.)\n\n${lines.join('\n\n')}`
    : 'Não encontrei o original desse trecho na base.';
}

const SKIP = new Set(['εἰμί', 'γίνομαι', 'ἔχω', 'λέγω', 'ποιέω', 'ὁράω', 'ἔρχομαι', 'δίδωμι']);

export interface RootItem { lemma: string; strong: string; def: string; gloss: string }

// Palavras de conteúdo (substantivo, verbo, adjetivo) dos versículos, sem as muito comuns, no máximo 6.
export async function rootWords(db: D1Database, as: Anchor[]): Promise<{ items: RootItem[]; noEntry: number }> {
  const items: RootItem[] = [];
  let noEntry = 0;
  const seen = new Set<string>();
  for (const a of as) {
    const rows = await db.prepare(
      "SELECT lemma, strong, gloss, def FROM words WHERE ch = ? AND v = ? AND (tag LIKE 'N-%' OR tag LIKE 'V-%' OR tag LIKE 'A-%') ORDER BY pos",
    ).bind(a.ch, a.v).all<{ lemma: string; strong: string | null; gloss: string | null; def: string | null }>();
    for (const w of rows.results) {
      if (seen.has(w.lemma) || SKIP.has(w.lemma)) continue;
      seen.add(w.lemma);
      if (!w.strong) { noEntry++; continue; }
      if (items.length < 6) items.push({ lemma: w.lemma, strong: w.strong, def: w.def ?? '', gloss: w.gloss ?? '' });
    }
  }
  return { items, noEntry };
}

// Ligações do dataset OpenBible (CC-BY): as 3 mais votadas para os versículos, com o texto do banco.
export async function buildPassagens(db: D1Database, as: Anchor[]): Promise<string> {
  const found: { book: number; ch: number; v1: number; v2: number; votes: number }[] = [];
  for (const a of as) {
    const rows = await db.prepare(
      'SELECT to_book AS book, to_ch AS ch, to_v1 AS v1, to_v2 AS v2, MAX(votes) AS votes FROM xrefs WHERE ch = ? AND v = ? GROUP BY to_book, to_ch, to_v1, to_v2 ORDER BY votes DESC LIMIT 6',
    ).bind(a.ch, a.v).all<{ book: number; ch: number; v1: number; v2: number; votes: number }>();
    found.push(...rows.results);
  }
  found.sort((x, y) => y.votes - x.votes);
  const lines: string[] = [];
  const seen = new Set<string>();
  for (const f of found) {
    const key = `${f.book}.${f.ch}.${f.v1}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const v2 = Math.min(f.v2, f.v1 + 3);
    const got = await fetchRef(db, {
      book: f.book, ch: f.ch, v1: f.v1, v2,
      label: `${ABBR[f.book]} ${f.ch}:${f.v1}${v2 > f.v1 ? '-' + v2 : ''}`,
    });
    if (got) lines.push(`• ${got.label}: ${got.text.replace(/\d+\.\s/g, '')}`);
    if (lines.length === 3) break;
  }
  return lines.length
    ? `🔗 Passagens ligadas a ${anchorTitle(as)} (Bíblia Livre)\n\n${lines.join('\n\n')}\n\nLigações: OpenBible.info (CC-BY).`
    : 'Não encontrei passagens ligadas a esse trecho na base.';
}

// Músicas cadastradas pela equipe da escola para esses versículos. Nada além do que a equipe cadastrou.
export async function songsFor(db: D1Database, as: Anchor[]) {
  if (!as.length) return [];
  const where = as.map(() => "(';' || REPLACE(refs, ' ', '') || ';') LIKE ?").join(' OR ');
  const rows = await db.prepare(`SELECT title, artist, note, refs FROM songs WHERE ${where} LIMIT 3`)
    .bind(...as.map((a) => `%;${label(a).replace(/ /g, '')};%`)).all<{ title: string; artist: string | null; note: string | null; refs: string }>();
  return rows.results;
}

export async function buildMusic(db: D1Database, as: Anchor[]): Promise<string> {
  const songs = await songsFor(db, as);
  if (!songs.length) return 'A escola ainda não cadastrou música ligada a esse trecho.';
  const lines = songs.map((s) => `• ${s.title}${s.artist ? ` — ${s.artist}` : ''}${s.note ? `\n  ${s.note}` : ''}\n  Ligada a: ${s.refs}`);
  return `🎵 Cadastradas pela escola para ${anchorTitle(as)}\n\n${lines.join('\n\n')}`;
}
