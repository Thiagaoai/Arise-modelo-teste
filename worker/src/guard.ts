// Proteções feitas em código (não dependem do modelo obedecer ao prompt).

export function normalize(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/ς/g, 'σ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

// ---- Linguagem ofensiva ----
const BAD = new Set([
  // português
  'puta', 'puto', 'putaria', 'putinha', 'caralho', 'caralhos', 'krl', 'porra', 'porras', 'merda', 'merdas', 'bosta',
  'buceta', 'bucetas', 'xoxota', 'xereca', 'punheta', 'foda', 'foder', 'fodase', 'fodasse', 'fodido', 'fodida',
  'fodeu', 'cuzao', 'cuzona', 'cu', 'arrombado', 'arrombada', 'viado', 'viada', 'vadia', 'fdp', 'vsf', 'vtnc',
  'tnc', 'pqp', 'cacete', 'filhodaputa', 'otario', 'otaria',
  // inglês
  'fuck', 'fucking', 'fucker', 'motherfucker', 'fck', 'shit', 'bullshit', 'bitch', 'asshole', 'cunt', 'pussy',
  'dickhead', 'wanker', 'slut',
]);

const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '@': 'a', '$': 's' };

export function hasProfanity(text: string): boolean {
  const base = text.toLowerCase().replace(/[01345@$]/g, (c) => LEET[c]);
  const variants = [base, base.replace(/(.)\1{2,}/gu, '$1'), base.replace(/(.)\1{2,}/gu, '$1$1')];
  for (const v of variants) {
    for (const tok of normalize(v).split(' ')) if (tok && BAD.has(tok)) return true;
    // "f u c k" / "p.u.t.a": letras soltas coladas
    const glued = normalize(v).replace(/(?<=\b\p{L}) (?=\p{L}\b)/gu, '');
    for (const tok of glued.split(' ')) if (tok.length >= 3 && BAD.has(tok)) return true;
  }
  return false;
}

// ---- Verificação de citações ----
export function extractQuotes(answer: string): string[] {
  // Pareamento sequencial: aspas retas alternam abrir/fechar, e as curvas abrem e fecham por tipo.
  // Assim a citação curta ("Alfa e Ômega") não "rouba" o fechamento da seguinte.
  const out: string[] = [];
  let open = -1;
  for (let i = 0; i < answer.length; i++) {
    const c = answer[i];
    if (c === '“' || c === '«') open = i;
    else if (c === '”' || c === '»') {
      if (open >= 0) out.push(answer.slice(open + 1, i));
      open = -1;
    } else if (c === '"') {
      if (open >= 0) { out.push(answer.slice(open + 1, i)); open = -1; } else open = i;
    }
  }
  return out.filter((q) => q.length >= 20 && q.length <= 500 && !q.includes('\n'));
}

// Cada trecho entre aspas (separado por "…") precisa existir, normalizado, nos textos fornecidos ao modelo.
export function unverifiedQuotes(answer: string, poolRaw: string[]): string[] {
  const pool = ' ' + poolRaw.map(normalize).join(' ') + ' ';
  const bad: string[] = [];
  for (const q of extractQuotes(answer)) {
    const parts = q.split(/…|\.{3}|\[\s*…\s*\]|\[\s*\.{3}\s*\]/u);
    for (const p of parts) {
      const n = normalize(p);
      if (n.length < 15) continue;
      if (!pool.includes(' ' + n + ' ') && !pool.includes(n)) bad.push(p.trim());
    }
  }
  return [...new Set(bad)];
}

// ---- Respostas fixas ----
const pick = <T>(a: T[]): T => a[Math.floor(Math.random() * a.length)];

export const FIXED = {
  profanity:
    'Vamos manter o respeito aqui, por favor. Este é um espaço de estudo da Palavra. Reformule sua pergunta e eu ajudo com prazer.',
  profanityPaused:
    'Por hoje, o acesso ao tutor está pausado por linguagem inadequada. A equipe da escola foi avisada. Amanhã você pode voltar ao estudo.',
  offTopic: () => pick([
    'Aqui o foco é o estudo de Apocalipse, então não consigo ajudar com isso. Se quiser, pergunte sobre algum versículo, palavra ou tema do livro.',
    'Esse assunto foge do que estudamos aqui. Posso ajudar com o texto de Apocalipse: um versículo, uma palavra do original ou o contexto do capítulo.',
  ]),
  otherBook:
    'Meu foco é o livro de Apocalipse. Posso usar outras passagens da Bíblia para iluminar o texto, mas não estudar outro livro à parte. Que tal ligar sua pergunta a algum trecho de Apocalipse?',
  jailbreak: () => pick([
    'Sigo sempre as mesmas regras: sou o tutor de Apocalipse da ARISE. Em qual trecho do livro posso ajudar?',
    'Isso eu não faço. Mas posso ajudar a estudar Apocalipse. Por onde quer começar?',
  ]),
  greeting: () => pick([
    'A paz do Senhor! Sobre qual trecho de Apocalipse vamos conversar?',
    'Olá! O que você gostaria de entender no texto de Apocalipse hoje?',
    'Bem-vindo de volta ao estudo. Qual versículo ou tema vamos olhar?',
  ]),
  thanks: () => pick([
    'Por nada! Quando quiser seguir com o estudo, é só perguntar.',
    'Fico feliz em ajudar. Pode continuar quando quiser.',
  ]),
  unverifiedNote:
    '\n\n⚠️ Nem todas as citações desta resposta puderam ser conferidas automaticamente. Confira no texto antes de usar.',
  sanitized: 'Não consegui formular uma boa resposta agora. Pode reformular sua pergunta?',
};
