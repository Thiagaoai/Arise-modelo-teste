import { hasProfanity, unverifiedQuotes, normalize } from '../worker/src/guard.ts';
import { parseRefs } from '../worker/src/bible.ts';
let fail = 0;
const t = (name: string, ok: boolean) => { if (!ok) fail++; console.log(ok ? 'ok  ' : 'FALHA', name); };
// profanidade: deve bloquear
for (const s of ['isso é uma merda', 'PORRA', 'p0rr4 de aula', 'que caralho é esse', 'fuuuuck this', 'vai se foder', 'seu f d p', 'putaaaa']) t('bloqueia: ' + s, hasProfanity(s));
// não deve bloquear (vocabulário bíblico e comum)
for (const s of ['Quem é a grande prostituta de Ap 17?', 'o pau de Aarão', 'Hades e a morte', 'o diabo e Satanás', 'ele pôs a mão direita sobre mim', 'a espada de dois fios', 'o escudo e o computador', 'fim de semana', 'cuidado com as cuias', 'o bastardo de Hebreus 12', 'Cuba e Cusco', 'a puta que o pariu'.slice(0,0) || 'tudo bem']) t('permite: ' + s, !hasProfanity(s));
// referências
const r = parseRefs('Veja Dn 7:13, 1 João 3:16-18, Jó 1:1, Jo 3:16, Ap 1:9, Salmos 23:1 e às 3:30 da tarde, Is 6:3');
console.log(r.map(x => x.label).join(' | '));
t('refs: 7 achadas', r.length === 7);
t('Jó=18', r.some(x => x.label === 'Jó 1:1' && x.book === 18));
t('Jo=43', r.some(x => x.label === 'Jo 3:16' && x.book === 43));
t('1Jo=62', r.some(x => x.book === 62 && x.v2 === 18));
t('ignora 3:30', !r.some(x => x.ch === 3 && x.v1 === 30));
// citações
const pool = ['Eu, João, (que também sou vosso irmão, e companheiro na aflição, e no Reino, e na paciência de Jesus Cristo), estava na ilha chamada Patmos'];
t('citação correta passa', unverifiedQuotes('Ele diz: “vosso irmão, e companheiro na aflição, e no Reino”', pool).length === 0);
t('citação com reticências passa', unverifiedQuotes('“vosso irmão e companheiro… na ilha chamada Patmos”', pool).length === 0);
t('citação inventada é pega', unverifiedQuotes('Ele diz: “eu estava preso na ilha de Patmos por ordem do imperador Domiciano”', pool).length === 1);
t('citação curta é ignorada', unverifiedQuotes('a palavra “arrebatado” aparece', pool).length === 0);
// regressão: citação curta antes de uma longa não pode gerar falso positivo
{
  const pool2 = ['Eu sou o Alfa e o Ômega, diz o Senhor Deus, que é, e que era, e que virá, o Todo-Poderoso.'];
  const ans = 'Em Ap 1:8 o Senhor diz "Alfa e Ômega" e depois "que é, e que era, e que virá, o Todo-Poderoso". O sentido básico é o de quem atesta algo, e "mais uma coisa" fica fora.';
  t('aspas retas curtas não geram falso positivo', unverifiedQuotes(ans, pool2).length === 0);
  t('aspas retas: inventada ainda é pega', unverifiedQuotes('Diz "Alfa e Ômega" e também "eu sou o primeiro ministro do reino de Judá".', pool2).length === 1);
}
{
  const { mentionedChapters } = await import('../worker/src/bible.ts');
  const eq = (a: number[], b: number[]) => JSON.stringify(a) === JSON.stringify(b);
  t('cap 1 ao 3', eq(mentionedChapters('Preciso das descrições em apocalipse 1 ao 3'), [1, 2, 3]));
  t('capítulos 2 e 3', eq(mentionedChapters('explica os capítulos 2 e 3'), [2, 3]));
  t('Ap 1:2 ao 10 = só cap 1', eq(mentionedChapters('o que esta escrito em apocalipse 1: 2 ao 10'), [1]));
  t('Ap 5:6', eq(mentionedChapters('o que diz Ap 5:6?'), [5]));
  t('cap. 1-3', eq(mentionedChapters('cap. 1-3'), [1, 2, 3]));
  t('sem capítulo', eq(mentionedChapters('quem é o Cordeiro?'), []));
  t('Ap 1:5 e 6 = só cap 1', eq(mentionedChapters('Ap 1:5 e 6'), [1]));
  process.exit(fail ? 1 : 0);
}
